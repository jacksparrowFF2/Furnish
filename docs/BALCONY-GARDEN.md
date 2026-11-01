# 阳台猫砂与花架垂直分层

2026-11-01新增独立参数化阶梯款与副本“阳台 · 两层阶梯花架”，原平板款／原方案保留。1160×550×1300；当前下层顶800／上层顶1300，上层深360，下层深550。五项独立参数和实际摆花位置、资料与施工边界见[阶梯款记录](validation/stepped-rack-20261101/README.md)。调台面高度后花盆离地需要同步调整；没有自动承托绑定。

2026-10-31。新增定制开放架 `balcony_plant_rack` 与君子兰 `plant_clivia`、金边吊兰 `plant_spider`、豆瓣绿 `plant_peperomia`。均为通用参数化布局模型，无厂家型号、价格或承重结论；不是对某成品家具的 Blender 复刻。旧 `plant` 和旧实例保持原生产模型。

## 当前右端方案与尺寸链（2026-11-01）

“阳台 · 猫砂花架垂直分层”保留用户最新洗衣机、包管缺口、墙垛柜及其它布置。按用户红框改在阳台右端侧窗内纵向摆放，最多两层花板，不采用三层架。

- 架体1160宽×550深×1600高，中心9785／1480、旋转90°，正面朝阳台中部。世界占地X9510–10060、Y900–2060。架体含六根30方柱、两块20层板及四根横撑；真实12件结构参加实体检查。材质、连接件、承重、防倾倒均为待选，未将参考照片认作具体商品规格。
- 花板顶离完成地面800／1500；下部无底板、无地面横档。板底780，横撑底750。中柱将底部沿长向分为两个约535净宽的开放位置。基站与猫砂盆均落地，不能把外包空框推定为全净空。
- 基站中心9725／1220，朝左驶出；正面比架前沿伸出10，避免出站口退进架内，前方1000设置保留。猫砂盆中心9771／1775，入口朝左，抽出路径避开中柱与基站。底部实际水箱提取及猫砂上盖拆卸待实机。
- 下层：吊兰冠幅450、小盆豆瓣绿260、小盆吊兰260；上层：君子兰冠幅600、小盆豆瓣绿260、小盆吊兰260。小盆是明确的幼株／紧凑布局假设，不能当作现有成熟植株的实测值。君子兰650总高，盆底1500，最高2150（均为家具完成地面基准，场景另按既有地面标高换算）。用户确认另做隔离，开放架未实现防猫隔离。
- 花盆与冠幅独立：君子兰盆上口径260、吊兰180、豆瓣绿160mm；取自用户常见盆径范围的规划选值，并非其现有花盆的实测。土面、盆壁、底碟均独立。全株宽深调整保持盆口圆形，极小占位才按宽深限制盆径；盆高随整株高度上限收缩，不对应具体成品。
- 机器人352宽连续扫掠：9290／1220→8750／1220→8750／2200→8780／3000，无家具实体相交。猫砂盆向左抽至8750／1775的510×440×400扫掠也无相交。这些是布局几何核对，未执行机器人实机导航和回充。
- 浇水先取下花盆至水槽，沥水后放回；底碟不证明已解决漏水。架体集中到右端后，洗衣柜正前方保持开阔；现场窗扇、窗把手及施工误差尚未核验。

## 资料

- 用户[花架参考](../assets/models/balcony-garden/references/user/rack-reference.png)：金属立柱、木层板、底部开放、上方摆花；按定制外观近似，未复刻其具体五金或承重结构。
- 用户[花盆尺寸参考](../assets/models/balcony-garden/references/user/pot-sizes.png)：5–8、10–15、15–20、25–30、35–50cm尺寸选项，本案暂按盆上口径理解；具体商品的口沿、底径和盆高仍需确认，未当成各物种的固定盆径要求。

- 用户君子兰[原图](../assets/models/balcony-garden/references/user/clivia.png)：深绿宽带状叶左右扇形、中心直立花梗、橙色伞形花序、米白敞口盆和独立底碟。照片无尺寸，背面、叶数和花数仅作近似。
- [小同宝酱：终于找到适合阳台养猫和绿植的架子了](https://www.xiaohongshu.com/search_result/69fb23640000000022028729?xsec_token=ABThFK9Oz5IGvzDXtNwCNC_w4uWwmi3nSJJQINOIqWd7E=&xsec_source=)：已读正文，植物架、猫砂盆与增高架组合。未取得笔记图片，不声称复刻图中产品或核验其尺寸。
- [咕噜噜MKK：一面墙装下植物和猫砂柜](https://www.xiaohongshu.com/search_result/6a9fe3ef000000002b026285?xsec_token=ABxyS3_TL9Gha0D_OFfg-p2rfKG0qRvBouczuHiQSk0Ok=&xsec_source=)：已读正文，上植物、中收纳、下猫砂；13cm增高及5cm通风为笔记案例参数，本案未照搬。
- ASPCA：[吊兰](https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/spider-plant)、[豆瓣绿 Peperomia obtusifolia](https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/blunt-leaf-peperomia)列为对猫无毒；[君子兰](https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/clivia-lily)列为有毒。植物名须对应物种；高处摆放不替代用户承诺的隔离措施。

## 生产与兼容

`balcony-garden-model.js`同时供正式Three场景和`FurnitureSolids`数值记录器调用，经`CabinetMotion.solidParts()`、`Geometry.bodyParts()`、`Snapping.directional()`和柜内测距复用。立柱／横撑／层板各有稳定物理身份。盆栽叶片为闭合薄带网格，真实三维冠幅与实体同源；薄叶的凸包截面仍属保守布局判断，不是生物形态／碰撞精确解。

只新增产品类型；盆栽沿已有`mountHeight`能力、现有mutate和保存／撤销通道。无新持久字段／缓存键格式／项目版本，尺寸、类型和高度进入已有几何缓存键。旧通用植物的历史高度和模型不迁移。

验证和视觉简化见[本次记录](validation/balcony-garden-20261031/README.md)。
