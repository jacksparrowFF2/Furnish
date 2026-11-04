# 宜家 VIHALS 维哈斯白色折叠椅

2026-11-04。独立类型 `chair_ikea_vihals`，家具库搜索“VIHALS／维哈斯”，椅子分类及餐厅／书房用途可见。只提供展开使用状态；未向用户正式方案添加家具。

## 来源与尺寸

用户京东商品 SKU 10167132712534 经商品接口核对为 IKEA宜家家居官方旗舰店“VIHALS维哈斯新款折叠椅 白色”。[宜家中国单品页](https://www.ikea.cn/cn/zh/p/vihals-wei-ha-si-zhe-die-yi-bai-se-90592738/)对应货号905.927.38；[新加坡同货号页](https://www.ikea.com/sg/en/p/vihals-folding-chair-white-90592738/)公开3D接口返回[官方模型](https://web-api.ikea.com/sg/en/rotera/static/models/90592738-mini.glb)。接口元数据及未改动GLB归档于[参考目录](../assets/models/chair-vihals/references/)。内部网格名称含30569104，是同色国际地区货号，下载请求与元数据的productId均为90592738；未混用其它颜色或产品。

| 参数 | 依据／处理 |
|---|---|
| 展开宽×深×高430×470×800 mm | 宜家单品页及3D元数据标注；布局模型闭合到此包络 |
| 座宽390、座深410、座高450 mm | 宜家单品页标注；保留官方座面几何比例，不另重建座面 |
| 原官方GLB外包约443.048×471.456×796.932 mm | Blender读取生产顶点；宽度与产品标注不一致，原件保留，适配件中心对齐、落地及三轴拟合至标称外包 |
| 折叠高880、深90 mm | 官方尺寸插图；没有官方折叠姿态或连杆轨迹，未实现折叠状态 |
| 材质 | 官方说明：粉末涂层钢架与PP座／背／脚；材质外观沿官方两张贴图 |
| 价格 | 当日商品接口参考99.99元，易变，未写默认采购价 |

尺寸图上另标靠背外宽440 mm，与单品页总宽430 mm存在标注口径差异。使用430名义外包是布局约定，不声称所有实体部位均满足厂家工程图；座部原网格也随整体拟合，不能把它当作独立精确尺寸检查通过。隐藏连接、承重、真实机械行程及实物制造公差均不由此模型验证。

## 制作与生产接入

优先复用官方资产，未继续进行照片手工重建。[IKEA Browser扩展](https://extensions.blender.org/add-ons/ikea-browser/)可以在Blender中直接导入官网模型；本次只读其公开接口方式，不安装或修改用户扩展。来源内容归原权利人，当前文件保留官方出处。

Scoop Blender 5.2.3 LTS后台导入官方Draco／WebP资产。0.01 mm内重合点合并后按物理连通部分分出15件，UV仍按面角保留，源哈希固定后映射具名稳定身份；不根据运行时遍历顺序命名。原始官方文件、[可编辑BLEND](../assets/models/chair-vihals/v1/chair-vihals-v1.blend)、[适配GLB](../assets/models/chair-vihals/v1/chair-vihals-v1.glb)及[离线资产](../src/data/chair-vihals-blender-asset.js)分别保留。正式源工程的官方贴图1024²，离线发布限定512²并内嵌RGBA，供生产、file及离线导出使用，不依赖远程下载。贴图负责固定白色外观，未实现重配色或程序微表面。

`product-rules`集中默认高度、落地包络与模型身份；`folding-chair-model`调用共享static-asset生产构造，再恢复UV及颜色／粗糙度／金属度／AO贴图。Furnish X宽、Y高、正面+Z，地面中心原点；Blender对应(x,-z,y)。`bodyParts()`、`directional()`及碰撞读取同源官方网格。没有椅型空腔豁免；U形框架等非凸件仍受已有截面凸包保守算法影响，不宣称逐三角面精确碰撞或内部净空。

无新持久字段、项目格式或独立保存机制。宽深高编辑沿整体缩放，为非标布局草模；复制／替换、撤销、自动保存及命名方案往返沿既有链路。旧类型、用户方案及默认尺寸不批量修改。

## 验证

```powershell
node scripts/blender-asset.cjs author-chair-vihals <新目录>
node scripts/blender-asset.cjs publish-chair-vihals assets/models/chair-vihals/v1/chair-vihals-v1.glb
node tests/test-chair-vihals.cjs
$env:FURNISH_BROWSER_CHANNEL='msedge'
node scripts/verify/verify-model-pipeline.cjs chair-vihals gpu
```

本型号作者预检／负例、独立发布、空间与状态、HTTP／断网file、生产GLB逐部件回读、实际OptiX三视角及下载工程重开通过；额外检查对象实际material_slots的贴图和UV保留。桌面快捷方式同一EXE在独立方案副本、缓存及端口中验收目录、撤销重做、保存刷新及三维，正式方案文件哈希不变。产品规则和模型资产索引另作增量检查。未运行全量检查、其它型号GPU复验或折叠机构验证；[证据与目视结论](validation/chair-vihals-20261104/README.md)。
