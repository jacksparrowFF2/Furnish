# 柜箱与内部隔间分层验收

本轮继续解决真实图纸暴露的“一格不等于一箱”问题。独立柜可逐个边界选择同箱共享隔板或双侧板分箱，现有模块继续代表可编辑的内部隔间；壳体与顶封板按物理柜箱生成。合同见 [规范第11节](../../CABINET-DESIGN-STANDARD.md#11-柜箱与箱内隔间分层2026-10-28)。

当前1637.5×630×2350衣柜调整为两个818.75宽柜箱，每箱两隔间两门。四段净宽各增加9，总共增加36；四扇门正面边界保持。四块柜箱外侧板加两块内隔板，取代原四箱的八块侧板；顶、底、50mm封板各两段。门顶仍为2340，层板高度、门抽状态、姿态及其他布置保留。完整工作区比较与实际板件数量见 [当前数据证据](current.json)，备份留在本机 `D:\1601装修\.codex-tools\box-groups-20261028\workspace-before.furnish.json`。

已通过：

- 30个Node文件：`cabinet-box-groups`、`cabinet`、`cabinet-model`、`cabinet-independent`、`cabinet-top-closure`、`cabinet-overlay`、`cabinet-opening-3d`、`cabinet-opening-volume-model`、`cabinet-shelf-clearances`、`cabinet-module-widths`、`cabinet-edit-operations`、`cabinet-design-upgrade`、`cabinet-custom-fronts`、`cabinet-dimensions`、`cabinet-workspace`、`cabinet-palette`、`cabinet-drawer-joints`、`cabinet-catalog`、`cabinet-advanced`、`project`、`project-validation`、`project-recovery`、`work-state`、`workspace-cache`、`repository-workspace`、`repository-storage`、`spatial-review-cache`、`replacement`、`generator-part-identities`、`furniture-production-solids`。
- 新几何24组：12／18／30板厚、四隔间的全部八种连接组合、一到四个物理柜箱；实际侧板、内部隔板、顶底和封板，生产网格唯一身份、全局门抽／层板编号、净宽与正面边界、SVG和实体记录、旋转／镜像的原开启区保持、当前及命名方案v28往返、重复恢复不漂移、替换和空间确认。
- 模块增删、复制、排序、同数量均分、箱内自动配门和相邻门格合并；锁定、非法数组及旧缺失。新隔间默认独立、移位后的不连续同箱隔间会分箱；预览明示箱数变化。已分组时改总隔间数通过模块管理，拒绝静默重建分组。
- 14个修改／新增JS语法检查。
- HTTP和断网file://：真实1601快照、三个边界设置、会话撤销重做、取消、保存、应用撤销重做、v28刷新、第三隔间层板身份、模块插入的箱数预告与撤销、实际两壳体／两内隔板／四门／两封板、390px和无浏览器异常。[专项证据](browser.json)
- 原独立柜箱和顶部封板浏览器专项也通过HTTP／离线。两项记录在本机 `verification-9UqLEA`；分组最终专项和截图来自 `verification-mLP3E1`。首次专项定位层板输入时同时匹配了尺寸标签，改为明确input后通过。
- 真实工作区完整parse／text往返两次无漂移，历史命名方案和其他数据相对修改前一致；8765服务已更新并只读确认v28分组，测试没有向真实服务写入验收数据。

已目视 [柜箱分组与内部结构](groups.png) 和 [窄屏](mobile.png)。左侧显示柜箱归属和隔间号，右侧明确两处共享隔板、中间双侧板及50／10顶部设置。

未执行全量check、Blender、整屋导出或真实五金加工验收。侧墙收口、门板跨格、铰链孔位、局部无底／可拆踢脚、灯带及管线检修仍有设计缺口，本轮没有根据旧房参考图推定当前房屋的相应施工参数。背板等仍沿现有生产构造器的分段表达，布局板件不等于厂家拆单。其他用户未提交的布置修改保留，不混入本次数据提交。
