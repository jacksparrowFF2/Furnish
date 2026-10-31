# Furnish Windows 桌面版

桌面版提供独立窗口和自带的 Electron 45.0.0 运行环境。解包后双击 `Furnish.exe`，无需另装 Node.js 或浏览器，运行不需要联网。当前打包入口支持 Windows x64；这仍是使用 Chromium 内核的桌面程序。

2026-10-31：Ctrl+S立即保存当前已应用方案；未保存修改最迟1分钟自动保存。顶部保存状态显示未保存／保存中／最后成功时间，点击可立即保存或查看路径和失败原因。每次编辑仍即时写恢复缓存；编辑窗口草稿需先点击其应用／保存设计。切到后台不立即写正式文件，关闭时的原保存保护保留。

## 本机使用

已打包的本机入口是 `output/desktop/Furnish-win32-x64/Furnish.exe`。也可双击仓库根目录的 `start-furnish-desktop.cmd`。必须保留整个程序文件夹，不能只移动 EXE。

默认打包生成旁边的 `furnish-desktop.json`，其中 `root` 指向本次打包的源码目录。桌面版直接加载该目录中的正式网页和 `scripts/serve.cjs`，所以本机继续更新源码即可使用新功能。窗口标题以 Furnish 开头；菜单可以打开工作目录、在浏览器打开同一服务、刷新和全屏。

桌面版与原浏览器版共用本地服务选择的正式文件（未设置时为 `projects/workspace.furnish.json`，可在“保存／导出 → 保存位置与历史备份”修改）及恢复副本；Blender 配置及输出仍在原工作目录。保留原项目格式、原子保存、文件锁、版本冲突保护和 `mutate()` 撤销链路。修改保存位置时复制并保留源数据，不覆盖目标已有的不同项目。

Chrome／Edge 的缓存不由桌面版直接读取。如果尚有仅存在浏览器缓存的编辑，先用原来的 `start-furnish.cmd` 在原浏览器保存到文件，或导出项目后在桌面版导入。桌面版缓存独立存放在 `%APPDATA%/Furnish/desktop/<工作目录哈希>`；不同目录互不混用。首次打开没有桌面缓存时仍使用原来的文件优先和恢复副本规则。

同一工作目录重复启动会激活仍有效的已有窗口。窗口已关闭且后台正在退出时，新的启动请求会合并为后端清理完成后一次重新启动，不再访问已销毁窗口。同目录本地服务已经运行且代码相同时直接复用；后端代码变化沿原启动脚本的指纹协议重启。其他目录或其他程序占用端口时明确报错，不连接错误的设计文件。默认端口仍为 8765，`FURNISH_PORT` 可指定其他固定端口。

新版服务提供独立恢复线程。主线程无响应时，再次启动浏览器入口或重新启动桌面版，会在验证本目录、原端口及实例令牌后，连续两次探测主线程；均超时才结束该服务自身并恢复原端口，保持原浏览器来源及缓存地址。恢复记录在 `.local/server-runtime`，不写入项目。正常服务不被强制重启；其他目录、其他程序和缺少有效恢复记录的旧版服务不会被自动结束。全进程挂起或恢复线程也失效时仍需手动关闭原服务。强制恢复无法补回尚未完成的请求；已有项目原子保存、锁与恢复副本机制继续负责磁盘一致性，不承诺保留未写入编辑。

窗口关闭时沿现有 `beforeunload` 发起保存；有未写入内容则提示继续编辑或保留缓存后关闭。桌面版自己启动的服务随应用退出关闭，已有且被借用的浏览器服务保留。从桌面菜单打开的浏览器若依赖桌面托管服务，退出桌面版后需使用原启动脚本重新启动服务。两个窗口同时编辑仍会触发原有修订冲突保护，不自动合并修改。

## 日常调试优先入口

专用 MCP 可读取和修改当前桌面方案，提供复制、家具位置／尺寸和生产空间核对，沿原撤销／保存链路。工具、版本条件及接入方法见 [MCP 使用说明](MCP.md)。

优先从桌面快捷方式启动的 Furnish 复现问题和做最终目视验收。先通过“帮助 → 关于 Furnish”核对工作目录，再通过顶部保存状态核对正式文件位置及当前方案。正式窗口以只读检查为主；面板展开状态、缩放等本机偏好可与浏览器不同，两端不应同时编辑同一方案。

本机包的 `furnish-desktop.json` 指向源码目录，因此修改该目录的网页脚本、样式或资产后，在桌面窗口刷新即可加载。开发者工具位于“视图 → 开发者工具”。修改后端后通过原启动协议重启服务；修改 `desktop/` 壳代码或 Electron 运行时则需更新打包文件并重启，单独刷新页面不会更新 `resources/app` 中的副本。

涉及布置编辑、保存、导入或恢复的验收，先复制顶部保存状态显示的当前正式文件，再用同一打包 EXE 及 `FURNISH_DESKTOP_ROOT`、`FURNISH_DESKTOP_PROFILE`、`FURNISH_PORT` 指向独立源码／设计副本、缓存和空闲端口。复用 `scripts/verify-desktop.cjs` 的隔离方式；该脚本默认复制仓库 `projects/workspace.furnish.json`，不代表外置正式文件的最新内容。复现当前用户方案时应将已备份的正式文件放入隔离目录，且不复制指向正式保存目录的 `.local/storage.json`。不清理用户缓存或覆盖正式文件来制造一致。

桌面优先不取代按改动范围执行的 HTTP／断网 file:// 兼容验收。尤其修改加载机制时仍须实际验证两个入口。

## 浏览器入口保留

- 原 `start-furnish.cmd` 和 `node scripts/serve.cjs` 保持可用。
- 直接打开 `index.html` 保留离线二维／三维、本地缓存和手动导入导出；原来需 HTTP 的 PDF 导入及仓库保存仍需本地服务。
- 导出 JSON、项目、CSV、SVG／PNG 继续使用原网页逻辑，桌面版使用原生保存对话框。打印仍由 Chromium 提供。
- Blender 接口沿用正式服务，仍需要用户另行安装 Blender；桌面运行时不包含 Blender。

## 重新打包与迁移

首次准备开发依赖需要联网，已有完整依赖后打包仅复制本机文件，不改写网页源码，不引入网页构建过程：

```powershell
npm ci
node node_modules/electron/install.js
npm run desktop:package
```

`npm run desktop` 使用已安装的 Electron 从源码启动。本机生成物被现有 `output/` 忽略规则排除，不提交大体积运行时。

打包拒绝覆盖已有目录，防止覆盖其中的用户设计。重打包时选择新路径：

```powershell
node scripts/package-desktop.cjs --out output/desktop/Furnish-next
```

发布或复制到其他电脑时生成独立便携目录：

```powershell
node scripts/package-desktop.cjs --portable --out output/desktop/Furnish-portable
```

便携包不带机器绝对路径，也不包含任何个人设计、恢复副本或缓存；程序文件夹本身就是工作目录。需要继续原设计时，在未运行程序时手动复制原 `projects/` 到便携目录，必要时另带 `.local/`；或在窗口中导入已导出的项目。精修 Blender 工程配置中的绝对路径仍需在新电脑重新登记。若 Windows 保护目录不可写，将整个文件夹放到用户有写权限的位置。

普通本机包含 `root` 路径，移动到其他电脑后不会静默回退到空设计；路径不可用时明确报错。使用便携打包方式或明确修改 `furnish-desktop.json` 的 `root`。

## 验证与边界

`node tests/test-desktop.cjs` 检查目录解析、导航限制、服务复用／关闭、端口冲突及拒绝覆盖打包。`npm run verify:desktop` 启动真实打包 EXE，在 `output/desktop-verification/` 创建独立源码／设计／缓存副本，验收恢复、编辑、键盘撤销重做、保存、导出、WebGL、打印、HTTP 浏览器共享、直接 file:// 与退出重启。可通过 `node scripts/verify-desktop.cjs <EXE路径>` 指定其他包。脚本检查源设计哈希，绝不把验收编辑写回原工作区。

页面使用隔离上下文和渲染器沙箱，不启用 Node；网页继续通过原同源 HTTP 接口读写。外链交给系统浏览器，阻止 file/javascript 等外部导航。本机页面请求直连，不依赖系统代理。桌面壳不暴露任意文件读写或执行命令的桥接接口。依据 [Electron 安全说明](https://www.electronjs.org/docs/latest/tutorial/security) 和[手动分发方式](https://www.electronjs.org/docs/latest/tutorial/application-distribution)。

当前交付为未签名的便携文件夹，未提供安装器、自动更新或文件关联。不能保证系统不会对未签名程序显示来源提示。只验证实际执行的流程；物理打印机、完整 Blender 渲染、所有模型编辑器和其他 Windows 架构不属于本次桌面专项的全量验证。

2026-10-28 窗口生命周期专项：`node tests/test-desktop-lifecycle.cjs` 覆盖生产监听器的销毁／异步加载竞态；`node tests/test-desktop-native.cjs` 使用独立缓存与临时页面，以可控的后端延迟验证真实 Electron 单实例激活、关闭期间重复启动及原生 relaunch。后者需要本机 Electron 和回环连接；结果存于 `output/playwright/desktop-lifecycle-*/`。详见 [验收记录](validation/desktop-lifecycle-20261028/README.md)。
