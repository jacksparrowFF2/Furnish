# 6L冻干桶参考图建模复核

## 范围与版本

2026-11-07，执行者Codex。新建meoof图示升级款6L、奶油白、闭盖／两侧提手垂落的布局模型。执行者已看图复核，用户尚未评价本次成品。尺寸、外观相似度和生产传递分别结论；不声称容量认证或真空性能验证。

最终资产为`assets/models/storage-supplies/freeze-dry-bucket-6l/v3/`，10件具名网格、静态无运动rig。v1／v2保留真实修订，不覆盖旧源；v1为初版错误印字，不能作为当前模型使用。作者脚本`scripts/blender-model-storage-supply.py`，产品逻辑留在product-rules，运行时同源storage-supply-model→static-asset。

Blender实际程序 `C:/Users/SPH/scoop/apps/blender/current/blender.exe`，5.2.3 LTS。作者三阶段采用EEVEE；正式三机位请求／实际GPU，Cycles／OPTIX、NVIDIA GeForce RTX 4070 Ti SUPER，512×512。程序路径通过项目findBlender发现，没有版本目录硬编码。

## 参考解读（建模前已查看全图，局部另裁并复核）

原件：[尺寸图](../../../assets/models/freeze-dry-bucket-6l/references/dimensions.png)、[系列外观](../../../assets/models/freeze-dry-bucket-6l/references/range.png)。完整商品URL及原图SHA256在[asset.json](../../../assets/models/freeze-dry-bucket-6l/asset.json)。仅依据用户两图，本次未读取商品页，不从页面猜造隐藏结构。

| 参考／特征 | 观察、依据与对应部件 | 未知／简化 |
|---|---|---|
| 尺寸图6L | 标注316×309×187mm，分别X宽／Z深／Y高；与低矮6L子图对应 | 宽深图示接近，按标注顺序映射；不是13L经典高桶 |
| 矮胖轮廓 | body，上口稍宽、底部收圆，四角大圆角 | 收分、圆角半径为估算 |
| 盖沿层次 | lid、lid-seam、lid-recess；边沿外挑、细接缝、浅凹顶面 | 盖槽形态与厚度估算，真空机构未知 |
| 开盖舌 | front-release，正面左侧盖下小凸舌 | 尺寸／连接方式为估算 |
| 侧提手 | left/right-handle及各侧pivots，独立带状几何，有真实镂空 | 正背支点位置、隐藏侧按对称估算；不模拟提起机构 |
| 竖排标识 | brand-mark，meoof.顺桶面向下，淡米灰印刷 | 非原厂字体，省略不清楚小字，未编造标签 |
| 塑料材质 | main奶油白、seam暖灰、brand浅米灰，不透明PBR | 无实物色卡／表面粗糙度依据，按营销图视觉近似 |

局部裁切是分析证据，未修改原件：[桶形局部](reference-shape.png)，原尺寸图裁框(120,180,505,310)；[6L子图](reference-6l.png)，系列图裁框(198,1138,130,92)。已实际打开全图和这些裁图。

## 相机与比较条件

作者最终低角斜视为正交投影，Blender米制Z向上，位置(0.3634,-0.7900,0.2989)，目标(0,0,0.0935)，ortho_scale=0.5214，640²。两盏0.8m面光，位置(-0.8,-0.8,1)／(0.7,0.2,0.8)，90／70W，世界灰0.35，AgX、曝光0，见v3/review.blend。参考没有拍摄参数，采用近似斜视，未做精确像素配准；线稿视角比作者视角更平，因此另看正式正面图和6L正面子图。

[同机位初版](before-same-camera.png)是读取真实v1 GLB、复用最终review.blend相机灯光重新渲染，未虚构旧图。[修订后](material.png)采用同相机／灯光／材质值，仅改印字姿态、表面贴合与曲面法线；实际修改记录如下。

## 第1轮：轮廓

[轮廓灰模](silhouette.png)：仅显示桶身、盖和接缝，隐藏提手／字／凸舌以检查比例。已实际打开，与两张参考对照：矮胖矩形、外挑盖沿和圆角收底可辨。外包由独立发布器核对316×187×309mm，不把渲染比例当尺寸证明。初版轮廓未作实质重建，不虚构轮廓修改前后图。结论：执行者轮廓复核可用于布局；圆角与收分仍为估算。

## 第2轮：结构

[结构灰模](clay.png)已实际查看。重点三项：侧提手保留开口和带厚，双端枢轴独立；盖沿／接缝／凸舌分层；正面印字应竖向且贴桶面。首版印字的欧拉旋转方向错误并浮离桶身，见[修改前](before-same-camera.png)；v2以局部旋转矩阵校正并按桶身收分贴合，v3增加曲面加权法线，见[修改后](material.png)。结构接缝与提手遮挡保留；开盖／隐藏结构没有资料，不宣称通过机构复核。

## 第3轮：材质

[材质斜视](material.png)与同条件结构灰模对照，已打开整体看图。main、接缝、标识按物理可见区域区分；未添加金属／玻璃或虚构贴图。奶油白、暖灰盖缝、低对比竖排字可辨。背面无资料按对称处理。尚有字体差异，未标定实际塑料反射与色差。正式WebGL强日光下标识较淡，盖面可见阴影采样细纹；正式Cycles图没有同样细纹。本次不改全局阴影算法或宣称与实拍逐像素一致。

## 正式生产复核

| 检查 | 结论／证据 |
|---|---|
| 作者预检＋独立发布 | 通过，10件、单材质槽、稳定身份、边界及哈希；空材质、错身份、错误单位、非有限点等预检负例通过，见[pipeline.json](pipeline.json) |
| 生产尺寸／空间／恢复 | 通过，实际Three与数值实体共源；底部0..187、抬高与非标尺寸，旋转0°／37°及镜像；外间隔、局部穿入、完整包含、高度分离、真实柜板碰撞／净距，项目与命名方案往返、复制替换、重复恢复，见[spatial.json](spatial.json)及pipeline的storage-supplies专项 |
| HTTP／断网file | 通过，两入口无外部请求／脚本错误、实际资产10件、改尺寸、撤销重做、缓存刷新、390px窄屏；不是以HTTP代替file，见pipeline报告 |
| 生产GLB回读 | 通过，双入口导出每件身份、世界边界与Alpha，对照[readback.json](readback.json) |
| 三机位正式导出＋渲染 | 通过，公开生产导出器→正式渲染API；已实际打开[正面](production-front.png)、[斜视](production-oblique.png)、[背面](production-back.png)，桶形、盖沿、提手、印字、材质分区保留 |
| 下载工程重开 | 通过，三份scene.blend重开核对逐部件、相机、Cycles、AgX、512²，见[reopen.json](reopen.json) |
| 实际打包桌面 | 通过，桌面快捷方式对应D:/1601装修/Furnish程序/Furnish-win32-x64/Furnish.exe，独立工作目录／缓存／端口、sandbox=true、contextIsolation=true、nodeIntegration=false；见[desktop.json](desktop.json)、[正式画布](desktop.png)、[桌面选中](desktop-window.png)、[390px布局](narrow.png) |
| 离地真实输入 | 桌面属性输入900，经mutate生效，撤销／重做、文件保存／刷新保持。该户型完成地面+60mm，因此GLB绝对底／顶960／1147mm，离地仍900／1087mm；没有重复偏移 |
| 活动机构／安装／容量 | 不适用／未验证，只有闭盖静态与外包布局，不推定桶内空腔或提手开盖完整行程 |

桌面原正式窗口仅读取1601与保存位置D:/1601装修/Furnish项目/workspace.furnish.json。修改测试均在隔离副本；仓库projects/workspace.furnish.json既有用户修改未提交、未覆盖。首次桌面夹具用了仅浏览器可用的动态户型导致保存被拒；第二次未计入完成地面60mm而断言失败。两次失败均为测试夹具问题，已修正使用既有户型及核心floorBase，失败日志留在output/desktop-verification，失败隔离进程已核对归属后关闭。最终桌面测试在完成后正常退出并清理独立源码／缓存，报告保留在output/desktop-verification/freeze-bucket-H6nG8S。成功结果不覆盖失败记录。

## 交付结论

尺寸／空间与正式生产传递通过本次增量检查；执行者看图确认矮胖轮廓、层次、提手镂空、竖排品牌和奶油白配色在正式构造中保留，仍属图片近似，用户尚未确认还原度。未运行node scripts/check.cjs全量回归，未验证真空性能、内胆／容量、实物开盖机构、厂家安装预留或精修工程材质迁移。数值实体采用逐部件保守包络，提手／圆角空角可能保守告警。

## 哈希与归档

- `assets/models/storage-supplies/freeze-dry-bucket-6l/v3/freeze-dry-bucket-6l-v1.blend` SHA256 `1b07336719213ebbe76ec2a10aa40d8e64ed2ee8398cc7d437e9db1335c73f61`
- `assets/models/storage-supplies/freeze-dry-bucket-6l/v3/freeze-dry-bucket-6l-v1.glb` SHA256 `694037f45885d7a146aa42cefe372ef77cc0d34dc444638e90b4dc995dfdaa2a`
- `assets/models/storage-supplies/freeze-dry-bucket-6l/v3/review.blend` SHA256 `2daa30cd5ab1afb17595e2d8435780095d5593ba0a4dfef0adb249aec303efc9`
- `scripts/blender-model-storage-supply.py` SHA256 `6da2404766d8f307a99873a151ce73e094852e7f0bc8eac1d4eb43fd4a789811`
- `src/data/freeze-dry-bucket-6l-blender-asset.js` SHA256 `2812fa50ee4f8a8f579f84bfc0c4dbf6856b54fee174d9290027c9c4e89a4af5`
