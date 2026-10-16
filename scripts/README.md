# 维护脚本入口

应用使用原生浏览器脚本，以下工具不引入构建流程。生成物、截图及完整日志留在忽略的 `output/`。

| 位置 | 职责 |
| --- | --- |
| `check.cjs` | 生产语法、共享声明、资源、Node 回归与内置户型校验 |
| `serve.cjs`、`repository-server.cjs` | 正式本地服务与仓库设计保存接口 |
| `verify-browser.cjs` | 浏览器验收调度、隔离副本、临时服务、依赖排序和结果 |
| `verify/` | 70 个浏览器函数与 8 个独立 Node 验收实现 |
| `lib/` | 浏览器环境配置、预览模板装配等共用代码 |
| `generate-previews.cjs`、`preview-*.cjs` | 预览生成入口和生成器，独立于浏览器验收用例 |
| `inspect-*`、`validate-*`、`make-*` 等 | 图纸检查、固定合成输入及维护工具 |

稳定命令：

```sh
node scripts/check.cjs
node scripts/serve.cjs
node scripts/generate-previews.cjs
node scripts/verify-browser.cjs --list
node scripts/verify-browser.cjs --all --keep-going
```

原来的 `node scripts/verify-beam-roof.cjs` 等独立命令保留为兼容入口，统一委托浏览器调度器。新实现放在 `verify/`；维护时修改该目录内的源文件。浏览器函数通过 `(page, verification)` 接收环境，不直接作为普通 Node 文件执行。

这一批先归类验收用例；预览生成器保留现有位置。开发依赖安装、验收环境与结果查看见 [浏览器验收](../docs/BROWSER-VERIFICATION.md)，本地生成物与长期资料的边界见 [生成物约定](../docs/OUTPUT-ARTIFACTS.md)。
