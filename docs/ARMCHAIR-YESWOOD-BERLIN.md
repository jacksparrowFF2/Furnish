# 源氏木语柏林休闲沙发椅

2026-10-29。第二款独立家具，类型`armchair_yeswood_berlin`，家具库「沙发」分类显示「源氏木语 柏林单人沙发椅（含腰枕）」。第一款`armchair_yeswood_y09hs`继续保留，没有替换用户方案里的任何家具。

## 图片依据及规格

资料仅来自用户上传的[商品尺寸图](../assets/models/armchair-berlin/references/dimensions.png)和[外观图](../assets/models/armchair-berlin/references/appearance.png)。本次未提供商品链接或明确型号编号，不猜造SKU、厂家安装要求或价格。图中的营销文字是参考内容，不作为任务指令或已验证性能。

| 项目 | 图上标注 | 实现范围 |
|---|---|---|
| 整体宽×深×高 | 710×850×845 mm | 生产网格实际包络验证 |
| 坐高 | 460 mm | 生产坐垫顶验证 |
| 坐垫宽／总深／厚 | 620／710／150 mm | 生产坐垫外包独立拟合验证 |
| 靠垫宽／长／厚 | 530／580／120 mm | 以该尺寸起形，加软包鼓度并拟合总高，实际软包曲面为近似 |
| 扶手宽／高 | 50／580 mm | 细直圆边扶手，截面厚度和末端为估算 |
| 腰枕 | 未标 | 约405×190×80mm起形，鼓度／倾斜／位置为照片估算 |

木框、圆腿锥度、后倾角、背部横撑/竖撑、底部承托条、布边与隐藏连接均为外观近似。未模拟真实织物褶皱、受压变形、承重、榫卯及五金。木材色、米色面料与程序纹理不作为实物材质鉴定。

## Blender与应用

独立后台Blender4.5.15 LTS制作，[可编辑源](../assets/models/armchair-berlin/v3/armchair-berlin-v1.blend)与[自包含GLB](../assets/models/armchair-berlin/v3/armchair-berlin-v1.glb)保留28件具名闭合网格，发布为`src/data/armchair-berlin-blender-asset.js`。前两次有效源保留在本机`.local/armchair-berlin-drafts`。

两个产品由`product-rules.js`定义独立`armchairProfile`及高度；`armchair-model.js`按能力选择各自资产，仍共用静态资产构造与程序木纹/布面凹凸。主场景、[生产预览](../output/armchair-berlin/preview.html)和`bodyParts()`/`directional()`读取同一份网格；源GLB为纯色PBR，程序布面bump不承诺跨格式等效。木色编辑作用于木框，软包保持米色。

正面+Z，X宽/Y高，地面中心为原点；Blender转换为`(x,-z,y)`，mm在边界转m。原尺寸编辑表示整体缩放的布局草模，软包、板厚与扶手同时缩放，不表示另一真实SKU规格。没有新增持久字段、格式版本或保存通道；沿原mutate/撤销/自动保存/复制/项目与命名方案往返。

实体来自28件生产网格，不把座底与背架包成封闭整块，也不按型号豁免穿板。浅鼓面/曲面高度截面仍采用既有保守算法，不是软包受压或逐三角面求交，可能在凹处误报。

## 维护和验证

```powershell
node scripts/blender-asset.cjs author-armchair-berlin output/berlin-new-source
node scripts/blender-asset.cjs publish-armchair-berlin assets/models/armchair-berlin/v3/armchair-berlin-v1.glb
node scripts/preview-armchair.cjs --berlin
node tests/test-armchair.cjs --berlin
$env:FURNISH_BROWSER_CHANNEL='msedge'
node scripts/verify/verify-armchair.cjs --berlin
# Blender后台运行 scripts/verify/verify-armchair-blender.py -- --berlin
```

第一款不带`--berlin`继续验证。结果与截图见[增量验收](validation/armchair-berlin-20261029/README.md)。未执行全量检查、实物测绘、承重及舒适性试验。
