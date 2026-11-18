// content/*.json + src/ -> dist/：首页、每部经书、每一章一个静态 HTML，外加 sitemap / robots / llms.txt。
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
const SITE_NAME = '梵文经书白话直译';
const SITE_NAME_EN = 'Sanskrit Scriptures in Plain Chinese';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export const bookPath = (b) => `/${b.slug}/`;
export const chapterPath = (b, i) => (b.chapters.length === 1 ? bookPath(b) : `/${b.slug}/${i + 1}/`);
const verseCount = (b) => b.chapters.reduce((n, ch) => n + ch.verses.length, 0);
const compare = (b) => `${b.en ? '英译 · ' : ''}${b.oldTranslator ? `${b.oldTranslator}译本对照` : '梵汉对照'}`;
const langs = (b) => ['zh-Hans', ...(b?.en ? ['en'] : []), 'sa'];

// 三语对照总结：英文、中文、梵文差在哪。多章书放在目录页，单章书放在经文后面。
function compareSection(b) {
  if (!b.en) return '';
  return `
<section class="compare" id="compare">
  <p class="kicker">Sanskrit · English · 中文</p>
  <h2>英文、中文、梵文差在哪</h2>
  ${b.en.compare.map((p) => `<p>${esc(p)}</p>`).join('\n  ')}
  <p class="meta">每段英文下面的「三语对照」，是这一段里具体的差别。</p>
</section>`;
}

function layout({ path, title, description, body, jsonLd, noindex = false }) {
  const url = SITE + path;
  return `<!doctype html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#050505" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&family=Noto+Serif+Devanagari:wght@400;600&display=swap">
<link rel="stylesheet" href="/styles.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n` : ''}</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><img class="brand-mark" src="/favicon.svg" alt="" width="32" height="32"><span>${esc(SITE_NAME)}<small>${esc(SITE_NAME_EN)}</small></span></a>
  <a class="home-link" href="${MAIN_SITE}/">Eden ↗</a>
</header>
<main>
${body}
</main>
<footer class="site-footer">
  <p>梵文原文与古代汉译（玄奘、鸠摩罗什、康僧铠、实叉难陀）都是公有领域；白话直译、古译今译与注释是本站整理，转载请注明出处。</p>
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

function homePage(books) {
  const groups = Object.entries(TRADITIONS)
    .map(([key, label]) => [label, books.filter((b) => b.tradition === key)])
    .filter(([, list]) => list.length);
  const body = `
<section class="hero hero--art">
  <div class="hero-copy">
    <p class="kicker">Scripture / ${books.length} 部梵文经典</p>
    <h1>从梵文直接读懂经书<span lang="en">${esc(SITE_NAME_EN)}</span></h1>
    <p>每一段先给从梵文直译的白话，再把玄奘、鸠摩罗什这些古代译本放在旁边对照：古人多译了什么、少译了什么、哪里和梵文不一样，都标出来。最后附梵文原文和罗马转写。</p>
    <p>${books.filter((b) => b.en).map((b) => esc(b.title)).join('、')}另有从梵文直译的英文，并逐段标出英文、中文、梵文的差别。</p>
  </div>
  ${emblemPicture('lotus', 'hero-emblem hero-scene', { kind: 'scenes' })}
</section>
${groups
  .map(
    ([label, list], gi) => `
<section class="tradition">
  <p class="kicker">${String(gi + 1).padStart(2, '0')} / ${esc(label.en)}</p>
  <h2>${esc(label.zh)}</h2>
  <ul class="book-list">
    ${list
      .map(
        (b) => `<li><a href="${bookPath(b)}">
      ${emblemPicture(b.slug, 'card-emblem', { still: true })}
      <strong>${esc(b.title)}</strong>
      <span class="sa-name" lang="sa-Latn">${esc(b.sanskrit)}</span>${b.en ? `\n      <span class="en-name" lang="en">${esc(b.en.title)}</span>` : ''}
      <p>${esc(b.summary)}</p>
      <small>${b.chapters.length > 1 ? `${b.chapters.length} 章 · ` : ''}${verseCount(b)} 段 · ${esc(compare(b))}</small>
    </a></li>`,
      )
      .join('\n    ')}
  </ul>
</section>`,
  )
  .join('\n')}`;
  return layout({
    path: '/',
    title: `${SITE_NAME}：心经、金刚经、法华经、薄伽梵歌梵汉对照`,
    description: '心经、金刚经、阿弥陀经、无量寿经、法华经、维摩诘经、楞伽经、薄伽梵歌、瑜伽经：从梵文直译成白话，逐段对照玄奘、鸠摩罗什等古译，附天城体原文与罗马转写。',
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: SITE_NAME_EN,
      url: SITE + '/',
      inLanguage: ['zh-Hans', 'en', 'sa'],
      author: { '@type': 'Person', name: 'Eden Tan', url: MAIN_SITE + '/' },
    },
  });
}

function bookIndexPage(b) {
  const body = `
<nav class="crumbs" aria-label="breadcrumb"><a href="/">首页</a> / ${esc(TRADITIONS[b.tradition].zh)}</nav>
<section class="hero hero--art hero--book">
  <div class="hero-copy">
  <h1>${esc(b.title)}<span lang="sa-Latn">${esc(b.sanskrit)}</span></h1>
  <p>${esc(b.summary)}</p>${b.en ? `\n  <p class="en-summary" lang="en">${esc(b.en.summary)}</p>` : ''}
  <p class="meta">${b.chapters.length} 章 · ${verseCount(b)} 段 · 梵文直译 · ${esc(compare(b))}</p>
  </div>
  ${emblemPicture(b.slug, 'hero-emblem hero-scene', { kind: 'scenes' })}
</section>
<ol class="chapter-list">
  ${b.chapters
    .map((ch, i) => `<li><a href="${chapterPath(b, i)}"><strong>${esc(ch.title)}${ch.en ? `<em lang="en">${esc(ch.en)}</em>` : ''}</strong><span>${ch.verses.length} 段</span></a></li>`)
    .join('\n  ')}
</ol>${compareSection(b)}`;
  return layout({
    path: bookPath(b),
    title: `${b.title} 梵文原文 · 白话直译 · ${compare(b)} | ${b.sanskrit}`,
    description: `${b.summary} 共 ${b.chapters.length} 章，每段附梵文天城体与罗马转写。`,
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Book',
          name: b.title,
          alternateName: b.sanskrit,
          url: SITE + bookPath(b),
          inLanguage: langs(b),
          hasPart: b.chapters.map((ch, i) => ({ '@type': 'Chapter', name: ch.title, url: SITE + chapterPath(b, i) })),
        },
        breadcrumbLd([[SITE_NAME, '/'], [b.title, bookPath(b)]]),
      ],
    },
  });
}

function enHtml(v) {
  if (!v.en) return '';
  const cmp = v.en.cmp ?? [];
  return `
    <div class="col en" data-col="en">
      <p class="en-text" lang="en">${esc(v.en.text)}</p>${
        cmp.length
          ? `
      <details class="notes cmp"><summary>三语对照 ${cmp.length}</summary><dl>${cmp
              .map((n) => `<dt>${esc(n.w)}</dt><dd>${esc(n.note)}</dd>`)
              .join('')}</dl></details>`
          : ''
      }
    </div>`;
}

function verseHtml(v, j) {
  const old = v.old
    ? `
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
    </div>`
    : '';
  return `
  <li class="verse" id="v${j + 1}">
    <a class="num" href="#v${j + 1}" aria-label="第 ${j + 1} 段">${j + 1}</a>
    <p class="col zh" data-col="zh">${esc(v.zh)}</p>${enHtml(v)}${old}
    <div class="col sa" data-col="sa">
      <p class="deva" lang="sa">${esc(v.sa.text)}</p>
      <p class="iast" lang="sa-Latn">${esc(v.sa.tr)}</p>
    </div>
  </li>`;
}

function chapterPage(b, i) {
  const ch = b.chapters[i];
  const single = b.chapters.length === 1;
  const prev = b.chapters[i - 1];
  const next = b.chapters[i + 1];
  const heading = single ? b.title : `${b.title} · ${ch.title}`;
  const hasOld = ch.verses.some((v) => v.old);
  const body = `
<nav class="crumbs" aria-label="breadcrumb"><a href="/">首页</a> / ${single ? esc(b.title) : `<a href="${bookPath(b)}">${esc(b.title)}</a> / ${esc(ch.title)}`}</nav>
<section class="hero compact hero--art hero--book">
  <div class="hero-copy">
  <h1>${esc(heading)}<span lang="sa-Latn">${esc(b.sanskrit)}</span></h1>
  ${single ? `<p>${esc(b.summary)}</p>${b.en ? `\n  <p class="en-summary" lang="en">${esc(b.en.summary)}</p>` : ''}` : ch.en ? `<p class="en-summary" lang="en">${esc(ch.en)}</p>` : ''}
  <p class="meta">${ch.verses.length} 段 · 梵文直译 · ${esc(compare(b))}</p>
  </div>
  ${emblemPicture(b.slug, 'hero-emblem hero-scene', { kind: 'scenes' })}
</section>
<div class="col-toggle" role="group" aria-label="显示哪几栏">
  <button type="button" data-toggle="zh" aria-pressed="true">白话直译</button>
  ${b.en ? '<button type="button" data-toggle="en" aria-pressed="true">English</button>' : ''}
  ${hasOld ? `<button type="button" data-toggle="old" aria-pressed="true">${esc(b.oldTranslator ? `${b.oldTranslator}古译` : '注')}</button>` : ''}
  <button type="button" data-toggle="sa" aria-pressed="true">梵文</button>
</div>
<ol class="verses">${ch.verses.map(verseHtml).join('')}
</ol>${single ? compareSection(b) : ''}
<nav class="pager">
  ${prev ? `<a rel="prev" href="${chapterPath(b, i - 1)}">← ${esc(prev.title)}</a>` : '<span></span>'}
  ${next ? `<a rel="next" href="${chapterPath(b, i + 1)}">${esc(next.title)} →</a>` : '<span></span>'}
</nav>`;
  const crumbs = [[SITE_NAME, '/'], [b.title, bookPath(b)]];
  if (!single) crumbs.push([ch.title, chapterPath(b, i)]);
  return layout({
    path: chapterPath(b, i),
    title: `${heading} 梵文原文 · 白话直译 · ${compare(b)}`,
    description: clip(ch.verses[0].zh, 140),
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': single ? 'Book' : 'Chapter',
          name: heading,
          alternateName: b.sanskrit,
          url: SITE + chapterPath(b, i),
          inLanguage: langs(b),
          ...(single ? {} : { isPartOf: { '@type': 'Book', name: b.title, url: SITE + bookPath(b) } }),
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

  const pages = [['/', homePage(books)]];
  for (const b of books) {
    if (b.chapters.length > 1) pages.push([bookPath(b), bookIndexPage(b)]);
    b.chapters.forEach((_, i) => pages.push([chapterPath(b, i), chapterPage(b, i)]));
  }
  for (const [path, html] of pages) write(join(path, 'index.html'), html);

  write(
    '404.html',
    layout({
      path: '/404.html',
      title: `找不到这一页 | ${SITE_NAME}`,
      description: '找不到这一页。',
      noindex: true,
      body: '<section class="hero"><h1>找不到这一页<span lang="en">Page not found</span></h1><p><a href="/">回到首页</a></p></section>',
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
  write(
    'llms.txt',
    `# ${SITE_NAME} / ${SITE_NAME_EN}\n\n> 佛经与印度经典从梵文直译成白话中文，逐段对照古代汉译（玄奘、鸠摩罗什等），附天城体原文与罗马转写；部分经书另有从梵文直译的英文，并逐段标出英文、中文、梵文的差别。\n\n${books
      .map(
        (b) =>
          `## ${b.title} (${b.sanskrit})${b.en ? ` — ${b.en.title}` : ''}\n\n${b.summary}\n\n${b.en ? `${b.en.summary}\n\n` : ''}${b.chapters.map((ch, i) => `- [${ch.title}](${SITE}${chapterPath(b, i)})`).join('\n')}`,
      )
      .join('\n\n')}\n`,
  );
  write('CNAME', `${HOST}\n`);
  return pages.map(([p]) => p);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const paths = build();
  console.log(`built ${paths.length} pages -> ${OUT}`);
}
