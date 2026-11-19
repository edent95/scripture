// 主题插画:首页一张(莲花)+ 每部经书一张。构建时生成 SVG,零依赖。
// 语言和花纹章一致:只有 ink / faint / foil 三种颜色,图里不放字,数学只用来生成形状。
//
// 共用底层(frame):画框 380 × 380(viewBox -190 … 190)
//   · 黄金点:焦点在纵向 38.2%(y = -44.8),地面 / 水面在 61.8%(y = +44.8)
//   · 构造圆:以焦点为圆心,半径 14 × φ^k(14 → 96)
//   · 黄金螺旋:7 级正方形分割的四分之一圆弧,极点 = 焦点
//   · 光芒 34 道、珠环 55 颗(斐波那契),叶序种子 233 粒按黄金角 137.508° 排(可选)
// 主体:每张一个讲得出意思的物件,一个主动作;静止版(still)直接画动作完成后的样子。
// 只动 transform / opacity / 几何属性;页面上「减少动效」时换成静止版。

const PHI = (1 + Math.sqrt(5)) / 2;
const GOLDEN_ANGLE = 360 / PHI ** 2; // 137.507…°
const FY = -190 + 380 * (1 - 1 / PHI); // -44.8 焦点
const GY = -190 + 380 / PHI; //            +44.8 地面 / 水面
const RADII = [0, 1, 2, 3, 4].map((k) => 14 * PHI ** k); // 14, 22.7, 36.7, 59.3, 96
const f = (v) => (Math.abs(v) < 0.005 ? '0' : v.toFixed(2));
const range = (n) => Array.from({ length: n }, (_, i) => i);

const PALETTES = {
  light: { ink: 'rgba(40,52,44,0.62)', faint: 'rgba(40,52,44,0.2)', foil: 'rgba(184,134,47,0.9)', paper: '#ffffff' },
  dark: { ink: 'rgba(239,232,218,0.55)', faint: 'rgba(239,232,218,0.16)', foil: 'rgba(242,207,122,0.85)', paper: '#050505' },
};

const spin = (dur, dir, A) =>
  A ? `<animateTransform attributeName="transform" type="rotate" from="0" to="${360 * dir}" dur="${dur}s" repeatCount="indefinite"/>` : '';

// ───────────────────────── 共用底层 ─────────────────────────

function frame(P, A, { seeds = false, rays = true, spiral = true } = {}) {
  const out = [];
  out.push(
    `<g stroke="${P.faint}" stroke-width="0.4">${RADII.map((r) => `<circle cx="0" cy="${f(FY)}" r="${f(r)}"/>`).join('')}</g>`,
  );
  if (spiral) {
    const W = 196;
    const H = W / PHI;
    const sq = [];
    let x = 0, y = 0, w = W, h = H;
    for (let k = 0; k < 7; k += 1) {
      const s = Math.min(w, h);
      const dir = k % 4;
      let sx, sy;
      if (dir === 0) { sx = x; sy = y; x += s; w -= s; }
      else if (dir === 1) { sx = x + w - s; sy = y; y += s; h -= s; }
      else if (dir === 2) { sx = x + w - s; sy = y + h - s; w -= s; }
      else { sx = x; sy = y + h - s; h -= s; }
      sq.push([sx, sy, s, dir]);
    }
    // 切 7 次后剩下的小矩形中心就是螺旋极点,整组平移让它落在焦点
    const ox = -(x + w / 2), oy = FY - (y + h / 2);
    const arcs = sq
      .map(([sx, sy, s, dir]) => {
        const a0 = [[sx, sy + s], [sx, sy], [sx + s, sy], [sx + s, sy + s]][dir];
        const a1 = [[sx + s, sy], [sx + s, sy + s], [sx, sy + s], [sx, sy]][dir];
        return `M${f(a0[0] + ox)} ${f(a0[1] + oy)}A${f(s)} ${f(s)} 0 0 1 ${f(a1[0] + ox)} ${f(a1[1] + oy)}`;
      })
      .join('');
    out.push(
      `<g stroke="${P.faint}" stroke-width="0.35">${sq.map(([sx, sy, s]) => `<rect x="${f(sx + ox)}" y="${f(sy + oy)}" width="${f(s)}" height="${f(s)}"/>`).join('')}<rect x="${f(ox)}" y="${f(oy)}" width="${f(W)}" height="${f(H)}"/></g>`,
      `<path d="${arcs}" stroke="${P.foil}" stroke-width="0.6" opacity="0.55"/>`,
    );
  }
  if (rays) {
    const r0 = RADII[3], r1 = 140;
    const d = range(34)
      .map((i) => {
        const a = (i / 34) * Math.PI * 2;
        return `M${f(r0 * Math.sin(a))} ${f(-r0 * Math.cos(a))}L${f(r1 * Math.sin(a))} ${f(-r1 * Math.cos(a))}`;
      })
      .join('');
    out.push(`<g transform="translate(0 ${f(FY)})"><g>${spin(480, -1, A)}<path d="${d}" stroke="${P.faint}" stroke-width="0.4"/></g></g>`);
  }
  // 珠环:55 颗,每第 5 颗金
  const beads = range(55)
    .map((i) => {
      const a = (i / 55) * Math.PI * 2;
      const big = i % 5 === 0;
      return `<circle cx="${f(172 * Math.sin(a))}" cy="${f(-172 * Math.cos(a))}" r="${big ? 1.9 : 0.9}" fill="${big ? P.foil : P.ink}" stroke="none"/>`;
    })
    .join('');
  out.push(`<g>${spin(600, 1, A)}${beads}</g>`);
  out.push(`<circle r="178" stroke="${P.faint}" stroke-width="0.5"/><circle r="166" stroke="${P.faint}" stroke-width="0.5"/>`);
  if (seeds) {
    const n = 233;
    const c = RADII[4] / Math.sqrt(n);
    const dots = range(n)
      .map((i) => {
        const k = i + 1;
        const r = c * Math.sqrt(k);
        const a = (k * GOLDEN_ANGLE * Math.PI) / 180;
        return `<circle cx="${f(r * Math.cos(a))}" cy="${f(r * Math.sin(a))}" r="${f(0.45 + (0.55 * k) / n)}" opacity="${f(0.35 + (0.45 * (n - k)) / n)}"/>`;
      })
      .join('');
    out.push(`<g transform="translate(0 ${f(FY)})"><g fill="${P.ink}" stroke="none">${spin(360, 1, A)}${dots}</g></g>`);
  }
  return out.join('');
}

/** 主体统一裁在内圈里,不压珠环 */
const clipped = (body) => `<g clip-path="url(#inner)">${body}</g>`;
const DEFS = '<defs><clipPath id="inner"><circle r="165"/></clipPath></defs>';

/** 一片花瓣:基点 (0,0),尖朝上,长 L,最宽 L/φ²;描边 + 三条叶脉 */
function petal(L, { stroke, vein, fill, width }) {
  const w = L / PHI ** 2;
  const body = `M0 0C${f(w)} ${f(-L * 0.36)} ${f(w * 0.62)} ${f(-L * 0.8)} 0 ${f(-L)}C${f(-w * 0.62)} ${f(-L * 0.8)} ${f(-w)} ${f(-L * 0.36)} 0 0Z`;
  const veins = [0, 0.42, -0.42]
    .map((k) => `M0 ${f(-L * 0.06)}Q${f(w * k * 1.1)} ${f(-L * 0.5)} ${f(w * k * 0.35)} ${f(-L * 0.9)}`)
    .join('');
  return `<path d="${body}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/><path d="${veins}" stroke="${vein}" stroke-width="0.35"/>`;
}

/** 水面:按 φ 放大的同心椭圆;动时金色水波一圈圈散开 */
function water(P, A, { y = GY, rx0 = 13.6, reflect = 26 } = {}) {
  const out = [0, 1, 2, 3, 4].map((k) => {
    const rx = rx0 * PHI ** k;
    return `<ellipse cx="0" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.16)}" stroke="${k < 2 ? P.ink : P.faint}" stroke-width="${k < 2 ? 0.5 : 0.4}"/>`;
  });
  if (A) {
    out.push(
      ...[0, 1, 2].map((k) => {
        const b = `begin="${f(k * 2.6)}s" dur="7.8s" repeatCount="indefinite"`;
        return `<ellipse cx="0" cy="${f(y)}" rx="20" ry="3.2" stroke="${P.foil}" stroke-width="0.5" opacity="0"><animate attributeName="rx" values="20;150" ${b}/><animate attributeName="ry" values="3.2;24" ${b}/><animate attributeName="opacity" values="0;0.8;0" keyTimes="0;0.15;1" ${b}/></ellipse>`;
      }),
    );
  }
  if (reflect) {
    const d = range(9)
      .map((i) => {
        const yy = y + 5 + i * 3.4;
        const hw = reflect * (1 - i / 11);
        return `M${f(-hw)} ${f(yy)}H${f(hw)}`;
      })
      .join('');
    out.push(`<path d="${d}" stroke="${P.faint}" stroke-width="0.5" stroke-dasharray="3 2"/>`);
  }
  return out.join('');
}

/** 地面:一条地平线 + 往下越来越密的横排线 */
function earth(P, { y = GY } = {}) {
  const d = range(12)
    .map((i) => {
      const yy = y + 4 + i * (5.2 - i * 0.28);
      return `M-170 ${f(yy)}H170`;
    })
    .join('');
  return `<path d="M-170 ${f(y)}H170" stroke="${P.ink}" stroke-width="0.6"/><path d="${d}" stroke="${P.faint}" stroke-width="0.4"/>`;
}

// ───────────────────────── 主体 ─────────────────────────

/** 首页:莲花从水面开出来,三层 8 / 5 / 3 片(斐波那契),中间一片金 */
function lotus(P, A) {
  const layer = (count, spread, L, style, delay) =>
    range(count)
      .map((i) => {
        const a = count === 1 ? 0 : -spread + (2 * spread * i) / (count - 1);
        const anim = A
          ? `<animateTransform attributeName="transform" type="rotate" from="0" to="${f(a)}" begin="${delay}s" dur="2.6s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.3 0 0.2 1"/>`
          : '';
        return `<g transform="rotate(${A ? 0 : f(a)})">${anim}${petal(L, style)}</g>`;
      })
      .join('');
  const pad = `<ellipse cx="0" cy="3" rx="48" ry="7" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/>${range(13)
    .map((i) => {
      const a = Math.PI * (i / 12);
      return `<path d="M0 3L${f(-48 * Math.cos(a))} ${f(3 + 7 * Math.sin(a))}" stroke="${P.faint}" stroke-width="0.35"/>`;
    })
    .join('')}`;
  const flower = [
    layer(8, 74, 74, { stroke: P.faint, vein: P.faint, fill: P.paper, width: 0.5 }, 0.2),
    layer(5, 52, 88, { stroke: P.ink, vein: P.faint, fill: P.paper, width: 0.6 }, 0.7),
    layer(3, 30, 96, { stroke: P.ink, vein: P.faint, fill: P.paper, width: 0.75 }, 1.2),
    petal(101, { stroke: P.foil, vein: P.foil, fill: P.paper, width: 0.9 }),
  ].join('');
  return {
    frame: { seeds: true },
    body: water(P, A) + `<g transform="translate(0 ${f(GY)}) scale(1.14)">${pad}${flower}</g>` + `<circle cx="0" cy="${f(FY)}" r="2.4" fill="${P.foil}" stroke="none"/>`,
  };
}

/** 心经:空钵盛水,天上满月,水里一个月影 —— 水一动影就散,静下来又聚回(色即是空,空即是色) */
function heart(P, A) {
  const R = RADII[2];
  const moon = `<circle cx="0" cy="${f(FY)}" r="${f(R)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/>${[1, 2]
    .map((k) => `<circle cx="0" cy="${f(FY)}" r="${f(R / PHI ** k)}" stroke="${P.faint}" stroke-width="0.4"/>`)
    .join('')}${range(21)
    .map((i) => {
      const y = FY - R + (2 * R * (i + 0.5)) / 21;
      const hw = Math.sqrt(Math.max(0, R * R - (y - FY) ** 2));
      return `<path d="M${f(-hw * 0.96)} ${f(y)}H${f(hw * 0.96)}" stroke="${P.faint}" stroke-width="0.3"/>`;
    })
    .join('')}<circle cx="0" cy="${f(FY)}" r="2.4" fill="${P.foil}" stroke="none"/>`;
  const rimY = GY - 22;
  const bowl = `<path d="M-64 ${f(rimY)}C-62 ${f(GY + 6)} -30 ${f(GY + 14)} 0 ${f(GY + 14)}C30 ${f(GY + 14)} 62 ${f(GY + 6)} 64 ${f(rimY)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.75"/>${range(9)
    .map((i) => {
      const t = (i + 1) / 10;
      const y = rimY + t * 34;
      const hw = 64 * Math.sqrt(1 - t * t * 0.86);
      return `<path d="M${f(-hw)} ${f(y)}Q0 ${f(y + 6)} ${f(hw)} ${f(y)}" stroke="${P.faint}" stroke-width="0.35"/>`;
    })
    .join('')}<ellipse cx="0" cy="${f(rimY)}" rx="64" ry="9" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.75"/><ellipse cx="0" cy="${f(rimY + 1.4)}" rx="56" ry="6.6" stroke="${P.faint}" stroke-width="0.45"/><ellipse cx="0" cy="${f(GY + 15)}" rx="18" ry="2.6" stroke="${P.ink}" stroke-width="0.5"/>`;
  const shadow = A
    ? `<ellipse cx="0" cy="${f(rimY + 1.4)}" rx="12" ry="2.4" fill="${P.foil}" stroke="none"><animate attributeName="rx" values="12;22;4;12;12" keyTimes="0;0.2;0.45;0.75;1" dur="7s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.35;0.1;1;1" keyTimes="0;0.2;0.45;0.75;1" dur="7s" repeatCount="indefinite"/></ellipse>${[0, 1]
        .map(
          (k) => `<ellipse cx="0" cy="${f(rimY + 1.4)}" rx="8" ry="1.4" stroke="${P.foil}" stroke-width="0.4" opacity="0"><animate attributeName="rx" values="8;52" begin="${k * 0.5}s" dur="7s" repeatCount="indefinite"/><animate attributeName="ry" values="1.4;6" begin="${k * 0.5}s" dur="7s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.9;0;0" keyTimes="0;0.08;0.4;1" begin="${k * 0.5}s" dur="7s" repeatCount="indefinite"/></ellipse>`,
        )
        .join('')}`
    : `<ellipse cx="0" cy="${f(rimY + 1.4)}" rx="12" ry="2.4" fill="${P.foil}" stroke="none"/>`;
  return { frame: { seeds: true }, body: earth(P) + moon + bowl + shadow };
}

/** 金刚经:金刚杵 —— 坚固、能断;杵身按 φ 分段,杵尖一闪 */
function diamond(P, A) {
  const half = (s) => {
    // s = -1 上半,+1 下半;中心珠在焦点
    const y = (v) => f(FY + s * v);
    const collar = `<ellipse cx="0" cy="${y(14)}" rx="15" ry="4.2" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/><ellipse cx="0" cy="${y(20)}" rx="12" ry="3.4" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.5"/>`;
    const tip = 20 + 59.3; // 杵头长 = φ³ 圈半径
    const prongs = [30, 16, -16, -30]
      .map((w) => {
        const outer = Math.abs(w) > 20;
        // 从领口出发,先水平外张到 w,再竖直上升,最后向内弯成钩、收到杵尖下方
        return `<path d="M${f(w * 0.3)} ${y(22)}C${f(w * 1.1)} ${y(24)} ${f(w * 1.05)} ${y(34)} ${f(w)} ${y(46)}C${f(w * 0.95)} ${y(62)} ${f(w * 0.45)} ${y(tip - 6)} 0 ${y(tip - 3)}" stroke="${P.ink}" stroke-width="${outer ? 0.8 : 0.5}"/>${outer ? `<path d="M${f(w * 1.05)} ${y(40)}l${f(Math.sign(w) * 3)} ${f(s * -2)}" stroke="${P.ink}" stroke-width="0.6"/>` : ''}`;
      })
      .join('');
    const center = `<path d="M0 ${y(22)}V${y(tip)}" stroke="${P.foil}" stroke-width="0.9"/>`;
    const beads = [36, 50, 64].map((v) => `<circle cx="0" cy="${y(v)}" r="1.3" fill="${P.ink}" stroke="none"/>`).join('');
    return collar + prongs + center + beads;
  };
  const core = `<circle cx="0" cy="${f(FY)}" r="9" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.9"/><circle cx="0" cy="${f(FY)}" r="5.6" stroke="${P.faint}" stroke-width="0.4"/>`;
  const glint = (s, delay) => {
    const y = FY + s * 81;
    const star = `<path d="M0 ${f(y - 9)}V${f(y + 9)}M-9 ${f(y)}H9M-4 ${f(y - 4)}L4 ${f(y + 4)}M-4 ${f(y + 4)}L4 ${f(y - 4)}" stroke="${P.foil}" stroke-width="0.6"/>`;
    return A
      ? `<g opacity="0">${star}<animate attributeName="opacity" values="0;1;0;0" keyTimes="0;0.08;0.22;1" begin="${delay}s" dur="5.2s" repeatCount="indefinite"/></g>`
      : `<g opacity="0.8">${star}</g>`;
  };
  const halo = A
    ? `<circle cx="0" cy="${f(FY)}" r="16" stroke="${P.foil}" stroke-width="0.5" opacity="0"><animate attributeName="r" values="16;96" dur="5.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.8;0" keyTimes="0;0.1;1" dur="5.2s" repeatCount="indefinite"/></circle>`
    : '';
  // 影子:杵悬在空中,地上一道淡影
  const shadow = `<ellipse cx="0" cy="${f(GY + 10)}" rx="34" ry="4" stroke="${P.faint}" stroke-width="0.5"/>`;
  return { frame: { seeds: false }, body: shadow + halo + half(-1) + half(1) + core + glint(-1, 0.4) + glint(1, 3) };
}

/** 阿弥陀经:七宝池里一朵俯视的莲花,三层 8 / 13 / 21 片(斐波那契),一层层张开 */
function amitabha(P, A) {
  const ring = (count, L, base, style, delay, offset) =>
    `<g>${A ? `<animateTransform attributeName="transform" type="scale" from="0.55" to="1" begin="${delay}s" dur="2.8s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.3 0 0.2 1"/>` : ''}${range(count)
      .map((i) => {
        const a = (360 * i) / count + offset;
        return `<g transform="rotate(${f(a)}) translate(0 ${f(-base)})">${petal(L, style)}</g>`;
      })
      .join('')}</g>`;
  const flower = [
    ring(21, 42, 50, { stroke: P.faint, vein: P.faint, fill: P.paper, width: 0.5 }, 0.1, 0),
    ring(13, 44, 30, { stroke: P.ink, vein: P.faint, fill: P.paper, width: 0.6 }, 0.6, 360 / 26),
    ring(8, 36, 14, { stroke: P.foil, vein: P.faint, fill: P.paper, width: 0.75 }, 1.1, 0),
  ].join('');
  const pod = `<circle r="13" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/>${range(13)
    .map((i) => {
      const k = i + 1;
      const r = 3 * Math.sqrt(k);
      const a = (k * GOLDEN_ANGLE * Math.PI) / 180;
      return `<circle cx="${f(r * Math.cos(a))}" cy="${f(r * Math.sin(a))}" r="1.1" fill="${P.foil}" stroke="none"/>`;
    })
    .join('')}`;
  // 池面:以花为圆心的同心水纹(按 φ),比构造圆更实一点
  const pond = [1, 2, 3].map((k) => `<circle cx="0" cy="${f(FY)}" r="${f(96 * PHI ** (k / 3))}" stroke="${k === 1 ? P.ink : P.faint}" stroke-width="0.45" stroke-dasharray="${k === 1 ? '0' : '2 3'}"/>`).join('');
  return {
    frame: { seeds: false, rays: false },
    body: pond + `<g transform="translate(0 ${f(FY)})"><g>${spin(240, 1, A)}${flower}</g>${pod}</g>`,
  };
}

/** 无量寿经:海面上的落日,48 道光芒(四十八愿),长短交替,一明一暗 */
function sukhavati(P, A) {
  const R = RADII[3];
  const sun = `<path d="M${f(-R)} ${f(GY)}A${f(R)} ${f(R)} 0 0 1 ${f(R)} ${f(GY)}Z" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.9"/>${[1, 2, 3]
    .map((k) => {
      const r = R / PHI ** k;
      return `<path d="M${f(-r)} ${f(GY)}A${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(GY)}" stroke="${P.faint}" stroke-width="0.45"/>`;
    })
    .join('')}${range(15)
    .map((i) => {
      const y = GY - (R * (i + 0.5)) / 15;
      const hw = Math.sqrt(Math.max(0, R * R - (GY - y) ** 2));
      return `<path d="M${f(-hw * 0.95)} ${f(y)}H${f(hw * 0.95)}" stroke="${P.faint}" stroke-width="0.3"/>`;
    })
    .join('')}`;
  const ray = (i, set) => {
    const a = Math.PI * (-0.5 + (i + 0.5) / 48) ; // 上半圆 48 道
    const long = i % 2 === 0;
    const r0 = R + 6, r1 = long ? 150 : 112;
    return `M${f(r0 * Math.sin(a))} ${f(GY - r0 * Math.cos(a))}L${f(r1 * Math.sin(a))} ${f(GY - r1 * Math.cos(a))}`;
  };
  const longD = range(48).filter((i) => i % 2 === 0).map((i) => ray(i)).join('');
  const shortD = range(48).filter((i) => i % 2 === 1).map((i) => ray(i)).join('');
  const pulse = (d, color, begin) =>
    `<path d="${d}" stroke="${color}" stroke-width="0.55">${A ? `<animate attributeName="opacity" values="1;0.25;1" dur="6s" begin="${begin}s" repeatCount="indefinite"/>` : ''}</path>`;
  const sea = range(10)
    .map((i) => {
      const y = GY + 4 + i * 4.4;
      const hw = 150 - i * 8;
      return `<path d="M${f(-hw)} ${f(y)}H${f(hw)}" stroke="${P.faint}" stroke-width="0.4"/>`;
    })
    .join('');
  // 日影在海面上:断续的金色横线,越往下越窄
  const glow = range(8)
    .map((i) => {
      const y = GY + 6 + i * 4.4;
      const hw = R * 0.7 * (1 - i / 9);
      return `<path d="M${f(-hw)} ${f(y)}H${f(hw)}" stroke="${P.foil}" stroke-width="0.6" stroke-dasharray="6 4" opacity="${f(0.9 - i * 0.09)}"/>`;
    })
    .join('');
  return {
    frame: { seeds: false, rays: false },
    body: pulse(longD, P.foil, 0) + pulse(shortD, P.ink, 3) + sea + glow + sun + `<path d="M-170 ${f(GY)}H170" stroke="${P.ink}" stroke-width="0.6"/>`,
  };
}

/** 法华经:宝塔从地涌出(见宝塔品)—— 七层,每层宽 × 1/√φ,从地底升起 */
function lotusSutra(P, A) {
  const tiers = [];
  let y = GY - 10; // 台基顶
  let w = 104;
  for (let k = 0; k < 7; k += 1) {
    const h = 15 * PHI ** (-k / 4);
    const body = `<rect x="${f(-w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/>`;
    const door = `<path d="M${f(-w * 0.09)} ${f(y)}V${f(y - h * 0.62)}A${f(w * 0.09)} ${f(w * 0.09)} 0 0 1 ${f(w * 0.09)} ${f(y - h * 0.62)}V${f(y)}" stroke="${P.faint}" stroke-width="0.45"/>`;
    const ew = w / 2 + 10;
    const ey = y - h;
    const eave = `<path d="M${f(-ew - 4)} ${f(ey - 5)}Q${f(-ew + 6)} ${f(ey)} ${f(-w / 2 + 2)} ${f(ey - 1)}L${f(w / 2 - 2)} ${f(ey - 1)}Q${f(ew - 6)} ${f(ey)} ${f(ew + 4)} ${f(ey - 5)}Q${f(ew - 8)} ${f(ey - 6)} ${f(w * 0.36)} ${f(ey - 8)}H${f(-w * 0.36)}Q${f(-ew + 8)} ${f(ey - 6)} ${f(-ew - 4)} ${f(ey - 5)}Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/>`;
    const hatch = range(Math.max(2, Math.round(h / 3)))
      .map((i) => `M${f(-w / 2 + 2)} ${f(y - 2 - i * 3)}H${f(-w * 0.12)}M${f(w * 0.12)} ${f(y - 2 - i * 3)}H${f(w / 2 - 2)}`)
      .join('');
    tiers.push(body + `<path d="${hatch}" stroke="${P.faint}" stroke-width="0.3"/>` + door + eave);
    y = ey - 8;
    w = w / Math.sqrt(PHI);
  }
  const spireBase = y;
  const rings = range(9).map((i) => `<ellipse cx="0" cy="${f(spireBase - 4 - i * 3.6)}" rx="${f(5 - i * 0.3)}" ry="1.2" stroke="${P.ink}" stroke-width="0.5"/>`).join('');
  const jewelY = spireBase - 4 - 9 * 3.6 - 6;
  const spire = `<path d="M0 ${f(spireBase)}V${f(jewelY)}" stroke="${P.ink}" stroke-width="0.6"/>${rings}<circle cx="0" cy="${f(jewelY)}" r="3.6" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.9"/>`;
  const plinth = `<path d="M-64 ${f(GY)}L-58 ${f(GY - 10)}H58L64 ${f(GY)}Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/>`;
  const tower = plinth + tiers.join('') + spire;
  const rise = A
    ? `<g clip-path="url(#above)"><g><animateTransform attributeName="transform" type="translate" values="0 170;0 0" keyTimes="0;1" dur="4.2s" fill="freeze" calcMode="spline" keySplines="0.25 0 0.2 1"/>${tower}</g></g>`
    : tower;
  const glow = A
    ? `<circle cx="0" cy="${f(jewelY)}" r="6" stroke="${P.foil}" stroke-width="0.5" opacity="0"><animate attributeName="r" values="6;60" begin="4.2s" dur="4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.9;0" keyTimes="0;0.1;1" begin="4.2s" dur="4s" repeatCount="indefinite"/></circle>`
    : '';
  // 地面裂开的几道线
  const cracks = `<path d="M-70 ${f(GY + 3)}L-84 ${f(GY + 12)}L-96 ${f(GY + 14)}M70 ${f(GY + 3)}L86 ${f(GY + 10)}L92 ${f(GY + 18)}M-40 ${f(GY + 4)}L-46 ${f(GY + 16)}M38 ${f(GY + 4)}L48 ${f(GY + 15)}" stroke="${P.ink}" stroke-width="0.5"/>`;
  return {
    frame: { seeds: false },
    defs: `<clipPath id="above"><rect x="-190" y="-190" width="380" height="${f(GY + 190)}"/></clipPath>`,
    body: earth(P) + cracks + rise + glow,
  };
}

/** 维摩诘经:空无一物的方丈室,门是一个黄金矩形,地板的透视线收向黄金点;天女散花,花瓣飘落 */
function vimalakirti(P, A) {
  const a = 40; // 门宽 2a,高 2a·φ,上沿是半圆拱
  const top = GY - 2 * a * PHI;
  const door = `<path d="M${-a} ${f(GY)}V${f(top + a)}A${a} ${a} 0 0 1 ${a} ${f(top + a)}V${f(GY)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.8"/><path d="M${-a - 8} ${f(GY)}V${f(top + a)}A${a + 8} ${a + 8} 0 0 1 ${a + 8} ${f(top + a)}V${f(GY)}" stroke="${P.ink}" stroke-width="0.5"/>`;
  // 门里:地板透视线收向焦点(消失点 = 黄金点),后墙一条横线
  const backY = GY - 26;
  const floor = range(9)
    .map((i) => {
      const x = -a + (2 * a * i) / 8;
      const t = (backY - GY) / (FY - GY);
      return `M${f(x)} ${f(GY)}L${f(x + (0 - x) * t)} ${f(backY)}`;
    })
    .join('');
  const inner = `<g clip-path="url(#door)"><path d="${floor}" stroke="${P.faint}" stroke-width="0.4"/><path d="M${-a} ${f(backY)}H${a}" stroke="${P.ink}" stroke-width="0.45"/>${range(6)
    .map((i) => `<path d="M${-a} ${f(backY - 8 - i * 12)}H${a}" stroke="${P.faint}" stroke-width="0.3"/>`)
    .join('')}<circle cx="0" cy="${f(FY)}" r="2.2" fill="${P.foil}" stroke="none"/></g>`;
  const petals = [
    [-120, -150, 0], [-70, -170, 1.4], [-20, -160, 2.9], [40, -175, 0.7], [95, -155, 2.2], [135, -140, 3.6], [-140, -110, 4.4], [10, -130, 5.1],
  ];
  const fall = petals
    .map(([x, y, d], i) => {
      const p = petal(17, { stroke: i % 3 === 0 ? P.foil : P.ink, vein: P.faint, fill: P.paper, width: 0.55 });
      if (!A) {
        const yy = y + 60 + ((i * 47) % 150);
        return `<g transform="translate(${f(x + ((i * 13) % 20) - 10)} ${f(Math.min(yy, GY - 6))}) rotate(${(i * 67) % 360})">${p}</g>`;
      }
      const drift = i % 2 ? 26 : -26;
      return `<g transform="translate(${x} ${y})"><animateTransform attributeName="transform" type="translate" values="${x} ${y};${x + drift} ${f((y + GY) / 2)};${x} ${f(GY - 6)}" dur="9s" begin="${d}s" repeatCount="indefinite"/><g><animateTransform attributeName="transform" type="rotate" values="0;200;380" dur="9s" begin="${d}s" repeatCount="indefinite"/>${p}</g></g>`;
    })
    .join('');
  return {
    frame: { seeds: false },
    defs: `<clipPath id="door"><path d="M${-a} ${f(GY)}V${f(top + a)}A${a} ${a} 0 0 1 ${a} ${f(top + a)}V${f(GY)}Z"/></clipPath>`,
    body: earth(P) + door + inner + fall,
  };
}

/** 楞伽经:海中山顶的楞伽城;山下是心识之海,浪是一排排正弦波,永不停 */
function lankavatara(P, A) {
  const peak = FY + 6;
  const mountain = `<path d="M-118 ${f(GY)}C-84 ${f(GY - 10)} -56 ${f(peak + 34)} -32 ${f(peak + 5)}L0 ${f(peak)}L32 ${f(peak + 5)}C56 ${f(peak + 34)} 84 ${f(GY - 10)} 118 ${f(GY)}Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/>`;
  const hatch = `<g clip-path="url(#mtn)"><path d="${range(40)
    .map((i) => `M${f(-140 + i * 7)} ${f(GY)}L${f(-140 + i * 7 + 60)} ${f(peak - 10)}`)
    .join('')}" stroke="${P.faint}" stroke-width="0.35"/></g>`;
  // 山顶的城:三座塔,中间最高(高之比 1 : φ : 1)
  const tower = (x, h, w) =>
    `<rect x="${f(x - w / 2)}" y="${f(peak - h)}" width="${f(w)}" height="${f(h)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.55"/><path d="M${f(x - w / 2 - 2)} ${f(peak - h)}L${f(x)} ${f(peak - h - w * 0.8)}L${f(x + w / 2 + 2)} ${f(peak - h)}Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.55"/>${range(Math.floor(h / 6))
      .map((i) => `<path d="M${f(x - w / 2)} ${f(peak - 3 - i * 6)}H${f(x + w / 2)}" stroke="${P.faint}" stroke-width="0.3"/>`)
      .join('')}`;
  const city = `<path d="M-30 ${f(peak + 4)}H30V${f(peak - 6)}H-30Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.55"/>${tower(-18, 20, 11)}${tower(18, 20, 11)}${tower(0, 20 * PHI, 13)}<circle cx="0" cy="${f(peak - 20 * PHI - 13 * 0.8 - 4)}" r="2.2" fill="${P.foil}" stroke="none"/>`;
  // 海:六排正弦波,振幅与波长按 φ 递减
  const waves = range(6)
    .map((i) => {
      const y = GY + 6 + i * 8.5;
      const amp = 3.6 / PHI ** (i / 2);
      const lam = 34 / PHI ** (i / 3);
      let d = `M${f(-200 - lam)} ${f(y)}`;
      for (let x = -200 - lam; x <= 200 + lam; x += 2) d += `L${f(x)} ${f(y + amp * Math.sin((2 * Math.PI * x) / lam))}`;
      const move = A ? `<animateTransform attributeName="transform" type="translate" from="0 0" to="${f((i % 2 ? -1 : 1) * lam)} 0" dur="${f(3.4 + i * 0.6)}s" repeatCount="indefinite"/>` : '';
      return `<path d="${d}" stroke="${i === 0 ? P.ink : P.faint}" stroke-width="${i === 0 ? 0.55 : 0.45}">${move}</path>`;
    })
    .join('');
  return {
    frame: { seeds: false },
    defs: `<clipPath id="mtn"><path d="M-118 ${f(GY)}C-84 ${f(GY - 10)} -56 ${f(peak + 34)} -32 ${f(peak + 5)}L0 ${f(peak)}L32 ${f(peak + 5)}C56 ${f(peak + 34)} 84 ${f(GY - 10)} 118 ${f(GY)}Z"/></clipPath>`,
    body: waves + mountain + hatch + city,
  };
}

/** 薄伽梵歌:战车车轮 —— 轮心正好是黄金点,轮子落在地面上(半径 = 焦点到地面 = 89.6);8 粗 8 细辐条,慢慢转 */
function gita(P, A) {
  const R = GY - FY; // 89.6
  const spokes = range(16)
    .map((i) => {
      const a = (i / 16) * Math.PI * 2;
      const major = i % 2 === 0;
      const r0 = 18, r1 = R - 10;
      const s = Math.sin(a), c = -Math.cos(a);
      if (!major) return `<path d="M${f(r0 * s)} ${f(r0 * c)}L${f(r1 * s)} ${f(r1 * c)}" stroke="${P.ink}" stroke-width="0.45"/>`;
      // 粗辐条:两条平行线 + 中间一颗珠
      const nx = -c * 1.6, ny = s * 1.6;
      const m = (r0 + r1) / 2;
      return `<path d="M${f(r0 * s + nx)} ${f(r0 * c + ny)}L${f(r1 * s + nx)} ${f(r1 * c + ny)}M${f(r0 * s - nx)} ${f(r0 * c - ny)}L${f(r1 * s - nx)} ${f(r1 * c - ny)}" stroke="${P.ink}" stroke-width="0.6"/><circle cx="${f(m * s)}" cy="${f(m * c)}" r="3.2" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.6"/>`;
    })
    .join('');
  const rim = `<circle r="${f(R)}" fill="none" stroke="${P.ink}" stroke-width="0.9"/><circle r="${f(R - 10)}" stroke="${P.ink}" stroke-width="0.6"/>${range(48)
    .map((i) => {
      const a = (i / 48) * Math.PI * 2;
      return `<path d="M${f((R - 10) * Math.sin(a))} ${f(-(R - 10) * Math.cos(a))}L${f(R * Math.sin(a))} ${f(-R * Math.cos(a))}" stroke="${P.faint}" stroke-width="0.35"/>`;
    })
    .join('')}`;
  const hub = `<circle r="18" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/><circle r="${f(18 / PHI)}" stroke="${P.faint}" stroke-width="0.45"/><circle r="${f(18 / PHI ** 2)}" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.8"/>${range(8)
    .map((i) => {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      return `<circle cx="${f(14 * Math.sin(a))}" cy="${f(-14 * Math.cos(a))}" r="0.9" fill="${P.ink}" stroke="none"/>`;
    })
    .join('')}`;
  const ruts = `<path d="M-160 ${f(GY + 6)}H160M-160 ${f(GY + 11)}H160" stroke="${P.faint}" stroke-width="0.4" stroke-dasharray="8 5"/>`;
  return {
    frame: { seeds: false, rays: true },
    body: earth(P) + ruts + `<g transform="translate(0 ${f(FY)})"><g>${spin(36, 1, A)}${spokes}${rim}</g>${hub}</g>`,
  };
}

/** 瑜伽经:止息心的波动 —— 湖面的波纹振幅一路衰减到零,水面成镜,映出完整的月亮 */
function yoga(P, A) {
  const R = RADII[2];
  const moon = `<circle cx="0" cy="${f(FY)}" r="${f(R)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/>${range(21)
    .map((i) => {
      const y = FY - R + (2 * R * (i + 0.5)) / 21;
      const hw = Math.sqrt(Math.max(0, R * R - (y - FY) ** 2));
      return `<path d="M${f(-hw * 0.96)} ${f(y)}H${f(hw * 0.96)}" stroke="${P.faint}" stroke-width="0.3"/>`;
    })
    .join('')}<circle cx="0" cy="${f(FY)}" r="2.4" fill="${P.foil}" stroke="none"/>`;
  // 水面:同一条线的两个形状(起伏 / 平直),SMIL 在两者之间插值
  const surface = (amp, y) => {
    let d = '';
    for (let x = -170; x <= 170; x += 4) {
      const env = Math.exp(-((x / 120) ** 2));
      d += `${x === -170 ? 'M' : 'L'}${f(x)} ${f(y + amp * env * Math.sin(x / 7))}`;
    }
    return d;
  };
  const lines = range(7)
    .map((i) => {
      const y = GY + i * 7;
      const calm = surface(0, y);
      const rough = surface(5 / PHI ** (i / 2), y);
      const anim = A
        ? `<animate attributeName="d" values="${rough};${calm};${calm};${rough}" keyTimes="0;0.55;0.92;1" dur="10s" repeatCount="indefinite" calcMode="spline" keySplines="0.2 0 0.3 1;0 0 1 1;0.6 0 1 1"/>`
        : '';
      return `<path d="${A ? rough : calm}" stroke="${i === 0 ? P.ink : P.faint}" stroke-width="${i === 0 ? 0.6 : 0.4}">${anim}</path>`;
    })
    .join('');
  // 倒影:水平静下来时才完整出现
  const reflection = `<g opacity="${A ? 0 : 1}">${A ? '<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.4;0.6;0.9;1" dur="10s" repeatCount="indefinite"/>' : ''}${range(10)
    .map((i) => {
      const y = GY + 4 + i * 3.6;
      const dy = y - GY;
      const hw = Math.sqrt(Math.max(0, R * R - (dy * 1.15 - R * 0.05) ** 2)) * 0.9;
      return hw > 1 ? `<path d="M${f(-hw)} ${f(y)}H${f(hw)}" stroke="${P.foil}" stroke-width="0.5" stroke-dasharray="${i % 2 ? '4 2' : '0'}"/>` : '';
    })
    .join('')}</g>`;
  return { frame: { seeds: true }, body: moon + lines + reflection };
}

// ───────────────────────── 新增 15 部共用的小件 ─────────────────────────

/** 循环里依次亮起:t0 开始亮、t1 全亮、hold 后熄;元素本身 opacity="0" */
const glow = (dur, t0, t1, hold = 0.9) =>
  `<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;${f(t0)};${f(t1)};${f(hold)};1" dur="${dur}s" repeatCount="indefinite"/>`;

/** 从一点散开的金色圆环(r0 → r1),n 圈错开 */
const ripple = (P, cx, cy, r0, r1, dur, n = 3, width = 0.5) =>
  range(n)
    .map((k) => {
      const b = `begin="${f((k * dur) / n)}s" dur="${dur}s" repeatCount="indefinite"`;
      return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r0)}" stroke="${P.foil}" stroke-width="${width}" opacity="0"><animate attributeName="r" values="${f(r0)};${f(r1)}" ${b}/><animate attributeName="opacity" values="0;0.8;0" keyTimes="0;0.12;1" ${b}/></circle>`;
    })
    .join('');

/** 火焰:底在 (x,y),高 h;外焰描边、内焰一条线 */
const flame = (P, x, y, h, color, width = 0.6) =>
  `<path d="M${f(x)} ${f(y)}C${f(x + h * 0.26)} ${f(y - h * 0.22)} ${f(x + h * 0.22)} ${f(y - h * 0.6)} ${f(x)} ${f(y - h)}C${f(x - h * 0.22)} ${f(y - h * 0.6)} ${f(x - h * 0.26)} ${f(y - h * 0.22)} ${f(x)} ${f(y)}Z" fill="${P.paper}" stroke="${color}" stroke-width="${width}"/><path d="M${f(x)} ${f(y - h * 0.14)}C${f(x + h * 0.1)} ${f(y - h * 0.28)} ${f(x + h * 0.08)} ${f(y - h * 0.44)} ${f(x)} ${f(y - h * 0.62)}C${f(x - h * 0.08)} ${f(y - h * 0.44)} ${f(x - h * 0.1)} ${f(y - h * 0.28)} ${f(x)} ${f(y - h * 0.14)}Z" stroke="${color}" stroke-width="0.4"/>`;

/** 油灯:灯口中心在 (x,y),比例 s(直接乘坐标,线宽不跟着缩到看不见);火焰另画,底在 (x, y - 4s) */
function oilLamp(P, x, y, s, stroke) {
  const X = (v) => f(x + v * s);
  const Y = (v) => f(y + v * s);
  const w = f(Math.max(0.35, 0.65 * Math.min(1, s * 1.4)));
  const st = `fill="${P.paper}" stroke="${stroke}" stroke-width="${w}"`;
  return `<path d="M${X(-7)} ${Y(8)}L${X(-9)} ${Y(13)}H${X(9)}L${X(7)} ${Y(8)}" ${st}/><path d="M${X(-20)} ${Y(0)}Q${X(-17)} ${Y(10)} ${X(0)} ${Y(10)}Q${X(17)} ${Y(10)} ${X(20)} ${Y(0)}Z" ${st}/><ellipse cx="${X(0)}" cy="${Y(0)}" rx="${f(20 * s)}" ry="${f(3.4 * s)}" ${st}/><path d="M${X(0)} ${Y(-1)}V${Y(-4)}" stroke="${stroke}" stroke-width="${w}"/>`;
}

/** 一只张开的手:腕在 (0,0),指尖朝上,长 L;掌心一只眼(千手千眼) */
function hand(L, { stroke, eye, width, fill }) {
  const pw = L * 0.2; // 半掌宽
  const ph = L * 0.5; // 掌高
  const fw = pw * 0.48; // 指宽
  const fingers = [
    [-0.74, 0.36],
    [-0.25, 0.46],
    [0.25, 0.44],
    [0.74, 0.34],
  ]
    .map(([k, len]) => {
      const x = k * pw;
      return `<rect x="${f(x - fw / 2)}" y="${f(-ph - L * len + 1)}" width="${f(fw)}" height="${f(L * len + 2)}" rx="${f(fw / 2)}" transform="rotate(${f(k * 6)} ${f(x)} ${f(-ph)})" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
    })
    .join('');
  const thumb = `<rect x="${f(-fw / 2)}" y="${f(-L * 0.3)}" width="${f(fw * 1.05)}" height="${f(L * 0.3)}" rx="${f(fw / 2)}" transform="translate(${f(-pw * 0.9)} ${f(-ph * 0.3)}) rotate(-42)" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
  const palm = `<path d="M${f(-pw * 0.62)} 0C${f(-pw)} ${f(-ph * 0.35)} ${f(-pw * 1.05)} ${f(-ph * 0.8)} ${f(-pw)} ${f(-ph)}H${f(pw)}C${f(pw * 1.05)} ${f(-ph * 0.8)} ${f(pw)} ${f(-ph * 0.35)} ${f(pw * 0.62)} 0Z" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
  const ey = -ph * 0.55, ew = pw * 0.62;
  const eyeMark = `<path d="M${f(-ew)} ${f(ey)}Q0 ${f(ey - ew * 0.7)} ${f(ew)} ${f(ey)}Q0 ${f(ey + ew * 0.7)} ${f(-ew)} ${f(ey)}Z" stroke="${eye}" stroke-width="0.4"/><circle cx="0" cy="${f(ey)}" r="${f(ew * 0.3)}" fill="${eye}" stroke="none"/>`;
  return thumb + fingers + palm + eyeMark;
}

/** 一只卧着的鹿,朝右;原点在身体中间 */
function deer(P) {
  const st = (w) => `fill="${P.paper}" stroke="${P.ink}" stroke-width="${w}"`;
  const body = `<path d="M-30 6C-34 -6 -22 -14 -4 -14C14 -14 26 -10 30 0C32 8 24 12 10 12H-22C-28 12 -30 10 -30 6Z" ${st(0.6)}/>`;
  const hatch = `<path d="M-20 -6Q-4 -10 12 -6M-24 0Q-4 -4 18 0M-24 6Q-6 3 20 6" stroke="${P.faint}" stroke-width="0.35"/>`;
  const legs = `<path d="M8 12C16 15 26 15 34 12M-18 12C-24 15 -32 15 -38 11M-30 2L-36 -3" stroke="${P.ink}" stroke-width="0.55"/>`;
  const neck = `<path d="M14 -12C19 -25 24 -34 29 -42L41 -36C37 -26 33 -14 27 -4Z" ${st(0.6)}/>`;
  const head = `<path d="M29 -42C33 -50 43 -51 49 -45L57 -38C59 -35 56 -32 52 -33L41 -36Z" ${st(0.6)}/><circle cx="44" cy="-43" r="1" fill="${P.ink}" stroke="none"/>`;
  const ear = `<path d="M33 -46L24 -51L31 -44" ${st(0.5)}/>`;
  const antlers = `<path d="M36 -48C34 -60 30 -66 25 -74M32 -61L23 -63M29 -67L32 -75M40 -49C42 -61 46 -67 51 -74M43 -60L51 -62M47 -67L45 -76" stroke="${P.ink}" stroke-width="0.55"/>`;
  return antlers + legs + body + hatch + neck + head + ear;
}

/** 人的脚印:后跟在 (x,y),比例 s,脚尖朝上(往远处走) */
function footprint(P, x, y, s, color) {
  const sole = `<path d="M${f(x)} ${f(y)}C${f(x - 3.6 * s)} ${f(y)} ${f(x - 4.2 * s)} ${f(y - 4 * s)} ${f(x - 3.8 * s)} ${f(y - 7 * s)}C${f(x - 3.4 * s)} ${f(y - 10 * s)} ${f(x + 3.8 * s)} ${f(y - 10.5 * s)} ${f(x + 3.6 * s)} ${f(y - 6 * s)}C${f(x + 3.4 * s)} ${f(y - 3 * s)} ${f(x + 3 * s)} ${f(y)} ${f(x)} ${f(y)}Z" fill="${P.paper}" stroke="${color}" stroke-width="0.5"/>`;
  const toes = [-3.2, -1.6, 0, 1.5, 2.9]
    .map((dx, i) => `<circle cx="${f(x + dx * s)}" cy="${f(y - (12 + (i === 0 ? 0.6 : 0)) * s + Math.abs(dx + 0.4) * 0.35 * s)}" r="${f((i === 0 ? 1.1 : 0.8) * s)}" fill="${color}" stroke="none"/>`)
    .join('');
  return sole + toes;
}

// ───────────────────────── 新增 15 部 ─────────────────────────

/** 大悲咒:千手千眼 —— 内圈 13 只、外圈 21 只手像扇子一样张开,每只手掌心一只眼,中间一只大眼;观世音看见一切苦、伸手到一切处 */
function compassion(P, A) {
  const ring = (count, arm0, base, L, style, delay) =>
    range(count)
      .map((i) => {
        let a = (360 * i) / count + (count === 21 ? 360 / 42 : 0);
        if (a > 180) a -= 360;
        const anim = A
          ? `<animateTransform attributeName="transform" type="rotate" from="0" to="${f(a)}" begin="${delay}s" dur="3s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.3 0 0.2 1"/>`
          : '';
        const arm = `<path d="M-2.2 ${f(-arm0)}L${f(-L * 0.12)} ${f(-base)}M2.2 ${f(-arm0)}L${f(L * 0.12)} ${f(-base)}" stroke="${style.stroke}" stroke-width="${style.width}"/>`;
        return `<g transform="rotate(${A ? 0 : f(a)})">${anim}${arm}<g transform="translate(0 ${f(-base)})">${hand(L, style)}</g></g>`;
      })
      .join('');
  const outer = ring(21, 58, 80, 38, { stroke: P.faint, eye: P.ink, width: 0.5, fill: P.paper }, 0.2);
  const inner = ring(13, 27, 44, 52, { stroke: P.ink, eye: P.foil, width: 0.6, fill: P.paper }, 0.9);
  const ew = 20;
  const eye = `<circle r="27" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/><circle r="${f(27 / PHI ** 0.5)}" stroke="${P.faint}" stroke-width="0.4"/><path d="M${-ew} 0Q0 -17 ${ew} 0Q0 17 ${-ew} 0Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/><circle r="7.2" stroke="${P.ink}" stroke-width="0.6"/><circle r="${f(7.2 / PHI)}" stroke="${P.faint}" stroke-width="0.4"/><circle r="2.4" fill="${P.foil}" stroke="none"/>`;
  const halo = A ? ripple(P, 0, 0, 30, 110, 6.4, 2) : '';
  return {
    frame: { seeds: false },
    body: `<g transform="translate(0 ${f(FY)})">${halo}${outer}${inner}${eye}</g>`,
  };
}

/** 药师经:钵里盛着诃子(药果),钵上悬一颗琉璃宝珠,十二道光一道道亮起 —— 十二大愿 */
function medicine(P, A) {
  const R = 20;
  const outerPts = range(12).map((i) => [R * Math.sin((i * Math.PI) / 6), FY - R * Math.cos((i * Math.PI) / 6)]);
  const r2 = R / PHI;
  const innerPts = range(12).map((i) => [r2 * Math.sin(((i + 0.5) * Math.PI) / 6), FY - r2 * Math.cos(((i + 0.5) * Math.PI) / 6)]);
  const poly = (pts) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
  const facets = range(12)
    .map((i) => `M${f(outerPts[i][0])} ${f(outerPts[i][1])}L${f(innerPts[i][0])} ${f(innerPts[i][1])}L${f(outerPts[(i + 1) % 12][0])} ${f(outerPts[(i + 1) % 12][1])}`)
    .join('');
  const jewel = `<path d="${poly(outerPts)}" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.9"/><path d="${facets}" stroke="${P.faint}" stroke-width="0.4"/><path d="${poly(innerPts)}" stroke="${P.ink}" stroke-width="0.45"/><circle cx="0" cy="${f(FY)}" r="2.4" fill="${P.foil}" stroke="none"/>`;
  const rays = range(12)
    .map((i) => {
      const a = (i * Math.PI) / 6;
      const s = Math.sin(a), c = -Math.cos(a);
      const r0 = 30, r1 = 118;
      const ray = `<path d="M${f(r0 * s)} ${f(FY + r0 * c)}L${f(r1 * s)} ${f(FY + r1 * c)}" stroke="${P.foil}" stroke-width="0.6"/><circle cx="${f((r1 + 5) * s)}" cy="${f(FY + (r1 + 5) * c)}" r="2.6" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.6"/>`;
      const ghost = `<path d="M${f(r0 * s)} ${f(FY + r0 * c)}L${f(r1 * s)} ${f(FY + r1 * c)}" stroke="${P.faint}" stroke-width="0.4" stroke-dasharray="2 3"/>`;
      return A ? `${ghost}<g opacity="0">${glow(12, 0.04 + i * 0.05, 0.08 + i * 0.05)}${ray}</g>` : ray;
    })
    .join('');
  const glowRing = `<circle cx="0" cy="${f(FY)}" r="${f(RADII[2])}" stroke="${P.faint}" stroke-width="0.45" stroke-dasharray="1 3"/>`;
  // 钵:比心经的钵小,放在地面上,里面三颗诃子
  const rimY = GY - 4;
  const bowl = `<path d="M-44 ${f(rimY)}C-42 ${f(GY + 18)} -20 ${f(GY + 24)} 0 ${f(GY + 24)}C20 ${f(GY + 24)} 42 ${f(GY + 18)} 44 ${f(rimY)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.75"/>${range(6)
    .map((i) => {
      const t = (i + 1) / 7;
      const y = rimY + t * 26;
      const hw = 44 * Math.sqrt(1 - t * t * 0.8);
      return `<path d="M${f(-hw)} ${f(y)}Q0 ${f(y + 5)} ${f(hw)} ${f(y)}" stroke="${P.faint}" stroke-width="0.35"/>`;
    })
    .join('')}<ellipse cx="0" cy="${f(GY + 25)}" rx="14" ry="2.2" stroke="${P.ink}" stroke-width="0.5"/>`;
  const fruit = (x, tilt) =>
    `<g transform="translate(${x} ${f(rimY - 6)}) rotate(${tilt})"><ellipse rx="7" ry="11" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/><path d="M-3.5 -9.5Q-5 0 -3.5 9.5M0 -11V11M3.5 -9.5Q5 0 3.5 9.5" stroke="${P.faint}" stroke-width="0.35"/><path d="M0 -11q2 -4 6 -5" stroke="${P.ink}" stroke-width="0.5"/></g>`;
  const rim = `<path d="M-44 ${f(rimY)}A44 7 0 0 0 44 ${f(rimY)}" stroke="${P.ink}" stroke-width="0.75"/><path d="M-44 ${f(rimY)}A44 7 0 0 1 44 ${f(rimY)}" stroke="${P.ink}" stroke-width="0.6"/>`;
  return {
    frame: { seeds: false, rays: false },
    body: earth(P) + rays + glowRing + jewel + bowl + `<path d="M-44 ${f(rimY)}A44 7 0 0 1 44 ${f(rimY)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/>` + fruit(-17, -18) + fruit(17, 16) + fruit(0, 0) + rim,
  };
}

/** 普贤行愿品:沿黄金螺旋一盏接一盏的灯,由近到远依次点亮,越来越小、一直卷进极点 —— 愿无尽,供养无尽 */
function bhadracari(P, A) {
  // 对数螺旋:每转 90° 半径缩 φ,极点 = 焦点;灯每隔 60° 一盏
  const step = Math.PI / 3;
  const k0 = 0.5 * Math.PI; // 第一盏在极点正下方
  const R0 = 128;
  const at = (t) => {
    const r = R0 * PHI ** (-(t - k0) / (Math.PI / 2));
    return [r * Math.cos(t), FY + r * Math.sin(t), r];
  };
  let d = '';
  for (let t = k0; t <= k0 + 5.5 * Math.PI; t += 0.05) {
    const [x, y] = at(t);
    d += `${d ? 'L' : 'M'}${f(x)} ${f(y)}`;
  }
  const path = `<path d="${d}" stroke="${P.foil}" stroke-width="0.6" opacity="0.55"/>`;
  const N = 13;
  const lamps = range(N)
    .map((k) => {
      const [x, y, r] = at(k0 + k * step);
      const s = Math.max(0.12, (r / R0) * 1.05);
      const lamp = oilLamp(P, x, y, s, k < 7 ? P.ink : P.faint);
      const fl = flame(P, x, y - 4 * s, 24 * s, P.foil, Math.max(0.35, 0.6 * Math.min(1, s * 1.4)));
      const lit = A ? `<g opacity="0">${glow(13, 0.04 + k * 0.055, 0.08 + k * 0.055, 0.92)}${fl}</g>` : fl;
      return lamp + lit;
    })
    .join('');
  return {
    frame: { seeds: false, spiral: false },
    body: path + lamps + `<circle cx="0" cy="${f(FY)}" r="2.4" fill="${P.foil}" stroke="none"/>`,
  };
}

/** 中论:一条直路穿过「有」(左边实心的圆)和「无」(右边虚线的圆)之间,通向地平线上的黄金点;脚印一个个出现又消失 —— 去者不去,中道不落两边 */
function middleWay(P, A) {
  const H = FY; // 地平线
  const B = 168;
  const half = 30; // 近处路宽一半
  const ex = (y, side) => side * half * ((y - H) / (B - H));
  // 地面:透视线收向黄金点
  const grid = range(13)
    .map((i) => {
      const x = (i - 6) * 64;
      return x === 0 ? '' : `M${f(x)} ${B}L0 ${f(H)}`;
    })
    .join('');
  const ground = `<path d="${grid}" stroke="${P.faint}" stroke-width="0.35"/><path d="M${f(ex(B, -1))} ${B}L0 ${f(H)}L${f(ex(B, 1))} ${B}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/>`;
  // 两边:左「有」实,右「无」空
  const r = RADII[1];
  const cy = H - r * 0.38;
  const being = `<circle cx="-104" cy="${f(cy)}" r="${f(r)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/>${range(13)
    .map((i) => {
      const y = cy - r + (2 * r * (i + 0.5)) / 13;
      const hw = Math.sqrt(Math.max(0, r * r - (y - cy) ** 2)) * 0.94;
      return `<path d="M${f(-104 - hw)} ${f(y)}H${f(-104 + hw)}" stroke="${P.ink}" stroke-width="0.35"/>`;
    })
    .join('')}`;
  const nonBeing = `<circle cx="104" cy="${f(cy)}" r="${f(r)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6" stroke-dasharray="2 3"/>`;
  const cliff = ground + being + nonBeing;
  // 脊面:几道横线表示透视
  const ridge = range(9)
    .map((i) => {
      const t = ((i + 1) / 9) ** 1.8;
      const y = H + t * (B - H);
      return `M${f(ex(y, -1))} ${f(y)}H${f(ex(y, 1))}`;
    })
    .join('');
  const horizon = `<path d="M-170 ${f(H)}H170" stroke="${P.ink}" stroke-width="0.6"/>`;
  const steps = range(8)
    .map((k) => {
      const t = 0.92 * PHI ** (-k * 0.62);
      const y = H + t * (B - H);
      const s = t * 2.2;
      const side = k % 2 ? 1 : -1;
      const x = side * half * t * 0.38;
      const fp = footprint(P, x, y, s, k === 0 ? P.foil : P.ink);
      if (!A) return `<g opacity="${f(1 - k * 0.08)}">${fp}</g>`;
      const t0 = 0.04 + k * 0.08;
      return `<g opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;${f(t0)};${f(t0 + 0.03)};${f(t0 + 0.26)};1" dur="10s" repeatCount="indefinite"/>${fp}</g>`;
    })
    .join('');
  return {
    frame: { seeds: false },
    body: horizon + cliff + `<path d="${ridge}" stroke="${P.faint}" stroke-width="0.4"/>` + steps + `<circle cx="0" cy="${f(H)}" r="2.4" fill="${P.foil}" stroke="none"/>`,
  };
}

/** 唯识三十颂:种子一颗颗落进深井,井底是存了无数种子的「藏识」(阿赖耶识);上方是叶序排开的种子盘 —— 现行熏成种子,种子藏在识里 */
function thirtyVerses(P, A) {
  const W = 40; // 井内半宽
  const top = GY + 10;
  const ground = earth(P);
  const shaftBg = `<rect x="${-W - 9}" y="${f(GY)}" width="${2 * W + 18}" height="140" fill="${P.paper}" stroke="none"/>`;
  const bricks = [-1, 1]
    .map((side) => {
      const x0 = side * W, x1 = side * (W + 9);
      return range(16)
        .map((i) => {
          const y = top + i * 7;
          const mid = side * (W + (i % 2 ? 3 : 6));
          return `M${x0} ${f(y)}H${x1}M${mid} ${f(y)}V${f(y + 7)}`;
        })
        .join('') + `M${x0} ${f(top)}V170M${x1} ${f(GY)}V170`;
    })
    .join('');
  const shaft = `<path d="${bricks}" stroke="${P.faint}" stroke-width="0.4"/><path d="M${-W} ${f(top)}V170M${W} ${f(top)}V170" stroke="${P.ink}" stroke-width="0.55"/>`;
  // 井底的种子:黄金角排开,越往下越密
  const n = 89;
  const store = range(n)
    .map((i) => {
      const k = i + 1;
      const a = (k * GOLDEN_ANGLE * Math.PI) / 180;
      const r = Math.sqrt(k / n);
      const x = r * Math.cos(a) * (W - 6);
      const y = 140 + r * Math.sin(a) * 22;
      return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="1.4" ry="0.9" transform="rotate(${f((k * 37) % 180)} ${f(x)} ${f(y)})" fill="${P.ink}" stroke="none"/>`;
    })
    .join('');
  const store2 = `<ellipse cx="0" cy="140" rx="${W - 2}" ry="26" stroke="${P.faint}" stroke-width="0.4" stroke-dasharray="2 3"/>`;
  // 井栏:石圈,正面一段柱面
  const curb = `<path d="M-54 ${f(GY - 10)}V${f(GY + 2)}A54 10 0 0 0 54 ${f(GY + 2)}V${f(GY - 10)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/>${range(9)
    .map((i) => {
      const a = Math.PI * ((i + 0.5) / 9);
      const x = -54 * Math.cos(a);
      return `<path d="M${f(x)} ${f(GY - 10 + 10 * Math.sin(a))}V${f(GY + 2 + 10 * Math.sin(a))}" stroke="${P.faint}" stroke-width="0.4"/>`;
    })
    .join('')}<ellipse cx="0" cy="${f(GY - 10)}" rx="54" ry="10" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/><ellipse cx="0" cy="${f(GY - 10)}" rx="${W}" ry="6.6" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/><path d="M${-W + 4} ${f(GY - 8)}Q0 ${f(GY - 2)} ${W - 4} ${f(GY - 8)}" stroke="${P.faint}" stroke-width="0.4"/>`;
  const seed = (x, y, s = 1) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(2.4 * s)}" ry="${f(3.8 * s)}" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.7"/>`;
  const falling = A
    ? range(3)
        .map((k) => {
          const b = `begin="${f(k * 2)}s" dur="6s" repeatCount="indefinite"`;
          return `<g opacity="0"><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.1;0.82;0.9;1" ${b}/><animateTransform attributeName="transform" type="translate" values="0 0;0 ${f(GY - 10 - FY)}" calcMode="spline" keyTimes="0;1" keySplines="0.5 0 0.9 0.6" ${b}/>${seed(0, FY)}</g>`;
        })
        .join('')
    : [0, 1, 2].map((k) => seed(0, FY + 12 + k * 22, 1 - k * 0.1)).join('');
  const glowIn = A ? `<ellipse cx="0" cy="140" rx="10" ry="4" stroke="${P.foil}" stroke-width="0.5" opacity="0"><animate attributeName="rx" values="10;34" begin="1.6s" dur="2s" repeatCount="indefinite"/><animate attributeName="ry" values="4;20" begin="1.6s" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.8;0" begin="1.6s" dur="2s" repeatCount="indefinite"/></ellipse>` : '';
  return {
    frame: { seeds: true },
    body: ground + shaftBg + shaft + store2 + store + glowIn + falling + curb,
  };
}

/** 唯识二十论:一只眼睛,眼前飘着发丝和苍蝇 —— 眼翳的人看见的东西只在他的看见里:一眨眼,它们就跟着没了 */
function twentyVerses(P, A) {
  const a = 66, b = 30;
  const lid = (up, lo) => `M${-a} ${f(FY)}Q0 ${f(FY - up)} ${a} ${f(FY)}Q0 ${f(FY + lo)} ${-a} ${f(FY)}Z`;
  const open = lid(2 * b, 1.7 * b), shut = lid(-6, 8);
  const blinkAnim = A ? `<animate attributeName="d" values="${open};${open};${shut};${open};${open}" keyTimes="0;0.82;0.87;0.94;1" dur="8s" repeatCount="indefinite"/>` : '';
  const iris = `<circle cx="0" cy="${f(FY)}" r="25" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/>${range(34)
    .map((i) => {
      const t = (i / 34) * Math.PI * 2;
      return `<path d="M${f(10 * Math.cos(t))} ${f(FY + 10 * Math.sin(t))}L${f(24 * Math.cos(t + 0.12))} ${f(FY + 24 * Math.sin(t + 0.12))}" stroke="${P.faint}" stroke-width="0.35"/>`;
    })
    .join('')}<circle cx="0" cy="${f(FY)}" r="${f(25 / PHI)}" stroke="${P.faint}" stroke-width="0.4"/><circle cx="0" cy="${f(FY)}" r="9" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/>${range(9)
    .map((i) => {
      const y = FY - 9 + (18 * (i + 0.5)) / 9;
      const hw = Math.sqrt(Math.max(0, 81 - (y - FY) ** 2)) * 0.92;
      return `<path d="M${f(-hw)} ${f(y)}H${f(hw)}" stroke="${P.ink}" stroke-width="0.4"/>`;
    })
    .join('')}<circle cx="0" cy="${f(FY)}" r="2.4" fill="${P.foil}" stroke="none"/>`;
  const eye = `<path d="${open}" fill="${P.paper}" stroke="none">${blinkAnim}</path><g clip-path="url(#eyeball)">${iris}</g><path d="${open}" stroke="${P.ink}" stroke-width="0.8">${blinkAnim}</path><path d="M${-a - 6} ${f(FY - 4)}Q0 ${f(FY - 2 * b - 18)} ${a + 6} ${f(FY - 4)}" stroke="${P.faint}" stroke-width="0.5"/><path d="M${-a + 10} ${f(FY + 10)}Q0 ${f(FY + 1.7 * b + 6)} ${a - 10} ${f(FY + 10)}" stroke="${P.faint}" stroke-width="0.4"/>`;
  const hair = (x, y, len, rot) => {
    let d = '';
    for (let i = 0; i <= 24; i += 1) {
      const t = i / 24;
      d += `${i ? 'L' : 'M'}${f(x + (t - 0.5) * len)} ${f(y + 3.2 * Math.sin(t * Math.PI * 2.4))}`;
    }
    return `<path d="${d}" transform="rotate(${rot} ${x} ${y})" stroke="${P.ink}" stroke-width="0.5"/>`;
  };
  const fly = (x, y) =>
    `<ellipse cx="${x - 2.4}" cy="${y - 1.6}" rx="2.6" ry="1.4" transform="rotate(-30 ${x - 2.4} ${y - 1.6})" stroke="${P.ink}" stroke-width="0.4"/><ellipse cx="${x + 2.4}" cy="${y - 1.6}" rx="2.6" ry="1.4" transform="rotate(30 ${x + 2.4} ${y - 1.6})" stroke="${P.ink}" stroke-width="0.4"/><ellipse cx="${x}" cy="${y}" rx="1.3" ry="2.4" fill="${P.ink}" stroke="none"/>`;
  const floaters = [
    [hair(-96, -120, 46, -18), 9, -6],
    [hair(70, -128, 38, 24), -8, 8],
    [hair(-120, 4, 34, 32), 6, 10],
    [hair(104, 18, 44, -28), -10, -6],
    [hair(-30, 40, 30, 8), 8, 4],
    [fly(-58, -104), 12, 8],
    [fly(118, -72), -10, 10],
    [fly(40, 30), 8, -10],
    [fly(-132, -54), 6, -8],
  ]
    .map(([shape, dx, dy], i) => {
      if (!A) return shape;
      return `<g><animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy};0 0" dur="${f(11 + i * 1.3)}s" repeatCount="indefinite"/><g><animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.82;0.85;0.92;1" dur="8s" repeatCount="indefinite"/>${shape}</g></g>`;
    })
    .join('');
  return {
    frame: { seeds: false },
    defs: `<clipPath id="eyeball"><path d="${open}">${blinkAnim}</path></clipPath>`,
    body: eye + floaters,
  };
}

/** 因明入正理论:山上冒烟,所以山里有火 —— 烟看得见(实线),火是推出来的(金色虚线);烟一团团往上升 */
function logic(P, A) {
  const peak = 2;
  const mtn = `M-150 ${f(GY)}C-100 ${f(GY - 6)} -46 ${f(peak + 22)} -14 ${f(peak)}H14C46 ${f(peak + 22)} 100 ${f(GY - 6)} 150 ${f(GY)}Z`;
  const mountain = `<path d="${mtn}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/><g clip-path="url(#cone)"><path d="${range(34)
    .map((i) => `M${f(-150 + i * 6)} ${f(GY)}L${f(-150 + i * 6 + 34)} ${f(peak - 4)}`)
    .join('')}" stroke="${P.faint}" stroke-width="0.35"/></g>`;
  const crater = `<ellipse cx="0" cy="${f(peak)}" rx="14" ry="2.6" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/>`;
  // 推出来的火:山体里一朵虚线火焰
  const fire = `<g stroke-dasharray="2.4 2.2">${flame(P, 0, GY - 4, 36, P.foil, 0.7)}</g>`;
  const fireGlow = A ? `<g opacity="0.5"><animate attributeName="opacity" values="0.35;1;0.35" dur="3.2s" repeatCount="indefinite"/>${fire}</g>` : fire;
  // 烟:一串圆团,从山口往上,越高越大越淡
  // 一团烟:三个圆叠成的云团(半径 R),只用几何属性变大,线宽不变
  const lobes = (x, y, R) => [[-0.46, 0.16, 0.6], [0.46, 0.16, 0.6], [0, -0.34, 0.66]].map(([dx, dy, k]) => [x + dx * R, y + dy * R, k * R]);
  const puff = (x, y, R, op) => `<g opacity="${f(op)}">${lobes(x, y, R)
    .map(([cx, cy, r]) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.55"/>`)
    .join('')}<path d="M${f(x - R * 0.24)} ${f(y - R * 0.24)}A${f(R * 0.26)} ${f(R * 0.26)} 0 1 1 ${f(x + R * 0.16)} ${f(y + R * 0.06)}" stroke="${P.faint}" stroke-width="0.4"/></g>`;
  const path = [
    [0, peak - 3, 4],
    [3, -12, 7],
    [-3, -27, 9.5],
    [4, FY - 1, 12],
    [-5, -68, 14.5],
    [3, -96, 17],
    [-6, -128, 20],
    [2, -164, 23],
  ];
  const smoke = A
    ? range(7)
        .map((k) => {
          const b = `begin="${f(k * 1.4)}s" dur="9.8s" repeatCount="indefinite"`;
          const track = path.map(([x, y, R]) => lobes(x, y, R));
          const circles = range(3)
            .map((j) => {
              const v = (n) => track.map((t) => f(t[j][n])).join(';');
              return `<circle r="1" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.55"><animate attributeName="cx" values="${v(0)}" ${b}/><animate attributeName="cy" values="${v(1)}" ${b}/><animate attributeName="r" values="${v(2)}" ${b}/></circle>`;
            })
            .join('');
          return `<g opacity="0"><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.08;0.6;0.95;1" ${b}/>${circles}</g>`;
        })
        .reverse()
        .join('')
    : path.slice(0, 7).reverse().map(([x, y, R], i) => puff(x, y, R, 0.45 + i * 0.09)).join('');
  return {
    frame: { seeds: false },
    defs: `<clipPath id="cone"><path d="${mtn}"/></clipPath>`,
    body: earth(P) + smoke + mountain + fireGlow + crater,
  };
}

/** 佛所行赞:城门(桑奇式陀兰那:象柱头、三道横梁、梁头黄金涡卷、顶上法轮)外一条路,通向远处的菩提树;树上的光一圈圈散开 —— 出城,走向觉悟 */
function buddhacarita(P, A) {
  // 菩提叶:心形,长尾尖
  const leaf = (L) =>
    `<path d="M0 0C${f(-0.28 * L)} ${f(0.06 * L)} ${f(-0.46 * L)} ${f(-0.36 * L)} ${f(-0.13 * L)} ${f(-0.68 * L)}Q${f(-0.04 * L)} ${f(-0.8 * L)} 0 ${f(-L)}Q${f(0.04 * L)} ${f(-0.8 * L)} ${f(0.13 * L)} ${f(-0.68 * L)}C${f(0.46 * L)} ${f(-0.36 * L)} ${f(0.28 * L)} ${f(0.06 * L)} 0 0Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.5"/><path d="M0 0V${f(-0.8 * L)}" stroke="${P.faint}" stroke-width="0.35"/>`;
  const cy = FY;
  const canopy = [
    ...range(21).map((i) => [(360 * (i + 0.5)) / 21, 33, 13]),
    ...range(13).map((i) => [(360 * i) / 13, 21, 17]),
    ...range(8).map((i) => [(360 * (i + 0.5)) / 8, 8, 14]),
  ]
    .map(([a, r, L]) => `<g transform="rotate(${f(a)} 0 ${f(cy)}) translate(0 ${f(cy - r)})">${leaf(L)}</g>`)
    .join('');
  const trunk = `<path d="M-13 ${f(GY)}C-7 ${f(GY - 4)} -7 ${f(GY - 14)} -6 ${f(GY - 30)}C-5 ${f(cy + 40)} -4 ${f(cy + 30)} -3 ${f(cy + 18)}H3C4 ${f(cy + 30)} 5 ${f(cy + 40)} 6 ${f(GY - 30)}C7 ${f(GY - 14)} 7 ${f(GY - 4)} 13 ${f(GY)}Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/><path d="M-1 ${f(GY - 2)}Q-2 ${f(GY - 30)} 0 ${f(cy + 30)}M3 ${f(GY - 4)}Q4 ${f(GY - 20)} 2 ${f(GY - 36)}" stroke="${P.faint}" stroke-width="0.35"/>`;
  const tree = trunk + canopy + `<circle cx="0" cy="${f(cy)}" r="2.6" fill="${P.foil}" stroke="none"/>`;
  // 路:两条透视线收向树根
  const road = `<path d="M-60 170L-6 ${f(GY)}M60 170L6 ${f(GY)}" stroke="${P.ink}" stroke-width="0.55"/><path d="${range(7)
    .map((i) => {
      const t = ((i + 1) / 8) ** 1.7;
      const y = GY + t * (170 - GY);
      const hw = 6 + t * 54;
      return `M${f(-hw)} ${f(y)}H${f(hw)}`;
    })
    .join('')}" stroke="${P.faint}" stroke-width="0.4"/>`;
  // 桑奇式陀兰那(torana):两根方柱,柱头是背靠背的一对象;柱头上托三道横梁,梁中间微微拱起,
  // 两端伸出柱外卷成黄金涡卷;梁与梁之间是方墩和小立柱,顶上正中一只法轮、两旁三宝标
  const C = 66; // 柱中心
  const ink = (w) => `fill="${P.paper}" stroke="${P.ink}" stroke-width="${w}"`;
  const post = (x) => `<rect x="${x - 7}" y="-71" width="14" height="241" ${ink(0.7)}/><path d="M${x - 4.5} -67V170M${x + 4.5} -67V170${range(6)
    .map((i) => `M${x - 4.5} ${-30 + i * 40}H${x + 4.5}`)
    .join('')}" stroke="${P.faint}" stroke-width="0.35"/>`;
  // 一只象,朝右,脚底中点在 (0,0)
  const elephant = `<path d="M-8 0V-5C-9.5 -7 -9.5 -12 -5 -13.5C-1 -14.8 4 -14.5 6.5 -13C9 -15 12.5 -14 13 -10.5C13.4 -7.5 12.6 -5.5 12.8 -3C13 -1.2 14 -0.6 15 -1.2C13.6 -0.2 11.6 -0.8 11.4 -3.4C11.2 -5 10.8 -6 9.6 -6.6L8 -6V0H5.5V-4.2Q0 -5.4 -5 -4.2V0Z" ${ink(0.55)}/><path d="M6.5 -12.5C4 -11.5 4 -7.5 6.8 -6.6C8.4 -8 8.6 -11 6.5 -12.5Z" ${ink(0.45)}/><path d="M-9 -10Q-10.6 -8 -10 -5" stroke="${P.ink}" stroke-width="0.45"/><path d="M-1.5 -14.2Q-2.4 -9 -1.5 -4.8M1.5 -14.4Q0.8 -9 1.5 -5" stroke="${P.faint}" stroke-width="0.35"/><circle cx="10.6" cy="-11" r="0.55" fill="${P.ink}" stroke="none"/><path d="M11.6 -6.4L14 -5.6" stroke="${P.foil}" stroke-width="0.55"/>`;
  const capital = (x) => `<path d="M${x - 7} -71L${x - 10} -77H${x + 10}L${x + 7} -71Z" ${ink(0.55)}/><path d="M${x - 3.5} -71.5L${x - 5} -76.5M${x} -71.5V-76.5M${x + 3.5} -71.5L${x + 5} -76.5" stroke="${P.faint}" stroke-width="0.35"/><rect x="${x - 20}" y="-80" width="40" height="3" ${ink(0.55)}/><g transform="translate(${x + 8} -80)">${elephant}</g><g transform="translate(${x - 8} -80) scale(-1 1)">${elephant}</g>`;
  // 黄金涡卷:中心 (cx,cy),外半径 R,转一圈半半径缩 φ^6;s=1 右端顺时针卷进去
  const volute = (cx, cy, R, s) => {
    const b = Math.log(PHI) / (Math.PI / 2);
    const pts = range(55).map((i) => {
      const t = (i / 54) * 3 * Math.PI;
      const r = R * Math.exp(-b * t);
      return `${f(cx + s * r * Math.sin(t))} ${f(cy - r * Math.cos(t))}`;
    });
    return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" ${ink(0.6)}/><path d="M${pts.join('L')}" stroke="${P.foil}" stroke-width="0.6"/>`;
  };
  // 一道横梁:顶 y,半长 L(到涡卷中心),中间拱起 2
  const beam = (y, L, R) => {
    const h = 9;
    const body = `<path d="M${-L} ${y}Q0 ${y - 4} ${L} ${y}V${y + h}Q0 ${y + h - 4} ${-L} ${y + h}Z" ${ink(0.65)}/>`;
    const panel = `<path d="M${-L + R + 2} ${y + 2.2}Q0 ${y - 1.8} ${L - R - 2} ${y + 2.2}M${-L + R + 2} ${y + h - 2.2}Q0 ${y + h - 6.2} ${L - R - 2} ${y + h - 2.2}${[-C, -22, 22, C]
      .map((x) => {
        const yy = y - 2 * (1 - (x / L) ** 2);
        return `M${x} ${f(yy + 2.2)}V${f(yy + h - 2.2)}`;
      })
      .join('')}" stroke="${P.faint}" stroke-width="0.35"/>`;
    return body + panel + volute(-L, y + h / 2, R, -1) + volute(L, y + h / 2, R, 1);
  };
  // 梁与梁之间:柱位上的方墩 + 中间五根小立柱
  const tier = (y0, y1) => {
    const mid = (x) => y0 - 2 * (1 - (x / 90) ** 2);
    const blocks = [-C, C].map((x) => `<rect x="${x - 6}" y="${f(y1)}" width="12" height="${f(mid(x) - y1 + 0.5)}" ${ink(0.55)}/>`).join('');
    const balusters = [-40, -20, 0, 20, 40]
      .map((x) => `<rect x="${x - 1.6}" y="${f(y1)}" width="3.2" height="${f(mid(x) - y1 + 0.5)}" ${ink(0.45)}/>`)
      .join('');
    return blocks + balusters;
  };
  // 顶饰:正中法轮(八辐),两旁三宝标(triratna)
  const wy = -151;
  const wheelTop = `<path d="M-3 -141L-4.5 ${wy + 7}H4.5L3 -141Z" ${ink(0.5)}/><g transform="translate(0 ${wy})"><g>${spin(40, 1, A)}<circle r="8" ${ink(0.65)}/><circle r="${f(8 / PHI)}" stroke="${P.faint}" stroke-width="0.35"/><path d="${range(8)
    .map((i) => {
      const a = (i / 8) * Math.PI * 2;
      return `M${f(1.6 * Math.sin(a))} ${f(-1.6 * Math.cos(a))}L${f(7.2 * Math.sin(a))} ${f(-7.2 * Math.cos(a))}`;
    })
    .join('')}" stroke="${P.ink}" stroke-width="0.45"/><circle r="1.6" fill="${P.foil}" stroke="none"/></g></g>`;
  const triratna = (x) => `<g transform="translate(${x} -141)"><path d="M-1.6 0V-3.5H1.6V0" ${ink(0.45)}/><circle cy="-6" r="2.6" ${ink(0.5)}/><path d="M-2.4 -8C-6 -9 -6.2 -13.5 -3.6 -13.8M2.4 -8C6 -9 6.2 -13.5 3.6 -13.8M0 -8.6V-13.6" stroke="${P.ink}" stroke-width="0.55"/><circle cy="-6" r="0.9" fill="${P.foil}" stroke="none"/></g>`;
  const gate = post(-C) + post(C) + capital(-C) + capital(C) + tier(-106, -114) + tier(-123, -131)
    + beam(-106, 90, 7.2) + beam(-123, 87, 6.8) + beam(-140, 82, 6.4) + wheelTop + triratna(-42) + triratna(42);
  const halo = A ? ripple(P, 0, cy, 30, 120, 6, 3) : [1, 2].map((k) => `<circle cx="0" cy="${f(cy)}" r="${f(30 * PHI ** (k * 0.7))}" stroke="${P.foil}" stroke-width="0.45" opacity="${f(0.7 / k)}"/>`).join('');
  return {
    frame: { seeds: false },
    body: earth(P) + road + halo + tree + gate,
  };
}

/** 慈经:一双捧起的手护着一点光,慈心像水波一样一圈圈散开,没有边 —— 像母亲护着独子那样,把善意给一切众生 */
function metta(P, A) {
  const cy = FY + 4; // 光点
  // 一只捧起的手(左手;右手镜像):前臂从左下角伸进来,手掌弯成半只碗,手指在外上方收拢
  const Y = (v) => f(FY + v);
  const handPath = `M-128 170L-64 ${Y(48)}C-76 ${Y(30)} -78 ${Y(2)} -70 ${Y(-14)}C-66 ${Y(-22)} -55 ${Y(-22)} -51 ${Y(-15)}C-44 ${Y(0)} -24 ${Y(20)} -1 ${Y(24)}V${Y(40)}C-14 ${Y(54)} -28 ${Y(60)} -42 ${Y(64)}L-92 170`;
  const fingerLines = `M-69 ${Y(-6)}C-62 ${Y(-12)} -56 ${Y(-10)} -52 ${Y(-4)}M-71 ${Y(4)}C-62 ${Y(-2)} -54 ${Y(2)} -48 ${Y(8)}M-71 ${Y(14)}C-62 ${Y(8)} -52 ${Y(12)} -44 ${Y(16)}M-60 ${Y(46)}C-50 ${Y(40)} -36 ${Y(38)} -24 ${Y(40)}`;
  const oneHand = `<path d="${handPath}Z" fill="${P.paper}" stroke="none"/><path d="${handPath}" stroke="${P.ink}" stroke-width="0.75"/><path d="${fingerLines}" stroke="${P.faint}" stroke-width="0.45"/><g clip-path="url(#cup)"><path d="${range(18)
    .map((i) => `M${f(-130 + i * 8)} 170L${f(-130 + i * 8 + 60)} ${Y(20)}`)
    .join('')}" stroke="${P.faint}" stroke-width="0.3"/></g>`;
  const hands = `<g>${oneHand}</g><g transform="scale(-1 1)">${oneHand}</g>`;
  const cup = `${handPath}Z`;
  const light = `<circle cx="0" cy="${f(cy)}" r="11" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.9"/><circle cx="0" cy="${f(cy)}" r="${f(11 / PHI)}" stroke="${P.faint}" stroke-width="0.4"/><circle cx="0" cy="${f(cy)}" r="2.4" fill="${P.foil}" stroke="none"/>`;
  const rings = A
    ? ripple(P, 0, cy, 16, 170, 9, 4, 0.55)
    : [1, 2, 3, 4].map((k) => `<circle cx="0" cy="${f(cy)}" r="${f(14 * PHI ** k)}" stroke="${P.foil}" stroke-width="0.5" opacity="${f(0.9 - k * 0.15)}"/>`).join('');
  return {
    frame: { seeds: false, rays: false },
    defs: `<clipPath id="cup"><path d="${cup}Z"/></clipPath>`,
    body: rings + light + hands,
  };
}

/** 吉祥经:十级台阶一路向上通到黄金点,一级一级亮起 —— 吉祥不是兆头,是一条条做到的德行,最后一级是心不动 */
function mangala(P, A) {
  const N = 10;
  const steps = [];
  let y = 172, w = 112, h = 27;
  for (let k = 0; k < N; k += 1) {
    const w2 = w * 0.86;
    const tread = h * 0.32; // 踏面(俯看的梯形)
    steps.push({ y, w, w2, h, tread });
    y = y - h - tread;
    w = w2 * 0.98;
    h *= 0.86;
  }
  const topY = y;
  const draw = steps
    .map(({ y: yb, w: wb, w2, h: hh, tread }, k) => {
      const yr = yb - hh; // 立面顶
      const riser = `<path d="M${f(-wb)} ${f(yb)}V${f(yr)}H${f(wb)}V${f(yb)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/>`;
      const hatch = `<path d="${range(Math.max(1, Math.round(hh / 4)))
        .map((i) => `M${f(-wb + 2)} ${f(yb - 2 - i * 4)}H${f(wb - 2)}`)
        .join('')}" stroke="${P.faint}" stroke-width="0.3"/>`;
      const tr = `<path d="M${f(-wb)} ${f(yr)}L${f(-w2)} ${f(yr - tread)}H${f(w2)}L${f(wb)} ${f(yr)}Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.55"/>`;
      const edge = `<path d="M${f(-wb + 3)} ${f(yr)}H${f(wb - 3)}" stroke="${P.foil}" stroke-width="0.9"/>`;
      const lit = A ? `<g opacity="0">${glow(11, 0.04 + k * 0.06, 0.07 + k * 0.06, 0.9)}${edge}</g>` : `<g opacity="${f(0.45 + k * 0.05)}">${edge}</g>`;
      return riser + hatch + tr + lit;
    })
    .reverse()
    .join('');
  // 两侧扶墙
  const last = steps[N - 1];
  const wallL = `M${f(-steps[0].w - 8)} 172L${f(-last.w2 - 4)} ${f(topY)}`;
  const walls = `<path d="${wallL}M${f(steps[0].w + 8)} 172L${f(last.w2 + 4)} ${f(topY)}" stroke="${P.ink}" stroke-width="0.6"/>`;
  const sunY = FY;
  const sun = `<circle cx="0" cy="${f(sunY)}" r="${f(RADII[1])}" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.9"/><circle cx="0" cy="${f(sunY)}" r="${f(RADII[0])}" stroke="${P.faint}" stroke-width="0.4"/><circle cx="0" cy="${f(sunY)}" r="2.4" fill="${P.foil}" stroke="none"/>`;
  const sunGlow = A ? `<g opacity="0">${glow(11, 0.64, 0.7, 0.92)}${ripple(P, 0, sunY, 24, 80, 3.2, 2)}</g>` : '';
  return {
    frame: { seeds: false },
    body: sun + sunGlow + draw + walls,
  };
}

/** 转法轮经:鹿野苑 —— 八辐法轮立在柱头上,两只鹿卧在两旁;轮子转起来,内圈十二颗珠是四谛三转十二行相 */
function dhammacakka(P, A) {
  const R = 46;
  const spokes = range(8)
    .map((i) => {
      const a = (i / 8) * Math.PI * 2;
      const s = Math.sin(a), c = -Math.cos(a);
      const r0 = 13, r1 = R - 7;
      const nx = -c, ny = s;
      const m = r0 + (r1 - r0) * 0.38;
      // 辐条:中段鼓起的梭形
      return `<path d="M${f(r0 * s)} ${f(r0 * c)}L${f(m * s + nx * 2.6)} ${f(m * c + ny * 2.6)}L${f(r1 * s)} ${f(r1 * c)}L${f(m * s - nx * 2.6)} ${f(m * c - ny * 2.6)}Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/>`;
    })
    .join('');
  const rim = `<circle r="${R}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.9"/><circle r="${R - 7}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/>${range(34)
    .map((i) => {
      const a = (i / 34) * Math.PI * 2;
      return `<path d="M${f((R - 7) * Math.sin(a))} ${f(-(R - 7) * Math.cos(a))}L${f(R * Math.sin(a))} ${f(-R * Math.cos(a))}" stroke="${P.faint}" stroke-width="0.35"/>`;
    })
    .join('')}`;
  const hub = `<circle r="13" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/>${range(12)
    .map((i) => {
      const a = (i / 12) * Math.PI * 2;
      return `<circle cx="${f(9.4 * Math.sin(a))}" cy="${f(-9.4 * Math.cos(a))}" r="1.1" fill="${P.foil}" stroke="none"/>`;
    })
    .join('')}<circle r="${f(13 / PHI ** 2)}" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.8"/>`;
  const wheel = `<g transform="translate(0 ${f(FY)})"><g>${spin(48, 1, A)}${rim}${spokes}${hub}</g></g>`;
  // 柱头:方板 + 倒覆莲 + 台座
  const top = FY + R;
  const capital = `<rect x="-26" y="${f(top)}" width="52" height="7" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/><path d="M-16 ${f(top + 7)}C-18 ${f(top + 16)} -28 ${f(top + 24)} -30 ${f(top + 30)}H30C28 ${f(top + 24)} 18 ${f(top + 16)} 16 ${f(top + 7)}Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/><path d="${range(9)
    .map((i) => {
      const x = -24 + i * 6;
      return `M${f(x * 0.55)} ${f(top + 8)}Q${f(x * 0.9)} ${f(top + 20)} ${f(x)} ${f(top + 29)}`;
    })
    .join('')}" stroke="${P.faint}" stroke-width="0.4"/><rect x="-38" y="${f(top + 30)}" width="76" height="${f(GY - top - 30)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/><path d="M-38 ${f(top + 36)}H38" stroke="${P.faint}" stroke-width="0.4"/>`;
  const deerL = `<g transform="translate(-104 ${f(GY - 13)}) scale(0.9)">${deer(P)}</g>`;
  const deerR = `<g transform="translate(104 ${f(GY - 13)}) scale(-0.9 0.9)">${deer(P)}</g>`;
  return {
    frame: { seeds: false },
    body: earth(P) + capital + wheel + deerL + deerR,
  };
}

/** 大念处经:四个套在一起的框(身、受、心、法),正中一个圆随呼吸一张一缩 —— 一呼一吸都清清楚楚地看着 */
function satipatthana(P, A) {
  const frames = [18, 29, 47, 76]
    .map((h, k) => {
      const inner = h - 4;
      const color = k === 0 ? P.foil : P.ink;
      const corners = [-1, 1]
        .flatMap((sx) => [-1, 1].map((sy) => `<circle cx="${f(sx * (h + 0))}" cy="${f(FY + sy * h)}" r="${k === 3 ? 1.9 : 1.2}" fill="${k === 3 ? P.foil : P.ink}" stroke="none"/>`))
        .join('');
      return `<rect x="${-h}" y="${f(FY - h)}" width="${2 * h}" height="${2 * h}" stroke="${color}" stroke-width="${k === 0 ? 0.8 : 0.65}"/><rect x="${-inner}" y="${f(FY - inner)}" width="${2 * inner}" height="${2 * inner}" stroke="${P.faint}" stroke-width="0.4"/>${corners}`;
    })
    .join('');
  // 框与框之间的排线,像一层层的衬底
  const hatch = `<path d="${range(30)
    .map((i) => {
      const y = FY - 76 + 4 + i * 5;
      return `M-72 ${f(y)}H-51M51 ${f(y)}H72`;
    })
    .join('')}" stroke="${P.faint}" stroke-width="0.3"/>`;
  const ease = 'calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"';
  const breath = A
    ? `<circle cx="0" cy="${f(FY)}" r="5" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.8"><animate attributeName="r" values="5;12.5;5" dur="8s" repeatCount="indefinite" ${ease}/></circle><circle cx="0" cy="${f(FY)}" r="8" stroke="${P.foil}" stroke-width="0.4" opacity="0.6"><animate attributeName="r" values="8;${f(RADII[4] * 0.9)};8" dur="8s" repeatCount="indefinite" ${ease}/><animate attributeName="opacity" values="0.6;0.15;0.6" dur="8s" repeatCount="indefinite" ${ease}/></circle>`
    : `<circle cx="0" cy="${f(FY)}" r="12.5" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.8"/>`;
  // 地上一条呼吸的起伏线:四口气
  let wave = '';
  for (let x = -150; x <= 150; x += 3) {
    const env = Math.cos((x / 150) * (Math.PI / 2));
    wave += `${x === -150 ? 'M' : 'L'}${x} ${f(GY + 34 - 9 * env * Math.sin((x / 300) * Math.PI * 8))}`;
  }
  return {
    frame: { seeds: false },
    body: hatch + frames + breath + `<circle cx="0" cy="${f(FY)}" r="2.4" fill="${P.foil}" stroke="none"/>` + `<path d="M-170 ${f(GY + 34)}H170" stroke="${P.faint}" stroke-width="0.4"/><path d="${wave}" stroke="${P.ink}" stroke-width="0.55"/>`,
  };
}

/** 法句经:洪水里的一座小岛,岛上一盏灯;水一阵阵涨上来,总漫不过岛顶 —— 「智者以精进、不放逸、自制,为自己造一座洪水淹不没的岛」 */
function dhammapada(P, A) {
  const top = FY + 24;
  const isl = `M-112 ${f(GY + 30)}C-80 ${f(GY - 6)} -54 ${f(top + 16)} -26 ${f(top + 4)}C-12 ${f(top - 2)} 12 ${f(top - 2)} 26 ${f(top + 4)}C54 ${f(top + 16)} 80 ${f(GY - 6)} 112 ${f(GY + 30)}Z`;
  const island = `<path d="${isl}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/><g clip-path="url(#isle)"><path d="${range(30)
    .map((i) => `M${f(-100 + i * 7)} ${f(GY + 30)}L${f(-100 + i * 7 + 40)} ${f(top - 6)}`)
    .join('')}" stroke="${P.faint}" stroke-width="0.35"/><path d="M-50 ${f(top + 26)}l10 -4l8 3M18 ${f(top + 20)}l12 -3l6 4M-20 ${f(top + 44)}l14 -2" stroke="${P.ink}" stroke-width="0.45"/></g>`;
  const lampY = top - 1;
  const lamp = oilLamp(P, 0, lampY - 8, 0.9, P.ink) + flame(P, 0, lampY - 11.6, 24, P.foil, 0.7);
  const lampGlow = A ? ripple(P, 0, FY, 10, 70, 5, 2, 0.45) : `<circle cx="0" cy="${f(FY)}" r="${f(RADII[2])}" stroke="${P.foil}" stroke-width="0.45" opacity="0.6"/>`;
  // 洪水:七排浪,每排一个填纸色的形状,压住岛脚
  const waves = range(7)
    .map((i) => {
      const y = GY + 4 + i * 9;
      const amp = 4.2 / PHI ** (i / 3);
      const lam = 30 / PHI ** (i / 4);
      let d = `M${f(-200 - lam)} 200L${f(-200 - lam)} ${f(y)}`;
      for (let x = -200 - lam; x <= 200 + lam; x += 2) d += `L${f(x)} ${f(y - amp * Math.abs(Math.sin((Math.PI * x) / lam)))}`;
      d += `L${f(200 + lam)} 200Z`;
      const move = A ? `<animateTransform attributeName="transform" type="translate" from="0 0" to="${f((i % 2 ? -1 : 1) * lam)} 0" dur="${f(2.6 + i * 0.5)}s" repeatCount="indefinite"/>` : '';
      return `<path d="${d}" fill="${P.paper}" stroke="${i < 2 ? P.ink : P.faint}" stroke-width="${i < 2 ? 0.6 : 0.45}">${move}</path>`;
    })
    .join('');
  const surge = A
    ? `<g><animateTransform attributeName="transform" type="translate" values="0 8;0 -16;0 8" dur="9s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>${waves}</g>`
    : `<g transform="translate(0 -8)">${waves}</g>`;
  // 远处的水平线
  const far = `<path d="M-170 ${f(GY - 2)}H-90M90 ${f(GY - 2)}H170M-160 ${f(GY - 8)}H-110M110 ${f(GY - 8)}H160" stroke="${P.faint}" stroke-width="0.4"/>`;
  return {
    frame: { seeds: false },
    defs: `<clipPath id="isle"><path d="${isl}"/></clipPath>`,
    body: far + lampGlow + island + lamp + surge,
  };
}

/** 数论颂:原质(三股缠成的根)像舞者一样展开二十三谛 —— 觉、我慢、十一根、五唯、五大 —— 在静观不动的原人面前展开又收回 */
function samkhya(P, A) {
  const rx = 0, ry = 140; // 原质的根
  const lv = [
    { r: 26, n: 1 },
    { r: 48, n: 1 },
    { r: 74, n: 11 },
    { r: 100, n: 5 },
    { r: 124, n: 5 },
  ];
  const span = (n, wide) => (n === 1 ? [0] : range(n).map((i) => -wide + (2 * wide * i) / (n - 1)));
  const pos = (r, a) => [rx + r * Math.sin((a * Math.PI) / 180), ry - r * Math.cos((a * Math.PI) / 180)];
  const nodes = [];
  const angles = [span(1, 0), span(1, 0), span(11, 72), span(5, 40), span(5, 50)];
  lv.forEach((L, k) => angles[k].forEach((a) => nodes.push({ k, a, p: pos(L.r, a) })));
  const at = (k) => nodes.filter((n) => n.k === k);
  const edges = [];
  edges.push([[rx, ry], at(0)[0].p, 0]);
  edges.push([at(0)[0].p, at(1)[0].p, 1]);
  at(2).forEach((n) => edges.push([at(1)[0].p, n.p, 2]));
  at(3).forEach((n) => edges.push([at(1)[0].p, n.p, 3]));
  at(3).forEach((n, i) => edges.push([n.p, at(4)[i].p, 4]));
  const level = (k) => {
    const lines = edges
      .filter((e) => e[2] === k)
      .map(([a, b]) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`)
      .join('');
    const dots = at(k)
      .map((n) => `<circle cx="${f(n.p[0])}" cy="${f(n.p[1])}" r="${k < 2 ? 4 : k === 4 ? 3.4 : 2.6}" fill="${P.paper}" stroke="${k === 4 ? P.ink : k < 2 ? P.ink : P.ink}" stroke-width="0.6"/>${k < 2 ? `<circle cx="${f(n.p[0])}" cy="${f(n.p[1])}" r="1.3" fill="${P.ink}" stroke="none"/>` : ''}`)
      .join('');
    const body = `<path d="${lines}" stroke="${k === 2 ? P.faint : P.ink}" stroke-width="${k === 2 ? 0.5 : 0.55}"/>${dots}`;
    if (!A) return body;
    const t0 = 0.04 + k * 0.08;
    return `<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${f(t0)};${f(t0 + 0.08)};${f(0.86 - k * 0.07)};${f(0.94 - k * 0.07)};1" dur="14s" repeatCount="indefinite"/><g transform="translate(${rx} ${ry})"><g><animateTransform attributeName="transform" type="scale" values="0.2;0.2;1;1;0.2;0.2" keyTimes="0;${f(t0)};${f(t0 + 0.08)};${f(0.86 - k * 0.07)};${f(0.94 - k * 0.07)};1" dur="14s" repeatCount="indefinite"/><g transform="translate(${-rx} ${-ry})">${body}</g></g></g></g>`;
  };
  // 扇面:几道淡的弧,像舞裙的褶
  const folds = lv.map((L) => {
    const [x0, y0] = pos(L.r, -78);
    const [x1, y1] = pos(L.r, 78);
    return `M${f(x0)} ${f(y0)}A${L.r} ${L.r} 0 0 1 ${f(x1)} ${f(y1)}`;
  }).join('');
  // 原质的根:三股(三德)缠成一颗
  const root = `<circle cx="${rx}" cy="${ry}" r="11" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.7"/>${[0, 120, 240]
    .map((a, i) => `<path d="M${rx} ${ry - 9}C${rx + 7} ${ry - 4} ${rx - 7} ${ry + 4} ${rx} ${ry + 9}" transform="rotate(${a} ${rx} ${ry})" stroke="${[P.foil, P.ink, P.faint][i]}" stroke-width="0.6"/>`)
    .join('')}`;
  // 原人:不动的观者,只是一只静静看着的眼,不连着任何线
  const seer = `<circle cx="0" cy="${f(FY)}" r="${f(RADII[1])}" fill="${P.paper}" stroke="${P.foil}" stroke-width="0.9"/><path d="M-15 ${f(FY)}Q0 ${f(FY - 11)} 15 ${f(FY)}Q0 ${f(FY + 11)} -15 ${f(FY)}Z" stroke="${P.ink}" stroke-width="0.6"/><circle cx="0" cy="${f(FY)}" r="4.4" stroke="${P.ink}" stroke-width="0.5"/><circle cx="0" cy="${f(FY)}" r="2.2" fill="${P.foil}" stroke="none"/><circle cx="0" cy="${f(FY)}" r="${f(RADII[2])}" stroke="${P.faint}" stroke-width="0.4"/>`;
  return {
    frame: { seeds: false },
    body: `<path d="${folds}" stroke="${P.faint}" stroke-width="0.4" stroke-dasharray="2 3"/>` + range(5).map(level).join('') + root + seer,
  };
}

/** 奥义书(蛙氏):「唵」的三个音 A、U、M 是醒、梦、熟睡三层,像三只碗一层层亮起;响完之后只剩一点 —— 第四位,寂静 */
function upanishads(P, A) {
  const arc = (r) => `M${f(-r)} ${f(FY)}A${f(r)} ${f(r)} 0 0 0 ${f(r)} ${f(FY)}`;
  const radii = [RADII[4], RADII[3], RADII[2]]; // A 醒(最外)→ U 梦 → M 熟睡
  const bowls = radii
    .map((r, i) => {
      const base = `<path d="${arc(r)}" stroke="${P.ink}" stroke-width="0.75"/><path d="${arc(r + 3.4)}${arc(r - 3.4)}" stroke="${P.faint}" stroke-width="0.4"/>${[-1, 1].map((s) => `<circle cx="${f(s * r)}" cy="${f(FY)}" r="1.9" fill="${P.ink}" stroke="none"/>`).join('')}`;
      const lit = `<path d="${arc(r)}" stroke="${P.foil}" stroke-width="1.1"/>`;
      if (!A) return base;
      const t0 = 0.05 + i * 0.17;
      return `${base}<g opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;${f(t0)};${f(t0 + 0.04)};${f(t0 + 0.2)};1" dur="12s" repeatCount="indefinite"/>${lit}</g>`;
    })
    .join('');
  // 半月 + 一点(第四位)
  const cres = `<path d="M-15 ${f(FY + 6)}A16 16 0 0 0 15 ${f(FY + 6)}A20 20 0 0 1 -15 ${f(FY + 6)}Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.6"/>`;
  const by = FY - 6;
  const bindu = `<circle cx="0" cy="${f(by)}" r="4.2" fill="${P.foil}" stroke="none"/>`;
  const still = A
    ? `<g opacity="0">${glow(12, 0.6, 0.66, 0.95)}${ripple(P, 0, by, 6, 60, 2.6, 2, 0.45)}<circle cx="0" cy="${f(by)}" r="9" stroke="${P.foil}" stroke-width="0.6"/></g>`
    : `<circle cx="0" cy="${f(by)}" r="9" stroke="${P.foil}" stroke-width="0.6"/>`;
  // 水平的一条静线:声音落下后的寂静
  const hush = `<path d="M-170 ${f(FY)}H${f(-RADII[4] - 10)}M${f(RADII[4] + 10)} ${f(FY)}H170" stroke="${P.faint}" stroke-width="0.45"/>`;
  return {
    frame: { seeds: true },
    body: hush + bowls + cres + still + bindu,
  };
}

const SUBJECTS = {
  lotus,
  'heart-sutra': heart,
  'diamond-sutra': diamond,
  'amitabha-sutra': amitabha,
  'larger-sukhavati': sukhavati,
  'lotus-sutra': lotusSutra,
  'vimalakirti-sutra': vimalakirti,
  'lankavatara-sutra': lankavatara,
  'bhagavad-gita': gita,
  'yoga-sutras': yoga,
  'great-compassion-mantra': compassion,
  'medicine-buddha': medicine,
  bhadracari,
  'middle-way-verses': middleWay,
  'thirty-verses': thirtyVerses,
  'twenty-verses': twentyVerses,
  'gateway-to-logic': logic,
  buddhacarita,
  'metta-sutta': metta,
  'mangala-sutta': mangala,
  dhammacakka,
  satipatthana,
  dhammapada,
  'samkhya-karika': samkhya,
  upanishads,
};
export const SCENE_NAMES = Object.keys(SUBJECTS);

export function sceneSvg(name, { palette = 'light', animate = true } = {}) {
  const P = typeof palette === 'string' ? PALETTES[palette] : palette;
  const s = SUBJECTS[name](P, animate);
  const defs = DEFS.replace('</defs>', `${s.defs ?? ''}</defs>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-190 -190 380 380" fill="none" stroke-linecap="round" stroke-linejoin="round">${defs}${frame(P, animate, s.frame)}${clipped(s.body)}</svg>`;
}

/**
 * 首页封面墙用的线稿:静止,颜色跟封面墨色走(paper = 封面底色,实心件才不会露白)。
 * 原图按 380px 画,线宽 0.4–0.9;封面上只有 150–400px,所以线宽改成不随缩放变,再整体加粗到屏幕上看得见。
 */
export function coverSceneSvg(name, { bg, ink, foil }) {
  const rgba = (hex, a) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',')},${a})`;
  const svg = sceneSvg(name, { palette: { ink: rgba(ink, 0.78), faint: rgba(ink, 0.26), foil, paper: bg }, animate: false });
  return svg
    .replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(Number(w) * 1.5).toFixed(2)}"`)
    .replace(/(<svg[^>]*>)/, '$1<style>*{vector-effect:non-scaling-stroke}</style>');
}
