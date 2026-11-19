// 读取并校验 content/*.json。校验失败直接抛错，构建和测试共用这一份。
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const TRADITIONS = {
  buddhism: { zh: '佛经', en: 'Buddhist sūtras' },
  theravada: { zh: '巴利文经典', en: 'Pali Canon' },
  hinduism: { zh: '印度经典', en: 'Hindu classics' },
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
 * 一部书：{ slug, tradition, origLang?（sa 梵文，缺省 / pi 巴利文）, title, sanskrit（原文书名）, oldTranslator?, summary, chapters[] }
 * 一段：{ zh 白话直译, sa: { text 天城体, tr 罗马转写 }, old?: { who, text, plain, notes[{ w, note }] } }
 */
export function validateBook(book, file) {
  need(SLUG.test(book.slug ?? ''), file, `slug 不合法: ${book.slug}`);
  need(file.endsWith(`${book.slug}.json`), file, '文件名必须等于 slug');
  need(TRADITIONS[book.tradition], file, `未知 tradition: ${book.tradition}`);
  need(book.origLang === undefined || ['sa', 'pi'].includes(book.origLang), file, `origLang 只能是 sa 或 pi: ${book.origLang}`);
  needText(book.title, `${file} title`);
  needText(book.sanskrit, `${file} sanskrit`);
  needText(book.summary, `${file} summary`);
  need(Array.isArray(book.chapters) && book.chapters.length > 0, file, '至少一章');
  book.chapters.forEach((ch, i) => {
    const at = `${file} chapters[${i}]`;
    needText(ch.title, `${at}.title`);
    need(Array.isArray(ch.verses) && ch.verses.length > 0, at, '至少一段');
    ch.verses.forEach((v, j) => {
      const vat = `${at}.verses[${j}]`;
      needText(v.zh, `${vat}.zh`);
      needText(v.sa?.text, `${vat}.sa.text`);
      needText(v.sa?.tr, `${vat}.sa.tr`);
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
export const verseKey = (v) => createHash('sha1').update(v.sa.tr.normalize('NFC')).digest('hex').slice(0, 8);

/**
 * 英译叠加层 translations/en/<slug>.json（本站自己从梵文直译，不经面板导入，导入脚本不会碰它）：
 * { slug, title, summary, compare: [三语对照总结，中文段落], compareEn?: [同一份总结的英文],
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
  book.chapters.forEach((ch, i) => {
    const ech = en.chapters[i];
    const at = `${file} chapters[${i}]`;
    needText(ech.title, `${at}.title`);
    need(ech.verses?.length === ch.verses.length, at, `段数 ${ech.verses?.length} ≠ 原文 ${ch.verses.length}`);
    ch.en = ech.title;
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
