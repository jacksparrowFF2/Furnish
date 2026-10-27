# 当前吊顶与可见吸附状态：增量验收

2026-10-27。用户要求升级所有吊顶类型并删除旧模型兼容流程。本轮验证当前生产构造器、区域/部件编辑、恢复与吸附状态；历史版本格式通用读取不作重写。

## 已通过

- 25组吊顶Node套件（test-ceiling*.cjs及test-ceilings.cjs，另一个对话负责的test-ceiling-plan-display.cjs除外），包含真实生产几何、旋转/镜像、接触阈值、开孔、关闭/删除部件、样段及当前/命名方案重复恢复。新增test-ceiling-current覆盖所有四类样式与六类预设的材质/光源归属、旧固定字段拒绝和自动迁移API删除。
- 7组关联Node：test-browser-verification、test-zone-boundaries、test-work-state、test-workspace-cache、test-repository-workspace、test-project、test-merged-format。源码语法和git diff --check。
- HTTP及断网file://真实浏览器：[最终记录](browser-final.json)中的ceiling-current、ceiling-section-interaction、ceiling-reference-snapping；[部件记录](browser-components.json)中的ceiling-components；[复用记录](browser-reuse.json)中的ceiling-reuse-pick；[设备记录](browser-devices.json)中的ceiling-panel-devices。所有模式页面异常为0。覆盖当前四类样式、生产截面预览、右键/双击/键盘节点、部件复用和二维/三维编辑入口、吸附来源/高亮/松手保持/移离清除、Shift/开关/Esc、一次保存撤销重做/刷新/实际项目往返，以及390px。
- 主工作区5个区域补齐稳定身份，补齐前后items逐项JSON完全相同；仓库完整校验通过。家具等非吊顶数据使用修改前副本保留，用户方案编辑（方块删除及操作期间的区域边界调整）保留，不纳入本次代码提交。
- 已目视检查[梁吸附](http-beams.png)、[当前铝扣板窄屏](file-mobile.png)和[截面编辑](http-section.png)。

## 范围与边界

无全量check.cjs、真实触屏或Blender实机验收。平面接触不建立永久约束，不判定高度或安装可行；精确退让读数仍参考房间边界。旧attachment/basePolygon文件不再兼容，应使用本轮之前的应用处理历史原文件；当前工作区不存在这种旧关系。历史直线/L形独立编辑器浏览器用例已删除，CLI别名改为当前区域/部件验收；转角/连续灯带/端板底层生产几何继续由Node验证。未删除其他未合并工作树或用户原始资料。

首次浏览器尝试因沙箱限制本机HTTP失败，获准外部运行后通过；四类型新夹具最初宽600等于两侧300内退，退化校验正确拒绝，改成650后通过；截面边线pointerdown重绘打断双击命中，已删除无必要重绘并复验通过。
