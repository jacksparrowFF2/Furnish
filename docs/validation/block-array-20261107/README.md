# 方块关联阵列增量验收（2026-11-07）

block复用原inventoryArray能力、普通家具生产构造及mutate链；含显式字段最低v69，未转换旧方块保持原数据/版本。总数1–200、行列1–50、非负间距0–1000mm，错位与四种单件转向同现有物品规则。不存在同组实体碰撞豁免。

通过：test-inventory-array（增加block、catalog/命名方案v69和缓存读取）、test-block-placeholder、test-product-rules、test-work-state、test-workspace-cache、test-repository-workspace、test-repository-version-compat。仓库兼容测试与UI测试需允许其隔离本机端口/桌面进程；受限环境首次连接/启动失败，随后同脚本在允许执行环境通过。

`node tests/test-block-array-ui.cjs`采用launch-desktop实际解析出的现有打包EXE，独立源码、仓库数据副本、缓存及空闲端口。桌面/HTTP/断网file://均通过：单件默认不写阵列、首次编辑一次撤销、重做、总数/层排列/间距/错位/转向、非法值拒绝、锁定、解除和撤销、v69项目往返；三入口各7个实际生产GLB部件，底600/顶830mm。桌面额外保存刷新、420px窄屏无横向溢出。

[结构化结果](report.json)、[桌面](desktop.png)、[窄屏](narrow.png)、[断网文件](file.png)已人工目视检查。测试案例坐标部分被原户型墙体遮挡；部件数量/高度另以生产GLB核验，不将截图视为无遮挡几何证明。成功测试副本由test-artifacts回收；失败/中断诊断保留。未修改正式方案及已有workspace JSON，未跑全量检查/触屏/Blender回读（复用未修改的原方块几何）。
