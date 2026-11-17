/*
 * mandala-core.js — 曼陀罗花纹章生成器(零依赖)。
 *
 * 一枚花纹章 = 一条「主曲线」(内/外旋轮线、Maurer 玫瑰、玫瑰线)画在中心,外面按这条曲线
 * 自己的旋转对称阶 N 一圈圈铺出:扭索纹族、辐条、N 角星、两排花瓣、扇贝带、珠环。
 * 公式只用来「生成形状」,图里不出现任何文字。
 *
 * 同一份源码两处用:
 *   - 浏览器:<script src="mandala-core.js"></script> → window.Mandala(file:// 也能开)
 *   - Node:  import Mandala from './mandala-core.js'(CommonJS 默认导出)
 *
 * 出处:Eden 仓库 app/kaleido.ts(2026-09-29 全站花纹章骨架),这里是它的通用版。
 */
(function (root) {
  'use strict';

  var gcd = function (a, b) { return b ? gcd(b, a % b) : Math.abs(a); };
  var n2 = function (v) { return Math.abs(v) < 0.005 ? '0' : v.toFixed(2); };
  var f2 = function (v) { return v.toFixed(2); };
  /** 极坐标 → SVG 坐标,角度 0 指向正上方、顺时针 */
  var polar = function (r, a) { return [r * Math.sin(a), -r * Math.cos(a)]; };

  /**
   * 曲线的点,缩放到最远点正好落在半径 radius 上。
   * curve: { kind: 'hypo'|'epi', R, r, d } | { kind: 'maurer', n, deg } | { kind: 'rose', k, n? }
   */
  function curvePoints(curve, radius) {
    var pts = [];
    var i, t, x, y, th, rr;
    if (curve.kind === 'hypo' || curve.kind === 'epi') {
      var R = curve.R, r = curve.r, d = curve.d;
      var turns = r / gcd(R, r);
      var steps = Math.min(2400, Math.round(360 * turns));
      for (i = 0; i <= steps; i += 1) {
        t = (i / steps) * Math.PI * 2 * turns;
        if (curve.kind === 'hypo') {
          x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
          y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
        } else {
          x = (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t);
          y = (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t);
        }
        pts.push([x, y]);
      }
    } else if (curve.kind === 'maurer') {
      for (i = 0; i <= 360; i += 1) {
        th = (i * curve.deg * Math.PI) / 180;
        rr = Math.sin(curve.n * th);
        pts.push([rr * Math.cos(th), rr * Math.sin(th)]);
      }
    } else if (curve.kind === 'rose') {
      var n = curve.n || 1;
      var period = Math.PI * 2 * n;
      for (i = 0; i <= 1440; i += 1) {
        th = (i / 1440) * period;
        rr = Math.cos((curve.k / n) * th);
        pts.push([rr * Math.cos(th), rr * Math.sin(th)]);
      }
    } else {
      throw new Error('未知曲线 kind: ' + curve.kind);
    }
    var max = 0;
    pts.forEach(function (p) { max = Math.max(max, Math.hypot(p[0], p[1])); });
    max = max || 1;
    return pts.map(function (p) { return [(p[0] / max) * radius, (p[1] / max) * radius]; });
  }

  function pathOf(pts) {
    return 'M' + pts.map(function (p) { return n2(p[0]) + ' ' + n2(p[1]); }).join('L');
  }

  /** 旋转对称阶:图案绕中心重复几次。外圈的花瓣、珠、星都按它来,限制在 8 ~ 24。 */
  function symmetryOf(curve) {
    var n;
    if (curve.kind === 'hypo' || curve.kind === 'epi') n = curve.R / gcd(curve.R, curve.r);
    else if (curve.kind === 'maurer') n = curve.n % 2 ? curve.n : curve.n * 2;
    else n = curve.k % 2 ? curve.k : curve.k * 2;
    while (n < 8) n *= 2;
    return Math.min(n, 24);
  }

  /** 参数体检:返回问题列表(空 = 没问题)。 */
  function lint(spec) {
    var out = [];
    [['primary', spec.primary], ['family', spec.family]].forEach(function (pair) {
      var c = pair[1], name = pair[0];
      if (!c) { out.push(name + ' 缺失'); return; }
      if (c.kind === 'hypo' || c.kind === 'epi') {
        if (!(c.R > 0 && c.r > 0)) out.push(name + ':R、r 必须是正整数');
        if (c.kind === 'hypo' && c.R === c.r) out.push(name + ':内旋轮线 R = r 会退化成一个点');
        if (c.d === 0) out.push(name + ':d = 0 只剩一个圆');
        if (Math.round(c.R) !== c.R || Math.round(c.r) !== c.r) out.push(name + ':R、r 用整数,否则曲线不闭合');
        if (c.r / gcd(c.R, c.r) > 6) out.push(name + ':r / gcd(R, r) > 6,要绕很多圈,线会糊成一片');
      }
      if (c.kind === 'maurer' && name === 'primary' && c.deg % 360 === 0) out.push(name + ':deg 是 360 的倍数,只剩一个点');
    });
    if (spec.copies != null && (spec.copies < 3 || spec.copies > 10)) out.push('copies 建议 3 ~ 10(太少不成族,太多糊成面)');
    return out;
  }

  /** 墨色三档:ink 实线 / foil 金箔 / faint 淡线。只有这三种颜色。 */
  var PALETTES = {
    light: { ink: 'rgba(40,52,44,0.36)', foil: 'rgba(184,134,47,0.85)', faint: 'rgba(40,52,44,0.18)' },
    dark: { ink: 'rgba(239,232,218,0.3)', foil: 'rgba(242,207,122,0.75)', faint: 'rgba(239,232,218,0.14)' },
  };

  /**
   * 完整的花纹章 SVG(viewBox -190 -190 380 380)。
   * spec: { primary, family, copies }
   * opts: { palette?: 'light'|'dark'|{ink,foil,faint}, animate?: boolean(默认 true) }
   * animate = true 时:主曲线 3.2s 描出来(SMIL),三圈慢速正反转(260 / 420 / 600s)。
   */
  function mandalaSvg(spec, opts) {
    opts = opts || {};
    var pal = typeof opts.palette === 'object' ? opts.palette : PALETTES[opts.palette || 'light'];
    var animate = opts.animate !== false;
    var N = symmetryOf(spec.primary);
    var step = (Math.PI * 2) / N;
    var family = pathOf(curvePoints(spec.family, 88));
    var primary = pathOf(curvePoints(spec.primary, 72));
    // Maurer 玫瑰是 360 条弦:按旋轮线的线宽画会糊成一块实心墨团,只能用发丝线
    var dense = spec.primary.kind === 'maurer';
    // 扭索纹族若是 Maurer 玫瑰,同理:发丝线、最多 3 份,否则中心糊成一团(Eden 的按路径派生章有这个问题)
    var denseFamily = spec.family.kind === 'maurer';
    var copiesN = Math.max(1, spec.copies || 6);
    if (denseFamily) copiesN = Math.min(copiesN, 3);
    var famStep = 360 / copiesN / 3;
    var copies = '';
    for (var c = 0; c < copiesN; c += 1) copies += '<path d="' + family + '" transform="rotate(' + (c * famStep).toFixed(2) + ')"/>';
    var draw = animate
      ? '<animate attributeName="stroke-dashoffset" from="1" to="0" dur="3.2s" fill="freeze" calcMode="spline" keySplines="0.45 0 0.25 1" keyTimes="0;1"/>'
      : '';
    var spin = function (dur, dir) {
      return animate
        ? '<animateTransform attributeName="transform" type="rotate" from="0" to="' + 360 * dir + '" dur="' + dur + 's" repeatCount="indefinite"/>'
        : '';
    };
    var rings = [178, 168, 150, 118, 88, 40, 14].map(function (r) { return '<circle r="' + r + '"/>'; }).join('');

    var i, p, q;
    // 珠环:外沿 4N 颗小珠,每第四颗是大金珠
    var beads = '';
    for (i = 0; i < N * 4; i += 1) {
      p = polar(173, (i * step) / 4);
      beads += i % 4
        ? '<circle cx="' + f2(p[0]) + '" cy="' + f2(p[1]) + '" r="0.9" fill="' + pal.ink + '"/>'
        : '<circle cx="' + f2(p[0]) + '" cy="' + f2(p[1]) + '" r="2.1" fill="' + pal.foil + '"/>';
    }
    // 扇贝带:2N 个互相重叠的圆串在 r = 159 上(一条「生命之花」带)
    var sr = 159 * Math.sin(Math.PI / (2 * N)) * 1.3;
    var scallops = '';
    for (i = 0; i < N * 2; i += 1) {
      p = polar(159, (i * step) / 2);
      scallops += '<circle cx="' + f2(p[0]) + '" cy="' + f2(p[1]) + '" r="' + f2(sr) + '"/>';
    }
    // 花瓣:N 片鱼形(vesica)从 r = 118 到 150,中间一道叶脉,尖上一颗金点;
    // 第二排错开半格,从 92 到 128
    var petal = function (r0, r1, widthK) {
      var mid = (r0 + r1) / 2;
      var w = mid * Math.sin(step / 2) * widthK;
      return 'M0 ' + -r0 + 'Q' + f2(w) + ' ' + -mid + ' 0 ' + -r1 + 'Q' + f2(-w) + ' ' + -mid + ' 0 ' + -r0 + 'Z';
    };
    var outerPetal = petal(118, 150, 1.05);
    var innerPetal = petal(92, 128, 0.8);
    var petals = '', innerPetals = '', tips = '';
    for (i = 0; i < N; i += 1) {
      petals += '<g transform="rotate(' + f2((i * 360) / N) + ')"><path d="' + outerPetal + '"/><path d="M0 -121L0 -146" opacity="0.6"/></g>';
      innerPetals += '<path d="' + innerPetal + '" transform="rotate(' + f2((i + 0.5) * (360 / N)) + ')"/>';
      p = polar(153.5, i * step);
      q = polar(118, i * step);
      tips += '<circle cx="' + f2(p[0]) + '" cy="' + f2(p[1]) + '" r="1.7"/><circle cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" r="1.4"/>';
    }
    // 星形多边形 {N/k},穿过花瓣根部;k 取 ≈ 0.3N 且与 N 互质,一笔画完
    var k = Math.max(2, Math.round(N * 0.3));
    while (gcd(N, k) !== 1 && k > 1) k -= 1;
    var starPts = [];
    for (i = 0; i <= N; i += 1) starPts.push(polar(118, ((i * k) % N) * step).map(f2).join(' '));
    var star = 'M' + starPts.join('L');
    // 辐条(心 → 星,长短交替)与中心一圈 N 颗种子
    var spokes = '', seeds = '';
    for (i = 0; i < N * 2; i += 1) {
      p = polar(40, (i * step) / 2);
      q = polar(i % 2 ? 58 : 88, (i * step) / 2);
      spokes += 'M' + f2(p[0]) + ' ' + f2(p[1]) + 'L' + f2(q[0]) + ' ' + f2(q[1]);
    }
    for (i = 0; i < N; i += 1) {
      p = polar(27, i * step);
      seeds += '<circle cx="' + f2(p[0]) + '" cy="' + f2(p[1]) + '" r="1.5"/>';
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-190 -190 380 380">'
      + '<g fill="none" stroke="' + pal.faint + '" stroke-width="0.6">' + rings + '</g>'
      + '<g>' + spin(420, -1) + beads + '<g fill="none" stroke="' + pal.faint + '" stroke-width="0.55">' + scallops + '</g></g>'
      + '<g fill="none" stroke="' + pal.ink + '" stroke-width="0.6">' + spin(600, 1) + petals + '<g stroke="' + pal.faint + '">' + innerPetals + '</g></g>'
      + '<path d="' + star + '" fill="none" stroke="' + pal.faint + '" stroke-width="0.6"/>'
      + '<g fill="' + pal.foil + '">' + tips + '</g>'
      + '<path d="' + spokes + '" stroke="' + pal.faint + '" stroke-width="0.5"/>'
      + '<g fill="none" stroke="' + pal.ink + '" stroke-width="' + (denseFamily ? 0.22 : 0.5) + '"' + (denseFamily ? ' opacity="0.75"' : '') + '>' + spin(260, 1) + copies + '</g>'
      + '<g fill="none" stroke="' + pal.foil + '" stroke-width="' + (dense ? 0.55 : 0.95) + '" opacity="' + (dense ? 0.7 : 1) + '" stroke-linecap="round">'
      + '<path d="' + primary + '" pathLength="1" stroke-dasharray="1" stroke-dashoffset="' + (animate ? 1 : 0) + '">' + draw + '</path></g>'
      + '<g fill="' + pal.ink + '">' + seeds + '</g><circle r="3" fill="' + pal.foil + '"/>'
      + '</svg>';
  }

  /** 分隔小章(viewBox -32 -32 64 64):扭索纹族曲线包着主曲线,放在两节之间。 */
  function dividerSvg(spec, opts) {
    opts = opts || {};
    var pal = typeof opts.palette === 'object' ? opts.palette : PALETTES[opts.palette || 'light'];
    var outer = pathOf(curvePoints(spec.family, 28));
    var inner = pathOf(curvePoints(spec.primary, 16));
    var dense = spec.primary.kind === 'maurer';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-32 -32 64 64">'
      + '<circle r="30" fill="none" stroke="' + pal.faint + '" stroke-width="0.6"/>'
      + '<path d="' + outer + '" fill="none" stroke="' + pal.ink + '" stroke-width="0.6"/>'
      + '<path d="' + inner + '" fill="none" stroke="' + pal.foil + '" stroke-width="' + (dense ? 0.35 : 0.9) + '"/>'
      + '<circle r="1.6" fill="' + pal.foil + '"/>'
      + '</svg>';
  }

  /** 放进 CSS 的 data URI:background-image: <这个>; */
  function dataUri(svg) { return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")'; }

  /**
   * 由任意字符串(路由、项目名)确定性地派生一枚章,保证「每个页面都不一样、每次打开都一样」。
   *
   * 分布照 Eden 手挑的 23 组来(见 CATALOG):主曲线六成是内/外旋轮线、两成 Maurer 玫瑰、两成玫瑰线;
   * 扭索纹族一律是细的旋轮线(圈数 ≤ 3、d 小),而且和主曲线「内外相反」。
   * 不照搬 Eden 的 fallbackSpec:那里扭索纹族用 Maurer,中心会糊;还用了带符号的 >>,长路径会出负数参数。
   */
  function specFromSeed(seed) {
    var h = 2166136261;
    String(seed).split('').forEach(function (ch) { h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; });
    // mulberry32:由哈希播种的小 PRNG,比位移取模分布均匀
    var rand = function () {
      h = (h + 0x6d2b79f5) >>> 0;
      var t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var int = function (lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); };
    var trochoid = function (kind, Rlo, Rhi, maxTurns, dK) {
      var R = int(Rlo, Rhi), r;
      do { r = int(1, R - 1); } while (r / gcd(R, r) > maxTurns || (kind === 'hypo' && R / gcd(R, r) < 3));
      var d = Math.round(Math.max(1, dK * (kind === 'hypo' ? R - r : r) * 2 + rand())) / 2;
      return { kind: kind, R: R, r: r, d: d };
    };
    var pick = rand(), primary;
    if (pick < 0.6) primary = trochoid(rand() < 0.5 ? 'hypo' : 'epi', 5, 12, 5, 0.55 + rand() * 0.35);
    else if (pick < 0.8) primary = { kind: 'maurer', n: int(4, 8), deg: [19, 29, 37, 47, 71, 97, 121][int(0, 6)] };
    else {
      var k = int(3, 7), n;
      do { n = int(2, 7); } while (gcd(k, n) !== 1);
      primary = { kind: 'rose', k: k, n: n };
    }
    var famKind = primary.kind === 'hypo' ? 'epi' : 'hypo';
    var family = trochoid(famKind, 4, 11, 3, 0.25 + rand() * 0.25);
    return { primary: primary, family: family, copies: int(5, 9) };
  }

  /** 'epi:5,3,5' / 'hypo:7,2,1.2' / 'maurer:6,71' / 'rose:4,7' → 曲线对象 */
  function parseCurve(text) {
    var m = /^(hypo|epi|maurer|rose):([\d.,\s]+)$/.exec(String(text).trim());
    if (!m) throw new Error('曲线写法:hypo:R,r,d | epi:R,r,d | maurer:n,deg | rose:k[,n] —— 收到 "' + text + '"');
    var v = m[2].split(',').map(Number);
    if (m[1] === 'hypo' || m[1] === 'epi') return { kind: m[1], R: v[0], r: v[1], d: v[2] };
    if (m[1] === 'maurer') return { kind: 'maurer', n: v[0], deg: v[1] };
    return v.length > 1 ? { kind: 'rose', k: v[0], n: v[1] } : { kind: 'rose', k: v[0] };
  }

  function curveText(c) {
    if (c.kind === 'hypo' || c.kind === 'epi') return c.kind + ':' + c.R + ',' + c.r + ',' + c.d;
    if (c.kind === 'maurer') return 'maurer:' + c.n + ',' + c.deg;
    return 'rose:' + c.k + (c.n ? ',' + c.n : '');
  }

  /** Eden 全站用过的 23 组曲线对(每页一组,互不重复),可以直接挑。 */
  var CATALOG = [
    ['/', 'epi:5,3,5', 'hypo:7,2,1.2', 7], ['/project', 'epi:8,3,5', 'hypo:9,4,3', 6],
    ['/etreporthub', 'hypo:7,3,4.5', 'epi:6,1,2', 5], ['/etreporthub-sales', 'maurer:6,71', 'hypo:5,2,3', 8],
    ['/igaming', 'hypo:10,3,6', 'epi:7,2,3', 6], ['/igaming/full', 'epi:11,4,7', 'hypo:8,3,2', 6],
    ['/igaming/cases', 'maurer:5,97', 'hypo:6,1,2.5', 7], ['/dr-racing', 'hypo:9,4,6', 'epi:4,1,1.5', 8],
    ['/poker', 'epi:7,4,6', 'hypo:11,3,5', 5], ['/life-os', 'hypo:11,4,7', 'epi:5,2,2', 6],
    ['/jiju-pet', 'hypo:8,5,5', 'epi:3,1,1.2', 9], ['/jiju-revamp', 'rose:4,7', 'hypo:7,3,2', 6],
    ['/brand-guide', 'epi:9,4,7', 'hypo:5,3,1.5', 7], ['/life', 'maurer:4,97', 'epi:8,3,2', 6],
    ['/project-css', 'hypo:12,5,8', 'epi:6,5,4', 5], ['/wiki', 'rose:5,4', 'hypo:8,3,4', 6],
    ['/notes', 'epi:6,5,4', 'hypo:9,2,1.5', 7], ['/film-gallery', 'maurer:7,19', 'epi:5,1,2', 6],
    ['/penneys-game', 'hypo:5,3,2', 'epi:7,5,3', 8], ['/conways-game-of-life', 'rose:7,3', 'hypo:10,7,5', 5],
    ['/cellular-automata-lab', 'maurer:8,29', 'hypo:6,5,3', 6], ['/icon-prompts', 'epi:10,3,7', 'hypo:4,1,1', 8],
    ['/project/miya', 'epi:5,2,3', 'hypo:11,4,3', 6],
  ].map(function (row) { return { name: row[0], primary: parseCurve(row[1]), family: parseCurve(row[2]), copies: row[3] }; });

  var api = {
    curvePoints: curvePoints, pathOf: pathOf, symmetryOf: symmetryOf, lint: lint,
    PALETTES: PALETTES, mandalaSvg: mandalaSvg, dividerSvg: dividerSvg, dataUri: dataUri,
    specFromSeed: specFromSeed, parseCurve: parseCurve, curveText: curveText, CATALOG: CATALOG,
  };
  root.Mandala = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
