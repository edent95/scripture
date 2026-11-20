// 「一图看懂」的小格线稿:一章提炼成三四个重点,每个重点一格,从左到右连成一条。
// 全套共用同一批图形(母题):秤永远是审判,园子永远是乐园,火永远是火狱……所以不同章看起来是一套,看熟了不读字也认得。
// 规矩(engraved-scenes 技能):不画人、不画人的剪影,图里不写字;每格一个物件、最多一个小动作。
// 画法:内联 SVG,viewBox -50…50;颜色全走 CSS 变量(.pi 墨线 / .pf 淡线 / .pg 金线),浅深色自动跟着变;
// 动作只用 CSS 的 transform / opacity(类名 pa-*),「减少动效」时在 styles.css 里一律停掉。
const f = (v) => (Math.abs(v) < 0.005 ? '0' : Number(v.toFixed(2)).toString());
const range = (n) => Array.from({ length: n }, (_, i) => i);
const polar = (r, deg, cx = 0, cy = 0) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
const p = (cls, d, extra = '') => `<path class="${cls}" d="${d}"${extra}/>`;
const circle = (cls, cx, cy, r, extra = '') => `<circle class="${cls}" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"${extra}/>`;

const GY = 22; // 地平线:画框纵向 72% 处,全套一致
/** 共用底层:地平线 + 往下越来越密的排线(和大插画的地面同一种画法) */
const ground = (y = GY) =>
  p('pi', `M-46 ${y}H46`) + p('pf', range(6).map((i) => `M-46 ${f(y + 3 + i * (4.2 - i * 0.35))}H46`).join(''));
/** 从 (cx,cy) 放射的短线:n 道,从 r0 到 r1 */
const rays = (cls, cx, cy, r0, r1, n, from = 0, sweep = 360) =>
  p(cls, range(n).map((i) => {
    const a = from + (sweep * i) / (sweep === 360 ? n : n - 1);
    return `M${polar(r0, a, cx, cy).map(f).join(' ')}L${polar(r1, a, cx, cy).map(f).join(' ')}`;
  }).join(''));
/** 四角星:金色的小星,代表光、启示、指引 */
const star = (cx, cy, r, cls = 'pg') =>
  p(cls, `M${f(cx)} ${f(cy - r)}Q${f(cx)} ${f(cy)} ${f(cx + r)} ${f(cy)}Q${f(cx)} ${f(cy)} ${f(cx)} ${f(cy + r)}Q${f(cx)} ${f(cy)} ${f(cx - r)} ${f(cy)}Q${f(cx)} ${f(cy)} ${f(cx)} ${f(cy - r)}Z`);

/** 秤:审判。tilt 往哪边沉(-1 左 / 0 平 / 1 右),speck = 两个盘里各放一粒小点(再小的事也上秤) */
function scale({ tilt = 0, speck = false } = {}) {
  const dy = tilt * 5;
  const pan = (x, y) => p('pi', `M${x - 11} ${f(y)}Q${x} ${f(y + 9)} ${x + 11} ${f(y)}Z`) + p('pf', `M${x - 9} ${f(y - 14)}L${x - 11} ${f(y)}M${x + 9} ${f(y - 14)}L${x + 11} ${f(y)}`) + (speck ? circle('pg pa-pulse', x, y + 2.5, 1.3, ' fill="currentColor"') : '');
  return (
    ground() +
    p('pi', `M0 -30V${GY}M-9 ${GY}H9`) +
    `<g class="pa-tilt">${p('pg', `M-26 ${f(-24 - dy)}L26 ${f(-24 + dy)}`)}${pan(-26, -10 - dy)}${pan(26, -10 + dy)}</g>` +
    circle('pg', 0, -30, 2.4)
  );
}

const ICONS = {
  /** 太阳照着整个世界:赞美照管万物的主 */
  sunworld: () =>
    p('pi', `M-44 ${GY + 16}Q0 ${GY - 22} 44 ${GY + 16}`) +
    p('pf', `M-36 ${GY + 16}Q0 ${GY - 10} 36 ${GY + 16}M-26 ${GY + 16}Q0 ${GY} 26 ${GY + 16}`) +
    `<g class="pa-pulse">${rays('pg', 0, -18, 13, 24, 16)}</g>` +
    circle('pg', 0, -18, 8.5) + circle('pg', 0, -18, 4),
  /** 秤:审判那一天 */
  scale: () => scale(),
  /** 一粒灰尘也上秤 */
  speck: () => scale({ speck: true }),
  /** 拱门里一盏灯:只拜他、只求他(礼拜的方向,不画人) */
  archlamp: () =>
    ground() +
    p('pi', `M-22 ${GY}V-8Q-22 -30 0 -40Q22 -30 22 -8V${GY}`) +
    p('pf', `M-16 ${GY}V-8Q-16 -25 0 -33Q16 -25 16 -8V${GY}`) +
    p('pf', 'M0 -33V-16') +
    p('pg', 'M-5 -16H5L3.5 -6H-3.5Z') +
    `<g class="pa-pulse">${rays('pg', 0, -11, 9, 14, 9, 20, 140)}</g>`,
  /** 三条路:中间一条笔直通向星,两边的拐走、断掉 */
  paths: () =>
    ground(8) +
    p('pg', 'M-5 44L-1 8M5 44L1 8') +
    p('pf', 'M-16 44Q-14 24 -34 12M-26 44Q-26 28 -44 20', ' stroke-dasharray="2.5 2.5"') +
    p('pf', 'M16 44Q14 24 34 12M26 44Q26 28 44 20', ' stroke-dasharray="2.5 2.5"') +
    `<g class="pa-pulse">${star(0, -14, 9)}</g>` + rays('pf', 0, -14, 12, 20, 8, 22.5),
  /** 地震:地面裂开一道缝,震波一圈圈散开 */
  quake: () =>
    p('pi', `M-46 ${GY}H-12L-7 ${GY + 7}L-2 ${GY - 5}L4 ${GY + 9}L9 ${GY - 3}L13 ${GY}H46`) +
    p('pf', `M-2 ${GY - 5}L-4 ${GY + 20}M4 ${GY + 9}L6 ${GY + 24}M-46 ${GY + 8}H-14M16 ${GY + 8}H46M-46 ${GY + 15}H-10M12 ${GY + 15}H46`) +
    `<g class="pa-pulse">${[14, 23, 32].map((r) => p('pg', `M${polar(r, 205, 0, GY).map(f).join(' ')}A${r} ${r} 0 0 1 ${polar(r, 335, 0, GY).map(f).join(' ')}`)).join('')}</g>` +
    p('pi', 'M-30 -2l3 -7l3 7M26 -6l3 -7l3 7'),
  /** 大地打开,埋着的东西升上来 */
  unearth: () =>
    p('pi', `M-46 ${GY}H-14L-9 ${GY + 20}M46 ${GY}H14L9 ${GY + 20}`) +
    p('pf', `M-46 ${GY + 7}H-13M13 ${GY + 7}H46M-46 ${GY + 14}H-11M11 ${GY + 14}H46`) +
    p('pi', `M-14 ${GY}L-20 ${GY - 6}M14 ${GY}L20 ${GY - 6}`) +
    `<g class="pa-rise">${[[0, 8, 2.2], [-6, -4, 1.6], [6, -9, 1.8], [-2, -20, 1.4], [4, -30, 1.2]].map(([x, y, r]) => circle('pg', x, y, r, ' fill="currentColor"')).join('')}</g>` +
    p('pf', 'M0 14V-36M-7 10L-12 -28M7 10L12 -28', ' stroke-dasharray="1.5 3"'),
  /** 人们一群群出来:只画一串串脚印似的点,汇向一道门 */
  gather: () =>
    ground() +
    p('pi', `M-9 ${GY}V0Q-9 -12 0 -16Q9 -12 9 0V${GY}`) +
    star(0, -26, 5) +
    `<g class="pa-pulse">${[[-40, 40], [-24, 44], [24, 44], [40, 40], [0, 46]].map(([x, y]) => p('pg', `M${x} ${y}L${f(x * 0.18)} ${GY + 3}`, ' stroke-dasharray="0.1 4.2" stroke-linecap="round" stroke-width="2.2"')).join('')}</g>`,
  /** 日出,另一边一弯淡淡的月:上午与黑夜 */
  sunrise: () =>
    ground() +
    `<g class="pa-rise">${p('pg', `M-13 ${GY}A13 13 0 0 1 13 ${GY}`)}${rays('pg', 0, GY, 17, 27, 9, 200, 140)}</g>` +
    p('pf', 'M30 -30A9 9 0 1 0 38 -16A7 7 0 1 1 30 -30Z') +
    circle('pf', -32, -28, 0.9) + circle('pf', -22, -36, 0.7) + circle('pf', 16, -36, 0.8),
  /** 帐篷里亮着灯:有地方安身 */
  tent: () =>
    ground() +
    p('pi', `M-30 ${GY}L0 -22L30 ${GY}M0 -22V-30`) +
    p('pf', `M-20 ${GY}L0 -14L20 ${GY}`) +
    p('pi', `M-7 ${GY}L0 2L7 ${GY}`) +
    `<g class="pa-pulse">${circle('pg', 0, 14, 2.6, ' fill="currentColor"')}${rays('pg', 0, 14, 5, 8, 6, 200, 140)}</g>` +
    star(24, -30, 4),
  /** 一条弯路通向一颗星:不认得路,有了指引 */
  roadstar: () =>
    ground(10) +
    p('pi', 'M-12 44C-10 30 14 30 8 20C4 14 -4 14 -1 10M4 44C6 34 26 32 16 20C10 13 2 14 1 10') +
    `<g class="pa-pulse">${star(0, -16, 10)}</g>` + rays('pf', 0, -16, 13, 21, 8, 22.5),
  /** 半开的门,光铺在地上,门口放着一只盛满的碗:接纳孤儿和来求助的人 */
  opendoor: () =>
    ground() +
    p('pi', `M-14 ${GY}V-30H14V${GY}`) +
    p('pi', `M-14 -30L2 -24V${GY + 4}L-14 ${GY}`) +
    p('pg pa-pulse', `M2 ${GY + 4}L14 ${GY}L34 ${GY + 16}H10Z`) +
    p('pg', `M18 ${GY + 8}Q24 ${GY + 15} 30 ${GY + 8}Z`) + p('pg', `M20 ${GY + 8}Q24 ${GY + 3} 28 ${GY + 8}`),
};

export const PANEL_ICONS = Object.keys(ICONS);

/** 一格线稿的 SVG(内联用)。图里没有字,说明文字由页面写在格子下面。 */
export function panelSvg(icon) {
  if (!ICONS[icon]) throw new Error(`panels: 没有这个图形 ${icon}`);
  return `<svg class="panel-art" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">${circle('pf', 0, -6, 43)}${ICONS[icon]()}</svg>`;
}
