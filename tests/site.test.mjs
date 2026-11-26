import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateBook, loadBooks, mergeEnglish, verseKey } from '../scripts/content.mjs';

process.env.OUT_DIR = mkdtempSync(join(tmpdir(), 'scripture-dist-'));
const OUT = process.env.OUT_DIR;
const { build, bookPath, chapterPath, chNo, isSingle } = await import('../scripts/build.mjs');
const { arTranslit } = await import('../scripts/ar-translit.mjs');
const { grcTranslit } = await import('../scripts/grc-translit.mjs');
const { startServer } = await import('../scripts/serve.mjs');
const { iastToDeva } = await import('../scripts/iast-to-deva.mjs');

test('梵文、巴利文、文言、希腊文、阿拉伯文书架三十部全部通过校验', () => {
  const books = loadBooks();
  assert.equal(books.length, 30);
});

test('罗马转写转天城体：复合词连字符不断开、词间保留半音符、句读转成 । ॥', () => {
  assert.equal(iastToDeva('yogaś cittavṛttinirodhaḥ || 1.2 ||'), 'योगश् चित्तवृत्तिनिरोधः ॥ १.२ ॥');
  assert.equal(iastToDeva('mad-arthe tyakta-jīvitāḥ |'), 'मदर्थे त्यक्तजीविताः ।');
  assert.equal(iastToDeva('sabbe sattā bhavantu sukhitattā'), 'सब्बे सत्ता भवन्तु सुखितत्ता');
  assert.equal(iastToDeva('dhammacakkaṃ'), 'धम्मचक्कं');
  assert.equal(iastToDeva('kāyo’ti', { pali: true }), 'कायो’ति');
  assert.equal(iastToDeva("so 'ham"), 'सो ऽहम्');
});

test('阿拉伯文罗马转写：冠词同化、连读 alif、安拉、长元音、鼻音尾、同化进下一个字母的辅音', () => {
  assert.equal(arTranslit('بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ'), 'bismi Allāhi ar-raḥmāni ar-raḥīmi');
  assert.equal(arTranslit('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'), 'al-ḥamdu lillāhi rabbi al-ʿālamīna');
  assert.equal(arTranslit('وَالْجِبَالَ أَوْتَادًا'), 'wal-jibāla awtādan');
  assert.equal(arTranslit('لِّلطَّاغِينَ مَآبًا'), 'liṭ-ṭāghīna maʾāban');
  assert.equal(arTranslit('وَإِذَا النُّجُومُ انكَدَرَتْ'), 'waʾidhā an-nujūmu inkadarat');
  assert.equal(arTranslit('وَلَلْآخِرَةُ خَيْرٌ لَّكَ مِنَ الْأُولَىٰ'), 'walal-ʾākhiratu khayrun laka mina al-ʾūlā');
  assert.equal(arTranslit('وَلَا أَنَا عَابِدٌ مَّا عَبَدتُّمْ'), 'walā anā ʿābidun mā ʿabadtum');
  assert.equal(arTranslit('أُولَـٰئِكَ هُمْ خَيْرُ الْبَرِيَّةِ ۖ وَاللَّهُ'), 'ulāʾika hum khayru al-bariyyati wallāhu');
});

test('希腊文罗马转写：粗气号写 h（双元音的也在最前）、鼻音 γ、双元音里的 υ、下标 ι、分音符、标点', () => {
  assert.equal(grcTranslit('Ἀρχὴ τοῦ εὐαγγελίου Ἰησοῦ χριστοῦ.'), 'Archē tou euangeliou Iēsou christou.');
  assert.equal(grcTranslit('ὁ υἱός μου ὁ ἀγαπητός'), 'ho huios mou ho agapētos');
  assert.equal(grcTranslit('οἱ Ἱεροσολυμῖται'), 'hoi Hierosolymitai');
  assert.equal(grcTranslit('ἐν τῷ Ἠσαΐᾳ τῷ προφήτῃ·'), 'en tōi Ēsaïāi tōi prophētēi;');
  assert.equal(grcTranslit('Τί ἐστιν τοῦτο; εὗρον Μωϋσῆς ῥῆμα'), 'Ti estin touto? heuron Mōÿsēs rhēma');
});

test('带章号的书只收了一章时也照多章书排：有目录页，章节页在 /<slug>/<章号>/', () => {
  const one = { slug: 'x', chapters: [{ no: 1 }] };
  assert.equal(isSingle(one), false);
  assert.equal(chapterPath(one, 0), '/x/1/');
  assert.equal(isSingle({ slug: 'x', chapters: [{}] }), true);
});

test('只收了一部分章的书：章号决定网址，章号必须每章都有且递增', () => {
  const book = (nos) => ({
    slug: 'x', tradition: 'islam', origLang: 'ar', title: 'a', sanskrit: 'a', summary: 'a',
    chapters: nos.map((no) => ({ title: 'a', ...(no ? { no } : {}), verses: [{ zh: 'a', sa: { text: 'ا', tr: 'a' } }] })),
  });
  assert.equal(chapterPath(validateBook(book([1, 78]), 'x.json'), 1), '/x/78/');
  assert.equal(chapterPath(validateBook(book([1, 78]), 'x.json'), 1, 'en'), '/en/x/78/');
  assert.throws(() => validateBook(book([1, 0]), 'x.json'), /章号/);
  assert.throws(() => validateBook(book([78, 1]), 'x.json'), /章号/);
});

test('一图看懂：每个母题都画得出来，没有文字节点、没有坏坐标；古兰经每章都有二到四个重点和一张大图', async () => {
  const { PANEL_ICONS, sceneSvg } = await import('../scripts/panels.mjs');
  for (const layout of ['wide', 'tall']) {
    for (let i = 0; i < PANEL_ICONS.length; i += 3) {
      const svg = sceneSvg(PANEL_ICONS.slice(i, i + 3), layout);
      assert.ok(!/NaN|undefined|<text/.test(svg), `${layout} ${PANEL_ICONS.slice(i, i + 3)} 画坏了或带了字`);
    }
  }
  assert.throws(() => sceneSvg(['nope']), /没有这个母题/);
  build();
  const quran = loadBooks().find((b) => b.slug === 'quran');
  // 没背景的人先看的几条：中英条数一样，目录页放在章节列表前面
  assert.ok(quran.primer.zh.length >= 5 && quran.primer.zh.length === quran.primer.en.length, '古兰经要有「读之前先知道这几件事」，中英条数一样');
  for (const lang of ['zh', 'en']) {
    const toc = readFileSync(join(OUT, bookPath(quran, lang), 'index.html'), 'utf8');
    assert.ok(toc.includes('id="primer"') && toc.indexOf('id="primer"') < toc.indexOf('class="chapter-list"'), `古兰经 ${lang} 目录页的导读要在章节列表前面`);
    assert.equal(toc.split('<details').length - 1 >= quran.primer[lang].length, true, `古兰经 ${lang} 目录页导读条数不对`);
  }
  quran.chapters.forEach((ch, i) => {
    assert.ok(ch.points?.length >= 2 && ch.points.length <= 4, `古兰经第 ${ch.no} 章要有二到四个重点`);
    assert.equal(ch.enPoints?.length, ch.points.length, `古兰经第 ${ch.no} 章英文重点条数不对`);
    for (const lang of ['zh', 'en']) {
      const html = readFileSync(join(OUT, chapterPath(quran, i, lang), 'index.html'), 'utf8');
      assert.equal(html.split('class="scene-art scene-art--wide"').length - 1, 1, `第 ${ch.no} 章 ${lang} 缺大图`);
      assert.equal(html.split('class="story-no"').length - 1, ch.points.length, `第 ${ch.no} 章 ${lang} 图下说明条数不对`);
      assert.ok(html.includes('data-guide') && html.includes('<dialog class="guide"'), `第 ${ch.no} 章 ${lang} 缺「导读」按钮或面板`);
    }
  });
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

test('章节页段数和内容一致：每段都有白话和梵文，没有英文栏，三语对照与古译数和数据一致', () => {
  build();
  for (const b of loadBooks()) {
    b.chapters.forEach((ch, i) => {
      const p = chapterPath(b, i);
      const html = readFileSync(join(OUT, p, 'index.html'), 'utf8');
      const count = (col) => html.split(`data-col="${col}"`).length - 1;
      assert.equal(count('zh'), ch.verses.length, `${p} 白话段数不对`);
      assert.equal(count('sa'), ch.verses.length, `${p} 梵文段数不对`);
      assert.equal(count('old'), ch.verses.filter((v) => v.old).length, `${p} 古译段数不对`);
      assert.equal(count('en'), 0, `${p} 中文版不该有英文栏`);
      assert.equal(html.split('class="notes cmp"').length - 1, ch.verses.filter((v) => v.en?.cmp).length, `${p} 三语对照注数不对`);
    });
  }
});

test('英文版：有英译的书每章都有英文页，段数一致，右上角语言切换指向对应页', () => {
  build();
  for (const b of loadBooks()) {
    b.chapters.forEach((ch, i) => {
      const zh = readFileSync(join(OUT, chapterPath(b, i), 'index.html'), 'utf8');
      if (!b.en) {
        assert.ok(!existsSync(join(OUT, chapterPath(b, i, 'en'), 'index.html')), `${b.slug} 没有英译却生成了英文页`);
        assert.match(zh, /class="lang-option" href="\/en\/"/);
        return;
      }
      const p = chapterPath(b, i, 'en');
      const html = readFileSync(join(OUT, p, 'index.html'), 'utf8');
      assert.match(html, /<html lang="en">/);
      assert.equal(html.split('data-col="en"').length - 1, ch.verses.length, `${p} 英文段数不对`);
      assert.equal(html.split('data-col="zh"').length + html.split('data-col="old"').length - 2, 0, `${p} 英文版不该有中文栏`);
      assert.ok(html.includes(`href="${chapterPath(b, i)}" hreflang="zh-Hans"`), `${p} 切中文没指向对应页`);
      assert.ok(zh.includes(`href="${p}" hreflang="en"`), `${chapterPath(b, i)} 切英文没指向对应页`);
    });
  }
});

test('首页不放使用说明；每页有浅深色切换；书卡与章节页带阅读进度用的数据', () => {
  const books = loadBooks();
  const paths = build();
  const zhHome = readFileSync(join(OUT, 'index.html'), 'utf8');
  const enHome = readFileSync(join(OUT, 'en', 'index.html'), 'utf8');
  assert.ok(!zhHome.includes('点右上角 EN 切换') && !zhHome.includes('每一段先给从梵文直译的白话'), '中文首页还有使用说明');
  assert.ok(!enHome.includes('one click away'), '英文首页还有使用说明');
  for (const p of paths) {
    const html = readFileSync(join(OUT, p, 'index.html'), 'utf8');
    assert.ok(html.includes('class="theme-toggle"'), `${p} 缺浅深色切换`);
    assert.ok(html.indexOf("localStorage.getItem('scripture.theme')") < html.indexOf('<body'), `${p} 主题要在 body 之前套上`);
  }
  for (const b of books) {
    assert.ok(zhHome.includes(`data-book="${b.slug}" data-verses="${b.chapters.map((c) => c.verses.length).join(',')}"`), `首页 ${b.slug} 卡缺进度数据`);
    b.chapters.forEach((ch, i) => {
      const html = readFileSync(join(OUT, chapterPath(b, i), 'index.html'), 'utf8');
      assert.ok(html.includes(`<body data-lang="zh" data-book="${b.slug}" data-ch="${chNo(b, i) - 1}" data-verses="${ch.verses.length}">`), `${chapterPath(b, i)} 缺进度数据`);
    });
  }
});

test('首页有「继续读」按钮位和「在读」「读完了」两个书架（构建时藏着，由 app.js 按本机进度填）；小屏不让页头撑破', () => {
  build();
  for (const [file, reading, done] of [['index.html', '在读', '读完了'], ['en/index.html', 'Reading', 'Finished']]) {
    const html = readFileSync(join(OUT, file), 'utf8');
    assert.equal(html.split('data-resume hidden').length - 1, 1, `${file} 缺继续读按钮位`);
    const at = (key) => html.indexOf(`data-shelf="${key}" hidden`);
    assert.ok(at('reading') > 0 && at('done') > at('reading'), `${file} 缺书架`);
    // 在读在所有书卡前面，读完了在所有书卡后面
    assert.ok(at('reading') < html.indexOf('data-book="') && at('done') > html.lastIndexOf('data-book="'), `${file} 书架位置不对`);
    assert.ok(html.includes(`<h2>${reading}<span>`) && html.includes(`<h2>${done}</h2>`), `${file} 书架标题不对`);
  }
  const js = readFileSync(join(OUT, 'app.js'), 'utf8');
  assert.ok(js.includes("'scripture.last.v1'") && js.includes('--header-h'));
  const css = readFileSync(join(OUT, 'styles.css'), 'utf8');
  assert.ok(css.includes('top: var(--header-h, 64px)'), '栏目开关要跟着页头实际高度贴');
  assert.match(css, /@media \(max-width: 480px\) \{[^}]*\}\s*\.home-link \{ display: none; \}/, '小屏要收掉页头的 Eden 链接');
  assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr));') && css.includes('repeat(var(--feed-cols, 2), minmax(0, 1fr))'), '手机上书卡不能被内容撑得比屏幕宽');
});

test('首页封面墙：每本书一张封面（线稿文件存在、墨色与底色一致），相邻两本不撞色不撞版式，英文版封面上没有中文', () => {
  const books = loadBooks();
  build();
  for (const file of ['index.html', 'en/index.html']) {
    const html = readFileSync(join(OUT, file), 'utf8');
    const cards = [...html.matchAll(/data-book="([^"]+)"[^>]*>\s*<div class="feed-art" data-layout="(\d)" data-pattern="(\d)" style="[^"]*--cover-bg:(#[0-9a-f]{6})[^"]*">\s*<img class="feed-scene" src="(\/covers\/[^"]+)"[\s\S]*?<h3 class="feed-title">([^<]+)<\/h3>\s*<span class="feed-seal"[^>]*>([^<]+)</g)];
    assert.equal(cards.length, books.length, `${file} 封面数不对`);
    cards.forEach(([, slug, layout, , bg, src, name, seal], i) => {
      assert.equal(src, `/covers/${slug}.svg`);
      const svg = readFileSync(join(OUT, src), 'utf8');
      assert.ok(svg.includes(`fill="${bg}"`) || !svg.includes('fill="#'), `${slug} 线稿的实心件要用封面底色`);
      assert.ok(svg.includes('non-scaling-stroke') && !svg.includes('<animate'), `${slug} 封面线稿要静止、线宽不随缩放变`);
      if (i) assert.ok(cards[i - 1][2] !== layout && cards[i - 1][4] !== bg, `${slug} 和前一本撞版式或撞色`);
      if (file.startsWith('en/')) assert.ok(!/[\u4e00-\u9fff]/.test(name + seal), `英文版封面有中文：${name} ${seal}`);
    });
  }
  const js = readFileSync(join(OUT, 'app.js'), 'utf8');
  assert.ok(js.indexOf("shelve('done'") < js.indexOf("'book-list feed'"), '要先搬书架再分列');
});

test('书里面的设计：目录页和读经页用这本书在首页的同一张封面做横幅、同一组颜色；读经页有进度位和章末的下一章卡', () => {
  const books = loadBooks();
  build();
  const home = readFileSync(join(OUT, 'index.html'), 'utf8');
  for (const b of books) {
    const bg = new RegExp(`data-book="${b.slug}"[^>]*>\\s*<div class="feed-art"[^>]*--cover-bg:(#[0-9a-f]{6})`).exec(home)?.[1];
    assert.ok(bg, `${b.slug} 首页封面没找到底色`);
    const pages = b.chapters.map((_, i) => chapterPath(b, i));
    if (!isSingle(b)) pages.push(`/${b.slug}/`);
    for (const p of pages) {
      const html = readFileSync(join(OUT, p, 'index.html'), 'utf8');
      assert.ok(html.includes(`<div class="book-page" style="--cover-bg:${bg};`), `${p} 颜色和首页封面不一致`);
      assert.equal(html.split('<h1>').length - 1, 1, `${p} 要有且只有一个 h1`);
      assert.ok(html.includes(`<img class="banner-scene" src="/covers/${b.slug}.svg"`), `${p} 横幅缺线稿`);
    }
    b.chapters.forEach((ch, i) => {
      const html = readFileSync(join(OUT, chapterPath(b, i), 'index.html'), 'utf8');
      assert.ok(html.includes('class="read-count"') && html.includes('class="read-bar"'), `${chapterPath(b, i)} 缺阅读进度位`);
      const next = b.chapters[i + 1] ? chapterPath(b, i + 1) : !isSingle(b) ? `/${b.slug}/` : '/';
      assert.ok(html.includes(`<a class="next-card"${b.chapters[i + 1] ? ' rel="next"' : ''} href="${next}">`), `${chapterPath(b, i)} 章末的卡没指向 ${next}`);
    });
  }
  const en = readFileSync(join(OUT, 'en', 'heart-sutra', 'index.html'), 'utf8');
  assert.ok(en.includes('data-label="Sanskrit"') && !/[\u4e00-\u9fff]/.test(en.slice(en.indexOf('<main>'), en.indexOf('class="col-toggle"'))), '英文读经页的横幅里不该有中文');
});

test('每页页脚写明 CC BY 4.0 授权并链到协议，仓库有 LICENSE', () => {
  const paths = build();
  assert.ok(existsSync(new URL('../LICENSE', import.meta.url)), '缺 LICENSE');
  for (const p of paths) {
    const html = readFileSync(join(OUT, p, 'index.html'), 'utf8');
    assert.ok(html.includes('href="https://creativecommons.org/licenses/by/4.0/" rel="license"'), `${p} 页脚缺授权链接`);
    assert.ok(html.includes('"license":"https://creativecommons.org/licenses/by/4.0/"'), `${p} 结构化数据缺 license`);
  }
});

test('每部书的花纹章与首屏插画文件都生成了', () => {
  const paths = build();
  for (const p of paths) {
    const html = readFileSync(join(OUT, p, 'index.html'), 'utf8');
    for (const [, src] of html.matchAll(/(?:src|srcset)="(\/(?:emblems|scenes)\/[^"]+)"/g)) assert.ok(existsSync(join(OUT, src)), `${p} 的图 ${src} 不存在`);
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

test('SEO：每个经文页的 description 各不相同、不是直接截经文，英文标题带通行名', async () => {
  const { chapterDescription, enSearchName } = await import('../scripts/build.mjs');
  const seen = new Set();
  for (const b of loadBooks()) {
    for (let i = 0; i < b.chapters.length; i++) {
      for (const lang of b.en ? ['zh', 'en'] : ['zh']) {
        const d = chapterDescription(b, i, lang);
        assert.ok(!seen.has(d), `重复的 description：${d}`);
        seen.add(d);
        const first = lang === 'en' ? b.chapters[i].verses[0].en.text : b.chapters[i].verses[0].zh;
        assert.ok(!d.startsWith(first.slice(0, 10)), `${b.slug} ${i} ${lang} 还是直接截经文`);
        assert.ok(d.length <= (lang === 'en' ? 160 : 140));
      }
    }
  }
  const heart = loadBooks().find((b) => b.slug === 'heart-sutra');
  assert.equal(enSearchName(heart), 'Heart Sutra');
  const html = readFileSync(join(OUT, 'en', 'heart-sutra', 'index.html'), 'utf8');
  assert.match(html, /<title>Heart Sutra \(/);
});

// 面板 SEO 审计按中文 1 字 = 2 宽来量 title / description,这里用同一把尺
const width = (s) => [...s].reduce((n, c) => n + (/[⺀-鿿　-〿＀-￯]/.test(c) ? 2 : 1), 0);
const jpegSize = (buf) => {
  // 找 SOF0/SOF2 段：高在 +5、宽在 +7(大端)
  for (let i = 2; i < buf.length; ) {
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
};

test('SEO：每页都有绝对网址的 og:image(文件在产物里、1200×630)与 summary_large_image', () => {
  const paths = build();
  for (const p of [...paths, '/404.html']) {
    const file = p.endsWith('.html') ? join(OUT, p) : join(OUT, p, 'index.html');
    const html = readFileSync(file, 'utf8');
    const img = html.match(/<meta property="og:image" content="([^"]+)">/)?.[1];
    assert.ok(img, `${p} 缺 og:image`);
    assert.match(img, /^https:\/\/scripture\.eden-tan\.com\/og-(zh|en)\.jpg$/, `${p} 的 og:image 不是绝对网址`);
    assert.equal(img.endsWith('og-en.jpg'), p.startsWith('/en/'), `${p} 用错了语言的分享图`);
    assert.ok(html.includes('<meta property="og:image:width" content="1200">') && html.includes('<meta property="og:image:height" content="630">'), `${p} 缺 og:image 尺寸`);
    assert.match(html, /<meta property="og:image:alt" content="[^"]+">/, `${p} 缺 og:image:alt`);
    assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'), `${p} 缺 twitter:card`);
  }
  for (const lang of ['zh', 'en']) {
    const buf = readFileSync(join(OUT, `og-${lang}.jpg`));
    assert.deepEqual(jpegSize(buf), [1200, 630], `og-${lang}.jpg 不是 1200×630`);
    assert.ok(buf.length < 300 * 1024, `og-${lang}.jpg 太大`);
  }
});

test('SEO：首页 title 宽 ≤60、description 宽 ≤160(中文 1 字算 2),站标是装饰图', () => {
  build();
  for (const p of ['/', '/en/']) {
    const html = readFileSync(join(OUT, p, 'index.html'), 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)[1].replace(/&amp;/g, '&');
    const desc = html.match(/<meta name="description" content="([^"]+)">/)[1].replace(/&amp;/g, '&');
    assert.ok(width(title) <= 60, `${p} title 宽 ${width(title)}：${title}`);
    assert.ok(width(desc) <= 160, `${p} description 宽 ${width(desc)}：${desc}`);
    assert.ok(html.includes('class="brand-mark" src="/favicon.svg" alt="" aria-hidden="true"'), `${p} 站标应是 alt="" 的装饰图`);
    for (const [img] of html.matchAll(/<img\b[^>]*>/g)) assert.match(img, /\balt="/, `${p} 有图片完全没写 alt：${img}`);
  }
});

test('导读：每部书有「读之前先知道这几件事」，多章书每章有「这一章在讲什么」，中英两版都显示', () => {
  build();
  for (const b of loadBooks()) {
    assert.ok(b.primer && b.primer.zh.length >= 4 && b.primer.zh.length <= 8, `${b.slug} 要有 4 到 8 条「读之前先知道」`);
    assert.equal(b.primer.en.length, b.primer.zh.length, `${b.slug} 导读中英条数不一样`);
    assert.ok(!/[\u4e00-\u9fff]/.test(JSON.stringify(b.primer.en)), `${b.slug} 英文导读里有中文`);
    const single = isSingle(b);
    for (const lang of ['zh', 'en']) {
      const toc = readFileSync(join(OUT, bookPath(b, lang), 'index.html'), 'utf8');
      assert.equal(toc.split('id="primer"').length - 1, 1, `${b.slug} ${lang} 目录页（单章书是经文页）要有一块导读`);
      // 多章书：导读在目录页、章节列表前面。单章书的目录页就是经文页：导读收在「导读」面板里，不压在经文前面
      if (single) assert.ok(toc.indexOf('class="verses"') < toc.indexOf('<dialog class="guide"') && toc.indexOf('<dialog class="guide"') < toc.indexOf('id="primer"'), `${b.slug} ${lang} 导读要收在面板里、排在经文后面`);
      else assert.ok(toc.indexOf('id="primer"') < toc.indexOf('class="chapter-list"'), `${b.slug} ${lang} 导读要排在章节列表前面`);
    }
    if (single) continue;
    const seen = new Set();
    b.chapters.forEach((ch, i) => {
      assert.ok(ch.intro && ch.enIntro, `${b.slug} 第 ${i + 1} 章缺中文或英文导读`);
      assert.ok((ch.intro.match(/[\u4e00-\u9fff]/g) ?? []).length <= 110, `${b.slug} 第 ${i + 1} 章中文导读超过 110 字`);
      assert.ok(!/[\u4e00-\u9fff]/.test(ch.enIntro), `${b.slug} 第 ${i + 1} 章英文导读里有中文`);
      assert.ok(!seen.has(ch.intro), `${b.slug} 第 ${i + 1} 章导读和别的章重复`);
      seen.add(ch.intro);
      for (const lang of ['zh', 'en']) {
        const html = readFileSync(join(OUT, chapterPath(b, i, lang), 'index.html'), 'utf8');
        // 读经页：经文前面不放导读（用户 2026-11-27）；章导读和书的导读都在「导读」面板里，工具条上有按钮
        const at = html.indexOf('<dialog class="guide"');
        assert.ok(at > html.indexOf('class="verses"'), `${b.slug} 第 ${i + 1} 章 ${lang} 导读面板要排在经文后面`);
        assert.ok(!html.includes('class="ch-intro"') && !html.slice(0, html.indexOf('class="verses"')).includes('id="primer"'), `${b.slug} 第 ${i + 1} 章 ${lang} 经文前面不该有导读`);
        assert.ok(html.slice(at).includes('class="ch-intro-text"') && html.slice(at).includes('id="primer"'), `${b.slug} 第 ${i + 1} 章 ${lang} 面板里缺章导读或书的导读`);
        assert.ok(html.slice(0, at).includes('data-guide'), `${b.slug} 第 ${i + 1} 章 ${lang} 工具条上缺「导读」按钮`);
      }
    });
  }
});

test('字体：全站只引 MiSans（转写另用 Inter），样式里没有别的字体家族', () => {
  build();
  const html = readFileSync(join(OUT, 'index.html'), 'utf8');
  assert.ok(html.includes('misans@5.0.0/lib/Normal/MiSansVF.min.css') && html.includes('MiSansDevanagariVF.min.css'), '页面要引 MiSans 和 MiSans Devanagari');
  assert.ok(!/JetBrains|Noto\+Serif/.test(html), '页面不该再引 JetBrains Mono 或 Noto Serif');
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.ok(!/JetBrains Mono'|Songti|Noto Serif/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), '样式里不该有 MiSans 以外的字体家族（转写用的 Inter 除外）');
});
