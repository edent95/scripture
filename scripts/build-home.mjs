#!/usr/bin/env node
/**
 * 把改动史生成一页本地可读的 `home.html`。**只读日志、只写这一个文件。**
 *
 *   node scripts/build-home.mjs              # 写到 log.md 同目录的 home.html
 *   node scripts/build-home.mjs --out x.html # 写到别处(试跑用)
 *
 * 读:log.md(frontmatter + 条目)、冷归档 log.archive.md / log-archive.md、logs/entries/*.md(一条一个文件)。
 * 写:home.html —— 项目状态、里程碑、git 快照、全部条目(新→旧、可搜索、ripples 高亮)。
 *
 * ── home.html 必须 gitignore ─────────────────────────────────────────────────
 * 它是**产物**:每写一条日志内容就变,几个分支各自重新生成 = 每个 PR 都改同一个文件 = 必然冲突
 * (2026-09-27 DrRacing 的 home.html 进了版本库,#19 #20 #25–27 连着在它上面冲突)。
 * 真源是日志,home.html 随时可以重跑。所以:`.gitignore` 里写 `home.html`,脚本发现它没被忽略会在 stderr 提醒。
 *
 * ── 为什么自包含、零依赖 ──────────────────────────────────────────────────────
 * 这个脚本要被原样拷进十几个仓库(同 append-log.mjs):不 import 任何包,frontmatter 只解析用得到的几个键。
 * 页面也是单文件:CSS / JS 内联,不连 CDN,离线双击就能开。
 *
 * git 查询一律 `GIT_OPTIONAL_LOCKS=0`:只读命令不取 .git/index.lock(LifeOs 实测过残留锁把后续 git 写命令卡死)。
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const outArg = args.includes('--out') ? args[args.indexOf('--out') + 1] : null

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
  console.error('找不到 log.md(从当前目录逐级往上找过了)。用 LOGBOOK_FILE=… 指定。')
  process.exit(2)
}

const LOG = findLog()
const ROOT = path.dirname(LOG)
const OUT = outArg ? path.resolve(outArg) : path.join(ROOT, 'home.html')

// ── 读 ──────────────────────────────────────────────────────────────────────
const read = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return '' } }

/** frontmatter:只取顶层 `key: value` 与 milestones 列表,够页面用。不是 YAML 解析器。 */
function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  if (!m) return { meta: {}, body: text }
  const meta = {}
  const milestones = []
  const includes = []
  let list = ''
  for (const line of m[1].split('\n')) {
    const top = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
    if (top) {
      list = top[1]
      if (list === 'log_includes' && top[2].startsWith('[')) includes.push(...top[2].replace(/[[\]'"]/g, '').split(',').map((x) => x.trim()).filter(Boolean))
      if (list !== 'milestones' && top[2] && !top[2].startsWith('[')) meta[top[1]] = top[2].replace(/^['"]|['"]$/g, '')
      continue
    }
    if (list === 'log_includes') { const it = /^\s*-\s*(.+)$/.exec(line); if (it) includes.push(it[1].replace(/^['"]|['"]$/g, '')); continue }
    if (list !== 'milestones') continue
    const name = /^\s*-\s*(?:name:\s*)?(.+)$/.exec(line)
    const done = /^\s+done:\s*(true|false)/.exec(line)
    if (done && milestones.length) milestones[milestones.length - 1].done = done[1] === 'true'
    else if (name && !/^\s*-\s*done:/.test(line)) milestones.push({ name: name[1].replace(/^['"]|['"]$/g, ''), done: false })
  }
  return { meta: { ...meta, milestones, includes }, body: text.slice(m[0].length) }
}

/** ``` / ~~~ 围栏里的标题不算标题(格式约定里常有示例条目)。等长替换,下标对得上原文 */
function maskFences(body) {
  const out = body.split('\n')
  let fence = null
  for (let i = 0; i < out.length; i++) {
    const m = /^[ \t]{0,3}(```+|~~~+)/.exec(out[i])
    if (fence == null) { if (m) { fence = m[1][0]; out[i] = ' '.repeat(out[i].length) } }
    else { const close = m && m[1][0] === fence; out[i] = ' '.repeat(out[i].length); if (close) fence = null }
  }
  return out.join('\n')
}

/**
 * 切条目。两种写法都认:
 * - rag-v1:`## YYYY-MM-DD` 天标题下面若干 `### [ID] 标题`,一条 `###` 是一条;
 * - 结构化 / 带时间戳:`## YYYY-MM-DD [LOG-…] 标题`、`## 2026-08-27 16:41:07 +08`,天标题下没有 `###` 时整块是一条。
 * 第一个日期标题之前的内容(格式约定)不算。
 */
function entriesOf(text, source) {
  const body = frontmatter(text).body
  const masked = maskFences(body)
  const heads = [...masked.matchAll(/^(#{2,3})[ \t]+(.+)$/gm)].map((m) => ({ level: m[1].length, text: body.slice(m.index, m.index + m[0].length).replace(/^#{2,3}[ \t]+/, ''), at: m.index }))
  const out = []
  let day = null
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i]
    const end = i + 1 < heads.length ? heads[i + 1].at : body.length
    const content = body.slice(h.at, end).split('\n').slice(1).join('\n').trim()
    if (h.level === 2) {
      const d = /^(\d{4}-\d{2}-\d{2})(?:[ \t]+(.*))?$/.exec(h.text)
      day = d ? d[1] : null
      // 天标题下紧跟着 ### 的,由 ### 各自成条;没有 ### 的整块算一条
      const nextIsH3 = i + 1 < heads.length && heads[i + 1].level === 3
      if (d && !nextIsH3 && content) out.push(entry(day, d[2] || day, content, source))
      continue
    }
    if (!day) continue
    out.push(entry(day, h.text, content, source))
  }
  return out
}

function entry(date, title, content, source) {
  const id = /^\[([^\]]{3,60})\]\s*/.exec(title)
  const field = (name) => {
    const m = new RegExp(`^[-*]\\s*\\*\\*${name}\\*\\*\\s*[:：]\\s*([\\s\\S]*?)(?=^[-*]\\s*\\*\\*|$(?![\\s\\S]))`, 'm').exec(content)
    return m ? m[1].trim() : ''
  }
  return {
    date, source,
    id: id ? id[1] : '',
    title: id ? title.slice(id[0].length) : title,
    type: (field('type') || field('类型')).split(/\s/)[0],
    ripples: field('ripples'),
    content,
  }
}

const logText = read(LOG)
const { meta } = frontmatter(logText)
let entries = entriesOf(logText, 'log.md')
for (const name of ['log.archive.md', 'log-archive.md']) {
  const f = path.join(ROOT, name)
  if (fs.existsSync(f) && fs.statSync(f).isFile()) entries = entries.concat(entriesOf(read(f), name))
}

/**
 * 只认「目录/带 * 的文件名」这一种 glob(如 `logs/2026-*.md`),而且只在项目目录内 —— 够用,不引 glob 包。
 * 两个来源:frontmatter `log_includes`(按月拆分的日志,Eden)与 `log-archive/` 目录(LifeOs 的冷归档)。
 */
function globFiles(pattern) {
  const dir = path.resolve(ROOT, path.dirname(pattern))
  if (!dir.startsWith(ROOT + path.sep) && dir !== ROOT) return []
  const re = new RegExp(`^${path.basename(pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
  try { return fs.readdirSync(dir).filter((n) => re.test(n)).sort().map((n) => path.join(dir, n)) } catch { return [] }
}
const seen = new Set([LOG])
for (const f of [...(meta.includes || []).flatMap(globFiles), ...globFiles('log-archive/*.md')]) {
  if (seen.has(f) || !fs.statSync(f).isFile()) continue
  seen.add(f)
  entries = entries.concat(entriesOf(read(f), path.relative(ROOT, f)))
}
const entryDir = path.join(ROOT, 'logs', 'entries')
if (fs.existsSync(entryDir)) {
  for (const n of fs.readdirSync(entryDir).filter((x) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(x)).sort()) {
    entries = entries.concat(entriesOf(read(path.join(entryDir, n)), `logs/entries/${n}`))
  }
}
// 新→旧;同一天里一条一个文件的(文件名带时分秒)按来源名倒排,log.md 里的保持文件顺序
entries.sort((a, b) => b.date.localeCompare(a.date) || b.source.localeCompare(a.source))

// ── git 快照(只读、不取锁;不是 git 仓库就没有这一块)───────────────────────────
function git(a) {
  try {
    return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch { return '' }
}
const isGit = git(['rev-parse', '--is-inside-work-tree']) === 'true'
const gitInfo = isGit ? {
  branch: git(['branch', '--show-current']) || '(detached)',
  dirty: git(['status', '--porcelain']).split('\n').filter(Boolean).length,
  commits: git(['log', '-8', '--format=%h\t%cs\t%s']).split('\n').filter(Boolean).map((l) => l.split('\t')),
} : null
if (isGit && !OUT.startsWith(path.join(ROOT, '.')) && path.dirname(OUT) === ROOT) {
  const ignored = (() => { try { execFileSync('git', ['check-ignore', '-q', OUT], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }); return true } catch { return false } })()
  if (!ignored) console.error(`⚠ ${path.basename(OUT)} 没有被 gitignore —— 它是产物,进了版本库每个 PR 都会在它上面冲突。往 .gitignore 加一行 home.html`)
}

// ── 写 ──────────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
/** 极简 Markdown:转义后只认 **粗体**、`代码`、行首列表 —— 日志里用得到的就这些 */
const md = (s) => esc(s)
  .replace(/`([^`\n]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
  .split('\n').map((l) => (/^\s*[-*]\s+/.test(l) ? `<div class="li" style="margin-left:${l.search(/\S/) * 6}px">• ${l.replace(/^\s*[-*]\s+/, '')}</div>` : `<div>${l || '&nbsp;'}</div>`)).join('')

const project = meta.title || meta.project || path.basename(ROOT)
const milestones = meta.milestones || []
const now = new Date()
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

const html = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(project)} · 改动史</title>
<style>
:root{--bg:#f7f7f5;--panel:#fff;--fg:#1d1d1f;--muted:#6b6b70;--line:#e3e3e0;--accent:#6d5bd0;--warn:#b7791f;--code:#f0efec}
@media (prefers-color-scheme:dark){:root{--bg:#141417;--panel:#1c1c21;--fg:#ececf1;--muted:#9a9aa5;--line:#2c2c33;--accent:#a393ff;--warn:#e0b050;--code:#26262d}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px 64px}h1{font-size:22px;margin:0 0 4px}.muted{color:var(--muted)}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:14px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.tag{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:0 8px;font-size:12px;color:var(--muted);margin-right:6px}
input{width:100%;padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--fg);font-size:14px}
details{border-top:1px solid var(--line);padding:8px 0}details:first-of-type{border-top:0}summary{cursor:pointer;list-style:none}
summary::-webkit-details-marker{display:none}.date{font-variant-numeric:tabular-nums;color:var(--muted);margin-right:8px}
.ripples{border-left:3px solid var(--warn);padding:4px 10px;margin:8px 0;background:color-mix(in srgb,var(--warn) 8%,transparent)}
.body{font-size:13px;margin-top:6px}code{background:var(--code);border-radius:4px;padding:0 4px;font-size:12px}
.commit{font-family:ui-monospace,monospace;font-size:12px}.done{text-decoration:line-through;color:var(--muted)}
</style></head><body><main>
<h1>${esc(project)}</h1>
<p class="muted">${[meta.status, meta.version && `v${meta.version}`, meta.updated && `updated ${meta.updated}`].filter(Boolean).map(esc).join(' · ')} · 生成于 ${esc(stamp)} · 共 ${entries.length} 条改动 · 本页是产物(gitignore),真源是 log.md 与 logs/entries/</p>
<div class="grid">
${milestones.length ? `<section class="panel"><b>里程碑</b>${milestones.map((m) => `<div class="${m.done ? 'done' : ''}">${m.done ? '✓' : '○'} ${esc(m.name)}</div>`).join('')}</section>` : ''}
${gitInfo ? `<section class="panel"><b>git</b> <span class="tag">${esc(gitInfo.branch)}</span>${gitInfo.dirty ? `<span class="tag">${gitInfo.dirty} 个未提交</span>` : ''}${gitInfo.commits.map(([h, d, s]) => `<div class="commit"><span class="muted">${esc(h)} ${esc(d)}</span> ${esc(s)}</div>`).join('')}</section>` : ''}
</div>
<section class="panel">
<input id="q" placeholder="搜索标题、正文、ripples、ID(空格分隔多个词)" autocomplete="off">
<p class="muted" id="count"></p>
${entries.map((e) => `<details data-s="${esc(`${e.date} ${e.id} ${e.title} ${e.content}`.toLowerCase())}">
<summary><span class="date">${esc(e.date)}</span>${e.type ? `<span class="tag">${esc(e.type)}</span>` : ''}${esc(e.title)} ${e.id ? `<span class="muted" style="font-size:12px">${esc(e.id)}</span>` : ''}</summary>
${e.ripples ? `<div class="ripples"><b>ripples</b>${md(e.ripples)}</div>` : ''}
<div class="body">${md(e.content)}</div><div class="muted" style="font-size:11px">${esc(e.source)}</div>
</details>`).join('\n')}
</section></main>
<script>
const q=document.getElementById('q'),items=[...document.querySelectorAll('details')],count=document.getElementById('count');
function f(){const w=q.value.toLowerCase().split(/\\s+/).filter(Boolean);let n=0;for(const d of items){const ok=w.every(x=>d.dataset.s.includes(x));d.hidden=!ok;if(ok)n++}count.textContent=w.length?n+' 条匹配':''}
q.addEventListener('input',f);
</script></body></html>
`

const tmp = `${OUT}.tmp${process.pid}`
fs.writeFileSync(tmp, html, 'utf8')
fs.renameSync(tmp, OUT)
console.log(`✓ ${path.relative(process.cwd(), OUT) || OUT}:${entries.length} 条改动`)
