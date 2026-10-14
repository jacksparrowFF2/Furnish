# 模块与加载约定

2026-10-14：`src/ui/workflow-tools.js` 在现有 UI 扩展后装配画布旁工具、保存入口、价格依据／材料规格、空间侧栏、临时风格预览和净距对话框；共用现有 `ui`、`mutate()`、项目规则与属性面板，没有新工作状态或保存通道。`src/core/wall-distance-core.js` 提供毫米净距与原子联动，`src/core/placement-suggestions.js` 只返回通过占地／开启及全案间隙检查的候选，不移动锁定、编组、厨房或关联设备。`src/io/dxf-export.js` 生成布局交接 DXF。材料规格及价格依据仍属于 `project-core.js`；详见 [材料采购](MATERIAL-PURCHASING.md)、[墙间净距](WALL-DISTANCE.md)、[DXF 导出](DXF-EXPORT.md)。

临时风格预览仅向生产 3D 家具构造器提供配色副本，源工作方案、2D 和预算保持原值；应用家具配色或完整风格分别经 `mutate()`。方案内容改变时预览失效，预览期间不提供交付截图，防止临时外观混入真实成果。新增脚本保持原有普通脚本加载，无 async 或网络依赖。

厨房模块规则在 `src/core/kitchen-core.js`，生产构造器在 `src/render/kitchen-model.js`，属性表单在 `src/ui/kitchen-editor.js`。产品能力由 `product-rules.js` 管理；厨房核心加载在产品规则之前，构造器只在调用时读取柜体生产模型。旧组合、新厨房、设备关联及独立吊柜的契约见 [厨房设计](KITCHEN-DESIGN.md)。

Furnish 使用浏览器原生脚本，无需构建。直接打开 `index.html` 的兼容性是拆分代码时的约束；三维模块与 Three.js 的 data-URL import map 继续保留在入口中。

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
