# macOS 适配准备（2026-11-13）

目标：用户的 Mac mini M6 / 24GB 后续承担 Furnish 日常运行与 Blender 建模。实机计划为 2026-11-14；本记录是在 Windows x64 完成的准备与增量验证，不代表 Mac 已通过。

## 实现范围

- 原生 macOS arm64/x64 Electron 手工打包；Mach-O 架构门禁、`.app`/Helper 标识、Furnish ICNS、本机 ad-hoc 签名及签名校验。拒绝覆盖已有输出；签名失败保留失败目录并报错，不发布为有效包。
- `.app` 外工作目录及原源码绑定／便携语义；非 Windows 缓存哈希保留路径大小写。原文件锁、恢复、保存和 `mutate()` 继续原实现，无新项目字段或加载脚本。
- Mac 菜单撤销／重做、剪切／复制／粘贴／全选区分文本输入和画布，复用原编辑链；最后窗口关闭后保留应用，Dock／二次启动重开，退出清理自有后台。
- LF、可执行的三份 `.command` 入口；系统浏览器打开及 Mac Blender／Homebrew CLI 发现。现有 Metal/CPU 选择策略未改。
- 只读 `doctor:mac` 环境预检；原隔离 `verify:desktop` 增加原生 Cmd 操作、系统／图形／进程信息和首次 3D 切换耗时。迁移步骤及明日实机清单见 [MACOS.md](../../MACOS.md)。

## 已通过

1. 受影响 Node 脚本语法及三份 Bash 启动器 `bash -n`；逐级读取目录核对入口中的 233 个本地资源引用，未发现路径大小写不匹配。该检查不代替实际 Mac 文件系统验证。Git Bash 在沙箱内因运行对象权限失败，提权后只读语法检查成功；HTTP 初测同样因回环连接 `EACCES` 失败，允许本机回环后相关测试成功，未通过修改源码规避沙箱。
2. `test-desktop-macos`：Mac 目录组装夹具、arm64/x64 不匹配拒绝、应用外根目录、不同平台程序选择、原生签名／校验命令装配、不包含个人项目／`.local`／`node_modules`、拒绝覆盖、LF 启动脚本。**PlistBuddy/codesign 在此测试中为注入的命令记录器，未真正执行。**
3. `test-desktop-lifecycle`：Windows 既有竞态／销毁／退出路径，以及 Mac 关窗后 Dock 与二次启动重开、无窗口时“关于”菜单、原生文本编辑与画布 Cmd 事件分派、编辑命令面向当前焦点子窗口、自有后台仅清理一次。
4. `test-desktop-executable`、`test-desktop`、`test-desktop-diagnostics`：配置优先级、目录解析、后台复用／升级／退出、端口冲突、日志有界与失败非致命。
5. `test-blender-discovery`、`test-blender-render`：Scoop／Store 旧路径、Mac 系统／用户 Applications、Homebrew／PATH／显式配置候选，原 GLB、导出变换及渲染 API 生命周期。渲染 worker 为受控夹具，不是 Mac 渲染。
6. `test-codex-mcp-registration`：独立 Codex 配置的注册、重复执行、禁用／工具限制及冲突保护、包内运行时。未更改用户 Codex 配置。
7. 实际 Windows Electron 45.0.0 新包在独立源码／项目／缓存／端口完成 `verify:desktop` 的 12 组检查：原项目恢复、沙箱、撤销重做与保存刷新、原生导出、导入往返、390px、生产 WebGL、PDF 打印、HTTP 共享、断网 file:// 二维／三维、退出重开、源文件哈希保持与无渲染器异常。

最后实际桌面结果在 `output/desktop-verification/verification-eEH3Ip/results.json`，夹具结果在 `output/desktop-verification/macos-layout-FSbBwG/result.json`。Windows 桌面环境摘要见 [windows-acceptance.json](windows-acceptance.json)，目视检查的正式生产 3D 截图见 [windows-desktop-3d.png](windows-desktop-3d.png)。截图来自隔离项目，无 Mac 菜单截图；Windows 原正式包和正式项目保持原样。

此后仅补充无窗口“关于”和焦点子窗口编辑路由，并通过生命周期回归；未再次重复整套桌面流程。只读预检在 Windows 确认返回 `preflightPassed:false` / `acceptance:not-executed`，不会将当前主机误报为 Mac 已验收。临时 Windows 测试包已在确认没有项目／本机数据且无运行进程后删除；报告与截图保留。现有历史工作树保留，其中 window-coverings 的未提交项目未动；没有新建临时分支。

## 未执行与边界

- 未在 Mac 执行依赖安装、原生二进制、PlistBuddy、codesign、系统启动来源提示、Finder／Dock、原生菜单／文件对话框、Retina／触控板及 Apple GPU 目视验收。
- 未验证 Metal 的实际设备回执、GUI 建模／GLB 回读或连续 15–30 分钟的 24GB 内存稳定性。单次 Windows 快照不能推广为 Mac 性能或无泄漏结论。
- 未提供公证、Developer ID 或安装器。保留 Electron 沙箱；不关闭系统安全检查。上游 DSH virtual-gui 未提供 macOS provider，不列入已适配能力。
- 未运行 Furnish 全量回归、所有模型整链路或物理打印机。检查限于桌面／启动／程序发现和依赖链；网页模型、数据格式与空间规则由其他任务维护。
