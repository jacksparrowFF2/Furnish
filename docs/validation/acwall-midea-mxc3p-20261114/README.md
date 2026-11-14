# 美的风尊三代 Pro MXC3P 参考图建模复核

2026-11-14，执行者Codex。新建白色KFR-35GW/MXC3P大1.5匹室内机，静态近闭合姿态，17个具名部件。尺寸／空间、参考图视觉、正式传递分别判定。用户尚未确认最终外观。

## 范围与版本

当前源：[v2 BLEND](../../../assets/models/acwall-midea-mxc3p/v2/acwall-midea-mxc3p-v1.blend)、[GLB](../../../assets/models/acwall-midea-mxc3p/v2/acwall-midea-mxc3p-v1.glb)。脚本为scripts/blender-model-acwall-midea-mxc3p.py，正式离线模块src/data/acwall-midea-mxc3p-blender-asset.js。源、运行资产与作者／渲染脚本SHA256见[fingerprints.json](fingerprints.json)；所有原图SHA256见[资产档案](../../../assets/models/acwall-midea-mxc3p/asset.json)。

实际程序：Scoop apps/blender/current/blender.exe，5.2.3 LTS。Cycles 40采样，GPU请求／实际OPTIX、NVIDIA GeForce RTX 4070 Ti SUPER，无CPU回退。没有改动真实装修文件。主目录原有projects/workspace.furnish.json未提交修改保留。插件verify首次对新profile仍用旧注册表而拒绝，因此改用其相同仓库CLI，--list确认注册后运行；不把插件调用拒绝当作管线通过。

## 参考解读（建模前实际打开）

[原分享链接](https://3.cn/3c4-E4Xa?jkl=@F7EltCy2xD@)解析到京东SKU100328209650；参数读取型号KFR-35GW/MXC3P，870宽／295高／199深、ABS面板。[商品页](https://item.jd.com/100328209650.html)轮播图及公开商品索引中的相同SKU细节图已归档，非其他代际机型。完整图文接口部分返回403／404，未声称已读取不可达内容。

| 参考 | 原图 | 用途与差异 |
|---|---|---|
| R1 | [hero](../../../assets/models/acwall-midea-mxc3p/references/hero.png) | 机身比例与双导风板；宣传箭头／促销字遮挡，不能推断轴心 |
| R2 | [carousel-10](../../../assets/models/acwall-midea-mxc3p/references/carousel-10.jpg)／[尺寸局部](reference-crops/dimensions.png) | 同SKU室内机标注870×295×199mm；裁切x37,y334,w465,h201，无非等比配准 |
| R3 | [carousel-11](../../../assets/models/acwall-midea-mxc3p/references/carousel-11.jpg)／[实物局部](reference-crops/physical-outlet.png) | 评价照片可见风尊III PRO贴，银色U形饰边、白色弧板、深色风道及右侧隐藏数显；未经用户逐张确认版本 |
| R4 | [carousel-6](../../../assets/models/acwall-midea-mxc3p/references/carousel-6.jpg)、[carousel-8](../../../assets/models/acwall-midea-mxc3p/references/carousel-8.jpg) | 双导风板分层、顶部进气；360°气流示意不是可用于机构复现的尺寸资料 |

实物局部先按EXIF6旋转90°，再裁x380,y1750,w3300,h1300，裁后不缩放。照片焦距和透视未知，尺寸只采用R2标注。

| 特征 | 表达选择 | 参数依据与未知 |
|---|---|---|
| F1 大面盖与端盖 | rear-shell、front-panel、左右cheek为独立软圆角几何 | 外包有标注；圆角／壳厚估算 |
| F2 下部真实凹入风道 | outlet-back/floor/roof、百叶，与前盖分层；不会用黑色贴片冒充孔洞 | 深度／内部件细节估算，未知隐藏机构不补造 |
| F3 银色包边与双弧板 | chrome-upper/lower/left/right、upper/lower-vane | 凹凸／遮挡用实体薄壳；姿态按近闭合图近似，无动画 |
| F4 顶部进气口 | 壳体布尔凹槽、独立暗底及肋条 | 43肋为模型采样；出风27片同为采样 |
| F5 表面识别 | Midea文字网格，数显熄灭 | 未复刻字标笔画；无运输贴／能效贴，不编造小字 |

## 相机与比较条件

采用近似R2斜视而非像素配准：Blender m坐标，正交斜视位置(-.6,-1.8,.46)、目标(0,0,.145)，正面(0,-2,.18)、目标(0,0,.148)，ortho_scale1.02；局部(-.18,-.8,.1)、目标(-.22,-.075,.047)，scale.44。1200×650，AgX，曝光0，世界强度.3，三盏面积光70/35/45W。每轮相机／环境保持一致，具体位置在[渲染参数](round-03/materials.json)与脚本中。营销相机／灯光未知，不能声称精确同光匹配。

## 第1轮：轮廓初版

实际打开[灰模整体](round-01/silhouette-overall.png)及[局部](round-01/silhouette-detail.png)。外包比例与面盖／底部弧板分区成立。发现三项：顶部格栅被实心机壳遮挡；圆角平滑仍有分面；品牌字沉入面板。未进入材质阶段掩盖，修正进气凹槽、平滑面、字标表面位置。

## 第2轮：结构与材质

实际打开[修后灰模整体](round-02/structure-overall.png)、[修后局部](round-02/structure-detail.png)，确认顶部真实开槽、独立导风板与百叶。随后打开[同机位材质整体](round-02/materials-overall.png)、[材质局部](round-02/materials-detail.png)，区分白色ABS／暗色风道／银色高反射饰边。

整链路第一次在Blender回读失败：chrome-left/right内外半椭圆仅改变Y半径，Z半径相同，中点重合，产生6个零法线角点／件。v1-final源保留为真实负例。尺寸／作者结构预检通过没有替代生产回读；该轮不标技术通过。

## 第3轮：修正拓扑与最终复核

局部修正饰边内外两向椭圆半径，避免中点退化；不改外包／安装语义。新增发布器零角点法线门禁。实际打开[灰模整体](round-03/silhouette-overall.png)、[结构局部](round-03/structure-detail.png)、[材质整体](round-03/materials-overall.png)、[材质局部](round-03/materials-detail.png)。与第2轮同光／同机位，饰边连续，顶部格栅、真实风道、双弧板保留。全部已发布角点法线为单位非零值。

轮廓／结构／材质：执行者复核通过，用途为室内布局识别。已知剩余：两侧壳体更简化，品牌字形近似，照片为打开状态而模型近闭合，厚度／曲率与内部件为估算，数显熄灭；无维修／拆滤网结构或实物逐面尺寸。

## 正式生产复核

隔离完整管线output/model-pipeline/selection-2gXs94/acwall-midea-mxc3p-zLt9N9，最终管线时间2026-11-14T07:18:42.614Z至2026-11-14T07:20:39.558Z（UTC），源码指纹17240992970c7b176786f550d24bf455394533b754a95afe9b70d7b99742e8a7。

| 检查 | 结论／证据 |
|---|---|
| 作者预检、故障注入、独立发布 | 通过，[完整阶段报告](production/report.json) |
| 真实旧零法线源拒绝／保留目标、合法SE2发布 | 通过，[门禁证据](production/publisher-guard.json)；SE2仅验证发布正例，不代表其完整管线重跑 |
| 实体、安装高、旋转／镜像、测距、碰撞、项目往返 | 通过，test-acwall-midea及profile-spatial；18组安装姿态，接触/低1mm相交，包含、穿入、高度分离；地面通道2100mm等阈值/2099mm与地面障碍对照、悬挂实体相交仍报告 |
| HTTP与断网file生产出口、缩放、撤销重做、缓存刷新／窄屏 | 通过，完整阶段报告；17件稳定身份，无外部请求／脚本异常 |
| 正式生产GLB逐部件世界边界／材质回读 | 通过，[readback](production/readback.json) |
| 正式三机位渲染与下载工程重开 | 通过，[正面](production/front.png)、[斜视](production/oblique.png)、[背面](production/back.png)、[reopen](production/reopen.json) |
| 同一打包EXE独立项目／缓存／端口 | 通过，[desktop-result](production/desktop-result.json)、[模型](production/desktop.png)、[窄屏](production/desktop-narrow.png)；从库新建、真实属性分别改底部与自身高、撤销重做、保存刷新、17件GLB |
| 生产识别点目视 | 通过，已打开上述三机位及桌面图；保持面盖、双弧板、饰边与顶部开槽。背部简化，studio斜视右上角少量黑影为试验环境边缘，非模型部件 |
| 机械运动／安装预留／气流物理 | 未执行／资料不足；静态模型不支持机械动画，安装要求保持待核对 |

补充回归通过：product-rules、bottom-elevation、catalog-navigation、i18n、enclosed-boundary-distances（当前153种目录类型×8变换，含接触／未知高度／包含与项目往返）；资产索引（336份资料哈希／48组模型源）、入口经典脚本共享声明、相关语法及差异检查通过。管线私有副本建立后，通道过滤补了“未声明阈值直接返回”的等价短路，避免无关型号额外读取高度；此最终小改另通过MXC3P、product-rules、enclosed-boundary-distances专项复验。project、project-validation与spatial-review-cache也通过。未运行全量scripts/check.cjs、其余型号完整管线或其他GPU／Mac。

## 交付结论

尺寸／空间与正式生产传递通过；视觉三阶段执行者复核通过，用户确认尚未执行。新类型沿既有mountHeight/h与保存链，无新增持久字段。默认2200mm仅为规划起点；厂家安装净距、接管、墙孔及完整运动未知。原通用acwall、真实方案、其它型号资产均保留。
