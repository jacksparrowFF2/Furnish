# 美的风尊三代 Pro 大1.5匹室内挂机

用户分享的[京东链接](https://3.cn/3c4-E4Xa?jkl=@F7EltCy2xD@)解析到[自营商品 100328209650](https://item.jd.com/100328209650.html)，型号为 **KFR-35GW/MXC3P**。分享文案中的“CA8680”没有作为产品型号使用。2026-11-14取得参数表及同商品轮播细节图，完整来源／原图哈希见[资产档案](../assets/models/acwall-midea-mxc3p/asset.json)。

商品参数与[尺寸标注图](../assets/models/acwall-midea-mxc3p/references/carousel-10.jpg)一致：室内机 **宽870 × 高295 × 深199 mm**，面板ABS，净重11kg。库与项目仍按w/d/h存储，因此是870/199/295。价格受活动影响，目录参考价格保持未知。外机、遥控器、铜管、电源线和挂板不纳入本室内机模型。

## 外观与依据

制作白色软圆角机壳、独立前面板、两侧端盖、银色出风口包边、真实凹入的暗色风道、独立上下弧形导风板、内部百叶及顶部进气格栅。17个稳定部件；同一Blender资产供应生产显示、数值实体、正式GLB与离线file入口。

整机外包为标注值。面盖厚度、圆角、饰边宽度、导风板曲率、内部百叶节距为外观估算，27片出风叶／43条进气肋为观察尺度下的模型采样，不是厂家数量。商品评价实物照补充了银色饰边、隐藏数显及凹腔层次；该照片标签为风尊III PRO，但未经用户逐张确认，不据照片推断安装要求。

采用接近闭合的静态参考姿态；不提供开合字段或360°扫风动画，不声称已验证机械轴心／完整运动扫掠。数显按熄灭表达，省略能效贴、运输贴和内部不可见机构。品牌为可读Midea文字近似，未复刻标志字形。参考相机为近似斜视，未知营销图镜头和光照；视觉复核是布局模型识别性检查，不是实物精密逆向测量。

## 数据与安装契约

`acwall_midea_mxc3p`为独立新类型，保留旧通用`acwall`及其原安装语义。`product-rules`集中声明295mm机身高、bottom基准、mountHeight能力及wall-aircon族。新建底部2200mm仅为规划起点，**不是厂家安装要求**；支持0和后续修改。高度h与底部安装高分别编辑。源网格底部0，构造器在边界换算成m并叠加mountHeight一次，外层复用原旋转／镜像／地面基准。

宽深高编辑为布局草模缩放，不代表另一真实产品规格。没有新增持久字段／项目版本或保存通道；原mutate、复制、替换、撤销、缓存、自动保存、命名方案及项目往返复用现有链。跨型号替换清理不适用安装高度，重新采用新产品基准。底部高度进入生产实体与空间确认，价格／配色仍不清空间确认。

`floorPassageAbove:2100`为软件规划净高阈值：底部达到2100mm时不参与地面通道投影，2099mm及以下仍保守参与；这不是厂家安装要求，实际实体碰撞始终保留。

`FurnishGeometry.bodyParts()`读取实际生产网格，`FurnishSnapping.directional()`沿公共路径测距；不增加空腔／碰撞豁免。厂家左右／顶部／前方安装净距、墙孔与接管位置未知，`clearanceReview:'missing'`保留待核对。模型外包和静态实体不能证明散热、检修、气流效果或施工安装可行。

## 源与维护

当前源在`assets/models/acwall-midea-mxc3p/v2/`，文件名沿管线`acwall-midea-mxc3p-v1.blend/.glb`。v1-initial及v1-final保留为过程源；v1-final两段银色椭圆饰边中点退化、GLB回读失败，不能再发布。v2修正内外椭圆半径，独立发布器增加零角点法线拒绝门禁。来源GLB哈希由离线资产记录。

```powershell
node scripts/blender-asset.cjs author-acwall-midea-mxc3p <新目录>
node scripts/blender-asset.cjs publish-acwall-midea-mxc3p <源GLB>
node tests/test-acwall-midea.cjs
node scripts/verify/verify-model-pipeline.cjs acwall-midea-mxc3p gpu
node tests/test-acwall-midea-ui.cjs --desktop-only
```

技术验证、视觉分阶段证据及未执行项见[本轮记录](validation/acwall-midea-mxc3p-20261114/README.md)。
