// src/favicon.svg -> src/favicon.ico (16/32/48) + apple-touch-icon.png (180) + icon-192.png + icon-512.png。
// 零依赖：用本机 Google Chrome 无界面截图来栅格化，再把 PNG 直接塞进 ICO。
// 产物提交进仓库(CI 不跑这个脚本);改了 favicon.svg 就手动跑一次:node scripts/icons.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SRC = new URL('../src/', import.meta.url).pathname;
const svg = readFileSync(join(SRC, 'favicon.svg'), 'utf8');
// 主屏幕 / Android 图标由系统自己裁圆角，所以用满版方块(背景不留圆角、不透明)。
const squareSvg = svg.replace('rx="8" fill="#1c1917"', 'rx="0" fill="#1c1917"');

const work = mkdtempSync(join(tmpdir(), 'scripture-icons-'));
try {
  const render = (source, size) => {
    const page = join(work, `icon-${size}.html`);
    const out = join(work, `icon-${size}.png`);
    writeFileSync(page, `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`);
    // --screenshot 截完就退出；单独的 user-data-dir,不碰用户自己开着的 Chrome。
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      '--default-background-color=00000000', `--user-data-dir=${join(work, 'profile')}`,
      `--window-size=${size},${size}`, `--screenshot=${out}`, `file://${page}`,
    ], { stdio: 'ignore', timeout: 30000 });
    return readFileSync(out);
  };

  writeFileSync(join(SRC, 'apple-touch-icon.png'), render(squareSvg, 180));
  writeFileSync(join(SRC, 'icon-192.png'), render(squareSvg, 192));
  writeFileSync(join(SRC, 'icon-512.png'), render(squareSvg, 512));

  // ICO:6 字节文件头 + 每张 16 字节目录项 + PNG 原文(Vista 起的 ICO 都认 PNG)。
  const sizes = [16, 32, 48];
  const pngs = sizes.map((size) => render(svg, size));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((size, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(size, at);
    head.writeUInt8(size, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(pngs[i].length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += pngs[i].length;
  });
  writeFileSync(join(SRC, 'favicon.ico'), Buffer.concat([head, ...pngs]));
  console.log('✓ src/favicon.ico、apple-touch-icon.png、icon-192.png、icon-512.png');
} finally {
  rmSync(work, { recursive: true, force: true });
}
