# 源氏木语 Y00Y06045 五层转角书柜

家具库搜索「转角书柜」或「Y00Y06045」，type `bookshelf_yeswood_y00y06`。本次新增独立模型，不改既有书柜或当前用户方案。

## 资料与尺寸

[京东商品 100093046007](https://item.jd.com/100093046007.html)实际读取名称：源氏木语实木书架现代简约落地储物柜墙角置物柜客厅转角书柜原木色0.45米；店铺源氏木语京东自营旗舰店；货号 Y00Y06045、开放式、实木。价格是动态促销信息，目录不写入固定参考价。

尺寸来自用户提供的[标注图](../assets/models/corner-bookcase/references/user/dimensions-reference.png)，而非透视比例测量：总宽450、总深450、总高1900 mm；端挡宽250、内深230、上／下格净高350、底座30 mm。图中430、410以及底部180／200 mm为局部尺寸，因标注基准未完全明确，不作为加工链独立约束。

采用六块L形水平板形成五层，前方200×200 mm缺角，端挡从下到上左／右／左／右／左交替，两面背板。以底座30、五格各350及六块水平板闭合1900总高，推得20 mm板厚；这是模型假设，非厂家板厚认证。背板也暂取20、外缘倒圆4 mm、暖橡木色和木纹均为外观近似。源GLB为可移植基础PBR，主场景沿正式woodM程序纹理，预览用本地程序纹理。图内书籍、盆栽、电器等陈设不属于柜体，未建模。

局部X宽、Y高、Z深，地面0，背角为-X/-Z，两个开放方向为+X/+Z。默认图中左侧为局部+Z端挡，镜像沿现有flip。无门、抽屉或运动；未知承重、防倾倒、五金与墙面固定要求不推定。

## 生产与编辑

Blender 5.2.3 LTS后台建模，保留[可编辑源工程](../assets/models/corner-bookcase/v1/corner-bookcase-v1.blend)、[源GLB](../assets/models/corner-bookcase/v1/corner-bookcase-v1.glb)及 `src/data/corner-bookcase-blender-asset.js`。14个具名网格：6层板、2背板、5端挡、1底座。独立发布器校验稳定身份、逐件尺寸／中心、总边界和L形缺口，失败保留上一资产。

`corner-bookcase-core`派生各件尺寸与位置，生产适配器逐板拟合Blender网格。改外包宽深高时保留20 mm板厚、30 mm底座和五层，层净高随总高均分，臂宽按250/450比例变化。非标准尺寸表示布局草模；最小150×150×300 mm仅防止退化，不代表可制造规格。不提供通用柜体结构编辑器、层数或板厚编辑。

沿已有h/w/d、flip、rot和mutate保存，不增加持久字段或格式版本。2D轮廓、选择与空间占地共用L形轮廓；正式3D与独立预览共用生产构造器。实际板件由FurnitureSolids → CabinetMotion.solidParts → Geometry.bodyParts / Snapping.directional与cabinetInterior接入；每个L板用两个保守矩形片表达圆边包络，共21个空间片，不填实前缺角或柜内空格。其余板件读取生产三角网格，圆边接触仍有数值容差，不声称全模型逐三角面精确碰撞。

## 验证

- 9个相关Node入口通过：corner-bookcase、product-rules、catalog-browsing、catalog-navigation、catalog-links、enclosed-boundary-distances、cabinet-interior-distances、bookcase-y52y09、blender-bookcase-asset。
- 新模型覆盖实际尺寸、14件身份、21空间片、五格350净高、厚度保持、L缺角／开放格／穿背板／穿层板、端挡交替、六向净距、外部100间距、实际吸附、接触与0.1mm穿入、完整包含、旋转37/90度及镜像、高度分离／未知、当前及命名项目往返、三次恢复无漂移。
- HTTP及断网file真实Chrome：家具库点击新增、改尺寸、撤销重做、刷新恢复、正式3D及生产GLB导出、14个稳定部件、390px预览；无页面异常或外网资源依赖。正面／斜视／侧面／背侧及窄屏已目视。
- 真实Blender回读源及HTTP/file生产GLB，闭合有向网格、正体积、非标尺寸下20mm层板、总高2100、缺件拒绝、填实缺角拒绝并保留旧文件、源blend重开通过。

[验收记录](validation/corner-bookcase-y00y06-20261031/README.md)。未运行全量check.cjs、实机触屏、厂家加工／承重或安装验证；不包含真实木纹扫描、五金孔位与书籍陈设。

复验：`node tests/test-corner-bookcase.cjs`；`node scripts/verify/verify-corner-bookcase.cjs`（本机Chrome可设FURNISH_BROWSER_CHANNEL=chrome）；`node scripts/verify/verify-corner-bookcase-blender.cjs`。重新建模使用新目录：`node scripts/blender-asset.cjs author-corner-bookcase <new-directory>`，再用publish-corner-bookcase独立发布。


2026-10-31补充：[0.58米Y00Y06058](CORNER-BOOKCASE-YESWOOD-Y00Y06058.md)已作为独立类型／资产加入，共用板件核心；本款原资产未改写。两款均已增量通过重建发布、双入口生产回读及GPU三机位整链路。
