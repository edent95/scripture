// 罗马转写(IAST,梵文与巴利文通用)-> 天城体。纯规则、零依赖。
// 用途:原典底本(GRETIL、SuttaCentral)多半只有罗马转写,天城体由这里机械生成,避免手抄出错。
// 巴利文的天城体写法照缅甸第六次结集(VRI)版:同一套字母,ḷ 用 ळ,ṃ 用 ं。
// CLI:node scripts/iast-to-deva.mjs <面板书库 json>  —— 把每段 sa.text 为空的补上天城体(就地改写)。

const VOWELS = [
  ['ai', 'ऐ', 'ै'], ['au', 'औ', 'ौ'],
  ['ā', 'आ', 'ा'], ['ī', 'ई', 'ी'], ['ū', 'ऊ', 'ू'], ['ṝ', 'ॠ', 'ॄ'], ['ṛ', 'ऋ', 'ृ'], ['ḹ', 'ॡ', 'ॣ'], ['ḷ̥', 'ऌ', 'ॢ'],
  ['a', 'अ', ''], ['i', 'इ', 'ि'], ['u', 'उ', 'ु'], ['e', 'ए', 'े'], ['o', 'ओ', 'ो'],
];
const CONSONANTS = [
  ['kh', 'ख'], ['gh', 'घ'], ['ch', 'छ'], ['jh', 'झ'], ['ṭh', 'ठ'], ['ḍh', 'ढ'], ['th', 'थ'], ['dh', 'ध'], ['ph', 'फ'], ['bh', 'भ'],
  ['k', 'क'], ['g', 'ग'], ['ṅ', 'ङ'], ['c', 'च'], ['j', 'ज'], ['ñ', 'ञ'], ['ṭ', 'ट'], ['ḍ', 'ड'], ['ṇ', 'ण'],
  ['t', 'त'], ['d', 'द'], ['n', 'न'], ['p', 'प'], ['b', 'ब'], ['m', 'म'], ['y', 'य'], ['r', 'र'], ['l', 'ल'], ['ḷ', 'ळ'], ['v', 'व'],
  ['ś', 'श'], ['ṣ', 'ष'], ['s', 'स'], ['h', 'ह'],
];
const MARKS = [['ṃ', 'ं'], ['ṁ', 'ं'], ['ḥ', 'ः'], ['m̐', 'ँ'], ["'", 'ऽ'], ['’', 'ऽ']];
const DIGITS = '०१२३४५६७८९';
const VIRAMA = '्';

/** 一段 IAST -> 天城体。不认识的字(标点、空格、连字符)原样保留;「|」「||」「.」句读转成 । ॥。 */
export function iastToDeva(input, { pali = false } = {}) {
  const s = input.normalize('NFC').toLowerCase().replace(/m̐/g, 'm̐');
  let out = '';
  let i = 0;
  let pendingConsonant = false; // 上一个字是辅音、还没接元音
  const match = (table) => table.find(([k]) => s.startsWith(k, i));
  while (i < s.length) {
    const c = match(CONSONANTS);
    // 「ai」「au」只有在不是 a+i 分写(a-i)时才算复合元音;IAST 里分写会用连字符或分音符,这里按字面
    const v = match(VOWELS);
    if (c && !(v && v[0].length > c[0].length)) {
      if (pendingConsonant) out += VIRAMA;
      out += c[1];
      pendingConsonant = true;
      i += c[0].length;
      continue;
    }
    if (v) {
      out += pendingConsonant ? v[2] : v[1];
      pendingConsonant = false;
      i += v[0].length;
      continue;
    }
    // 巴利文没有 avagraha:’ 和 ' 是引号(kāyo’ti),当标点原样保留
    const m = pali && (s[i] === "'" || s[i] === '’') ? undefined : match(MARKS);
    if (m) {
      if (pendingConsonant) out += VIRAMA;
      out += m[1];
      pendingConsonant = false;
      i += m[0].length;
      continue;
    }
    // 复合词连字符在天城体里不写,而且不断开辅音和后面的元音(mad-arthe -> मदर्थे)
    if (s[i] === '-') { i += 1; continue; }
    if (pendingConsonant) {
      out += VIRAMA;
      pendingConsonant = false;
    }
    const ch = s[i];
    if (s.startsWith('||', i)) { out += '॥'; i += 2; continue; }
    if (ch === '|') { out += '।'; i += 1; continue; }
    if (ch >= '0' && ch <= '9') { out += DIGITS[ch.charCodeAt(0) - 48]; i += 1; continue; }
    out += ch;
    i += 1;
  }
  if (pendingConsonant) out += VIRAMA;
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const file = process.argv[2];
  if (!file) {
    console.error('用法:node scripts/iast-to-deva.mjs <面板书库 json>');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(file, 'utf8'));
  // 巴利文书(面板 id 以 pi- 开头)每次全部重新生成;梵文书只补空的
  const pali = /(^|\/)pi-[^/]*\.json$/.test(file);
  let filled = 0;
  for (const ch of data.chapters) for (const b of ch.blocks) if (b.t === 'sa' && b.tr?.trim() && (pali || !b.text?.trim())) { b.text = iastToDeva(b.tr, { pali }); filled++; }
  writeFileSync(file, `${JSON.stringify(data, null, 1)}\n`);
  console.log(`补了 ${filled} 段天城体 -> ${file}`);
}
