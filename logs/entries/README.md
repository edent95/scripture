# logs/entries

这个目录里一条日志一个文件,由 `npm run log:append`(`scripts/append-log.mjs`)新建,不要手写、不要改名。
几个分支 / agent 同时写日志时各建各的文件,PR 合并不会在 log.md 上冲突。面板会把这里的条目与 log.md 合在一起显示。
