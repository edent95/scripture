# AGENTS.md — scripture.eden-tan.com

梵文经书白话直译站：每段梵文直译成白话，对照古代汉译，附梵文原文。Eden（eden-tan.com）的子域，独立仓库、独立部署（GitHub Pages）。默认用中文回复。

**目的（用户 2026-11-25 定）：让现代人看得懂以前的经书。** 译文、导读、版面，拿不准怎么做时都问这一句；细则在 `docs/baihua-guideline.md`。

**字体只用 MiSans 一家**（用户 2026-11-25 定）：正文、标题、标签都是 MiSans（jsDelivr 的 `misans@5.0.0`，`MiSansVF` 可变字体，字重上限 700），天城体用 MiSans Devanagari。唯一的例外是罗马转写（`.iast`、书名下的原文名）用 Inter：MiSans 没有 ṃ ḥ ṛ ṭ ḍ ṇ 这些带点的字母，用它会一个词里两种字体。不要再引 JetBrains Mono、宋体或别的字体；加新文字（如阿拉伯文）先看 `misans` 包里有没有对应的子集。

## 结构

- 内容来自个人面板书库的「梵文」（`sa-*.json`）和「巴利文」（`pi-*.json`）书架，现在 24 部，分三组：佛经（梵文）、巴利文经典、印度经典，书目见 README 和 `scripts/import-dashboard.mjs` 的 `BOOKS` 表。巴利文书的 `origLang` 是 `pi`（导入脚本按 `pi-` 前缀写入），页面上的「梵文」字样都会换成「巴利文」。
- `content/<slug>.json` 是**生成物**：`node scripts/import-dashboard.mjs [面板书库目录]` 从 `personal-dashboard/client/public/books/local/sa-*.json` 转过来（面板那边是 p 白话直译 → old 古译对照 → sa 梵文 的 prose 格式）。改内容去面板那边改，再重新导入；不要手改 content/。新增一部书：
  1. 在面板书库写 `<id>.json`（`sa-` 梵文 / `pi-` 巴利文），原文与古译一律从 GRETIL、SuttaCentral、CBETA 抓取逐字照抄，`sa.tr` 填罗马转写、`sa.text` 留空，跑 `node scripts/iast-to-deva.mjs <文件>` 机械生成天城体（巴利文书每次全部重生成，`’` 当引号不当 avagraha）；
  2. `node scripts/check-dashboard-book.mjs <文件>` 校验；
  3. 在面板 `index.json` 加条目、导入脚本 `BOOKS` 表加一行（面板 id、slug、tradition、白话简介、底本来源 `source`），`EN_PENDING` 加英文书名与简介，`scripts/emblems.mjs` 加一枚花纹章（专属插画 `scripts/scenes.mjs` 可以后补，没有时首屏用花纹章）；
  4. 重新导入。
- 一段 = `{ zh 白话直译, old?: { who, text 古译原句, plain 古译今译, notes[{ w, note }] }, sa: { text 天城体, tr 罗马转写 } }`，校验见 `scripts/content.mjs`。
- **英译**是本站自己的叠加层 `translations/en/<slug>.json`（不经面板，导入脚本不会碰它）：英文从梵文直译，每段带梵文指纹 `h`（`sa.tr` 的 sha1 前 8 位），可选 `cmp[{ w, note }]` 写这一段英文、中文、梵文具体差在哪（只在真有差别时写）；整部书的 `compare` 是三语对照总结（多章书显示在目录页，单章书在经文后面）。面板重新导入后某段梵文变了，指纹对不上，构建会报错，那一段英译要重译。`node scripts/en-skeleton.mjs <slug> [章]` 打印带指纹的底稿。24 部全部已有英译（2026-11-19 补齐）。新加的书没有英译时，会自动出现在英文首页的 Chinese only for now 一组，英文书名和简介写在 build.mjs 的 `EN_PENDING`。巴利文书的英译从巴利文直译，三语对照标题自动写成 Pali。
- **中英两版**：中文版在 `/…`，英文版在 `/en/…`，格式见下面「多语言规则」。
- `scripts/build.mjs` 生成 `dist/`：首页、多章经书的目录页、每章一页（单章经书的章节页就是 `/<slug>/`，多章是 `/<slug>/<n>/`），加 `sitemap.xml`、`robots.txt`、`llms.txt`、`CNAME`、`404.html`。
- `src/` 原样复制进 `dist/`（样式、三栏开关脚本、图标）。零依赖，不要为小事加 npm 包。
- 图标：`src/favicon.svg` 是唯一的源(天城体顶线 + 三根竖笔，中间 Mint)。`favicon.ico`、`apple-touch-icon.png`、`icon-192.png`、`icon-512.png` 由 `node scripts/icons.mjs` 用本机 Chrome 生成并提交;改了 SVG 要重跑。`site.webmanifest` 引用 192/512。

## 内容规矩

- 梵文、巴利文原文与古代汉译是公有领域，但**电子录文有各自的授权**：GRETIL / DSBC 多为 CC BY-NC-SA 4.0，CBETA 是非商业使用条款，SuttaCentral 是 CC0。每部书的 `source` 写明底本与授权，页面底部会署名；本站一旦商用，要先换底本或取得授权。**不要收现代人的译本**（如王志成译《薄伽梵歌》，英文的 Conze、Easwaran 等），它们有版权。英译只能是本站从梵文自己直译。
- 白话要像跟朋友讲；不加立场，不做护教或批判。**写或重写任何白话（译文、章导读、「读之前先知道这几件事」）之前先读 `docs/baihua-guideline.md`**：读者是完全没背景的人，标准是读一遍说得出在讲什么；括号、术语、导读的写法和重写旧译文的流程都在那里；已经发现的旧译文问题记在 `docs/baihua-todo.md`，重写哪部先看哪部。
- **章导读与「读之前先知道这几件事」**（2026-11-25）：章导读中文写在面板书库那一章的 `intro`（导入脚本带过来），英文写在英译叠加层那一章的 `intro`，显示在经文前面，也用作章节页的 meta description。`translations/en/<slug>.json` 的 `primer`（中文）/ `primerEn`（英文）是 `[{ q, a, terms?: [[词, 解释]] }]`，多章书显示在目录页章节列表前面、每个章节页留一行入口，单章书直接显示在经文前面。
- **授权**：本站自己的内容（白话直译、英译、古译今译、注释、网页文字）以 CC BY 4.0 授权，写在仓库根 `LICENSE`、每页页脚（`rel="license"` 链接）、JSON-LD 的 `license` 和 `llms.txt`；公有领域的梵文原文与古译不主张权利。改页脚或授权要四处一起改，测试会查页脚链接和 JSON-LD。

## 多语言规则（英文版是样板，以后加日文、泰文等任何语言都照这个格式）

1. **一种语言一版，各以自己的语言为主，不夹别的语言。** 中文版不放英文，英文版不放中文；界面文字、书名、章名、简介、按钮、页脚、标签、梵文书名后的说明（如「(小本)」→ shorter）全部用这一版的语言。只有三种例外：
   - 梵文原文与罗马转写：每一版都有，它是原典。
   - 右上角的语言切换钮：每种语言用它自己的名字（`EN`、`中文`、`日本語`……）。
   - 三语对照注与总结里引用别的语言的原词：要比较译法就得引原词，引的时候附读音和这一版语言的释义，例如英文版写 皆空 (jiē kōng, "all empty")。
2. **路径**：中文版在根 `/…`，其他语言在 `/<语言代码>/…`（`/en/`、`/ja/`）。每页写齐所有语言的 `hreflang`，`x-default` 指中文版。
3. **右上角一键切换**，跟 eden-tan.com 一样：所有语言并排成一组胶囊，选中的那颗是主品牌色；点了切到另一种语言的**同一页**，那种语言没有这一页（还没译这部书）就切到它的首页。
4. **译文一律从梵文直译**，不从中文或英文转译，也不收现代人有版权的译本。放在 `translations/<语言代码>/<slug>.json`，结构同英译（`h` 梵文指纹、译文、可选的对照注），按指纹对齐，原文变了就报错重译。
5. **每段的排法**：这一版语言的译文在最上面，「三语对照」注挂在它下面（只在真有差别时写，用这一版的语言写），然后是梵文。中文版多一栏古代汉译（玄奘、鸠摩罗什等），因为那是中文材料；其他语言版不放中文古译。每部书的「差在哪」总结也用这一版的语言写（多章书放目录页，单章书放经文后）。
6. **还没译完的书**：在这一版的首页单独列一组（英文版叫 Chinese only for now），用这一版的语言写书名和一句简介，点进去开中文版。
7. **门禁**：每加一种语言，测试要覆盖：每章的译文段数等于原文段数；页面里没有别的语言的栏（`data-col`）；语言切换指向对应页。改完扫一遍这一版的页面，除了上面三种例外，不该出现别的语言的字。

现在 `scripts/build.mjs` 只认 `zh` / `en` 两版（`T` 表、`hasEn`、`/en/` 写死在几处）。加第三种语言时先把这些抽成按语言循环（`T[lang]` + `translations/<lang>/`），再加内容。

## 怎么跑

```bash
npm run dev     # 预览，端口取 PORT，没有就随机空闲端口；改 content/、translations/ 或 src/ 自动重建
npm run check   # 完成门禁：单元测试（内容校验、英译指纹、断链、各栏段数、本地服务）+ 构建
```

## 改完必须补日志

- 接手任务前先搜改动史：`grep -rn "<关键词>" logs/entries/`，重点看 `ripples`。
- 每个非平凡改动写一条：`npm run log:append < entry.md`（stdin 首行 `### 标题`），落在 `logs/entries/` 一条一个文件。不要手建条目文件、不要整文件写回 `log.md`。字段与写法见 `log.md` 顶部的格式约定。
- `log.md` 的 frontmatter 是面板认这个项目的凭据（项目 id `Scripture`）：删了它，面板就不再扫这个仓库，PR 也不会被自动合并。

## 流程

改动走 worktree → PR → CI（`verify.yml` 跑 `npm run check`，main 分支保护要求 `verify` 通过）→ 个人面板自动合并（仓库开了 `allow_auto_merge`）；合并到 main 后 `deploy.yml` 发布到 GitHub Pages。不要直接往 main 提交。
