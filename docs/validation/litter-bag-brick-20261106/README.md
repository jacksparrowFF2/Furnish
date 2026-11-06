# 猫砂方块主体与提手视觉复核

按MODEL-VISUAL-REVIEW模板裁剪至本次静态包装轮廓修正。2026-11-06；执行者复核，不冒称用户已认可结果。

## 范围、资料与识别特征

用户指出v4包装“是一个方块，不是这种鼓鼓的”，再提供红框批注：25×22×8cm只指下部填充主体，上方另是提手。实际打开了原同系列营销图、用户完整批注和v4材质图。原批注完整保存`assets/models/litter-bag/references/user-body-handle-annotation.png`，哈希及字节数在asset.json；红框大致范围x493–1103、y570–1295（按聊天展示1419×1422图估计，未作为像素量尺或生成裁图）。图片中的广告标签没有刻入模型。

| 特征 | 依据与优先级 | 实现与未知 |
|---|---|---|
| 填充主体是方块，平面顶／底和近直侧壁 | 用户明确，高 | 原soft-package稳定身份改为小圆角长方体，名义250×220×80mm，不再用枕形鼓包 |
| 提手在主体之外，不能把它算进主体尺寸 | 用户批注，高 | 新增folded-handle具名薄膜件，真实长圆开孔；收纳姿态折放回主体上，膜厚／折法／孔长／圆角均估算，没有厂家展开尺寸 |
| 白底蓝Mix／2.5kg印字 | 同系列图，中 | 继续简化字面，不宣称该SKU批次完整印刷复刻 |

当前只支持静态折放收纳姿态；展开、可抓握行程和提手展开净空未建模。主体顶面约79.76mm，薄膜层次与封边补至80mm外包，这是名义80mm内的约0.24mm视觉分层，非用户实测膜厚或厂家公差。不得据此把展开提手也称80mm总高。

## 受控前后图与阶段复核

v4与v7作者脚本采用同机位：Blender坐标(.45,-.65,.62)m，目标(0,0,.05)m，正交比例.57m；Cycles 24 samples、800²、同一灯光／世界。不是参考照片相机匹配，照片参数未知，未作像素配准。

- 修改前：`assets/models/litter-bag/v4/material-front.png`，已打开，鼓起顶部与薄边不符合用户描述。
- v5：改为平面方块，之后收到提手批注；v6新增独立提手，灰白材质轮廓较弱；两次未发布工程／图保留在`output/litter-bag-iterations-20261106`。
- v7：`assets/models/litter-bag/v7/clay-front.png`与`material-front.png`已打开；最多处理两项：主体鼓度→平面、独立开孔提手及可辨薄膜材质。背视图一并生成，正式生产三机位另行检查。
- 保留v4有效源；当前可编辑v7 BLEND／GLB，脚本`blender-model-pet-supplies.py`；来源哈希由运行资产与资产索引共同记录。6件身份，真实提手孔没有封面，不用贴图假孔。

## 尺寸、生产与实际方案

`test-pet-supplies`新增生产射线检查五处主体平面同高、提手真实开孔及周围膜片；继续验证源哈希、6件、尺寸、独立离地、旋转镜像、空间、v53／重复恢复及十袋柜板净距。`test-pet-feeding-frame`复验架顶包和水碗、实体与全行程。猫砂geometryVersion2更新实体／三维缓存和空间确认，水碗geometryVersion1保持，不新增字段或项目版本。

整链路`output/model-pipeline/selection-hyYh61/batch.json`通过：作者预检与负例、独立发布、HTTP／离线file生产、生产GLB→Blender回读、GPU三机位、下载BLEND重开。实际Blender 5.2.3 LTS，Scoop current程序；本轮只跑litter-bag，无全量检查。

正式方案经MCP复制并保存为“客厅宠物柜 · 金属架与抽拉补粮”（dmw50fhba）。上方小门保留，下部开放；架顶两袋5kg，旁边八袋20kg，固定水碗，350mm抽拉。用户刷新后已通过正式窗口截图看到方块替代鼓包；聚焦该区域MCP核对0问题／0未知。全屋既有30问题／12信息不足保持，额定承重和防倾覆仍未作工程／实物验证。

最终正式文件位于`D:/1601装修/Furnish项目/workspace.furnish.json`，MCP回执persisted:true；刷新后读取仍为同一新方案。只读复制该文件到同一打包EXE隔离工作目录，留图`output/desktop-verification/pet-brick-final-9IdJuh/water-position.png`与`pullout-open.png`；只在副本切换抽拉状态，正式文件哈希不变。已查看实际闭合及拉出图，水碗固定、架顶袋为平直方块；正式窗口可沿原UI切换收起／拉出；用户后续操作状态保留，不为截图强制覆盖。
