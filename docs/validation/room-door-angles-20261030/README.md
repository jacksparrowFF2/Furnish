# 建筑门逐扇开启角度验收

2026-10-30。范围：建筑单扇／对开门1–180°限位、二维／三维生产几何、项目／工作区v38及恢复缓存。

## 已通过

- 13项增量Node回归：`test-room-door-angles`、`test-double-doors`、`test-door-geometry`、`test-door-2d-refresh`、`test-drawing`、`test-project`、`test-project-validation`、`test-project-recovery`、`test-repository-workspace`、`test-workspace-cache`、`test-work-state`、`test-spatial-review-cache`、`test-repository-storage`（均为`tests/*.cjs`）。后者使用本地回环接口。
- 新增回归直接执行入口中的真实Three.js门构造器，覆盖各向门轴、1／45／90／150／180°端点及联动；检查生产网格端点、二维扫掠末端与超过90°的障碍检测。属性处理器回归覆盖角度提交、181°拒绝、单扇切双扇默认值、不同角度与翻转／重置。
- 10个修改的JavaScript／测试模块语法检查和`git diff --check`；入口真实构造器由上述测试解析并执行。未运行全量`check.cjs`。
- HTTP真实工作区：主卧入口对开门（1066mm）显示两项角度；实际键盘输入与自动保存生效，分别设为180°。撤销第二项回到90°、重做恢复180°。见[二维界面](http-2d.png)。
- HTTP刷新重新加载仓库工作区后，两项仍为180°，见[刷新恢复](http-restored.png)。三维主卧定位及属性显示已目视检查，见[三维总览](http-3d.png)；该机位部分门板受墙体遮挡，精确轴向／末端由生产构造器数值回归核对。
- 自动保存前后逐字段比较：仅当前工作区版本升级及主卧入口`open.d.3`变化；家具、其他洞口和所有命名方案相同。原用户工作区未提交到Git，修改前副本保留于`.local/room-door-angles/before-workspace.json`。

## 边界

本次采用增量检查；未重跑离线file://、窄屏或真实触屏验收，未变更加载机制。没有施工安装／五金校验；空间检测仍为平面扇形近似（最大4.5°分段），不包含门厚扫掠与竖向避让。180°是可配置模型上限，实际可开范围取决于现场。
