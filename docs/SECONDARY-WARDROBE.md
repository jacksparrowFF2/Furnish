# 次卧挂衣柜（2026-10-29）

依据用户要求参照旧房定制图04次卧（DXF图框1448），原图只读。已重新查看[整图记录](references/HONGFUYUAN-CABINETS-FULL-REVIEW.md#04-次卧双主体分区四门及明抽)对应的本机渲染图。参考双主体、顶部储物、左挂衣加两明抽、右双层挂衣及上下门分缝；旧图1777×610×2460不是当前房间尺寸。

## 当前1601

外包仍1637.5×630×2350 mm，中心4757.75／4975、旋转180°、地砖完成面+60 mm。原18厚板、60踢脚、50顶封和10门顶退让沿用。两个独立柜箱外宽各818.75，净宽各782.75，尺寸链为`2×782.75 + 4×18 = 1637.5`。没有为旧图推定额外见光板。

顶层净高500。层板相对柜内底板上表面标高：左1686；右834／1686 mm。左侧两抽屉采用191／227 mm的结构层高，经生产全盖计算，两块实际面板均207 mm高，不能将结构层高当面板高或抽盒净高。左侧杆轴距完成地面1704；右侧杆轴852／1704 mm。左右按面对柜门理解，随柜旋转／镜像。

当前与命名1601同步，备份为“1601 · 次卧衣柜调整前”。其余70件家具、建筑及材料未改，原有13份其它命名方案保留。检查见[数据与生产几何记录](validation/secondary-wardrobe-20261029/checks.json)，[内部](validation/secondary-wardrobe-20261029/interior.png)、[闭合立面](validation/secondary-wardrobe-20261029/front.png)。

**仍待整体布置深化**：保留原柜顶与次卧局部平顶实体相交、明抽拉出后800 mm地面操作空间被单人床占用两项提示。没有移动床、改吊顶或豁免检查。双层杆下可挂净高约762 mm、左侧约1196 mm，按当前模型板面和25 mm杆下沿计算，衣物长度／衣架与实际使用人尚未确认。

## 模板契约

新增`wardrobe-hanging`参数化模板，默认衣柜仍用旧`wardrobe`。沿用既有template、columns、shelves、drawers、drawerColumns及doorSections，没有新增持久字段或加载脚本／格式版本。旧实例不自动换模板。复制、替换、撤销重做、项目往返和重复恢复沿原通道；UI保存一次mutate，名义宽深高、结构板与碰撞仍由柜体核心控制。

`product-rules.wardrobeHanging`集中布局参数。`cabinet-core.hangingLayout()`以最高层板作为顶储物分界，门缝落在板厚中心；上下门使用原分段开合状态。顶储物以外，净高至少600 mm（含等于）的每格派生一根杆，杆轴距上板底60 mm、两端各退2 mm，25×25 mm银色方型材为布局近似。600是模板表达阈值，25和端退是建模假设，60仅借鉴旧图并按轴线理解，不是通用五金要求。支架、吊装件、衣架、承重和加工孔未模拟；不能作为加工图。

生产构造器同时生成杆、上下门和抽屉；CabinetMotion.solidParts记录实际杆实体，测距显示“挂衣杆”，沿Geometry.bodyParts和Snapping.directional测距／碰撞，无新增空腔豁免。平面沿用柜箱顶视和共用开门范围；上下门的完整开启检查使用两个实际高度段，当前开角不缩小最大范围。杆和门缝随层板、板厚、柜高联动；空间确认读取完整cabinet及挂衣模板派生规则，缓存包含此模板及现有参数。颜色不使空间确认失效。上下各一对门共用各自开合状态，未新增逐扇独立上／下状态。

## 本轮验证

- 通过：test-wardrobe-hanging、test-cabinet、test-cabinet-model、test-cabinet-independent、test-cabinet-opening-3d、test-cabinet-door-settings、test-generator-part-identities、test-work-state、test-repository-workspace、test-cabinet-catalog、test-cabinet-dimensions、test-product-rules。覆盖生产杆和8块门板、实际207面板、分段开合、600阈值、变尺寸、旋转镜像、实体包含／局部交叠／接触／高度分离、杆面测距、命名项目往返及重复恢复。
- 通过：HTTP当前方案载入、编辑保存、撤销重做、刷新与内部／闭合立面目视，70件其它家具及旧命名方案逐项比对。
- 未执行：全量检查、file://与窄屏本轮复验、实物五金／施工验收。加载方式未改，测试通过不代表剩余空间提示已解决。
