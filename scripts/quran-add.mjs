// 把一批古兰经译稿并进面板书库的 ar-quran.json 和本站的 translations/en/quran.json。古兰经分批做，每批跑一次。
// 原文不手抄：阿拉伯文从 Tanzil 的 Uthmani 本逐字取（授权不许改动），罗马转写由 ar-translit.mjs 从 Tanzil 的 Simple 本机械生成。
//
// 用法：node scripts/quran-add.mjs <译稿.txt> [...] --tanzil <目录> [--library <面板书库目录>]
//   <目录> 里放 uthmani.txt 和 simple.txt，从 https://tanzil.net/download/ 下载（Text with aya numbers，带停顿符）。
// 跑完再 node scripts/import-dashboard.mjs 重新导入。
//
// 译稿格式（一章一块，节号必须从 1 连续到这一章的最后一节）：
//   # 78 | 消息 | The Tidings | an-Nabaʾ        章号 | 中文章名 | 英文章名 | 阿拉伯文章名转写
//   1 白话直译
//   = English translation
//   ~ 原词 | 三语对照注（中文） | the same note in English     可以没有，可以多条
//   > 王静斋 | 旧译原句（逐字照抄）                              可以没有
//   >> 旧译今译
//   ? 原词 | 旧译的注                                           可以多条
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { arTranslit } from './ar-translit.mjs';
import { verseKey } from './content.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? fallback : args.splice(i, 2)[1];
};
const TANZIL = opt('tanzil');
const LIBRARY = opt('library', '/Users/MacBookPro/Developer/Project/personal-dashboard/client/public/books/local');
const EN_FILE = new URL('../translations/en/quran.json', import.meta.url).pathname;
if (!TANZIL || !args.length) {
  console.error('用法：node scripts/quran-add.mjs <译稿.txt> [...] --tanzil <目录> [--library <面板书库目录>]');
  process.exit(1);
}

const NOTICE =
  'Tanzil Quran Text (Uthmani, Version 1.1). Copyright (C) 2007-2026 Tanzil Project. License: Creative Commons Attribution 3.0. Verbatim copies only; changing the text is not allowed. Source: https://tanzil.net/';

/** Tanzil 的「章|节|经文」文本 -> Map(章号 -> 每节经文[]) */
function readTanzil(file) {
  const map = new Map();
  for (const line of readFileSync(join(TANZIL, file), 'utf8').split('\n')) {
    const m = /^(\d+)\|(\d+)\|(.+)$/.exec(line.trim());
    if (!m) continue;
    const list = map.get(Number(m[1])) ?? map.set(Number(m[1]), []).get(Number(m[1]));
    if (list.length + 1 !== Number(m[2])) throw new Error(`${file} ${m[1]}:${m[2]} 节号不连续`);
    list.push(m[3]);
  }
  if (map.size !== 114) throw new Error(`${file} 应该有 114 章，读到 ${map.size} 章`);
  return map;
}

function parseDraft(file) {
  const chapters = [];
  let ch;
  let v;
  readFileSync(file, 'utf8').split('\n').forEach((raw, n) => {
    const line = raw.trim();
    const at = `${file}:${n + 1}`;
    if (!line) return;
    const cut = (s) => s.split(' | ').map((x) => x.trim());
    if (line.startsWith('# ')) {
      const [no, zh, en, name] = cut(line.slice(2));
      if (!/^\d+$/.test(no) || !zh || !en || !name) throw new Error(`${at} 章标题要写成「# 章号 | 中文章名 | 英文章名 | 转写」`);
      ch = { no: Number(no), zh, en, name, verses: [] };
      chapters.push(ch);
      return;
    }
    if (!ch) throw new Error(`${at} 还没有章标题`);
    const num = /^(\d+) (.+)$/.exec(line);
    if (num) {
      if (Number(num[1]) !== ch.verses.length + 1) throw new Error(`${at} 第 ${ch.no} 章的节号应该是 ${ch.verses.length + 1}`);
      v = { zh: num[2], cmp: [], notes: [] };
      ch.verses.push(v);
    } else if (!v) throw new Error(`${at} 还没有节`);
    else if (line.startsWith('= ')) v.en = line.slice(2);
    else if (line.startsWith('~ ')) {
      const [w, note, en] = cut(line.slice(2));
      if (!w || !note || !en) throw new Error(`${at} 对照注要写成「~ 原词 | 中文注 | 英文注」`);
      v.cmp.push({ w, note, en });
    } else if (line.startsWith('>> ')) v.plain = line.slice(3);
    else if (line.startsWith('> ')) [v.who, v.old] = cut(line.slice(2));
    else if (line.startsWith('? ')) {
      const [w, note] = cut(line.slice(2));
      if (!w || !note) throw new Error(`${at} 旧译的注要写成「? 原词 | 注」`);
      v.notes.push({ w, note });
    } else throw new Error(`${at} 看不懂这一行：${line.slice(0, 30)}`);
  });
  return chapters;
}

const uthmani = readTanzil('uthmani.txt');
const simple = readTanzil('simple.txt');
const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const bookFile = join(LIBRARY, 'ar-quran.json');
const book = readJson(bookFile, { kind: 'prose', notice: NOTICE, parts: [{ name: '直译 · 阿拉伯文', from: 1, to: 1 }], chapters: [] });
const en = readJson(EN_FILE, { slug: 'quran', title: '', summary: '', compare: [], compareEn: [], chapters: [] });
const upsert = (list, item) => {
  const i = list.findIndex((x) => x.no === item.no);
  if (i < 0) list.push(item);
  else list[i] = item;
  list.sort((a, b) => a.no - b.no);
};

for (const file of args) {
  for (const ch of parseDraft(file)) {
    const ar = uthmani.get(ch.no);
    if (!ar) throw new Error(`没有第 ${ch.no} 章`);
    if (ch.verses.length !== ar.length) throw new Error(`第 ${ch.no} 章译稿 ${ch.verses.length} 节，原文 ${ar.length} 节`);
    const blocks = [];
    const enVerses = [];
    ch.verses.forEach((v, i) => {
      if (!v.en) throw new Error(`${ch.no}:${i + 1} 缺英译`);
      const sa = { t: 'sa', text: ar[i], tr: arTranslit(simple.get(ch.no)[i]) };
      blocks.push({ t: 'p', text: v.zh });
      if (v.old || v.notes.length) blocks.push({ t: 'old', who: v.who ?? '', text: v.old ?? '', plain: v.plain ?? '', notes: v.notes });
      blocks.push(sa);
      enVerses.push({ h: verseKey({ sa }), en: v.en, ...(v.cmp.length ? { cmp: v.cmp } : {}) });
    });
    upsert(book.chapters, { title: `第 ${ch.no} 章 · ${ch.zh}（${ch.name}）`, no: ch.no, blocks });
    upsert(en.chapters, { title: `Surah ${ch.no} · ${ch.en} (${ch.name})`, no: ch.no, verses: enVerses });
    console.log(`第 ${ch.no} 章 ${ch.zh}：${ch.verses.length} 节`);
  }
}
book.parts[0].to = book.chapters.length;
writeFileSync(bookFile, `${JSON.stringify(book, null, 1)}\n`);
writeFileSync(EN_FILE, `${JSON.stringify(en, null, 1)}\n`);

// 面板书库的目录：没有就加一条，章数变了就更新说明
const indexFile = join(LIBRARY, 'index.json');
const index = JSON.parse(readFileSync(indexFile, 'utf8'));
const entries = Array.isArray(index) ? index : index.books;
const note = `阿拉伯文直译成白话，附 Tanzil 的 Uthmani 原文与罗马转写 · 已收 ${book.chapters.length} / 114 章`;
const entry = entries.find((e) => e.id === 'ar-quran');
if (entry) entry.note = note;
else entries.push({ id: 'ar-quran', title: '《古兰经》阿拉伯文本', cover: '古兰经', author: 'al-Qurʾān', era: '阿拉伯文', shelf: '阿拉伯文', note, data: 'books/local/ar-quran.json', local: true });
writeFileSync(indexFile, `${JSON.stringify(index, null, 1)}\n`);
console.log(`ar-quran：共 ${book.chapters.length} 章。接着跑 node scripts/import-dashboard.mjs`);
