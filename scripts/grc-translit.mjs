// 希腊文（带气号、重音的古希腊文写法）-> 罗马转写，机械生成，给不认识希腊字母的人照着念。
// 规则（学界通行的那一套，不标重音）：
//   η = ē，ω = ō，υ 单独是 y、在双元音里是 u（au、eu、ou、ēu、ui），θ φ χ ψ = th ph ch ps，
//   γ 在 γ κ ξ χ 前面读鼻音写 n，粗气号写 h（双元音上的气号标在第二个字母，h 仍写在最前面），ῥ = rh，
//   下标的 ι（ᾳ ῃ ῳ）写成 āi ēi ōi，分音符照写（ϊ = ï），大写照原文。
// 标点：希腊文的上点「·」相当于分号，「;」是问号。
// 用法：import { grcTranslit } from './grc-translit.mjs'

const BASE = {
  α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x',
  ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'ō',
};
const VOWELS = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω']);
const ROUGH = '̔';
const DIAERESIS = '̈';
const IOTA_SUB = 'ͅ';
const SUBSCRIPT = { α: 'āi', η: 'ēi', ω: 'ōi' };
const PUNCT = { '·': ';', '·': ';', ';': '?', ';': '?' };
const isMark = (c) => /\p{M}/u.test(c);

export function grcTranslit(text) {
  // 拆成「字母 + 它头上的符号」一个个单元；不是希腊字母的原样带过
  const units = [];
  for (const c of text.normalize('NFD')) {
    if (isMark(c) && units.length && units.at(-1).base) units.at(-1).marks.add(c);
    else {
      const lower = c.toLowerCase();
      if (BASE[lower]) units.push({ base: lower, upper: c !== lower, marks: new Set() });
      else units.push({ raw: c });
    }
  }
  const isVowel = (u) => Boolean(u?.base) && VOWELS.has(u.base);
  let out = '';
  units.forEach((u, i) => {
    if (!u.base) {
      out += PUNCT[u.raw] ?? u.raw;
      return;
    }
    const prev = units[i - 1];
    const next = units[i + 1];
    let s = BASE[u.base];
    if (u.base === 'υ' && !u.marks.has(DIAERESIS)) {
      const afterVowel = isVowel(prev) && ['α', 'ε', 'ο', 'η'].includes(prev.base);
      const beforeIota = next?.base === 'ι' && !next.marks.has(DIAERESIS);
      if (afterVowel || beforeIota) s = 'u';
    }
    if (u.base === 'γ' && ['γ', 'κ', 'ξ', 'χ'].includes(next?.base)) s = 'n';
    if (u.marks.has(IOTA_SUB) && SUBSCRIPT[u.base]) s = SUBSCRIPT[u.base];
    if (u.marks.has(DIAERESIS)) s = u.base === 'ι' ? 'ï' : 'ÿ';
    if (u.base === 'ρ' && u.marks.has(ROUGH)) s = 'rh';
    // 粗气号：单个元音上的直接加 h；双元音的气号标在第二个字母上，h 要写到第一个字母前面
    const wordStart = !prev?.base;
    if (isVowel(u) && wordStart && (u.marks.has(ROUGH) || (isVowel(next) && next.marks.has(ROUGH)))) s = `h${s}`;
    if (u.upper) s = s[0].toUpperCase() + s.slice(1);
    out += s;
  });
  return out.normalize('NFC');
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(grcTranslit(process.argv.slice(2).join(' ')));
