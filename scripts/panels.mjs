// 「一图看懂」:一章一张大图。一章提炼成二到四个重点,每个重点是一个物件(母题),
// 全部站在同一条地平线上、同一片夜空下,一条金色的路从第一个走到最后一个 —— 顺着路看,就是这一章讲的事。
// 连贯性靠两样:全套共用同一个世界(天、地、路、画框),全套共用同一批母题(秤永远是审判,园子永远是乐园,火永远是火狱……)。
// 规矩(engraved-scenes 技能):不画人、不画人的剪影;动物也不画,只画它留下的痕迹(尘土、飞鸟的 V 形);图里不写字,
// 第几个重点用路上的小点数表示(一点、两点、三点、四点),文字说明由页面写在图下面。
// 画法:内联 SVG;颜色全走 CSS 类(.pi 墨线 / .pf 淡线 / .pg 金线),浅深色自动跟着变;
// 动作只用 CSS 的 transform / opacity(类名 pa-*),「减少动效」时在 styles.css 里一律停掉。
const f = (v) => (Math.abs(v) < 0.005 ? '0' : Number(v.toFixed(2)).toString());
const range = (n) => Array.from({ length: n }, (_, i) => i);
const polar = (r, deg, cx = 0, cy = 0) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
const p = (cls, d, extra = '') => `<path class="${cls}" d="${d}"${extra}/>`;
const I = (d, extra) => p('pi', d, extra); // 墨线:物件的轮廓
const F = (d, extra) => p('pf', d, extra); // 淡线:排线、陪衬
const G = (d, extra) => p('pg', d, extra); // 金线:这一格的重点
const circle = (cls, cx, cy, r, extra = '') => `<circle class="${cls}" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"${extra}/>`;
const dot = (cls, cx, cy, r) => circle(cls, cx, cy, r, ' fill="currentColor"');
const g = (cls, body, extra = '') => `<g class="${cls}"${extra}>${body}</g>`;

// 每个母题画在自己的小坐标里:x、y 都是 -46…46,地平线在 y = GY,地平线以下是近处的地面
const GY = 22;
const raysD = (cx, cy, r0, r1, n, from = 0, sweep = 360) =>
  range(n).map((i) => {
    const a = from + (sweep * i) / (sweep === 360 ? n : n - 1);
    return `M${polar(r0, a, cx, cy).map(f).join(' ')}L${polar(r1, a, cx, cy).map(f).join(' ')}`;
  }).join('');
const rays = (cls, ...a) => p(cls, raysD(...a));
/** 四角星:光、启示、指引 */
const star = (cx, cy, r, cls = 'pg') =>
  p(cls, `M${f(cx)} ${f(cy - r)}Q${f(cx)} ${f(cy)} ${f(cx + r)} ${f(cy)}Q${f(cx)} ${f(cy)} ${f(cx)} ${f(cy + r)}Q${f(cx)} ${f(cy)} ${f(cx - r)} ${f(cy)}Q${f(cx)} ${f(cy)} ${f(cx)} ${f(cy - r)}Z`);
/** 火焰:底在 (x,y),高 h */
const flame = (x, y, h, cls = 'pg') =>
  p(cls, `M${f(x)} ${f(y)}C${f(x + h * 0.3)} ${f(y - h * 0.2)} ${f(x + h * 0.24)} ${f(y - h * 0.6)} ${f(x)} ${f(y - h)}C${f(x - h * 0.24)} ${f(y - h * 0.6)} ${f(x - h * 0.3)} ${f(y - h * 0.2)} ${f(x)} ${f(y)}Z`);
/** 油灯:灯碗放在 (x, GY) 的地面上 */
const lampBowl = (x) => I(`M${x - 14} ${GY - 10}Q${x} ${GY + 6} ${x + 14} ${GY - 10}ZM${x - 5} ${GY}H${x + 5}M${x + 14} ${GY - 10}l6 -3`);
/** 一棵树:树干底在 (x, GY) */
const tree = (x, h, r) => I(`M${x} ${GY}V${f(GY - h)}`) + circle('pi', x, GY - h - r * 0.6, r) + F(`M${f(x - r * 0.5)} ${f(GY - h - r * 0.6)}h${f(r)}M${f(x - r * 0.3)} ${f(GY - h - r * 1.05)}h${f(r * 0.6)}M${f(x - r * 0.3)} ${f(GY - h - r * 0.15)}h${f(r * 0.6)}`);
/** 月相:亮的一侧用金线画 */
const moon = (x, y, r, k) =>
  circle('pf', x, y, r) + (k === 0 ? '' : k >= 1 ? circle('pg', x, y, r) : G(`M${x} ${y - r}A${r} ${r} 0 0 1 ${x} ${y + r}A${f(r * (1 - 2 * k))} ${r} 0 0 ${k > 0.5 ? 1 : 0} ${x} ${y - r}Z`));

/** 秤:审判。speck = 两个盘里各放一粒小点(再小的事也上秤);tilt = 一头沉(缺斤短两) */
function scale({ tilt = 0, speck = false } = {}) {
  const dy = tilt * 6;
  const pan = (x, y) => I(`M${x - 11} ${f(y)}Q${x} ${f(y + 9)} ${x + 11} ${f(y)}Z`) + F(`M${x - 9} ${f(y - 14)}L${x - 11} ${f(y)}M${x + 9} ${f(y - 14)}L${x + 11} ${f(y)}`) + (speck ? dot('pg pa-pulse', x, y + 2.5, 1.3) : '');
  return I(`M0 -30V${GY}M-9 ${GY}H9`) + G(`M-26 ${f(-24 - dy)}L26 ${f(-24 + dy)}`) + pan(-26, -10 - dy) + pan(26, -10 + dy) + circle('pg', 0, -30, 2.4);
}

const ICONS = {
  /** 太阳照着整个世界:照管万物的主 */
  sunworld: () => I(`M-44 ${GY + 16}Q0 ${GY - 22} 44 ${GY + 16}`) + F(`M-36 ${GY + 16}Q0 ${GY - 10} 36 ${GY + 16}`) + g('pa-pulse', rays('pg', 0, -18, 13, 24, 16)) + circle('pg', 0, -18, 8.5) + circle('pg', 0, -18, 4),
  /** 秤:审判那一天 */
  scale: () => scale(),
  /** 一粒灰尘也上秤 */
  speck: () => scale({ speck: true }),
  /** 一头沉的秤:缺斤短两 */
  cheat: () => scale({ tilt: 1 }),
  /** 拱门里一盏灯:只拜他、只求他(礼拜的方向,不画人) */
  archlamp: () => I(`M-22 ${GY}V-8Q-22 -30 0 -40Q22 -30 22 -8V${GY}`) + F(`M-16 ${GY}V-8Q-16 -25 0 -33Q16 -25 16 -8V${GY}M0 -33V-16`) + G('M-5 -16H5L3.5 -6H-3.5Z') + g('pa-pulse', rays('pg', 0, -11, 9, 14, 9, 20, 140)),
  /** 三条路:中间一条笔直通向星,两边的拐走、断掉 */
  paths: () => G(`M-5 46L-1 ${GY}M5 46L1 ${GY}`) + F(`M-16 46Q-14 34 -34 28M-26 46Q-28 38 -44 34M16 46Q14 34 34 28M26 46Q28 38 44 34`, ' stroke-dasharray="2.5 2.5"') + g('pa-pulse', star(0, -8, 10)) + rays('pf', 0, -8, 13, 21, 8, 22.5),
  /** 两条各走各的路 */
  fork: () => I(`M-6 46Q-8 32 -26 ${GY}M-14 46Q-18 34 -34 ${GY}`) + G(`M6 46Q8 32 26 ${GY}M14 46Q18 34 34 ${GY}`) + circle('pi', -30, 2, 6) + star(30, 2, 8) + F(`M0 46V-30`, ' stroke-dasharray="1.5 3"'),
  /** 地震:地面裂开一道缝,震波一圈圈散开 */
  quake: () => I(`M-46 ${GY}H-12L-7 ${GY + 7}L-2 ${GY - 5}L4 ${GY + 9}L9 ${GY - 3}L13 ${GY}H46`) + F(`M-2 ${GY - 5}L-4 ${GY + 20}M4 ${GY + 9}L6 ${GY + 24}`) + g('pa-pulse', [14, 23, 32].map((r) => G(`M${polar(r, 205, 0, GY).map(f).join(' ')}A${r} ${r} 0 0 1 ${polar(r, 335, 0, GY).map(f).join(' ')}`)).join('')) + I('M-30 -2l3 -7l3 7M26 -6l3 -7l3 7'),
  /** 大地打开,埋着的东西升上来 */
  unearth: () => I(`M-46 ${GY}H-14L-9 ${GY + 20}M46 ${GY}H14L9 ${GY + 20}M-14 ${GY}L-20 ${GY - 6}M14 ${GY}L20 ${GY - 6}`) + g('pa-rise', [[0, 8, 2.2], [-6, -4, 1.6], [6, -9, 1.8], [-2, -20, 1.4], [4, -30, 1.2]].map(([x, y, r]) => dot('pg', x, y, r)).join('')) + F('M0 14V-36M-7 10L-12 -28M7 10L12 -28', ' stroke-dasharray="1.5 3"'),
  /** 人们一群群来:只画一串串点,汇向一道门 */
  gather: () => I(`M-9 ${GY}V0Q-9 -12 0 -16Q9 -12 9 0V${GY}`) + star(0, -26, 5) + g('pa-pulse', [[-40, 40], [-24, 44], [24, 44], [40, 40], [0, 46]].map(([x, y]) => G(`M${x} ${y}L${f(x * 0.18)} ${GY + 3}`, ' stroke-dasharray="0.1 4.2" stroke-width="2.2"')).join('')),
  /** 日出,另一边一弯淡淡的月 */
  sunrise: () => g('pa-rise', G(`M-13 ${GY}A13 13 0 0 1 13 ${GY}`) + rays('pg', 0, GY, 17, 27, 9, 200, 140)) + F('M30 -30A9 9 0 1 0 38 -16A7 7 0 1 1 30 -30Z'),
  /** 帐篷里亮着灯:有地方安身 */
  tent: () => I(`M-30 ${GY}L0 -22L30 ${GY}M0 -22V-30M-7 ${GY}L0 2L7 ${GY}`) + F(`M-20 ${GY}L0 -14L20 ${GY}`) + g('pa-pulse', dot('pg', 0, 14, 2.6) + rays('pg', 0, 14, 5, 8, 6, 200, 140)) + star(24, -30, 4),
  /** 一条弯路通向一颗星:有了指引 */
  roadstar: () => I(`M-12 46C-10 36 14 38 8 30C4 25 -4 26 -1 ${GY}M4 46C6 40 26 40 16 30C10 24 2 26 1 ${GY}`) + g('pa-pulse', star(0, -8, 10)) + rays('pf', 0, -8, 13, 21, 8, 22.5),
  /** 半开的门,光铺在地上,门口一只盛满的碗:接纳孤儿和来求助的人 */
  opendoor: () => I(`M-14 ${GY}V-30H14V${GY}M-14 -30L2 -24V${GY + 4}L-14 ${GY}`) + p('pg pa-pulse', `M2 ${GY + 4}L14 ${GY}L34 ${GY + 16}H10Z`) + G(`M18 ${GY + 8}Q24 ${GY + 15} 30 ${GY + 8}ZM20 ${GY + 8}Q24 ${GY + 3} 28 ${GY + 8}`),
  /** 关着的门,门外靠着一根手杖:来求助的人被挡在外面 */
  closeddoor: () => I(`M-16 ${GY}V-30H12V${GY}M-2 -30V${GY}`) + F(`M-12 -24h6v40h-6zM2 -24h6v40h-6z`) + G(`M28 ${GY}L23 -12q-1 -7 5 -7`) + dot('pg', 28, GY, 1.2),
  /** 号角:一吹响,人人复活 */
  trumpet: () => I(`M-32 0L4 -12Q11 2 4 16L-32 6ZM-14 6V${GY}M-20 ${GY}h12`) + I('M4 -12Q-2 2 4 16') + g('pa-pulse', [10, 18, 26].map((r) => G(`M${polar(r, -42, 6, 2).map(f).join(' ')}A${r} ${r} 0 0 1 ${polar(r, 42, 6, 2).map(f).join(' ')}`)).join('')),
  /** 火:火狱 */
  fire: () => I(`M-26 ${GY}Q0 ${GY + 20} 26 ${GY}`) + F(`M-18 ${GY + 5}Q0 ${GY + 16} 18 ${GY + 5}`) + g('pa-pulse', flame(-14, GY, 22) + flame(13, GY, 26) + flame(0, GY, 38) + flame(0, GY - 4, 18)),
  /** 园子:树下有河流过 —— 乐园 */
  garden: () => tree(-18, 12, 10) + tree(12, 16, 13) + I(`M-36 ${GY}v-5m0 1q-4 -1 -5 -5m5 4q4 -1 5 -5M34 ${GY}v-5m0 1q-4 -1 -5 -5m5 4q4 -1 5 -5`) + g('pa-pulse', G(`M-42 ${GY + 9}q7 -5 14 0t14 0t14 0t14 0t14 0t14 0M-42 ${GY + 16}q7 -5 14 0t14 0t14 0t14 0t14 0t14 0`)),
  /** 一边是火,一边是园子:两种结局 */
  ends: () => g('pa-pulse', flame(-30, GY, 18) + flame(-20, GY, 26) + flame(-10, GY, 16)) + I(`M-38 ${GY}Q-20 ${GY + 12} -4 ${GY}`) + tree(22, 14, 12) + G(`M6 ${GY + 10}q6 -4 12 0t12 0t12 0`) + F(`M0 46V-40`, ' stroke-dasharray="1.5 3"'),
  /** 打开的册子:经文,也是每个人的行为记录 */
  book: () => I(`M0 -8Q-14 -16 -30 -10V12Q-14 6 0 14Q14 6 30 12V-10Q14 -16 0 -8ZM0 -8V14`) + F(`M-24 -4q9 -3 18 1M-24 2q9 -3 18 1M24 -4q-9 -3 -18 1M24 2q-9 -3 -18 1`) + I(`M-8 ${GY}L0 14L8 ${GY}`) + g('pa-pulse', star(0, -28, 7)),
  /** 笔和写下的字迹:用笔学知识 */
  pen: () => I(`M-16 14L18 -28l7 6L-9 20l-11 4z`) + F('M12 -22l7 6') + G(`M-34 ${GY + 10}q5 -6 10 0t10 0t10 0t10 0t10 0t10 0M-34 ${GY + 17}q5 -6 10 0t10 0t10 0t10 0`),
  /** 群山 */
  mountains: () => I(`M-44 ${GY}L-18 -18L-5 4L10 -30L42 ${GY}`) + F(`M-18 -18l5 ${GY + 18}M10 -30l7 ${GY + 30}M-28 -2l-4 ${GY + 2}M22 -10l10 ${GY + 10}`) + G('M4 -20L10 -30L17 -18L13 -21L10 -17L7 -21Z'),
  /** 云、雨、发芽:雨水和粮食 */
  rain: () => I('M-26 -18a8 8 0 0 1 11 -9a12 12 0 0 1 23 -1a9 9 0 0 1 14 10Z') + g('pa-rise', F('M-16 -12l-3 12M-6 -12l-3 14M4 -12l-3 12M14 -12l-3 14', ' stroke-dasharray="3 3"')) + G([-22, -2, 18].map((x) => `M${x} ${GY}v-9m0 2q-5 -1 -6 -7m6 5q5 -1 6 -7`).join('')),
  /** 一滴:人是一滴液体造的 */
  drop: () => g('pa-rise', G('M0 -34C9 -18 13 -11 13 -4A13 13 0 0 1 -13 -4C-13 -11 -9 -18 0 -34Z') + F('M-6 -4a6 6 0 0 0 6 6')) + F(`M-16 ${GY + 8}a16 5 0 0 0 32 0M-26 ${GY + 12}a26 8 0 0 0 52 0`),
  /** 青草和枯草:今生很短 */
  grass: () => G([-34, -26, -18].map((x, i) => `M${x} ${GY}q-3 -10 -1 -${16 + i * 3}M${x} ${GY}q3 -8 6 -${12 + i * 2}M${x} ${GY}q-5 -6 -8 -${11 + i}`).join('')) + F([14, 24, 34].map((x) => `M${x} ${GY}q2 -12 9 -11M${x} ${GY}q-1 -9 -8 -8M${x} ${GY}q3 -5 10 -3`).join('')) + F('M-8 4h10m-4 -4l4 4l-4 4'),
  /** 倒下的王冠,水漫过来:自称是主的法老 */
  crown: () => g('', I('M-14 0L-18 -17L-8 -8L0 -21L8 -8L18 -17L14 0Z') + F('M-13 -4H13'), ` transform="translate(-4 ${GY - 3}) rotate(24)"`) + g('pa-pulse', G(`M-44 ${GY - 6}q7 -6 14 0t14 0M2 ${GY - 6}q7 -6 14 0t14 0t14 0M-44 ${GY + 8}q7 -6 14 0t14 0t14 0t14 0t14 0t14 0`)),
  /** 断柱:再强大的民族也被毁灭 */
  pillars: () => I(`M-34 ${GY}V-24h9V${GY}M-37 -24h15M-37 -28h15M-10 ${GY}V-4l3 -4l3 5l3 -6V${GY}M12 ${GY - 7}h28v7h-28z`) + F(`M-31 -22V${GY}M-28 -22V${GY}M-6 0V${GY}M18 ${GY - 7}v7M24 ${GY - 7}v7M30 ${GY - 7}v7`) + G('M-10 -14l-3 -6M-2 -16l2 -7M6 -12l5 -5'),
  /** 几摞钱 */
  coins: () => G([[-22, 3], [0, 6], [22, 2]].map(([x, n]) => range(n).map((k) => `M${x - 10} ${GY - 3 - k * 5}a10 3.2 0 0 0 20 0a10 3.2 0 0 0 -20 0M${x - 10} ${GY - 3 - k * 5}v3a10 3.2 0 0 0 20 0v-3`).join('')).join('')) + g('pa-pulse', star(14, -20, 4)),
  /** 一只盛满的碗:给人饭吃、帮助穷人 */
  bowl: () => I(`M-20 6Q0 32 20 6ZM-8 ${GY}h16`) + G('M-14 6Q0 -10 14 6') + g('pa-rise', F('M-6 -12q4 -5 0 -10q-4 -5 0 -10M6 -12q4 -5 0 -10q-4 -5 0 -10')),
  /** 天房:麦加 */
  kaaba: () => I(`M-18 ${GY}V-14L2 -20L22 -14V${GY}M-18 -14L2 -8L22 -14M2 -8V${GY}`) + G(`M-18 -6L2 0L22 -6M7 ${GY}v-12l7 -2V${GY - 1}`),
  /** 陡坡和坡顶的星:难走却该走的上坡路 */
  steep: () => I(`M-44 ${GY}L28 -28V${GY}`) + F(`M-20 ${GY}V5M-2 ${GY}V-8M14 ${GY}V-19`) + G('M-34 14l10 -1l-2 -8l12 -1l-2 -9l12 -1l-2 -9l12 -2', ' stroke-dasharray="2 2.5"') + g('pa-pulse', star(28, -38, 6)),
  /** 断开的锁链:放奴隶自由 */
  chain: () => I('M-40 6a8 5 0 1 0 16 0a8 5 0 1 0 -16 0M-27 6a8 5 0 1 0 16 0M40 6a8 5 0 1 1 -16 0a8 5 0 1 1 16 0M27 6a8 5 0 1 1 -16 0') + g('pa-pulse', rays('pg', 0, 6, 5, 13, 8, 22.5)),
  /** 太阳、月亮和它们走的弧线:白天与黑夜 */
  sunmoon: () => circle('pg', -24, -14, 7) + g('pa-pulse', rays('pg', -24, -14, 10, 16, 12)) + I('M22 -24A9 9 0 1 0 31 -8A7 7 0 1 1 22 -24Z') + F(`M-44 ${GY}Q0 -62 44 ${GY}`, ' stroke-dasharray="1.5 3"'),
  /** 点着的灯:干净的灵魂、守住的心 */
  lamp: () => lampBowl(0) + g('pa-pulse', flame(18, GY - 14, 16) + rays('pg', 18, GY - 24, 12, 18, 9, 200, 140)),
  /** 熄了的灯,只剩一缕烟:糟蹋掉的灵魂、做样子的礼拜 */
  lampout: () => g('', lampBowl(0), ` transform="rotate(14 0 ${GY})"`) + F(`M20 ${GY - 14}q5 -6 0 -12q-5 -6 0 -12q5 -6 0 -12`),
  /** 包袱被提起来:卸下重担 */
  burden: () => g('pa-rise', I('M-12 -6Q-18 -24 0 -27Q18 -24 12 -6ZM-5 -27q5 -6 10 0')) + G('M-26 -4v-16m-4 4l4 -4l4 4M26 -4v-16m-4 4l4 -4l4 4') + I(`M-22 ${GY}Q0 6 22 ${GY}`),
  /** 无花果与橄榄枝,后面一座山 */
  figolive: () => F(`M6 ${GY}L26 -16L44 ${GY}`) + I(`M-34 ${GY}Q-22 -6 -4 -24`) + F('M-28 10q-8 -2 -9 -9q8 1 9 9M-20 -1q-8 -2 -9 -9q8 1 9 9M-22 6q8 0 11 -6q-8 -1 -11 6M-13 -8q8 0 11 -6q-8 -1 -11 6') + G('M-4 -24C4 -22 6 -12 0 -8C-6 -12 -8 -20 -4 -24Z') + dot('pg', -16, 12, 2) + dot('pg', -9, 2, 2),
  /** 一颗很亮的星 */
  nightstar: () => g('pa-pulse', star(0, -12, 15)) + rays('pf', 0, -12, 19, 30, 12, 15) + F('M30 -34A6 6 0 1 0 35 -24A5 5 0 1 1 30 -34Z'),
  /** 星座:布满星的天 */
  stars: () => F('M-32 -6L-14 -26L4 -14L22 -30L34 -8M4 -14L-2 6') + [[-32, -6, 4], [-14, -26, 5], [4, -14, 6], [22, -30, 4.5], [34, -8, 4], [-2, 6, 3.5]].map(([x, y, r], i) => g(i % 2 ? 'pa-pulse' : '', star(x, y, r))).join(''),
  /** 星星坠落,太阳被卷起来 */
  starfall: () => circle('pi', -22, -20, 9) + F('M-31 -20q9 -7 18 0M-30 -15q8 -6 16 0M-29 -25q7 -5 14 0') + g('pa-rise', [[6, -30], [22, -14], [34, -34], [14, 2]].map(([x, y]) => star(x, y, 4) + F(`M${x + 3} ${y - 5}l8 -12`)).join('')),
  /** 天裂开 */
  skysplit: () => I('M-44 -4Q-22 -44 -5 -44M44 -4Q22 -44 5 -44') + g('pa-pulse', G('M-5 -44L3 -32L-4 -22L5 -10L0 2M5 -44L9 -34')) + F('M-30 -8Q-18 -30 -8 -34M30 -8Q18 -30 10 -34') + I('M-14 4l4 -6l4 6zM10 10l3 -5l3 5z'),
  /** 月亮从缺到圆:一段一段地经历 */
  phases: () => [0, 0.25, 0.5, 0.75, 1].map((k, i) => moon(-36 + i * 18, -12, 6.5, k)).join('') + F('M-40 4H40m-5 -4l5 4l-5 4'),
  /** 星光一道道降下来 */
  descend: () => g('pa-rise', [[-28, -30], [-12, -36], [4, -28], [20, -36], [34, -30]].map(([x, y]) => star(x, y, 3.5)).join('')) + F([[-28, -24], [-12, -30], [4, -22], [20, -30], [34, -24]].map(([x, y]) => `M${x} ${y}V${GY - 4}`).join(''), ' stroke-dasharray="1.5 3.5"') + G(`M-34 ${GY - 4}H40`),
  /** 封了口的杯子:乐园里的款待 */
  cup: () => I(`M-11 -20H11Q11 -2 0 0Q-11 -2 -11 -20ZM0 0V${GY - 4}M-9 ${GY}h18l-3 -4h-12z`) + G('M-11 -20Q0 -27 11 -20') + g('pa-pulse', star(20, -28, 5)),
  /** 沙漏:时间在流走 */
  hourglass: () => I(`M-14 -30H14M-14 ${GY}H14M-11 -30Q-11 -12 -2 -4Q-11 4 -11 ${GY}M11 -30Q11 -12 2 -4Q11 4 11 ${GY}`) + G(`M-7 ${GY}Q0 6 7 ${GY}ZM-6 -18H6L0 -8Z`) + g('pa-rise', G('M0 -4V10', ' stroke-dasharray="1 2.5"')),
  /** 一排坟 */
  tombs: () => I([-34, -8, 18].map((x) => `M${x} ${GY}q10 -11 20 0M${x - 4} ${GY}v-10a3.5 3.5 0 0 1 7 0v10`).join('')) + F([-34, -8, 18].map((x) => `M${x + 4} ${GY + 6}h12`).join('')),
  /** 四处乱飞的碎屑:人像飞蛾,山像散开的羊毛 */
  scatter: () => I([[-34, -20], [-12, -30], [10, -24], [30, -32], [-24, 0], [2, -6], [26, -4], [-6, 12]].map(([x, y]) => `M${x - 3} ${y}q3 -4 6 0M${x - 3} ${y}q3 4 6 0`).join('')) + F([[-20, -12], [18, -14], [-36, 10], [36, 12], [12, 8]].map(([x, y]) => `M${x} ${y}q4 -3 3 2q-2 4 -5 0`).join('')) + G('M-40 -34l5 5M38 -18l-5 5M-2 -38v6'),
  /** 尘土和蹄下的火星:冲锋(不画马) */
  dust: () => I(`M-40 ${GY}a9 9 0 0 1 10 -10a12 12 0 0 1 22 -4a10 10 0 0 1 18 6a8 8 0 0 1 8 8`) + F('M-44 -6h18M-40 -16h22M-44 4h12') + g('pa-pulse', rays('pg', 26, GY - 2, 3, 9, 7, 200, 140) + rays('pg', 38, GY - 2, 2, 6, 5, 200, 140)),
  /** 飞鸟(只画 V 形)丢下小石块 */
  birds: () => I([[-28, -30], [-8, -36], [12, -30], [30, -36], [0, -22]].map(([x, y]) => `M${x - 6} ${y - 3}q3 0 6 4q3 -4 6 -4`).join('')) + g('pa-rise', [[-26, -14], [-6, -4], [14, -12], [28, 2], [2, 8]].map(([x, y]) => dot('pg', x, y, 1.5)).join('')) + I(`M-30 ${GY}l10 -14M-16 ${GY}l-8 -12M18 ${GY}l12 -10M32 ${GY}l-6 -14`),
  /** 带刺的话:挖苦、中伤、反对 */
  barbs: () => G([-22, -6, 10].map((y, i) => `M${-38 + i * 6} ${y}l14 -5l-5 9l16 -5l-5 9l14 -4m-6 -3l6 3l-3 6`).join('')),
  /** 一个点,一圈圈环:独一 */
  one: () => [10, 19, 28, 37].map((r) => circle('pf', 0, -10, r)).join('') + g('pa-pulse', dot('pg', 0, -10, 3.2) + circle('pg', 0, -10, 6.5)),
  /** 绳结 */
  knot: () => I('M-42 4H-12C10 4 14 -20 0 -20C-14 -20 -10 4 12 4H42M-42 9H-14M14 9H42') + F('M-6 -8q6 -6 12 0M-4 -14q4 -3 8 0') + g('pa-pulse', G('M-30 -22q7 2 8 9M-22 -31q8 3 9 12M-12 -38q7 4 8 12')),
  /** 一道光的拱护着里面的灯,外面的东西被挡开 */
  shield: () => g('pa-pulse', G(`M-30 ${GY}A30 30 0 0 1 30 ${GY}`)) + F(`M-36 ${GY}A36 36 0 0 1 36 ${GY}`) + lampBowl(-4) + flame(14, GY - 14, 12) + I('M-44 -22l8 6M-30 -38l5 9M40 -26l-8 7M24 -40l-4 9'),
  /** 暗处飘来的低语,灯火被吹得晃 */
  whisper: () => F('M-44 -20q6 -5 12 0t12 0t12 0M-44 -8q6 -5 12 0t12 0t12 0t10 0M-44 4q6 -5 12 0t12 0t12 0') + I('M-36 -34A7 7 0 1 0 -30 -22A6 6 0 1 1 -36 -34Z') + lampBowl(20) + g('pa-pulse', g('', flame(38, GY - 14, 14), ` transform="rotate(16 38 ${GY - 14})"`)),
};

export const PANEL_ICONS = Object.keys(ICONS);
const OWN_GROUND = new Set(['quake', 'unearth']); // 自己画了裂开的地面,大图的地平线在这一格让开

// 夜空里的小星:位置由一个固定的数列决定,每张图都一样,不靠随机数
const skyDots = (w, top, bottom) => range(Math.round(w / 9)).map((i) => {
  const x = 12 + ((i * 61.8 + 17) % w);
  const y = top + ((i * 38.2 + 11) % (bottom - top));
  return circle('pf', x, y, i % 5 === 0 ? 0.9 : 0.5, ' fill="currentColor"');
}).join('');
/** 路上的站:菱形里 k 个小点,表示这是第 k 个重点 */
const station = (x, y, k) => I(`M${x - 6} ${y}L${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}Z`, ' fill="var(--paper)"') + range(k).map((j) => dot('pg', x + (j - (k - 1) / 2) * 2.6, y, 0.9)).join('');

/**
 * 一章一张大图。icons = 这一章几个重点的母题名(二到四个)。
 * layout: 'wide' 一行排开(宽屏);'tall' 两行,路从上一行的右端拐下来再往回走(手机)。
 */
export function sceneSvg(icons, layout = 'wide') {
  for (const icon of icons) if (!ICONS[icon]) throw new Error(`panels: 没有这个母题 ${icon}`);
  const n = icons.length;
  const CELL = 110;
  const ROW = 132;
  const perRow = layout === 'wide' ? n : 2;
  const rows = Math.ceil(n / perRow);
  const W = CELL * perRow;
  const H = ROW * rows + 8;
  // 每一格的中心:tall 的第二行从右往左排,路才是一笔连下来的
  const slots = icons.map((_, i) => {
    const r = Math.floor(i / perRow);
    let c = i % perRow;
    const inRow = Math.min(perRow, n - r * perRow);
    if (layout === 'tall' && r % 2 === 1) c = perRow - 1 - c;
    const x = inRow < perRow ? W / 2 : CELL / 2 + c * CELL;
    return { x, y: 58 + r * ROW, r };
  });
  const out = [];
  out.push(`<rect class="pf" x="3" y="3" width="${W - 6}" height="${H - 6}" rx="9"/><rect class="pi" x="6.5" y="6.5" width="${W - 13}" height="${H - 13}" rx="6.5" style="stroke-width:0.4"/>`);
  for (let r = 0; r < rows; r++) {
    const top = r * ROW;
    const gy = top + 58 + GY;
    out.push(skyDots(W - 24, top + 14, gy - 30));
    // 构造圆:以这一行的中点为圆心,和大插画同一种画法
    out.push((layout === 'tall' ? [46, 74] : [46, 74, 120]).map((rad) => F(`M${f(W / 2 - rad)} ${gy}A${rad} ${rad} 0 0 1 ${f(W / 2 + rad)} ${gy}`)).join(''));
    // 地平线(让开自己画地面的格子)和近处地面的排线
    const gaps = slots.filter((s, i) => s.r === r && OWN_GROUND.has(icons[i])).map((s) => [s.x - 46, s.x + 46]);
    let x0 = 12;
    let line = '';
    for (const [a, b] of gaps.sort((u, v) => u[0] - v[0])) { line += `M${f(x0)} ${gy}H${f(a)}`; x0 = b; }
    line += `M${f(x0)} ${gy}H${W - 12}`;
    out.push(I(line) + F(range(5).map((i) => `M12 ${f(gy + 4 + i * (5 - i * 0.5))}H${W - 12}`).join('')));
  }
  // 路:一条金色的点线,一站一站走过去
  const road = slots.map((s) => [s.x, s.y + GY + 34]);
  let d = `M${f(road[0][0] - 40)} ${f(road[0][1])}L${road[0].map(f).join(' ')}`;
  for (let i = 1; i < n; i++) {
    const [ax, ay] = road[i - 1];
    const [bx, by] = road[i];
    d += ay === by ? `L${f(bx)} ${f(by)}` : `C${f(Math.min(W - 10, ax + 44))} ${f(ay)} ${f(Math.min(W - 10, bx + 44))} ${f(by)} ${f(bx)} ${f(by)}`;
  }
  const last = road[n - 1];
  const dir = layout === 'tall' && slots[n - 1].r % 2 === 1 ? -1 : 1;
  d += `L${f(last[0] + 40 * dir)} ${f(last[1])}`;
  out.push(p('pg pa-road', d, ' stroke-dasharray="0.1 4"'));
  slots.forEach((s, i) => {
    out.push(g('', ICONS[icons[i]](), ` transform="translate(${f(s.x)} ${f(s.y)})"`));
    out.push(F(`M${f(s.x)} ${f(s.y + GY + 6)}V${f(s.y + GY + 27)}`, ' stroke-dasharray="1 2.5"'));
    out.push(station(s.x, s.y + GY + 34, i + 1));
  });
  return `<svg class="scene-art scene-art--${layout}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${out.join('')}</svg>`;
}
