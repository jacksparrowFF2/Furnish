# 霜山9L工具箱：默认提手放平

2026-11-08，用户明确纠正“这个提手默认是放平的”。本次按局部视觉修正裁剪MODEL-VISUAL-REVIEW流程；原始图片、尺寸及完整初版记录见[前次记录](../toolbox-shimoyama-9l-20261108/README.md)。用户确认的是默认姿态，不等于认可精确槽深、转轴或动态轨迹。

## 范围、依据及模型

v7提手竖起模型保留；v8为闭盖／提手放平版本。宽340、深240、默认总高180mm（原尺寸图标注闭盖18cm；竖起22cm仍为历史参考）。提手U形开口保留，通过刚体变换落入盖顶凹槽，未整体压缩箱体、提手或卡扣。局部支座高度、槽深与槽宽依外观估算；没有新增动画、开合状态字段或厂家机构声明。

- 实际程序：C:/Users/SPH/scoop/apps/blender/current/blender.exe，5.2.3 LTS；作者预览EEVEE，正式GPU OPTIX／RTX4070TiSUPER。
- 源工程：assets/models/storage-supplies/toolbox-shimoyama-9l/v8/toolbox-shimoyama-9l-v1.blend；源GLB、作者及运行资产见[hashes.json](hashes.json)。
- 13个具名部件维持原身份。箱身仍高145mm，盖顶180mm，放平提手实际167..180mm、深向43mm、横向109mm；与旧提手形状刚性一致。

## 同机位局部对照

实际打开[修改前](upright-before.png)、[放平后](folded-after.png)及v8材质图，重点只看提手突出、盖顶凹槽及相邻支座。前后使用v7/review.blend中的相机、灯光、曝光：正交0.561m，Blender相机(.391,-.850,.331)m、目标(0,0,.110)m，640²、AgX、默认曝光0；对比工程comparison.blend保留。新版本默认作者取景基于180mm总高，与此固定机位对照分开。不是对原图未知镜头的完全摄影配准。

局部修正：提手从竖起刚性旋转90°放入槽中；凹槽延长并加深以容纳整段；支座顶面落在180mm内。实际整体及局部图复核通过，顶部不再有竖起把手。材质、箱身和卡扣外观保持。灰模及材质同源工程留在v8/clay.png、material.png，无材质重做，不重复初版所有视觉阶段。

## 默认值与历史兼容

catalog、product-rules和源资产默认高统一180mm。solidModel.geometryVersion=2只更新本型号，使实体缓存和空间确认读取新的几何语义；其它工具箱维持版本1。无新字段／项目版本／保存通道，mountHeight和pose3D沿原链。

旧实例保存的h=220或其它自定义高度不批量覆盖，恢复后保持数值；同类资产规则仍按保存高度作非标缩放，因此旧h220实例会显示为220mm高的放平模型，并非自动恢复180mm标准规格。用户可在属性中改为180mm；未直接修改任何当前方案。旧竖起源工程作为历史版本保留，不增加姿态切换交互。

## 实际验证

- 通过：test-shimoyama-handle-folded，验证生产提手／箱体几何、默认180、旧220往返与重复恢复、900mm离地仅叠加一次、其它工具箱规则不变。
- 通过：13件拓扑闭合、零非流形边、零退化面，见[topology.json](topology.json)。
- 通过：作者预检、独立发布、预检负例、storage-supplies、单型号空间旋转镜像／高度分离／项目恢复、HTTP及断网file、生产GLB逐片Blender回读、GPU三机位及下载工程重开，见[pipeline-report](pipeline-report.json)、[batch](pipeline-batch.json)。
- 通过：同打包EXE隔离目录，实际离地输入、撤销重做、保存刷新、390px窄屏；默认生产高度180，抬高900后900..1080（相对完成地面），见[桌面报告](desktop-result.json)、[实际截图](desktop.png)。
- 通过：执行者实际查看[正面](production-front.png)、[斜视](production-oblique.png)、[背面](production-back.png)，提手在生产出口中同样放平。
- 未执行：全项目回归、实物机构轨迹及承重／容量核验。槽的局部尺寸仍为外观估算；保守碰撞边界沿原模型。
