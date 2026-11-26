// 从个人面板书库导入：<面板>/client/public/books/local/sa-*.json（梵文）、pi-*.json（巴利文）、lzh-*.json（文言）、grc-*.json（希腊文）、ar-*.json（阿拉伯文） -> content/<slug>.json
// 面板那边是 prose 格式（p 白话直译 → old 古译对照 → sa 梵文，一段一组），这里转成本站的 verses。
// 用法：node scripts/import-dashboard.mjs [面板书库目录]
import { readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] ?? '/Users/MacBookPro/Developer/Project/personal-dashboard/client/public/books/local';
const OUT = new URL('../content/', import.meta.url).pathname;

// 面板 id -> 本站 slug、分组、简介，以及原文 / 古译的底本来源（页面底部署名用）。顺序就是首页的排列顺序。
// 来源：orig = 原文电子录文，old = 古译电子本；license 照来源自己的授权写。老九部当时没记来源，不写。
const GRETIL = 'https://gretil.sub.uni-goettingen.de/';
const SC = { name: 'SuttaCentral（Mahāsaṅgīti）', en: 'SuttaCentral (Mahāsaṅgīti)', url: 'https://suttacentral.net/', license: 'CC0' };
const NC = 'CC BY-NC-SA 4.0';
const cbeta = (no) => ({ name: `CBETA ${no}`, en: `CBETA ${no.replace(/（.*）/, '')}`, url: 'https://cbetaonline.dila.edu.tw/', license: 'CBETA 非商业使用条款', licenseEn: 'CBETA non-commercial terms' });
const BOOKS = [
  ['sa-heart', 'heart-sutra', 'buddhism', '两百多字讲「空」：构成「我」的五类东西都没有不变的本质。看清这一点，心就不再被恐惧绑住。'],
  ['sa-vajra', 'diamond-sutra', 'buddhism', '须菩提问佛：想求觉悟的人，心该怎么放？佛的回答是：去帮助一切众生，但心里不抓着「我在帮人」。'],
  ['sa-nilakantha', 'great-compassion-mantra', 'buddhism', '华人最常念的观音咒，一句一句讲清每个音在梵文里是什么意思：先礼敬三宝和观自在，再呼唤「青颈」观音护佑、唤醒众生，最后是一串「愿某某吉祥」的祝祷。',
    { orig: { ...cbeta('T20n1113B（不空译悉昙本）') }, old: cbeta('T20n1060') }],
  ['sa-amitabha', 'amitabha-sutra', 'buddhism', '没有人发问，佛自己讲起西方极乐世界的样子，劝人一心念阿弥陀佛的名号，往生到那里。'],
  ['sa-bhaisajya', 'medicine-buddha', 'buddhism', '佛讲东方琉璃世界的药师佛：他从前发了十二个大愿，要治众生的病、让饿的人吃饱、冷的人穿暖；听到他的名字、供养他，能免横死、消灾延寿。',
    { orig: { name: 'GRETIL（DSBC 录入，Vaidya 1961 校本）', en: 'GRETIL (DSBC transcription of Vaidya’s 1961 edition)', url: GRETIL, license: NC }, old: cbeta('T14n0450') }],
  ['sa-bhadracari', 'bhadracari', 'buddhism', '《华严经》结尾的六十二颂愿文：礼佛、供养、忏悔、随喜、请佛说法、请佛住世、回向，再发愿生生世世修「贤善之行」，临终往生极乐。',
    { orig: { name: 'GRETIL（DSBC 录入，Vaidya 1960 校本 Gaṇḍavyūha）', en: 'GRETIL (DSBC transcription of Vaidya’s 1960 Gaṇḍavyūha)', url: GRETIL, license: NC }, old: cbeta('T10n0293') }],
  ['sa-sukhavati', 'larger-sukhavati', 'buddhism', '法藏比丘发下大愿、修成阿弥陀佛、建成极乐世界的来龙去脉——净土信仰的源头故事。'],
  ['sa-lotus', 'lotus-sutra', 'buddhism', '佛说：以前讲的几种修行路都是因材施教的方便，最后只有一条路，人人都能成佛。'],
  ['sa-vimala', 'vimalakirti-sutra', 'buddhism', '在家居士维摩诘「病了」，佛的大弟子都不敢去探病，因为都被他问倒过；文殊菩萨去了，两人谈「不二」。'],
  ['sa-lanka', 'lankavatara-sutra', 'buddhism', '佛在楞伽山为大慧菩萨讲：我们看到的世界，都是心自己显现出来的。早期禅宗拿它来印心。'],
  ['sa-mmk', 'middle-way-verses', 'buddhism', '龙树用二十七品短偈，一样一样追问因缘、来去、自我、时间、如来、涅槃，指出什么都找不到独立不变的本质：依条件而有，就是空，也就是中道。',
    { orig: { name: 'GRETIL（Bachman 录入、Mahoney 修订，de Jong 1977 颂本）', en: 'GRETIL (input by Bachman, revised by Mahoney; de Jong 1977 verses)', url: GRETIL, license: NC }, old: cbeta('T30n1564') }],
  ['sa-trimsika', 'thirty-verses', 'buddhism', '世亲用三十首偈讲一件事：我们说的「我」和「世界」，都是识自己变现出来的；从阿赖耶识一路讲到怎样修到「转依」。',
    { orig: { name: 'GRETIL（DSBC 录入）', en: 'GRETIL (DSBC transcription)', url: GRETIL, license: NC }, old: cbeta('T31n1586') }],
  ['sa-vimsatika', 'twenty-verses', 'buddhism', '世亲回应「只有识、没有外境」会招来的反驳：梦、饿鬼、地狱、极微、杀生、他心智，一路论证世界只是心的显现。',
    { orig: { name: 'GRETIL（Fukita 录入，Lévi 1925 校本）', en: 'GRETIL (input by Fukita; Lévi 1925 edition)', url: GRETIL, license: NC }, old: cbeta('T31n1590') }],
  ['sa-nyayapravesa', 'gateway-to-logic', 'buddhism', '一本辩论和推理的入门手册：怎样立主张、给理由、举例子，哪些论证看着对其实不对，最后讲「亲见」和「推理」两种认识途径。',
    { orig: { name: 'Dhruva 校本（GOS 38，1930），本站据 OCR 校订', en: 'Dhruva edition (GOS 38, 1930), corrected by this site from OCR', url: 'https://jainqq.org/', license: '公有领域', licenseEn: 'public domain' }, old: cbeta('T32n1630') }],
  ['sa-buddhacarita', 'buddhacarita', 'buddhism', '马鸣用宫廷长诗写佛陀的前半生：出生、宫中享乐、出城见老病死、夜里离家、访师苦行，直到菩提树下降魔、开始觉悟。梵文只存到这里。',
    { orig: { name: 'GRETIL（DSBC 录入，Johnston 1935 校本）', en: 'GRETIL (DSBC transcription of Johnston’s 1935 edition)', url: GRETIL, license: NC }, old: cbeta('T04n0192') }],
  ['pi-metta', 'metta-sutta', 'theravada', '十首偈：先说想求寂静的人该是什么样子——正直、知足、不贪恋，再教人像母亲护着独子那样，把善意毫无界限地给一切众生。',
    { orig: SC }],
  ['pi-mangala', 'mangala-sutta', 'theravada', '有人问什么才是最好的吉祥。佛不讲兆头和仪式，而是一条条列出做人的德行：亲近智者、孝养父母、布施、谦卑、知恩，直到心不被得失动摇。',
    { orig: SC, old: cbeta('T04n0210') }],
  ['pi-dhammacakka', 'dhammacakka', 'theravada', '佛成道后第一次说法：不走纵欲和苦行两个极端，讲苦、苦的起源、苦的止息、止息之路四个真理，以及他怎样三层地看清它们。',
    { orig: SC, old: cbeta('T02n0109') }],
  ['pi-satipatthana', 'satipatthana', 'theravada', '讲正念最完整的一部经：时时看着自己的身体、感受、心和心里的种种现象，看清它们怎样生起、怎样消失，从而不再执取。',
    { orig: SC, old: cbeta('T01n0026（第 98 经）') }],
  ['pi-dhammapada', 'dhammapada', 'theravada', '423 首短偈，讲心怎样带出苦和乐、怎样不放逸、怎样对待怨恨和贪爱。一颂一个道理，是南传佛教最常背诵的经。',
    { orig: SC, old: cbeta('T04n0210') }],
  ['sa-gita', 'bhagavad-gita', 'hinduism', '大战开打前，阿周那不忍向亲人动手；黑天告诉他：尽你的本分去做，但别执着结果。'],
  ['sa-yoga', 'yoga-sutras', 'hinduism', '一百九十多句短句讲清楚：瑜伽就是让心的波动停下来，以及一步一步怎么做到。'],
  ['sa-samkhya', 'samkhya-karika', 'hinduism', '自在黑用七十来颂讲数论派的世界观：世界分成能变出万物的「原质」和只看不动的「原人」，认清两者的分别，就能脱离苦。',
    { orig: { name: 'GRETIL（Chowkhamba 1970 本；第 66 颂取 Ruzsa 校本）', en: 'GRETIL (Chowkhamba 1970; verse 66 from Ruzsa’s edition)', url: GRETIL, license: NC }, old: cbeta('T54n2137') }],
  ['sa-upanishads', 'upanishads', 'hinduism', '三部古印度奥义书，讲「自我」和宇宙根本「梵」的关系：伊莎篇讲舍弃与享用；蛙氏篇用「唵」的三个音讲醒、梦、熟睡和第四种状态；羯陀篇是少年那支凯多向死神追问人死后去哪里。',
    { orig: { name: 'GRETIL（伊莎：Kāṇva 本；蛙氏：Samuels 录入；羯陀：据 Olivelle 1998 校本）', en: 'GRETIL (Īśā: Kāṇva recension; Māṇḍūkya: input by Samuels; Kaṭha: after Olivelle 1998)', url: GRETIL, license: NC } }],
  ['lzh-daodejing', 'tao-te-ching', 'chinese', '老子五千字，八十一章：讲「道」是什么，人怎样顺着它过日子、治理国家：不争、处下、少一点干预。',
    { orig: { name: '维基文库《道德經 (王弼本)》', en: 'Chinese Wikisource, Daodejing (Wang Bi edition)', url: 'https://zh.wikisource.org/wiki/道德經_(王弼本)', license: '公有领域；录文 CC BY-SA 4.0', licenseEn: 'public domain text; transcription CC BY-SA 4.0' } }],
  // 古兰经分批做：2026-11-21 第一批是开端章 + 第 30 卷（第 78–114 章），章号写在每章的 no 上。
  // 原文是 Tanzil 的 Uthmani 本（逐字照抄，授权不许改动）；王静斋译本只有维基文库录了第一、二章，别的章没有可靠录文，先不放。
  ['ar-quran', 'quran', 'islam', '伊斯兰教的经典，也叫可兰经，穆斯林相信是真主通过天使降给先知穆罕默德的话，共 114 章。这里先收每天礼拜都念的开端章，和最后一卷（第 78–114 章）：都是早期在麦加降下的短章，讲真主独一、末日清算、善待孤儿和穷人。',
    {
      orig: { name: 'Tanzil Project（Uthmani 本 1.1）', en: 'Tanzil Project (Uthmani text 1.1)', url: 'https://tanzil.net/', license: 'CC BY 3.0，原样转载、不得改动', licenseEn: 'CC BY 3.0, verbatim copies only' },
      old: { name: '维基文库《古蘭經譯解》（王静斋 1946 年丙种本，只录了前两章）', url: 'https://zh.wikisource.org/wiki/古蘭經譯解', license: '公有领域', label: '旧译' },
      notice: 'Tanzil Quran Text (Uthmani, Version 1.1). Copyright (C) 2007-2026 Tanzil Project. License: Creative Commons Attribution 3.0. Permission is granted to copy and distribute verbatim copies of this text, but changing it is not allowed. This Quran text can be used in any website or application, provided that its source (Tanzil Project) is clearly indicated, and a link is made to tanzil.net to enable users to keep track of changes. This copyright notice shall be included in all verbatim copies of the text, and shall be reproduced appropriately in all files derived from or containing substantial portion of this text.',
    }],
  // 圣经分卷做：2026-11-26 第一卷是马可福音（先做第 1 章当样板，用户看过口气后做完 16 章），章号写在每章的 no 上。
  // 原文是 SBLGNT（CC BY 4.0），只去掉校勘符号；对照栏是 1919 年的和合本（公有领域，维基文库录文，繁转简）。
  ['grc-mark', 'mark', 'christianity', '新约四卷福音书里最短的一卷，讲耶稣（基督徒相信他是上帝派来的救主）做了什么、说了什么、怎样被钉死又复活。故事讲得很快，一件接一件，共 16 章：从他在约旦河受洗，到加利利传道、治病、赶鬼，再到耶路撒冷的最后一个星期和空了的坟墓。',
    {
      orig: { name: 'SBL Greek New Testament（SBLGNT 1.2，去掉校勘符号）', en: 'SBL Greek New Testament (SBLGNT 1.2, text-critical sigla removed)', url: 'https://sblgnt.com/', license: 'CC BY 4.0，© 2010 Society of Biblical Literature 与 Logos Bible Software', licenseEn: 'CC BY 4.0, © 2010 Society of Biblical Literature and Logos Bible Software' },
      old: { name: '维基文库《聖經 (和合本)》（1919 年官话和合译本，繁转简）', url: 'https://zh.wikisource.org/wiki/聖經_(和合本)', license: '公有领域；录文 CC BY-SA 4.0', label: '旧译' },
    }],
  // 圣经第二卷：马太福音 28 章（2026-11-27）。底本、对照栏、做法同马可福音。
  ['grc-matthew', 'matthew', 'christianity', '新约的第一卷，从耶稣（基督徒相信他是上帝派来的救主）的家谱和出生讲起，到他被钉死、复活为止，共 28 章。里面有大段的教导，最有名的是第 5–7 章的「登山宝训」；书里一再引旧约的话，说耶稣身上发生的事经上早就写了。',
    {
      orig: { name: 'SBL Greek New Testament（SBLGNT 1.2，去掉校勘符号）', en: 'SBL Greek New Testament (SBLGNT 1.2, text-critical sigla removed)', url: 'https://sblgnt.com/', license: 'CC BY 4.0，© 2010 Society of Biblical Literature 与 Logos Bible Software', licenseEn: 'CC BY 4.0, © 2010 Society of Biblical Literature and Logos Bible Software' },
      old: { name: '维基文库《聖經 (和合本)》（1919 年官话和合译本，繁转简）', url: 'https://zh.wikisource.org/wiki/聖經_(和合本)', license: '公有领域；录文 CC BY-SA 4.0', label: '旧译' },
    }],
  // 圣经第三卷：路加福音 24 章（2026-11-27）。底本、对照栏、做法同前两卷。
  ['grc-luke', 'luke', 'christianity', '新约四卷福音书里最长的一卷，从施洗约翰和耶稣（基督徒相信他是上帝派来的救主）的出生讲起，到他被钉死、复活为止，共 24 章。很多故事只有这卷书里有，比如好心的撒玛利亚人、离家的小儿子；书里特别留意穷人、妇女和被人看不起的人。',
    {
      orig: { name: 'SBL Greek New Testament（SBLGNT 1.2，去掉校勘符号）', en: 'SBL Greek New Testament (SBLGNT 1.2, text-critical sigla removed)', url: 'https://sblgnt.com/', license: 'CC BY 4.0，© 2010 Society of Biblical Literature 与 Logos Bible Software', licenseEn: 'CC BY 4.0, © 2010 Society of Biblical Literature and Logos Bible Software' },
      old: { name: '维基文库《聖經 (和合本)》（1919 年官话和合译本，繁转简）', url: 'https://zh.wikisource.org/wiki/聖經_(和合本)', license: '公有领域；录文 CC BY-SA 4.0', label: '旧译' },
    }],
];

/** 面板 prose 格式 -> 本站的 chapters[]。导入和 check-dashboard-book.mjs 共用。 */
export function convertChapters(data, id) {
  return data.chapters.map((ch) => {
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
    return { title: ch.title.trim(), ...(ch.no ? { no: ch.no } : {}), ...(ch.intro?.trim() ? { intro: ch.intro.trim() } : {}), ...(ch.points?.length ? { points: ch.points } : {}), verses };
  });
}

export const oldTranslatorOf = (data) => /·\s*(\S+?)本对照/.exec(data.parts?.[0]?.name ?? '')?.[1];

if (import.meta.url === `file://${process.argv[1]}`) {
const index = JSON.parse(readFileSync(join(SRC, 'index.json'), 'utf8'));
const entries = Array.isArray(index) ? index : (index.books ?? Object.values(index));

for (const f of readdirSync(OUT)) if (f.endsWith('.json')) rmSync(join(OUT, f));

let total = 0;
BOOKS.forEach(([id, slug, tradition, summary, source], order) => {
  const meta = entries.find((e) => e.id === id);
  if (!meta) throw new Error(`面板书库 index.json 里没有 ${id}`);
  const data = JSON.parse(readFileSync(join(SRC, `${id}.json`), 'utf8'));
  const oldTranslator = oldTranslatorOf(data);
  const chapters = convertChapters(data, id);
  total += chapters.reduce((n, ch) => n + ch.verses.length, 0);

  const book = {
    slug,
    order,
    tradition,
    ...(id.startsWith('pi-') ? { origLang: 'pi' } : id.startsWith('ar-') ? { origLang: 'ar' } : id.startsWith('lzh-') ? { origLang: 'lzh' } : id.startsWith('grc-') ? { origLang: 'grc' } : {}),
    title: meta.title.replace(/^《(.+?)》.*$/, '$1'),
    sanskrit: meta.author.trim(),
    ...(oldTranslator ? { oldTranslator } : {}),
    summary,
    ...(source ? { source } : {}),
    chapters,
  };
  writeFileSync(join(OUT, `${slug}.json`), `${JSON.stringify(book, null, 1)}\n`);
  console.log(`${slug}: ${chapters.length} 章`);
});
console.log(`共 ${BOOKS.length} 部、${total} 段`);
}
