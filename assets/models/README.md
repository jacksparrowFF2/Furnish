# 建模资产索引

此目录保存正式作者源。下表由生产规则、验证清单和离线资产来源哈希生成；不能只按vN目录判断当前版本。所有链接相对项目，可随Git一起使用。

更新：`node scripts/index-model-assets.cjs --write`；核对：`node scripts/index-model-assets.cjs --check`。

15组Blender模型；验证清单另有78组参数化配置；家具库137条目／110种类型。

| 产品 | 当前源工程 | 当前GLB | 型号文档 |
|---|---|---|---|
| 源氏木语 S05118 书椅（原木／奶茶色） | [BLEND](chair-s05118/v2/chair-s05118-v1.blend) | [GLB](chair-s05118/v2/chair-s05118-v1.glb) | [说明](../../docs/CHAIR-YESWOOD-S05118.md) |
| 源氏木语 Y107H03 沙发床 1.25米（梨白） | [BLEND](sofa-bed/v5/sofa-bed-v1.blend) | [GLB](sofa-bed/v5/sofa-bed-v1.glb) | [说明](../../docs/SOFA-BED-YESWOOD-Y107H03.md) |
| 奥普 SE2 风暖浴霸 | [BLEND](se2/se2-v1.blend) | [GLB](se2/se2-v1.glb) | [说明](../../docs/BATH-HEATER-AOPU-SE2.md) |
| 源氏木语 Y52Y09 · 750高六格书柜 | [BLEND](y52y09/y52y09-v1.blend) | [GLB](y52y09/y52y09-v1.glb) | [说明](../../docs/BOOKCASE-YESWOOD-Y52Y09.md) |
| 纯平四门冰箱（双抽屉） | [BLEND](fridge/v2/fridge-v1.blend) | [GLB](fridge/v2/fridge-v1.glb) | [说明](../../docs/FRIDGE-BLENDER-MOTION.md) |
| 米家台面洗碗机 · 5套 | [BLEND](dishwasher/dishwasher-v1.blend) | [GLB](dishwasher/dishwasher-v1.glb) | [说明](../../docs/DISHWASHER-BLENDER-FOLD.md) |
| 方太抽油烟机 JCD10TA | [BLEND](hood/v2/hood-v1.blend) | [GLB](hood/v2/hood-v1.glb) | [说明](../../docs/HOOD-BLENDER-MOTION.md) |
| 洗衣机 | [BLEND](washer/washer-v1.blend) | [GLB](washer/washer-v1.glb) | [说明](../../docs/WASHER-BLENDER-MOTION.md) |
| 小天鹅洗衣机 TG10K60W · 10kg | [BLEND](washer-tg10k60w/v4/washer-tg10k60w-v1.blend) | [GLB](washer-tg10k60w/v4/washer-tg10k60w-v1.glb) | [说明](../../docs/WASHER-LITTLESWAN-TG10K60W.md) |
| 双抽岩板边几 · 68cm | [BLEND](side-table/side-table-v1.blend) | [GLB](side-table/side-table-v1.glb) | [说明](../../docs/SIDE-TABLE-TMALL-635382906309.md) |
| 源氏木语 单人沙发椅（亚麻色） | [BLEND](armchair/v4/armchair-v1.blend) | [GLB](armchair/v4/armchair-v1.glb) | [说明](../../docs/ARMCHAIR-YESWOOD-TMALL-1013742104698.md) |
| 源氏木语 柏林单人沙发椅（含腰枕） | [BLEND](armchair-berlin/v3/armchair-berlin-v1.blend) | [GLB](armchair-berlin/v3/armchair-berlin-v1.glb) | [说明](../../docs/ARMCHAIR-YESWOOD-BERLIN.md) |
| 禧天龙 软包叠放方凳 · 37cm | [BLEND](stack-stool/v4/stack-stool-v1.blend) | [GLB](stack-stool/v4/stack-stool-v1.glb) | [说明](../../docs/STACK-STOOL-CITYLONG-370.md) |
| 源氏木语 Y00Y06045 · 五层转角书柜 | [BLEND](corner-bookcase/v1/corner-bookcase-v1.blend) | [GLB](corner-bookcase/v1/corner-bookcase-v1.glb) | [说明](../../docs/CORNER-BOOKCASE-YESWOOD-Y00Y06.md) |
| 源氏木语 Y00Y06058 · 0.58m · 五层转角书柜 | [BLEND](corner-bookcase-580/v1/corner-bookcase-580-v1.blend) | [GLB](corner-bookcase-580/v1/corner-bookcase-580-v1.glb) | [说明](../../docs/CORNER-BOOKCASE-YESWOOD-Y00Y06058.md) |

[完整机器可读索引](index.json)包含当前文件、源哈希、其他保留版本、材质精修工程、生产构造器、作者脚本、参数化验证配置与全部家具库条目。

本索引仅管理资产元信息，不接管浏览器加载。旧版本保留，不自动清理；参数化模型不伪装成独立作者BLEND。

本机D盘整理库是可选导出副本，全屋工程绑定继续由`.local/blender-project.json`维护；本机绝对路径不写入此索引。详见[存放与更新说明](../../docs/MODEL-ASSET-STORAGE.md)。
