# Furnish MCP 增量验收

2026-10-31，Windows x64，本机快捷方式同一打包 `Furnish.exe`／Electron 45.0.0。

## 已通过

- `tests/test-furnish-mcp.cjs`：stdio 初始化、工具发现／调用、参数拒绝、未启动桌面、鉴权／Origin／浏览器来源拒绝、退出清理。
- `tests/test-furnish-mcp-desktop.cjs`：真实 EXE、独立源码／正式文件／缓存／端口和真实 stdio 客户端，共11组验收。包含复制并进入方案、去重、毫米中心／宽深高／旋转、一次原生撤销／重做、旧版本拒绝、家具与图层锁定、无效整批不修改、生产空间核对及阈值、原方案保留、正式文件保存／刷新、页面重载版本失效、外部写入冲突、断网file与退出清理。详细结果见 [results.json](results.json)。
- `tests/test-design-switching.cjs`、`tests/test-desktop-lifecycle.cjs`、`tests/test-desktop.cjs`、`tests/test-desktop-native.cjs`、`tests/test-repository-storage.cjs`、`tests/test-repository-workspace.cjs`：原方案链、桌面后端及模拟／原生生命周期、缓存恢复／正式文件保护回归。生命周期另验MCP尚在创建时退出，等待创建完成后关闭端点再清理后端；早关窗口不再启动端点。
- 受影响脚本语法及差异检查。

最终原生验收输出位于 `output/mcp-desktop-L3lMPl/`，含复制方案后的桌面截图；末轮正式文件和原仓库工作区哈希均未变化。早期验收遇到正式窗口并行编辑导致源哈希变化，未覆盖用户数据；修正的图层锁定测试夹具按核心返回完整work使用，未改生产图层规则。

正式窗口升级主脚本并正常重启后，只读调用当前方案与空间核对成功：1601／主卧布局改进／72件，正式文件状态saved；只读结果保存在忽略的 `output/mcp-live-readcheck.json`，没有在正式方案执行测试编辑。Codex furnish stdio服务已登记并设置180秒工具等待，原配置及桌面主脚本备份在 `output/mcp-shell-backup/`，备份不入Git。

## 未执行与边界

未运行全量check、全部产品尺寸组合、物理打印或Blender渲染。空间核对继承现有算法边界，未知信息不代表通过；没有新增路径可达性保证。MCP第一版只支持四个固定工具，不编辑安装高度、柜体结构或墙体。复制方案沿现有切换语义清空跨方案撤销，只有副本内的家具修改进入原撤销栈。

当前聊天未热发现新MCP工具；已验证代码／stdio／桌面连接与本机登记，不宣称该聊天的工具列表已刷新。可在Codex重载MCP或打开新聊天后使用。
