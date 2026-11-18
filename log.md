---
project: Scripture
title: 梵文经书白话直译
status: in-progress
version: 0.3.0
updated: 2026-11-18
progress: 60
priority: medium
tags: [sanskrit, static-site, i18n, seo]
log_format: rag-v1
links:
  ui: https://scripture.eden-tan.com/
  repo: https://github.com/edent95/scripture
milestones:
  - { name: "英译补齐：法华经、楞伽经、维摩诘经、无量寿经", done: false }
---

# Scripture 开发日志

## 格式约定 (rag-v1)

> 这一节位于第一条 `## YYYY-MM-DD` 之前，解析器看不见它，只给读原文的人和 agent。

**这份 log 是写给检索的，不是写给连读的。** 每条条目被单独召回时必须自解释：重复主语，不用「它 / 上述」。

条目在 `logs/entries/`（一条一个文件，多个分支 / agent 不会在同一个文件上冲突），**必须用 `npm run log:append < entry.md` 写**，不要手建、不要整文件写回。字段：`type` / `scope` / `impact` / `changed` / `ripples`（谁的假设失效了、谁必须跟着改，答不出写「无」）/ `verified` / `keywords` / `learned`（每条以 `[skill:<id>]` `[knowledge]` `[rule]` `[project]` 开头，没有写「无」）。

改动史：`ls logs/entries | tail -20`；动手前 `grep -rn "<关键词>" logs/entries/`。
