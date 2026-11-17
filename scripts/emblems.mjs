// 曼陀罗花纹章(mandala-emblem 技能):每部经书一枚、首页一枚,构建时用公式生成 SVG。
// 中心一条主曲线定性格(内/外旋轮线、Maurer 玫瑰、玫瑰线),外圈的花瓣、星、珠全按它的旋转对称阶走。
// 公式只生成形状,图里不写字。曲线对是逐张看过对照图挑的;改之前先跑 Mandala.lint。
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SCENE_NAMES, sceneSvg } from './scenes.mjs';

const Mandala = createRequire(import.meta.url)('./mandala-core.cjs');

export const EMBLEMS = {
  'heart-sutra': ['maurer:6,59', 'hypo:7,2,2', 6], // 一张弦织成的网:空
  'diamond-sutra': ['hypo:12,5,9', 'epi:4,1,1.2', 7],
  'amitabha-sutra': ['rose:7,2', 'hypo:9,4,3', 6],
  'larger-sukhavati': ['epi:12,5,8', 'hypo:6,1,2', 6],
  'lotus-sutra': ['rose:8,3', 'epi:7,3,2', 6],
  'vimalakirti-sutra': ['rose:3,4', 'hypo:7,2,2', 6],
  'lankavatara-sutra': ['maurer:5,61', 'hypo:8,3,2', 6],
  'bhagavad-gita': ['epi:9,2,6', 'hypo:7,3,2', 6],
  'yoga-sutras': ['hypo:7,4,5', 'epi:6,1,2', 7],
};

const specOf = (key) => {
  const [p, f, copies] = EMBLEMS[key];
  return { primary: Mandala.parseCurve(p), family: Mandala.parseCurve(f), copies };
};

export const lintEmblems = () =>
  Object.keys(EMBLEMS).flatMap((k) => Mandala.lint(specOf(k)).map((m) => `${k}: ${m}`));

/** 写出 emblems/<key>-<light|dark>[-still].svg:会动的给大图,静止的给小图与「减少动效」 */
export function writeEmblems(outDir) {
  const dir = join(outDir, 'emblems');
  mkdirSync(dir, { recursive: true });
  for (const key of Object.keys(EMBLEMS)) {
    for (const palette of ['light', 'dark']) {
      for (const animate of [true, false]) {
        const svg = Mandala.mandalaSvg(specOf(key), { palette, animate });
        writeFileSync(join(dir, `${key}-${palette}${animate ? '' : '-still'}.svg`), svg);
      }
    }
  }
  // 主题插画(scripts/scenes.mjs):首页莲花 + 每部经书一张,和纹章同一套颜色与文件命名
  const sdir = join(outDir, 'scenes');
  mkdirSync(sdir, { recursive: true });
  for (const name of SCENE_NAMES) {
    for (const palette of ['light', 'dark']) {
      for (const animate of [true, false]) {
        writeFileSync(join(sdir, `${name}-${palette}${animate ? '' : '-still'}.svg`), sceneSvg(name, { palette, animate }));
      }
    }
  }
}

/** 跟系统浅深色与「减少动效」走的 <picture>;still = 一律静止(小图) */
export function emblemPicture(key, cls, { still = false, size = 380, kind = 'emblems' } = {}) {
  const src = (p, s) => `/${kind}/${key}-${p}${s ? '-still' : ''}.svg`;
  const sources = still
    ? [`<source srcset="${src('dark', true)}" media="(prefers-color-scheme: dark)">`]
    : [
        `<source srcset="${src('dark', true)}" media="(prefers-color-scheme: dark) and (prefers-reduced-motion: reduce)">`,
        `<source srcset="${src('light', true)}" media="(prefers-reduced-motion: reduce)">`,
        `<source srcset="${src('dark', false)}" media="(prefers-color-scheme: dark)">`,
      ];
  return `<picture class="${cls}" aria-hidden="true">${sources.join('')}<img src="${src('light', still)}" alt="" width="${size}" height="${size}" loading="${still ? 'lazy' : 'eager'}" decoding="async"></picture>`;
}
