// content/*.json + translations/en + src/ -> dist/：中文版（/…）与英文版（/en/…）两套静态页，外加 sitemap / robots / llms.txt。
// 中文版收全部经书；英文版只收有英译的书，其余在英文首页列为「Chinese only for now」并链到中文页。
// 右上角 EN | 中文 一键切到另一种语言的同一页（eden-tan.com 的做法），对应页不存在时切到那种语言的首页。
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBooks, TRADITIONS } from './content.mjs';
import { DIVIDER_SEEDS, coverTone, dividerMark, emblemPicture, writeCovers, writeEmblems } from './emblems.mjs';
import { sceneSvg } from './panels.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT_DIR ?? join(ROOT, 'dist');
const SITE = (process.env.SITE_URL ?? 'https://scripture.eden-tan.com').replace(/\/$/, '');
const HOST = new URL(SITE).host;
const MAIN_SITE = 'https://eden-tan.com';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';
// 分享图尺寸(src/og-<lang>.jpg,scripts/og-image.mjs 生成;改尺寸两边一起改)
const OG_W = 1200;
const OG_H = 630;

// 还没有英译的书：英文首页上的书名与一句简介
const EN_PENDING = {
  'larger-sukhavati': ['The Larger Sukhavati Sutra', 'How the monk Dharmakara made his great vows, became the Buddha Amitabha, and built the Land of Bliss: the origin story of Pure Land faith.'],
  'lotus-sutra': ['The Lotus Sutra', 'The Buddha says the different paths he taught before were skillful means fitted to each listener; in the end there is only one path, and everyone can become a buddha.'],
  'vimalakirti-sutra': ['The Vimalakirti Sutra', 'The layman Vimalakirti is "ill". None of the Buddha’s great disciples dare visit him, since he has out-argued each of them; Manjushri goes, and the two talk about non-duality.'],
  'lankavatara-sutra': ['The Lankavatara Sutra', 'On Mount Lanka the Buddha teaches the bodhisattva Mahamati that the world we see is the mind showing itself. Early Chan used it to confirm awakening.'],
  'great-compassion-mantra': ['The Great Compassion Mantra', 'The Avalokiteshvara mantra Chinese Buddhists chant most, explained line by line from the Sanskrit: homage to the Three Jewels, a call to the "blue-throated" lord, and a string of blessings.'],
  'medicine-buddha': ['The Medicine Buddha Sutra', 'The Buddha of the eastern Lapis Lazuli land and his twelve vows: to heal the sick, feed the hungry and clothe the cold.'],
  bhadracari: ['The Vow of Good Conduct', 'The sixty-two verses that close the Avatamsaka: homage, offering, confession, rejoicing, and the vow to keep the "good conduct" life after life.'],
  'middle-way-verses': ['Verses on the Middle Way', 'Nagarjuna questions causes, motion, self, time and nirvana one by one and finds nothing with a fixed nature of its own: what arises from conditions is empty, and that is the middle way.'],
  'thirty-verses': ['Thirty Verses on Consciousness Only', 'Vasubandhu in thirty verses: the "self" and the "world" are what consciousness itself projects, from the store-consciousness to the final turning around.'],
  'twenty-verses': ['Twenty Verses on Consciousness Only', 'Vasubandhu answers the objections to "only consciousness, no outer objects": dreams, hungry ghosts, hells, atoms, killing and reading other minds.'],
  'gateway-to-logic': ['A Gateway to Logic', 'A handbook of debate: how to state a thesis, give a reason and an example, which arguments only look valid, and the two ways of knowing, perception and inference.'],
  buddhacarita: ['The Life of the Buddha', 'Ashvaghosha’s court epic of the Buddha’s early life, from his birth to his victory over Mara under the bodhi tree. The Sanskrit survives only this far.'],
  'metta-sutta': ['The Discourse on Loving-kindness', 'Ten verses: what someone seeking peace should be like, and how to give goodwill without limit to every being, as a mother guards her only child.'],
  'mangala-sutta': ['The Discourse on Blessings', 'Asked what the highest blessing is, the Buddha skips omens and rituals and lists ways of living instead, up to a mind that gain and loss cannot shake.'],
  dhammacakka: ['Setting the Wheel of Dhamma in Motion', 'The Buddha’s first teaching: avoid both indulgence and self-torment, and the four truths about suffering, its origin, its end and the way there.'],
  satipatthana: ['The Great Discourse on Mindfulness', 'The fullest teaching on mindfulness: keep watching body, feelings, mind and mental phenomena, see them arise and pass, and stop clinging.'],
  dhammapada: ['The Dhammapada', '423 short verses on how the mind brings pain and joy, on heedfulness, hatred and craving. The most memorized text in Theravada Buddhism.'],
  'samkhya-karika': ['The Samkhya Verses', 'Ishvarakrishna’s seventy-odd verses: the world splits into matter that becomes everything and spirit that only watches; seeing the difference ends suffering.'],
  upanishads: ['Three Upanishads', 'Isha, Mandukya and Katha on the self and brahman: renouncing and enjoying, the four states behind the syllable Om, and a boy who questions Death.'],
};

const T = {
  zh: {
    htmlLang: 'zh-Hans',
    prefix: '',
    siteName: '经书白话直译',
    siteSub: '',
    home: '首页',
    sitemap: '网站地图',
    footer: '梵文、巴利文、文言原文与古代汉译（玄奘、鸠摩罗什、真谛、维祇难等）都是公有领域；古兰经的阿拉伯文原文取自 Tanzil 项目（tanzil.net，CC BY 3.0），逐字照录、没有改动；圣经的希腊文原文取自 SBL Greek New Testament（sblgnt.com，CC BY 4.0），只去掉校勘符号，对照的和合本（1919 年）是公有领域；白话直译、英译、古译今译与注释是本站整理，以 CC BY 4.0 授权：注明出处（Eden Tan · scripture.eden-tan.com）即可自由使用、转载、改编。',
    notFound: '找不到这一页',
    backHome: '回到首页',
    cols: '显示哪几栏',
    verseLabel: (n) => `第 ${n} 段`,
    chapters: (n) => `${n} 章`,
    verses: (n) => `${n} 段`,
    sep: ' · ',
    compareKicker: (o) => `${o} · 英文 · 中文`,
    compareTitle: (o) => `英文、中文、${o}差在哪`,
    compareHint: '每段白话下面的「三语对照」，是这一段里具体的差别。',
    cmpLabel: (n) => `三语对照 ${n}`,
    toDark: '换成深色',
    toLight: '换成浅色',
    shelfReading: '在读',
    shelfReadingSub: '点一下，回到上次读到的那一段',
    shelfDone: '读完了',
    nextCh: '下一章',
    prevCh: '上一章',
    endToc: ['这部书读到最后一章了', '回到目录'],
    endHome: ['这部经读完了', '看看别的经书'],
    position: '读到第几段',
    introLabel: '这一章在讲什么',
    primerKicker: '第一次读',
    primerTitle: '读之前先知道这几件事',
    guideBtn: '导读',
    guideClose: '关上导读',
    storyLabel: '一图看懂',
    primerMeta: (n, min) => `${n} 条 · 大约 ${min} 分钟读完`,
    coverAlt: (name) => `《${name}》封面插画`,
    // 分享图(scripts/og-image.mjs 生成):站名、几部常搜的经名、莲花线稿
    ogImage: '/og-zh.jpg',
    ogAlt: '经书白话直译的分享图：心经、金刚经、大悲咒等经名，旁边一朵莲花线稿',
  },
  en: {
    htmlLang: 'en',
    prefix: '/en',
    siteName: 'Scriptures, Plainly',
    siteSub: '',
    home: 'Home',
    sitemap: 'Sitemap',
    footer: 'The Sanskrit, Pali and Classical Chinese texts and the classical Chinese translations (Xuanzang, Kumarajiva, Paramartha, Zhi Qian and others) are in the public domain. The Arabic text of the Quran is the Tanzil Project’s (tanzil.net, CC BY 3.0), reproduced verbatim. The Greek text of the Bible is the SBL Greek New Testament (sblgnt.com, CC BY 4.0) with its text-critical sigla removed. The English and plain-Chinese translations and all notes are this site’s own work, licensed under CC BY 4.0: free to use, share and adapt with credit to Eden Tan · scripture.eden-tan.com.',
    notFound: 'Page not found',
    backHome: 'Back to home',
    cols: 'Columns to show',
    verseLabel: (n) => `Passage ${n}`,
    chapters: (n) => `${n} chapters`,
    verses: (n) => `${n} passages`,
    sep: ' · ',
    compareKicker: (o) => `${o} · English · Chinese`,
    compareTitle: (o) => `Where English, Chinese and ${o} part ways`,
    compareHint: 'The “Three languages” note under a passage gives the specific differences in that passage.',
    cmpLabel: (n) => `Three languages ${n}`,
    toDark: 'Switch to dark theme',
    toLight: 'Switch to light theme',
    shelfReading: 'Reading',
    shelfReadingSub: 'One tap takes you back to the passage you stopped at',
    shelfDone: 'Finished',
    nextCh: 'Next chapter',
    prevCh: 'Previous',
    endToc: ['That was the last chapter', 'Back to contents'],
    endHome: ['You have reached the end', 'Browse the other scriptures'],
    position: 'Current passage',
    introLabel: 'What this chapter says',
    primerKicker: 'New to this book',
    primerTitle: 'A few things to know before you read',
    guideBtn: 'Guide',
    guideClose: 'Close the guide',
    storyLabel: 'At a glance',
    primerMeta: (n, min) => `${n} notes · about ${min} min`,
    coverAlt: (name) => `Cover illustration for ${name}`,
    ogImage: '/og-en.jpg',
    ogAlt: 'Scriptures, Plainly: Heart Sutra, Bhagavad Gita and Dhammapada in plain English, beside a line drawing of a lotus',
  },
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export const bookPath = (b, lang = 'zh') => `${T[lang].prefix}/${b.slug}/`;
// 章号：只收了一部分章的书（古兰经先收第 1、78–114 章）每章自己带 no，网址和阅读进度都按它走，以后补上别的章也不会变
export const chNo = (b, i) => b.chapters[i].no ?? i + 1;
// 单章的书：只有一章、而且这一章不带章号。带章号的书是分批做的（古兰经、圣经各卷），哪怕现在只收了一章也照多章书排，网址以后不变。
export const isSingle = (b) => b.chapters.length === 1 && b.chapters[0].no === undefined;
export const chapterPath = (b, i, lang = 'zh') => (isSingle(b) ? bookPath(b, lang) : `${T[lang].prefix}/${b.slug}/${chNo(b, i)}/`);
const homePath = (lang) => `${T[lang].prefix}/`;
const verseCount = (b) => b.chapters.reduce((n, ch) => n + ch.verses.length, 0);
const hasEn = (b) => Boolean(b.en);
// 原文语言：梵文（缺省）、巴利文或阿拉伯文。书的 origLang 由导入脚本按面板 id 前缀（sa- / pi- / ar-）写入。
const ORIG = {
  sa: { zh: '梵文', en: 'Sanskrit', short: '梵' },
  pi: { zh: '巴利文', en: 'Pali', short: '巴' },
  lzh: { zh: '文言', en: 'Classical Chinese', short: '文' },
  ar: { zh: '阿拉伯文', en: 'Arabic', short: '阿' },
  grc: { zh: '希腊文', en: 'Greek', short: '希' },
};
// 原文是汉字的书：没有天城体，也没有罗马转写那一行
const isHan = (b) => origCode(b) === 'lzh';
// 原文栏放的是什么：梵文、巴利文是天城体 + 罗马转写；阿拉伯文、希腊文是原文 + 罗马转写；文言只有原文
const ownScript = (b) => ['ar', 'grc'].includes(origCode(b));
const scriptNote = (b, lang) =>
  ownScript(b)
    ? lang === 'en' ? `the ${orig(b, 'en')} text and a romanization` : `附${orig(b, 'zh')}原文与罗马转写`
    : isHan(b)
      ? lang === 'en' ? 'the Classical Chinese original' : '附文言原文'
      : lang === 'en' ? `the ${orig(b, 'en')} in Devanagari and romanization` : `附${orig(b, 'zh')}天城体与罗马转写`;
const origCode = (b) => b?.origLang ?? 'sa';
const orig = (b, lang) => ORIG[origCode(b)][lang];
const langs = (lang, b) => (b ? [T[lang].htmlLang, origCode(b)] : [T[lang].htmlLang, 'sa', 'pi', 'lzh', 'ar', 'grc']);

const title = (b, lang) => (lang === 'en' ? b.en.title : b.title);
// 英文版 <title> 与 description 用的「大家搜的名字」。页面上的书名照旧用直译名（The Heart of the Perfection of Wisdom），
// 但英文用户搜的是 Heart Sutra、Bhagavad Gita，标题里没有这个词就几乎排不上。书名里已经带通行名的不用写。
const EN_SEARCH_NAME = {
  'heart-sutra': 'Heart Sutra',
  'diamond-sutra': 'Diamond Sutra',
  'bhagavad-gita': 'Bhagavad Gita',
  'metta-sutta': 'Metta Sutta',
  'mangala-sutta': 'Mangala Sutta',
  satipatthana: 'Mahasatipatthana Sutta',
  dhammacakka: 'Dhammacakkappavattana Sutta',
  'middle-way-verses': 'Mulamadhyamakakarika',
  buddhacarita: 'Buddhacarita',
  bhadracari: 'King of Prayers (Bhadracari)',
  'samkhya-karika': 'Samkhya Karika',
  'thirty-verses': 'Trimshika (Thirty Verses)',
  'twenty-verses': 'Vimshatika (Twenty Verses)',
  'gateway-to-logic': 'Nyayapravesha',
  upanishads: 'Isha, Mandukya and Katha Upanishads',
  'tao-te-ching': 'Tao Te Ching (Dao De Jing)',
  quran: 'Quran',
  mark: 'Gospel of Mark',
};
export const enSearchName = (b) => EN_SEARCH_NAME[b.slug] ?? b.en.title.replace(/^The /, '');
// 梵文书名里带的中文注（如「(小本)」）在英文版换成英文
const saName = (b, lang) => (lang === 'en' ? b.sanskrit.replace('(小本)', ' (shorter)').replace('(大本)', ' (longer)') : b.sanskrit);
const summary = (b, lang) => (lang === 'en' ? b.en.summary : b.summary);
const chTitle = (ch, lang) => (lang === 'en' ? ch.en : ch.title);
// 只有个别章有旧译的书（古兰经只有开端章有王静斋译本）不写全书的 oldTranslator，这一章有就在这一章标
const chapterTranslator = (b, ch) => b.oldTranslator ?? (origCode(b) === 'ar' ? ch?.verses.find((v) => v.old?.text)?.old.who : undefined);
function compareLabel(b, lang, ch) {
  if (lang === 'en') return `translated from the ${orig(b, 'en')}`;
  if (isHan(b)) return '文言原文对照';
  const who = chapterTranslator(b, ch);
  return who ? `${who}译本对照` : `${ORIG[origCode(b)].short}汉对照`;
}

// 三语对照总结。多章书放在目录页，单章书放在经文后面。
function compareSection(b, lang) {
  if (!hasEn(b)) return '';
  const t = T[lang];
  const paras = lang === 'en' ? (b.en.compareEn ?? b.en.compare) : b.en.compare;
  const pLang = lang === 'en' && !b.en.compareEn ? ' lang="zh-Hans"' : '';
  return `
<section class="compare" id="compare">
  <p class="kicker">${t.compareKicker(orig(b, lang))}</p>
  <h2>${esc(t.compareTitle(orig(b, lang)))}</h2>
  ${paras.map((p) => `<p${pLang}>${esc(p)}</p>`).join('\n  ')}
  <p class="meta">${esc(t.compareHint)}</p>
</section>`;
}

/** 「读之前先知道这几件事」：没背景的人先看的几条问答。多章书放在目录页章节列表前面（头两条展开）；单章书放在经文前面（只展开第一条）。
 *  左边是这本书的花纹章、标题和「几条、大约几分钟」，右边是编号的问答；「常见的词」排成一格一格的小卡。 */
function primerSection(b, lang, open = 2) {
  const items = b.primer?.[lang];
  if (!items) return '';
  const t = T[lang];
  const text = items.map((it) => it.a + (it.terms ?? []).flat().join('')).join('');
  const minutes = Math.max(1, Math.ceil(lang === 'en' ? text.split(/\s+/).length / 200 : text.length / 350));
  return `
<section class="primer" id="primer">
  <header class="primer-head">
    <p class="kicker">${t.primerKicker}</p>
    <h2>${t.primerTitle}</h2>
    <p class="primer-meta">${t.primerMeta(items.length, minutes)}</p>
    ${emblemPicture(b.slug, 'primer-emblem', { size: 260 }).replace('loading="eager"', 'loading="lazy"')}
  </header>
  <ol class="primer-list">
  ${items
    .map(
      (it, n) =>
        `<li><details${n < open ? ' open' : ''}><summary><span class="primer-no" aria-hidden="true">${String(n + 1).padStart(2, '0')}</span><span class="primer-q">${esc(it.q)}</span></summary><div class="primer-a"><p>${esc(it.a)}</p>${it.terms ? `<dl class="primer-terms">${it.terms.map(([w, note]) => `<div><dt>${esc(w)}</dt><dd>${esc(note)}</dd></div>`).join('')}</dl>` : ''}</div></details></li>`,
    )
    .join('\n  ')}
  </ol>
</section>`;
}

function langToggle(lang, alt) {
  const link = (l, label, full) =>
    l === lang
      ? `<a class="lang-option" href="${esc(alt[l])}" aria-current="true" lang="${T[l].htmlLang}" aria-label="${full}">${label}</a>`
      : `<a class="lang-option" href="${esc(alt[l])}" hreflang="${T[l].htmlLang}" lang="${T[l].htmlLang}" aria-label="${l === 'en' ? 'Switch language to English' : '切换到中文'}">${label}</a>`;
  return `<nav class="lang-toggle" aria-label="Language / 语言">${link('en', 'EN', 'English')}${link('zh', '中文', '中文')}</nav>`;
}

/** alt: { zh, en } 这一页在两种语言里的路径；只有真正对应的页才写 hreflang。 */
function layout({ lang, path, alt, exact = true, title: pageTitle, description, body, jsonLd, noindex = false, bodyData = '' }) {
  const t = T[lang];
  const url = SITE + path;
  const hreflang = exact
    ? `<link rel="alternate" hreflang="zh-Hans" href="${esc(SITE + alt.zh)}">\n<link rel="alternate" hreflang="en" href="${esc(SITE + alt.en)}">\n<link rel="alternate" hreflang="x-default" href="${esc(SITE + alt.zh)}">\n`
    : '';
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="msvalidate.01" content="EFE62ECEA018947B29A9A559E0ED2C27">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${esc(url)}">
${hreflang}<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(t.siteName)}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'zh_CN'}">
<meta property="og:image" content="${esc(SITE + t.ogImage)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="${OG_W}">
<meta property="og:image:height" content="${OG_H}">
<meta property="og:image:alt" content="${esc(t.ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pageTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(SITE + t.ogImage)}">
<meta name="twitter:image:alt" content="${esc(t.ogAlt)}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#050505" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/misans@5.0.0/lib/Normal/MiSansVF.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/misans@5.0.0/lib/Devanagari/MiSansDevanagariVF.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,400&family=Amiri+Quran&display=swap">
<link rel="stylesheet" href="/styles.css">
<script>try{var t=localStorage.getItem('scripture.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n` : ''}</head>
<body data-lang="${lang}"${bodyData}>
<header class="site-header">
  <a class="brand" href="${homePath(lang)}"><img class="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" width="32" height="32"><span class="brand-name">${esc(t.siteName)}${t.siteSub ? `<small>${esc(t.siteSub)}</small>` : ''}</span></a>
  <div class="header-actions">
    ${langToggle(lang, alt)}
    <button class="theme-toggle" type="button" data-to-dark="${esc(t.toDark)}" data-to-light="${esc(t.toLight)}" aria-label="${esc(t.toDark)}" title="${esc(t.toDark)}"><span class="icon-moon" aria-hidden="true"></span><span class="icon-sun" aria-hidden="true"></span></button>
    <a class="home-link" href="${MAIN_SITE}/${lang === 'zh' ? 'zh/' : ''}">Eden ↗</a>
  </div>
</header>
<main>
${body}
</main>
<footer class="site-footer">
  <p>${esc(t.footer)}</p>
  <p><a href="${MAIN_SITE}/">Eden Tan</a> · <a href="/sitemap.xml">${t.sitemap}</a> · <a href="${LICENSE_URL}" rel="license">CC BY 4.0</a></p>
</footer>
<script src="/app.js" defer></script>
</body>
</html>
`;
}

function breadcrumbLd(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
  };
}

// 阅读进度：卡片 / 章节目录带上书的 slug 和每章段数，src/app.js 按本机记下的进度标「读完」「读到一半」
const progressAttrs = (b) =>
  `data-book="${b.slug}" data-verses="${b.chapters.map((ch) => ch.verses.length).join(',')}"${b.chapters[0].no ? ` data-nos="${b.chapters.map((ch) => ch.no).join(',')}"` : ''}`;

// 首页封面墙(xhs-cover-feed 技能):一本书一张「封面」——纯色墨底 + 传统 + 大字书名 + 这本书自己的主题线稿放大出血,
// 封面下面不要卡片框,原文书名、一句简介、章段数自由排。墨色 6 种、版式 4 种、底纹 5 种、比例 6 种,周期互质错开,
// 都按书在全站的顺序 n 取,所以书卡被 app.js 搬到「在读 / 读完了」之后封面不变。
const FEED_RATIOS = ['3 / 4', '4 / 5', '2 / 3', '4 / 5', '3 / 4', '5 / 6'];
// 书名字号按长短分档(单位 cqi = 封面宽度的百分比):中文 2–6 个字放得很大,英文长书名缩小,保证 2:3 的封面里放得下
function titleSize(text, lang) {
  if (lang === 'zh') return text.length <= 3 ? 23 : text.length <= 4 ? 19.5 : text.length <= 5 ? 16 : 13.5;
  return text.length <= 16 ? 12.5 : text.length <= 28 ? 10.5 : text.length <= 44 ? 8.8 : 7.2;
}
const SEAL = { zh: { sa: '梵', pi: '巴', lzh: '文', ar: '阿', grc: '希' }, en: { sa: 'SKT', pi: 'PALI', lzh: 'CHN', ar: 'ARAB', grc: 'GRK' } };

function bookCard(b, lang, n, pending = false) {
  const t = T[lang];
  const tone = coverTone(n);
  const name = pending ? (EN_PENDING[b.slug]?.[0] ?? b.sanskrit) : title(b, lang);
  const blurb = pending ? (EN_PENDING[b.slug]?.[1] ?? '') : summary(b, lang);
  const tail = pending ? 'Chinese edition ↗' : esc(compareLabel(b, lang));
  const style = `aspect-ratio:${FEED_RATIOS[n % FEED_RATIOS.length]};--cover-bg:${tone.bg};--cover-ink:${tone.ink};--cover-foil:${tone.foil};--title-size:${titleSize(name, lang)}cqi`;
  return `<li><a class="feed-item" href="${bookPath(b, pending ? 'zh' : lang)}"${pending ? ' hreflang="zh-Hans"' : ''} ${progressAttrs(b)}>
      <div class="feed-art" data-layout="${n % 4}" data-pattern="${n % 5}" style="${style}">
        <img class="feed-scene" src="/covers/${b.slug}.svg" alt="${esc(t.coverAlt(name))}"width="380" height="380" loading="lazy" decoding="async">
        <div class="feed-copy">
          <span class="feed-no" aria-hidden="true">No.${String(n + 1).padStart(2, '0')}</span>
          <span class="feed-kicker">${esc(TRADITIONS[b.tradition][lang])}</span>
          <h3 class="feed-title">${esc(name)}</h3>
          <span class="feed-seal" aria-hidden="true">${SEAL[lang][origCode(b)]}</span>
        </div>
      </div>
      <span class="sa-name" lang="${origCode(b)}-Latn">${esc(saName(b, lang))}</span>
      <p>${esc(blurb)}</p>
      <small>${!isSingle(b) ? `${t.chapters(b.chapters.length)} · ` : ''}${t.verses(verseCount(b))} · ${tail}</small>
    </a></li>`;
}

// 首页的两个书架：「在读」在最上面，「读完了」在最下面。构建时是空的、藏着；src/app.js 按本机的阅读进度把书卡搬进来，
// 没读过的留在原来按传统分的组里。编号（01、02…）也由 app.js 按实际显示的组重排。
function shelf(key, label, sub = '') {
  return `<section class="tradition shelf" data-shelf="${key}" hidden>
  <p class="kicker"></p>
  <h2>${esc(label)}${sub ? `<span>${esc(sub)}</span>` : ''}</h2>
  <ul class="book-list"></ul>
</section>`;
}

function homePage(books, lang) {
  const t = T[lang];
  const shown = lang === 'en' ? books.filter(hasEn) : books;
  const groups = Object.entries(TRADITIONS)
    .map(([key, label]) => [label, shown.filter((b) => b.tradition === key)])
    .filter(([, list]) => list.length);
  const pending = books.filter((b) => !hasEn(b));
  const intro =
    lang === 'en'
      ? `<p class="kicker">Scripture / ${shown.length} classics in English</p>
    <h1>Read the scriptures straight from the original</h1>`
      : `<p class="kicker">梵文 · 巴利文 · 文言 · 希腊文 · 阿拉伯文经典 / ${books.length} 部</p>
    <h1>从原文直接读懂经书</h1>`;
  const body = `
<section class="hero hero--art">
  <div class="hero-copy">
    ${intro}
    <a class="resume" data-resume hidden></a>
  </div>
  ${emblemPicture('lotus', 'hero-emblem hero-scene', { kind: 'scenes' })}
</section>
${shelf('reading', t.shelfReading, t.shelfReadingSub)}
${groups
  .map(
    ([label, list], gi) => `${gi > 0 && DIVIDER_SEEDS[gi - 1] ? dividerMark(DIVIDER_SEEDS[gi - 1], 'emblem-divider--wide') : ''}
<section class="tradition">
  <p class="kicker">${String(gi + 1).padStart(2, '0')}</p>
  <h2>${esc(lang === 'en' ? label.en : label.zh)}</h2>
  <ul class="book-list">
    ${list.map((b) => bookCard(b, lang, books.indexOf(b))).join('\n    ')}
  </ul>
</section>`,
  )
  .join('\n')}${
    lang === 'en' && pending.length
      ? `
<section class="tradition pending">
  <p class="kicker">${String(groups.length + 1).padStart(2, '0')}</p>
  <h2>Chinese only for now</h2>
  <p class="meta">English translations of these are in progress. For now each opens the Chinese edition.</p>
  <ul class="book-list">
    ${pending
      .map((b) => bookCard(b, lang, books.indexOf(b), true))
      .join('\n    ')}
  </ul>
</section>`
      : ''
  }
${shelf('done', t.shelfDone)}`;
  return layout({
    lang,
    path: homePath(lang),
    alt: { zh: '/', en: '/en/' },
    title:
      lang === 'en'
        ? `${t.siteName}: Heart Sutra, Bhagavad Gita`
        : `${t.siteName}：心经、金刚经、大悲咒等 ${books.length} 部原文对照`,
    description:
      lang === 'en'
        ? `${books.length} classics translated straight from Sanskrit, Pali, Classical Chinese, Greek and Arabic into plain English: Heart Sutra, Bhagavad Gita, Tao Te Ching and more.`
        : `${books.length} 部经典的白话直译，从梵文、巴利文、文言、希腊文、阿拉伯文原文译出，每段对照原文。有心经、金刚经、大悲咒、法句经、薄伽梵歌、道德经等。`,
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: t.siteName,
      alternateName: t.siteSub,
      url: SITE + homePath(lang),
      inLanguage: langs(lang),
      author: { '@type': 'Person', name: 'Eden Tan', url: MAIN_SITE + '/' },
      license: LICENSE_URL,
    },
  });
}

// 书页的首屏横幅：和首页封面同一张「封面」(同一种墨色、底纹、线稿)，横着铺开。进了书里还认得出是哪一本。
// 这一页其余的点缀(段号圆章、古译的译者签、梵文栏的金线、阅读进度条、下一章卡)也用这本书的三种颜色，变量挂在 .book-page 上。
const bookN = (b) => BOOK_ORDER.indexOf(b.slug);
const toneVars = (b) => {
  const tone = coverTone(bookN(b));
  return `--cover-bg:${tone.bg};--cover-ink:${tone.ink};--cover-foil:${tone.foil}`;
};
function bookBanner(b, lang, { heading, sub = '', meta, compact = false }) {
  const n = bookN(b);
  return `<section class="book-banner${compact ? ' compact' : ''}" data-pattern="${n % 5}">
  <img class="banner-scene" src="/covers/${b.slug}.svg" alt="" width="380" height="380" decoding="async">
  <div class="banner-copy">
    <p class="banner-kicker">${esc(TRADITIONS[b.tradition][lang])}<span aria-hidden="true"> · No.${String(n + 1).padStart(2, '0')}</span></p>
    <h1>${esc(heading)}<span lang="${origCode(b)}-Latn">${esc(saName(b, lang))}</span></h1>
    ${sub ? `<p class="banner-sub">${esc(sub)}</p>` : ''}
    <p class="banner-meta">${meta}</p>
  </div>
</section>`;
}

// 一页在另一种语言里的对应路径；书没有英译时，中文页的 EN 指向英文首页。
const bookAlt = (b) => ({ zh: bookPath(b, 'zh'), en: hasEn(b) ? bookPath(b, 'en') : '/en/' });
const chapterAlt = (b, i) => ({ zh: chapterPath(b, i, 'zh'), en: hasEn(b) ? chapterPath(b, i, 'en') : '/en/' });

function bookIndexPage(b, lang) {
  const t = T[lang];
  const tradition = TRADITIONS[b.tradition][lang];
  const body = `
<div class="book-page" style="${toneVars(b)}">
<nav class="crumbs" aria-label="breadcrumb"><a href="${homePath(lang)}">${t.home}</a> / ${esc(tradition)}</nav>
${bookBanner(b, lang, { heading: title(b, lang), sub: summary(b, lang), meta: `${t.chapters(b.chapters.length)} · ${t.verses(verseCount(b))} · ${esc(compareLabel(b, lang))}` })}${primerSection(b, lang)}
<ol class="chapter-list">
  ${b.chapters
    .map((ch, i) => {
      return `<li><a href="${chapterPath(b, i, lang)}" data-book="${b.slug}" data-ch="${chNo(b, i) - 1}" data-verses="${ch.verses.length}"><span class="ch-no" aria-hidden="true">${String(chNo(b, i)).padStart(2, '0')}</span><strong>${esc(chTitle(ch, lang))}</strong><span>${t.verses(ch.verses.length)}</span></a></li>`;
    })
    .join('\n  ')}
</ol>${hasEn(b) ? dividerMark(b.slug) : ''}${compareSection(b, lang)}${sourceNote(b, lang)}
</div>`;
  return layout({
    lang,
    path: bookPath(b, lang),
    alt: bookAlt(b),
    exact: hasEn(b),
    title:
      lang === 'en'
        ? `${enSearchName(b)} (${saName(b, lang)}): ${orig(b, 'en')} with plain English translation`
        : `${b.title} ${orig(b, 'zh')}原文 · 白话直译 · ${compareLabel(b, lang)} | ${b.sanskrit}`,
    description:
      lang === 'en'
        ? `${b.en.summary} ${b.chapters.length} chapters, each passage with ${scriptNote(b, 'en')}.`
        : `${b.summary} 共 ${b.chapters.length} 章，每段${scriptNote(b, 'zh')}。`,
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Book',
          name: title(b, lang),
          alternateName: saName(b, lang),
          url: SITE + bookPath(b, lang),
          inLanguage: langs(lang, b),
          license: LICENSE_URL,
          hasPart: b.chapters.map((ch, i) => ({ '@type': 'Chapter', name: chTitle(ch, lang), url: SITE + chapterPath(b, i, lang) })),
        },
        breadcrumbLd([[t.siteName, homePath(lang)], [title(b, lang), bookPath(b, lang)]]),
      ],
    },
  });
}

// 三语对照注：英文版挂在英文下面（显示英文），中文版挂在白话下面（显示中文）
function cmpHtml(v, lang) {
  const cmp = v.en?.cmp ?? [];
  if (!cmp.length) return '';
  const note = (n) => (lang === 'en' && n.en ? [n.en, 'en'] : [n.note, 'zh-Hans']);
  return `
      <details class="notes cmp"><summary>${T[lang].cmpLabel(cmp.length)}</summary><dl>${cmp
    .map((n) => {
      const [text, l] = note(n);
      return `<dt>${esc(n.w)}</dt><dd lang="${l}">${esc(text)}</dd>`;
    })
    .join('')}</dl></details>`;
}

function enHtml(v, lang) {
  if (!v.en) return '';
  return `
    <div class="col en" data-col="en">
      <p class="en-text" lang="en">${esc(v.en.text)}</p>${cmpHtml(v, lang)}
    </div>`;
}

function oldHtml(v) {
  if (!v.old) return '';
  return `
    <div class="col old" data-col="old">
      ${v.old.text ? `<p class="old-text"><span class="who">${esc(v.old.who ?? '古译')}</span>${esc(v.old.text)}</p>` : ''}
      ${v.old.plain ? `<p class="old-plain">${esc(v.old.plain)}</p>` : ''}
      ${
        v.old.notes?.length
          ? `<details class="notes"${v.old.text ? '' : ' open'}><summary>注 ${v.old.notes.length}</summary><dl>${v.old.notes
              .map((n) => `<dt>${esc(n.w)}</dt><dd>${esc(n.note)}</dd>`)
              .join('')}</dl></details>`
          : ''
      }
    </div>`;
}

function verseHtml(v, j, lang, b) {
  const t = T[lang];
  const zh = `
    <div class="col zh" data-col="zh">
      <p class="zh-text">${esc(v.zh)}</p>${cmpHtml(v, lang)}
    </div>`;
  // 中文版：白话（下挂三语对照）→ 古译 → 梵文，不放英文；英文版：英文（下挂三语对照）→ 梵文，不放中文栏
  const sa = `
    <div class="col sa" data-col="sa" data-label="${esc(orig(b, lang))}">
      <p class="${isHan(b) ? 'han' : 'deva'}" lang="${origCode(b)}"${origCode(b) === 'ar' ? ' dir="rtl"' : ''}>${esc(v.sa.text)}</p>${v.sa.tr ? `
      <p class="iast" lang="${origCode(b)}-Latn">${esc(v.sa.tr)}</p>` : ''}
    </div>`;
  const cols = lang === 'en' ? [enHtml(v, lang), sa] : [zh, oldHtml(v), sa];
  return `
  <li class="verse" id="v${j + 1}">
    <a class="num" href="#v${j + 1}" aria-label="${t.verseLabel(j + 1)}">${j + 1}</a>${cols.join('')}
  </li>`;
}

// 底本署名：原文电子录文与古译电子本各自的来源和授权（只在中文版显示；来源名是中文写的，英文版有了英译再补英文写法）
function sourceNote(b, lang, ch) {
  if (!b.source) return '';
  if (lang === 'en') {
    const o = b.source.orig;
    if (!o) return '';
    return `\n<p class="meta source-note">${esc(orig(b, 'en'))} source: <a href="${esc(o.url)}" rel="noopener">${esc(o.en ?? o.name)}</a> (${esc(o.licenseEn ?? o.license)}). This site’s English and notes are CC BY 4.0; the source text keeps its own license.</p>`;
  }
  const one = (label, src) =>
    src ? `${label}：<a href="${esc(src.url)}" rel="noopener">${esc(src.name)}</a>（${esc(src.license)}）` : '';
  const parts = [one(`${orig(b, 'zh')}底本`, b.source.orig), ch && !ch.verses.some((v) => v.old) ? '' : one(b.source.old?.label ?? '古译', b.source.old)].filter(Boolean);
  return `\n<p class="meta source-note">${parts.join('；')}。本站白话与注释以 CC BY 4.0 授权，底本按各自来源的授权使用。</p>`;
}

// 搜索结果里那两行：先说这一页给你什么（原文、白话、哪位古译、几段），再补一句内容（单章书用简介，多章书用这一章的开头）。
// 以前直接截第一段经文，「嗡！礼敬……」看不出这页是干什么的。
export function chapterDescription(b, i, lang) {
  const ch = b.chapters[i];
  const single = isSingle(b);
  const n = ch.verses.length;
  if (lang === 'en') {
    const name = single ? enSearchName(b) : `${enSearchName(b)}, ${ch.en.split(' · ')[0]}`;
    const lead = `${name} in ${orig(b, 'en')} and plain English, passage by passage.`;
    const tail = single ? b.en.summary : (ch.enIntro ?? `Opens: “${ch.verses[0].en.text}”`);
    return clip(`${lead} ${tail}`, 160);
  }
  const name = single ? `《${b.title}》` : `《${b.title}》${ch.title}：`;
  const old = b.oldTranslator ? `，对照${b.oldTranslator}译本` : '';
  const lead = isHan(b) ? `${name}文言原文逐段译成白话，共 ${n} 段。` : `${name}${orig(b, 'zh')}原文逐段直译成白话${old}，共 ${n} 段，附${ownScript(b) ? '' : '天城体与'}罗马转写。`;
  const tail = single ? b.summary : (ch.intro ?? `开头：${ch.verses[0].zh}`);
  return clip(lead + tail, 140);
}

// 「一图看懂」:一章一张大图(scripts/panels.mjs)。这一章的几个重点站在同一条地平线上,一条金色的路从左走到右;
// 图里不写字,路上每一站的点数对应图下面的第几条说明。宽屏一行排开,手机换成两行的那一张。
function storyHtml(ch, lang) {
  if (!ch.points?.length) return '';
  if (lang === 'en' && !ch.enPoints) return '';
  const icons = ch.points.map((pt) => pt.icon);
  const text = (pt, k) => (lang === 'en' ? ch.enPoints[k] : pt.text);
  return `<section class="story" aria-label="${T[lang].storyLabel}">
  <p class="kicker">${T[lang].storyLabel}</p>
  <figure>${sceneSvg(icons, 'wide')}${sceneSvg(icons, 'tall')}
  <figcaption><ol style="--n:${icons.length}">${ch.points.map((pt, k) => `<li><span class="story-no" aria-hidden="true">${k + 1}</span>${esc(text(pt, k))}</li>`).join('')}</ol></figcaption></figure>
</section>\n`;
}

function chapterPage(b, i, lang) {
  const t = T[lang];
  const ch = b.chapters[i];
  const single = isSingle(b);
  const prev = b.chapters[i - 1];
  const next = b.chapters[i + 1];
  const heading = single ? title(b, lang) : `${title(b, lang)} · ${chTitle(ch, lang)}`;
  const hasOld = ch.verses.some((v) => v.old);
  const chWho = chapterTranslator(b, ch);
  const oldLabel = b.oldTranslator ? `${b.oldTranslator}古译` : chWho ? `${chWho}旧译` : '注';
  const btn = {
    zh: lang === 'zh' ? '<button type="button" data-toggle="zh" aria-pressed="true">白话直译</button>' : '',
    en: lang === 'en' ? '<button type="button" data-toggle="en" aria-pressed="true">English</button>' : '',
    old: hasOld && lang === 'zh' ? `<button type="button" data-toggle="old" aria-pressed="true">${esc(oldLabel)}</button>` : '',
    sa: `<button type="button" data-toggle="sa" aria-pressed="true">${esc(orig(b, lang))}</button>`,
  };
  const order = lang === 'en' ? ['en', 'sa', 'zh', 'old'] : ['zh', 'en', 'old', 'sa'];
  const sub = single ? summary(b, lang) : '';
  const chIntro = lang === 'en' ? ch.enIntro : ch.intro;
  // 导读不放在经文前面（用户 2026-11-27：读书要沉浸、要顺，这些不要影响读书感受）：
  // 「这一章在讲什么」和「读之前先知道这几件事」收进一张侧边面板，工具条上的「导读」按钮点了才出来。
  const showIntro = !single && chIntro;
  const guide = showIntro || b.primer
    ? `
<dialog class="guide" id="guide" aria-label="${t.guideBtn}">
  <div class="guide-sheet">
    <form method="dialog" class="guide-bar"><p class="guide-title">${t.guideBtn}</p><button class="guide-close" aria-label="${t.guideClose}"><span aria-hidden="true">×</span></button></form>${showIntro ? `
    <section class="guide-intro"><p class="ch-intro-label">${t.introLabel}</p><p class="ch-intro-text">${esc(chIntro)}</p></section>` : ''}${b.primer ? primerSection(b, lang, 0) : ''}
  </div>
</dialog>`
    : '';
  const guideBtn = guide ? `\n  <a class="guide-open" href="#guide" data-guide>${t.guideBtn}</a>` : '';
  const end = next
    ? [t.nextCh, chTitle(next, lang), chapterPath(b, i + 1, lang), ' rel="next"']
    : single
      ? [t.endHome[0], t.endHome[1], homePath(lang), '']
      : [t.endToc[0], t.endToc[1], bookPath(b, lang), ''];
  const body = `
<div class="book-page" style="${toneVars(b)}">
<nav class="crumbs" aria-label="breadcrumb"><a href="${homePath(lang)}">${t.home}</a> / ${single ? esc(title(b, lang)) : `<a href="${bookPath(b, lang)}">${esc(title(b, lang))}</a> / ${esc(chTitle(ch, lang))}`}</nav>
${bookBanner(b, lang, { heading, sub, meta: `${t.verses(ch.verses.length)} · ${esc(compareLabel(b, lang, ch))}`, compact: true })}
${storyHtml(ch, lang)}<div class="col-toggle" role="group" aria-label="${t.cols}">
  ${order.map((k) => btn[k]).filter(Boolean).join('\n  ')}${guideBtn}
  <span class="read-count" aria-label="${t.position}" hidden></span>
  <span class="read-bar" aria-hidden="true"></span>
</div>
<div class="read-grid">
<ol class="verses">${ch.verses.map((v, j) => verseHtml(v, j, lang, b)).join('')}
</ol>
${emblemPicture(b.slug, 'page-emblem', { size: 420 }).replace('loading="eager"', 'loading="lazy"')}
</div>${single ? compareSection(b, lang) : ''}${sourceNote(b, lang, ch)}
<div class="colophon" aria-hidden="true">${emblemPicture(b.slug, 'colophon-emblem', { still: true, size: 96 })}</div>
<nav class="pager">
  <a class="next-card"${end[3]} href="${end[2]}"><span class="next-kicker">${esc(end[0])}</span><span class="next-title">${esc(end[1])}</span></a>
  ${prev ? `<a class="prev-link" rel="prev" href="${chapterPath(b, i - 1, lang)}">← ${t.prevCh} · ${esc(chTitle(prev, lang))}</a>` : ''}
</nav>${guide}
</div>`;
  const crumbs = [[t.siteName, homePath(lang)], [title(b, lang), bookPath(b, lang)]];
  if (!single) crumbs.push([chTitle(ch, lang), chapterPath(b, i, lang)]);
  return layout({
    lang,
    path: chapterPath(b, i, lang),
    alt: chapterAlt(b, i),
    exact: hasEn(b),
    bodyData: ` data-book="${b.slug}" data-ch="${chNo(b, i) - 1}" data-verses="${ch.verses.length}"`,
    title:
      lang === 'en'
        ? `${single ? `${enSearchName(b)} (${saName(b, lang)})` : `${enSearchName(b)} ${ch.en}`}: ${orig(b, 'en')} with plain English translation`
        : `${heading} ${orig(b, 'zh')}原文 · 白话直译 · ${compareLabel(b, lang, ch)}`,
    description: chapterDescription(b, i, lang),
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': single ? 'Book' : 'Chapter',
          name: heading,
          alternateName: saName(b, lang),
          url: SITE + chapterPath(b, i, lang),
          inLanguage: langs(lang, b),
          license: LICENSE_URL,
          ...(single ? {} : { isPartOf: { '@type': 'Book', name: title(b, lang), url: SITE + bookPath(b, lang) } }),
        },
        breadcrumbLd(crumbs),
      ],
    },
  });
}

function write(rel, content) {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

let BOOK_ORDER = [];

export function build() {
  const books = loadBooks();
  BOOK_ORDER = books.map((b) => b.slug);
  rmSync(OUT, { recursive: true, force: true });
  cpSync(join(ROOT, 'src'), OUT, { recursive: true });
  writeEmblems(OUT);
  writeCovers(OUT, books.map((b) => b.slug));

  const pages = [];
  for (const lang of ['zh', 'en']) {
    pages.push([homePath(lang), homePage(books, lang)]);
    for (const b of books) {
      if (lang === 'en' && !hasEn(b)) continue;
      if (!isSingle(b)) pages.push([bookPath(b, lang), bookIndexPage(b, lang)]);
      b.chapters.forEach((_, i) => pages.push([chapterPath(b, i, lang), chapterPage(b, i, lang)]));
    }
  }
  for (const [path, html] of pages) write(join(path, 'index.html'), html);

  write(
    '404.html',
    layout({
      lang: 'zh',
      path: '/404.html',
      alt: { zh: '/', en: '/en/' },
      exact: false,
      title: `找不到这一页 · Page not found | ${T.zh.siteName}`,
      description: '找不到这一页。',
      noindex: true,
      body: '<section class="hero"><h1>找不到这一页<span lang="en">Page not found</span></h1><p><a href="/">回到首页</a> · <a href="/en/" lang="en">Back to home</a></p></section>',
    }),
  );

  const lastmod = new Date().toISOString().slice(0, 10);
  write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
      .map(([p]) => `  <url><loc>${SITE}${p}</loc><lastmod>${lastmod}</lastmod></url>`)
      .join('\n')}\n</urlset>\n`,
  );
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  const en = books.filter(hasEn);
  write(
    'llms.txt',
    `# ${T.zh.siteName} / ${T.en.siteName}\n\n> 佛经、印度经典、中国经典与古兰经从梵文、巴利文、文言、阿拉伯文直译成白话中文，逐段对照古代汉译（玄奘、鸠摩罗什等），附原文与罗马转写；另有从原文直译的英文版（/en/），并逐段标出英文、中文、原文的差别。\n> Buddhist, Hindu and Chinese classics and the Quran translated directly from Sanskrit, Pali, Classical Chinese and Arabic into plain Chinese and plain English, passage by passage, with notes on where English, Chinese and the original differ.\n> 授权 / License: 本站译文与注释 CC BY 4.0（注明出处即可使用）; the site's own translations and notes are CC BY 4.0 (${LICENSE_URL}). Sanskrit/Pali texts and classical Chinese translations are public domain; the digital source transcriptions keep their own licenses (credited on each book page). The Arabic Quran text is the Tanzil Project's (https://tanzil.net/, CC BY 3.0), reproduced verbatim.\n\n${books
      .map(
        (b) =>
          `## ${b.title} (${b.sanskrit})${hasEn(b) ? ` — ${b.en.title}` : ''}\n\n${b.summary}\n\n${hasEn(b) ? `${b.en.summary}\n\n` : ''}${b.chapters.map((ch, i) => `- [${ch.title}](${SITE}${chapterPath(b, i)})`).join('\n')}`,
      )
      .join('\n\n')}\n\n# English edition\n\n${en
      .map((b) => `## ${b.en.title} (${b.sanskrit})\n\n${b.chapters.map((ch, i) => `- [${ch.en}](${SITE}${chapterPath(b, i, 'en')})`).join('\n')}`)
      .join('\n\n')}\n`,
  );
  write('CNAME', `${HOST}\n`);
  return pages.map(([p]) => p);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const paths = build();
  console.log(`built ${paths.length} pages -> ${OUT}`);
}
