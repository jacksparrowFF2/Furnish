# 桌面窗口生命周期修复验收

日期：2026-10-28 至 2026-10-29（Asia/Shanghai）。

修复范围是 desktop/main.cjs；不修改项目格式、网页保存或恢复逻辑。保留现有未提交设计及其他并行任务文件。本机 output/desktop/Furnish-win32-x64/resources/app/main.cjs 已同步修复，原脚本备份在 output/playwright/desktop-main-before-lifecycle-fix.cjs。

通过：

- node --check desktop/main.cjs 及两个新增测试文件。
- node tests/test-desktop-lifecycle.cjs：实际 main.cjs 在可控 Electron 替身下覆盖启动前重复启动、最小化激活、closed 清引用、关闭期间多次请求仅一次重启、setProxy 等待中关闭、加载中关闭、真实加载失败、正常退出与后端清理失败。
- node tests/test-desktop.cjs：目录与导航策略、自有／借用服务、后端升级、关闭、端口冲突和拒绝覆盖打包。
- node tests/test-desktop-native.cjs：真实 Electron BrowserWindow、系统单实例锁与 app.relaunch；临时页面及独立缓存，后端替身延迟 1.5 秒以稳定覆盖关闭竞态。真实服务关闭由上一项及打包验收覆盖。
- node scripts/verify-desktop.cjs：当前修复包真实启动；隔离设计编辑、撤销重做、保存刷新、原生导入导出、390px、WebGL、打印 PDF、HTTP 共享、断网 file:// 二维三维、退出停止自有后端及重启恢复。原用户设计哈希未变，页面错误为空。

原始结果（本机 output 忽略目录保留）：

- output/playwright/desktop-lifecycle-ZmIpLF/results.json 与 events.jsonl：关闭后 second-instance 到来，先 cleanup-done，随后新 primary；新窗口正常退出，无 error。
- output/desktop-verification/2026-10-28T15-57-44-969Z/results.json 及桌面／浏览器截图、打印 PDF。

初次后端测试在沙箱内因回环连接 EACCES 超时；获准在沙箱外复验通过。原生夹具首次等待 show 时机及生成脚本括号错误已纠正，最终原生验收通过。未运行全量 check、所有模型编辑器、实际打印机、Blender 渲染或实机触屏。

边界：关闭提示选择继续编辑仍由原 beforeunload 决定；不会提前释放单实例锁以制造两个后端清理／启动并发。现有其他分发包不会自动更新，需同步桌面脚本或重新打包；已经运行的进程须退出重开后才载入新脚本。
