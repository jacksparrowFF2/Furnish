# 电视柜白色覆盖面板验收

用户提供模型截图及抽拉藏线电视柜实物，确认第三格可抽拉，五块外露正面同白色并覆盖柜箱前沿。实现依据见 [模型说明](../../TV-FLOOR-CABINET.md)。

当前1601对象 `fmv3yflqw1` 采用全盖、五列 `finish:solid / doorColor:#f3f1ec`；外包2505×350×350、位置和中央拉出状态保留。五块前板在本例均从离地1至331mm，木色18mm顶板位于332—350mm；边缝1mm。没有另加重复前板或白色侧饰板。

新模板明确全盖，历史命名方案和缺失盖法的旧实例保留原结构。前板尺寸来自生产网格，实体记录和开启区高度同步；相关空间确认包含新构造语义标记，纯改色不清除空间确认。无新增持久字段或加载变化。

已通过：

- 13项Node回归：`tv-floor-overlay`、`tv-floor`、`cabinet-drawer-joints`、`cabinet-palette`、`cabinet-model`、`cabinet-overlay`、`cabinet-opening-3d`、`cabinet-opening-volume-model`、`cabinet-full-width-drawers`、`cabinet-custom-fronts`、`cabinet-dimensions`、`spatial-review-cache`、`project-recovery`。
- 专项覆盖12／18／30mm板厚、全／半盖、开闭、实际五块白色前板、面板尺寸、生产实体、闭合外包、水平抽拉、项目恢复；0／37／90°旋转及镜像下，上缘相接不碰撞、穿入1mm可检出。
- 五个修改JS入口语法检查；本次新增测试实际执行。
- HTTP及断网file://：真实1601快照恢复、三维预览、关抽保存、应用撤销重做、缓存刷新、390px无页面横向溢出、无浏览器异常。[浏览器证据](browser.json)
- 数据全量比较：相对于本次修改前本机快照，仅当前电视柜盖法与五列饰面改变；命名方案及其他数据一致。[数据证据](data.json) 原始备份在本机 `D:\1601装修\.codex-tools\tv-front-20261028\workspace-before.furnish.json`。

已目视查看：[中央拉出](open.png)、[闭合编辑器](closed-editor.png)、[窄屏](mobile.png)。生产模型五块正面均为白色，覆盖侧／底板前沿，中央台面与托盘保持水平联动。窄屏沿现有纵向工作区呈现，此次没有修改编辑器布局。

未运行全量check、Blender、实机触屏、完整全屋导出或五金加工／承重验证。首次浏览器运行被沙箱拦截本地网络，授权重试后通过；初次专项未注入真实1601快照，随后使用隔离快照复验通过。截图和结果来自最终通过的 `verification-i6GHQf`；验收浏览器未向真实工作区文件写入测试数据。

工作区原有用户修改按原样保留；提交的数据只包含本次目标柜体盖法与饰面差异，不把其他布置改动交叉提交。
