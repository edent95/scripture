// 读取并校验 content/*.json。校验失败直接抛错，构建和测试共用这一份。
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PANEL_ICONS } from './panels.mjs';

export const TRADITIONS = {
  buddhism: { zh: '佛经', en: 'Buddhist sūtras' },
  theravada: { zh: '巴利文经典', en: 'Pali Canon' },
  hinduism: { zh: '印度经典', en: 'Hindu classics' },
  chinese: { zh: '中国经典', en: 'Chinese classics' },
  christianity: { zh: '基督教经典', en: 'Christian scripture' },
  islam: { zh: '伊斯兰经典', en: 'Islamic scripture' },
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function need(cond, where, msg) {
  if (!cond) throw new Error(`${where}: ${msg}`);
}
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
function needText(value, where) {
  need(isText(value), where, '缺少文字');
}

/**
 * 一部书：{ slug, tradition, origLang?（sa 梵文，缺省 / pi 巴利文 / ar 阿拉伯文 / grc 希腊文 / lzh 文言：原文是汉字，sa.tr 可以为空，指纹改用 sa.text）, title, sanskrit（原文书名）, oldTranslator?, summary, chapters[] }
 * 一章：{ title, no?（章号：只收了一部分章的书用它定网址，如古兰经第 78 章是 /quran/78/；要么每章都写、严格递增，要么都不写）, verses[] }
 *   章还可以带 intro（这一章在讲什么，白话导读，显示在经文前面）；英文导读写在英译叠加层那一章的 intro。
 *   章还可以带 points（「一图看懂」：三四个重点，每个 { icon 图形名（scripts/panels.mjs）, text 一句话 }）；英文的那几句写在英译叠加层那一章的 points（字符串数组，条数要一样）。
 * 一段：{ zh 白话直译, sa: { text 天城体, tr 罗马转写 }, old?: { who, text, plain, notes[{ w, note }] } }
 */
export function validateBook(book, file) {
  need(SLUG.test(book.slug ?? ''), file, `slug 不合法: ${book.slug}`);
  need(file.endsWith(`${book.slug}.json`), file, '文件名必须等于 slug');
  need(TRADITIONS[book.tradition], file, `未知 tradition: ${book.tradition}`);
  need(book.origLang === undefined || ['sa', 'pi', 'ar', 'grc', 'lzh'].includes(book.origLang), file, `origLang 只能是 sa、pi、ar、grc 或 lzh: ${book.origLang}`);
  needText(book.title, `${file} title`);
  needText(book.sanskrit, `${file} sanskrit`);
  needText(book.summary, `${file} summary`);
  need(Array.isArray(book.chapters) && book.chapters.length > 0, file, '至少一章');
  const numbered = book.chapters.filter((ch) => ch.no !== undefined);
  need(numbered.length === 0 || numbered.length === book.chapters.length, file, '章号 no 要么每章都写，要么都不写');
  numbered.forEach((ch, i) => need(Number.isInteger(ch.no) && ch.no > (numbered[i - 1]?.no ?? 0), file, `章号 no 必须是递增的正整数: ${ch.no}`));
  book.chapters.forEach((ch, i) => {
    const at = `${file} chapters[${i}]`;
    needText(ch.title, `${at}.title`);
    need(Array.isArray(ch.verses) && ch.verses.length > 0, at, '至少一段');
    for (const pt of ch.points ?? []) {
      need(PANEL_ICONS.includes(pt.icon), at, `points 里没有这个图形: ${pt.icon}`);
      needText(pt.text, `${at}.points.text`);
    }
    ch.verses.forEach((v, j) => {
      const vat = `${at}.verses[${j}]`;
      needText(v.zh, `${vat}.zh`);
      needText(v.sa?.text, `${vat}.sa.text`);
      // 文言（lzh）的原文就是汉字，没有罗马转写这一行
      if (book.origLang !== 'lzh') needText(v.sa?.tr, `${vat}.sa.tr`);
      if (v.old !== undefined) {
        need(isText(v.old.text) || v.old.notes?.length, vat, 'old 既没有古译原句也没有注');
        for (const n of v.old.notes ?? []) {
          needText(n.w, `${vat}.old.notes.w`);
          needText(n.note, `${vat}.old.notes.note`);
        }
      }
    });
  });
  return book;
}

/** 一段梵文的指纹：英译按它对齐。面板重新导入后梵文变了，指纹就对不上，构建直接报错。 */
export const verseKey = (v) => createHash('sha1').update((v.sa.tr || v.sa.text).normalize('NFC')).digest('hex').slice(0, 8);

/**
 * 英译叠加层 translations/en/<slug>.json（本站自己从梵文直译，不经面板导入，导入脚本不会碰它）：
 * { slug, title, summary, compare: [三语对照总结，中文段落], compareEn?: [同一份总结的英文],
 *   primer?: [{ q 小标题, a 白话解释, terms?: [[词, 解释]] }]（读之前先知道的几件事，中文）, primerEn?: 同一份的英文,
 *   chapters: [{ title, verses: [{ h 梵文指纹, en, cmp?: [{ w, note 中文, en? 英文版的同一条注 }] }] }] }
 * 章数、段数、每段指纹都必须和 content/<slug>.json 一致。
 */
export function mergeEnglish(book, en, file) {
  need(en.slug === book.slug, file, `slug 不一致: ${en.slug}`);
  needText(en.title, `${file} title`);
  needText(en.summary, `${file} summary`);
  need(Array.isArray(en.compare) && en.compare.length > 0 && en.compare.every(isText), file, 'compare 至少一段三语对照总结');
  need(en.chapters?.length === book.chapters.length, file, `章数 ${en.chapters?.length} ≠ 原文 ${book.chapters.length}`);
  need(en.compareEn === undefined || (Array.isArray(en.compareEn) && en.compareEn.every(isText)), file, 'compareEn 必须是英文段落数组');
  book.en = { title: en.title, summary: en.summary, compare: en.compare, ...(en.compareEn?.length ? { compareEn: en.compareEn } : {}) };
  // 「读之前先知道这几件事」：给完全没背景的人看的几条问答，显示在目录页章节列表前面。中文 primer、英文 primerEn，条数要一样。
  for (const key of ['primer', 'primerEn']) {
    if (en[key] === undefined) continue;
    need(Array.isArray(en[key]) && en[key].length > 0, file, `${key} 至少一条`);
    en[key].forEach((it, n) => {
      needText(it.q, `${file} ${key}[${n}].q`);
      needText(it.a, `${file} ${key}[${n}].a`);
      need(it.terms === undefined || (Array.isArray(it.terms) && it.terms.every((x) => Array.isArray(x) && x.length === 2 && x.every(isText))), `${file} ${key}[${n}]`, 'terms 要写成 [[词, 解释], ...]');
    });
  }
  need((en.primer?.length ?? 0) === (en.primerEn?.length ?? 0), file, 'primer 和 primerEn 条数要一样');
  if (en.primer) book.primer = { zh: en.primer, en: en.primerEn };
  book.chapters.forEach((ch, i) => {
    const ech = en.chapters[i];
    const at = `${file} chapters[${i}]`;
    needText(ech.title, `${at}.title`);
    need(ech.verses?.length === ch.verses.length, at, `段数 ${ech.verses?.length} ≠ 原文 ${ch.verses.length}`);
    ch.en = ech.title;
    if (ech.intro !== undefined) needText(ech.intro, `${at}.intro`);
    if (ech.intro) ch.enIntro = ech.intro;
    if (ech.points !== undefined) {
      need(ech.points.length === (ch.points?.length ?? 0) && ech.points.every(isText), at, `points 条数要和中文一样（${ch.points?.length ?? 0} 条）`);
      ch.enPoints = ech.points;
    }
    ch.verses.forEach((v, j) => {
      const ev = ech.verses[j];
      const vat = `${at}.verses[${j}]`;
      need(ev.h === verseKey(v), vat, `梵文指纹 ${ev.h} ≠ ${verseKey(v)}：原文这一段变了，英译要跟着重译`);
      needText(ev.en, `${vat}.en`);
      for (const n of ev.cmp ?? []) {
        needText(n.w, `${vat}.cmp.w`);
        needText(n.note, `${vat}.cmp.note`);
        if (n.en !== undefined) needText(n.en, `${vat}.cmp.en`);
      }
      v.en = { text: ev.en, ...(ev.cmp?.length ? { cmp: ev.cmp } : {}) };
    });
  });
  return book;
}

const ROOT = new URL('../', import.meta.url).pathname;

export function loadBooks(dir = join(ROOT, 'content'), enDir = join(ROOT, 'translations/en')) {
  const books = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => validateBook(JSON.parse(readFileSync(join(dir, f), 'utf8')), f))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
  for (const b of books) {
    const f = join(enDir, `${b.slug}.json`);
    if (existsSync(f)) mergeEnglish(b, JSON.parse(readFileSync(f, 'utf8')), `translations/en/${b.slug}.json`);
  }
  return books;
}
