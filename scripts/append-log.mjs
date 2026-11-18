#!/usr/bin/env node
/**
 * 往 log.md 追加一条条目。**只追加,不重写整个文件。**
 *
 * 为什么要这个脚本:常见做法是「读整个 log.md → 字符串拼接 → 整文件写回」。
 * 两个会话同时写时,后写的那个会把先写的整段覆盖掉 —— 而且不会报错。
 * 2026-09-01 在 personal-dashboard 真的发生过:另一个会话写了 E-2026-09-01-16/17,
 * 本会话差点用同一个 id 覆盖掉。实测(两个进程各写 40 条):
 * 读-改-写 落盘 18/80,`fs.appendFileSync`(O_APPEND)落盘 80/80。
 *
 * 这里用 `fs.appendFileSync`:写入相对文件末尾是原子的,两个并发追加都会落盘。
 * **前提是 log.md 按「旧 → 新」排,新条目在末尾。** 全机项目已于 2026-09-10 统一成这个方向。
 *
 * 条目 ID 由脚本分配(当天最大序号 +1),写的人不用关心;写完会复查有没有重号。
 *
 * ── 天标题 ──────────────────────────────────────────────────────────────────
 * 脚本会在需要时**自动补一个 `## YYYY-MM-DD` 天标题**。这不是排版洁癖:
 * 面板的 `parseEntries()` 是**按 `##` 天聚合**的,没有天标题的日志它一条都看不见。
 * 实测过后果:personal-dashboard 79 条条目全挤在一个 `## 2026-08-31` 底下,面板只显示 1 条,
 * `updated` 永远停在 8 月 31 日;Subtitle 一个天标题都没有,面板显示 0 条。
 * 天标题和条目在**同一次 appendFileSync** 里写出去,所以并发下不会出现「有标题没条目」。
 *
 * ── 不用自己记得跑 --check ──────────────────────────────────────────────────
 * personal-dashboard 装了一个 Claude Code `Stop` 钩子(`scripts/logbook-hook.mjs`),
 * 会话结束时会自动体检当前仓库的 log.md:重复 ID、天标题倒序、以及「改了源文件却没补日志」。
 * **全绿时一个字都不输出**,所以平时感觉不到它;看到警告就说明真的有事。
 *
 * ── 一条一个文件(`logs/entries/`,2026-09-28 起) ──────────────────────────────
 * log.md 旁边**有 `logs/entries/` 目录**时,脚本不再往 log.md 末尾追加,而是新建
 * `logs/entries/<日期>-<时分秒>-<4 位随机>.md`,里面是 `## 日期` + 这一条。
 * 为什么:几个 agent 各在自己的分支上往 log.md 末尾追加,PR 合并时**必然**在同一处冲突
 * (两边都在 EOF 加了行),自动合并就停在「和 base 有冲突」。一条一个新文件,
 * 两个分支永远不碰同一个文件 —— 同一个项目同时跑几个 agent 也不会撞。
 * 这种模式下 ID 是 `E-<日期>-<时分秒>-<4 位十六进制>`,不查「当天最大序号」(别的分支上的
 * 序号根本看不见,+1 必然撞号)。面板扫描器(`aggregator.ts`)会自动把这个目录并进项目条目。
 * 没有这个目录的仓库行为一点不变;要切过去:`node scripts/append-log.mjs --init-entries`。
 *
 * ── learned:第 8 个字段,必填(2026-11-19 起) ────────────────────────────────────
 * 这次学到了什么、该去哪,每条用方括号标去处;没有就写「无」,和 ripples 一样**不许留空**:
 *
 *   - **learned**:
 *     - [skill:seo-combo] GSC 最近 2–3 天没定稿 → 按天比较截到最后定稿日
 *     - [new-skill:gsc-daily] (完整流程)触发条件 + 三步以上固定做法 + 怎么验证
 *     - [knowledge] 跨项目的环境事实 / 坑
 *     - [rule] 以后所有 agent 都该照做的规矩
 *     - [project] 已在这次改动里写进本仓库(AGENTS.md / docs),不再外发
 *   - **learned**: 无
 *
 * PR 合并、worktree 被收掉之后,面板读这一栏分发进建议箱(技能踩坑 / 新技能草稿 / 知识 / 规则)。
 * 追加时校验,不合格直接拒收;`--check` 只查 2026-11-19 起的条目(旧条目没有这一栏)。
 *
 * 用法:
 *   node scripts/append-log.mjs < entry.md     # 正文从 stdin 读,首行是 `### 标题`
 *   node scripts/append-log.mjs --check        # 检查 id 重号 + 天标题是否递增 + logs/entries/ 里没有杂物
 *   node scripts/append-log.mjs --init-entries # 建 logs/entries/,以后一条一个文件
 *   LOGBOOK_FILE=path/to/log.md node scripts/append-log.mjs < entry.md
 *
 * 找 log.md 的顺序:$LOGBOOK_FILE → 从 cwd 逐级往上找的第一个 log.md。
 * (所以在仓库任何子目录里跑都能用,不依赖脚本自己放在哪。)
 */
import fs from 'node:fs'
import path from 'node:path'

// 两种 ID:`E-2026-09-28-03`(log.md 里按当天序号)与 `E-2026-09-28-143012-a3f9`(一条一个文件)
const ID_RE = /^###\s*\[(E-\d{4}-\d{2}-\d{2}-\d{2}(?:\d{4}-[0-9a-f]{4})?)\]/gm
const ID_PREFIX_RE = /^###\s*(\[E-\d{4}-\d{2}-\d{2}-[\w-]+\])?\s*/
const DAY_RE = /^##[ \t]+(\d{4}-\d{2}-\d{2})/gm

/** 从 cwd 逐级往上找 log.md —— 在仓库任何子目录里跑都能用。 */
function findLog() {
  if (process.env.LOGBOOK_FILE) return path.resolve(process.env.LOGBOOK_FILE)
  let dir = process.cwd()
  for (;;) {
    const p = path.join(dir, 'log.md')
    if (fs.existsSync(p)) return p
    const up = path.dirname(dir)
    if (up === dir) break
    dir = up
  }
  console.error('找不到 log.md(从当前目录逐级往上找过了)。用 LOGBOOK_FILE=… 指定,或先建一个。')
  process.exit(2)
}

const LOG = findLog()
const ENTRIES = path.join(path.dirname(LOG), 'logs', 'entries')
const entriesMode = () => { try { return fs.statSync(ENTRIES).isDirectory() } catch { return false } }

/** `logs/entries/` 下的全部条目文件,按文件名(= 时间)排。 */
function entryFiles() {
  if (!entriesMode()) return []
  return fs.readdirSync(ENTRIES).filter((n) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(n)).sort()
    .map((n) => path.join(ENTRIES, n))
}

/**
 * 把 ``` / ~~~ 围栏里的内容换成等长空格再找标题。
 *
 * 不这么做会误判:log.md 开头的「格式约定」一节里就有用 ```markdown 写的条目模板,
 * 里面的 `## YYYY-MM-DD` 会被当成真的天标题,于是脚本以为今天已经有标题了,不再补。
 * 用等长空格而不是删除,是为了 `index` 仍然对得上原文。
 *
 * (这段和 `scripts/lib/logmd.mjs` 里的同名函数重复。故意的:这个脚本要被原样拷进
 * 十几个仓库,必须自包含、零依赖 —— 宁可重复十行,不要让它 import 一个别处的库。)
 */
function maskFences(body) {
  const out = body.split('\n')
  let fence = null
  for (let i = 0; i < out.length; i++) {
    const m = /^[ \t]{0,3}(```+|~~~+)/.exec(out[i])
    if (fence == null) {
      if (m) { fence = m[1][0]; out[i] = ' '.repeat(out[i].length) }
    } else {
      const closing = m && m[1][0] === fence
      out[i] = ' '.repeat(out[i].length)
      if (closing) fence = null
    }
  }
  return out.join('\n')
}

const allIds = (text) => [...text.matchAll(ID_RE)].map((m) => m[1])
const allDays = (text) => [...maskFences(text).matchAll(DAY_RE)].map((m) => m[1])

/** 本地日期。**不要用 `toISOString()`** —— 那是 UTC,东八区的晚上会写成昨天。 */
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 给「读当天最大序号 → 追加」这一小段加一把排他锁。
 *
 * 为什么需要:`appendFileSync` 保证两条都落盘,但**保证不了两条的 ID 不一样** ——
 * 两个进程可能读到同一个「当天最大序号」,各自 +1 得到同一个号。实测两个进程各写 40 条,
 * 不加锁有 27 条撞号(内容一条没丢,但 ID 重了)。
 *
 * 锁**失败时故意放行**(fail open):拿不到锁就照常追加,顶多退回到「撞号并吵闹」的老行为。
 * 宁可偶尔重号,也不能因为一个陈旧锁文件就让人写不进日志。
 */
function withIdLock(fn) {
  const lock = LOG + '.append-lock'
  let fd = null
  for (let i = 0; i < 50; i++) {
    try { fd = fs.openSync(lock, 'wx'); break } catch (e) {
      if (e.code !== 'EEXIST') break
      // 陈旧锁:上一次跑到一半被杀了,10 秒后直接抢过来
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 10_000) { fs.unlinkSync(lock); continue } } catch {}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20)   // 睡 20ms
    }
  }
  try { return fn() } finally {
    if (fd != null) { fs.closeSync(fd); try { fs.unlinkSync(lock) } catch {} }
  }
}

/**
 * `logs/entries/` 里不是条目文件、也不是 README.md 的东西(含子目录),相对路径。
 * 2026-10-01 一个会话的 `cp` 把 18 个源码副本拷进了这里,随后被一键提交带进 PR;
 * 里面的 `*.test.ts` 被 CI 在错误目录下跑,才把它拦下来。条目目录只该有脚本建的 `.md`。
 */
function strayEntryFiles(dir = ENTRIES, rel = '') {
  if (!entriesMode()) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const r = rel ? `${rel}/${d.name}` : d.name
    if (d.isDirectory()) return [`${r}/`, ...strayEntryFiles(path.join(dir, d.name), r)]
    if (!rel && (d.name === 'README.md' || /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(d.name))) return []
    if (d.name === '.DS_Store') return []
    return [r]
  })
}

const LEARNED_SINCE = '2026-11-19'
const LEARNED_TAG = /^\[(skill:[a-z0-9-]+|new-skill:[a-z0-9-]+|knowledge|rule|project)\][ \t]*(\S.*)$/

/** 一条条目里的 learned:返回错误列表(空 = 合格) */
function learnedErrors(entry) {
  const lines = entry.split('\n')
  const at = lines.findIndex((l) => /^-\s+\*\*learned\*\*\s*[::]/.test(l))
  if (at < 0) return ['缺 `- **learned**:` 这一栏(这次学到了什么、该去哪;没有就写「无」)']
  const inline = lines[at].replace(/^-\s+\*\*learned\*\*\s*[::]\s*/, '').trim()
  const items = []
  for (const l of lines.slice(at + 1)) {
    if (/^\s+-\s+/.test(l)) items.push(l.replace(/^\s+-\s+/, '').trim())
    else if (/^\s{2,}\S/.test(l) && items.length) items[items.length - 1] += ` ${l.trim()}`
    else if (l.trim() === '' && !items.length) continue
    else break
  }
  if (!items.length) {
    if (/^无[。.]?$/.test(inline)) return []
    if (!inline) return ['learned 是空的:没有就写「无」']
    items.push(inline)
  } else if (inline && !/^无[。.]?$/.test(inline)) items.unshift(inline)
  return items.flatMap((it) => {
    const m = LEARNED_TAG.exec(it)
    if (!m) return [`learned 这一条没有合法的去处标签:「${it.slice(0, 40)}」—— 用 [skill:<技能id>] / [new-skill:<id>] / [knowledge] / [rule] / [project] 开头`]
    return [...m[2]].length < 8 ? [`learned 这一条太短,写清现象和以后怎么做:「${it}」`] : []
  })
}

/** 文本里按 `## 日期` 归属的每一条 `###` 条目 */
function entriesOf(text) {
  const out = []
  let day = ''
  let cur = null
  for (const l of maskFences(text).split('\n')) {
    const d = /^##[ \t]+(\d{4}-\d{2}-\d{2})/.exec(l)
    if (d) { if (cur) out.push(cur); cur = null; day = d[1]; continue }
    if (/^###\s/.test(l)) { if (cur) out.push(cur); cur = { day, title: l, body: [l] }; continue }
    if (cur) cur.body.push(l)
  }
  if (cur) out.push(cur)
  return out.map((e) => ({ ...e, body: e.body.join('\n') }))
}

function check() {
  const text = fs.readFileSync(LOG, 'utf8')
  const files = entryFiles()
  const ids = allIds(text).concat(files.flatMap((f) => allIds(fs.readFileSync(f, 'utf8'))))
  const seen = new Map()
  for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1)
  const dup = [...seen].filter(([, n]) => n > 1)
  const days = allDays(text)
  const unsorted = days.findIndex((d, i) => i > 0 && d < days[i - 1])

  console.log(`${LOG}\n  ${ids.length} 条带 ID 的条目 · ${days.length} 个天标题${files.length ? ` · 其中 ${files.length} 个文件在 logs/entries/` : ''}`)
  let bad = false
  // 条目文件必须自带 `## 日期`:解析器按天聚合,没有天标题的文件在面板上一条都看不见
  const noDay = files.filter((f) => !allDays(fs.readFileSync(f, 'utf8')).length)
  if (noDay.length) {
    console.error(`  ✗ 这些条目文件没有 \`## YYYY-MM-DD\` 天标题:${noDay.map((f) => path.basename(f)).join(', ')}`)
    bad = true
  }
  const stray = strayEntryFiles()
  if (stray.length) {
    console.error(`  ✗ logs/entries/ 里有不是条目的文件(多半是 cp 拷错了目录,删掉或挪回原处):${stray.join(', ')}`)
    bad = true
  }
  if (dup.length) {
    console.error(`  ✗ 重复 ID:${dup.map(([id, n]) => `${id}×${n}`).join(', ')}`)
    bad = true
  } else console.log('  ✓ 没有重复 ID')

  // 「旧 → 新」是 O_APPEND 追加能成立的前提。倒过来的话新条目会落到最旧那一天底下。
  if (unsorted > 0) {
    console.error(`  ✗ 天标题不是「旧→新」:${days[unsorted - 1]} 之后出现了 ${days[unsorted]}`)
    bad = true
  } else if (days.length > 1) console.log('  ✓ 天标题「旧→新」递增')

  // 同一天出现两个 `## 日期`:并发下两个会话可能同时判断「今天还没有标题」。
  // 解析器允许一天多条(`date` 不是唯一键),所以这不算错,但合并掉更干净。
  const dupDay = [...new Set(days.filter((d, i) => days.indexOf(d) !== i))]
  if (dupDay.length) console.log(`  · 提示:${dupDay.join(', ')} 有重复的天标题,可以手工合并(不影响解析)`)

  // learned:2026-11-19 起的条目必须有,且每条带去处标签
  const sources = [{ name: path.basename(LOG), text }, ...files.map((f) => ({ name: path.relative(path.dirname(LOG), f), text: fs.readFileSync(f, 'utf8') }))]
  const learnedBad = sources.flatMap(({ name, text: t }) => entriesOf(t).filter((e) => e.day >= LEARNED_SINCE)
    .flatMap((e) => learnedErrors(e.body).map((msg) => `${name} ${e.title.slice(0, 50)}:${msg}`)))
  if (learnedBad.length) {
    console.error(`  ✗ learned 不合格(${learnedBad.length}):\n    ${learnedBad.slice(0, 10).join('\n    ')}`)
    bad = true
  } else console.log(`  ✓ ${LEARNED_SINCE} 起的条目都写了 learned`)

  if (bad) process.exit(1)
}

if (process.argv.includes('--check')) {
  check()
  process.exit(0)
}

if (process.argv.includes('--init-entries')) {
  fs.mkdirSync(ENTRIES, { recursive: true })
  // git 不收空目录;留一个说明文件,别的 clone / worktree 才会一起进入「一条一个文件」模式
  const readme = path.join(ENTRIES, 'README.md')
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(readme, '# logs/entries\n\n这个目录里一条日志一个文件,由 `npm run log:append`(`scripts/append-log.mjs`)新建,不要手写、不要改名。\n'
      + '几个分支 / agent 同时写日志时各建各的文件,PR 合并不会在 log.md 上冲突。面板会把这里的条目与 log.md 合在一起显示。\n')
  }
  console.log(`✓ 已启用一条一个文件:${ENTRIES}`)
  process.exit(0)
}

const body = fs.readFileSync(0, 'utf8').trim()
if (!body.startsWith('###')) {
  console.error('条目必须以 `### 标题` 开头(ID 由本脚本分配,不用自己写)')
  process.exit(2)
}

const learnedProblems = learnedErrors(maskFences(body))
if (learnedProblems.length) {
  console.error(`条目没写进去 —— learned 不合格:\n  - ${learnedProblems.join('\n  - ')}\n\n格式:\n- **learned**:\n  - [skill:seo-combo] 现象 → 以后怎么做\n  - [knowledge] …\n或\n- **learned**: 无`)
  process.exit(2)
}

const date = today()

if (entriesMode()) {
  // 一条一个新文件:不读 log.md、不加锁、不算序号。`wx` 保证不会覆盖任何已有文件。
  const d = new Date()
  const hms = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join('')
  for (let attempt = 0; attempt < 5; attempt++) {
    const rand = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
    const id = `E-${date}-${hms}-${rand}`
    const lines = body.split('\n')
    lines[0] = `### [${id}] ${lines[0].replace(ID_PREFIX_RE, '')}`
    const file = path.join(ENTRIES, `${date}-${hms}-${rand}.md`)
    try {
      fs.writeFileSync(file, `## ${date}\n\n${lines.join('\n')}\n`, { encoding: 'utf8', flag: 'wx' })
    } catch (e) {
      if (e.code === 'EEXIST') continue
      throw e
    }
    console.log(`✓ 已写入 ${id} → ${path.relative(path.dirname(LOG), file)}`)
    process.exit(0)
  }
  console.error('连续 5 次撞到同名文件,放弃 —— 这不该发生,请检查 logs/entries/')
  process.exit(1)
}

const { id, needDay } = withIdLock(() => {
  const before = fs.readFileSync(LOG, 'utf8')
  const taken = allIds(before).filter((x) => x.startsWith(`E-${date}-`))
  const id = `E-${date}-${String(taken.reduce((m, x) => Math.max(m, Number(x.slice(-2))), 0) + 1).padStart(2, '0')}`

  // 首行换成带 ID 的标题;写的人给的 ID(如果有)一律以脚本分配的为准
  const lines = body.split('\n')
  lines[0] = `### [${id}] ${lines[0].replace(ID_PREFIX_RE, '')}`

  // 文件按「旧→新」排,所以最后一个天标题就是最新的一天。不是今天就补一个。
  // 天标题与条目在**同一次 appendFileSync** 里写出去,不会出现「有标题没条目」。
  const days = allDays(before)
  const needDay = days[days.length - 1] !== date
  fs.appendFileSync(LOG, (needDay ? `\n## ${date}\n` : '') + `\n${lines.join('\n')}\n`, 'utf8')
  return { id, needDay }
})

// 复查:并发下两个会话仍可能算出同一个号(窗口很窄,但不是零)
const after = allIds(fs.readFileSync(LOG, 'utf8')).filter((x) => x === id)
if (after.length > 1) {
  console.error(`⚠️  ${id} 出现了 ${after.length} 次 —— 有并发写入,请手工改掉其中一条的序号`)
  process.exit(1)
}
console.log(`✓ 已追加 ${id}${needDay ? `(并新开 ## ${date})` : ''} → ${LOG}`)
