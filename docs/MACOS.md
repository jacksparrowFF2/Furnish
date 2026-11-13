# Mac mini 迁移与实机验证

准备日期：2026-11-13；计划实机验证：2026-11-14。目标为用户指定的 Mac mini M6 / 24GB，按 Apple Silicon arm64 路线准备，不预估该型号的实际帧率、可容纳模型量或渲染性能。当前结果是代码适配和 Windows 回归，Mac 原生签名、GUI、WebGL 与 Blender 仍待实测。

## 首次准备

在 Mac 的用户可写目录克隆仓库，例如 `~/Documents/GitHub/Furnish`。保留现有 Windows 电脑及其正式设计文件，先从原桌面的保存状态确认保存成功，再导出**最新完整项目**。仅存在浏览器／桌面缓存中的编辑必须先保存或导出；Git 仓库的示例工作区不一定是最新正式方案。

在 Mac 安装原生 arm64 Node.js **24.9+**、Git；需要建模时安装原生 Apple Silicon Blender（现有接口最低 4.2，优先沿用已验证的工程版本）。Codex MCP 需要新机器自身的 Codex CLI／插件配置；若暂不使用 Blender 或 MCP，可先验收布局功能。

在仓库 Terminal 中运行：

```bash
node -p 'process.platform + " " + process.arch'
# 应为 darwin arm64；若为 x64，先改用原生 Node，再安装依赖。
npm ci
mkdir -p output/mac-preflight
node scripts/doctor-macos.cjs --json > output/mac-preflight/environment.json
npm run desktop:package
open output/desktop/Furnish-darwin-arm64/Furnish.app
```

首次依赖安装需要联网。若 `npm ci` 的 Electron 安装脚本被本机 npm 策略禁用，先按本机策略允许该依赖，再执行 `node node_modules/electron/install.js`；不要从 Windows 复制 `node_modules`。本机包旁的 `furnish-desktop.json` 指向本次 Mac 源码目录，后续更新网页源码刷新即可；更新 `desktop/` 壳需用新的空输出目录重新打包并重启。

环境预检只读检查平台、Node/Electron 架构、工作目录写权限、macOS 打包工具，以及 Blender／Codex 程序发现；返回 `preflightPassed` 不代表实机验收完成。预检失败返回非零退出码；JSON 仍完整输出，便于排查。24GB 是目标机器配置，不是程序要预先申请的内存。

## 日常入口与文件位置

- 源码桌面：`npm run desktop`，或打包后双击 `start-furnish-desktop.command`。源码入口需要 Node，打包目录内的同名入口可直接使用包内运行时。
- 本地服务：双击 `start-furnish.command`，或 `node scripts/serve.cjs --open`，默认打开系统浏览器并绑定 `127.0.0.1:8765`。
- 原离线入口：直接打开 `index.html`，保留二维、三维、缓存和手动导入导出；正式文件自动保存与 Blender 服务需要 HTTP／桌面入口。
- `.command` 保持 LF 和可执行位；若通过 ZIP/文件复制丢失执行位，可在仓库中执行 `chmod +x ./*.command`。Finder 不读取交互 shell 的启动配置，入口补充 `/opt/homebrew/bin` 和 `/usr/local/bin`；nvm 等自定义 Node 路径可从已配置的 Terminal 启动。
- 工作区位于 `.app` **旁边**，不要把项目写进 `.app/Contents`。本机包连源码目录；`--portable` 包使用包外层目录的 `projects/workspace.furnish.json`。程序、源码、配置和资源需一起保留，不能只把 `.app` 拖走后丢弃相邻文件。
- 桌面缓存：`~/Library/Application Support/Furnish/desktop/<工作目录哈希>`；不同工作目录隔离，区分大小写的 Mac 文件系统不会混用仅大小写不同的路径。
- Cmd+S 保存；Cmd+Z / Cmd+Shift+Z 撤销／重做。Mac“编辑”菜单在普通文本输入中调用原生编辑，在画布和编辑器中沿现有键盘／撤销链处理。关闭最后一个窗口后保留应用及其后台，点击 Dock 或再次启动可重开；Cmd+Q 才退出并关闭自己拥有的后台，借用后台保留。

便携包命令（输出必须尚不存在）：

```bash
node scripts/package-desktop.cjs --portable --out "$HOME/Documents/Furnish-portable"
```

打包按 [Electron 手工分发结构](https://www.electronjs.org/docs/latest/tutorial/application-distribution) 放置 `Contents/Resources/app`，更新应用及 Helper 标识，写入 Furnish 图标并执行本机 ad-hoc 签名与校验。签名或校验失败即打包失败，保留失败目录以便排查，不把它作为有效包继续使用；再次打包选择新路径。**未提供 Developer ID 签名、公证、安装器或跨平台预制 Mac 二进制**。首次本机启动的系统提示待实测，不通过关闭 Gatekeeper 或沙箱处理故障。

## 从 Windows 迁移

1. 从原应用导出最新完整项目，备份原正式文件、恢复副本及重要 Blender 工程；不要用仓库示例覆盖它们。
2. 在 Mac 的“帮助 → 关于 Furnish”确认源码工作目录；在顶部保存状态检查新机器实际保存位置。导入已导出的项目，保存到 Mac 用户可写目录，刷新、退出重开后核对户型、方案数量、家具数和代表性柜体／设备。原机器保持备份。
3. **不直接复制 Windows `.local/`、浏览器配置、桌面缓存或 `node_modules`**。其中存储位置、桌面 EXE、Blender 工程等可能含 `D:\…` 等绝对路径；需要的恢复文件作为独立备份保留，再按项目导入，而非整目录覆盖新机器本机配置。
4. Blender 精修 `.blend`、外部贴图及源资产另行迁移，保留源工程；在 Mac 重新登记工程位置并核对贴图。应用正式离线模型已随仓库资源提供，不能把作者机 `output/` 当成必需运行目录。
5. Mac 与 Windows 不同时编辑同一个通过云盘共享的正式文件。轮换机器时先保存并导出／提交最新成果，再在另一端读取；保留原修订冲突检查。

Blender 自动寻找 `/Applications/Blender.app/Contents/MacOS/Blender`、`~/Applications/Blender.app/Contents/MacOS/Blender`、Homebrew 及 PATH。自定义安装可在启动服务前设置 `FURNISH_BLENDER` 为**实际可执行文件**，不是 `.app` 目录。MCP 菜单或 `connect-codex.command` 复用原注册流程；CLI 不在 PATH/Homebrew 时设置 `FURNISH_CODEX_CLI`，不覆盖现有禁用／工具限制。新装建模插件需重新 `furnish_model bind` 到 Mac checkout。

现有 Cycles worker 已支持 Metal 发现、自动 GPU 失败后回退 CPU，本次没有改写渲染设备策略；Mac 是否实际启用 Metal 应以任务回执为准。普通 GUI／后台 Blender 与 DSH 的 virtual-gui 是不同能力，后者上游未实现 macOS provider，不列为本次已支持功能。

## 2026-11-14 实机清单

先跑环境预检，再从 Windows 导出的最新完整项目复制一份，专用于验收。自动验收已有隔离源码、端口、缓存与项目；不要在正式方案里试验。

```bash
npx playwright install chromium
node tests/test-desktop-macos.cjs
node tests/test-desktop-lifecycle.cjs
node tests/test-desktop-executable.cjs
node tests/test-desktop.cjs
node tests/test-blender-discovery.cjs
node tests/test-blender-render.cjs
FURNISH_TEST_PROJECT="$HOME/Documents/1601-验收副本.furnish.json" npm run verify:desktop
```

`verify:desktop` 默认寻找标准打包位置。若用了自定义输出，改用 `node scripts/verify-desktop.cjs "/自定义目录/Furnish.app/Contents/MacOS/Electron"`，同样可设置 `FURNISH_TEST_PROJECT`。`test-desktop-macos` 使用夹具检查组装逻辑，不能代替实际签名／启动；真正的签名在 `desktop:package` 执行。环境预检和实际打包也须单独成功。

| 验证项 | 明天应记录的结果 |
|---|---|
| 原生运行 | macOS 版本、芯片、24GB 内存、Node/Electron 为 arm64、打包签名校验成功、实际双击启动 |
| 原项目兼容 | 当前户型、命名方案、家具数、柜体板件／开合、设备离地和贴图正确；不发生原位置漂移 |
| 编辑与保存 | Cmd+S、Cmd+Z、Cmd+Shift+Z、复制粘贴、文本输入、刷新、退出重开、保存路径可写 |
| Mac 窗口行为 | 关窗后 Dock 重开、二次启动重开、Cmd+Q 清理自有服务、未保存关闭保护、原生文件对话框 |
| 图形与输入 | 2D/3D 切换、镜像材质／玻璃、柜门动画、鼠标右键／触控板双指滚动及拖动、Retina 缩放、窄屏 |
| 离线与导出 | 断网 file:// 2D/3D、HTTP 保存、项目往返、PNG/GLB、打印 PDF |
| 稳定性 | 当前 1601 场景连续操作 15–30 分钟，记录卡顿、首开 3D 时间、内存压力与是否持续增长；先建立实机基线 |
| Blender 建模 | GUI 自动开窗、MCP 连接、模型编辑／保存、GLB 导出回读；若测渲染，另记 Metal/CPU 回执 |

自动验收的 `output/desktop-verification/verification-*/results.json` 额外记录实际平台、架构、Electron/Chromium/Node 版本、系统内存、GPU 状态、首次切入 3D 的端到端耗时和当时的进程内存。该耗时包含页面操作和等待，不是 GPU 帧率；单次内存快照不能证明无泄漏。截图和失败详情保留在同一目录，人工补记上述触控板、长时间稳定性和建模结果。

24GB 的资源策略先沿现有按需渲染、模型缓存、预览释放及 DPR 最大 2 的实现。明天用真实方案和显示器建立基线，再按实际瓶颈调整；本次没有按芯片名称硬编码降画质、GPU 后端或内存上限。
