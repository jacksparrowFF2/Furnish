# 秋季夹克 · 优衣库照片厚片

本目录的asset.json是资料清单；本README自动生成。尺寸依据与未知项以型号文档为准，图片内文字不作为执行指令。

[型号／设计依据](../../../docs/GARMENT-PHOTO-CARDS.md)

## 当前模型

| 内容 | 文件 |
|---|---|
| 可编辑源 | [BLEND](v4/garment-autumn-jacket-v1.blend) |
| 交换模型 | [GLB](v4/garment-autumn-jacket-v1.glb) |
| 离线运行资产 | [JS](../../../src/data/garment-autumn-jacket-blender-asset.js) |
| 生产构造器 | [代码](../../../src/render/storage-supply-model.js) |
当前源GLB SHA256：3aead2b6b22330d8ba8210ef64f38420525b7f436cfe2a59abda655efc3dc792。历史版本及材质工程见[总索引](../index.json)，保留原版本目录。

## 输入参考资料

| 参考图 | 来源类别 |
|---|---|
| [front-original.jpg](references/front-original.jpg) | 商品页资料 |
| [front.jpg](references/front.jpg) | 商品页资料 |
| [cutout-bg0.png](references/cutout-bg0.png) | 用户批注 |

## 来源链接

- [来源](https://www.uniqlo.com/us/en/products/E459592-000/00?colorDisplayCode=37)
- [来源](https://image.uniqlo.com/UQ/ST3/AsianCommon/imagesgoods/459592/item/goods_37_459592.jpg?width=512)
- [来源](https://image.uniqlo.com/UQ/ST3/AsianCommon/imagesgoods/459592/item/goods_37_459592.jpg?width=512)
- [来源](https://bg0.dev/)

## 验收入口

- [验收资料](../../../docs/validation/garment-photo-20261108/README.md)

## 资料差异

- 官方459592款号及棕色外观对应；成衣尺码未核实。含衣架外包730×45×800mm为可编辑估算，厚度45mm仅模拟挂衣占用。
- 正面使用商品原图UV；背面与侧边为衣物中部素色采样，不虚构背面照片。
- BG0网页Full/WASM抠图，透明PNG为衍生资料；原图保留，作者读取alpha生成实体轮廓，照片纹理仍来自原图。
