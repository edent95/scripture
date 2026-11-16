# AGENTS.md — scripture.eden-tan.com

梵文经书白话直译站：每段梵文直译成白话，对照古代汉译，附梵文原文。Eden（eden-tan.com）的子域，独立仓库、独立部署（GitHub Pages）。默认用中文回复。

## 结构

- 内容只收个人面板书库「梵文」书架的九部：心经、金刚经、阿弥陀经、无量寿经、法华经、维摩诘经、楞伽经（佛经）；薄伽梵歌、瑜伽经（印度经典）。
- `content/<slug>.json` 是**生成物**：`node scripts/import-dashboard.mjs [面板书库目录]` 从 `personal-dashboard/client/public/books/local/sa-*.json` 转过来（面板那边是 p 白话直译 → old 古译对照 → sa 梵文 的 prose 格式）。改内容去面板那边改，再重新导入；不要手改 content/。新增一部书：在导入脚本的 `BOOKS` 表加一行（面板 id、slug、tradition、一句白话简介）。
- 一段 = `{ zh 白话直译, old?: { who, text 古译原句, plain 古译今译, notes[{ w, note }] }, sa: { text 天城体, tr 罗马转写 } }`，校验见 `scripts/content.mjs`。
- `scripts/build.mjs` 生成 `dist/`：首页、多章经书的目录页、每章一页（单章经书的章节页就是 `/<slug>/`，多章是 `/<slug>/<n>/`），加 `sitemap.xml`、`robots.txt`、`llms.txt`、`CNAME`、`404.html`。
- `src/` 原样复制进 `dist/`（样式、三栏开关脚本、favicon）。零依赖，不要为小事加 npm 包。

## 内容规矩

- 梵文原文与古代汉译（玄奘、鸠摩罗什、康僧铠、实叉难陀）是公有领域；**不要收现代人的译本**（如王志成译《薄伽梵歌》），它们有版权。
- 白话要像跟朋友讲；不加立场，不做护教或批判。

## 怎么跑

```bash
npm run dev     # 预览，端口取 PORT，没有就随机空闲端口；改 content/ 或 src/ 自动重建
npm run check   # 完成门禁：单元测试（内容校验、断链、三栏句数、本地服务）+ 构建
```

## 流程

改动走 worktree → PR → CI（`verify.yml` 跑 `npm run check`）→ 自动合并；合并到 main 后 `deploy.yml` 发布到 GitHub Pages。不要直接往 main 提交。
