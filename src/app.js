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

// 页头实际多高就让栏目开关贴在多高（窄屏上页头可能比 64px 高，写死会被页头盖住一截）
(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const set = () => document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
  set();
  if ('ResizeObserver' in window) new ResizeObserver(set).observe(header);
  else addEventListener('resize', set);
})();

// 阅读进度，都记在本机、中英两版共用，读不到本机存储就什么都不标：
// - scripture.progress.v1 { 书: { 章: 读到过的最远一段 } }：一段滚进屏幕上方七成就算读过，用来判断「读完」「读到一半」。
// - scripture.last.v1 { 书: { ch, v, t } }：这本书上次停在哪一章哪一段（屏幕最上面那一段）和时间，用来「回到上次读的地方」。
// 首页：最近在读的那本出一颗「继续读」按钮；在读的书卡搬到最上面的「在读」，读完的搬到最下面的「读完了」，没读过的留在原处。
(() => {
  const KEY = 'scripture.progress.v1';
  const LAST = 'scripture.last.v1';
  const lang = document.body.dataset.lang || 'zh';
  const L = lang === 'en'
    ? {
        done: 'Finished',
        chapters: (r, n) => `Reading · ${r} of ${n} chapters done`,
        verses: (r, n) => `Reading · passage ${r} of ${n}`,
        chDone: 'Read',
        chAt: (r, n) => `At ${r} of ${n}`,
        resume: 'Continue reading',
        chapter: (c) => `Chapter ${c}`,
        at: (v, n) => `passage ${v} of ${n}`,
      }
    : {
        done: '已读完',
        chapters: (r, n) => `读到一半 · 读完 ${r}/${n} 章`,
        verses: (r, n) => `读到一半 · 第 ${r}/${n} 段`,
        chDone: '读完',
        chAt: (r, n) => `读到 ${r}/${n}`,
        resume: '继续读',
        chapter: (c) => `第 ${c} 章`,
        at: (v, n) => `第 ${v}/${n} 段`,
      };
  let store;
  let last;
  try {
    store = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    last = JSON.parse(localStorage.getItem(LAST) || '{}') || {};
  } catch { return; }
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

    // 上次停在哪：贴在顶上的页头与栏目开关下面，第一段还露着的经文
    const bar = document.querySelector('.col-toggle') || document.querySelector('.site-header');
    const here = () => {
      const line = (bar?.getBoundingClientRect().bottom ?? 0) + 8;
      let lo = 0;
      let hi = items.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (items[mid].getBoundingClientRect().bottom > line) hi = mid;
        else lo = mid + 1;
      }
      return lo + 1;
    };
    const remember = () => {
      if (!items.length) return;
      last[book] = { ch: Number(ch), v: here(), t: Date.now() };
      try { localStorage.setItem(LAST, JSON.stringify(last)); } catch {}
    };
    // 只是点开看一眼不算：滚动了、带着 #v 段号进来、或停留满 8 秒才记
    let timer = 0;
    addEventListener('scroll', () => {
      if (timer) return;
      timer = setTimeout(() => { timer = 0; remember(); }, 300);
    }, { passive: true });
    if (/^#v\d+$/.test(location.hash)) setTimeout(remember, 600);
    setTimeout(() => { if (!document.hidden) remember(); }, 8000);
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
  // 这本书该回到哪：有记录用记录；只有旧的进度数据（没记过停在哪）就取读到一半的那一章，没有就取读完的章后面那一章的开头
  const position = (slug, counts, read) => {
    const p = last[slug];
    if (p && Number.isInteger(p.ch) && p.ch >= 0 && p.ch < counts.length) {
      return { ch: p.ch, v: Math.max(1, Math.min(Number(p.v) || 1, counts[p.ch])), t: Number(p.t) || 0 };
    }
    let at = -1;
    read.forEach((r, i) => { if (r > 0 && r < counts[i]) at = i; });
    if (at >= 0) return { ch: at, v: read[at], t: 0 };
    at = read.findIndex((r, i) => r < counts[i]);
    return { ch: Math.max(at, 0), v: 1, t: 0 };
  };
  const reading = [];
  const finishedCards = [];
  for (const a of document.querySelectorAll('.book-list a[data-book]')) {
    const counts = a.dataset.verses.split(',').map(Number);
    const read = counts.map((n, i) => Math.min(seen(a.dataset.book, i), n));
    if (!read.some(Boolean)) continue;
    const finished = read.filter((r, i) => r >= counts[i]).length;
    if (finished === counts.length) {
      badge(a, L.done, 'done');
      finishedCards.push(a);
      continue;
    }
    const pos = position(a.dataset.book, counts, read);
    const multi = counts.length > 1;
    // 没读完的书，点书卡直接回到上次那一段
    const href = `${a.getAttribute('href')}${multi ? `${pos.ch + 1}/` : ''}${pos.v > 1 ? `#v${pos.v}` : ''}`;
    a.href = href;
    if (multi) badge(a, L.chapters(finished, counts.length), 'partial');
    else badge(a, L.verses(read[0], counts[0]), 'partial');
    const where = [a.querySelector('strong')?.textContent.trim(), multi ? L.chapter(pos.ch + 1) : '', L.at(pos.v, counts[pos.ch])].filter(Boolean).join(' · ');
    reading.push({ a, href, where, t: pos.t });
  }
  // 最近读的排最前（稳定排序：没有时间的保持页面顺序）
  reading.sort((x, y) => y.t - x.t);

  const resume = document.querySelector('[data-resume]');
  if (resume && reading.length) {
    const label = document.createElement('span');
    label.className = 'resume-label';
    label.textContent = L.resume;
    const where = document.createElement('span');
    where.className = 'resume-where';
    where.textContent = reading[0].where;
    resume.replaceChildren(label, where);
    resume.href = reading[0].href;
    resume.hidden = false;
  }

  // 书架：在读的搬到最上面，读完的搬到最下面；搬空的组藏起来，剩下的重新编号
  const shelve = (key, cards) => {
    const section = document.querySelector(`[data-shelf="${key}"]`);
    if (!section || !cards.length) return;
    section.querySelector('.book-list').append(...cards.map((a) => a.closest('li')));
    section.hidden = false;
  };
  shelve('reading', reading.map((r) => r.a));
  shelve('done', finishedCards);
  if (document.querySelector('[data-shelf]')) {
    let n = 0;
    for (const section of document.querySelectorAll('.tradition')) {
      if (!section.querySelector('.book-list li')) section.hidden = true;
      if (section.hidden) continue;
      const kicker = section.querySelector('.kicker');
      if (kicker) kicker.textContent = String(++n).padStart(2, '0');
    }
  }

  for (const a of document.querySelectorAll('.chapter-list a[data-book]')) {
    const n = Number(a.dataset.verses);
    const r = Math.min(seen(a.dataset.book, a.dataset.ch), n);
    if (!r) continue;
    if (r >= n) badge(a, L.chDone, 'done');
    else {
      badge(a, L.chAt(r, n), 'partial');
      // 没读完的章，点进去直接接着读：这一章就是上次停下的那章，回到停下的那段，否则回到读到过的最远一段
      const p = last[a.dataset.book];
      const v = p && p.ch === Number(a.dataset.ch) ? Math.max(1, Math.min(Number(p.v) || 1, n)) : r;
      a.href = `${a.pathname}${v > 1 ? `#v${v}` : ''}`;
    }
  }
})();
