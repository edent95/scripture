// 给英译用的底稿：列出一部书（或其中一章）每段的梵文指纹、罗马转写、白话直译、古译。
// 用法：node scripts/en-skeleton.mjs <slug> [章号，从 1 起]
import { loadBooks, verseKey } from './content.mjs';

const [slug, chapter] = process.argv.slice(2);
const book = loadBooks().find((b) => b.slug === slug);
if (!book) throw new Error(`没有这部书: ${slug}`);
const picked = chapter ? [[Number(chapter) - 1, book.chapters[Number(chapter) - 1]]] : book.chapters.map((c, i) => [i, c]);
const out = picked.map(([i, ch]) => ({
  chapter: i + 1,
  title: ch.title,
  verses: ch.verses.map((v, j) => ({
    n: j + 1,
    h: verseKey(v),
    tr: v.sa.tr,
    zh: v.zh,
    ...(v.old?.text ? { old: v.old.text } : {}),
  })),
}));
console.log(JSON.stringify(out, null, 1));
