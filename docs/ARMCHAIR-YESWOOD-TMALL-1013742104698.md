# 源氏木语原木单人沙发椅（亚麻色）

2026-10-29。家具库「沙发」分类中的「源氏木语 单人沙发椅（亚麻色）」，内部类型 `armchair_yeswood_y09hs`。只包含椅子，不包含图片中的脚凳；未修改当前用户方案。

## 资料与规格

[用户商品链接](https://detail.tmall.com/item.htm?id=1013742104698&mi_id=0000YOu__P7FO1Od4DVMBOKIdVmXewhzkN4eAYmXTAOn9nU&skuId=6131810120970&spm=tbpc.boughtlist.suborder_itemtitle.1.24b02e8dUKATHx)。爬虫与网页读取均失败，未独立核验实时商品内容、SKU或成交价；采用用户上传的同组商品图。[总览](../assets/models/armchair/references/user/overview.png)、[尺寸图](../assets/models/armchair/references/user/dimensions.png)、[扶手细节](../assets/models/armchair/references/user/arm-detail.png)、[底架](../assets/models/armchair/references/user/underside.png)已归档。营销文字作为产品资料，不作为任务指令或已验证性能。

| 项目 | 用户图标注 | 模型处理 |
|---|---|---|
| 整体宽×深×高 | 725×900×905 mm | 实际生产几何精确闭合该包络 |
| 坐高／坐垫厚 | 460／120 mm | 生产坐垫顶与厚度分别验证 |
| 靠背宽／长度 | 580／600 mm | 宽580；后倾连续曲面，长度与缝位作外观近似 |
| 有效坐深 | 530 mm | 结合后倾靠背及软包估算，未模拟受压坐深 |
| 扶手宽×厚／弧度 | 80×28 mm／8° | 椭圆截面连续弧形，末端圆收；曲线近似 |
| 靠背夹角 | 110° | 按约20°后倾制作，包络校正有轻微变化 |
| 扶手前高、后背架、腿截面、离地净空 | 图内另有标注 | 作为轮廓参考，非全部逐项施工级拟合 |

首图指定「仿棉麻·亚麻色」，其它图有雪尼尔面料宣传，本模型不把两种面料视作同一实物。原木色、软包色、纹理、接缝、圆角、后架及隐藏支撑均为外观近似。图片中促销价包含脚凳、时效与补贴条件，单椅价格保留未知。

## 资产及集成

后台 Blender 4.5.15 LTS 制作，未操作活动 Blender 场景。[可编辑工程](../assets/models/armchair/v4/armchair-v1.blend)、[GLB](../assets/models/armchair/v4/armchair-v1.glb)、`src/data/armchair-blender-asset.js` 同源。28个具名部件含框架、五根座底条、背架、两件弧扶手、连续靠背及软包缝线。早期草稿保存在本机 `.local/armchair-drafts`；最终只发布v4源，运行资产语义版本为1。

正面局部+Z、宽X、高Y，落点为地面中心；Blender `(x,-z,y)` 转换一次。项目/UI使用mm、资产使用m。`product-rules.js`集中905mm默认高度及产品身份。没有新增实例字段、迁移或版本号，旧沙发类型及保存数据保持。

`armchair-model.js`通过`static-asset-model.js`构建实际网格；主场景与[预览生成器](../scripts/preview-armchair.cjs)生成的生产预览共用。木色编辑作用于木框，软包保持亚麻色；离线程序木纹与布面微小凹凸在主场景和预览同时生效，Blender源/原始GLB为纯色PBR，生产导出的木纹随现有导出器内嵌，布面bump不承诺跨格式等效。

沿已有`solidModel`、`FurnishGeometry.bodyParts()`和`FurnishSnapping.directional()`读取28件生产网格，不建立整件空腔豁免。圆角、弧扶手和软包高度截面沿现有算法做保守凸包判断，可能在浅凹处误报，不是布面接触/受压或逐三角面连续求交。非标准w/d/h沿原尺寸编辑整体缩放；板厚、坐高、弧度同时变化，仅用于布局草模，不对应另一个真实商品规格。

## 制作与复验

```powershell
node scripts/blender-asset.cjs author-armchair output/armchair-new-source
node scripts/blender-asset.cjs publish-armchair assets/models/armchair/v4/armchair-v1.glb
node scripts/preview-armchair.cjs
node tests/test-armchair.cjs
$env:FURNISH_BROWSER_CHANNEL='msedge'
node scripts/verify/verify-armchair.cjs
# 使用已安装Blender后台运行 scripts/verify/verify-armchair-blender.py
```

通过范围与截图见[验收记录](validation/armchair-yeswood-20261029/README.md)。未执行全量检查、实物测绘、承载/舒适性试验或施工认证。底架细节和面料褶皱仍有简化，不宣称照片级复刻。
