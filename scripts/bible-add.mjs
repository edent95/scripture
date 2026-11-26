// 把一批圣经译稿并进面板书库的 grc-<卷>.json、面板 index.json 和本站的 translations/en/<slug>.json（已有的章按章号替换）。
// 用法：node scripts/bible-add.mjs <译稿.json> --rows <章号>=<原文与和合本.json> [--rows ...] [--library <面板书库目录>]
//
// 译稿.json：{ id 面板书 id（grc-mark）, slug, index 面板目录条目（title、cover、author 原文书名的转写、era、shelf、note）,
//   part 栏目名（「白话 · 和合本对照 · 希腊文」）, oldWho 对照栏的译本名, en { title, summary, primer, primerEn, compare, compareEn },
//   chapters: [{ no, title, en, intro, enIntro, verses: [{ zh, en, notes?: [[词, 注]], cmp?: [[原词, 中文注, 英文注]] }] }] }
// 原文与和合本.json：一章一份，[{ v 节号, grc 希腊文（SBLGNT，已去掉校勘符号）, cuv 和合本（已转简体） }]，逐节照底本，不在这里改字。
//   希腊文取自 https://github.com/LogosBible/SBLGNT（CC BY 4.0），和合本取自维基文库《聖經 (和合本)》（1919 年，公有领域）。
// 罗马转写由 scripts/grc-translit.mjs 从希腊文机械生成。跑完接着跑 node scripts/import-dashboard.mjs。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { verseKey } from './content.mjs';
import { grcTranslit } from './grc-translit.mjs';

const argv = process.argv.slice(2);
const rowsFiles = new Map();
let LIBRARY = '/Users/MacBookPro/Developer/Project/personal-dashboard/client/public/books/local';
let draftFile;
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--rows') {
    const [no, file] = argv[(i += 1)].split('=');
    rowsFiles.set(Number(no), file);
  } else if (argv[i] === '--library') LIBRARY = argv[(i += 1)];
  else draftFile = argv[i];
}
if (!draftFile) throw new Error('用法：node scripts/bible-add.mjs <译稿.json> --rows <章号>=<原文与和合本.json>');

// 和合本录文里的几个异体字改成通行写法（1919 年原书的字形，简体里不用）；别的字不动
const VARIANTS = { 汚: '污', 徧: '遍', 痲: '麻', 愼: '慎' };
const normalizeOld = (s) => s.replace(/[汚徧痲愼]/g, (c) => VARIANTS[c]);

const draft = JSON.parse(readFileSync(draftFile, 'utf8'));
const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const bookFile = join(LIBRARY, `${draft.id}.json`);
const enFile = new URL(`../translations/en/${draft.slug}.json`, import.meta.url).pathname;
const book = readJson(bookFile, { kind: 'prose', parts: [{ name: draft.part, from: 1, to: 1 }], chapters: [] });
const en = readJson(enFile, { slug: draft.slug, chapters: [] });
Object.assign(en, { slug: draft.slug, ...draft.en, chapters: en.chapters });
book.parts[0].name = draft.part;
const upsert = (list, item) => {
  const i = list.findIndex((x) => x.no === item.no);
  if (i < 0) list.push(item);
  else list[i] = item;
  list.sort((a, b) => a.no - b.no);
};

for (const ch of draft.chapters) {
  const file = rowsFiles.get(ch.no);
  if (!file) throw new Error(`第 ${ch.no} 章没有给原文：--rows ${ch.no}=<文件>`);
  const rows = JSON.parse(readFileSync(file, 'utf8'));
  if (rows.length !== ch.verses.length) throw new Error(`第 ${ch.no} 章译稿 ${ch.verses.length} 节，原文 ${rows.length} 节`);
  const blocks = [];
  const enVerses = [];
  ch.verses.forEach((v, i) => {
    const row = rows[i];
    const at = `${ch.no}:${i + 1}`;
    if (row.v !== i + 1) throw new Error(`${at} 原文的节号是 ${row.v}`);
    if (!v.zh?.trim() || !v.en?.trim()) throw new Error(`${at} 缺白话或英译`);
    if (/[⸀-⸅]/.test(row.grc)) throw new Error(`${at} 希腊文里还有校勘符号`);
    const sa = { t: 'sa', text: row.grc.normalize('NFC'), tr: grcTranslit(row.grc) };
    if (/[Ͱ-Ͽἀ-῿]/.test(sa.tr)) throw new Error(`${at} 转写里还有希腊字母：${sa.tr}`);
    blocks.push({ t: 'p', text: v.zh.trim() });
    blocks.push({ t: 'old', who: draft.oldWho, text: normalizeOld(row.cuv), plain: '', notes: (v.notes ?? []).map(([w, note]) => ({ w, note })) });
    blocks.push(sa);
    const cmp = (v.cmp ?? []).map(([w, note, enNote]) => ({ w, note, en: enNote }));
    enVerses.push({ h: verseKey({ sa }), en: v.en.trim(), ...(cmp.length ? { cmp } : {}) });
  });
  upsert(book.chapters, { title: ch.title, no: ch.no, ...(ch.intro ? { intro: ch.intro } : {}), blocks });
  upsert(en.chapters, { title: ch.en, no: ch.no, ...(ch.enIntro ? { intro: ch.enIntro } : {}), verses: enVerses });
  console.log(`第 ${ch.no} 章：${ch.verses.length} 节`);
}
book.parts[0].to = book.chapters.length;
writeFileSync(bookFile, `${JSON.stringify(book, null, 1)}\n`);
writeFileSync(enFile, `${JSON.stringify(en, null, 1)}\n`);

// 面板书库的目录：没有就加一条，有就更新
const indexFile = join(LIBRARY, 'index.json');
const index = JSON.parse(readFileSync(indexFile, 'utf8'));
const entries = Array.isArray(index) ? index : index.books;
const entry = { id: draft.id, ...draft.index, data: `books/local/${draft.id}.json`, local: true };
const at = entries.findIndex((e) => e.id === draft.id);
if (at < 0) entries.push(entry);
else entries[at] = { ...entries[at], ...entry };
writeFileSync(indexFile, `${JSON.stringify(index, null, 1)}\n`);
console.log(`${draft.id}：共 ${book.chapters.length} 章。接着跑 node scripts/import-dashboard.mjs`);
