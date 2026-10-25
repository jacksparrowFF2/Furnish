# 吊顶顶点编辑与边界吸附增量验收

2026-10-25：12组Node回归通过：ceiling-boundary-edit、ceiling-regions、ceiling-design、ceiling-assembly、ceilings、functional-zones、free-zones、region-operations、region-merge-rounded、region-editor、zone-boundaries、wall-zone-follow。新增用例覆盖矩形及共线点关联移动、已有斜边、旋转镜像、顶点优先、12px等于／内外阈值、斜边投影、约束线交点及自由移动。5个本次改动JS文件语法、对应差异检查通过。

HTTP与断网file://真实浏览器专项均通过：

- [吊顶边界](browser.json)：样式页常驻操作、中点／指定边点／双击加点、删除、横竖邻点随动、精确边线／顶点吸附、Shift及开关、显式边对齐、生产三维、一次保存撤销重做、刷新、实际下载上传、取消与390px；最后补验新画区域可吸附当前所选吊顶的边线。
- [原吊顶流程](ceiling-regression.json)：独立多边形区域和组合截面的既有流程复验。
- [户型功能区](floorplan-regression.json)：短墙和功能区旧编辑流程复验，共用对齐函数提取不改旧判定。

已目视检查[桌面](editor.png)、[吸附反馈](snap.png)及[390px](mobile.png)。全部浏览器在隔离副本运行，未写实际用户workspace。无新增持久字段或版本；未运行全量检查、真实触屏及复杂真实户型人工设计。保持横竖不会把旧斜边推定成直边；多边形窄边／自交仍按原生成规则拒绝。
