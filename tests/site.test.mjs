import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateBook, loadBooks, mergeEnglish, verseKey } from '../scripts/content.mjs';

process.env.OUT_DIR = mkdtempSync(join(tmpdir(), 'scripture-dist-'));
const OUT = process.env.OUT_DIR;
const { build, chapterPath } = await import('../scripts/build.mjs');
const { startServer } = await import('../scripts/serve.mjs');

test('梵文书架九部全部通过校验', () => {
  const books = loadBooks();
  assert.equal(books.length, 9);
});

test('缺梵文罗马转写的段落会被拒绝', () => {
  const bad = {
    slug: 'x',
    tradition: 'buddhism',
    title: 'a',
    sanskrit: 'a',
    summary: 'a',
    chapters: [{ title: 'a', verses: [{ zh: 'a', sa: { text: 'अ', tr: ' ' } }] }],
  };
  assert.throws(() => validateBook(bad, 'x.json'), /sa\.tr/);
});

test('英译：段数或梵文指纹对不上就拒绝', () => {
  const book = () => ({
    slug: 'x',
    chapters: [{ title: 'a', verses: [{ zh: 'a', sa: { text: 'अ', tr: 'a' } }] }],
  });
  const en = (h) => ({ slug: 'x', title: 'X', summary: 'x', compare: ['差别'], chapters: [{ title: 'A', verses: [{ h, en: 'a' }] }] });
  assert.equal(mergeEnglish(book(), en(verseKey({ sa: { tr: 'a' } })), 'x').chapters[0].verses[0].en.text, 'a');
  assert.throws(() => mergeEnglish(book(), en('00000000'), 'x'), /梵文指纹/);
  assert.throws(() => mergeEnglish(book(), { ...en('x'), chapters: [{ title: 'A', verses: [] }] }, 'x'), /段数/);
});

test('构建出每一章的页面、sitemap、CNAME，站内链接都指向存在的页面', () => {
  const paths = build();
  for (const p of paths) assert.ok(existsSync(join(OUT, p, 'index.html')), `缺 ${p}`);
  const sitemap = readFileSync(join(OUT, 'sitemap.xml'), 'utf8');
  for (const p of paths) assert.ok(sitemap.includes(`https://scripture.eden-tan.com${p}</loc>`), `sitemap 缺 ${p}`);
  assert.equal(readFileSync(join(OUT, 'CNAME'), 'utf8').trim(), 'scripture.eden-tan.com');

  for (const p of paths) {
    const html = readFileSync(join(OUT, p, 'index.html'), 'utf8');
    assert.match(html, /<link rel="canonical" href="https:\/\/scripture\.eden-tan\.com/);
    for (const [, href] of html.matchAll(/href="(\/[^"#]*)"/g)) {
      const target = href.endsWith('/') ? join(OUT, href, 'index.html') : join(OUT, href);
      assert.ok(existsSync(target), `${p} 的链接 ${href} 断了`);
    }
  }
});

test('章节页段数和内容一致：每段都有白话和梵文，有英译的书每段都有英文，古译数和数据一致', () => {
  build();
  for (const b of loadBooks()) {
    b.chapters.forEach((ch, i) => {
      const p = chapterPath(b, i);
      const html = readFileSync(join(OUT, p, 'index.html'), 'utf8');
      const count = (col) => html.split(`data-col="${col}"`).length - 1;
      assert.equal(count('zh'), ch.verses.length, `${p} 白话段数不对`);
      assert.equal(count('sa'), ch.verses.length, `${p} 梵文段数不对`);
      assert.equal(count('old'), ch.verses.filter((v) => v.old).length, `${p} 古译段数不对`);
      assert.equal(count('en'), b.en ? ch.verses.length : 0, `${p} 英译段数不对`);
    });
  }
});

test('本地服务：页面 200、缺斜杠 301、未知路径 404', async () => {
  build();
  const server = await startServer(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/heart-sutra/`)).status, 200);
    assert.equal((await fetch(`${base}/heart-sutra`, { redirect: 'manual' })).status, 301);
    assert.equal((await fetch(`${base}/nope/`)).status, 404);
  } finally {
    server.close();
  }
});
