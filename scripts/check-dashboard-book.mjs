// 校验一部面板书库的书(prose 格式)能不能导入本站:node scripts/check-dashboard-book.mjs <面板书库 json> [...]
// 做新书时每写完一章跑一次;全过才算这部书写完。
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { validateBook } from './content.mjs';
import { convertChapters, oldTranslatorOf } from './import-dashboard.mjs';

let failed = false;
for (const file of process.argv.slice(2)) {
  const id = basename(file, '.json');
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (data.kind !== 'prose') throw new Error('kind 必须是 "prose"');
    if (!data.parts?.[0]?.name) throw new Error('缺 parts[0].name(如「直译 · 玄奘本对照 · 梵文」)');
    const chapters = convertChapters(data, id);
    validateBook({ slug: 'x', tradition: 'buddhism', ...(id.startsWith('lzh-') ? { origLang: 'lzh' } : {}), title: 't', sanskrit: 's', summary: 's', chapters }, 'x.json');
    const n = chapters.reduce((s, ch) => s + ch.verses.length, 0);
    const withOld = chapters.reduce((s, ch) => s + ch.verses.filter((v) => v.old).length, 0);
    console.log(`✓ ${id}: ${chapters.length} 章 · ${n} 段 · ${withOld} 段有古译对照 · 古译者 ${oldTranslatorOf(data) ?? '(无)'}`);
  } catch (e) {
    failed = true;
    console.error(`✗ ${id}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
