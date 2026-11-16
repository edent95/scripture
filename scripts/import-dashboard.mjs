// 从个人面板书库的「梵文」书架导入：<面板>/client/public/books/local/sa-*.json -> content/<slug>.json
// 面板那边是 prose 格式（p 白话直译 → old 古译对照 → sa 梵文，一段一组），这里转成本站的 verses。
// 用法：node scripts/import-dashboard.mjs [面板书库目录]
import { readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] ?? '/Users/MacBookPro/Developer/Project/personal-dashboard/client/public/books/local';
const OUT = new URL('../content/', import.meta.url).pathname;

// 面板 id -> 本站 slug 与简介。顺序就是首页的排列顺序。
const BOOKS = [
  ['sa-heart', 'heart-sutra', 'buddhism', '两百多字讲「空」：构成「我」的五类东西都没有不变的本质。看清这一点，心就不再被恐惧绑住。'],
  ['sa-vajra', 'diamond-sutra', 'buddhism', '须菩提问佛：想求觉悟的人，心该怎么放？佛的回答是：去帮助一切众生，但心里不抓着「我在帮人」。'],
  ['sa-amitabha', 'amitabha-sutra', 'buddhism', '没有人发问，佛自己讲起西方极乐世界的样子，劝人一心念阿弥陀佛的名号，往生到那里。'],
  ['sa-sukhavati', 'larger-sukhavati', 'buddhism', '法藏比丘发下大愿、修成阿弥陀佛、建成极乐世界的来龙去脉——净土信仰的源头故事。'],
  ['sa-lotus', 'lotus-sutra', 'buddhism', '佛说：以前讲的几种修行路都是因材施教的方便，最后只有一条路，人人都能成佛。'],
  ['sa-vimala', 'vimalakirti-sutra', 'buddhism', '在家居士维摩诘「病了」，佛的大弟子都不敢去探病，因为都被他问倒过；文殊菩萨去了，两人谈「不二」。'],
  ['sa-lanka', 'lankavatara-sutra', 'buddhism', '佛在楞伽山为大慧菩萨讲：我们看到的世界，都是心自己显现出来的。早期禅宗拿它来印心。'],
  ['sa-gita', 'bhagavad-gita', 'hinduism', '大战开打前，阿周那不忍向亲人动手；黑天告诉他：尽你的本分去做，但别执着结果。'],
  ['sa-yoga', 'yoga-sutras', 'hinduism', '一百九十多句短句讲清楚：瑜伽就是让心的波动停下来，以及一步一步怎么做到。'],
];

const index = JSON.parse(readFileSync(join(SRC, 'index.json'), 'utf8'));
const entries = Array.isArray(index) ? index : (index.books ?? Object.values(index));

for (const f of readdirSync(OUT)) if (f.endsWith('.json')) rmSync(join(OUT, f));

let total = 0;
BOOKS.forEach(([id, slug, tradition, summary], order) => {
  const meta = entries.find((e) => e.id === id);
  if (!meta) throw new Error(`面板书库 index.json 里没有 ${id}`);
  const data = JSON.parse(readFileSync(join(SRC, `${id}.json`), 'utf8'));
  const oldTranslator = /·\s*(\S+?)本对照/.exec(data.parts?.[0]?.name ?? '')?.[1];

  const chapters = data.chapters.map((ch) => {
    const verses = [];
    for (const b of ch.blocks) {
      if (b.t === 'p') verses.push({ zh: b.text.trim() });
      else if (!verses.length) throw new Error(`${id} ${ch.title}: 开头不是白话段`);
      else if (b.t === 'sa') verses.at(-1).sa = { text: b.text.trim(), tr: (b.tr ?? '').trim() };
      else if (b.t === 'old') {
        const notes = (b.notes ?? []).filter((n) => n.w?.trim() && n.note?.trim());
        if (!b.text?.trim() && !notes.length) continue;
        verses.at(-1).old = {
          ...(b.who ? { who: b.who } : {}),
          ...(b.text?.trim() ? { text: b.text.trim() } : {}),
          ...(b.plain?.trim() ? { plain: b.plain.trim() } : {}),
          ...(notes.length ? { notes } : {}),
        };
      } else throw new Error(`${id}: 不认识的段落类型 ${b.t}`);
    }
    total += verses.length;
    return { title: ch.title.trim(), verses };
  });

  const book = {
    slug,
    order,
    tradition,
    title: meta.title.replace(/^《(.+?)》.*$/, '$1'),
    sanskrit: meta.author.trim(),
    ...(oldTranslator ? { oldTranslator } : {}),
    summary,
    chapters,
  };
  writeFileSync(join(OUT, `${slug}.json`), `${JSON.stringify(book, null, 1)}\n`);
  console.log(`${slug}: ${chapters.length} 章`);
});
console.log(`共 ${BOOKS.length} 部、${total} 段`);
