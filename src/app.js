// 栏目开关：白话直译 / English / 古译 / 梵文。至少留一栏；选择记在本机，读不到就全显示。
(() => {
  const KEY = 'scripture.cols.v3'; // v3 加了 English 栏，旧的选择不沿用，免得新栏默认被藏
  const ALL = ['zh', 'en', 'old', 'sa'];
  const buttons = [...document.querySelectorAll('[data-toggle]')];
  if (!buttons.length) return;
  // 没有古译的书（如瑜伽经部分章节）页面上没有那颗按钮，只在现有的栏里切换
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
