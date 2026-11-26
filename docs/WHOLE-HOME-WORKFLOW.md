# 全屋设计与交底

适用范围为建筑拆改、布局、柜体、材料、吊顶和布灯、设备定位、采购参考与施工交底。现有水电设备及管线用于识别约束。

项目输入使用[全屋任务书](templates/WHOLE-HOME-BRIEF.md)、[量房证据 JSON](templates/WHOLE-HOME-SURVEY.json)及[选型与施工交底资料](templates/WHOLE-HOME-HANDOFF-REFERENCES.md)。量房原图、照片和厂家资料由项目归档持有，证据 JSON 保存出处与定位。

## 户型导入与实测复核

1. 将源文件及可选量房证据放在当前桌面工作目录的 `.local/mcp-imports/`。接受该目录下的文件名，拒绝链接和任意路径。DXF 限 20 MB，完整项目或原生草稿 JSON 限 30 MB，证据限 500 KB。
2. 调用 `inspect_project_source`。DXF 首次可只给 `fileName`，读取图层、单位、未转换实体、重合和轮廓诊断。再次给出 `options.mode`、单位和图层映射。中心线模式逐墙层指定实际墙厚，轮廓模式可选窗、梁和既有管道层。窗台和窗顶必须显式填初始测值或待复尺的占位。导入预检返回方案概要、洞口与待复尺事项、源文件哈希及 `previewKey`。
3. 用相同文件和选项以及最新 `planId`、`revision`、`requestId` 和 `previewKey` 调用 `import_project_source`。自定义户型独立导入，内置户型恢复须指定 `replaceBuiltin`。原生测绘草稿使用 `{"kind":"furnish-survey-draft","version":1,"draft":{…}}`，草稿字段以 `get_building` 返回的 `architecture.draft` 和现有户型编辑器为准。
4. 默认保留测绘阶段。用 `get_building` 读取图纸与证据，按原有 `draft` 身份和坐标基准补录实际门窗尺寸、梁标高及墙体分类。证据附在项目中，通过 `configure_building.surveyFileName` 更新。证据记录测量来源，实测值通过正式建筑字段录入。使用 `roomUpdates` 填写区域用途、名称、地材和房间标高，取值以 `get_building` 返回项为准。原始结构可随导入显式确认，或在测绘稿核对完后以 `configure_building.confirmStructure` 锁定。两种确认都需要已核对的 `structureReview` 和有效来源。锁定是撤销边界。

原始 CAD 块、弧墙、图像量房的自动识别及独立柱体导入仍受既有转换和户型核心约束。方案中出现的生成窗洞、推导门洞、缺少标高的梁等，按预检结果复尺。工程量和标高分别注明模型值、实测或参考。

## 布置、场景和校核

按需求从同一基线复制具名方案，布置家具和定制柜后使用 `check_space` 检查实体、开合和操作空间，再用 `check_route` 核对人行、搬入与服务路线。

提供 `from` 和 `to` 的模型 x/y 坐标、净宽 `width`、高度 `height`，以及需要时的绝对底标高 `bottom`（默认 0 mm）。门扇默认按模型全开，可传 `doorStates` 指定开、关或扫掠。`useFurnitureIds` 叠加选定产品的生产开合扫掠，`usePositions` 模拟独立座椅等的使用位置。`removeFurnitureId` 将某件设备排除出障碍，配合待搬外尺寸。传 `depth` 时用矩形外接圆搜索。

结果提供路径折线、距离和该折线到最近模型边界的瓶颈。直线及搜索后各线段复验连续净宽，网格负责寻找路径。结果为 `needs-review` 时列出路径上的未建模项，未找到路径时可调小网格并对照障碍与端点。标高全程恒定，推拉门活动扇、未知洞口高度、货件侧转抬升和真实拆装流程需复核。

## 材质、规格与交付

- 切换到 3D 后使用 `get_material_surfaces` 获取实际可编辑的表面、当前搭配和样片。通过 `configure_material_surfaces` 提交预设、逐面改色、材质、美缝和门扇包套，或附上 `selections` 关联商品、规格和来源。沿同一事务保存一次，保留原撤销路径。
- 材料选型以现有项目附件保存。地面与可计算墙面的面积按正式模型估算，按同一商品与包装规格合并取整。表面变化会提示复核。实际铺砖裁切、余料、确认价及订单继续读取铺装和采购台账。
- 交底使用 `export_artifact(handoff_html)`，可通过 `roomIds` 和 `cabinetIds` 限定重点范围。输出离线可打印 HTML，按同一 revision 包含拆改图、铺装、吊顶、墙面立面、房间剖面、柜体板件尺寸、收口事项、材料表与现场复尺，并内嵌完整项目。另导出 `plan_dxf` 交接 CAD 平面、`report_html` 讲解方案。节点构造、柜体制造、材料签样和现场审批沿项目责任人确认。

桌面壳、页面与 MCP 服务版本必须一致。查看 `get_connection_status` 的清单和保存状态。正式文件未保存时保留回执及现场。

## 验收

`node tests/test-whole-home-route.cjs` 检查转角、阈值、障碍高度、门扇、未知梁和搬运场景。`node tests/test-whole-home-mcp.cjs` 用隔离工作目录和 1601 原始 DXF 预检、锁定原始结构、比对 A/B 方案、调整实测梁高、应用和撤销材料、重载完整项目。通过 `FURNISH_WHOLE_HOME_TEST_APP` 可指定已签名桌面程序。测试检查同版本图册、DXF 与项目导出和断网文件入口，并保留三维取景、铺装图和交底图册证据。
