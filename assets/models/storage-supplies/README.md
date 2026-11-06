# 客厅储物用品参考资产

四款静态模型由独立后台Blender 5.2.3 LTS创建，源工程、GLB、灰模与材质检查图保留在各版本目录。当前版本：工具箱toolbox/v3，药箱medicine/v2，卷纸rolls/v2，抽纸tissues/v2。`manifest.json`记录原图／源工程／交换文件哈希和来源；四个profile另有标准产品档案，`scripts/lib/storage-supply-specs.json`是本批作者／发布契约。

用法：`node scripts/blender-asset.cjs author-storage-toolbox <新目录>`；其它profile为medicine-box、toilet-paper-pack、tissue-pack。发布：`publish-<profile> <源.glb>`。作者预检独立于发布进程，失败不覆盖运行资产。整链路：`node scripts/verify/verify-model-pipeline.cjs storage-toolbox,medicine-box,toilet-paper-pack,tissue-pack gpu`。

工具箱按95101标注360×150×115建关闭外形，提手折平。药箱用京东条目340×250×200作为外包参考，通用不透明几何，不声称同SKU的透茶外观。medicine-example.jpg是另一个240×180×145商品，明确仅参考提手／扣合结构。卷纸高340、抽纸高200来自小红书个人测量，宽深及包数排列为估算；原营销图与示意排列／配色并非同批次，未复制小字商标。

参考图已实际查看：工具箱为长条绿漆铁箱、独立上盖、中央金属扣；药箱为圆角分层箱、两侧卡扣与折平提手；纸品分别表达卷状重复单元／六包分格、外包封边和提携部位。半透明未声明支持，本批均使用不透明PBR近似；无盖子运动、内部容量或食品保存性能结论。尺寸、资料类别和柜体分布见[设计说明](../../../docs/STORAGE-CABINET-2400.md)。

历史目录保留：toolbox/v1在渲染引擎名称处失败，v2及medicine/v1为作者结果回执路径诊断；几何源未删除。rolls/v1、tissues/v1为标签共面闪烁的前图，v2将标签分离并增加数量字形。最终运行资产只指向独立发布通过的当前源。
