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
};
export const SCENE_NAMES = Object.keys(SUBJECTS);

export function sceneSvg(name, { palette = 'light', animate = true } = {}) {
  const P = PALETTES[palette];
  const s = SUBJECTS[name](P, animate);
  const defs = DEFS.replace('</defs>', `${s.defs ?? ''}</defs>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-190 -190 380 380" fill="none" stroke-linecap="round" stroke-linejoin="round">${defs}${frame(P, animate, s.frame)}${clipped(s.body)}</svg>`;
}
