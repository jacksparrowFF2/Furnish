# 相邻吊顶与梁边界吸附：增量验收

2026-10-27。使用合成夹具、隔离仓库副本和新浏览器存储；原用户工作区文件未纳入修改。

## 已通过

- 变化源码与浏览器脚本语法检查；6组Node：`test-ceiling-boundary-edit.cjs`、`test-ceiling-edge-distances.cjs`、`test-zone-boundaries.cjs`、`test-ceiling-design.cjs`、`test-ceiling-regions.cjs`、`test-ceiling-storage.cjs`。覆盖整边／共线节点、阈值相等与两侧、旋转／镜像／斜边、精确退让和项目反复恢复无漂移、生产区域几何及仓库存储。
- [浏览器结果](browser-results.json)：`ceiling-reference-snapping`、`ceiling-edges`、`ceiling-boundaries`，每套均包含HTTP和断网file://。通过真实鼠标拖动两端精确吸附相邻吊顶和两侧梁、梁角点顶点吸附、同会话修改相邻区域后读取最新轮廓、自身排除、Shift／开关及Esc恢复。第二根梁未录入高度，保持默认示意的assumed状态；候选只使用其投影。
- 保存一次撤销／重做、刷新、实际导出／导入、取消、房间与梁数据保持；已有边界及整边用例补验共线加点、房间参考、生产三维预览和390px操作。
- 已目视[相邻吊顶吸附](http-neighbor.png)、[梁边吸附](http-beams.png)及[390px显示](file-mobile.png)。

## 范围与边界

本次只扩充吸附候选并统一反馈文案，不改变几何算法、实体模型或存储格式。整边沿法向移动，仅考虑平行且投影有正长度重叠的边；不同高度仍可作为二维参考。精确退让及注记的目标继续为房间边界，吸附不会建立长期约束。未新增独立旧构件的实体边吸附，也未运行全量check.cjs、真实触屏、Blender或现场施工验收。

初次浏览器启动遇到沙箱禁止本机HTTP，改用获准的外部运行后成功。首轮新用例中20mm手势小于既有3px启动阈值，将其改为30mm有效拖动后通过；没有放宽生产阈值。
