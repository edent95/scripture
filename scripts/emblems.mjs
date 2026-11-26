// 曼陀罗花纹章(mandala-emblem 技能):每部经书一枚、首页一枚,构建时用公式生成 SVG。
// 中心一条主曲线定性格(内/外旋轮线、Maurer 玫瑰、玫瑰线),外圈的花瓣、星、珠全按它的旋转对称阶走。
// 公式只生成形状,图里不写字。曲线对是逐张看过对照图挑的;改之前先跑 Mandala.lint。
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SCENE_NAMES, coverSceneSvg, sceneSvg } from './scenes.mjs';

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
  'great-compassion-mantra': ['maurer:11,71', 'hypo:11,4,3', 6], // 千手:十一面
  'medicine-buddha': ['epi:12,1,3', 'hypo:12,5,4', 6], // 十二大愿
  bhadracari: ['rose:10,3', 'epi:5,2,2', 6],
  'middle-way-verses': ['maurer:2,39', 'hypo:9,2,3', 7],
  'thirty-verses': ['hypo:15,4,6', 'epi:5,1,2', 6],
  'twenty-verses': ['hypo:10,3,4', 'epi:5,2,1.4', 6],
  'gateway-to-logic': ['rose:3,1', 'hypo:6,1,2', 7],
  buddhacarita: ['epi:14,3,6', 'hypo:7,2,3', 6],
  'metta-sutta': ['rose:5,1', 'epi:10,3,3', 6],
  'mangala-sutta': ['rose:9,2', 'hypo:9,2,2', 6],
  dhammacakka: ['hypo:8,1,4', 'epi:8,3,2', 6], // 法轮八辐
  satipatthana: ['rose:4,1', 'hypo:8,3,3', 7], // 四念处
  dhammapada: ['maurer:13,73', 'hypo:13,6,4', 6],
  'samkhya-karika': ['hypo:5,2,3', 'epi:5,1,1.6', 7],
  upanishads: ['epi:3,1,2', 'hypo:9,4,4', 6], // 唵的三个音
  'tao-te-ching': ['hypo:9,4,5', 'epi:6,1,1.6', 6], // 九九八十一章
  quran: ['hypo:8,3,5', 'epi:8,1,2', 6], // 八角星
  mark: ['epi:4,1,3', 'hypo:12,5,4', 6], // 四卷福音书;十二个门徒
  matthew: ['hypo:14,3,6', 'epi:7,2,2', 6], // 家谱三个十四代
};

/** 首页分组之间的分隔小章:不属于哪一部书,按这几个名字确定性地派生(每次构建都一样) */
export const DIVIDER_SEEDS = ['group-1', 'group-2', 'group-3', 'group-4', 'group-5'];

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
  // 分隔小章(两节之间,64 格的小图,不动):每部书一枚,和它的大章同一组曲线;首页分组之间的按组序号派生
  const dividers = { ...Object.fromEntries(Object.keys(EMBLEMS).map((k) => [k, specOf(k)])), ...Object.fromEntries(DIVIDER_SEEDS.map((k) => [k, Mandala.specFromSeed(`scripture/${k}`)])) };
  for (const [key, spec] of Object.entries(dividers)) {
    for (const palette of ['light', 'dark']) writeFileSync(join(dir, `${key}-divider-${palette}.svg`), Mandala.dividerSvg(spec, { palette }));
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

// 首页封面墙(xhs-cover-feed 技能)的六种墨色,深浅相间:森林绿、米白、酒红、藏青、浅粉、赭黄。
// 封面是「图片」,不跟浅深色模式变。一本书固定一种(按书的顺序轮),线稿文件 covers/<slug>.svg 按它上色。
export const COVER_TONES = [
  { bg: '#1f3d32', ink: '#ece5d3', foil: '#dcb563' },
  { bg: '#f1ebdd', ink: '#27362f', foil: '#a87624' },
  { bg: '#5a1f2b', ink: '#f2e4d8', foil: '#e2b76d' },
  { bg: '#1c2a4a', ink: '#e8e5db', foil: '#dab868' },
  { bg: '#f3d9d4', ink: '#45222d', foil: '#9c5f22' },
  { bg: '#d9a441', ink: '#2c2010', foil: '#7a2a1c' },
];
export const coverTone = (i) => COVER_TONES[i % COVER_TONES.length];

/** covers/<slug>.svg:keys 的顺序就是书的顺序,决定每本书的墨色 */
export function writeCovers(outDir, keys) {
  const dir = join(outDir, 'covers');
  mkdirSync(dir, { recursive: true });
  keys.forEach((key, i) => writeFileSync(join(dir, `${key}.svg`), coverSceneSvg(key, coverTone(i))));
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

/** 分隔小章:两条细线中间一枚 44px 的小章,跟系统浅深色走;纯装饰 */
export function dividerMark(key, cls = '') {
  return `<div class="emblem-divider${cls ? ` ${cls}` : ''}" aria-hidden="true"><picture><source srcset="/emblems/${key}-divider-dark.svg" media="(prefers-color-scheme: dark)"><img src="/emblems/${key}-divider-light.svg" alt="" width="44" height="44" loading="lazy" decoding="async"></picture></div>`;
}
