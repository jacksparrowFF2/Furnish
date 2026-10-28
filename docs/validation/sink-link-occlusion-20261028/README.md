# 当前方案的水槽关联与二维遮挡

2026-10-28，针对用户追加说明的“关联台面模块”下拉框及当前1601截图。

实际复现：模块2为1104mm水槽柜，选择关联后 `counterLink={hostId:'fmv9dos7j1',module:1}`，位置6350.0000003／8998、朝向270°、槽口850.8mm，完整承托。关联后的外沿净距为左75／右95／上177／下177mm。二维仍露出的白色圆角矩形来自柜内米家净水器（底118、高379、顶497mm），不是第二只水槽或未清除的孔；其顶低于台面底830mm，但旧绘制顺序仍将其画在台面后。

本次仅改 `design-core.js` 的显示排序，并补全旧绘制单元测试的DOM夹具。台面下的设备先画，已关联水槽与灶具在宿主之后画；不更改设备或橱柜数据。对照[修复前](before.png)、[修复后](plan.png)与[关联后的选中状态](associated.png)。红色斜线是当前方案其他家具的既有碰撞提示，不在本轮修改范围。

通过的Node增量回归：新增 `test-kitchen-plan-occlusion.cjs` 的72组顺序／形状／旋转／镜像组合、等于及上下0.01mm的台面底边界、未知高度、关闭台面、项目往返和当前1601固定夹具；原 `test-plan-height-order`、`test-drag-derived-cache`、`test-laundry-stack`、`test-directional-config-order`、`test-sink-linked-offset`、`test-sink-linked-offset-model`、`test-sink-plan-snapping`、`test-sink-surface`。

隔离HTTP Chrome的 `verify-sink-link-current.browser.js` 加载当前工作区副本，实际选择独立放置、移动水槽、再选择模块2；确认关联与居中、完整承托、一处真实孔、四向正净距和实际SVG顺序；通过撤销重做、橱柜移动／旋转／镜像跟随、缓存刷新和[390px关联控件](mobile-link.png)，页面异常0。原 `verify-sink-plan-snapping` 的实时孔洞、拖动、撤销恢复流程也复验通过。测试服务仅写隔离缓存，不写用户工作区。

未执行全量check、file://、Blender、完整导出操作及实机触屏。显示遮挡不代表设备安装或五金净空通过，仍受当前已知高度和既有平面重叠容差约束。
