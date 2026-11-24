// 带全部读音符号的阿拉伯文 -> 罗马转写(机械生成,和 iast-to-deva.mjs 一样不靠人手)。
// 输入用 Tanzil 的 Simple(通行拼写)本:它的长元音、哈姆宰、短剑 alif 都写得规整,机械转写才靠得住;
// 页面上显示的是 Uthmani 本,两份逐节对应。写法按读音:冠词遇太阳字母同化(ar-raḥmāni),
// 词首的连读 alif 在前缀后省掉(wal-jibāla、bil-ḥaqqi),格尾元音全写出来,不做停顿处的省音。
// 用法:node scripts/ar-translit.mjs '<阿拉伯文>'
const C = {
  'ء': 'ʾ', 'أ': 'ʾ', 'إ': 'ʾ', 'ؤ': 'ʾ', 'ئ': 'ʾ',
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'ḥ', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ', 'ع': 'ʿ', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
};
const FATHA = 'َ', DAMMA = 'ُ', KASRA = 'ِ', SHADDA = 'ّ', SUKUN = 'ْ', DAGGER = 'ٰ';
const TANWIN = { 'ً': 'an', 'ٌ': 'un', 'ٍ': 'in' };
const SHORT = { [FATHA]: 'a', [DAMMA]: 'u', [KASRA]: 'i' };
const LONG = { a: 'ā', u: 'ū', i: 'ī' };
const isMark = (ch) => ch >= 'ً' && ch <= 'ْ' || ch === DAGGER;
// 停顿符、叩头符、拉长线:不读出来
const DROP = /[ـۖ-ۭ]/g;

/** 一个词拆成 [{ l 字母, m 它身上的符号 }] */
function units(word) {
  const out = [];
  for (const ch of word) {
    if (isMark(ch)) {
      if (out.length) out.at(-1).m += ch;
    } else out.push({ l: ch, m: '' });
  }
  return out;
}
const bare = (u) => u && u.m === '';
const vowelOf = (u) => [...u.m].map((m) => SHORT[m]).find(Boolean);

function word(w) {
  const us = units(w);
  const skel = us.map((u) => u.l).join('');
  // 「安拉」:اللَّه 的长元音不写在字面上,单独处理(Allāhi、lillāhi、billāhi、wallāhu、Allāhumma)
  const god = /^([وفبتأ]*)(ا?)لله(م?)$/.exec(skel);
  if (god && us.some((u) => u.l === 'ل' && u.m.includes(SHADDA))) {
    const [, pre, alif, m] = god;
    const head = us.slice(0, pre.length).map((u) => (C[u.l] === 'ʾ' ? '' : C[u.l]) + (vowelOf(u) ?? '')).join('');
    const h = us[us.length - (m ? 2 : 1)];
    const tail = m ? `${vowelOf(h) ?? ''}mm${vowelOf(us.at(-1)) ?? ''}` : (vowelOf(h) ?? '');
    const stem = alif && !pre ? 'Allāh' : alif ? 'llāh' : `l${vowelOf(us[pre.length]) ?? ''}llāh`;
    return head + stem + tail;
  }

  let out = '';
  let i = 0;
  // 词首前缀(wa、fa、bi、ka、li、ta、a-)后面跟着连读 alif 时,alif 不读
  const waslAt = (k) => {
    const a = us[k], n = us[k + 1], n2 = us[k + 2];
    if (!a || a.l !== 'ا' || !bare(a) || !n) return null;
    if (n.l === 'ل' && n.m === SUKUN) return 'al';
    if (n.l === 'ل' && bare(n) && n2?.m.includes(SHADDA)) return 'sun';
    if (n.l === 'ل' && n.m.includes(SHADDA)) return 'alla';
    // 鼻音 n / m 在隐读、同化时不标静符(انكَدَرَتْ),也算连读 alif 开头
    if (n.m === SUKUN || (n.m.includes(SHADDA) && n.l !== 'ل') || (bare(n) && 'نم'.includes(n.l))) return 'verb';
    return null;
  };
  const emitWasl = (kind, k, elide) => {
    // 返回接下来从哪个字母继续
    if (kind === 'al') { out += `${elide ? '' : 'a'}l-`; return k + 2; }
    if (kind === 'sun') { out += `${elide ? '' : 'a'}${C[us[k + 2].l]}-`; us[k + 2].noDouble = true; return k + 2; }
    if (kind === 'alla') { out += elide ? '' : 'a'; return k + 1; }
    // 连读 alif 开头的动词、名词:第三个字母带 u 就读 u,否则读 i
    const third = us[k + 2];
    if (!elide) out += third && vowelOf(third) === 'u' ? 'u' : 'i';
    return k + 1;
  };

  // 词首
  const k0 = waslAt(0);
  if (k0) i = emitWasl(k0, 0, false);
  else {
    // 一到两个带短元音的前缀
    for (let p = 1; p <= 2; p++) {
      const pre = us.slice(0, p);
      if (!pre.every((u, j) => 'وفبكلتأ'.includes(u.l) && vowelOf(u) && (j === 0 || (!u.m.includes(SHADDA) && u.l !== 'أ')))) break;
      const kind = waslAt(p);
      if (kind) {
        out += pre.map((u) => (C[u.l] === 'ʾ' ? '' : C[u.l]) + vowelOf(u)).join('');
        i = emitWasl(kind, p, true);
        break;
      }
    }
    // لِلْـ / لِلطَّـ / لَلْـ / وَلَلْـ:介词 li 或强调的 la 加冠词,alif 字面上就没有
    for (let p = 0; p <= 1 && !i; p++) {
      const lam = us[p], l2 = us[p + 1], v = lam && vowelOf(lam);
      if (p === 1 && !('وف'.includes(us[0].l) && vowelOf(us[0]) && !us[0].m.includes(SHADDA))) break;
      if (lam?.l !== 'ل' || !v || v === 'u' || l2?.l !== 'ل' || us.length <= p + 3) continue;
      const head = (p ? C[us[0].l] + vowelOf(us[0]) : '') + `l${v}`;
      if (l2.m === SUKUN) { out += `${head}l-`; i = p + 2; }
      else if (bare(l2) && us[p + 2].m.includes(SHADDA)) { out += `${head}${C[us[p + 2].l]}-`; us[p + 2].noDouble = true; i = p + 2; }
    }
  }

  let prevBare = false; // 上一个字母是没标任何符号的辅音:它被同化进下一个字母(عَبَدتُّمْ),叠音符不再重复写
  for (; i < us.length; i++) {
    const u = us[i];
    const next = us[i + 1];
    const first = out === '';
    let c;
    if (u.l === 'آ') { out += first ? 'ā' : 'ʾā'; continue; }
    if (u.l === 'ة') c = [...u.m].some((m) => SHORT[m] || TANWIN[m]) ? 't' : 'h';
    else if (u.l === 'ا' || u.l === 'ى') c = ''; // 没被前面的元音吃掉的 alif:不发音
    else c = C[u.l];
    if (c === undefined) throw new Error(`ar-translit: 不认识的字符 ${u.l} (U+${u.l.codePointAt(0).toString(16)}) in ${w}`);
    if (c === 'ʾ' && first) c = '';
    // 词首的叠音符是上一个词的鼻音同化记号,不重复写
    if (u.m.includes(SHADDA) && i > 0 && !u.noDouble && !prevBare) c += c;
    out += c;
    prevBare = u.m === '' && c !== '';

    const tan = [...u.m].map((m) => TANWIN[m]).find(Boolean);
    if (tan) {
      out += tan;
      if (bare(next) && (next.l === 'ا' || next.l === 'ى')) i++;
      continue;
    }
    const v = vowelOf(u);
    if (!v) {
      if (u.m.includes(DAGGER)) out += 'ā';
      continue;
    }
    // 长元音:a + alif / alif maqṣūra / 短剑 alif;u + waw;i + ya
    let long = u.m.includes(DAGGER) && v === 'a';
    const after = us[i + 2];
    if (v === 'a' && next && (next.l === 'ا' || next.l === 'ى') && (bare(next) || next.m === DAGGER)) {
      // 后面如果是连读 alif(下一个字母带静符)且这是前缀,上面已经处理;这里一律当长音
      long = true; i++;
    } else if (v === 'u' && i === 0 && u.l === 'أ' && next?.l === 'و' && bare(next) && us[2]?.l === 'ل') {
      i++; // أُولَـٰئِكَ、أُولُو:这个 waw 只是写法,u 是短的
    } else if (v === 'u' && next?.l === 'و' && bare(next)) {
      long = true; i++;
      if (bare(us[i + 1]) && us[i + 1].l === 'ا' && i + 1 === us.length - 1) i++; // 复数 waw 后面不读的 alif
    } else if (v === 'i' && next?.l === 'ي' && bare(next)) {
      long = true; i++;
    } else if (v === 'a' && bare(next) && next.l === 'و' && after?.m === DAGGER) {
      long = true; i++;
    }
    out += long ? LONG[v] : v;
  }
  return out;
}

export function arTranslit(text) {
  return text
    .normalize('NFC')
    .replace(DROP, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(word)
    .join(' ');
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(arTranslit(process.argv.slice(2).join(' ')));
