# 洗衣区普通无底柜箱与设备吸附

2026-11-10。用户确认柜体编辑器不应显示洗衣机，默认独立柜箱。本次为参数化结构和交互修改，不重做洗衣机资产，也不把照片标注的 615／406／1720 mm 写入当前方案。

## 结构与持久链

- 新建基础／完整洗衣柜沿 `createCatalogFurniture` 调用共享组件规则，原空位成为普通 `role:open + structure.cabinet.version:2` 柜箱：两侧板、顶板、无底板和背板，所有板件仍可编辑。默认独立箱，邻箱保留自己的侧板；柜内竖隔板另作分格。
- 旧方案打开编辑器先复制草稿再转换；取消保留原配置。原 `componentizeKitchen/componentizeLaundry` 只读无损接口保持。保存后旧 `sidePanels/appliance` 被实际柜箱替代，旧 `laundryHostId` 解除，保留真实洗衣机位置、尺寸和离地高度，避免过期 appliance 尺寸再次覆盖设备。应用撤销可恢复整个转换与关联。
- 编辑器完全停止附加洗衣机生产模型，包括直接预览未转换旧柜；正式场景的洗衣机记录继续存在。移除洗衣区设备空位／设备预留区卡片；普通柜箱作为相邻拖放目标，绿色预览、草稿历史和保存共用原求解器。
- 柜内目标读取 v2 箱体、隔间、前面板与背板基准，并用 `bodyParts/volumeOverlap` 的生产板件拒绝穿板。拖动捕捉柜腔中心及前沿；属性栏提供“自动居中并对齐前沿”。保持原离地，同步朝向／镜像，不自动加安装间隙、不自动抬高；落板可复用已有实际层板标高吸附。显式对齐解除旧强制定位关联。
- 仅普通组件柜与组合内组件树提供这组目标；不能从任意产品外包推断空腔。箱内层板、门抽、背板及顶底板继续检查实际实体；未知高度／完成地面标高不提供有效目标。安装散热、管线、承重和开门预留仍按型号资料单独核对。
- 不新增持久字段、格式、资源脚本或保存通道。结构变化本身进入原柜体缓存及空间确认；复制／项目／命名方案／多次恢复复用原组件树。柜体编辑器延迟关闭清理增加当前编辑器归属检查，修复取消后立即重开时误清新窗口全屏样式。

## 用户参考与实际复核

照片用于确认有顶／侧板、无底的结构关系，未据透视补齐背板、五金或安装要求。正式方案隔离副本为 1204×620 mm 组合，柜深600、地柜高870、台面20；无底箱外宽640、板厚18，实际净宽604、顶下净高852。独立相邻柜箱没有共板。

真实 TG10K60W 为595×560×850、离地0；副本居中并前沿对齐后两侧各4.5、后部40、顶部2 mm。以上是软件实体净距，不代表符合厂家安装要求。保存柜体转换本身保持该洗衣机原位置和参数，只有明确执行对齐才移动。

正面／斜视已实际看图：编辑器无洗衣机，能看到无底箱的真实侧板和顶板；相邻箱绿色预览位于所选箱外侧。没有执行照片机位匹配或外观材质重做，本次不宣称实物外观精修。

## 验证

- `test-laundry-carcass.cjs`：8组旋转／镜像；三块生产板件；普通柜通用目标；净宽／顶高相等与穿入；层板阻挡；离地与完成地面偏移／未知；共享拖动入口；相邻独立箱；过期关联解除；新建模板、项目／命名方案／重复恢复和源数据不变。
- 原有增量回归通过：`test-laundry-existing-lego`、`test-cabinet-placement-parity`、`test-cabinet-complete-lego`、`test-cabinet-assembly`、`test-laundry-integrated`、`test-laundry-cabinet`、`test-laundry-area`、`test-laundry-notch-closure`、`test-laundry-catalog`、`test-cabinet-profile-thickness`；`test-snapping`、`test-drag-feature-snapping`、`test-cabinet-boundary-snapping`、`test-elevation-snapping`、`test-sink-plan-snapping`。
- `test-laundry-carcass-ui.cjs`：HTTP、断网file和同一打包EXE隔离桌面；原始正式文件仅复制并检查哈希。真实鼠标拖入、绿色预览／释放、草稿撤销重做、取消／立即重开、应用撤销重做、保存刷新、390px窄屏、两种家具库新建、属性栏对齐及其撤销、旧柜预览不显示洗衣机、无运行时错误。
- 正式生产GLB按家具ID与稳定部件键逐件核对整组柜体、水槽、台面、附属柜与新增相邻柜，不只核对无底箱。37件部件对齐 Three 生产世界边界；Blender 5.2.3 LTS 独立导入同一GLB，37件唯一身份和边界通过，最大差约0.000389 mm。
- 未运行全量 `scripts/check.cjs`。额外 `test-furniture-snapping-audit` 在既有 `art_glass_partition rot=37 flip=false move` 断言失败，误差7.819552732 mm；以提交前 `HEAD:src/core/snapping.js` 在内存替换加载后同点同误差复现，与本次普通柜目标无关，未扩展修复玻璃隔断。

首次完整三入口证据：`output/desktop-verification/laundry-carcass-ASLiAS/`；含属性栏对齐和正式GLB的桌面证据：`output/desktop-verification/laundry-carcass-XthfdM/`，其中 `blender-readback.json` 记录程序、版本、GLB／清单哈希。最终三入口（含两种实际家具库入口）证据：`output/desktop-verification/laundry-carcass-8g8a1o/`；[逐项UI结果](ui-results.json)、[最终Blender回读／哈希](blender-readback.json)。

[正面](front.png) · [斜视](oblique.png) · [相邻独立柜箱拖入预览](adjacent-hover.png)

独立回读命令（Blender 路径沿本机 Scoop／显式 FURNISH_BLENDER 发现）：

```text
blender --background --factory-startup --python scripts/verify/verify-laundry-carcass-blender.py -- <laundry-production.glb> <laundry-production.json> <blender-readback.json>
```

本任务没有修改正式装修数据，没有新增分支或工作树。原有用户未提交方案及历史 detached 工作树保留。
