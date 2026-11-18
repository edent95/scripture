// 栏目开关：白话直译 / English / 古译 / 梵文。至少留一栏；选择按语言分别记在本机，读不到就用这一页的默认。
// 中文版默认全显示；英文版（body[data-default-cols]）默认只显示英文和梵文，中文栏点开才看。
(() => {
  const lang = document.body.dataset.lang || 'zh';
  const KEY = `scripture.cols.v3.${lang}`;
  const ALL = ['zh', 'en', 'old', 'sa'];
  const buttons = [...document.querySelectorAll('[data-toggle]')];
  if (!buttons.length) return;
  // 没有古译 / 英译的书页面上没有那颗按钮，只在现有的栏里切换
  const present = buttons.map((b) => b.dataset.toggle);
  const defaults = (document.body.dataset.defaultCols || ALL.join(' ')).split(' ');

  let shown = defaults;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(saved) && saved.length && saved.every((c) => ALL.includes(c))) shown = saved;
  } catch {}

  const apply = () => {
    // 记住的选择在这一页一栏都不剩（比如只留了古译、这页没有古译），就回到默认，默认也不剩就全显示
    if (!shown.some((x) => present.includes(x))) shown = defaults.some((x) => present.includes(x)) ? defaults : ALL;
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
