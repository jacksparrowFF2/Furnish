# 1601 数字编辑后的同步性能

2026-10-25，隔离 Chrome，1600 × 1100；读取同一份含 65 件家具的 1601 工作区快照，SHA-256 为 `c8ad68d07f52d3005802b8efbc440e55c78786dba6635c91638642b82c849ca9`。GET-only 静态服务无仓库写入 API，file 模式断网；真实工作区文件不参与编辑。

每项连续四次改变宽度或中心 X（交替 ±1 mm），计时覆盖原 `mutate`、厨房自动避让、历史／保存调用、完整重绘和同步空间核对。不是仅测 SAT，不是帧率，亦不含自动保存落盘完成时间。

| 修改 | 优化前 HTTP 平均 | 优化后 HTTP 平均 | 优化后离线 file 平均 |
| --- | ---: | ---: | ---: |
| 宽度 | 2058.18 ms | 782.18 ms | 903.50 ms |
| 中心 X | 2032.62 ms | 828.52 ms | 880.05 ms |

HTTP 阻塞时间减少约 59–62%。机器负载／JIT 会影响时延，四次样本不代表大样本 P95；仍有约 0.8–0.9 秒停顿，不能视为即时响应。CPU 采样定位到投影数组分配及高度已分离却仍执行的平面扫掠测试。单次诊断中另有约 0.1–0.2 秒厨房自动避让，以及净距、碰撞、DOM 和完整重绘开销，本轮保留这些行为。

只优化两处：SAT 逐点累计投影极值，保留原分离轴、除法顺序、5 mm 容差；已知高度不交叠时先返回，未知高度仍走平面及 pending 判定。没有延后核对、沿用陈旧结果、降低采样或新增持久字段。

三个模式的保存值、四向净距、吸附结果、碰撞及完整 review 输出完全相同，答案摘要均为 `6150b2d9a271426a271f81799ec0ab288a2cdc7a4c9bf2ca8b3679680bbc24ea`。实际尺寸表单与合法的 1 mm 距离调整、撤销重做、缓存刷新恢复、项目往返通过；HTTP/file 截图已目视检查。原有布局中有些方向会因其他家具重叠而被拒绝，专项按原定位核心筛选合法目标，没有放宽规则。

12 项 Node 增量套件通过：polygon-intersection-parity、project、cabinet-opening-3d、cabinet-opening-volume-model、pipe-collisions、cabinet-interior-distances、directional-kitchen-solids、kitchen-auto-avoid、project-recovery、dishwasher-clearances、cut-board-motion、furniture-recovery。新增对照覆盖 2000 组旋转／镜像、重复顶点、等于／略低／略高于 5 mm 阈值及开启范围未知／相切／分离高度；既有生产扫掠回归覆盖真实三维板件与中间姿态。

扩展检查另有两项失败，均用优化前的 project-core/cabinet-core 复现：`test-beam-heights.cjs:46` 的 VM 只提供 rooms/demolished/open，缺失生产签名读取的 furniture；`test-floor-finishes.cjs:37` 仍断言现已支持的工作区 v17 必须拒绝。本轮未修改这些旧用例。完整日志见 [node-checks.json](node-checks.json)，逐次时间见 [results.json](results.json)。未运行全量检查、主场景三维专项或窄屏专项（本轮无 UI／加载／持久格式变化）。

复跑：`node scripts/verify/verify-numeric-edit-performance.cjs --baseline-dir output/playwright/numeric-before --workspace output/playwright/numeric-workspace.json`。省略 baseline 参数可测当前 HTTP/file；默认读取真实工作区的副本。原始前后答案、CPU 采样与本次基线文件留在忽略目录 `output/playwright/`，不覆盖此前拖动性能报告。
