# 可迁移的浏览器验收

应用运行仍只需要 Node.js；浏览器验收额外使用固定版本的 Playwright 开发依赖，不参与页面加载。`package-lock.json` 随 Git 提交，`node_modules` 和浏览器安装文件留在本机。

## 新电脑准备

克隆仓库后，在仓库根目录运行（Node.js 20 或更新版本）：

```sh
npm ci
npx playwright install chromium
node scripts/check.cjs
node scripts/verify-browser.cjs
```

Windows PowerShell 如果阻止运行 npm 的 ps1 启动脚本，可使用 `npm.cmd ci`、`npx.cmd playwright install chromium`。Linux 的浏览器系统库可按 [Playwright 浏览器安装说明](https://playwright.dev/docs/browsers) 使用 `npx playwright install --with-deps chromium` 安装。首次安装需要网络，安装完成后的验收使用本地资源。

默认执行 `portable-smoke`，实际覆盖 HTTP 与断网 `file://` 启动、生产二维墙体、编辑、撤销重做、刷新恢复及三维模型。执行成功不代表所有功能或所有历史验收用例通过。

## 选择用例

```sh
node scripts/verify-browser.cjs --list
node scripts/verify-browser.cjs cabinet-custom-fronts
node scripts/verify-browser.cjs kitchen-dish-basket dining-plan-order
node scripts/verify-browser.cjs purchase-relink
node scripts/verify-browser.cjs --all
node scripts/verify-browser.cjs --all --keep-going
```

`--all` 顺序执行全部已登记用例，遇到失败停止并记录未执行项；追加 `--keep-going` 会继续执行后续用例，以便完整收集失败，最终仍返回非零退出码。进度在每个用例结束时更新到结果文件。用例名称来自 `verify-*.browser.js` 及登记的独立 Node 脚本。旧 `.cjs` 入口保留并转交统一入口；旧 `playwright-cli run-code --filename` 命令不再直接运行这些文件，需要统一入口传入第二个参数 `verification`。

工作流依赖由入口显式排序并去重：`workflow-reimport` 生成下载项目，供 `drawing`、`room-net` 使用；采购用例依赖房间用例，重新关联和家具标签用例依赖采购用例。历史用例如因产品行为变化失败，日志保留原断言，不自动跳过或降低标准。

## 路径、服务与隔离

`scripts/lib/browser-verification.cjs` 统一提供项目根路径、正确编码的文件 URL、HTTP 地址、Playwright 依赖加载和浏览器启动参数。每次执行在 `output/playwright/verification-*/workspace 迁移 #/` 创建独立副本，复制源码和固定测试输入，重新生成预览。包含中文、空格和 `#` 的路径同时检查文件 URL 的迁移兼容性。

验收服务默认绑定 `127.0.0.1` 的系统空闲端口，生命周期由入口管理，结束时关闭；不会连接已经运行的正式 Furnish 服务。指定地址表示让验收服务绑定该地址，端口已占用就报错，不复用占用者：

```powershell
$env:FURNISH_VERIFY_URL = 'http://127.0.0.1:19080/'
node scripts/verify-browser.cjs
Remove-Item Env:FURNISH_VERIFY_URL
```

服务仅提供静态文件，禁止写请求，不提供仓库设计 API。HTTP 页面会显示仓库保存不可用的提示，编辑仍在独立浏览器缓存中恢复；这些用例验证界面和缓存行为，仓库保存接口及冲突另由 `scripts/check.cjs` 中的回归验证。所有用例使用新浏览器和临时存储，不附着日常浏览器，不复制当前 `projects/workspace.furnish.json`，不修改真实设计。

固定输入维护在 `tests/fixtures/browser`，包括历史 1601 图纸验收快照与合成工作流项目；后续输出在本次副本内生成，不依赖旧 output 或外部盘符。原本机输入文件保留。`verify-workflow-downloads.cjs` 是下载内容检查器，需显式传入待检查下载目录。

## 可选配置与结果

| 环境变量 | 用途 |
| --- | --- |
| `FURNISH_BROWSER_CHANNEL` | 使用已安装的浏览器，例如 `msedge` 或 `chrome`；默认使用配套 Chromium |
| `FURNISH_BROWSER_PATH` | 使用明确指定的浏览器可执行文件；设置时优先于 channel |
| `FURNISH_VERIFY_HEADED=1` | 显示验收浏览器 |
| `FURNISH_PLAYWRIGHT` | 显式使用另一份已安装模块；常规安装无需设置 |
| `FURNISH_VERIFY_TIMEOUT` | 单个用例进程超时，单位 ms，默认 360000 |

`FURNISH_VERIFY_ROOT` 是入口传递给工作进程的内部副本路径，无需手动设置。每次运行打印结果目录，其中 `results.json` 记录所选用例、通过／失败及未执行项，各用例保存独立日志，截图及导出文件位于该次 workspace 的 output 中。失败会返回非零退出码，包括原脚本返回 `{status:'FAIL'}` 的情况。

环境配置和用例语法、固定输入哈希、前置顺序及静态服务写入隔离由 `tests/test-browser-verification.cjs` 回归。新浏览器用例保持 `(page, verification)` 接口，路径和地址使用传入配置，不写本机盘符、固定服务端口或 npm 缓存路径。

## 首次环境迁移实测范围（2026-10-16）

首次环境迁移使用 Windows、Node.js 24.18.0、Playwright 1.64.1 的配套 Chromium：通过 173 套回归、12 套内置户型校验；当时通过 11 项浏览器用例，包括默认 HTTP／断网 file 冒烟、餐椅层叠、厨房碗碟篮、完整项目工作流、房间净距、采购、梁顶、鱼缸预览、自定义柜门、真实图纸区域合并及产品规则。随机端口与显式指定端口均已实际启动，旧独立 Node 入口也已通过。首次记录见 [验收摘要](validation/browser-portability-20261016.json)。该首次记录未完整执行 78 项；其他浏览器与操作系统未实测。

## 全量修复与复跑（2026-10-16）

`--all --keep-going` 首轮完整执行 78 项，63 通过、15 失败；修复后使用同一份代码从头完整复跑，**78/78 通过，失败 0、未执行 0**。173 套 Node 回归与 12 套内置户型校验也通过。逐项结果、初始失败名单及数据保护范围见 [全量验收摘要](validation/browser-full-20261016.json)。

修复包括水槽橙色孔边与绿色外沿标签相交的实际显示问题，以及旧脚本与现有编辑入口、内外层草稿、当前模块标注、紧凑打印和按需滚动行为不一致的问题。几何／阈值、取消、撤销重做、刷新和真实下载再导入仍实际检查，没有跳过失败用例。真实设计在验收期间出现的新编辑已另存并保留，不纳入代码提交。
