// content/*.json + translations/en + src/ -> dist/：中文版（/…）与英文版（/en/…）两套静态页，外加 sitemap / robots / llms.txt。
// 中文版收全部经书；英文版只收有英译的书，其余在英文首页列为「Chinese only for now」并链到中文页。
// 右上角 EN | 中文 一键切到另一种语言的同一页（eden-tan.com 的做法），对应页不存在时切到那种语言的首页。
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBooks, TRADITIONS } from './content.mjs';
import { emblemPicture, writeEmblems } from './emblems.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT_DIR ?? join(ROOT, 'dist');
const SITE = (process.env.SITE_URL ?? 'https://scripture.eden-tan.com').replace(/\/$/, '');
const HOST = new URL(SITE).host;
const MAIN_SITE = 'https://eden-tan.com';

// 还没有英译的书：英文首页上的书名与一句简介
const EN_PENDING = {
  'larger-sukhavati': ['The Larger Sukhavati Sutra', 'How the monk Dharmakara made his great vows, became the Buddha Amitabha, and built the Land of Bliss: the origin story of Pure Land faith.'],
  'lotus-sutra': ['The Lotus Sutra', 'The Buddha says the different paths he taught before were skillful means fitted to each listener; in the end there is only one path, and everyone can become a buddha.'],
  'vimalakirti-sutra': ['The Vimalakirti Sutra', 'The layman Vimalakirti is "ill". None of the Buddha’s great disciples dare visit him, since he has out-argued each of them; Manjushri goes, and the two talk about non-duality.'],
  'lankavatara-sutra': ['The Lankavatara Sutra', 'On Mount Lanka the Buddha teaches the bodhisattva Mahamati that the world we see is the mind showing itself. Early Chan used it to confirm awakening.'],
};

const T = {
  zh: {
    htmlLang: 'zh-Hans',
    prefix: '',
    siteName: '梵文经书白话直译',
    siteSub: 'Sanskrit Scriptures in Plain Chinese',
    home: '首页',
    footer: '梵文原文与古代汉译（玄奘、鸠摩罗什、康僧铠、实叉难陀）都是公有领域；白话直译、英译、古译今译与注释是本站整理，转载请注明出处。',
    notFound: '找不到这一页',
    backHome: '回到首页',
    cols: '显示哪几栏',
    verseLabel: (n) => `第 ${n} 段`,
    chapters: (n) => `${n} 章`,
    verses: (n) => `${n} 段`,
    sep: ' · ',
    compareKicker: 'Sanskrit · English · 中文',
    compareTitle: '英文、中文、梵文差在哪',
    compareHint: '每段英文下面的「三语对照」，是这一段里具体的差别。',
    cmpLabel: (n) => `三语对照 ${n}`,
  },
  en: {
    htmlLang: 'en',
    prefix: '/en',
    siteName: 'Sanskrit Scriptures, Plainly',
    siteSub: '梵文经书 · English · 中文',
    home: 'Home',
    footer: 'The Sanskrit texts and the classical Chinese translations (Xuanzang, Kumarajiva, Kang Sengkai, Shikshananda) are in the public domain. The English and plain-Chinese translations and all notes are this site’s own work; please credit when quoting.',
    notFound: 'Page not found',
    backHome: 'Back to home',
    cols: 'Columns to show',
    verseLabel: (n) => `Passage ${n}`,
    chapters: (n) => `${n} chapters`,
    verses: (n) => `${n} passages`,
    sep: ' · ',
    compareKicker: 'Sanskrit · English · 中文',
    compareTitle: 'Where English, Chinese and Sanskrit part ways',
    compareHint: 'The “Three languages” note under a passage gives the specific differences in that passage.',
    cmpLabel: (n) => `Three languages ${n}`,
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
const langs = (b) => ['zh-Hans', ...(hasEn(b) ? ['en'] : []), 'sa'];

const title = (b, lang) => (lang === 'en' ? b.en.title : b.title);
const summary = (b, lang) => (lang === 'en' ? b.en.summary : b.summary);
const chTitle = (ch, lang) => (lang === 'en' ? ch.en : ch.title);
function compareLabel(b, lang) {
  if (lang === 'en') return b.oldTranslator ? `with ${transName(b.oldTranslator)}’s Chinese` : 'with plain Chinese';
  return `${hasEn(b) ? '英译 · ' : ''}${b.oldTranslator ? `${b.oldTranslator}译本对照` : '梵汉对照'}`;
}
const TRANSLATORS = { 玄奘: 'Xuanzang', 鸠摩罗什: 'Kumarajiva', 康僧铠: 'Kang Sengkai', 实叉难陀: 'Shikshananda' };
const transName = (zh) => TRANSLATORS[zh] ?? zh;

// 三语对照总结。多章书放在目录页，单章书放在经文后面。
function compareSection(b, lang) {
  if (!hasEn(b)) return '';
  const t = T[lang];
  const paras = lang === 'en' ? (b.en.compareEn ?? b.en.compare) : b.en.compare;
  const pLang = lang === 'en' && !b.en.compareEn ? ' lang="zh-Hans"' : '';
  return `
<section class="compare" id="compare">
  <p class="kicker">${t.compareKicker}</p>
  <h2>${esc(t.compareTitle)}</h2>
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
function layout({ lang, path, alt, exact = true, title: pageTitle, description, body, jsonLd, noindex = false, cols }) {
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
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&family=Noto+Serif+Devanagari:wght@400;600&display=swap">
<link rel="stylesheet" href="/styles.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n` : ''}</head>
<body data-lang="${lang}"${cols ? ` data-default-cols="${cols}" class="${['zh', 'en', 'old', 'sa'].filter((c) => !cols.split(' ').includes(c)).map((c) => `hide-${c}`).join(' ')}"` : ''}>
<header class="site-header">
  <a class="brand" href="${homePath(lang)}"><img class="brand-mark" src="/favicon.svg" alt="" width="32" height="32"><span>${esc(t.siteName)}<small>${esc(t.siteSub)}</small></span></a>
  <div class="header-actions">
    ${langToggle(lang, alt)}
    <a class="home-link" href="${MAIN_SITE}/${lang === 'zh' ? 'zh/' : ''}">Eden ↗</a>
  </div>
</header>
<main>
${body}
</main>
<footer class="site-footer">
  <p>${esc(t.footer)}</p>
  <p><a href="${MAIN_SITE}/">Eden Tan</a> · <a href="/sitemap.xml">Sitemap</a></p>
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

function bookCard(b, lang) {
  const t = T[lang];
  return `<li><a href="${bookPath(b, lang)}">
      ${emblemPicture(b.slug, 'card-emblem', { still: true })}
      <strong>${esc(title(b, lang))}</strong>
      <span class="sa-name" lang="sa-Latn">${esc(b.sanskrit)}</span>${
        lang === 'zh' && hasEn(b) ? `\n      <span class="en-name" lang="en">${esc(b.en.title)}</span>` : lang === 'en' ? `\n      <span class="en-name" lang="zh-Hans">${esc(b.title)}</span>` : ''
      }
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
      ? `<p class="kicker">Scripture / ${shown.length} Sanskrit classics in English</p>
    <h1>Read the scriptures straight from the Sanskrit<span lang="zh-Hans">从梵文直接读懂经书</span></h1>
    <p>Every passage is translated directly from the Sanskrit into plain English, with the Devanagari original and its romanization alongside. A short note marks where the English, the Chinese and the Sanskrit part ways: a word that shifts meaning, a line an ancient translator added or cut.</p>
    <p>Switch on the Chinese columns to read the site’s plain-Chinese translation and the classical versions by Xuanzang and Kumarajiva side by side.</p>`
      : `<p class="kicker">Scripture / ${books.length} 部梵文经典</p>
    <h1>从梵文直接读懂经书<span lang="en">${esc(T.zh.siteSub)}</span></h1>
    <p>每一段先给从梵文直译的白话，再把玄奘、鸠摩罗什这些古代译本放在旁边对照：古人多译了什么、少译了什么、哪里和梵文不一样，都标出来。最后附梵文原文和罗马转写。</p>
    <p>${books.filter(hasEn).map((b) => esc(b.title)).join('、')}另有从梵文直译的英文，并逐段标出英文、中文、梵文的差别。点右上角 EN 看英文版。</p>`;
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
  <p class="kicker">${String(gi + 1).padStart(2, '0')} / ${esc(lang === 'en' ? label.zh : label.en)}</p>
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
  <p class="kicker">${String(groups.length + 1).padStart(2, '0')} / 只有中文</p>
  <h2>Chinese only for now</h2>
  <p class="meta">English translations of these are in progress. Until then each opens the Chinese page, with the Sanskrit alongside.</p>
  <ul class="book-list">
    ${pending
      .map(
        (b) => `<li><a href="${bookPath(b, 'zh')}" hreflang="zh-Hans">
      ${emblemPicture(b.slug, 'card-emblem', { still: true })}
      <strong>${esc(EN_PENDING[b.slug]?.[0] ?? b.sanskrit)}</strong>
      <span class="sa-name" lang="sa-Latn">${esc(b.sanskrit)}</span>
      <span class="en-name" lang="zh-Hans">${esc(b.title)}</span>
      <p>${esc(EN_PENDING[b.slug]?.[1] ?? '')}</p>
      <small>${b.chapters.length > 1 ? `${t.chapters(b.chapters.length)} · ` : ''}${t.verses(verseCount(b))} · Chinese ↗</small>
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
        ? `${t.siteName}: Heart Sutra, Diamond Sutra, Bhagavad Gita and Yoga Sutras from the Sanskrit`
        : `${t.siteName}：心经、金刚经、法华经、薄伽梵歌梵汉对照`,
    description:
      lang === 'en'
        ? 'The Heart Sutra, Diamond Sutra, Amitabha Sutra, Bhagavad Gita and Yoga Sutras translated straight from the Sanskrit into plain English, passage by passage, with notes on where English, Chinese and Sanskrit differ.'
        : '心经、金刚经、阿弥陀经、无量寿经、法华经、维摩诘经、楞伽经、薄伽梵歌、瑜伽经：从梵文直译成白话，逐段对照玄奘、鸠摩罗什等古译，附天城体原文与罗马转写。',
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: t.siteName,
      alternateName: t.siteSub,
      url: SITE + homePath(lang),
      inLanguage: lang === 'en' ? ['en', 'zh-Hans', 'sa'] : ['zh-Hans', 'en', 'sa'],
      author: { '@type': 'Person', name: 'Eden Tan', url: MAIN_SITE + '/' },
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
  <h1>${esc(title(b, lang))}<span lang="sa-Latn">${esc(b.sanskrit)}</span></h1>
  <p>${esc(summary(b, lang))}</p>${lang === 'zh' && hasEn(b) ? `\n  <p class="en-summary" lang="en">${esc(b.en.summary)}</p>` : ''}
  <p class="meta">${t.chapters(b.chapters.length)} · ${t.verses(verseCount(b))} · ${esc(compareLabel(b, lang))}</p>
  </div>
  ${emblemPicture(b.slug, 'hero-emblem hero-scene', { kind: 'scenes' })}
</section>
<ol class="chapter-list">
  ${b.chapters
    .map((ch, i) => {
      const sub = lang === 'zh' ? ch.en : ch.title;
      return `<li><a href="${chapterPath(b, i, lang)}"><strong>${esc(chTitle(ch, lang))}${sub ? `<em lang="${lang === 'zh' ? 'en' : 'zh-Hans'}">${esc(sub)}</em>` : ''}</strong><span>${t.verses(ch.verses.length)}</span></a></li>`;
    })
    .join('\n  ')}
</ol>${compareSection(b, lang)}`;
  return layout({
    lang,
    path: bookPath(b, lang),
    alt: bookAlt(b),
    exact: hasEn(b),
    title:
      lang === 'en'
        ? `${b.en.title} (${b.sanskrit}): Sanskrit, plain English and Chinese side by side`
        : `${b.title} 梵文原文 · 白话直译 · ${compareLabel(b, lang)} | ${b.sanskrit}`,
    description:
      lang === 'en'
        ? `${b.en.summary} ${b.chapters.length} chapters, each passage with the Sanskrit in Devanagari and romanization.`
        : `${b.summary} 共 ${b.chapters.length} 章，每段附梵文天城体与罗马转写。`,
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Book',
          name: title(b, lang),
          alternateName: b.sanskrit,
          url: SITE + bookPath(b, lang),
          inLanguage: langs(b),
          hasPart: b.chapters.map((ch, i) => ({ '@type': 'Chapter', name: chTitle(ch, lang), url: SITE + chapterPath(b, i, lang) })),
        },
        breadcrumbLd([[t.siteName, homePath(lang)], [title(b, lang), bookPath(b, lang)]]),
      ],
    },
  });
}

function enHtml(v, lang) {
  if (!v.en) return '';
  const t = T[lang];
  const cmp = v.en.cmp ?? [];
  const note = (n) => (lang === 'en' && n.en ? [n.en, 'en'] : [n.note, 'zh-Hans']);
  return `
    <div class="col en" data-col="en">
      <p class="en-text" lang="en">${esc(v.en.text)}</p>${
        cmp.length
          ? `
      <details class="notes cmp"><summary>${t.cmpLabel(cmp.length)}</summary><dl>${cmp
              .map((n) => {
                const [text, l] = note(n);
                return `<dt>${esc(n.w)}</dt><dd lang="${l}">${esc(text)}</dd>`;
              })
              .join('')}</dl></details>`
          : ''
      }
    </div>`;
}

function oldHtml(v, lang) {
  if (!v.old) return '';
  const who = v.old.who ?? '古译';
  return `
    <div class="col old" data-col="old" lang="zh-Hans">
      ${v.old.text ? `<p class="old-text"><span class="who">${esc(lang === 'en' ? transName(who) : who)}</span>${esc(v.old.text)}</p>` : ''}
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

function verseHtml(v, j, lang) {
  const t = T[lang];
  const zh = `
    <p class="col zh" data-col="zh"${lang === 'en' ? ' lang="zh-Hans"' : ''}>${esc(v.zh)}</p>`;
  // 中文版：白话 → 英文 → 古译 → 梵文；英文版：英文 → 梵文 → 白话 → 古译
  const sa = `
    <div class="col sa" data-col="sa">
      <p class="deva" lang="sa">${esc(v.sa.text)}</p>
      <p class="iast" lang="sa-Latn">${esc(v.sa.tr)}</p>
    </div>`;
  const cols = lang === 'en' ? [enHtml(v, lang), sa, zh, oldHtml(v, lang)] : [zh, enHtml(v, lang), oldHtml(v, lang), sa];
  return `
  <li class="verse" id="v${j + 1}">
    <a class="num" href="#v${j + 1}" aria-label="${t.verseLabel(j + 1)}">${j + 1}</a>${cols.join('')}
  </li>`;
}

function chapterPage(b, i, lang) {
  const t = T[lang];
  const ch = b.chapters[i];
  const single = b.chapters.length === 1;
  const prev = b.chapters[i - 1];
  const next = b.chapters[i + 1];
  const heading = single ? title(b, lang) : `${title(b, lang)} · ${chTitle(ch, lang)}`;
  const hasOld = ch.verses.some((v) => v.old);
  const oldLabel = lang === 'en' ? (b.oldTranslator ? `${transName(b.oldTranslator)} (classical Chinese)` : 'Chinese notes') : b.oldTranslator ? `${b.oldTranslator}古译` : '注';
  const btn = {
    zh: `<button type="button" data-toggle="zh" aria-pressed="true">${lang === 'en' ? 'Plain Chinese' : '白话直译'}</button>`,
    en: hasEn(b) ? '<button type="button" data-toggle="en" aria-pressed="true">English</button>' : '',
    old: hasOld ? `<button type="button" data-toggle="old" aria-pressed="true">${esc(oldLabel)}</button>` : '',
    sa: `<button type="button" data-toggle="sa" aria-pressed="true">${lang === 'en' ? 'Sanskrit' : '梵文'}</button>`,
  };
  const order = lang === 'en' ? ['en', 'sa', 'zh', 'old'] : ['zh', 'en', 'old', 'sa'];
  const sub = single ? summary(b, lang) : '';
  const otherSub = lang === 'zh' ? (single ? (hasEn(b) ? b.en.summary : '') : ch.en ?? '') : single ? '' : ch.title;
  const body = `
<nav class="crumbs" aria-label="breadcrumb"><a href="${homePath(lang)}">${t.home}</a> / ${single ? esc(title(b, lang)) : `<a href="${bookPath(b, lang)}">${esc(title(b, lang))}</a> / ${esc(chTitle(ch, lang))}`}</nav>
<section class="hero compact hero--art hero--book">
  <div class="hero-copy">
  <h1>${esc(heading)}<span lang="sa-Latn">${esc(b.sanskrit)}</span></h1>
  ${sub ? `<p>${esc(sub)}</p>` : ''}${otherSub ? `\n  <p class="en-summary" lang="${lang === 'zh' ? 'en' : 'zh-Hans'}">${esc(otherSub)}</p>` : ''}
  <p class="meta">${t.verses(ch.verses.length)} · ${esc(compareLabel(b, lang))}</p>
  </div>
  ${emblemPicture(b.slug, 'hero-emblem hero-scene', { kind: 'scenes' })}
</section>
<div class="col-toggle" role="group" aria-label="${t.cols}">
  ${order.map((k) => btn[k]).filter(Boolean).join('\n  ')}
</div>
<ol class="verses">${ch.verses.map((v, j) => verseHtml(v, j, lang)).join('')}
</ol>${single ? compareSection(b, lang) : ''}
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
    cols: lang === 'en' ? 'en sa' : undefined,
    title:
      lang === 'en'
        ? `${heading}: Sanskrit with plain English translation`
        : `${heading} 梵文原文 · 白话直译 · ${compareLabel(b, lang)}`,
    description: clip(lang === 'en' ? ch.verses[0].en.text : ch.verses[0].zh, lang === 'en' ? 160 : 140),
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': single ? 'Book' : 'Chapter',
          name: heading,
          alternateName: b.sanskrit,
          url: SITE + chapterPath(b, i, lang),
          inLanguage: langs(b),
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
    `# ${T.zh.siteName} / ${T.en.siteName}\n\n> 佛经与印度经典从梵文直译成白话中文，逐段对照古代汉译（玄奘、鸠摩罗什等），附天城体原文与罗马转写；部分经书另有从梵文直译的英文版（/en/），并逐段标出英文、中文、梵文的差别。\n> Buddhist and Hindu classics translated directly from Sanskrit into plain Chinese and (for some books) plain English, passage by passage, with notes on where English, Chinese and Sanskrit differ.\n\n${books
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
