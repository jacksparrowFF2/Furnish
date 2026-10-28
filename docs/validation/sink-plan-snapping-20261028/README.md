# 水槽二维开孔与台面内吸附验收

2026-10-28。修改范围为 `furniture-svg.js` 、`snapping.js` 与 `plan-renderer.js`，未改用户方案或新增持久字段。

通过：三模块语法及差异检查；新增 `test-sink-plan-snapping.cjs` 的96个形状／柜边／旋转／镜像组合、6个材料内侧边界、缺口与空区拒绝、轴锁及关闭吸附；原 `test-sink`、`test-kitchen-right`、`test-kitchen-u`、`test-snapping`、`test-drag-feature-snapping`、`test-kitchen-edge-snapping`、`test-wall-face-snapping`、`test-cabinet-boundary-snapping`、`test-sink-linked-offset`、`test-sink-linked-offset-model`、`test-sink-surface`、`test-kitchen-worktop`。

隔离 HTTP Chrome 的 `verify-sink-plan-snapping.browser.js` 通过实际鼠标拖动、松开鼠标前孔洞实时更新、关联设备解除／撤销恢复、二维孔洞、移走后填回、撤销／重做、刷新与390px显示，页面异常0。目视检查[水槽](sink-on-top.png)、[暂时隐藏设备后的实际孔洞](uncovered-hole.png)及[窄屏](mobile.png)。临时隐藏仅改验收DOM，用来查看孔内材质与文字是否已移除，不改应用数据。静态测试服务没有仓库API，界面会显示文件未保存到仓库的提示，验收使用隔离缓存。

已知失败：较广的 `test-furniture-snapping-audit.cjs` 在 `telescopicdoor20` 的旋转0／无镜像拖动用例报 `10 != 0`；以 HEAD 的修改前 `snapping.js` 加载相同测试复跑，同样失败。该失败未被本次水槽修改修复；其他对话的未提交柜体等改动保留。

未执行：全量 `scripts/check.cjs`、Blender、真实触屏及完整导出交互。未改加载机制，本次未复验 file://。自动和视觉检查不代表施工安装验证。
