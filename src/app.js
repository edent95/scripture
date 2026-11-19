// 栏目开关：中文版是白话直译 / 古译 / 梵文，英文版是 English / Sanskrit。至少留一栏；选择按语言分别记在本机，读不到就全显示。
(() => {
  const lang = document.body.dataset.lang || 'zh';
  const KEY = `scripture.cols.v3.${lang}`;
  const ALL = ['zh', 'en', 'old', 'sa'];
  const buttons = [...document.querySelectorAll('[data-toggle]')];
  if (!buttons.length) return;
  // 没有古译 / 英译的书页面上没有那颗按钮，只在现有的栏里切换
  const present = buttons.map((b) => b.dataset.toggle);
  let shown = ALL;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(saved) && saved.length && saved.every((c) => ALL.includes(c))) shown = saved;
  } catch {}

  const apply = () => {
    // 记住的选择在这一页一栏都不剩（比如只留了古译、这页没有古译），就全显示
    if (!shown.some((x) => present.includes(x))) shown = ALL;
    for (const c of ALL) document.body.classList.toggle(`hide-${c}`, !shown.includes(c));
    for (const b of buttons) b.setAttribute('aria-pressed', String(shown.includes(b.dataset.toggle)));
  };

  for (const b of buttons) {
    b.addEventListener('click', () => {
      const c = b.dataset.toggle;
      if (shown.includes(c)) {
        if (shown.filter((x) => present.includes(x)).length === 1) return;
        shown = shown.filter((x) => x !== c);
      } else {
        shown = ALL.filter((x) => x === c || shown.includes(x));
      }
      try { localStorage.setItem(KEY, JSON.stringify(shown)); } catch {}
      apply();
    });
  }
  apply();
})();

// 浅色 / 深色：右上角一颗按钮在两者之间切。没选过就跟系统；选了记在本机（<head> 里的小脚本在首屏前就套上，不闪）。
(() => {
  const KEY = 'scripture.theme';
  const root = document.documentElement;
  const btn = document.querySelector('.theme-toggle');
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const current = () => root.dataset.theme || (systemDark.matches ? 'dark' : 'light');
  // 插画 / 纹章的 <picture> 用 media 跟系统走；手动选了主题，就把深色那几条 source 改成跟所选主题走
  const pictures = () => {
    const forced = root.dataset.theme;
    for (const s of document.querySelectorAll('picture source')) {
      const orig = s.dataset.media ?? (s.dataset.media = s.media);
      if (!orig.includes('prefers-color-scheme')) continue;
      s.media = !forced ? orig : forced === 'dark' ? orig.replace('(prefers-color-scheme: dark)', 'all') : 'not all';
    }
    for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
      const orig = m.dataset.media ?? (m.dataset.media = m.media);
      m.media = !forced ? orig : orig.includes(forced) ? 'all' : 'not all';
    }
  };
  const label = () => {
    if (!btn) return;
    const text = current() === 'dark' ? btn.dataset.toLight : btn.dataset.toDark;
    btn.setAttribute('aria-label', text);
    btn.title = text;
  };
  pictures();
  label();
  systemDark.addEventListener?.('change', label);
  btn?.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch {}
    pictures();
    label();
  });
})();

// 阅读进度：章节页上记下读到第几段（一段滚进屏幕上方七成就算读过），记在本机，中英两版共用。
// 首页书卡和章节目录据此标「读完」或「读到一半」。读不到本机存储就什么都不标。
(() => {
  const KEY = 'scripture.progress.v1';
  const lang = document.body.dataset.lang || 'zh';
  const L = lang === 'en'
    ? {
        done: 'Finished',
        chapters: (r, n) => `Reading · ${r} of ${n} chapters done`,
        verses: (r, n) => `Reading · passage ${r} of ${n}`,
        chDone: 'Read',
        chAt: (r, n) => `At ${r} of ${n}`,
      }
    : {
        done: '已读完',
        chapters: (r, n) => `读到一半 · 读完 ${r}/${n} 章`,
        verses: (r, n) => `读到一半 · 第 ${r}/${n} 段`,
        chDone: '读完',
        chAt: (r, n) => `读到 ${r}/${n}`,
      };
  let store;
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} };
  const seen = (book, ch) => store[book]?.[ch] ?? 0;

  // 章节页：记录
  const { book, ch, verses } = document.body.dataset;
  if (book && ch != null) {
    const total = Number(verses);
    const mark = (n) => {
      if (n <= seen(book, ch)) return;
      (store[book] ??= {})[ch] = Math.min(n, total);
      save();
    };
    const items = [...document.querySelectorAll('.verse')];
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) mark(items.indexOf(e.target) + 1);
        },
        { rootMargin: '0px 0px -30% 0px' },
      );
      items.forEach((el) => io.observe(el));
    }
    // 滚到页底，最后几段即使没滚到屏幕上方也算读完
    addEventListener('scroll', () => {
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) mark(total);
    }, { passive: true });
  }

  // 书卡与章节目录：标记
  const badge = (el, text, state) => {
    el.dataset.progress = state;
    let b = el.querySelector('.progress');
    if (!b) {
      b = document.createElement('span');
      b.className = 'progress';
      el.append(b);
    }
    b.textContent = text;
  };
  for (const a of document.querySelectorAll('.book-list a[data-book]')) {
    const counts = a.dataset.verses.split(',').map(Number);
    const read = counts.map((n, i) => Math.min(seen(a.dataset.book, i), n));
    if (!read.some(Boolean)) continue;
    const finished = read.filter((r, i) => r >= counts[i]).length;
    if (finished === counts.length) badge(a, L.done, 'done');
    else if (counts.length === 1) badge(a, L.verses(read[0], counts[0]), 'partial');
    else badge(a, L.chapters(finished, counts.length), 'partial');
  }
  for (const a of document.querySelectorAll('.chapter-list a[data-book]')) {
    const n = Number(a.dataset.verses);
    const r = Math.min(seen(a.dataset.book, a.dataset.ch), n);
    if (!r) continue;
    if (r >= n) badge(a, L.chDone, 'done');
    else {
      badge(a, L.chAt(r, n), 'partial');
      // 没读完的章，点进去直接接着读
      a.href = `${a.pathname}#v${r}`;
    }
  }
})();
