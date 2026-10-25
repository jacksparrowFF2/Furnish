# 1601 连续拖动性能复验（2026-10-25）

使用同一份 `projects/workspace.furnish.json` 的 1601，61 件家具。隔离 Chrome profile 加载冻结的工作区字节；HTTP 由只接受 GET/HEAD 的静态服务提供，file:// 实际断网打开文件。原项目前后 SHA-256 不变，不控制用户现有浏览器，不连接真实仓库写入 API。

## 复现

```powershell
node scripts/verify/verify-drag-performance.cjs --baseline-dir output/playwright/drag60-before
node scripts/verify/verify-drag-frames.cjs --baseline-dir output/playwright/drag60-before
node scripts/verify/verify-drag-frames.cjs --http-only --type sofa_yeswood_cherry
node scripts/verify/verify-drag-frames.cjs --http-only --type cabinet
```

修改前源文件保存在本机忽略目录 `output/playwright/drag60-before`。省略 `--baseline-dir` 可复验当前版本。每个性能模式顺序运行；不要并行执行浏览器/回归测试，以免污染性能数据。

## 计算与准确性

`results.json` 保存前后源文件/项目哈希、同步计算均值/P95、逐次样本和 166 项数值输出摘要。`*-answers.json` 是完整净距/吸附/碰撞与空间核对输出，三个模式逐项 SHA-256 一致；另与不经过画布缓存的核心计算对照。场景包括所有家具、旋转/镜像/多选、未知高度、邻居和柜门变化、墙地厚度与家具基准、图层开关、当前/命名方案往返、重复恢复无漂移、实际鼠标拖动及撤销重做/保存刷新。

同步拖动样本包含改变位姿、精确吸附、绘制排序和净距刷新；修改前调用原绘制流程，修改后调用生产的 `renderFurnitureMovement`。它是主线程计算时间，不含完整 GPU/合成/显示延迟。

| 同步工作负载 | 修改前 HTTP 均值 | 优化后 HTTP 均值 | 优化后 file:// 均值 |
|---|---:|---:|---:|
| 拖动计算 | 58.21 ms | 13.46 ms | 13.23 ms |
| 选中后平移 | 9.31 ms | 4.42 ms | 4.56 ms |
| 选中后缩放 | 11.16 ms | 5.80 ms | 5.74 ms |
| 完整重绘 | 160.22 ms | 80.00 ms | 79.10 ms |

拖动计算 P95 为修改前 65.3 ms、优化后 HTTP 16.0 ms / file:// 16.4 ms。166 项完整输出在三种模式中一致，原项目哈希不变。

## 原生鼠标 60 Hz 输入

`frames*.json` 每个模式发出 240 次真正的 `page.mouse.move`，按 60 Hz 绝对时间节拍发送，经历原生 pointer capture、生产 rAF 合帧与实际 SVG 更新。保留起拖 40 次冷样本；稳态 200 次记录处理时间与处理开始时刻的更新间隔。所有模式都运行真实提交和 undo/redo。数据保留原始时间、位置、各阶段耗时和发送节拍。

三个判定分别记录：`meetsComputeBudget` 要求处理时间 P95 ≤16.67 ms；`keepsUpWith60HzInput` 要求处理更新率 ≥58 Hz；`meets60HzBudget` 还要求超过约 33.8 ms 的更新间隔占比不超过 1%。这些是本轮测试的操作性目标，不证明每一帧恒定 16.67 ms，也不是 GPU/compositor trace。宿主显示刷新周期、浏览器调度及起拖冷帧均可能带来少量长间隔。

| 原生连续拖动 | 稳态处理更新率 | 处理耗时 P95 | 最大更新间隔 | 超过约 33.8 ms 的间隔 |
|---|---:|---:|---:|---:|
| 床，修改前 HTTP | 35.55 Hz | 66.7 ms | 146.3 ms | 27 / 199 |
| 床，优化后 HTTP | 60.88 Hz | 13.7 ms | 34.4 ms | 1 / 199 |
| 床，优化后 file:// | 60.22 Hz | 14.2 ms | 34.7 ms | 1 / 199 |
| 沙发，优化后 HTTP | 59.95 Hz | 15.4 ms | 35.3 ms | 3 / 199 |
| 柜体，优化后 HTTP | 59.95 Hz | 12.4 ms | 34.7 ms | 2 / 199 |

这些代表场景都能跟上约 60 Hz 输入且处理 P95 在 16.67 ms 内；床在 HTTP/file:// 通过本轮三项判定。沙发/柜体的长间隔比例仍略高于 1%，因此**未达到所有场景全程无掉帧**。起拖冷样本仍有约 19–27 ms 峰值，完整数据没有剔除；不能将此结果推广为任意项目、任意家具或任意机器的稳定 60 FPS 保证。

## 变更与准确性边界

- 完整原始 DXF 串改为直接比较，仍然参与失效。拓扑缓存向调用者返回独立副本；房间、门洞、墙层/地层、设备孔环、未知标高和恢复输入均重算。
- 净距继续使用生产板件和实际高度裁剪。保守下界/背向预筛选不改变容差、最近点顺序或优先墙面；边界值/旋转/镜像/包含与局部相交由相关回归覆盖。
- 柜体实际共侧板/开口/连接饰面及厨房完整台面设备/孔环进入缓存键，保留联动结构和开合变化。共享记录按只读使用；未来增加生产构造器的外部输入时必须同步扩充缓存键。
- 高度/外包缓存包含地面几何和完整承托链；每次仍计算当前家具的逐对重叠与绘制顺序。标签只跳过相同字符串的 DOM 替换，不跳过文字排版或隐显更新。
- 真实刚性拖动中仅复用局部模型有效性；结构/尺寸改变、位置随机模型、非有限位姿以及松手后的完整世界位姿仍重新验证。净距/吸附/碰撞始终读取当前实际位置，不复用旧位姿结果。
- 没有持久格式升级、新字段、额外保存通道或确认规则版本变化。非空间元数据不会因此清除空间确认。

本轮为增量检查；未运行 `scripts/check.cjs` 全量检查、无关历史预览、实机触屏或额外 GPU/3D 帧率验收。静态验收服务器的仓库 API 提示是有意禁用真实文件保存的结果，浏览器隔离缓存的保存/刷新已另行验证。

## 增量回归结果

`node-checks.json` 记录 38 个套件，36 通过。覆盖生产实体/高度裁剪/柜门、完成地面基准、墙面、共享侧板与玄关连接、厨房/水槽孔环、吸附/方向定位、绘制高度顺序、空间确认、项目校验/往返及 Blender 部件身份。新增三项回归覆盖拓扑/源 DXF/地层/承托缓存失效和副本隔离、标签 DOM 精确更新，以及真实刚性拖动的局部校验/松手/位置随机模型/错误保留。改动源码和新增脚本语法、入口普通脚本共享声明以及 `git diff --check` 通过。

两项失败是 `test-pipe-collisions.cjs`、`test-furniture-recovery.cjs` 的 VM 环境没有提供已有 `FurnishDownlightModel`，在 `buildFurn()` 调用 `setLights` 时报 ReferenceError。用本轮修改前源文件与 `output/playwright/drag60-baseline-preload.cjs` 重跑，两项同样失败，已在结果中标记 `baselineReproduction.confirmed`。本轮未改写无关测试依赖；实际 HTTP/file:// 浏览器运行没有此错误。
