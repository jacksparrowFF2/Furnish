# 源氏木语 Y00Y06058 · 0.58米转角书柜

家具库搜索「Y00Y06058」「0.58m」或「转角书柜」。独立type `bookshelf_yeswood_y00y06058`；[0.45米款](CORNER-BOOKCASE-YESWOOD-Y00Y06.md)仍保留原类型、默认尺寸及资产，不自动替换已有实例。

## 资料与模型范围

在用户给出的[0.45米商品页面](https://item.jd.com/100093046007.html)选择「(原木色)0.58米转角书柜」后，实际SKU为[100093046001](https://item.jd.com/100093046001.html)，货号Y00Y06058，源氏木语京东自营旗舰店。对应[规格图](validation/corner-bookcase-y00y06058-20261031/dimensions-reference.avif)明确标注两边58 cm、总高190 cm，故采用 **580×580×1900 mm**。页面参数表「柜体宽度45 cm」与所选SKU规格图冲突，记录此差异并采用型号对应图，不沿错误参数表制作450mm。

图片确认五层、六块L形水平板、左右交替端挡及两面背板。未取得0.58米款的内部逐项尺寸图，板厚20、底座30、背板20、圆边4 mm及端挡／L形臂宽比例250/450均为外观布局估算；不将0.45款内部标注推广为0.58款厂家尺寸。按该估算，每格净高350，端挡臂宽约322.2、模型内深约302.2、缺角约257.8×257.8 mm。内深、承重、安装、防倾倒和五金均待实物或厂家核对。目录不固定写入动态促销价。

局部X宽、Y高、Z深；底部地面0，背角-X/-Z，开放方向+X/+Z；原旋转／镜像规则共用。只制作原木色柜体，不附图中的书、盆栽及电器；胡桃色SKU未另建，沿现有配色仍可编辑近似颜色。

## 实现与兼容

独立[Blender源工程](../assets/models/corner-bookcase-580/v1/corner-bookcase-580-v1.blend)与[GLB](../assets/models/corner-bookcase-580/v1/corner-bookcase-580-v1.glb)，来源SHA256留在[资料记录](validation/corner-bookcase-y00y06058-20261031/source.json)。正式离线资产为 `src/data/corner-bookcase-580-blender-asset.js`，ID `corner-bookcase-y00y06058@1`；14具名网格沿 `corner-bookcase-580-v1:` 身份接入。

复用corner-bookcase-core／model，按产品规则选各自标称尺寸、独立源资产及逐板拟合。改外包宽深高保留已定义20mm板厚／30mm底座和五层；宽深变更时臂宽按本模型比例变化，非标规格是布局草模。柜内空间共21片，L板以两片保守矩形包络表达，保留缺角；其余板件读取实际生产网格。沿CabinetMotion.solidParts／Geometry.bodyParts／Snapping.directional和cabinetInterior，不新增型号碰撞豁免。

不新增持久字段、项目版本、撤销或保存通道。原450款资产文件未更改；type参与原实体缓存及核对输入，价格／配色保持原非空间语义。新增一个经典本地资产脚本，直接打开与服务均已实际验证。

## 验证与复验

本轮仅选择 `corner-bookcase,corner-bookcase-580 gpu`，两款整链路均通过：作者预检、错误工程预检、独立发布、各自空间／状态专项、HTTP与断网file生产导出、Blender逐部件回读、实际GPU三机位渲染与下载blend重开。完整覆盖清单现在91项（13组Blender资产），本次没有重跑其余89项，不把清单登记称为全批次通过。

新增580专项覆盖生产580×580×1900包络、14网格／21空间片、板厚保持、开放格／前缺角／穿背板与层板、交替侧挡、六向净距、实际吸附、100mm外距、接触及0.1mm穿入、包含、旋转镜像、未知高度、当前／命名项目往返与重复恢复。另通过原450专项、产品规则、目录、共有柜内空间、覆盖清单与包络边距相关增量检查。

Chrome实际点击新增580款、改尺寸／撤销重做／刷新、生产GLB、390px预览与断网file通过；缺件和同外包填实缺角的GLB拒绝发布且保留原文件。正面、斜视、背面及窄屏已目视对照：形体相符，木纹与隐藏结构仍是近似。

[验收与三机位](validation/corner-bookcase-y00y06058-20261031/README.md)。未运行全量check.cjs、其它89配置、实机触屏、实木纹理扫描或承重／加工／安装验证。

复验：`node tests/test-corner-bookcase-580.cjs`；`node scripts/verify/verify-model-pipeline.cjs corner-bookcase,corner-bookcase-580 gpu`。快速预览／专项设置 `FURNISH_CORNER_PROFILE=580` 后运行 `node scripts/preview-corner-bookcase.cjs` 或 `node scripts/verify/verify-corner-bookcase.cjs`、`node scripts/verify/verify-corner-bookcase-blender.cjs`。新建源工程使用 `author-corner-bookcase-580 <new-directory>`，发布使用`publish-corner-bookcase-580 <model.glb>`，不得覆盖上一有效源。
