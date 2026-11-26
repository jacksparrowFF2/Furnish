# 专项操作

只读取当前任务相关小节。工具当前 schema 与读取结果优先于本文的导航示例；保持主技能的 revision/requestId 与保存闭环。

## 柜体、厨房与洗衣组合

- 先 `get_furniture_parameters` 获取完整配置；局部已有v2部件再用 `get_cabinet_components` 获取 moduleId、boxId、componentId 等稳定身份。用 `configure_cabinet_components` 的 selection 定位，每条 edit 选择 changes 或绝对 mm 的 position 之一，不改身份／连接字段。
- 该接口聚焦已有部件；新增／删除结构应按完整产品配置及实际能力操作。旧结构不可编辑时不自动升级；明确需要升级时在副本试点，能力必须来自读取结果。
- 板件改动先看仓库 `docs/CABINET-DESIGN-STANDARD.md`，开合看 `docs/CABINET-OPENING-3D.md`，组件编辑看 `docs/CABINET-BUILDER.md` 和相关型号文档。区分独立箱与共享板、模块外宽与内部净宽；净宽／净高从实际板件推导，不能用家具外包减经验常数。
- 厨房／洗衣关联设备按整组保留与复核；升高柜体不等于应抬高全部设备。开合参数改变后确认生产几何已稳定到目标端态再取图。门抽净距、完整扫掠与静态实体分别检查；保留仍有干涉或待现场确认的问题。

## 建筑、饰面与吊顶

- `get_building` 读取完整 draft、结构阶段及饰面；`configure_building` 仅对已有可编辑草稿或支持的饰面字段做完整替换。省略保持，适用 null 删除饰面覆盖。保留稳定 ID 与无关配置，不修改内置原图或承重 baseline。
- draft 坐标遵循工具返回的原 scale 语义，不能把普通家具 mm 坐标直接套入；梁底／梁顶是绝对离地 mm，不随 XY 标定缩放。未知梁高保留未知。复杂操作参考 `docs/BEAM-HEIGHTS.md`。
- `get_ceilings` 后修改完整 regions，保留原 id/partIds/centerId；`configure_ceilings` 用 regions 新增／替换、removeIds 明确删除，同 ID 不可同时编辑与删除。未知截面先依据返回示例和实际产品配置处理，不猜字段。
- region.height 是模型绝对标高；aboveFloor／roofGap 是派生结果，不可把完成面净高直接写回 height。吊顶区域与独立旧构件分别识别。改后读取实际生产构件与净高，核对灯具、柜顶及门窗关系。
- `configure_scene` 只编辑支持的三维展示开关／日照等；单灯亮度、色温走产品参数。显示效果不证明照度或电气联动。

## 商品资料与产品档案

- `get_product_info` → `configure_product_info` 写品牌、型号、完整来源、日期、采购状态／备注及用户明确确认的单价；模型尺寸不作为厂家尺寸。页面默认规格价格先记备注，确认适用规格后才写 price。price:null 删除确认价，0元有效，缺省不改。
- 不臆造来源或采集日期；小红书链接必须保留检索／读取结果中的完整 xsec_token、xsec_source 等参数，缺失时重新获取，不猜造。MCP 不联网抓资料；需要外部来源时使用当前可用检索工具与对应技能。
- 用户要求归档已有产品资料时 `get_product_dossier({productId})` → `archive_product_reference`，使用 dossierRevision 与唯一 requestId；这条链独立于桌面 planId/revision 及家具撤销。仅操作已有档案，不借此创建新型号。原图可选 PNG/JPEG/WebP、二进制最多2 MB；归档为 recorded-not-independently-verified，不自动证明尺寸。
- 档案冲突先重读并核对，重试同一操作保持 requestId；回执文件／内容寻址资料可能已写入，不能把报错当作完全无副作用。此类操作会改仓库资产，按仓库约定记录与提交自己负责的资料；普通方案编辑不需要提交用户项目数据。

## 采购台账与预算

- `get_procurement` 读取需求、signature、订单、实付、到货、预算及原始 pricing；`configure_procurement` 按 id 提交完整订单、用 removeOrderIds 显式删除，或整体替换 pricing。保留历史行及未编辑配置。
- 新订单行采用读取的当前规格 signature；产品规格变化不悄悄重写历史关联或金额。采购状态不等于已付款，页面标价不等于实付。部分到货、累计实付及单位沿核心验证结果说明。
- 仅维护本地台账，不向商家下单、付款或发送消息。台账写入同样检查正式保存回执。

## 全屋设计

- 有源码时先读 `docs/WHOLE-HOME-WORKFLOW.md`，使用全屋任务书、量房证据和施工交底参考模板。
- 按实际工具清单执行。文件暂存于当前桌面工作目录的 `.local/mcp-imports`，先预检图层、单位、实测依据，再使用同一 previewKey 导入独立自定义户型。
- 继承正式完成标高，使用连续路径工具开展人行、搬入、座椅使用和设备检修场景核对。材质选型通过正式表面定位。需要施工交底时使用 handoff_html，保留同次项目和实际交底版本。
