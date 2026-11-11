2026-11-11 后续复验：下文记录的两项预览测试失败已修复；原报错来自DOM／依赖夹具，同时扩展实际鼠标操作还发现组件层板被旧拖动入口截获的生产缺陷，现已修复并补充负例与三入口回归。见[根因与完整复验](../cabinet-preview-recheck-20261111/README.md)。

# 原柜箱独立尺寸与旧限制审视

2026-11-11。用户指出原洗衣机柜箱的外高870字段禁用，要求独立编辑，并检查同类旧限制。本次继续使用参数化生产构造，不重做洗衣机资产，不把验收尺寸写入正式方案。

## 修改与审视结论

| 旧限制或遗漏 | 本次处理 |
|---|---|
| 原地柜外高禁用，保存拒绝变高，生产又按台面底标高缩放 | 输入、草稿及生产共用独立尺寸；显式独立后直接消费组件树的外宽／深／高 |
| 柜箱宽度修改同时修改台面分配宽，柜深不能超过台面 | 柜箱尺寸独立，连续台面保留原分配尺寸；前后对齐仍是明确的相对基准 |
| 原柜箱默认落地、缺少独立安装高度／左右偏移 | 单独编辑柜箱底部距整组底mm、左右及前后偏移；底高与自身高各加一次 |
| 顶部叠放被自动推至台面之上 | 独立箱按实际箱顶叠放，遇台面穿板提示碰撞，保留用户输入 |
| 原上柜／开放柜被限制在旧台面占地内 | 已组件化且采用新布局的组合允许独立位置、尺寸，预览外包及二维遮罩随实际柜箱覆盖 |
| 移除原柜箱后转回empty，重开又生成柜箱 | 原组件树保留为disabled状态，场景不生成实体；草稿撤销或“恢复柜箱”显式恢复，保存／重开不复生 |
| 自动障碍减深覆盖已明确的组件柜形状 | 独立组件柜保留自身构造，实际障碍仍做空间核对；旧配方继续原自动避让 |
| 同一组合内柜箱穿过台面／附属柜，普通跨家具检测不会发现 | `cabinet-assembly-core.spatialIssues` 从实际生产板件检测，编辑器状态区与全案核对共用；面接触允许、正穿入提示，不自动回写高度 |
| 移除柜箱保存为目录规格时找不到可见模块 | 独立柜的规格直接读取保留组件树，保留移除状态及尺寸，不重新按台面派生 |

水槽开孔必须在实际台面上、型号／组件尺寸范围、真实板件碰撞及转角构造约束继续保留。软件未验算台面承重、支撑五金、厂家洗衣机安装预留；柜箱与台面有缝不自动生成支撑件。

## 数据契约

产品规则集中在 `product-rules.cabinetBuilder.nativePlacement`（version1／formatVersion83）：柜箱左右偏移最大6000、安装底高0–20000mm；箱体尺寸继续沿组件柜既有范围。这些是软件输入范围，不是施工依据。

`kitchen.modules[]`（适用末端柜同理）的可选 `cabinetPlacement` 新增：

- `independent:true`：必须对应有效v2组件结构。`structure.w/d/h/cabinet` 是唯一箱体尺寸来源；原模块宽度只保留台面原分配布局，不再用它拉伸独立柜箱。
- `mountHeight`：柜箱底部相对整组底mm，缺失0，整组离地沿原产品边界加一次。
- `x`：沿该柜箱局部宽向的偏移mm，缺失0；沿原旋转／镜像变换。
- `enabled:false`：保留组件树但不派生实体；缺失为启用，恢复保留原尺寸、板件身份及开合。

原 `depth/align/offset` 继续保存前后基准；独立时depth须与structure.d一致。普通组件编辑、数值安装字段及拖放统一通过 `setModulePart` 提交。非洗衣区原组件柜在显式编辑时也可独立；旧缺失字段仍保持原台面／配方派生规则。

新建／洗衣区编辑只在草稿中冻结当前实际几何；取消不写盘。v83贯穿项目、命名方案、目录规格、仓库、恢复缓存；v1–82读取保留，不做导入自动迁移。当前整个kitchen结构继续进入缓存与核对上下文，价格及配色维持原非空间语义。没有新增脚本加载或保存通道。

## 验证与证据

- `test-cabinet-native-independence.cjs`：8组旋转／镜像；独立宽深高／底高／偏移；台面及邻柜不变；真实生产世界板件；箱顶叠放；等于接触与0.01mm穿入；原上柜越出台面；停用／恢复／规格；当前／命名项目v83、仓库／缓存及三次恢复；旧缺失字段继续原高度行为。
- `test-cabinet-native-independence-ui.cjs`：HTTP、断网file、同一正式打包EXE的独立源码／缓存／端口与正式文件副本。输入1720后实际预览高1720、台面仍870；台面改960后柜箱仍1720。再设置柜箱500×750×720、底高120、左右偏移700／前后75，实际底／顶120／840；删除、撤销重做、恢复和原上柜移出旧台面均通过。保存、应用撤销重做、刷新和重开保持，390px窄屏通过；真实洗衣机记录不变。
- 全组三维生产GLB按家具ID和稳定部件键核对，不只核对单箱。Blender5.2.3 LTS独立导入：32个柜体／台面／水槽／附属柜部件身份唯一、世界边界一致，最大差0.000389mm。
- 相关回归通过：laundry-carcass、laundry-existing-lego、laundry-integrated、laundry-notch-closure、cabinet-assembly、cabinet-placement-parity、cabinet-complete-lego、cabinet-profile-thickness、cabinet-profile-production、cabinet-opening-3d、workspace-cache、work-state、spatial-review-cache、review-consistency、furniture-solids-cache；最后一项788组真实构造比较及41种LRU形状验证通过。修改模块语法与差异检查通过。
- 未执行全量 `scripts/check.cjs`。两项轻量预览测试 `test-kitchen-preview`、`test-cabinet-preview` 未通过：其模拟Element没有dataset，现有highlight写入builderSelection时报TypeError。真实桌面／HTTP／file的独立生产预览另已通过；没有将这两项失败写为通过。本轮未修改这两个夹具及cabinet-preview生产脚本。

完整三入口与正式GLB：`output/desktop-verification/cabinet-native-independent-ESLs5q/`。随后对最终柜箱组标签／规格处理运行HTTP复验：`output/desktop-verification/cabinet-native-independent-B73f8Z/`。

[三入口逐项结果](ui-results.json) · [最终HTTP结果](http-results.json) · [Blender回读及GLB哈希](blender-readback.json) · [源码指纹](source-sha256.json)

[1720mm柜箱与不变台面](height-1720.png) · [独立尺寸及安装底高](independent-placement.png) · [刷新后斜视](restored-oblique.png)

正式窗口和原装修文件未编辑／刷新，隔离测试核对源文件哈希。原未提交的workspace文件保留。本次在main直接提交，不创建临时分支或工作树；历史工作树及其中方案修改继续保留。
