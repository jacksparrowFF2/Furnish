# 模块与加载约定

2026-10-19提交范围：本次main仅收录统一铺砖及其依赖，保留此前家电预留与实际户型文件改动在本地。准确暂存源码已通过218套回归、12个内置户型及HTTP／断网file://四项专项；此前219套记录为包含其它未提交修改的整工作区验收。见[提交验收](validation/tile-workspace-main-20261019/summary.json)。

2026-10-19收尾：重复墙地／美缝／引导／起点UI删除表单与提交逻辑，只转发统一铺砖；预设库应用也转回同一草稿。`tile-parameters-core.js`共用字段、能力与关联组，`tile-editor-core.editLinked`显式区分本地组独立与预设订阅同步；恢复不重套预设。`tile-interaction-core.js`供实际SVG／生产三维共用毫米坐标、单带补丁和屏幕吸附，手势取消回退完整草稿，三维射线和户型图直接选面。`wall-finish-core.editFields`逐段保留未修改层厚，核对读取每带布局。家具基准、预设及铺贴仍一次mutate，无新保存通道／持久字段／版本。当前契约见[铺砖工作区](TILE-WORKSPACE.md)。

2026-10-19：主墙地砖入口收拢到`tile-workspace.js`，统一稳定表面选择、部分字段草稿、实际平面／立面及隔离生产3D预览，一次mutate应用。`tile-editor-core.js`复用墙地、美缝核心，保留现有字段、分带与预设关联；无迁移或版本变化。`tile-layout-preview.js`复用生产构造器，草稿不替换全局state；对话框增加可选beforeClose守护。旧入口转入同一工作区，预设管理从内部进入。流程与边界见[铺砖工作区](TILE-WORKSPACE.md)。

2026-10-19：三维墙面编号与家电预留检查分别读取 `scene3d.wallNumbers/clearances`，沿原展示设置校验、恢复及保存，缺省为显示；无家具字段或项目版本变更。产品规则 `clearanceReview` 集中定义电器覆盖，三维共用原热水器与洗碗机检查，未知设备显示无数据，标注避让覆盖预留标签。视图开关不进入空间确认。见 [显示开关](IMPROVEMENTS.md#2026-10-19三维墙面编号与家电预留显示开关)。

2026-10-19：铺贴预设应用后在`tilePresets.version=2`的`bindings`记录稳定墙侧／地面、预设分项及勾选参数组。`tile-preset-core.save(work,preset,plan)`原子同步关联表面，UI一次mutate保存库与实际排版；解除／删除关联保留实体参数。无关联旧快照不推断迁移。含关联使用外层版本14与v14缓存；恢复不隐式套用，复制内置户型时重映射墙侧绑定。详情见[关联更新](TILE-PRESET-INTERACTION.md#关联更新与独立设计)。

2026-10-19：墙砖可选`bands`保存同墙上下分带，核心在`elevation()`派生各带布局、真实洞口裁切与分界缝，生产`wall-tiling-model.js`、立面和地面起点预览读取同一分带几何。`wall-tile-bands.js`共用数字表单用于单墙和预设，显式应用仍走mutate。可选行字段继承整墙，起铺／对缝独立；实际分带或分带预设使用外层版本13，不迁移旧数据。单墙整面3D手柄对分带转到数字编辑，避免错误覆盖多种规格。见[同墙上下分带](TILE-PRESET-INTERACTION.md#同一面墙上下分带)。

2026-10-19：`tile-preset-core.js`校验预设快照与多分项，在旧墙地完成面字段上原子应用；`tile-presets.js`提供正式保存、拖放／点选、墙面编号分配和生产核心排版草稿，保存沿原mutate。可选`tilePresets`或`tileGrout.walls`使用外层版本12，旧数据不自动添加或套用；单墙颜色进入生产材质，房间／统一颜色编辑清除对应单墙覆盖。瓷砖观察以临时视图标志隐藏家具和相关CSS2D标注／拾取，不覆盖已存家具可见性。见[预设范围与操作](TILE-PRESET-INTERACTION.md)。

2026-10-19：`tile-grout-core.js` 校验可选按房间的墙／地美缝颜色并派生默认跟色；`tile-grout-preview.js` 临时替换生产材质，`tile-grout.js` 复用浮动编辑器和原mutate保存。正式排版材质的Canvas／GPU缝色一致，旧地面示意纹理只改原缝像素；没有几何或标高迁移。自定义颜色使用外层版本11，旧项目继续缺省跟色；缓存与仓库兼容旧版本，纯颜色不改空间确认。见[美缝颜色设置](FLOOR-FINISHES.md#按房间设置美缝颜色2026-10-19)。

2026-10-18：`snapWall()` 的描墙／端点模式增加有限墙面候选，按生产实体端边和端帽求接触，固定另一端并复验真实边界；原整墙平移／墙角优先保留。避开门窗洞口，最短仍为 50 mm；UI 使用原屏幕半径、蓝圈和草稿历史，无新增持久字段。见 [墙端贴面](IMPROVEMENTS.md#2026-10-18新墙端点直接吸附实际墙面)。

2026-10-18：主三维短墙联动复验直接观察生产地面网格、墙体包围盒和区域标签，覆盖三维开启时保存改墙、撤销重做、刷新及项目往返。`project-core.quantities()` 对物理房间的 `rings` 逐环累计真实墙周长，避免孔洞兼容 `poly` 中往返桥线虚增墙面工程量；无新字段。见 [面积与主三维复验](IMPROVEMENTS.md#2026-10-18两段短墙的面积与主三维联动复验)。

2026-10-18：功能区 `poly/rings` 保留设计边界，`applyZones()` 与当前实际房间求交派生可用边界；只允许被当前墙实体遮住的部分，越过墙进入其他空间、区域重叠或无有效面积仍拒绝。`fitZonesToWalls()` 只校验／匹配父空间，不再永久裁切，反复改墙不会留下旧位置碎片。房间网格可输出孤立短墙的真实孔洞 `rings/polys`，2D／生产地面共用。沿原草稿历史／建筑 commit，无新字段或版本，见 [可逆墙区派生](IMPROVEMENTS.md#2026-10-18短墙反复编辑的区域边界与真实孔洞)。下方旧裁切验收保留为历史记录。

2026-10-18：户型核心共用 `minWallLength=50` 供描墙、属性与项目校验读取；`wallCorners/snapWall` 按实际 `wallRect`（含端帽和连接）派生墙角候选，并在试吸附后复验双方真实角点。编辑器在原草稿历史中支持整墙平移与端点伸缩，使用屏幕 12 px 半径和临时蓝圈；保存继续沿原建筑 commit／自动保存，无新持久字段。范围与验收见 [短墙与墙角吸附](IMPROVEMENTS.md#2026-10-1850-mm-短墙与实际墙角吸附)。

2026-10-18：抽屉实际外面板在生产构造器开孔前读取网格宽高，附带只读 `cabinetDrawerSize` 元数据，与柜门共享初始尺寸标注和完整清单。厨房模块／保留结构／洗衣柜附属柜复用原标识，碗碟篮仅计真实两块外面板；不新增持久字段或保存通道，见 [抽屉面板尺寸](CABINET-DESIGN.md#抽屉面板宽高2026-10-18)。

2026-10-18：共用柜体预览的整体尺寸页同时投影全部生产门板尺寸，门板页按当前分区聚焦；完整清单独立于分区筛选。厨房生产门板元数据区分洗衣柜附属柜，末端薄柜按所属边标识，保留结构附带内部分区。展开视图切换模块不再重显父预览清单。无新增持久数据或保存通道，见 [柜门尺寸](CABINET-DESIGN.md#进入设计即显示门板尺寸2026-10-18)。

2026-10-18：建筑洞口增加可选 `doorType:single/double`，主属性选择门型与向内／向外，描图新增门可选对开。`layout-geometry` 共用门扇、扇形与覆盖恢复，2D、生产3D、漫游和空间核对分别读取两扇半宽门；3D点击任一扇联动。沿原 `state.open`／mutate、自动保存及项目链路，门型进入已有建筑缓存与空间确认；旧缺失单门不补写。兼容、范围与验收见 [对开门](DOUBLE-DOORS.md)。

2026-10-18：管道包覆柜属性增加直接方向选择：三面选前／后／左／右敞开，两面选四组相邻保留面。可选 `pipeBoxOpenSide/pipeBoxCorner` 缺失读取原背面敞开／正面＋左面，不补写旧记录；尺寸和姿态不随方向变化。产品核心按实际保留面派生板件及净空边界，有效方向签名共用模型缓存、空间确认和采购分组，切换结构保留另一方向选择。兼容、截图及验证见 [管道包覆柜](PIPE-ENCLOSURE.md#直接选择方向2026-10-18)。

2026-10-18：管道包覆柜增加四面围合、三面 U 形和相邻垂直两面 L 形选择，上下始终敞开，方向复用旋转／镜像。可选 `pipeBoxShape` 新建为 three，旧缺失按原三面读取且不补写；结构能力、净空校验与实际板件共用产品核心，2D／3D、实体核对、采购分组、缓存与空间确认同步。复制、替换、撤销及项目往返沿原链路，边界与验证见 [管道包覆柜](PIPE-ENCLOSURE.md)。

2026-10-18：单墙3D独立起点由`wall-origin-3d.js`管理临时指针草稿，`wall-origin-preview.js`在生产墙砖表面更新UV并生成手柄／轮廓；局部U／绝对Z共用屏幕线段吸附，临时观察剖切独立清理。应用复用墙砖edit与mutate，仅选定墙解除followFloor，无新持久字段，见[单墙三维起点](WALL-TILING.md#单墙三维独立起点2026-10-18)。

2026-10-18：卫生间3D起铺点以`floor-origin-preview.js`暂存生产地面／关联墙砖的原UV，调用共用UV生成器原位更新；主场景射线只取本区域可见地面。圆环以区域内等价砖角表示远处基准；角点与实际完成面墙边以屏幕12px吸附，沿墙切向滑动，区域墙边缓存随建筑重建清空；拖动在父级捕获指针、按帧更新并冻结OrbitControls；取消手势恢复拖动前草稿。UI草稿不写state或历史，应用仍用`setLayoutBasis()`／mutate，关闭和重建清理；无新持久字段，见[动态起铺点](FLOOR-FINISHES.md#卫生间3d动态起铺点2026-10-18)。

2026-10-18：合并后的增强吊顶与墙地砖跟随统一使用外层版本9及独立v9缓存，`project-core.formatVersion()`供项目、仓库和自动保存共用；旧v7/v8均可读，首次无v9时选最新旧缓存，仓库仲裁前归档全部分歧候选。以下v7/v8说明保留为历史记录，当前契约见[合并兼容](REPOSITORY-SAVES.md#合并后的版本9兼容2026-10-18)。

2026-10-18：地面核心派生门洞两侧铺贴与真实高差，2D／3D／DXF／落点及核对共用；生产 surface／layers 分开纹理顶面与真实侧面，砖缝增强不改物理节距。墙砖核心 floorAlignment／alignFloor 用地砖坐标计算沿墙宽度及偏移，UI 单墙草稿或一次批量mutate保存 followFloor 关联，派生排版随地砖变化；含关联时使用外层v7。详见 [门洞与高差](FLOOR-FINISHES.md#门洞补铺可读砖缝与真实高差2026-10-18) 和 [墙地对缝](WALL-TILING.md#墙地对缝2026-10-18)。

2026-10-18：地面核心 `setLayers()` 共用全区域层厚批量写入与卫生间例外，UI 草稿预览后一次 mutate，沿原 floorFinishes 记录与版本。墙砖批量入口默认各自完成地面以上0，与原单墙默认一致；引导接受直接层厚及各自起铺线，不强制参考高差或共用绝对线。旧显式起铺设置保留，详见 [地面标高](FLOOR-FINISHES.md#批量设置地面标高2026-10-18) 与 [墙砖](WALL-TILING.md)。

2026-10-17：完整洗衣柜新增 `kitchen.laundry.assembly` 整体配置，通过 `laundryParts()` 派生吊柜、开放格与水槽供同一生产构造器和空间规则使用；家具列表仅整柜及复用的独立洗衣机，后者以产品能力字段 `laundryHostId` 对齐。统一设计器共享一个草稿和 mutate，实际旧五件模板经显式迁移收拢，普通恢复不自动转换。设备外侧支撑板进入净宽，落地水槽柜取消真实底板和底座。详见 [整体洗衣柜](LAUNDRY-CABINET.md#整体柜体支撑侧板与落地水槽柜2026-10-17-更新)。

2026-10-17：`scene-observation.js` 提供主场景临时观察取景和建筑剖切。定位家具按全部选中生产模型的真实世界包围盒（含柜门姿态）适配透视画面与浮条预留，第一次朝主选中家具正面观察；相机朝向驱动建筑材质克隆上的裁切平面，原材质与共享缓存不变，拾取／落点排除被裁切交点。恢复、取消选择、漫游与退出清理临时状态；漫游以全高墙派生，不覆盖已存低墙偏好。无持久字段、历史或保存通道变化，见 [观察取景](IMPROVEMENTS.md#2026-10-17整组家具三维取景与临时建筑剖切)。

2026-10-17：`kitchen-core.createLaundryArea()` 从产品能力生成五件已编组完整阳台洗衣区，目录组合标记仅在新增时使用，不进入持久数据；原 groupId／counterLink 保留复制与项目恢复。多选属性复用洗衣区左右和开门控制，`setLaundryDoors()` 委托原模块／柜体开合，所有应用沿 mutate。详见 [组合模板](LAUNDRY-CABINET.md#完整组合模板与柜门2026-10-17)。

2026-10-17：阳台洗衣机柜复用 counter 的 kitchen 模块、连续台面和设备空位，新增可选 kitchen.laundry；定制 ksink 的可选 sinkNotch 共用凹形孔环。产品核心定义示例和边界，厨房核心派生缺角与设备定位，生产柜体／盆体／2D 和缓存核对同步消费，编辑仍走 mutate。详见 [洗衣机柜](LAUNDRY-CABINET.md)。

2026-10-17：`navigation-input.js` 共用触摸板／鼠标 wheel 解释、SVG 视口平移与三维相机导航；原普通脚本顺序离线加载。操作设备作为独立本机偏好，不进入工作区或项目结构；视图事件不调用 mutate。主三维空格拖动切换原 OrbitControls 的左键平移，并避开家具编辑。识别策略和实机边界见 [触摸板操作](IMPROVEMENTS.md#2026-10-17win11-触摸板视图操作)。

2026-10-17：主3D场景保留原像素比、抗锯齿及阴影分辨率，改用显式阴影刷新。相机与标注只令画面失效；建筑／家具同步、三维拖动、门窗／窗帘动画、场景伸缩、日照及家具可见性改变通过 `invalidate(true)` 更新阴影。事件对象不会被误认成阴影刷新请求。详见 [3D阴影复用](IMPROVEMENTS.md#2026-10-17三维镜头操作与阴影复用)。

2026-10-17：`plan-renderer.js` 为只读画布层复用一份按实际建筑／完成面输入校验的户型派生，同次全图绘制共享该结果；自动尺寸分开缓存几何链和随缩放／朝向／主题变化的 SVG 排版。`canvas-interactions.js` 将家具／标注拖动事件合并到下一帧，松手先补齐最后位置，取消丢弃待执行事件；双指接管前先处理原单指位置。没有新持久字段或保存通道，详见 [性能改进与实测](IMPROVEMENTS.md#2026-10-17二维画布性能优化)。

2026-10-17：`finish-guide-core.js`只读派生厨卫／阳台地面、参考高差和已启用墙砖起铺状态，`finish-guide.js`将四步导航接到原浮动编辑器、墙砖列表及空间核对。没有新项目字段或独立保存／进度通道；应用仍由原编辑器mutate，导航草稿提示仅作用于引导内按钮。见[铺贴设定引导](FINISH-SETUP-GUIDE.md)。

2026-10-17：`ceiling-core.endOpening/endCaps`按真实槽底与挡边派生开放端局部封片，灯带共用端板内侧退让；生产构造器复用直段挤出，增加两端近景，统一实体核对读取板件。可选`profile.ends`使用外层版本8／独立v8缓存，保留旧记录及关闭后的配置。转角初值改R8，已有圆弧可显式收小；不强制迁移旧值。见[吊顶说明](CEILINGS.md)。

2026-10-17：灯带可由分段显式改为四分之一圆弧连续绕角，`ceiling-core.lightLayout()`派生统一环截面、平面占地、中心线及槽腔／承托检查；`ceiling-model`复用无内部端盖的环截面扫掠，主场景和转角近景共用。可选`light.corner:{mode,radius}`使用外层版本7／独立v7缓存，旧分段L形继续6；保存撤销沿原通道，未应用输入与取消范围不变。见[吊顶说明](CEILINGS.md)。

2026-10-16：`ceiling-core.js`提供可选吊顶截面、区域直边／两段凸90°L形路径、分段灯带和显式单面／两边平顶固定连接；`ceiling-model.js`复用真实凹形截面供主场景及独立2D编辑器的三维预览。UI草稿应用仍走mutate，实体核对与建筑缓存消费同一派生；直边沿用外层版本5／v5缓存，L形及转角字段用版本6／独立v6缓存，旧数据无吊顶时不补写。首版范围与未实现边界见[吊顶截面编辑](CEILINGS.md)。

2026-10-16：`wall-tiling-core.js` 独立保存可选 wallTiling，不改 wallFinishes 厚度；复用真实墙侧绑定和 faceSections 洞口标高。项目在完成面／地面之后派生区域墙砖立面，`wall-tiling-model.js` 绘制生产表面与统一 UV；`wall-tiling.js` 复用浮动编辑器及 mutate，提供厨卫／阳台列表、即时立面、SVG 和统一起铺高度。纯排版不触发家具归一化或清空间确认，建筑缓存覆盖排版；含新字段使用外层版本 4 与独立 v4 缓存，仍读旧文件与缓存。规则与验收见 [墙砖铺贴](WALL-TILING.md)。

2026-10-16：`wall-finish-core.js` 共用墙侧绑定、绝对 mm 厚度、门窗标高和完成面派生；`effectivePlan()` 保留毛坯墙房间，`spatial()` 供吸附、净距与空间核对读取。二维与 `wall-finish-model.js` 三维生产构造器读取同一实体。仅饰面提交跳过家具／厨房联动，含饰面的恢复保留柜体配置；当前／命名方案及工作区按使用情况写外层版本 2，新版兼容版本 1。接口、输入范围、数据映射及验证见 [墙面完成面](WALL-FINISHES.md)。

2026-10-16：`property-panel.js` 的原选中浮条提供宽深快捷编辑和四向净距入口，柜体调用原详细设计器，尺寸／定位仍走原核心及 mutate 历史保存。临时面板和浮条按 SVG 刷新后的屏幕矩形联合避让；窄屏或没有可用空位时，原 DOM 移入顶部／右侧保留区，SVG 采用剩余视口，原 ResizeObserver 与屏幕转换继续处理视图。保留区变化后只做必要的临时平移以显示选中项，不写项目位置或缩放值；`plan-renderer` 仅调度下一帧定位。侧栏和快捷面板共用测量数值及参照名，无新持久字段、规则白名单或加载资源。行为与屏幕避让边界见 [改进记录](IMPROVEMENTS.md#2026-10-16家具浮动工具条快捷尺寸与四向定位)。

2026-10-16：验收实现集中至 `scripts/verify/`，70 个浏览器函数内容保持，8 个 Node 实现仅修正相对导入路径。根目录保留统一入口和原独立 Node 命令的委托入口；维护分工见 [脚本入口](../scripts/README.md)。规则回归同时解析全部独立验收实现的本地 require，避免目录迁移留下失效依赖。预览生成器暂保留原位置，应用加载与设计格式不变。

2026-10-16：浏览器验收通过 `scripts/verify-browser.cjs` 统一调度，`scripts/lib/browser-verification.cjs` 提供可迁移路径、文件 URL、服务地址及 Playwright 启动配置。验收在含特殊字符的独立副本生成预览，使用随机端口的只读静态服务与临时浏览器存储；固定图纸和合成输入维护在 tests/fixtures/browser，工作流前置显式排序。应用加载和真实设计文件不变，详见 [浏览器验收](BROWSER-VERIFICATION.md)。

2026-10-16：`output/` 统一作为不入 Git 的本地生成目录；参考图、技能及精选证据分别维护在 `docs/references`、`skills/furnish-modeling`、`docs/validation`。`generate-previews.cjs` 从源码重建预览；缺失生成器的旧餐边柜／热水器视图由 `templates/previews` 与当前入口离线引擎装配，热水器复用当前家具生产代码。独立临时副本回归确保生成器不依赖本机已有 output，维护资料链接单独校验。应用加载与设计保存格式保持。见 [资料与生成物](OUTPUT-ARTIFACTS.md)。

2026-10-16：`repository-core.js` 共用工作区校验与稳定序列化，`repository-storage.js` 协调缓存基准和延迟文件写入，`repository-workspace.js` 统一接管启动恢复。原 `save()` 和 mutate／撤销链路追加文件保存；本地服务提供固定路径、同源、版本比较和临时文件替换接口。`projects/workspace.furnish.json` 保存全部工作槽与共享库，`.local/furnish-recovery` 保存不入 Git 的迁移／冲突副本；文件优先于无基准旧缓存，IndexedDB 不再按时间异步覆盖文件。直接打开文件沿用缓存，无 Git 自动操作。见 [仓库保存](REPOSITORY-SAVES.md)。

2026-10-16：折叠餐桌三规格共用产品能力 `folding-table` 与可选枚举 `foldingTablePose`，产品核心派生板形、当前占地及固定桌架的形态编辑。`folding-table-model.js` 提供主场景／预览共用生产构造器，普通脚本保持离线加载；尺寸缩放在子组内，兼容根组缓存位姿更新。形态进入3D签名与空间确认，UI沿mutate与原保存历史。资料推算、兼容和边界见 [折叠餐桌](TABLE-FOLDING-YESWOOD.md)。

2026-10-16：水槽／燃气灶的测量区域由 `kitchen-core.measurementSurface()` 派生为本模块与真实台面的交集；`snapping.directional()` 和 `surfaceOpening()` 共用紧邻实体墙优先、开放方向模块边界规则。产品规则集中定义 5 mm 几何贴邻容差，UI 显式提供墙窗分界及未拆除墙；数字定位固定模块参照。无新持久字段或加载资源，见 [测量规则](MEASUREMENTS.md#水槽燃气灶的模块边界与紧邻墙优先2026-10-16)。

2026-10-16：`dishwasher-model.js` 提供米家台面洗碗机生产构造器，主场景和独立预览共用；普通脚本加载及现有离线 import map 保持原方式。产品规则集中定义底部离地／机身高度／折叠状态与展开深度，UI 经 mutate 编辑；2D 显示展开门板，生产缓存和核对上下文包含 `dishwasherDoorOpen`；实体仍取闭合机身，`project-core.dishwasherChecks()` 独立派生完全开门保守包络及图片安装预留，属性／吊柜草稿／全案共用，空间标记为 `dishwasher-installation-v1`，上下文新增窗的投影和标高。兼容、资料及验收见 [台面洗碗机](DISHWASHER-MIJIA-COUNTERTOP.md)。

2026-10-16：箭牌水槽启用已有 `measureSurfaceBoundary` 能力，与燃气灶共用 `snapping.directional()` 的台面出口边量距和 `surfaceOpening()` 的生产孔型／孔边距；原 hobOpening 保留兼容别名。画布、属性、数字定位和导出继续消费原链路，橙色孔边距标签在显示轴下与绿色外沿净距错开。没有新持久字段或加载资源，已确认生产模型保持。见 [水槽台面交互](SINK-ARROW.md#与台面交互对齐燃气灶2026-10-16)。

2026-10-16：燃气灶可选 `hobCutout.w/d` 由产品能力定义历史默认公式、绝对 mm 范围和替换清理，厨房 `cutout()` 统一消费；二维虚线／孔边距与关联台面三维孔洞同步，宿主签名已有派生孔环，核对上下文新增完整参数。UI 经原 mutate 编辑和恢复默认，无新保存通道或加载资源。替换前尺寸校验与最终替换共用产品字段保留判定。见 [手动开孔](FOTILE-APPLIANCES.md#手动开孔尺寸2026-10-16)。

2026-10-16：`cabinet-core` 统一处理可选 `doorLayout` 逐扇相邻配对，厨房模块派生为同名生产列设置；导入校验和尺寸截补共用规则，预览／运动板件／开启区消费同一方向，不新增保存通道。生产门板附带非持久 `cabinetDoorSize` 元数据，预览投影标签及完整清单读取实际宽高，L／U 子预览共用。详见 [自定义配对与尺寸](CABINET-DESIGN.md#自定义门板配对与逐扇尺寸2026-10-16)。

2026-10-16：`cabinet-core.hoodBayFit()` 按实际横板开关、顶板、中部层板和罩体深度与背板的相交计算高度限制，主机齐平提示附带毫米高差；不改用户设备位置或尺寸。核对标记为 `hood-bay-v5-actual-ceiling`，完整结构继续进入原上下文。见 [嵌合高度](KITCHEN-WALL-ADJUST.md#嵌合高度与真实板件2026-10-16)。

2026-10-15：烟机嵌合柜可选 `cabinet.hoodBayCeiling:false` 取消中部横板，缺失按产品能力 `kitchenwall.hoodBay.ceilingDefault:true` 保留旧板件。生产底板覆盖内隔板下沿，修复两侧板厚范围的缺角。每侧间隙由 `setHoodSideGap()` 读取实际装饰罩宽并转换成原中部净宽，UI 草稿共用 `readHoodBayFields()`，不新增间隙持久字段；完整 cabinet/structure 已进入缓存与恢复，核对标记为 `hood-bay-v4-cavity-details`。见 [空腔细节](KITCHEN-WALL-ADJUST.md#烟机空腔横板缺角与两侧间隙2026-10-15)。

2026-10-15：保留结构烟机柜的 `frontLeafCount()` 不再按旧 `autoFrontWidth` 重分门扇，生产门板与开启区共用两侧原门型。`layout-geometry.bodyParts()` 从产品 `hoodInstallation()` 分别派生低位主机和高位装饰罩；四向量距对通过 `hoodBayFit()` 的烟机／宿主不互作阻挡，失配仍参与。空间核对标记为 `hood-bay-v3-module-fronts`。见 [模块烟机柜修复](KITCHEN-WALL-ADJUST.md#模块烟机柜门板与安装修复2026-10-15)。

2026-10-15：四向净距在 `snapping.directional()` 中按参考家具逐成员调用共享 `layout-geometry.verticalOverlap()`；高度明确分离或仅竖向接触的成员不参与该参考的轮廓扫描，高度未知保守保留，墙窗仍按平面计算。画布、属性与精确定位共用结果；没有新增持久字段、缓存或加载资源。见 [吊柜与四向净距](MEASUREMENTS.md#吊柜与四向净距2026-10-15)。

2026-10-15：`kitchenwall` 可选 kitchen 复用分排及边界编辑，吊柜使用零台面／零新踢脚及独立安装高度。`fromWall()` 仅在草稿中保存旧模块尺寸基准和原结构；内部编辑返回外层草稿，最终一次 mutate。`openDialog` 的可选关闭回调用于返回草稿，不新增保存或历史通道；实体、管线、开启、房间模型与展开读取实际模块和离地。详见 [吊柜调节](KITCHEN-WALL-ADJUST.md)。

2026-10-15：`kitchen-core.drawerBoundaryTargets()` 提供同排相邻抽屉的可行分界高度，预览按 `counter.drawerTiers.snapPixels` 投影吸附并画临时辅助线；仍由原相邻层编辑和编辑器草稿／mutate 保存，无新持久字段。见 [相邻抽屉吸附](KITCHEN-DESIGN.md#相邻抽屉层间吸附2026-10-15)。

2026-10-15：厨房抽屉层间拖动通过 `kitchen-core.resizeDrawerBoundary()` 只补差相邻两层；共享预览投影真实面板并映射展开行的原模块索引，临时拖动快照与数字草稿由厨房编辑器管理，最终沿用原 mutate 保存，无新增字段。详见 [抽屉层间编辑](KITCHEN-DESIGN.md#抽屉层间拖动与高度数字入口2026-10-15)。

2026-10-15：燃气灶的 `measureSurfaceBoundary` 派生能力由产品规则提供；`snapping.directional()` 复用厨房 `onSurface()` 完整承托判定，在包含灶具的台面实体区间量到出口边。画布和属性共用结果，保存仍只写原测量端点，无新字段或加载资源。详见 [灶具四向实体边距](MEASUREMENTS.md#燃气灶到台面实体边界2026-10-15)。

2026-10-15：箭牌水槽由 `src/render/sink-model.js` 生产构造，安装能力在产品规则，实际孔型／完整台面承托判定在厨房核心。`deviceOpenings()`／`slabGeometry()` 为模块及旧组合台面提供同一毫米孔洞几何，合并重叠开孔后再三角化；`deviceSignature()` 覆盖宿主相对关系，`normalizeSinks()` 沿用 commit／restore 派生安装高度。普通脚本新增本地构造器，独立预览复用生产模型和原离线 import map，HTTP／断网 file:// 已验证。详见 [水槽](SINK-ARROW.md)。

2026-10-15：`snapping.js` 提供有限占地边界测量吸附和按当前图纸视角计算的四向最近净距；普通家具按旋转矩形，厨房读取生产台面轮廓。四向共用分段扫描，画布不再叠加原仅墙面的辅助线；可选择单条测量删除，四向预览支持单方向／一次保存全部有效方向，均经原 `mutate()` 保存现有固定端点，无新增持久字段或加载资源。详见 [2D 测量](MEASUREMENTS.md)。

四向数字可点击输入目标净距；`design-core.placeSelectionAtDirectionalGap()` 共用 `expandGroups()`，固定外部参考，按显示轴让全部成员平移相同位移，验证整组精确净距、各成员生产部件扫掠、房间和外部墙窗／家具，并预演原生产联动链路。`snapping.directional()` 接受单件或数组，计算成员实际外侧轮廓并排除组内参考；组内空隙不当实体。UI 在一次 `mutate()` 内更新所有成员 `cx/cy`，保存线保持固定端点；单件兼容接口仍委托同一核心，共享 SAT 原碰撞默认容差不变。任一锁定成员禁用整个定位，关联方须全部选中；复杂配置联动限制见 [精确定位](MEASUREMENTS.md#点击数字精确定位)。

2026-10-14：`src/core/drawing-core.js` 共用可选图纸设置校验、显示坐标变换、投影尺寸与方向；`src/ui/drawing-tools.js` 通过现有 mutate 和导出适配器装配朝向、指北针及尺寸设置。详见 [图纸朝向](DRAWING-ORIENTATION.md)。`project-core.js` 的空间检查采用保守包围框提前排除和扫描线候选筛选，review 只缓存最后一份完整规则输入／名称／异常和接受记录，返回独立副本；价格、采购和图纸显示不清除空间确认。3D 家具签名排除未用于生产几何的价格与采购字段，真北单独更新示意光照。

2026-10-14：`src/ui/workflow-tools.js` 在现有 UI 扩展后装配画布旁工具、保存入口、价格依据／材料规格、空间侧栏、临时风格预览和净距对话框；共用现有 `ui`、`mutate()`、项目规则与属性面板，没有新工作状态或保存通道。`src/core/wall-distance-core.js` 提供毫米净距与原子联动，`src/core/placement-suggestions.js` 只返回通过占地／开启及全案间隙检查的候选，不移动锁定、编组、厨房或关联设备。`src/io/dxf-export.js` 生成布局交接 DXF。材料规格及价格依据仍属于 `project-core.js`；详见 [材料采购](MATERIAL-PURCHASING.md)、[墙间净距](WALL-DISTANCE.md)、[DXF 导出](DXF-EXPORT.md)。

临时风格预览仅向生产 3D 家具构造器提供配色副本，源工作方案、2D 和预算保持原值；应用家具配色或完整风格分别经 `mutate()`。方案内容改变时预览失效，预览期间不提供交付截图，防止临时外观混入真实成果。新增脚本保持原有普通脚本加载，无 async 或网络依赖。

厨房模块规则在 `src/core/kitchen-core.js`，生产构造器在 `src/render/kitchen-model.js`，属性表单在 `src/ui/kitchen-editor.js`。产品能力由 `product-rules.js` 管理；厨房核心加载在产品规则之前，构造器只在调用时读取柜体生产模型。旧组合、新厨房、设备关联及独立吊柜的契约见 [厨房设计](KITCHEN-DESIGN.md)。

边界预留由 `snapping.kitchenGaps()`／`setKitchenGap()` 提供临时参考与精确尺寸提案，UI 经原 mutate 应用，不走整体位移。避让同时派生 `obstacleFit.corners`，名义 `cornerBlocks()` 与生产 `cornerLayout()` 分离；板件、底座、空腔及展开共用实际转角，`adjacentOpenings()` 只切真实相邻重叠范围。见 [预留与转角](KITCHEN-DESIGN.md#边界预留输入与转角减浅齐平2026-10-15)。

厨房的外框和独立边长拉伸共用 `snapping.js` 内部 `kitchenEdgeSnap()`：整条活动边段与有限墙窗／家具边界对齐，支持端点附近接触，排除自身及关联设备，分别服从贴墙与对齐开关。吸附候选须通过原尺寸／设备约束，旋转参考线采用临时两点线段；不新增持久字段。范围及验收见 [厨房吸附](KITCHEN-DESIGN.md#外框与独立边长的家具吸附2026-10-15)。

2026-10-15：模块厨房增加 U 形三边及两个空腔转角，产品规则 `counter.kitchenShapes` 定义模块／末端边，厨房核心共用派生轮廓、设备、开启与避让；2D 与生产模型消费同一几何。三边展开沿用生产预览及原索引，不保存临时行；L/U 显式转换保留同侧转角与原模块世界基准。数据和边界见 [U 形厨房](KITCHEN-DESIGN.md#u-形三边连续台面2026-10-15)。

U 形画布增加三边独立手柄，并保留原外包宽／深／角点手柄：`kitchen-core.runHandles()` 提供生产局部坐标，`resizeRun()` 只改目标末端模块，`snapping.resizeKitchenRun()` 做旋转／镜像投影、相对网格及有限墙面吸附。独立边 UI 沿用原指针快照／commit，固定首转角，不做整组推离；连接边变化仅平移回折边。独立边长能力为 `counter.kitchenShapes.U.independentResize`。U 形四条外框边共用 `outerEdge()`／`resizeOuter()` 与 `snapping.resizeKitchenOuter()`，整边抓取，固定对侧和内侧；背边只改对应一排柜深，开口边只改长边末端柜宽。可选 `kitchen.runDepths` 缺失时沿用原 depth，生产模型、矩形盲角展开、设备及空间检查共用每排深度，详见 [四边与柜深](KITCHEN-DESIGN.md#u-形外框四边与独立柜深2026-10-15)。旧 `resize()` 仍供整体尺寸兼容调用。见 [三边手柄](KITCHEN-DESIGN.md#u-形三边独立拉伸手柄2026-10-15)。


Furnish 使用浏览器原生脚本，无需构建。直接打开 `index.html` 的兼容性是拆分代码时的约束；三维场景协调与 Three.js 的 data-URL import map 继续保留在入口中。

## 生产模型与预览入口（分两批，2026-10-16）

`src/render/model-primitives.js` 以普通脚本／Node 共用的 `FurnishModelPrimitives.create(THREE, RoundedBoxGeometry, mat)` 提供原有几何与装饰工具，输入输出仍为 m，底面基准保持。主页面注入原有带缓存和环境反射的材质函数，不另建材质缓存。

`src/render/appliance-model.js` 的 `FurnishApplianceModel.create(THREE, RoundedBoxGeometry, {primitives, products, design})` 返回 `supported(f)` 和 `build(f, {furniture})`。支持原冰箱、纯平四门冰箱、扁桶热水器及洗烘设备，输入家具仍为 mm。构造器只生成产品局部几何，不应用 `cx/cy`、旋转、镜像或写入家具。冰箱在地面；热水器按原规则在内部几何中计入底部离地，不能再叠加一次 mountHeight。洗烘机身保留原根组高度缩放，通过显式传入的家具列表共用设计核心派生连接层，连接层高度补偿同一缩放；外层离地仍由主页面或预览放置。主页面 `buildFurniture()` 继续负责 OBJ 优先、世界放置、镜像、fid、后处理和缓存。

`src/render/sliding-opening-model.js` 的 `FurnishSlidingOpeningModel.create(THREE, {primitives, products})` 返回家具 `build(f)` 与建筑洞口 `buildOpening(w,d,h,count,color,options)`。家具输入 mm，原建筑接口仍用 m；返回原移动门扇／轨道和共享动画元数据。家具窗台仍在内部子组计入，整体姿态由调用者应用。主页面保留 `buildSlidingDoor()` 薄适配函数，原开合、拾取和漫游阻挡继续使用相同对象。

冰箱、热水器、洗烘和三联动四类预览直接加载生产模块；现有全部 19 个预览生成时只从入口读取离线 import map，不再按家具源码标记截取模型。其他已有专用模型维持原接口，剩余通用家具分派仍在入口中。原导入映射、普通脚本加载顺序和 `file://` 离线策略保持，无构建步骤。验收记录见 [首批](validation/model-entry-batch1-20261016.json)与[第二批](validation/model-entry-batch2-20261016.json)。

## 数据与规则

- `src/core/product-rules.js`：产品默认高度、安装基准、持久字段能力/校验、旧数据迁移及替换清理。浏览器 `FurnishProducts` / Node `require()` 共用，无 DOM、网络和 Three.js；目录、设计、项目、属性、新建及相关 3D 使用同一接口。加载在柜体核心后、花洒模型与设计核心前，保持普通脚本及离线兼容。详见 [产品规则与兼容验收](PRODUCT-RULES.md)。

- `src/data/plans.js`：内置户型。
- `src/data/catalog.js`：材料、家具分类与按类型估算的参考价格。自定义家具仍来自浏览器存储。
- `src/data/i18n.js`：英文名称、简繁转换与按语言选择文案。当前语言及 DOM 更新由主应用管理。
- `src/data/style-presets.js`：风格预设。
- `src/core/style-core.js`：应用家具配色与房间材料，复用 `design-core.js` 的房间用途规则。调用者负责撤销、保存、渲染和提示。
- `src/core/layout-geometry.js`：面积、周长、旋转外包框、点在多边形内判断、分离轴碰撞与整组范围。`collisions(furniture)` 显式接收家具数组；保留 5 mm 容差和椅子／桌子等例外。
- `src/core/work-state.js`：`create({makeId, colorFor, materials})` 提供工作方案的 `fresh(plan)`、`restore(work, plan)` 和 `restoreFurniture(list)`。复用设计与结构规则，保留有效位置和项目附加字段；恢复按原行为更新传入的工作对象，自定义结构先重建并核对户型编号。
- 同一工作规则实例的 `prepareShared(work, plan, lockedOriginal)` 先复制校验、恢复字段、保护已确认结构，再核对目标户型；准备失败不改应用状态。
- `src/core/snapping.js`：移动吸附与测量点吸附显式接收网格、缩放、墙窗范围、家具及排除集合，返回坐标和参考线，不修改 UI。复用旋转外包框，保留像素容差、最近候选和并列候选的先后规则。
- `src/render/furniture-svg.js`：`render(type, width, depth, color, palette)` 生成单件家具图例，`shade(color, factor)` 处理颜色。图例使用调用时的调色板，不读取当前主题。

2D 家具由 `design-core.planFurnitureOrder()` 派生稳定层叠顺序，分离高度按底到顶绘制；桌椅整体高度交叠或未知时共用 `layout-geometry.tuckedSeatUnder()` 将椅面置于桌面下。`drawing-core.furnitureLabels()` 避让桌面覆盖区，`syncFurnOrder()` 同步拖动中的 DOM 与标签；不改变保存的家具顺序。整件层叠及圆桌标签保守避让的边界见 [改进记录](IMPROVEMENTS.md#2026-10-15餐椅推进餐桌下的平面遮挡)。

拖椅时 `syncTuckedSeatPreview()` 根据当前指针操作给交叠的静止桌面添加临时属性，CSS 设 25% 不透明度；`endDrag()` 在结束／取消时清除，重新绘制按实时操作派生。圆桌／书桌共用桌椅类型接口；不写项目字段，成果导出移除属性。见 [透视预览与边界](IMPROVEMENTS.md#2026-10-15圆桌书桌遮挡与拖椅透视预览)。

这些模块不读取 DOM 或当前应用状态。浏览器通过 `FurnishPlans`、`FurnishCatalogData`、`FurnishI18n`、`FurnishStylePresets`、`FurnishStyles` 获取数据与接口；Node 通过 `require()` 直接读取同一份实现。`FurnishCatalog` 保留给现有家具库 UI 接口，避免与静态数据混用。风格和户型测试无需按源码文本位置截取代码。

## 浏览器适配与主应用

- `src/ui/budget-panel.js`：概览、家具清单、报价面板与 CSV 导出；计算仍交给 `project-core.js`。
- `src/ui/property-panel.js`：属性面板分派、浮动工具条、房间／单件／多选家具／内置门窗属性及标注编辑。调用时读取当前状态，继续通过 `mutate()` 进入统一撤销与自动保存；墙体、自定义窗和飘窗仍交给项目 UI 的扩展接口。
- `src/ui/canvas-interactions.js`：视图变换、吸附适配、鼠标／触屏指针、滚轮及画布菜单。文件加载只声明函数和操作状态；主应用在状态及 DOM 就绪后调用一次 `initializeCanvasInteractions()` 绑定事件。拖动取消恢复拖动前状态及工作槽，不写保存或撤销记录。
- `src/ui/history-sharing.js`：命名方案列表、恢复点节流／界面和分享载入协调。主应用调用一次 `initializeHistorySharing()`，读取缓存并绑定浏览器行为；分享准备完成后才保留恢复点、登记户型、应用和刷新。
- `src/ui/furniture-actions.js`：选择、剪贴板、旋转、对齐、尺寸恢复及定位操作；复用现有规则、历史与渲染。
- `src/io/image-export.js`：浏览器下载与 PNG 导出。
- `src/io/workspace-cache.js`：`load({read, firstPlan, restore, key})` 读取 v2 缓存，缺失／不可读时尝试把 v1 工作迁移至第一套户型；异常时返回空工作区。存储访问由调用者注入，模块本身不读取浏览器 API。
- `src/io/autosave.js`：自动保存协调器，注入缓存写入、历史缓存清理、项目写入及状态通知。缓存失败清理历史并重试，再由 IndexedDB 兜底；两处均失败才提示备份。每次保存的序号及工作对象／版本检查阻止旧回调覆盖新提示，`invalidate()` 取消清空操作前的回调。
- `src/io/recovery-storage.js`：恢复点缓存读取、有效 IndexedDB 记录合并和持久化结果协调；每次写入使用独立序号，防止同一数组上的旧请求覆盖新结果，清空前可使回调失效。
- `src/io/share-codec.js`：保留 `r` 原文和 `z` deflate-raw 格式。压缩格式不可用时生成原文链接；异步载入协调器只应用最新请求，校验失败不应用，完成后允许重新载入同一链接。
- `src/render/plan-renderer.js`：材质图案、房间、家具、墙体、门窗、尺寸、测量、标注、选择框及整幅画布刷新。图层继续使用实时状态与原有排序、缓存和 UI 扩展钩子。
- `src/app.js`：当前户型、状态、历史、操作表与事件委托、键盘及应用初始化。

浏览器适配与画布图层文件是普通脚本，与 `app.js` 共用全局词法作用域。其顶层只声明函数、常量或局部操作状态，不读取尚未初始化的 `state`、`ui`、`PLAN` 或 DOM；调用时读取最新状态，避免撤销、切换户型或载入项目后继续引用旧对象。

自动保存协调器以 UMD 提供 `FurnishAutosave.create()`，自身不访问 DOM 或浏览器存储。`app.js` 负责工作槽和版本更新，注入访问 `localStorage` 的函数，避免在初始化时触发受限存储访问；`project-storage.js` 负责 IndexedDB 事务排队及同步序列化快照。清空本机数据时先使工作和恢复点的保存回调失效，清空失败则重新保存两者并恢复提示。历史快照由历史／分享适配模块协调。

工作方案与缓存模块分别提供 `FurnishWork`、`FurnishWorkspaceCache`，Node 使用 `require()`。主应用注入实际编号生成器、颜色及材料，将接口绑定为原有 `freshWork`、`fixWork`、`sanitizeFurn`，供 UI 扩展继续复用；缓存加载保持 v2 优先，IndexedDB 的异步恢复仍由项目 UI 协调。恢复不是完整项目校验，导入流程仍先使用 `project-core.js` 校验再应用。

入口加载顺序为：原有数据与 core/io → 户型、语言、家具和风格预设 → 风格规则与浏览器适配 → 布局几何、家具图例、画布图层 → `app.js` → 创建 DOM 按钮及挂接行为的 UI 扩展 → 三维模块。不要给这些脚本添加 `async`，也不要将提前加载的适配文件改成独立 ESM 后继续依赖全局词法变量。

## 样式与成果导出

`styles/app.css` 提供主样式；随后加载 `styles/floorplan-editor.css` 和 `styles/project-workspace.css`，保留原有覆盖顺序。编辑器和工作台不再动态插入样式。

成果 HTML 的内嵌样式继续由导出代码生成，使用户下载的成果能够独立打开；它不依赖上述应用样式文件。

## 验证

### 空间规则与确认契约（2026-10-12）

画布与全案实体重叠共用 `FurnishGeometry.verticalOverlap(a,b)`。已知垂直范围不相交（含面接触）免除，未知高度保守保留。画布预先计算高度范围，避免逐对重复计算。柜门/抽屉开启区域现携带实际高度区间，上翻门另有竖向扫掠截面；共用 `FurnishCabinet.openingIntersects()`。详见 [三维开启检查](CABINET-OPENING-3D.md)。

`checkFingerprint()` 现生成 `{version:3, issue, context}`。上下文包括平面、垂直、镜像、柜体配置、房间计数状态、实际物理房间边界、项目/房间净高及完整梁数组（含已录入梁底／梁顶）；`review()` 每次只序列化一次共享上下文。旧六项数组和 v2 缺少本轮语义，保留但要求重新核对。采购/价格/颜色不进入上下文。新增检查输入或改变检查语义时同步维护契约及回归。

扩展经验见 [DEVELOPMENT-GUIDE.md](DEVELOPMENT-GUIDE.md)。

运行 `node scripts/check.cjs` 检查源码语法、普通脚本的共享作用域声明、入口资源路径、全部回归与内置户型。浏览器验收应覆盖主题与全部户型画布、应用风格及撤销、语言切换、家具复制及尺寸编辑、预算 CSV、PNG、编辑器与项目工作台、3D。拆分三维加载方式前还需补齐真实 `file://` 验收。

## 本次整理收尾与后续边界

目录归类、规则抽取、画布与属性界面、自动保存、工作迁移、历史／分享协调的主要整理已完成。规则模块可直接测试，普通脚本共享声明和加载顺序由检查脚本验证；实际浏览器流程覆盖了分享、恢复、撤销重做、下载、全部户型及三维切换。

主入口仍包含命令、家具库、户型选择及部分事件装配，浏览器适配仍共用全局词法状态；这是保留现有原生脚本和离线加载方式的现状。本次结构整理在此收尾，不按入口体积或文件数量继续拆分。后续按具体功能或缺陷调整模块；三维代码拆分另行评估，先补齐真实离线文件打开及实机触屏验收。

## 多选功能区合并（2026-10-11）

`FurnishDraft.mergeRegions(input, ids, definition)` 接受至少两个唯一区域 ID。区域须位于同一物理房间，通过具有正长度的共用边形成连通图；链状和 T 形均允许，点接触和不连通拒绝。函数克隆输入，精确分解所选区域的并集、恢复外轮廓及 rings 孔洞，并以覆盖差及面积校验保证原子性。跨旧直线分界时，将受影响物理空间中的未选区域物化保留，`settingSource` 帮助保留改名、用途和材料设置。

合并对话框勾选多个区域，独立选择名称、用途和材料来源，也可直接编辑输出字段。每次变化在草稿副本上调用同一合并计算；SVG 使用 `fill-rule="evenodd"` 显示孔洞。确认后只记录一次编辑器 checkpoint，取消不写入应用状态。

明确选择的材料存为区域定义的 `mat` + `materialExplicit: true`，build 将标记传播到区域模型。`remapRooms` 对仍存在的区域首先保留当前设置（包括后续属性面板修改）；对新区域采用明确材料，其次精确重叠来源，最后物理父房间材料。拆分明确材料区域也继承该标记。draft 和 rooms 均使用现有项目序列化，兼容不带标记的旧文件。

房梁高度使用户型核心 `beamVertical()` / `editBeam()`，单位、校验与旧数据兼容契约见 [BEAM-HEIGHTS.md](BEAM-HEIGHTS.md)。界面确认仍经 `mutate()`；3D 缓存包含梁数组。

2026-10-13：梁实体碰撞由 `spaceCheck()` 产生独立 `beam` 结果（家具 `id` + `beamId`）。与开启障碍共用刚性家具预计算包络与梁高度，已知范围使用 `verticalOverlap()`；未知高度为 pending。属性、柜体草稿、全案共享检查，全案定位同时标出梁与家具。详见 [梁实体检查](BEAM-HEIGHTS.md)。
2026-10-14：`drawing-core.js` 的 `netSpans()` 按点到首个实际房间多边形边界求截面，支持 rings 孔洞与斜边，拒绝边界点。`src/ui/room-measure.js` 只存临时选点与 SVG 预览，保存时经 `mutate()` 添加两条现有测量线，无新增持久字段。功能区按所在 physicalRooms 测量；测量文字的可读角度与屏幕旋转共用 `textAngle()`。
2026-10-14：`src/core/purchasing-core.js` 提供本地订单校验、商品／材料快照、到货和实付汇总；`src/ui/purchasing-tools.js` 通过 `mutate()` 编辑可选 `work.purchaseOrders`。项目导入和工作恢复共用校验，采购不参与空间确认或三维缓存。字段、分金额规则及历史关联边界见 [材料采购](MATERIAL-PURCHASING.md)。
2026-10-14：`src/io/image-export.js` 的 `preparePlanSVG()` 是 PNG、成果 SVG 和打印共用的清理／定字号／内容范围路径。PNG 使用当前可见图层，成果使用浅色完整图层；去除所有 `[data-edit-overlay]` 及临时定位图层。`drawing-core.rasterSize()` 限制栅格单边和总像素，不限制矢量 SVG。
2026-10-14：`drawing-core.furnitureLabels()` 在显示坐标下计算最多两行家具名称、字号、冲突筛选及内部位置；毫米模型坐标不变。`plan-renderer` 缓存派生结果，`refreshFurnitureLabels()` 只更新文字并在相同排版下跳过 DOM 更新，选择／缩放和 `preparePlanSVG()` 共用接口。完整名称留在根 title、属性和成果表格。


2026-10-15：模块地柜抽屉可选 `drawerStyle: dish-basket`。产品能力定义三层下限，厨房核心共用样式、层高及内外抽开合联动，生产柜体列派生两块外面板与三层篮架；外部分界和相邻吸附排除隐藏内抽分界。保存仍走编辑器草稿／mutate，完整 kitchen 进入原缓存与核对签名。见 [碗碟篮](KITCHEN-DESIGN.md#碗碟篮两块外面板与三层内部抽篮2026-10-15)。

2026-10-16：`floor-finish-core.js` 统一功能区地面层厚、目标／参考标高及原图直铺网格；`effectivePlan()` 在墙面完成面后派生地面，`floor-finish-model.js` 提供生产层厚实体与同基准 UV。属性通过原 mutate 编辑，空间核对只读取标高与区域几何，纯排版不清确认。新文件外层版本 3，含地面设置后使用独立 v3 缓存，旧项目无设置时保持。见 [地面数据契约](FLOOR-FINISHES.md)。

2026-10-16：区域地砖编辑复用 property-panel 的 mountFabEditor 与浮条停靠布局；floor-finishes 在属性栏／浮动栏使用同一表单及原 mutate，区域列表直接调用 floor-finish-core.setEnabled。可选 enabled:false 关闭但保留参数，派生时排除关闭区域及失效参考；无新保存通道。见 [浮动地面编辑](FLOOR-FINISHES.md#浮动编辑与区域列表2026-10-16)。

2026-10-16：起铺点通过 floor-finish-core.snapOrigin 比较区域完成面角点，UI 用真实屏幕矩阵换算 12 px 阈值。临时 gFloorOrigin 标记带 data-edit-overlay，随 applyView 重绘、取消或关闭清理，不进入状态或成果导出；点击仅改表单，应用仍走 mutate。

2026-10-16：区域列表可打开全屋统一起铺点浮动表单，与单区域共用 bindOriginPicker。floor-finish-core.setLayoutBasis 只批量写现有 layout.origin／可选 angle，保持其它设置及开关；旧区域预设以 enabled:false 保存，不建立全局字段或隐式关联。一次 mutate 完成批量应用，仍可逐区独立修改。见 [统一起铺点](FLOOR-FINISHES.md#全区域统一起铺点)。


2026-10-18：墙地自动对缝使用 wallTiling.surfaces[].followFloor 可选布尔字段，由 wall-tiling-core 派生有效布局，不改写地面编辑的状态与历史。墙砖派生缓存包含完整 floorFinishes 输入；2D立面／SVG／3D共用 elevation。新语义项目／工作区外层v7与huxing-design-v7缓存，旧记录缺字段保持手动，具体契约见 WALL-TILING.md。


2026-10-18：可选work.furnitureDatum由产品核心floorBase统一派生完成地面基准；新建为finished-floor、旧缺失保留survey。生产家具根组加一次偏移，世界实体／开启／梁吊顶／安装预留及切孔同步，原高度字段不累计。版本10与独立v10缓存保留旧项目／缓存读取。墙面枚举共用区域内编号，三维编号点击原单墙编辑，批量墙层厚复用wallFinishes；详情见FLOOR-FINISHES.md与WALL-TILING.md。
