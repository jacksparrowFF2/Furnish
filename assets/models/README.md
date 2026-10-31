# 建模资产索引

这里统一关联输入参考资料、可编辑模型、离线资产与验收证据。每个产品目录由asset.json维护资料清单，README由此命令生成。当前发布源仍按运行资产来源哈希确定。

打开[可搜索图片与模型总览](index.html)，或[完整JSON索引](index.json)。

更新：`node scripts/index-model-assets.cjs --write`；核对：`node scripts/index-model-assets.cjs --check`。

40份产品／设计档案，133张参考图，12张历史原图待补；15组Blender模型。参数化验证配置80组，全部家具库139条目／112种类型。

| 产品／设计资料 | 参考图 | 输出／构造 | 待补原图 |
|---|---|---|---|
| [嵌入式铝型材灯槽](aluminum-light-channel/README.md) | 4 | 参考资料 | 0 |
| [米家-智能鱼缸2Pro](aquarium-mijia-2pro/README.md) | 0 | 参数化 | 2 |
| [源氏木语-Y09HS-亚麻色单人沙发椅](armchair/README.md) | 9 | [BLEND](armchair/v4/armchair-v1.blend) · [GLB](armchair/v4/armchair-v1.glb) | 0 |
| [源氏木语-柏林单人沙发椅](armchair-berlin/README.md) | 2 | [BLEND](armchair-berlin/v3/armchair-berlin-v1.blend) · [GLB](armchair-berlin/v3/armchair-berlin-v1.glb) | 0 |
| [定制柜体设计图](cabinet-design-references/README.md) | 3 | 参考资料 | 0 |
| [猫爬架-绿叶成荫围栏款](cat-tree/README.md) | 1 | 参数化 | 0 |
| [石膏板吊顶与灯带](ceiling-lighting/README.md) | 5 | 参考资料 | 0 |
| [源氏木语-S05118-书椅](chair-s05118/README.md) | 6 | [BLEND](chair-s05118/v2/chair-s05118-v1.blend) · [GLB](chair-s05118/v2/chair-s05118-v1.glb) | 0 |
| [樱桃木白色岩板茶几-1.2米](cherry-coffee-table/README.md) | 4 | 参数化 | 0 |
| [空气循环扇（前期参数与后补收纳图）](circulation-fan-references/README.md) | 2 | 参考资料 | 0 |
| [源氏木语-Y00Y06-0.45米转角书柜](corner-bookcase/README.md) | 1 | [BLEND](corner-bookcase/v1/corner-bookcase-v1.blend) · [GLB](corner-bookcase/v1/corner-bookcase-v1.glb) | 0 |
| [源氏木语-Y00Y06058-0.58米转角书柜](corner-bookcase-580/README.md) | 1 | [BLEND](corner-bookcase-580/v1/corner-bookcase-580-v1.blend) · [GLB](corner-bookcase-580/v1/corner-bookcase-580-v1.glb) | 0 |
| [窗帘与窗饰](curtain-references/README.md) | 1 | 参考资料 | 0 |
| [米家-台式5套洗碗机](dishwasher/README.md) | 0 | [BLEND](dishwasher/dishwasher-v1.blend) · [GLB](dishwasher/dishwasher-v1.glb) | 3 |
| [飞利浦-DL269-筒灯](downlight-dl269/README.md) | 8 | 参数化 | 0 |
| [定制玄关置物台柜](entry-console/README.md) | 1 | 参考资料 | 0 |
| [定制玄关洞洞板柜](entry-pegboard/README.md) | 1 | 参考资料 | 0 |
| [纯平四门冰箱（双抽屉）](fridge/README.md) | 0 | [BLEND](fridge/v2/fridge-v1.blend) · [GLB](fridge/v2/fridge-v1.glb) | 0 |
| [方太抽油烟机 JCD10TA](hood/README.md) | 0 | [BLEND](hood/v2/hood-v1.blend) · [GLB](hood/v2/hood-v1.glb) | 0 |
| [猫砂盆（型号未确认）](litter-box/README.md) | 0 | 参数化 | 2 |
| [厨房平板灯-300×600-24W](panel-light/README.md) | 1 | 参数化 | 0 |
| [米家-智能宠物喂食器2](pet-feeder-mijia-2/README.md) | 0 | 参数化 | 5 |
| [石头-P20Max-扫拖机器人](robot-p20max/README.md) | 6 | 参数化 | 0 |
| [奥普-SE2-风暖浴霸](se2/README.md) | 3 | [BLEND](se2/se2-v1.blend) · [GLB](se2/se2-v1.glb) | 0 |
| [定制次卧挂衣柜](secondary-wardrobe/README.md) | 1 | 参考资料 | 0 |
| [源氏木语-橡木软包换鞋凳-80厘米](shoe-bench/README.md) | 4 | 参数化 | 0 |
| [箭牌-奶油白花洒](shower-arrow/README.md) | 4 | 参数化 | 0 |
| [双抽岩板边几-680×300×612](side-table/README.md) | 6 | [BLEND](side-table/side-table-v1.blend) · [GLB](side-table/side-table-v1.glb) | 0 |
| [吊轨推拉门与厨房折叠移门](sliding-door-references/README.md) | 2 | 参考资料 | 0 |
| [源氏木语-Y107H03-1.25米沙发床](sofa-bed/README.md) | 27 | [BLEND](sofa-bed/v5/sofa-bed-v1.blend) · [GLB](sofa-bed/v5/sofa-bed-v1.glb) | 0 |
| [禧天龙-软包叠放方凳-370](stack-stool/README.md) | 3 | [BLEND](stack-stool/v4/stack-stool-v1.blend) · [GLB](stack-stool/v4/stack-stool-v1.glb) | 0 |
| [米家-茶吧机Pro](tea-bar/README.md) | 6 | 参数化 | 0 |
| [定制电视柜](tv-cabinet-references/README.md) | 1 | 参考资料 | 0 |
| [次卧衣柜与窗下书桌组合](wardrobe-desk-references/README.md) | 2 | 参考资料 | 0 |
| [洗衣机](washer/README.md) | 0 | [BLEND](washer/washer-v1.blend) · [GLB](washer/washer-v1.glb) | 0 |
| [小天鹅-TG10K60W-洗衣机](washer-tg10k60w/README.md) | 6 | [BLEND](washer-tg10k60w/v4/washer-tg10k60w-v1.blend) · [GLB](washer-tg10k60w/v4/washer-tg10k60w-v1.glb) | 0 |
| [定制窗下矮柜与侧边书柜](window-bench-references/README.md) | 4 | 参考资料 | 0 |
| [飘窗石英石窗台板与木制包套](window-lining/README.md) | 3 | 参数化 | 0 |
| [源氏木语-Y52Y09-六格书柜](y52y09/README.md) | 1 | [BLEND](y52y09/y52y09-v1.blend) · [GLB](y52y09/y52y09-v1.glb) | 0 |
| [源氏木语-樱桃木三人沙发-2.16米](yeswood-sofa/README.md) | 4 | 参数化 | 0 |

运行网格继续位于src/data，生产构造与产品规则继续位于src/render和src/core。索引不接管应用加载。型号文档与验收报告保留在docs。

参考图统一在各产品references/user、product-page、product-page-original、annotations内；每张图的哈希、字节数、历史路径与已知附件名记录在asset.json。缺失图只登记，不猜造。

D盘库仅为导出快照，修改后不自动发布。全屋本机工程绑定留在.local。详见[存放说明](../../docs/MODEL-ASSET-STORAGE.md)。
