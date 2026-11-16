// 读取并校验 content/*.json。校验失败直接抛错，构建和测试共用这一份。
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const TRADITIONS = {
  buddhism: { zh: '佛经', en: 'Buddhist sūtras' },
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
 * 一部书：{ slug, tradition, title, sanskrit, oldTranslator?, summary, chapters[] }
 * 一段：{ zh 白话直译, sa: { text 天城体, tr 罗马转写 }, old?: { who, text, plain, notes[{ w, note }] } }
 */
export function validateBook(book, file) {
  need(SLUG.test(book.slug ?? ''), file, `slug 不合法: ${book.slug}`);
  need(file.endsWith(`${book.slug}.json`), file, '文件名必须等于 slug');
  need(TRADITIONS[book.tradition], file, `未知 tradition: ${book.tradition}`);
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

export function loadBooks(dir = new URL('../content/', import.meta.url).pathname) {
  const books = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => validateBook(JSON.parse(readFileSync(join(dir, f), 'utf8')), f))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
  return books;
}
