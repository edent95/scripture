// 全站分享图(og:image / twitter:image):src/og-zh.jpg、src/og-en.jpg,1200×630。
// 中文页用中文那张、英文页用英文那张(一版一种语言,图上的字也一样)。
// 画面 = 首页封面墙的「封面」语言:森林绿墨底 + 双线框 + 首页那朵莲花的线稿(scripts/scenes.mjs)+ 站名与几部常搜的经名。
// 零依赖：临时 HTML 交给本机 Google Chrome 无界面截图(--screenshot 截完自己退出，用单独的 user-data-dir),
// 再用 macOS 自带的 sips 转 JPEG。产物提交进仓库(CI 不跑这个脚本);改了画面或书数就手动跑一次:node scripts/og-image.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadBooks } from './content.mjs';
import { COVER_TONES } from './emblems.mjs';
import { coverSceneSvg } from './scenes.mjs';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SRC = new URL('../src/', import.meta.url).pathname;
const W = 1200;
const H = 630;
const tone = COVER_TONES[0]; // 森林绿:首页封面墙第一种墨色
const books = loadBooks().length;

const COPY = {
  zh: {
    lang: 'zh-Hans',
    kicker: `梵文 · 巴利文 · 文言 · 希腊文 · 阿拉伯文 / ${books} 部`,
    title: '经书白话直译',
    names: '心经 · 金刚经 · 道德经 · 薄伽梵歌 · 古兰经',
    line: '逐段对照：白话 · 古代汉译 · 原文',
  },
  en: {
    lang: 'en',
    kicker: `Sanskrit · Pali · Chinese · Greek · Arabic / ${books} classics`,
    title: 'Scriptures, Plainly',
    names: 'Heart Sutra · Bhagavad Gita · Tao Te Ching · Quran',
    line: 'Passage by passage, beside the original',
  },
};

const page = (c) => `<!doctype html>
<html lang="${c.lang}"><meta charset="utf-8">
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${tone.bg}; }
  body { position: relative; color: ${tone.ink}; font-family: 'MiSans VF', 'MiSans', 'MiSans Latin', 'PingFang SC', 'Inter', -apple-system, sans-serif; }
  .frame { position: absolute; inset: 28px; border: 2px solid ${tone.foil}; border-radius: 28px; }
  .frame::after { content: ''; position: absolute; inset: 8px; border: 1px solid rgba(236,229,211,0.28); border-radius: 21px; }
  .art { position: absolute; right: 36px; top: 50%; width: 560px; height: 560px; transform: translateY(-50%); }
  .art svg { width: 100%; height: 100%; display: block; }
  .copy { position: absolute; left: 92px; top: 92px; bottom: 84px; width: 560px; display: flex; flex-direction: column; }
  .kicker { font: 600 22px/1 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.06em; color: ${tone.foil}; margin: 0; }
  h1 { font-size: ${c.lang === 'en' ? 66 : 68}px; white-space: ${c.lang === 'en' ? 'normal' : 'nowrap'}; line-height: 1.12; font-weight: 700; margin: 34px 0 0; letter-spacing: ${c.lang === 'en' ? '-0.01em' : '0.02em'}; }
  .names { font-size: 28px; line-height: 1.5; margin: 30px 0 0; opacity: 0.92; white-space: nowrap; }
  .line { font-size: 23px; line-height: 1.5; margin: 12px 0 0; opacity: 0.72; }
  .foot { margin-top: auto; display: flex; align-items: center; gap: 14px; font: 600 22px/1 'JetBrains Mono', ui-monospace, monospace; color: ${tone.ink}; opacity: 0.85; }
  .mark { width: 40px; height: 40px; }
</style>
<div class="frame"></div>
<div class="art">${coverSceneSvg('lotus', tone)}</div>
<div class="copy">
  <p class="kicker">${c.kicker}</p>
  <h1>${c.title}</h1>
  <p class="names">${c.names}</p>
  <p class="line">${c.line}</p>
  <div class="foot"><svg class="mark" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${tone.ink}"/><g fill="${tone.bg}"><rect x="6" y="8" width="20" height="3.2" rx="1.3"/><rect x="8.6" y="8" width="3.2" height="9.5" rx="1.3"/><rect x="20.2" y="8" width="3.2" height="12.5" rx="1.3"/></g><rect x="14.4" y="8" width="3.2" height="16" rx="1.3" fill="#7bdcb5"/></svg>scripture.eden-tan.com</div>
</div>
</html>`;

const work = mkdtempSync(join(tmpdir(), 'scripture-og-'));
try {
  for (const [lang, c] of Object.entries(COPY)) {
    const html = join(work, `og-${lang}.html`);
    const png = join(work, `og-${lang}.png`);
    const out = join(SRC, `og-${lang}.jpg`);
    writeFileSync(html, page(c));
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      `--user-data-dir=${join(work, 'profile')}`, '--virtual-time-budget=2000',
      `--window-size=${W},${H}`, `--screenshot=${png}`, `file://${html}`,
    ], { stdio: 'ignore', timeout: 30000 });
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', png, '--out', out], { stdio: 'ignore' });
    console.log(`✓ src/og-${lang}.jpg ${Math.round(statSync(out).size / 1024)} KB`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
