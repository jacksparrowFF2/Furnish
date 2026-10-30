# 常驻方案切换增量验收

2026-10-30。实现契约见 [方案与历史](../../DESIGN-SWITCHING.md)。

## 已通过

- `node tests/test-design-switching.cjs`：独立保存、不共享对象引用、历史隔离、时间戳仅在内容变化时更新、跨户型不串写、项目／正式工作区往返、非法 editable 和绑定引用负例、历史复制及角色不同的导入合并。
- `node tests/test-design-management.cjs`、`test-design-workflow.cjs`、`test-design-consistency.cjs`：原方案管理、备份、墙体／门窗／空间确认及放置回归。
- `node tests/test-workspace-cache.cjs`、`test-repository-workspace.cjs`、`test-repository-storage.cjs`、`test-repository-save-retry.cjs`：恢复缓存、正式保存／冲突／恢复、丢失回执与失败提示回归。存储 HTTP 测试只写临时 output 目录。
- 修改的 9 个 JS 模块逐个语法检查；生产普通脚本合并声明检查和 `git diff --check`。
- `node scripts/verify-browser.cjs design-switching`：隔离工作区 HTTP 和断网 file:// 实际入口；旧命名记录不出现在栏或方案对比中；首次新建保留原当前布置；顶部和工作台两种新建方式；A／B 修改独立保存；备注更新可撤销；方案内撤销重做、切换不跨方案撤销；刷新恢复选中方案和各自内容；历史恢复／撤销不覆盖历史；跨户型隔离；项目重新导入不覆盖已有设计；2D／3D 切换、1440×1000 和390×844 的常驻栏可见且不溢出。
- `node scripts/verify-browser.cjs portable-smoke`：HTTP／file 的原生产墙体、修改、撤销重做、刷新及生产3D入口。
- `node tests/test-file-menu.cjs`：HTTP／file 的保存导出页签、下载、恢复入口、18条长名称历史／8条快照、桌面和窄屏菜单边界、刷新。

浏览器环境使用本机已有 `PLAYWRIGHT_BROWSERS_PATH=C:\Users\SPH\AppData\Local\ms-playwright`；沙箱阻止本机 HTTP 访问时在授权执行环境复验通过。早期验收脚本作用域错误和首次快照缺少三维默认值导致的往返重复均已修正，随本目录保留的是最终通过结果。

## 视觉证据与范围

目视检查顶部独立栏、当前方案突出、历史不混入切换栏、桌面原画布控件无遮挡，以及390px下按钮横向滚动和3D栏可见。

- [HTTP 桌面](http-desktop.png)、[HTTP 窄屏3D](http-narrow.png)
- [file 桌面](file-desktop.png)、[file 窄屏3D](file-narrow.png)
- [浏览器结果](browser-results.json)、[日志](browser.log)

真实 projects/workspace.furnish.json 的已有未提交修改未纳入提交，也未作为测试写入目标。其他既有工作树均保留。

## 未执行及边界

未运行全量 scripts/check.cjs，未重新遍历历史模型预览或验收真实安装／几何算法。本轮未修改模型与空间规则。切换会清空当前撤销重做栈，原布置可通过方案和原恢复点找回；历史与设计仍共用每户型100条上限。项目导入载入当前布置并解除绑定，需从常驻栏选择已有设计或新建。旧程序不提供本轮自动保存关联，应避免与新页面并行编辑同一正式文件。
