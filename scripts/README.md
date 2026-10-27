# 维护脚本入口

应用使用原生浏览器脚本，以下工具不引入构建流程。生成物、截图及完整日志留在忽略的 `output/`。

| 位置 | 职责 |
| --- | --- |
| `check.cjs` | 生产语法、共享声明、资源、Node 回归与内置户型校验 |
| `serve.cjs`、`repository-server.cjs` | 正式本地服务与仓库设计保存接口 |
| `package-desktop.cjs`、`verify-desktop.cjs` | 可选 Electron Windows 便携包与隔离真实桌面／浏览器验收；不构建网页源码 |
| `verify-browser.cjs` | 浏览器验收调度、隔离副本、临时服务、依赖排序和结果 |
| `verify/` | 浏览器函数与 8 个独立 Node 验收实现，当前名称以 `--list` 为准 |
| `lib/` | 浏览器环境配置、预览模板装配等共用代码 |
| `generate-previews.cjs`、`preview-*.cjs` | 预览生成入口和生成器，独立于浏览器验收用例 |
| `inspect-*`、`validate-*`、`make-*` 等 | 图纸检查、固定合成输入及维护工具 |

`node scripts/inspect-toolbar-workspace.cjs projects/workspace.furnish.json` 显式读取指定工作区的当前实际户型，在独立源码副本与浏览器缓存中检查浮条、尺寸及四向面板。服务只读且屏蔽外部网络，不连接日常浏览器；检查图纸内容与源文件哈希前后一致，结果和截图写到 `output/playwright/real-toolbar-*`。涵盖五种桌面／窄屏／横屏视口，出现遮挡或越界返回非零。不会隐式读取当前设计，也不列入 `--all`，避免通用回归依赖个人方案。

稳定命令：

`inspect-canvas-performance.cjs <工作区.json> <修改前源码目录>` 在隔离浏览器中显式读取指定工作区，交替运行旧／新画布函数，每项预热4对后分别取40个样本；结果写到 `output/performance-paired.json`。只通过离线文件读取应用，不连接日常浏览器或写回设计，保持原工作区字节。可用 `FURNISH_BROWSER_CHANNEL=chrome` 选择已安装浏览器；默认沿用验收浏览器配置。比较前源码目录须另行准备，脚本不覆盖当前工作树。同步函数耗时不代表真实FPS，冷启动、实际触屏与3D须另测。

`inspect-scene-performance.cjs <工作区.json>` 在 `output/scene-performance` 生成带临时观测接口的应用副本，用隔离浏览器离线打开指定方案；同一镜头位置交替比较自动阴影与缓存阴影，各预热4次后取20个样本。结果与截图保存在该目录，使用相同验收浏览器配置。计时包含 `gl.finish()` 等待GPU完成，不是整页FPS；脚本不修改生产入口或源设计。

```sh
node scripts/check.cjs
node scripts/serve.cjs
node scripts/generate-previews.cjs
node scripts/verify-browser.cjs --list
node scripts/verify-browser.cjs --all --keep-going
```

原来的 `node scripts/verify-beam-roof.cjs` 等独立命令保留为兼容入口，统一委托浏览器调度器。新实现放在 `verify/`；维护时修改该目录内的源文件。浏览器函数通过 `(page, verification)` 接收环境，不直接作为普通 Node 文件执行。

这一批先归类验收用例；预览生成器保留现有位置。开发依赖安装、验收环境与结果查看见 [浏览器验收](../docs/BROWSER-VERIFICATION.md)，本地生成物与长期资料的边界见 [生成物约定](../docs/OUTPUT-ARTIFACTS.md)。
