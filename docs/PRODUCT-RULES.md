# 产品能力规则与兼容验收

## 柜箱内分格（2026-10-28）

`cabinetConstruction.joints`集中 `separate/shared` 边界含义；普通独立柜可选 `cabinet.boxJoints`，逐个相邻隔间指定双侧板分箱或单隔板同箱，缺失按原每隔间一箱。最小150mm约束实际柜箱，箱内净格仍至少100；分配外宽与物理柜箱宽分别派生。切换保持外包和各隔间分配宽，净宽吸收板件变化；模板替换清理旧cabinet，模块操作保留连续关系。项目／工作区v28及新缓存隔离新语义；颜色和采购沿原排除机制。详见 [分箱契约](CABINET-DESIGN-STANDARD.md#11-柜箱与箱内隔间分层2026-10-28)。

## 柜体顶封板与门顶退让（2026-10-28）

`cabinetTopClosure`集中可选封板高0–300和门顶退让0–50mm的模型范围，启用初值50／10由用户确认。普通柜可选 `cabinet.topClosure={height,doorGap}`；旧缺失保持原结构，新模板不自动假定到顶，显式启用才赋初值。柜体 `h` 为总完成高，`bodyHeight()` 扣封板高；门板覆盖封板，实际门顶为完成高减退让，0沿用原1mm边缝。封板要求全盖，特殊组合继续专用结构。完整cabinet参与缓存和空间确认，配色排除；替换模板用新cabinet，原字段不残留。项目／工作区v27、新v27缓存及旧版本读取保护新几何，重复恢复不缩放，见 [构造与范围](CABINET-DESIGN-STANDARD.md#10-顶部封板与门顶退让2026-10-28)。

## 独立柜箱与见光板（2026-10-28）

`cabinetConstruction`集中共享／独立模式、历史缺省shared、见光板0–50mm与最小柜箱外宽150mm的模型能力。可选嵌套`cabinet.boxConstruction/endPanels`由柜体核心校验和换算；特殊组合继续专用结构，旧记录和新模板不自动转换。模式及左右厚度进入完整cabinet、生产实体、缓存和空间确认；配色／采购沿原排除机制。项目／工作区v26和独立v26缓存隔离新语义，旧版本继续可读。见 [当前柜箱契约](CABINET-DESIGN-STANDARD.md#9-已实现的独立柜箱与1601调整2026-10-28)。

## 厨房平板灯（2026-10-27）

panel_light_300x600：300×600×35 mm、24 W来自用户图片；anchor=bottom，mountHeight新建／缺省2500 mm仅作初值。ceilingPanel共用300×600、2 mm面板贴合基准及0.1 mm数值对齐容差；panelLight集中3 mm边框、展示灯色与强度假设。无新字段，旧数据不补灯具，复制／替换沿原字段能力，实体／缓存／确认共用整板路径。见 [参数与验收](KITCHEN-PANEL-LIGHT.md)。
## 奥普SE2浴霸（2026-10-27）

`bath_heater_aopu_se2`：面罩300×600、箱体110 mm、吊顶安装空间≥130 mm来自用户图；模型面板厚2 mm为近似，总高112 mm。ceilingPanel集中profile=se2／bodyHeight=110／minCeilingDrop=130，后者仅保留资料，不自动判定安装合格；缺省mountHeight=2500仅作布局初值。无新字段，旧通用占位保持180 mm；实际实体、安装、缓存及恢复复用已有能力，详见[SE2](BATH-HEATER-AOPU-SE2.md)。


## 铝扣板排版能力（2026-10-26）

`ceiling.aluminum`保留300×600名义模数及原默认方向0，增加maxAngle=360°供核心校验与UI共用；起铺点缺失继续自动居中，不定义伪造的默认世界坐标。显式origin或非旧0／90°方向采用v22，沿独立区域／flat生成一致性校验和原保存恢复链路。实际排板变换同时服务设备占格及生产模型；有浴霸时起铺点参与空间确认，非空间和单纯缝宽编辑保持确认。详见 [排版契约](CEILINGS.md#铝扣板排版与固定起铺点2026-10-26)。

## 吊顶整板设备（2026-10-26）

`bath_heater_300x600`使用ceilingPanel能力：面板300×600、面板厚／贴合基准2、中心数值容差0.1 mm；总高默认180、安装最低点默认2500 mm。300×600来自用户要求，其余为通用占位模型假设，真实机身和安装资料未知。所有尺寸／安装能力集中于本模块，沿原h／mountHeight保存，无新字段或数据版本。标准面板才允许整板安装，总高可编辑；非标准宽深仅作布局，不生成开口。新建／缺省读取默认，复制保留、跨类型替换按fields能力清理；生产solidModel提供实际板面／机身，不推定设备周围空腔。安装、缓存／确认与复验见 [吊顶设备](CEILINGS.md#筒灯圆孔与风暖浴霸整板替换2026-10-26)。

## 多联动门地轨条数（2026-10-25）

双／三联动门仍以 floorTrack 缺失／false 为吊轨、true 为地轨。`slidingLayout.floorTracks` 根据门扇实际位移筛除停靠扇，一／两条分别对应双／三联动；二维、生产模型与实体共用该列表及内外顺序。`slidingTrackSpec` 集中原 4 mm 宽／最高 8 mm 高地轨与吊轨 4 mm 门底净空估算，不新增保存字段。内部构造模式保留普通门窗全下轨；带地轨联动门追加独立确认语义，旧数据选择与缺失结构不迁移。详见 [吊轨与地轨](TELESCOPIC-OPENINGS.md#吊轨与按移动扇数生成地轨2026-10-25)。

## 联动门活动扇内外（2026-10-25）

双／三联动门新增可选枚举 `slidingTrackOrder`，leading-front／leading-back 分别表示活动扇靠正面／背面，默认读取 leading-front，旧缺失不补写。`slidingTracks/slidingLayout` 集中轨道顺序、实体门厚与矩形门扇位置；`slidingCorner` 根据对侧活动扇派生直边搭接端点，方向与 ID／数组顺序无关。复制、双／三替换保留，普通双扇门／窗等不支持者替换清理；非法值拒绝。三维、实体与空间确认输入覆盖该字段和对侧端点，确认语义升级 v2。完整字段与验收见 [矩形直边契约](TELESCOPIC-OPENINGS.md#活动扇内外与矩形直边搭接2026-10-25-后续修正)。

## 吊顶统一退让输入（2026-10-25）

`ceiling.uniformInset=200` mm仅为当前区域未能推得等距结果时的可编辑输入初值，不是施工要求。若当前轮廓各边到同一参考房间已等距，界面由实际多边形推得初始读数。范围复用`ceiling.max`及0下限；产品规则不补写到旧实例，UI应用后仍只保存原区域多边形。详见 [统一退让](CEILINGS.md#整个区域统一退让2026-10-25)。

## 双／三联动转角（2026-10-25）

`doubleslidingdoor` 默认高 2400 mm、无地轨；同三联动门登记 `telescopic.panels`、1 mm 连接数值容差和生产 `solidModel` 能力。普通双扇门与三联动窗保持历史契约。`slidingCorner` 根据唯一双方的垂直端部、实际顶轨标高、旋转与镜像派生共同斜切面和无立柱侧；未知标高／多候选拒绝派生。原家具字段和保存格式保持，缺省只读取不补写。地轨依照已有字段能力替换保留／清理，完整兼容、空间确认及复验见 [联动移门契约](TELESCOPIC-OPENINGS.md#双三联动无立柱转角2026-10-25)。

## 独立吊顶区域（2026-10-25）

`ceiling` 集中保留原mm范围、截面预设、灯带和板厚默认值，增加 `maxRegions=100`、`maxSections=8`；总生成构件仍限200、单轮廓仍限128节点。区域缺失时不物化默认值，UI新建默认平顶、底标高取当前原顶减300 mm（最低0）、板厚12 mm，均为可编辑设计初值。新持久结构由 `ceiling-core.validateRegion/setRegion/regionItems` 共用，复制新区域保留边界与配置并分配新ID，项目副本平移同时移动区域边界及生成构件。字段、版本和恢复契约见 [吊顶独立区域](CEILINGS.md#独立区域与多边形回型2026-10-25第二轮)。

## 拖动缓存的承托依赖（2026-10-25）

`floorHost(f,furniture)` 集中读取现有 `counterLink.hostId / laundryHostId` 的直接承托对象，`floorBase` 与绘制排序缓存共用该查找；排序跟踪完整承托链的值，宿主位置/安装/配置变化、缺失和恢复均重新计算高度。没有新增字段、型号白名单、默认值或恢复迁移，循环依赖仍由原 `floorBase` 保留未知。见 [拖动复验](validation/drag-performance-20261025/README.md)。

## DL269光源规格（2026-10-24）

`downlightWatts`与`downlightKelvin`为筒灯可选枚举字段，新建5/4000、旧缺失读取5/4000不补写。`downlightSpec`集中派生六种光通量／颜色，切换只影响照明与采购规格，不影响空间确认或开孔。复制保留，非筒灯替换由共用字段能力清理；导入严格校验。复验test-downlight、test-product-rules、test-purchase-orders、test-procurement、test-work-state及verify-downlight的HTTP／file界面链路。见 [详细契约](DOWNLIGHT-PHILIPS-DL269.md#可切换的光源规格)。


## 标准结构与统一升级（2026-10-21）

本次用户要求优先统一升级旧家具。本节覆盖下方旧记录中“保留旧缺失结构／12 mm 洞洞板运行时回退”的策略：恢复和项目输入经 furniture-upgrade 统一物化结构，再供各层消费；已知旧字段只在入口转换，不在生产模型另维护历史柜体。柜体、厨房组合和洞洞板的具体升级与保留项见 [统一升级](CABINET-DESIGN.md#统一家具升级与实际实体2026-10-21)。solidModel 是产品定义内的共用能力，无新持久字段；未知模型及 OBJ 继续保守，不凭包络推定内腔。[验收记录](validation/furniture-solids-upgrade-20261021/summary.json)。


## 关联水槽局部偏移（2026-10-21）

箭牌水槽及通用 ksink 的 `linkedSurfaceOffset={max:20000}` 定义已有 `counterLink` 内可选 `offset={x,y}`：模块局部宽／深轴、mm，各轴须为有限数值且绝对值不超过 max；不支持该能力的设备拒绝 offset。厨房核心再验证模块边界及实际台面完整承托。新建／旧缺失均读取居中，不物化偏移；首次编辑才保存。共用产品字段校验及替换清理，不新增顶层字段名单。复制整套保留并重映射 hostId，单独复制清关联；完整 link／孔环已进入原缓存和空间确认。详见 [水槽契约与复验](SINK-ARROW.md#关联水槽的四向净距偏移2026-10-21)。

2026-10-20：pegboardAssembly.parts 为上柜、左右封板、下柜及 displayShelves/hooks/light 七项，accessoryParts 定义三个独立附件，legacyParts 保留 accessories 校验能力。柜体核心以单项值优先、缺失继承旧 accessories、再缺失默认保留的顺序派生；新控制读取同一接口。未编辑旧数据不补写，首次编辑部件写独立七项并移除旧总项；现有模板替换、完整 cabinet 缓存／确认／项目机制保留。见 [三类附件](ENTRY-PEGBOARD-CABINET.md#置物板挂钩灯带独立开关2026-10-20)。


2026-10-20：pegboardAssembly.structureParts 集中定义上柜、左右封板和下柜，movablePegboard 判定独立离地能力时不再排除附件；pegboardPlacement 同时驱动通孔板和保留附件整体平移。沿用 pegboardBottom 字段、范围、缺失默认与模板清理，附件开关不重置高度；确认使用 pegboard-envelope-v3-accessory-height。见 [带附件调高](ENTRY-PEGBOARD-CABINET.md#洞洞板与保留附件共同调高2026-10-20)。


2026-10-20：pegboardAssembly.bottom 集中定义纯洞洞板底部离地 0–20000 mm，允许 0／小数；可选 cabinet.pegboardBottom 仅在单块纯板时生效，缺失读取原构造底高不物化。柜体核心 pegboardPlacement 共用平移量，生产板件／预览／主场景／外包与空间检查同步。复制保留，换模板按整份 cabinet 清理，缓存及确认已覆盖完整 cabinet。见 [纯板离地高度](ENTRY-PEGBOARD-CABINET.md#纯洞洞板独立离地高度2026-10-20)。


2026-10-20 复验：dimensions(f) 为尺寸显示提供共用入口；显式删除洞洞板组件后，assemblyBounds／planBodyOutline／vertical 共用生产板件实际边界（含位置偏移和附件突出），不再沿用完整柜体包络。尺寸不回写构造输入，无漂移迁移；确认使用 pegboard-envelope-v2。来源与复验见 [洞洞板实际外包](ENTRY-PEGBOARD-CABINET.md#剩余实体尺寸联动2026-10-20-复验)。


2026-10-20：pegboardAssembly 集中定义洞洞板组合部件 upper/left/right/lower/accessories、显式配置板厚 18 mm 与旧缺失板厚 12 mm。柜体核心校验可选 cabinet.pegboardParts 并派生有效开关；新模板显式采用 18 mm，旧缺失不补写。模板替换和复制沿原完整 cabinet 机制，门抽屉停用配置保留供恢复。实际板件／开启／缓存／确认及验收见 [洞洞板组件](ENTRY-PEGBOARD-CABINET.md#组件独立删除2026-10-20)。


2026-10-20：`bench_yeswood_oak` 定义 shoe-bench 产品族、落地包络与默认高 450 mm；目录 800 × 300 mm，缺高仅运行时读取，不物化旧数据。无新增字段、安装预留或空腔能力。见 [换鞋凳](SHOE-BENCH.md)。

2026-10-20：`coffeetable_yeswood_cherry` 使用 `coffee-table` 产品族、默认高 450 mm 和落地包络；新建目录宽深 1200 × 650 mm，缺高只读取不补写，无新实例字段、迁移或额外预留。白色岩板固定，颜色编辑木色。生产模型、项目恢复及验收见 [樱桃木茶几](CHERRY-COFFEE-TABLE.md)。

2026-10-20：`tea_table_800.teaTable={cabinetHeight:720,accessoryTop:897}` 集中定义静态茶台陈设的高度语义。既有 h 保持柜体总高（含脚轮／挡边），`vertical()` 返回含台面茶具的 `height(f)*897/720`，不重写旧数据。茶具／储物罐随原 w/d/h 缩放与旋转镜像，无新持久字段或格式版本。含该型号的空间确认读取 `tea-table-accessories-v1`；纯价格／颜色仍不失效。边界、实际生产几何与往返验收见 [茶台模型](TEA-TABLE-800.md)。


茶吧机 `teaBar.bottle` 集中记录参考桶直径 270 / 高 500 / 瓶口直径 55 / 瓶颈段高 80 mm；底高 36 与泵帽高 22 mm 为模型估算，不新增实例字段或改保存默认值。来源见 [茶吧机](TEA-BAR-MIJIA-PRO.md)。

2026-10-20：茶吧机增加可选布尔 `teaBarUpperOpen/teaBarLowerOpen`，新建 false、旧缺失闭合但不补写，同型替换保留、跨型清理。`teaBarDoors/teaBarOpeningZones` 共用门轴、独立高度区间及 100° 图片估算角度；生产、2D 与完整扫掠检查消费同一规则，兼容、缓存和验证见 [茶吧机](TEA-BAR-MIJIA-PRO.md)。

2026-10-20：`tea_bar_mijia_pro` 定义 `tea-bar` 产品族、默认高 1155 mm、落地包络与产品身份；旧缺高只读取不补写，缩放仍读取实例高度。安装预留 `missing`，不推定开门、换桶或取放水箱空间。无新字段或迁移，见 [茶吧机模型](TEA-BAR-MIJIA-PRO.md)。

2026-10-19：`pet_feeder_mijia_2` 定义独立 `pet-feeder` 产品族、默认高 370 mm 与落地包络；缺失高度只读取不补写。品牌/型号来自用户附图，无新增持久字段或安装预留要求，替换沿能力清理。见 [米家喂食器 2](PET-FEEDER-MIJIA-2.md)。


2026-10-19：water_purifier_mijia_1200g 定义底部锚点、高 379 mm、默认底高 0，复用 mountHeight 的 0–20000 mm 能力与现有项目字段。缺失只读取默认，不迁移其它产品；同型保留、跨型清理，目标净水器补新建身份。生产几何、缓存复用、核对签名及恢复往返共用原参数。安装预留为 missing，不冒用空气净化器或洗碗机规则。见 [台下净水器](WATER-PURIFIER-MIJIA.md)。

2026-10-19：block 复用 mountHeight（0–20000 mm），底部锚点默认 0，新建写入、旧缺失只读取。产品垂直范围为底部加块体高，生产网格在局部按该值抬升，原缓存与空间核对签名已覆盖；同型替换保留，跨型清理并采用目标默认。见 [方块占位体](BLOCK-PLACEHOLDER.md)。

2026-10-19：counter／kitchenwall 共用 doorWidths:{minWidth:50,maxLeaves:24,gap:2}，定义多扇侧开门的板面编辑下限与原门缝；仅为模型约束。可选模块／保留结构列 doorRatios 由柜体核心统一校验与分配，缺失仍历史均分；宽度／盖板变化保留比例，功能／门数变化清理。真实板件与恢复链路见 [双门与门宽](KITCHEN-WALL-ADJUST.md#双门与逐扇门宽2026-10-19)。

2026-10-19：ksink 新增可选 sinkStyle:inset|vessel、sinkBowlHeight:50–400 mm，缺失读取 inset／150，不补旧数据。vessel 统一定义盆宽深下限80、示例深400、壁15／底12、排水孔45及龙头高度规则，vesselSink/vertical 供生产几何与空间语义消费；counter.laundry.outerResize 启用按端拖拽。字段同型保留、跨类型清除，内置盆在原 assembly.sink 校验；独立三维缓存／核对与 kitchen 嵌套签名覆盖，配色仍不失效。见 [洗衣柜](LAUNDRY-CABINET.md#按端缩放与台上盆2026-10-19)。

2026-10-19：`clearanceReview` 是派生显示能力，不写入家具实例。电器库类型统一覆盖：扁桶热水器 `heater`、米家台面洗碗机 `dishwasher` 复用现有检查，其余 `missing` 明确显示无数据；导入 OBJ 不冒用专用模型安装规则。无专用规则的设备不读取家具通用前方活动空间作为安装要求。开关属于工作方案 `scene3d.wallNumbers/clearances` 可选布尔，缺失为 true，原恢复／校验／项目／命名方案链路保留选择；复制替换无需增加家具字段清理，空间确认与几何缓存不读取开关。见 [显示开关与边界](IMPROVEMENTS.md#2026-10-19三维墙面编号与家电预留显示开关)。

2026-10-18：管道包覆柜属性增加直接方向选择：三面选前／后／左／右敞开，两面选四组相邻保留面。可选 `pipeBoxOpenSide/pipeBoxCorner` 缺失读取原背面敞开／正面＋左面，不补写旧记录；尺寸和姿态不随方向变化。产品核心按实际保留面派生板件及净空边界，有效方向签名共用模型缓存、空间确认和采购分组，切换结构保留另一方向选择。兼容、截图及验证见 [管道包覆柜](PIPE-ENCLOSURE.md#直接选择方向2026-10-18)。

2026-10-18：管道包覆柜增加四面围合、三面 U 形和相邻垂直两面 L 形选择，上下始终敞开，方向复用旋转／镜像。可选 `pipeBoxShape` 新建为 three，旧缺失按原三面读取且不补写；结构能力、净空校验与实际板件共用产品核心，2D／3D、实体核对、采购分组、缓存与空间确认同步。复制、替换、撤销及项目往返沿原链路，边界与验证见 [管道包覆柜](PIPE-ENCLOSURE.md)。

2026-10-18：新增家具库「柜体 → 管道包覆柜」，以外部宽／深／高、板厚和底部离地高度控制三块静态包覆板；靠墙背侧及上下敞开，无层板、柜门和底座。参数在属性面板直接编辑，默认值为可调布局示例。板件派生供 2D、3D、管线与家具实体核对共用；板厚进入导入校验、替换清理、采购分组、模型缓存与空间确认。复制、撤销及保存沿原通道。说明与验证见 [管道包覆柜](PIPE-ENCLOSURE.md)。

2026-10-18：吊顶连续灯带／端板与墙地砖跟随在合并版统一输出项目／工作区版本9；下述版本7／8为历史发布记录。`project-core.formatVersion()`共用功能判定，产品尺寸、字段能力和旧缺失默认保持。读取双方历史格式并保留原字段，详见[版本9兼容](REPOSITORY-SAVES.md#合并后的版本9兼容2026-10-18)。

2026-10-17：端板能力`ceiling.endCap`集中定义板厚12／灯带内侧退让5 mm的设计初值；启用值显式保存为`profile.ends`，关闭保留参数，缺失仍无端板。厚度沿用0.1～20000 mm，退让0～20000 mm；几何和剩余路径限制由核心派生。根据用户反馈，新圆弧初值缩至R8，`compactInnerRadius:1`仅用于「收小转角」的设计建议，不替代0.1 mm建模下限或厂家弯曲要求。旧半径不覆盖；新配置使用项目／缓存版本8。见[开放端收口](CEILINGS.md#2026-10-17开放端端板与灯带内侧退让)。

2026-10-17：`ceiling.corner`新增灯带圆弧设计半径初值20 mm、模型弦高误差0.05 mm、最大步角3°和最多1024段。半径沿用0.1～20000 mm，实际内缘和剩余直段也须满足0.1 mm建模边界。旧记录不补圆弧配置；显式模式及半径保存为`light.corner`，使用项目／缓存版本7。20 mm为本轮可用示例，未声明真实灯带的最小弯曲能力。截面修改保留u/d等自由坐标，重新派生圆弧、相交和承托。见[吊顶连续灯带](CEILINGS.md#2026-10-17灯带圆弧连续绕角)。

2026-10-17：完整洗衣柜由 counter 的可选 kitchen.laundry 配置派生，`sideThickness:18` 为新完整模板支撑板初值（10–50 mm 合法建模范围），旧缺失字段不补写。washer/dryer 能力新增可选字符串 `laundryHostId`（1–200 字），用于复用设备随整体柜体的真实净空对齐；不新建默认关联。同型沿能力保留、跨类型替换清理；复制宿主与设备重映射关联，独立复制或宿主删除后解除。kitchen.laundry.appliance 尺寸由整体柜体草稿设置，整体字段校验、生产包络及上柜开门空间由厨房核心统一派生。完整规则与复验见 [洗衣柜](LAUNDRY-CABINET.md)。

2026-10-16：`ceiling`能力集中定义吊顶截面的0.1 mm下限、10⁻⁶比较容差、20000 mm保护值、节点／对象数量、吸附像素及低灯槽／灯带／平顶示例默认值。吊顶属于独立建筑对象，不加入家具类型或家具字段白名单；旧方案缺失时保持无吊顶，新建才使用示例。截面基准为绝对标高、u向区域内部、d向下；源模板参数、自由轮廓及固定连接语义见[吊顶说明](CEILINGS.md)。这些默认尺寸来自用户讨论，未声明厂家安装能力。`ceiling.corner`集中定义最多两段、90°内侧角和灯带额外退让默认0；基本退让由灯带真实截面的最大u派生，额外退让允许0～20000 mm。旧直边对象不补写转角字段。

2026-10-16：`table_folding_1100/1200/1300` 共用 `folding-table` 能力，默认高760 mm；`foldingTablePose:round/single/capsule` 新建round，缺失只读取round，不补写迁移。`foldingTableGeometry/Outline/editFoldingTablePose` 统一当前外包与折叠时固定桌架，形态校验、替换清理和默认值均在产品核心；同型替换保留形态并换算目标尺寸，跨型按新目标round。当前／命名方案、复制、撤销与自动保存沿原链路；形态进入3D缓存和核对上下文。1300按图实标1305，1200收折尺寸为插值草模；规则及复验见 [折叠餐桌](TABLE-FOLDING-YESWOOD.md)。

2026-10-16：箭牌水槽、通用灶具和方太灶具共用派生能力 `surfaceMeasurement.wallContactTolerance=5` mm，定义实体墙与模块边的几何贴邻容差，不是厂家安装净距，不写入家具或项目。当前测量为紧邻实体墙优先，否则本模块边界；旧无模块台面保留原边界。原尺寸、安装高度及替换清理契约不变，无新恢复字段或缓存输入，详见 [测量规则](MEASUREMENTS.md#水槽燃气灶的模块边界与紧邻墙优先2026-10-16)。

2026-10-16：`dishwasher_mijia_countertop` 定义默认机身高 598 mm、底部离地初值 860 mm、可选布尔 `dishwasherDoorOpen`（新建 false，缺失仅运行时读取 false）及标称机身深 350／展开总深 600 mm。离地复用原 mountHeight 范围和底部语义；新建写入身份与安装／开合初值，同型号替换保留，跨类型清理，原通用 dishwasher 不变。开合进入生产缓存和核对上下文，保存与恢复沿原链路；同日后续已将图片安装条件接入自动核对：产品能力 `installation` 定义出气侧、200／650／50／80 mm；`dishwasherInstallation()` 派生独立于展示开合的全开包络，几何缩放与绝对安装距离分开。来源临界区、高度或台面未知时保留 pending，不作施工认证。详见 [台面洗碗机](DISHWASHER-MIJIA-COUNTERTOP.md)。

2026-10-16：`arrow-sink` 共用能力新增 `measureSurfaceBoundary:true`，仅改变箭牌水槽的派生台面量距／孔洞标注，旧通用 ksink 不受影响。新建、旧记录及复制替换均由当前类型能力读取，不补项目字段；三种安装孔型、自动开孔及高度规则保留。绿色外沿净距和橙色孔边距使用共用表面测量入口，不新增保存、撤销或核对缓存输入。见 [水槽交互](SINK-ARROW.md#与台面交互对齐燃气灶2026-10-16)。

2026-10-16：两种燃气灶可选 `hobCutout:{w?,d?}`，宽／深为绝对 mm；只接受这两个有限数值键，建模范围 1–20000 mm，派生孔宽／深不能超过面板对应尺寸（允许相等，不代表安装可行）。能力、历史默认公式、范围与编辑接口统一在 `product-rules.js`：`hobCutout()` 读取手动值或默认，`editHobCutout()` 校验并返回副本。方太缺失键仍按 w×660/750、d×350/440，通用灶仍按外包减 30；新建和旧数据均不补写。手动字段不随外形缩放，外形缩小到不能容纳手动孔时拒绝；恢复默认删除整个字段。仅支持生产灶具，不支持 OBJ。

复制、当前／命名方案、撤销、自动保存与项目往返沿用原家具结构；同类型替换保留，跨类型（含两种灶具互换）清除。`replacementResizeSource()` 与最终 `replacement()` 共用保留判定，先移除不兼容产品字段再验证目标尺寸，防止旧孔尺寸阻止换成较小椅子等产品。宿主 `deviceSignature()` 已覆盖派生孔轮廓，手动尺寸使实际台面缓存重建；`checkContext()` 增加完整 `hobCutout`，孔参数变化要求重新核对，价格／采购／颜色仍不失效。详见 [手动开孔](FOTILE-APPLIANCES.md#手动开孔尺寸2026-10-16)。

2026-10-15：烟机新增可选 `hoodGeometry`，只保存用户修改的 `bodyHeight/coverWidth/coverDepth` 绝对 mm，范围／组合校验与缩放由产品核心定义。新建和旧记录缺失不补写，历史比例保持；同类型替换保留，跨类型清理。`hoodInstallation()` 为生产几何、2D、柜体嵌合及分段碰撞提供统一尺寸，3D 缓存和核对上下文覆盖完整配置。总高复用 h，不与底部离地混用。详见 [可编辑烟机几何](FOTILE-APPLIANCES.md#可编辑烟机几何2026-10-15)。

2026-10-15：`kitchenwall.hoodBay={ceilingDefault:true,minSideGap:0}` 定义烟机空腔横板的历史缺省和每侧间隙输入下限。可选 `cabinet.hoodBayCeiling` 为布尔值，只用于已有 `hoodBayHeight` 的烟机柜；缺失保留横板，不迁移旧实例。保留模块仍将它嵌在 `structure.cabinet` 中，复制／项目／命名方案／撤销与缓存消费完整结构；更换模板或产品沿用原完整 cabinet 清理，移除嵌合区同时清除横板字段。每侧间隙不持久化，通过罩体实际宽度改原 `columns[].width`，仍受原两侧分区最小宽约束。详见 [空腔细节](KITCHEN-WALL-ADJUST.md#烟机空腔横板缺角与两侧间隙2026-10-15)。

2026-10-15：`kitchenwall` 声明 kitchen、模块分界、形状及抽屉能力；安装默认仍为柜底 1480 mm，自身高默认 700 mm。新建有宽深的吊柜创建无台面模块，旧数据不迁移。吊柜抽屉底座为 0，沿用 96 mm 下限、1–10 层和 8 px 吸附；可选模块 shelves 与 structure 由厨房／柜体核心共同校验。规则、复制替换与验收见 [吊柜调节](KITCHEN-WALL-ADJUST.md)。

2026-10-15：`counter.drawerTiers.snapPixels:8` 定义相邻抽屉层间拖动的屏幕吸附范围；核心派生同排紧邻且已收回的可行目标，预览按相机投影选取、显示临时辅助线，不保存对齐关系。原 96 mm 最小层高及各柜总高约束不变。详见 [相邻抽屉吸附](KITCHEN-DESIGN.md#相邻抽屉层间吸附2026-10-15)。

2026-10-15：`counter.drawerTiers.boundaryResize:true` 启用厨房抽屉层间横线拖动；相邻两层等量补差，沿用现有高度范围和 `drawerHeights` 字段，无新增持久数据。共用预览提供数字输入和实时高度，引线及控件只在编辑器显示。见 [抽屉层间编辑](KITCHEN-DESIGN.md#抽屉层间拖动与高度数字入口2026-10-15)。

2026-10-15：`counter.drawerTiers` 集中定义厨房抽屉的 defaultCount 3、层数 1–10、名义层高至少 96 mm，以及历史 100 mm 底座／18 mm 结构板／三层派生参数。可选 `kitchen.modules[].drawerHeights` 保存自下而上的名义层高，数量由长度派生，总和须填满扣底座及下挂后的可分配高度。缺失维持旧三层精确几何，不补写；显式数量／高度编辑才写数组，非抽屉功能清除。`drawerOpen` 按实际数量恢复／截断／补关闭状态。复制、命名方案、项目、撤销和自动保存沿用 kitchen；采购保留层高而忽略开合，缓存和空间核对读取完整配置，核对标记为 `kitchen-worktop-v12-drawer-tiers`。尺寸依据、阈值与验证见 [厨房抽屉分层](KITCHEN-DESIGN.md#厨房抽屉层数与逐层高度2026-10-15)。

2026-10-15：两种燃气灶的派生能力 `measureSurfaceBoundary:true` 允许四向距离量到完整承托台面的实体外沿，完整承托与实际轮廓复用厨房核心；无新增实例字段、默认值迁移或持久清理清单，原空间核对及模型几何不变。显示与恢复边界见 [燃气灶实体边距](MEASUREMENTS.md#燃气灶到台面实体边界2026-10-15)。

2026-10-15：`counter.moduleDividers:true` 启用同排相邻柜体的分界拖动与单击柜宽输入，一字／L／U 共用。相邻模块的 `width` 或薄柜 `length` 等量增减，外包尺寸、中心、柜深、台面深及其他模块保持不变；范围及关联设备适配沿用厨房核心。只改已有宽度，无新持久字段、默认迁移或保存通道，缓存／核对沿用完整 kitchen；转角盲区不作为普通模块调整。实际验证见 [柜间分界线](KITCHEN-DESIGN.md#柜间分界线直接调整相邻宽度2026-10-15)。

2026-10-15：用户要求手动厨房柜深可降至 5 cm。`counter.kitchenDepth` 集中定义 min 50、max 1200、drawerMin 72（18 mm 既有抽屉板件）及 emptyMinWidth 50（设备空位和展开盲角）；U `runDepth` 同步 50–1200。`counter.endResize` 定义 thin-end 的 length／cabinetDepth 交互及 150–3000／50–1200 mm 范围，仍只改原 endExtensions。厨房无抽屉派生 `kitchen-base` 实际验证支持 50 mm，普通独立柜体保留原 150 mm 下限；旧保存值不自动缩小，原自动避让 minDepth 150 不变。新边界操作不新增持久字段或保存通道。见 [薄柜独立边界](KITCHEN-DESIGN.md#薄柜独立边界与-50-mm-柜深2026-10-15)。

2026-10-15：`sink_arrow_680/750` 共用 `arrow-sink` 能力，默认槽体高 240、安装 top、独立上沿基准 860 mm；`sinkInstall:top/flush/under` 为可选枚举，新建显式写入，缺失读取台上不迁移旧通用水槽。`sinkInstallation()` 统一槽口上沿、台上盆沿厚度与台面底／顶的关系，并派生龙头垂直包络；沿用 counterElevation 表示本型号上沿离地。类型替换清理专用字段，复制／项目／命名方案／撤销和自动保存走原链路。embedded 能力消费既有平面碰撞豁免，安装参数进入空间确认，宿主孔洞缓存覆盖真实相对位置。资料与验收见 [箭牌水槽](SINK-ARROW.md)。

2026-10-15：`types.counter.cornerPartitions` 定义模块转角竖向隔板的 left/right 能力和历史默认值（抽屉柜保留，其他柜不保留）；可选嵌套 `kitchen.modules[].cornerPartitions` 仅保存用户选择的布尔值。新建与旧数据缺失不补写，显式 false 与 true 在功能／尺寸变更后保留；校验由厨房核心消费同一能力，复制／命名方案／项目和撤销自动保存沿用完整 kitchen，替换依原 kitchen 字段清理。真实板件、展开镜像和签名读取该选择，确认标记为 `kitchen-worktop-v11-corner-partitions`。水槽柜自身无层板、转角层板独立保留，不新增层板持久字段。见 [转角层板与独立隔板](KITCHEN-DESIGN.md#转角层板与独立竖向隔板2026-10-15)。

2026-10-15：可选派生 `kitchen.obstacleFit.corners:[{index,width,depth}]` 与 depths/cuts 一同由厨房核心计算及校验，仅 autoAvoid 支持。索引须对应现存转角且唯一，实际宽深在原 minDepth（150 mm）和各名义转角宽深之间。缺失不补默认，恢复／预览／提交依原 normalizeObstacles 计算，移走障碍恢复名义值。新模板无派生字段；复制、项目／命名方案及缓存沿用完整 kitchen，替换仍清理原厨房字段，无新顶层白名单。预留输入只改现有尺寸，不存新约束。见 [预留与转角](KITCHEN-DESIGN.md#边界预留输入与转角减浅齐平2026-10-15)。

2026-10-15：新增 `aquarium_mijia_2pro` 底部安装基准，默认 `height:334`、`mountHeight:0`，只复用现有离地高度能力和范围；新建写入产品身份 / 来源，旧缺失值运行时读取而不补写。同型号替换保留离地高度，跨类型恢复本型号初值并清理外来专用字段。缓存与空间确认已覆盖 h / mountHeight，不新增持久字段或安装净距假设。几何、恢复、项目往返及双模式浏览器验收见 [米家鱼缸](AQUARIUM-MIJIA-2PRO.md)。

2026-10-15：`counter.kitchenShapes.U.outerResize` 定义四边外框编辑，`U.runDepth={min:300,max:1200}` 定义独立柜深能力。可选 `kitchen.runDepths:[D0,D1,D2]` 只允许 U 形、三个有限毫米值，厨房核心统一校验；新建和旧记录缺失时按历史 `kitchen.depth` 读取，不补写数组。显式外边柜深编辑或实际改变输入时才保存，转成其他形状清除；复制／项目／命名方案／自动保存／撤销及完整 kitchen 缓存沿用原链路。台面挑出仍存 `counterDepth-depth`，新字段不新增顶层清理清单。细则、原规则边界及兼容验收见 [U 形四边与柜深](KITCHEN-DESIGN.md#u-形外框四边与独立柜深2026-10-15)。

2026-10-14：浴室柜箱体能力定义为 `types.vanity.cabinet={bodyHeight:450,bottom:330,aboveBody:1180,min:200,max:3200}`，数值取历史生产组件。`cabinetSpec()` 与 `cabinetBase()` 给箱体编辑、附属组件、开启空间和管道局部坐标提供统一接口；独立吊柜底部仍读取原 `mountHeight`。浴室柜可选 `cabinet.bodyHeight` 不覆盖历史顶层 `h`；未配置的旧实例仍读原整体包络 330–1960 mm，不迁移、不补写。配置后整体顶高为底部＋箱体高＋附属组件上部包络，调整箱体时附属组件整体平移。替换浴室柜时清理其箱体结构，显式新模板配置优先。新增门型／最大角度留在柜体与厨房核心嵌套校验；项目格式不升版。生产板件、实际恢复、真实浏览器下载上传与重复恢复验收见 [改进记录](IMPROVEMENTS.md)。

厨房嵌套结构追加可选 `counterDepth`、`edgeStyle`、`dropHeight` 及模块开合状态。能力范围、缺失读取和几何派生集中在厨房核心，产品规则仍委托嵌套校验；没有新家具顶层字段或替换清理白名单。原深度、板厚与设备高度契约保持，新增尺寸进入现有缓存与空间确认。详见 [厨房台面设计](KITCHEN-DESIGN.md)。

柜体嵌套参数新增可选 `cabinet.doorOverlay`，校验及模板默认由柜体核心提供；厨房的 `kitchen.doorOverlay` 由厨房核心校验。值为 `full/half/inset`，不用新增家具顶层字段或重复字段清理名单。已保存的值优先，缺失字段按对应模板／类型默认读取，不补写旧结构。全盖默认扩展至收纳柜、储物柜和衣柜，依据用户明确要求；兼容与实际几何见 [柜体设计](CABINET-DESIGN.md)。

厨房能力新增 `counter.kitchen`、水槽／灶具 `counterLink/counterElevation` 和独立 `kitchenwall.mountHeight`。新建显式采用模块厨房；旧 counter 缺字段仍是旧组合，不由 migrate 补新默认值。厨房嵌套结构和关联检查委托 `kitchen-core.js`，各层通过统一接口使用。兼容与参数语义见 [厨房设计](KITCHEN-DESIGN.md)。

本轮工作开始于 2026-10-12，收尾于 2026-10-13（Asia/Shanghai）。目标是收敛分散的产品规则，并保持旧项目与离线运行。

## 单一规则入口

2026-10-14：可选 `groupId` 是所有家具（含自定义类型）通用的布局关系，校验为 1–200 字非空字符串，新建及旧数据缺失时不填默认组，跨产品替换保留。组编号仅在当前工作方案内表示成员关系，不作为空间几何输入，也不影响 2D/3D 几何缓存和空间确认。复制为每个来源组重建编号；剪切首次移动保留编号，目标已有该组编号时重建，避免跨方案粘贴误合组。

2026-10-15：四向净距定位复用 `expandGroups()` 将完整组作为刚性平移集合；不增加组包围框或偏移等持久字段，成员关系继续只存 `groupId`。一次 mutate 仅修改各成员坐标，保持相对位置、尺寸、旋转、镜像及产品配置；任一锁定成员拒绝整次移动，内部依赖须全部选中。旧记录无需迁移，项目／命名方案往返、重复恢复与刷新保持组内关系，见 [2D 测量与整组定位](MEASUREMENTS.md)。

`src/core/product-rules.js` 是普通浏览器脚本和 Node 共用模块，浏览器导出 `FurnishProducts`，Node 使用 `require()`。没有 DOM、存储、网络、构建或 Three.js 依赖。

| 接口/定义 | 责任 |
|---|---|
| `types` / `definition()` | 类型的默认高度、产品族、安装基准和持久字段能力；定义递归冻结 |
| `fields` / `validateField()` / `validate()` | 参数类型、合法范围、适用产品及错误信息 |
| `value()` / `height()` | 优先读用户记录；缺失时读历史默认值，保留合法 0 |
| `initial()` | 新建实例需要显式写入的参数与产品身份；不补写所有默认参数 |
| `migrate()` | 返回新对象；集中旧花洒最低点→混水器中心迁移，原对象不变 |
| `showerInstallation()` / `vertical()` | 花洒基准与垂直包络、固定壁挂模型及动态电视/热水器包络 |
| `replacement()` | 在已经复制出的新对象上清理不适用字段、保留兼容族参数 |

目录中的洗烘、扁桶热水器、双抽屉冰箱、花洒和樱桃木沙发默认高度从规则获取。设计核心、项目导入校验、新建操作、属性面板、相关 3D 构造、花洒独立预览及冰箱空腔检查使用同一规则。`FurnishDesign.products()` 为现有 UI/模型提供兼容入口。

柜体分区、门板、抽屉和模板尺寸继续由 `cabinet-core.js` 管理；扫地机几何规格继续由专用模型管理。各型号宽深、资料来源、参考价格继续属于目录和模型文档，不强制推广为类型级规则。渲染分派仍按 type 选择生产构造器。

## 保持旧行为的约束

- 项目格式仍为版本 1。没有修改用户数据格式或原生脚本加载模式，没有增加 npm 运行依赖。
- 旧记录缺少字段时只读取历史默认值，不批量填充字段：洗烘机身 850、扁桶热水器底部 1650/机身 565、三联动窗窗台 900/机身 1500、冰箱 1800/双抽屉款 1910 mm。
- 默认值是旧行为契约。未来只改变新产品规格时，优先在目录明确记录尺寸；不能直接改变历史缺失字段的回退值。需要改变旧语义时提供显式迁移和夹具。
- 花洒有 `showerMixerHeight` 时优先使用；旧 `mountHeight` 表示最低点，换算后位置保持，重复恢复无漂移。新建仍默认混水器中心 1000 mm。
- 洗衣机↔烘干机保留安装与连接层参数；门窗轨道在支持该字段的产品之间保留。其他产品的专用字段根据能力清理；插座为独立世界点。
- 替换 UI 按完整新对象清理旧字段，再通过原 `mutate()` 撤销/保存流程写入。不另维护一份容易遗漏新字段的 UI 清理清单。
- 未识别类型缺失高度时仍未知；不为了统一规则填入虚构高度。固定模型的垂直范围只是布局模型依据，不代表施工安装要求。

## 新产品接入步骤

1. 在 `types` 明确高度/安装语义、适用参数、历史回退及新建显式字段；需要新字段时在 `fields` 定义类型、范围和错误信息。
2. 有特殊安装/迁移/替换语义时在本模块新增规则，调用者消费接口；不要在 UI 或导入代码再次复制白名单。
3. 库条目、模型构造和属性显示调用规则；型号的专用几何仍进入相应生产模型。
4. 用旧格式夹具验证缺失字段、合法 0、上下边界、跨产品替换、重复恢复和命名方案往返。
5. 修改构造器依赖后，给独立预览和实际生产模型测试传入同一依赖；不要为了让孤立 VM 测试通过保留第二套默认值。

## 修复的实际问题

旧 `catalog-ui.js` 先 `Object.assign()` 再依据手写字段清单清理。核心替换已经移除的花洒中心/姿态、热水器插座和轨道字段没有全部列入 UI 清单，可能残留，导致后续项目校验失败。

现在按新对象的真实键集合清理原对象。真实浏览器将已编辑花洒替换为洗衣机后，专用字段全部移除；撤销恢复原高度与姿态。核心回归覆盖洗烘、花洒、热水器、窗和窗帘跨产品清理。

独立洗烘预览还存在包装器与生产模型重复声明 `screenMat` 的问题，导致模块语法错误；已移除包装器重复定义。统一检查现在解析本地 `output/**/preview.html` 的内联模块与普通脚本共享声明，并检查本地脚本依赖。

## 验收与复验

自动检查：`node scripts/check.cjs`。新增 `tests/test-product-rules.cjs` 和 `tests/fixtures/legacy-product-project.json`；夹具是按历史格式构造的测试项目，含缺失高度、旧花洒最低点、洗烘叠放与一份旧命名方案，不是用户实际项目。

最终通过 **84 个回归套件、12 套内置户型、11 个本地预览页的脚本/依赖校验**，以及生产语法、共享声明与资源检查。`git diff --check` 通过。

浏览器脚本：`scripts/verify/verify-product-rules.browser.js`，由统一入口执行，独立 context 不修改用户浏览器数据。项目路径、服务和依赖统一准备，见 [浏览器验收](BROWSER-VERIFICATION.md)。

PowerShell 示例：

```powershell
npm.cmd ci
npx.cmd playwright install chromium
node scripts/verify-browser.cjs product-rules
```

统一入口同时提供 HTTP 和离线 file 模式。受限沙箱中的浏览器启动或回环访问失败时，需要在允许启动浏览器及本机服务的执行环境运行。

实际通过的验收：

| 检查 | 本地 HTTP | 断网 file 模式 |
|---|---|---|
| 新建默认值、旧项目及旧命名方案导入 | 通过 | 通过 |
| 花洒最低点迁移、热水器缺失字段、叠放检查 | 通过 | 通过 |
| 属性编辑、0 值、非法输入、撤销/重做 | 通过 | 通过 |
| 真实界面替换清理与撤销 | 通过 | 通过 |
| 完整项目实际下载、再上传恢复 | 通过 | 通过 |
| 3D 启动、动画完成后视觉检查 | 通过 | 通过 |
| 刷新持久化、390 px 属性抽屉和宽度检查 | 通过 | 通过 |
| 页面异常、外部网络请求 | 0 | 0 |

重新生成的冰箱、洗烘、三联动和花洒四种生产预览均通过断网 file 模式浏览器启动，无页面异常；冰箱正面按钮及三联动开门/地轨控件已操作。

截图与下载留在 `output/playwright/product-rules/`（本地验收产物，按现有规则忽略）：`file-offline-3d.png`、`file-offline-mobile.png`、对应 HTTP 截图及两份 `.furnish.json`。实际生产几何的旋转/镜像、外包尺寸和参数变更继续由各模型回归覆盖。

小屏验证使用桌面 Chrome 的视口模拟；未进行真实手机触屏验收。柜门开启区域现已补充 [三维障碍检查](CABINET-OPENING-3D.md)，含上翻门顶部检查与房间净高恢复。全局 UI 状态耦合、内联场景拆分及更细的板件/多门同时运动模拟仍是后续任务。

自动管道避让能力统一由 serviceCut(f) 提供：参数化柜体及 counter/vanity，导入 OBJ 不自动切割。无新增家具字段，切孔由点位、管径和净高派生，规则与生产几何验收见 [管道避让](PIPE-CUTS.md)。

柜体嵌套开合参数：产品层继续以既有 cabinet 能力整体保存／复制／替换配置，新增 columns[].doorSections 并非产品顶层字段，由 cabinet-core.js 统一校验（仅分层上下门，open 布尔，angle 0–180°）。缺省继承历史分区状态，不强制迁移；各 UI 与生产构造器调用共用 doorState／doorAngle 接口。


2026-10-14：厨房可选 `endExtensions[]` 由原 `counter.kitchen` 产品能力委托厨房核心校验，缺失不延伸；末端薄柜缺失背板读 false，旧普通柜体缺失运行时 `cabinet.backPanel` 仍有背板。范围来自现有柜体能力，未增加家具顶层字段或重复替换清单；新的盲角板件规则与末端开启输入更新确认标记，完整 kitchen 继续进入 3D 缓存及项目恢复。详见 [末端薄柜](KITCHEN-DESIGN.md)。


2026-10-14：`types.counter.avoidance={enabled:false,minDepth:150}` 定义厨房自动避让的旧／新缺失读取与最小柜深能力；厨房核心消费它并校验可选 `autoAvoid` 和派生 `obstacleFit`，复制替换仍走整个 kitchen 能力。已锁定厨房不自动重算。空间确认／3D 缓存覆盖实际派生深度和局部缺口，实际工作恢复按有效方案重算；前沿及名义尺寸、设备关联不漂移。详见 [厨房自动避让](KITCHEN-DESIGN.md)。

2026-10-15：厨房模块／末端薄柜可选 `doorLeaves[]` 仍由既有 `counter.kitchen` 能力保存，柜体核心校验门扇状态，厨房核心校验实际门数；旧缺失值继承模块开合，不强制写入默认数组。复制与完整 kitchen 恢复保留状态，替换仍清理整个厨房；采购忽略姿态，缓存包含完整配置。转角底座新增实际低位实体，空间确认规则标记升至 `kitchen-worktop-v6-corner-leaves`。复验见 [转角底座与逐扇门](KITCHEN-DESIGN.md)。


2026-10-15：`types.counter.kitchenShapes` 集中定义一字形／L／U 的模块边及末端边；U 的模块边为 0/1/2，末端边为 0/2，名义高度与其他尺寸范围不变。复用已有 kitchen 嵌套持久字段，无新增顶层字段或替换清理清单，新建仍为一字形，旧实例不自动转换。显式转换保留原模块和关联索引、迁移末端所属边，同侧 L/U 保留原转角世界基准。完整 kitchen 缓存／空间输入包含三边及两端，确认规则标记为 `kitchen-worktop-v7-u-runs`；采购、配色、价格不失效。校验、项目往返和实际恢复验收见 [U 形厨房](KITCHEN-DESIGN.md#u-形三边连续台面2026-10-15)。


2026-10-15：`counter.kitchenShapes.U.independentResize:true` 启用三边独立手柄，一字形／L 缺失读为不支持。此字段是程序能力，不写入 kitchen 项目数据；旧 U 形配置无需迁移。编辑继续只改原模块 width，150–3000 mm、台面空区、设备适配等校验共用厨房核心，缓存与确认已覆盖这些实际输入。见 [三边独立手柄](KITCHEN-DESIGN.md#u-形三边独立拉伸手柄2026-10-15)。


### 地柜碗碟篮样式（2026-10-15）

`counter.drawerTiers.styles` 提供普通抽屉与 `dish-basket` 两种能力，后者固定三层，参考图下限自下而上 300／220／100 mm，内抽索引 2、遮挡它的外抽索引 1。可选 `kitchen.modules[].drawerStyle` 缺失按普通读取，不给新建或旧实例自动补字段；仅地柜抽屉模块可选。层高／开合复用现有字段，角色替换由厨房 configure 一并清除。完整 kitchen 已覆盖复制、恢复、项目／命名方案、撤销、保存、缓存及核对上下文，无新顶层白名单。详见 [碗碟篮](KITCHEN-DESIGN.md#碗碟篮两块外面板与三层内部抽篮2026-10-15)。

## 自动门板配对顺序（2026-10-15）

2026-10-16 自定义扩展：`doorPairing.layout={values:['left','right','pair','paired'],maxLeaves:24}` 定义逐扇布局能力；可选模块／内部列 `doorLayout` 缺失仍读旧配对，不写默认数组。配对严格相邻且不可重叠，实际门数一致性由柜体／厨房核心校验。尺寸变化通过原编辑路径截补，功能替换由核心清理，导入非法数组直接拒绝；复制、项目／命名方案及恢复均保留有效数组，采购保留布局但忽略开合。替换仍清理原 cabinet/kitchen 能力，没有新增顶层字段。详见 [自定义配对与尺寸](CABINET-DESIGN.md#自定义门板配对与逐扇尺寸2026-10-16)。

2026-10-16：`doorPairing.singleHinge={values:['left','right'],default:'left'}` 定义奇数自动门的独立门方向能力；新增可选模块／内部列 `doorSingleHinge`。缺失读取历史方向，不迁移旧数据，原 `door:right` 仍为右铰链；只有独立门索引消费此值。枚举、派生及新建／旧数据读取由共用柜体核心提供，模块功能替换沿用厨房清理，内部列结构保留。完整配置仍覆盖项目／命名方案、复制、采购、撤销、自动保存、几何和运动缓存及核对输入，无新增顶层字段或保存通道。详见 [独立门方向](KITCHEN-DESIGN.md#自动配门的配对顺序2026-10-15)。

`counter` 与 `kitchenwall` 共享 `doorPairing={values:['end','start'],default:'end'}` 能力；可选模块 `doorPairing` 和内部结构列 `doorPairing` 由柜体核心校验。缺失不补写，旧奇数门首扇独立；start 使末扇独立。新模板仍沿用缺失默认。模块改为指定门型／无门功能／保留结构时清除模块设置，内部结构独立保留列设置；复制、替换、恢复、缓存及采购语义见 [自动门板配对](KITCHEN-DESIGN.md#自动配门的配对顺序2026-10-15)。没有新增顶层持久字段或 UI 清理名单。


2026-10-18：产品核心新增validateDatum(work)与floorBase(plan,f,furniture)，定义家具相对完成地面的公共基准，优先关联宿主；缺少已知地面不推测标高。work.furnitureDatum为工作方案字段，无家具类型白名单／替换清理字段；复制与替换沿所在工作方案基准，旧家具保存结构不改写。设计与几何核心可显式传plan计算世界垂直包络，生产模型本体与独立预览仍读相对安装高度，主场景根组统一抬高。详细兼容与复验见FLOOR-FINISHES.md的家具基准节。

2026-10-19：两种灶具 hobCutout.moduleMargin=20 定义关联时开孔至模块边的布局模型余量，面板另验完整落入模块及实际台面。不是厂家安装要求。无新增实例字段或默认迁移；门柜显式改为灶台柜与关联一次 mutate，详见 [关联选项修复](FOTILE-APPLIANCES.md#关联选项修复2026-10-19)。
### 区域落地面积口径（2026-10-20）

`floorStanding(f, relativeRange)` 消费共用相对垂直范围：下沿 ≤ 1e-6 mm 且顶沿 > 1e-6 mm 计为落地；未知返回 null。地毯、窗帘、内嵌设备及带有效关联 ID 的台面／叠放设备返回 false。此规则用于整体占地包络扣除，不是厂家安装要求或腿脚接地面积。相对范围来自 `FurnishDesign.furnitureVerticalBounds(f)`，与家具基准地面抬高分离；普通家具仍按共用模型默认高度恢复，未知实例不添加高度。

区域合计由 `FurnishGeometry.regionAreas()` 派生，去除区域及落地包络之间重复面积，未知物体仅在与所选区相交时列为待核对。无新实例字段，旧数据默认值、保存／恢复和项目版本不变。复验：`node tests/test-region-areas.cjs`、`node tests/test-product-rules.cjs`；浏览器：`node scripts/verify-browser.cjs region-areas`。


## 产品平面轮廓（2026-10-20）

`aircon_midea_ultra_2hp.planShape` 定义估算基体截面、参考尺寸与滤网／标签突出部。`planBodyOutline(f,segments)` 提供局部 mm 基体，`planOutline(f)` 提供完整凸投影；OBJ 与未登记类型返回 null，调用方使用原矩形。生产底座、SVG、布局投影共用规则，旋转镜像由几何边界统一应用。宽深编辑仍代表原外包尺寸，无实例字段或恢复写入。曲线离散点不作为物理角点吸附；凸投影保守覆盖凹陷。

含该型号的核对上下文追加 `product-plan-shapes-v1`，后续改变轮廓语义须更新该标识；价格／颜色仍不参与。复验运行 `tests/test-product-plan-outline.cjs`、`tests/test-aircon-midea.cjs` 及受影响的布局／距离／吸附／项目回归，浏览器入口为 `verify-product-plan-outline.browser.js`。本次通过范围与未执行项见 [专项记录](validation/product-plan-outline-20261020/results.json)。

## 旧柜体派生结构（2026-10-20）

legacyCabinet(f) 仅匹配无 OBJ、无 kitchen／cabinet 的旧 counter／vanity；参数与依据见 [旧柜体升级](LEGACY-CABINET-UPGRADE.md)。不改恢复默认字段；旧 counter 的 vertical() 提供原生产模型总高 2180。复验 test-legacy-cabinet-upgrade.cjs、test-product-rules.cjs、test-region-areas.cjs 及 legacy-cabinet-upgrade 浏览器专项。


2026-10-20：counter.kitchenPlinth 定义厨房组合地柜的底座默认 100 mm、范围 0–250 mm；可选 kitchen.plinth 由厨房核心统一校验与派生。新建／旧数据缺失均按历史 100 读取，不补写，0 为合法值；吊柜不接受。复制／替换、采购、空间确认及缓存继续消费完整 kitchen，不新增顶层字段清单。抽屉历史参数中的 plinth 保留为旧公式基准，实际底座与 legacyOffset 随配置派生，保证缺失配置时旧三抽几何不漂移。复验：test-kitchen-plinth.cjs、相关厨房／洗衣柜回归及 verify-kitchen-plinth.browser.js；详情见 [地柜底座高度](KITCHEN-DESIGN.md#地柜底座高度2026-10-20)。


2026-10-23：heating_manifold 默认总高按用户确认设为 500 mm，显式旧高度保持；rearService:true 为非 OBJ 生产分水器提供厨房后部设备整体让空能力，不是碰撞豁免或厂家操作预留。厨房仍需开启原 autoAvoid，后部受影响模块派生 obstacleFit.depths[].rearService:true，由生产布局取消背板并共同减深层板／抽屉。旧记录不新增标记，正常恢复按实际家具重新派生，详见 [分水器后方安装](HEATING-MANIFOLD.md#厨房地柜后方安装2026-10-23)。


2026-10-24：heating_manifold 默认宽／深集中于 manifold.width=800、depth=180，高 600 mm；新建 5 路时左长450／330 mm，旧显式尺寸及两排配置保持。wallFinishOpening=rectangle 为非 OBJ 生产模型的派生墙面饰层避让能力，不切结构墙、不增加默认检修余量。沿原实例字段和 mutate，墙层／墙砖／生产缓存及空间确认覆盖实际读取输入，无新持久字段。见 [毛坯墙基准](HEATING-MANIFOLD.md#毛坯墙基准与后铺瓷砖避让2026-10-24)。


## 洞洞板检修盖板分块（2026-10-25）

pegboardAssembly.hatch.maxPanels=16／minWeb=20 集中定义局部盖板数与间隔建模下限。可选 pegboardHatch.panels 每项 left/bottom/w/h（mm）、hinge、open；父级保留总范围但不是实体板。单块／旧手动缺失保持原结构；自动及显式适配按分离的电箱投影生成，近邻才合并。旧自动通过原 commit／work.restore 重算，不另建迁移或保存通道。

完整 cabinet 覆盖新建示例、旧恢复、严格导入、复制替换、当前／命名方案、撤销重做、自动保存、项目往返和缓存。采购将父／子 open 清零，确认新增 pegboard-local-hatches-v2；配色等非空间输入沿旧排除。具体几何、验证和限制见 [分块契约](ENTRY-PEGBOARD-CABINET.md#分开的电箱使用局部检修盖板2026-10-25)。
## 吊顶上发光型材参数补充（2026-10-25）

`ceiling.upChannel`集中保存新建预设默认值，旧实例不补写默认。39／22.5／13.6／18.6 mm来自用户截面图，其余壁厚、卡边、柔光板与灯带尺寸均为可编辑示意值；共用核心校验轮廓、灯带与柔光板关系。中央平顶翼边连接由相同实际型材尺寸派生，不复制到界面规则。详见 [吊顶截面](CEILINGS.md#分部件截面与中央板连接2026-10-25)。

吊顶截面整体转向规则：`sectionRotationStep=15`度、`sectionRotationTolerance=4`度，移动吸附复用12px阈值；`upChannel.rotation=0`仅用于新建／计算，0不补写旧模板。非零旋转与u/d锚点、实际轮廓及灯光共存，以v19保存；倾斜翼边作为中央平顶水平连接时共用核心拒绝。

## 筒灯安装资料覆盖（2026-10-25）

DL269 的 clearanceReview=missing 与其余缺资料设备共用待核对入口。已知外包、孔径和面环基准不代表散热、驱动器及检修净空已知；没有新增持久字段、默认高度或厂家间距假设。`test-scene-clearance-settings` 继续遍历电器目录验证资料覆盖。见 [全量记录](validation/full-regression-main-20261025/README.md)。

吊顶型材镜像补充：`upChannel.mirrorU/mirrorD=false`为新建／计算默认，false不写旧实例；保留参数的镜像字段需要v20。屏幕左右／上下镜像由核心转换局部反射、旋转和锚点，灯带与柔光板同变换。上口基准处上下镜像允许锚点d=0，实际顶点仍由原0～20000 mm校验。四项尺寸标注共用实际模板姿态，自绘只派生包络宽高；无新型号或厂家安装假设。

## 型材安装卡槽（2026-10-26）

`ceiling.upChannel.mountDetail=false`保留旧模板；新安装卡槽预设显式开启。mountProjection=4、mountHeight=7、mountBridge=3.5、mountFootHeight=4.5 mm为参考图未标的小尺寸示意，可在组合和独立编辑中调整。H形肋、空槽和下挡边进入共用生产轮廓，限制横肋上下实体、下挡边高于翼板和上下卡槽之间的净空；全局39／22.5／13.6／18.6 mm不改。关闭细节不补新字段，细节字段需要v23，旧恢复保留原几何。见 [型材卡槽](CEILINGS.md#组合剖面缩放精确贴合与安装卡槽2026-10-26)。
