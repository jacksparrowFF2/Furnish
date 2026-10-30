# 历史管理入口合并验收

2026-10-30

文件菜单「方案与恢复」保留一个「方案与历史管理」入口，移除命名历史和自动快照的重复列表。历史统一在管理窗口展示；该窗口的恢复直接使用 restoreDesignHistory，不再查找隐藏菜单按钮。独立「数据恢复」区域包括自动快照（按当前户型显示数量）及HTTP下的本机恢复副本。

## 已通过

- `node tests/test-file-menu.cjs`：通过只读接口夹具验证HTTP与file://。文件菜单入口与常驻栏管理按钮打开同一18条长名称历史列表；历史实际恢复不依赖旧DOM；自动快照可进入预览、实际恢复并撤销；菜单内不存在旧列表节点。保留下载、键盘页签、Esc、刷新及1440／932／390px边界验收。file://不提供本机正式文件恢复副本按钮，原行为保持。
- `node scripts/verify-browser.cjs design-switching`：在隔离副本中通过HTTP／离线入口，验证历史恢复及撤销不改历史、A／B独立自动保存、刷新、项目导入、跨户型与2D／3D／窄屏。见[结果](design-switching-results.json)。
- `node tests/test-design-switching.cjs`、`test-design-management.cjs`、`test-repository-workspace.cjs`：方案／历史隔离、复制及角色合并、恢复和存储启动回归。
- 修改的两个UI模块及测试脚本语法检查、普通生产脚本合并声明与差异空白检查。

目视确认菜单无需滚过16条历史就能找到恢复入口，标题与分隔清晰，390px宽度内容完整。截图：[HTTP桌面](http-1440-history.png)、[HTTP窄屏](http-390-history.png)、[离线窄屏](file-390-history.png)。

未运行全量check、模型或安装验收；未新增字段、修改保存机制或真实布局。所有浏览器测试使用新上下文和只读路由／隔离工作区，不写真实正式存档；已有projects/workspace.furnish.json修改及外置1601默认01保持。
