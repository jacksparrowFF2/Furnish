# 方块占位体

家具库「占位体 → 方块占位体」，类型为 `block`。添加后在属性栏直接输入长、宽、高和底部离地高度（mm）；长对应局部 X／原 `w`，宽对应局部 Z／原 `d`，高复用 `h`。2D 为完整矩形，3D 为无倒角的实心长方体，底部相对工作方案的家具地面基准抬升。旋转、镜像、拖动、配色及锁定复用家具现有操作。

需求依据为用户要求的通用布局占位，无品牌、型号或厂家安装参数。1000 × 1000 × 1000 mm 和灰蓝配色为可调起始值；价格未知，目录不提供虚构参考价格。长宽数字编辑沿原 50–20000 mm，高沿原 10–20000 mm；导入沿通用家具契约接受大于 0 且不超过 20000 mm 的已存尺寸。

## 数据与空间规则

- 底部离地复用可选 `mountHeight`，单位 mm，范围 0–20000；新建写入 0，旧缺失只读取 0，不补写或抬升旧实例。没有新保存通道或项目版本，复制、撤销重做、自动保存、命名方案与项目导出导入沿原家具链路。
- 产品核心定义默认高 1000 mm、底部为 mountHeight、顶部为 mountHeight + h 的垂直包络；缺失 `h` 时仅读取默认，重复恢复不漂移。离地高度不随长宽高编辑缩放。空间核对按抬升后的真实高度区间判断，面接触免除，未知障碍高度保守参与。
- 同类型替换保留离地高度，跨类型清除来源安装参数并采用目标默认；替换为方块时清除不适用的柜体字段，目标尺寸来自目录规格。用户放置的实例不随目录默认值变更而覆盖。
- 实体占地与高度参与原有空间核对；尺寸、旋转、镜像沿原缓存和核对上下文，采购、价格与颜色不清除空间确认。没有门、抽屉、设备接口或专用安装预留。
- 生产构造器使用 Three.js `BoxGeometry`，mm 在现有边界换算为 m；预览和主场景使用同一构造器。方块表达输入外包体积，不能代表被代替产品的真实孔洞或安装要求。

## 验证入口

`node tests/test-block-placeholder.cjs`：默认值、编辑与导入边界、锁定、复制替换、重复恢复、当前／命名项目往返、空间高度接触边界、旋转镜像、核对签名和生产几何。

`node scripts/verify-browser.cjs block-placeholder`：隔离副本中的 HTTP／断网 file:// 添加、长宽高及底部离地编辑、非法值回退、锁定、复制、撤销重做、刷新恢复、真实项目导出导入、主 2D／3D 及 390 px 窄屏。

`node scripts/check.cjs`：完整源码与回归检查。

2026-10-19 初版已通过生产几何与数据专项；Edge 的 HTTP、断网 file:// 实际界面验收均通过，覆盖上述流程且无页面脚本错误。截图已人工查看：[2D](validation/block-placeholder-20261019/http-2d.png)、[3D](validation/block-placeholder-20261019/http-3d.png)、[窄屏](validation/block-placeholder-20261019/http-mobile.png)、[离线 3D](validation/block-placeholder-20261019/file-3d.png)。[浏览器结果](validation/block-placeholder-20261019/results.json)／[详细记录](validation/block-placeholder-20261019/block-placeholder.log)。

初版完整检查在源码、全部测试及本地项目数据的隔离副本中通过：225 套回归、12 个内置户型、16 个重新生成的生产预览，以及资源、共享声明和源码语法。见 [检查日志](validation/block-placeholder-20261019/check.log)。原工作区数千份历史生成预览未完成逐份检查；隔离验收未修改原项目数据。

同日底部离地高度增量已通过生产几何、缓存复用／重建、移动后保持高度、0／20000 边界、旋转镜像、未知障碍高度、面接触与低于阈值、替换／复制、旧记录恢复和项目往返专项。Edge HTTP／断网 file:// 界面验收通过，涵盖抬升、设回 0、无效值回退、撤销重做、刷新及命名方案；[结果](validation/block-elevation-20261019/results.json)／[记录](validation/block-elevation-20261019/block-placeholder.log)。已人工查看 [悬空 3D](validation/block-elevation-20261019/http-3d.png)、[离线 3D](validation/block-elevation-20261019/file-3d.png) 和 [窄屏](validation/block-elevation-20261019/http-mobile.png)。

增量完整回归使用同步后的隔离源码快照（含并行新增的净水器模型）：226 套回归、12 个内置户型、17 个重建生产预览、资源与语法检查均通过。见 [完整日志](validation/block-elevation-20261019/check.log)。原工作区历史预览逐份检查及实机触屏的未执行范围同上。

未执行实机触屏操作；窄屏验证使用 390 × 844 浏览器视口。厂家安装、设备开合及专用预留不适用于通用方块。
