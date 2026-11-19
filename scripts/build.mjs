// content/*.json + translations/en + src/ -> dist/：中文版（/…）与英文版（/en/…）两套静态页，外加 sitemap / robots / llms.txt。
// 中文版收全部经书；英文版只收有英译的书，其余在英文首页列为「Chinese only for now」并链到中文页。
// 右上角 EN | 中文 一键切到另一种语言的同一页（eden-tan.com 的做法），对应页不存在时切到那种语言的首页。
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBooks, TRADITIONS } from './content.mjs';
import { emblemPicture, writeEmblems } from './emblems.mjs';
import { SCENE_NAMES } from './scenes.mjs';

// 书页首屏插画：有专属主题插画（scripts/scenes.mjs）的用插画，还没画的先用这部书的花纹章
const heroArt = (b) =>
  SCENE_NAMES.includes(b.slug)
    ? emblemPicture(b.slug, 'hero-emblem hero-scene', { kind: 'scenes' })
    : emblemPicture(b.slug, 'hero-emblem hero-scene');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT_DIR ?? join(ROOT, 'dist');
const SITE = (process.env.SITE_URL ?? 'https://scripture.eden-tan.com').replace(/\/$/, '');
const HOST = new URL(SITE).host;
const MAIN_SITE = 'https://eden-tan.com';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

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
    siteName: '梵文经书白话直译',
    siteSub: '',
    home: '首页',
    sitemap: '网站地图',
    footer: '梵文、巴利文原文与古代汉译（玄奘、鸠摩罗什、真谛、维祇难等）都是公有领域；白话直译、英译、古译今译与注释是本站整理，以 CC BY 4.0 授权：注明出处（Eden Tan · scripture.eden-tan.com）即可自由使用、转载、改编。',
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
  },
  en: {
    htmlLang: 'en',
    prefix: '/en',
    siteName: 'Sanskrit Scriptures, Plainly',
    siteSub: '',
    home: 'Home',
    sitemap: 'Sitemap',
    footer: 'The Sanskrit and Pali texts and the classical Chinese translations (Xuanzang, Kumarajiva, Paramartha, Zhi Qian and others) are in the public domain. The English and plain-Chinese translations and all notes are this site’s own work, licensed under CC BY 4.0: free to use, share and adapt with credit to Eden Tan · scripture.eden-tan.com.',
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
  },
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export const bookPath = (b, lang = 'zh') => `${T[lang].prefix}/${b.slug}/`;
export const chapterPath = (b, i, lang = 'zh') => (b.chapters.length === 1 ? bookPath(b, lang) : `${T[lang].prefix}/${b.slug}/${i + 1}/`);
const homePath = (lang) => `${T[lang].prefix}/`;
const verseCount = (b) => b.chapters.reduce((n, ch) => n + ch.verses.length, 0);
const hasEn = (b) => Boolean(b.en);
// 原文语言：梵文（缺省）或巴利文。书的 origLang 由导入脚本按面板 id 前缀（sa- / pi-）写入。
const ORIG = {
  sa: { zh: '梵文', en: 'Sanskrit', short: '梵' },
  pi: { zh: '巴利文', en: 'Pali', short: '巴' },
};
const origCode = (b) => b?.origLang ?? 'sa';
const orig = (b, lang) => ORIG[origCode(b)][lang];
const langs = (lang, b) => (b ? [T[lang].htmlLang, origCode(b)] : [T[lang].htmlLang, 'sa', 'pi']);

const title = (b, lang) => (lang === 'en' ? b.en.title : b.title);
// 梵文书名里带的中文注（如「(小本)」）在英文版换成英文
const saName = (b, lang) => (lang === 'en' ? b.sanskrit.replace('(小本)', ' (shorter)').replace('(大本)', ' (longer)') : b.sanskrit);
const summary = (b, lang) => (lang === 'en' ? b.en.summary : b.summary);
const chTitle = (ch, lang) => (lang === 'en' ? ch.en : ch.title);
function compareLabel(b, lang) {
  if (lang === 'en') return `translated from the ${orig(b, 'en')}`;
  return b.oldTranslator ? `${b.oldTranslator}译本对照` : `${ORIG[origCode(b)].short}汉对照`;
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
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${esc(url)}">
${hreflang}<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(t.siteName)}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'zh_CN'}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#050505" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&family=Noto+Serif+Devanagari:wght@400;600&display=swap">
<link rel="stylesheet" href="/styles.css">
<script>try{var t=localStorage.getItem('scripture.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n` : ''}</head>
<body data-lang="${lang}"${bodyData}>
<header class="site-header">
  <a class="brand" href="${homePath(lang)}"><img class="brand-mark" src="/favicon.svg" alt="" width="32" height="32"><span>${esc(t.siteName)}${t.siteSub ? `<small>${esc(t.siteSub)}</small>` : ''}</span></a>
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
const progressAttrs = (b) => `data-book="${b.slug}" data-verses="${b.chapters.map((ch) => ch.verses.length).join(',')}"`;

function bookCard(b, lang) {
  const t = T[lang];
  return `<li><a href="${bookPath(b, lang)}" ${progressAttrs(b)}>
      ${emblemPicture(b.slug, 'card-emblem', { still: true })}
      <strong>${esc(title(b, lang))}</strong>
      <span class="sa-name" lang="${origCode(b)}-Latn">${esc(saName(b, lang))}</span>
      <p>${esc(summary(b, lang))}</p>
      <small>${b.chapters.length > 1 ? `${t.chapters(b.chapters.length)} · ` : ''}${t.verses(verseCount(b))} · ${esc(compareLabel(b, lang))}</small>
    </a></li>`;
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
      : `<p class="kicker">梵文 · 巴利文经典 / ${books.length} 部</p>
    <h1>从原文直接读懂经书</h1>`;
  const body = `
<section class="hero hero--art">
  <div class="hero-copy">
    ${intro}
  </div>
  ${emblemPicture('lotus', 'hero-emblem hero-scene', { kind: 'scenes' })}
</section>
${groups
  .map(
    ([label, list], gi) => `
<section class="tradition">
  <p class="kicker">${String(gi + 1).padStart(2, '0')}</p>
  <h2>${esc(lang === 'en' ? label.en : label.zh)}</h2>
  <ul class="book-list">
    ${list.map((b) => bookCard(b, lang)).join('\n    ')}
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
      .map(
        (b) => `<li><a href="${bookPath(b, 'zh')}" hreflang="zh-Hans" ${progressAttrs(b)}>
      ${emblemPicture(b.slug, 'card-emblem', { still: true })}
      <strong>${esc(EN_PENDING[b.slug]?.[0] ?? b.sanskrit)}</strong>
      <span class="sa-name" lang="${origCode(b)}-Latn">${esc(saName(b, lang))}</span>
      <p>${esc(EN_PENDING[b.slug]?.[1] ?? '')}</p>
      <small>${b.chapters.length > 1 ? `${t.chapters(b.chapters.length)} · ` : ''}${t.verses(verseCount(b))} · Chinese edition ↗</small>
    </a></li>`,
      )
      .join('\n    ')}
  </ul>
</section>`
      : ''
  }`;
  return layout({
    lang,
    path: homePath(lang),
    alt: { zh: '/', en: '/en/' },
    title:
      lang === 'en'
        ? `${t.siteName}: Heart Sutra, Dhammapada, Bhagavad Gita, Upanishads and more, from the Sanskrit and Pali`
        : `${t.siteName}：心经、金刚经、大悲咒、药师经、法句经、薄伽梵歌原文对照`,
    description:
      lang === 'en'
        ? 'The Heart Sutra, Diamond Sutra, Great Compassion Mantra, Medicine Buddha Sutra, Verses on the Middle Way, Dhammapada, Metta Sutta, Bhagavad Gita, Yoga Sutras, Upanishads and more, translated straight from the Sanskrit and Pali into plain English, passage by passage, with notes on where English, Chinese and the original differ.'
        : '心经、金刚经、大悲咒、药师经、普贤行愿品、法华经、中论、唯识三十颂、法句经、慈经、大念处经、薄伽梵歌、瑜伽经、奥义书等 24 部经典：从梵文、巴利文直译成白话，逐段对照玄奘、鸠摩罗什等古译，附天城体原文与罗马转写。',
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

// 一页在另一种语言里的对应路径；书没有英译时，中文页的 EN 指向英文首页。
const bookAlt = (b) => ({ zh: bookPath(b, 'zh'), en: hasEn(b) ? bookPath(b, 'en') : '/en/' });
const chapterAlt = (b, i) => ({ zh: chapterPath(b, i, 'zh'), en: hasEn(b) ? chapterPath(b, i, 'en') : '/en/' });

function bookIndexPage(b, lang) {
  const t = T[lang];
  const tradition = TRADITIONS[b.tradition][lang];
  const body = `
<nav class="crumbs" aria-label="breadcrumb"><a href="${homePath(lang)}">${t.home}</a> / ${esc(tradition)}</nav>
<section class="hero hero--art hero--book">
  <div class="hero-copy">
  <h1>${esc(title(b, lang))}<span lang="${origCode(b)}-Latn">${esc(saName(b, lang))}</span></h1>
  <p>${esc(summary(b, lang))}</p>
  <p class="meta">${t.chapters(b.chapters.length)} · ${t.verses(verseCount(b))} · ${esc(compareLabel(b, lang))}</p>
  </div>
  ${heroArt(b)}
</section>
<ol class="chapter-list">
  ${b.chapters
    .map((ch, i) => {
      return `<li><a href="${chapterPath(b, i, lang)}" data-book="${b.slug}" data-ch="${i}" data-verses="${ch.verses.length}"><strong>${esc(chTitle(ch, lang))}</strong><span>${t.verses(ch.verses.length)}</span></a></li>`;
    })
    .join('\n  ')}
</ol>${compareSection(b, lang)}${sourceNote(b, lang)}`;
  return layout({
    lang,
    path: bookPath(b, lang),
    alt: bookAlt(b),
    exact: hasEn(b),
    title:
      lang === 'en'
        ? `${b.en.title} (${saName(b, lang)}): ${orig(b, 'en')}, plain English and Chinese side by side`
        : `${b.title} ${orig(b, 'zh')}原文 · 白话直译 · ${compareLabel(b, lang)} | ${b.sanskrit}`,
    description:
      lang === 'en'
        ? `${b.en.summary} ${b.chapters.length} chapters, each passage with the ${orig(b, 'en')} in Devanagari and romanization.`
        : `${b.summary} 共 ${b.chapters.length} 章，每段附${orig(b, 'zh')}天城体与罗马转写。`,
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
    <div class="col sa" data-col="sa">
      <p class="deva" lang="${origCode(b)}">${esc(v.sa.text)}</p>
      <p class="iast" lang="${origCode(b)}-Latn">${esc(v.sa.tr)}</p>
    </div>`;
  const cols = lang === 'en' ? [enHtml(v, lang), sa] : [zh, oldHtml(v), sa];
  return `
  <li class="verse" id="v${j + 1}">
    <a class="num" href="#v${j + 1}" aria-label="${t.verseLabel(j + 1)}">${j + 1}</a>${cols.join('')}
  </li>`;
}

// 底本署名：原文电子录文与古译电子本各自的来源和授权（只在中文版显示；来源名是中文写的，英文版有了英译再补英文写法）
function sourceNote(b, lang) {
  if (!b.source) return '';
  if (lang === 'en') {
    const o = b.source.orig;
    if (!o) return '';
    return `\n<p class="meta source-note">${esc(orig(b, 'en'))} source: <a href="${esc(o.url)}" rel="noopener">${esc(o.en ?? o.name)}</a> (${esc(o.licenseEn ?? o.license)}). This site’s English and notes are CC BY 4.0; the source text keeps its own license.</p>`;
  }
  const one = (label, src) =>
    src ? `${label}：<a href="${esc(src.url)}" rel="noopener">${esc(src.name)}</a>（${esc(src.license)}）` : '';
  const parts = [one(`${orig(b, 'zh')}底本`, b.source.orig), one('古译', b.source.old)].filter(Boolean);
  return `\n<p class="meta source-note">${parts.join('；')}。本站白话与注释以 CC BY 4.0 授权，底本按各自来源的授权使用。</p>`;
}

function chapterPage(b, i, lang) {
  const t = T[lang];
  const ch = b.chapters[i];
  const single = b.chapters.length === 1;
  const prev = b.chapters[i - 1];
  const next = b.chapters[i + 1];
  const heading = single ? title(b, lang) : `${title(b, lang)} · ${chTitle(ch, lang)}`;
  const hasOld = ch.verses.some((v) => v.old);
  const oldLabel = b.oldTranslator ? `${b.oldTranslator}古译` : '注';
  const btn = {
    zh: lang === 'zh' ? '<button type="button" data-toggle="zh" aria-pressed="true">白话直译</button>' : '',
    en: lang === 'en' ? '<button type="button" data-toggle="en" aria-pressed="true">English</button>' : '',
    old: hasOld && lang === 'zh' ? `<button type="button" data-toggle="old" aria-pressed="true">${esc(oldLabel)}</button>` : '',
    sa: `<button type="button" data-toggle="sa" aria-pressed="true">${esc(orig(b, lang))}</button>`,
  };
  const order = lang === 'en' ? ['en', 'sa', 'zh', 'old'] : ['zh', 'en', 'old', 'sa'];
  const sub = single ? summary(b, lang) : '';
  const body = `
<nav class="crumbs" aria-label="breadcrumb"><a href="${homePath(lang)}">${t.home}</a> / ${single ? esc(title(b, lang)) : `<a href="${bookPath(b, lang)}">${esc(title(b, lang))}</a> / ${esc(chTitle(ch, lang))}`}</nav>
<section class="hero compact hero--art hero--book">
  <div class="hero-copy">
  <h1>${esc(heading)}<span lang="${origCode(b)}-Latn">${esc(saName(b, lang))}</span></h1>
  ${sub ? `<p>${esc(sub)}</p>` : ''}
  <p class="meta">${t.verses(ch.verses.length)} · ${esc(compareLabel(b, lang))}</p>
  </div>
  ${heroArt(b)}
</section>
<div class="col-toggle" role="group" aria-label="${t.cols}">
  ${order.map((k) => btn[k]).filter(Boolean).join('\n  ')}
</div>
<ol class="verses">${ch.verses.map((v, j) => verseHtml(v, j, lang, b)).join('')}
</ol>${single ? compareSection(b, lang) : ''}${sourceNote(b, lang)}
<nav class="pager">
  ${prev ? `<a rel="prev" href="${chapterPath(b, i - 1, lang)}">← ${esc(chTitle(prev, lang))}</a>` : '<span></span>'}
  ${next ? `<a rel="next" href="${chapterPath(b, i + 1, lang)}">${esc(chTitle(next, lang))} →</a>` : '<span></span>'}
</nav>`;
  const crumbs = [[t.siteName, homePath(lang)], [title(b, lang), bookPath(b, lang)]];
  if (!single) crumbs.push([chTitle(ch, lang), chapterPath(b, i, lang)]);
  return layout({
    lang,
    path: chapterPath(b, i, lang),
    alt: chapterAlt(b, i),
    exact: hasEn(b),
    bodyData: ` data-book="${b.slug}" data-ch="${i}" data-verses="${ch.verses.length}"`,
    title:
      lang === 'en'
        ? `${heading}: ${orig(b, 'en')} with plain English translation`
        : `${heading} ${orig(b, 'zh')}原文 · 白话直译 · ${compareLabel(b, lang)}`,
    description: clip(lang === 'en' ? ch.verses[0].en.text : ch.verses[0].zh, lang === 'en' ? 160 : 140),
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

export function build() {
  const books = loadBooks();
  rmSync(OUT, { recursive: true, force: true });
  cpSync(join(ROOT, 'src'), OUT, { recursive: true });
  writeEmblems(OUT);

  const pages = [];
  for (const lang of ['zh', 'en']) {
    pages.push([homePath(lang), homePage(books, lang)]);
    for (const b of books) {
      if (lang === 'en' && !hasEn(b)) continue;
      if (b.chapters.length > 1) pages.push([bookPath(b, lang), bookIndexPage(b, lang)]);
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
    `# ${T.zh.siteName} / ${T.en.siteName}\n\n> 佛经与印度经典从梵文、巴利文直译成白话中文，逐段对照古代汉译（玄奘、鸠摩罗什等），附天城体原文与罗马转写；部分经书另有从梵文直译的英文版（/en/），并逐段标出英文、中文、梵文的差别。\n> Buddhist and Hindu classics translated directly from Sanskrit and Pali into plain Chinese and (for some books) plain English, passage by passage, with notes on where English, Chinese and Sanskrit differ.\n> 授权 / License: 本站译文与注释 CC BY 4.0（注明出处即可使用）; the site's own translations and notes are CC BY 4.0 (${LICENSE_URL}). Sanskrit/Pali texts and classical Chinese translations are public domain; the digital source transcriptions keep their own licenses (credited on each book page).\n\n${books
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
