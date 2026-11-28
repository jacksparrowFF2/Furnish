# MCP 资料、采购、结构与成果工作流

当前方案读取在 MCP 能力版本 4 返回 `electricalPoints`。点位包含清单当前编号 `number`、家具 `id`、用途名称、区域、面板款式、标高和双控对象。点位编号随布局派生，写入接口继续使用家具 ID。

2026-11-17 按资料归档 → 采购 → 柜体 → 净距 → 成果 → 建筑 → 方案管理顺序补齐接口。该批补齐后为33项；加入[方案讲解与交付](PRESENTATION.md)的读取／配置后，该阶段共 **35** 项工具。桌面、网页脚本和 stdio 都须使用同一版本；工具发现不代表当前聊天已重载。

2026-11-26 的能力版本 3 共 **40** 项工具。新增工作流见[全屋设计与交底](WHOLE-HOME-WORKFLOW.md)，覆盖暂存文件的首建与导入、量房证据、连续动线、正式材质和同版本图册。

## 资料采集与归档

`get_product_info({ids})` 返回已有家具的品牌、型号、完整来源链接、价格日期、确认单价、参考价、有效价格、价格依据、采购状态／备注及当前模型尺寸。缺失值保持未知，模型尺寸不自动当作厂家尺寸。

`configure_product_info` 使用原 `updatePurchaseGroup()` 批量应用 `updates:[{ids,values}]`，支持原字段 `brand/model/sourceUrl/priceDate/price/purchaseStatus/purchaseNote`，没有新项目字段。每个实例在同批中只能出现一次；字段缺省保持，文字 `""` 可以清空，`price:null` 删除确认单价，0元有效。完整HTTP(S)链接保留参数，不接受脚本链接或URL账号密码。`priceDate` 为有效YYYY-MM-DD；状态仍是 planned/confirmed/ordered/received。

采集的页面价进入模型档案。方案备注可引用页面价，确认适用规格与价格后才显式写 `price`。采购进度也不推定订单实付。尺寸调整继续使用原产品参数／尺寸接口，不用资料录入绕开空间验证。

已有模型档案使用：

1. `get_product_dossier({productId})` 读取 `assets/models/<productId>/asset.json` 和 `dossierRevision`；缺少档案时拒绝，不创建空目录。
2. `archive_product_reference({productId,dossierRevision,requestId,sourceUrl,capturedOn,note,capture?,imageBase64?,imageType?})` 记录已采集资料。原图可选 PNG/JPEG/WebP，二进制最多 2 MB。联网读取和新建档案沿 [商品采集入口](MODEL-ASSET-STORAGE.md#商品采集与自动归档)。
3. 带 `capture` 的记录写入 `asset.json` 的 `productCaptures`，必须带来源和日期。原图和无 `capture` 的普通证据 JSON 按 SHA256 写入 `references/product-page/`，来源沿现有 `sourceLinks` 维护。原始完整链接照录，证据标记 `recorded-not-independently-verified`。

此两项工具在 Node stdio 入口处理，独立于正式方案和界面撤销。只读指定产品清单，写入固定产品目录；拒绝路径穿越、符号链接目录及非图片编码。清单采用版本核对、同产品写锁和临时文件替换；重复requestId持久回执在 `.local/mcp-reference-receipts`。版本冲突不会覆盖清单，已写入的内容寻址文件可能保留待核对。与不遵循同一锁的外部写入工具并用时仍须协调。已有CLI参考图导入入口保留。

## 采购与材料

`get_procurement()` 返回原采购核心的需求、商品规格signature、订单、到货、实付、预算和历史关联警告，以及**原始** `pricing`。不把缺失参考价格写成确认价。

`configure_procurement` 接受 `orders:[完整订单]` 按id新增／替换、`removeOrderIds` 显式删除、或完整 `pricing` 替换。先读再改，保留无关订单、历史行和未编辑的pricing键。不能同批更新又删除同一订单；不存在的删除ID拒绝。订单字段、分金额、部分到货、累计实付、材料单位、规格失配均由原采购核心校验，不另建订单格式。它只维护本地台账，不向商家下单或付款。

原资料／订单／pricing随当前工作槽、命名方案、项目、恢复、撤销和自动保存往返。商品／材料规格变化后的历史订单仍保留金额并提示重新关联，不悄悄改历史signature，不用采购状态推导付款。

## 柜体与测量

`get_cabinet_components({id})` 返回明确可编辑的v2柜箱、稳定moduleId／boxId／componentId、实际尺寸与完整部件配置。普通组件柜模块为 `body`；厨房／洗衣组合沿 `FurnishCabinetAssembly.modules()` 返回模块身份。旧结构列为不可编辑，不自动升级。

`configure_cabinet_components` 接收 `edits:[{id,moduleId,selection,changes|position}]`：selection含boxId，可选componentId、board、segmentId、boundary；changes调用原builder.update，position为绝对mm并调用原adjustComponent。身份和连接字段不能借update改写。厨房模块通过原assembly.setPart写回，关联设备沿原整组normalize与锁定校验。全部预演后一次mutate／撤销／flush；不复制板件规则。新增／删除部件及旧结构转换仍可走原完整配置／显式升级能力，本接口聚焦已有部件的修改。

`measure_clearances({id,targetIds?,rotation?})` 直接使用生产 `FurnishSnapping.directional()` 与 `cabinetInterior()`，附当前家具的空间核对结果。targetIds限制家具测距目标，墙仍参与；空间核对保留全案环境。四向距离沿rotation坐标系，不等同最短欧氏距离。`containedBoundary` 仍是包络内边距，不证明柜内空腔；实际板件、高度分离、旋转镜像、未知高度和开合均沿原核心语义。

## 成果文件

`export_artifact` 需要planId／revision／requestId，接受以下format：

| format | 生产来源 |
| --- | --- |
| project | 原pack/unpack/previewPlan；包含本户型当前布置、方案／历史与家具库 |
| quote_csv | 界面共用quoteRows，包含家具、地面、涂料和工程费用及价格依据 |
| plan_svg / plan_png | 原preparePlanSVG清理编辑叠层、尺寸与标注；PNG沿原rasterSize限制 |
| report_html | 原FurnishDesignUI.reportHTML；离线成果、有效已采集讲解图片与可编辑项目，不自动采集新三维图 |
| scene_glb | 原View3D.blenderScene生产场景；可includeCeilings，无Cycles调用 |

二维图导出前须在2D；GLB前先用set_camera切到3D并等待生产端态。导出前后核对revision；出现变化拒绝。桌面主进程只在固定 `.local/mcp-exports/` 写入，名称由请求ID／内容哈希和格式生成；返回文件路径、字节数、SHA256，不向工具回执塞大块base64。相同内容重试不覆盖不同文件，调用者不能选择任意写入路径。项目／文本成果最多30 MB，生产GLB独立上限256 MiB，避免把项目JSON限制误套到全屋几何；二进制编码采用线性规范化校验，避免大文件正则栈溢出。

这是新增的桌面壳处理，现有.app须更新并重启；旧壳不会因刷新网页而获得文件写入处理器。普通take_screenshot继续使用原生MCP图片，不受影响。导出文件不是正式方案保存，回执不宣称persisted。

## 建筑与方案管理

`get_building()` 返回当前architecture、墙地完成层／铺贴原始配置及派生平面。`configure_building` 支持完整draft、floorFinishes、wallFinishes、wallTiling替换；饰面配置的null表示删除覆盖，缺省保持。保持原ID，先读再改；建筑必须已有可编辑草稿，不能借此修改内置原图或重写baseline。draft仍沿原scale坐标；梁底／梁顶为绝对mm。已确认结构沿原assertStructure保护，再build、remapRooms、remapOpenings与完整工作／图层校验。参数依据及未知值继续遵循原模型文档，不自动填写安装要求。

`compare_designs({designIds:[A,B]})` 只读比较当前户型两个可编辑方案，返回家具增删改、其它work字段变化、预算和采购订单金额；当前活动方案读取实际state，比较不切换。它是数据差异，不代表审美评判。

`rename_design` 调用界面同一saveDesignAction／manageDesign链，拒绝重名、外户型或历史目标；保留内容，回执undoable:false。`history_action({action:undo|redo,...})` 使用当前原撤销栈，一次动作后等待保存，无记录时拒绝。复制和切换方案的原跨方案撤销语义保持。

## 连接诊断与重载

`get_connection_status()` 在stdio侧读取当前服务工具快照，分别对照活动桌面的**传输层**与**页面**工具快照；旧桌面缺少元数据、仅刷新页面或名称／数量不一致均报告needsDesktopReload。另报保存状态和精修Blender工程是否登记；不打开／退出／接管任何窗口。新连接检查仍不能证明当前Codex聊天清单已经刷新。

cn-scraper仍有40项工具，淘宝详情描述同步为CDP19222／浏览器锁／ACTION_REQUIRED／默认选项价格，不再声称纯MTOP。上游安装包保持原样，资料平台没有全部重新联网回归。

本机工程与登录状态不入库。Windows私人.blend迁移仍需用户提供；此轮没有接入未知工程，也没有在Mac执行Cycles。

## 验证范围

见[本轮验收](validation/mcp-capabilities-20261117/README.md)。正式方案不用于修改测试；所有写操作沿隔离工作目录、缓存和端口，不能把隔离成功表述为当前聊天已热重载。
