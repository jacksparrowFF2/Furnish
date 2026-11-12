# 大号拉斯克参考图与正式生产复核

日期2026-11-12。当前款305.916.66灰绿色；自建静态空车，350×450×770mm。Blender 5.2.3 LTS，Scoop current入口。作者与独立发布、生产模型各阶段分别记录，用户尚未确认视觉还原。

## 建模前参考解读

官方灰绿色图用于颜色，当前白色同款高清整体、脚轮局部和厨房场景用于结构；组装说明AA-2475409-3第4至8页用于配对立管、两段U形底架、篮筐抱箍及两种脚轮。原始文件及SHA256保存在asset.json。

| 特征 | 实际观察与采用表达 | 依据与未知 |
|---|---|---|
| 外轮廓 | 三层圆角长方篮、上开口、薄壁卷边 | 外形标注350×450×770；各篮内尺寸未知 |
| 网底 | 真实交叉斜条、贯穿孔；每篮独立网底 | 9mm为模型采样，不宣称真实孔数 |
| 支架 | 前后短边各有一对立管与三只抱箍；分离的两段U形底架 | 组装图与照片；管径/层距估算 |
| 脚轮 | 四组轮、轮毂、叉架、转盘与轴；前两组有刹车片 | 组装说明两可锁两普通；细节尺寸未知 |
| 材质 | 灰绿粉末涂钢、黑色轮、灰色轮毂及金属叉架 | 官方材质及照片估色；不做实物色差承诺 |

## 作者轮廓、结构及材质

同一正交机位640×640、AgX、EEVEE，目标高度385mm；机位为(1.463,-0.847,0.8085)m，正交宽1.2705m。官方摄影焦距未知，按可见两面和上沿调整，非像素配准。两面积灯与世界光条件保存在review.blend，灰模与材质图同机位同灯。

- v1已实际打开clay.png和material.png，检查三层开口、网孔、管架、脚轮。整体可辨，篮层距及局部五金为估算。
- 独立发布发现实际底架宽349.014mm，没有放宽尺寸校验；v2只将估算底架横向拟合到标注350mm，原v1保留在本机作为修改前证据。未声称这是厂家底架分项尺寸。
- v2已实际打开[灰模](author-v2-clay.png)、[材质](author-v2-material.png)、[网底局部](mesh-detail.png)、[脚轮局部](caster-detail.png)，对照官方整体与脚轮图。三层开口、卷边、双管与底架、金属叉架及刹车片传递完整；脚轮叉架比照片简化，层距与内部净空未测量。修改前[灰模](author-v1-clay.png)保留，底架不到1mm的尺寸修正没有宣称显著视觉提升。

源工程、作者脚本、GLB、review.blend和离线资产SHA256见[source-hashes.json](source-hashes.json)，原始参考文件哈希见[资产档案](../../../assets/models/trolley-ikea-raskog-large/asset.json)。原GLB哈希为7de6ecc0f4e6a6a9d581e189b57fbd73c81a1caf1b3c1b2203299f18002d45f5。

## 验证状态

| 检查 | 实际结果与证据 |
|---|---|
| 作者预检与独立发布 | 67部件身份/材质/单位通过；独立进程发布不放宽350×450×770尺寸检查 |
| 单型号整链路 | [report.json](report.json)的11阶段全过：作者、作者故障负例、发布、geometry-state、HTTP/file正式生产、GLB回读、生产工作室导出、GPU三机位、下载BLEND重开 |
| 底部离地与恢复 | storage-supplies专项通过0/68/1400mm、尺寸编辑、0/37/90°和镜像、方向测距、真实柜板相交/分离、重复恢复及替换；product-pose通过自由姿态原链 |
| 开放篮及柜口 | raskog-trolley专项通过三篮腔体/篮壁、层间空隙、370×564×812柜口的81个0–800mm位置，并验证侧向25mm/抬高55mm的干涉负例 |
| 正式生产外观 | 实际打开[正面](production-front.png)、[斜面](production-oblique.png)、[背面](production-back.png)，开放薄壁、网孔、双管与脚轮保留；每机位67件尺寸/材质Alpha回读与下载工程重开通过 |
| 正式桌面方案 | 通过Furnish MCP仅替换原占位块ID fmwd89b7u1，保留中心6853/9811、rot180及350×450×770；其余160件与替换前一致。applied:true/persisted:true，保存至D盘正式文件 |
| 实际检修演示 | [整车向外800mm](desktop-pulled-out.png)与[恢复柜内](desktop-parked.png)后单车核对0问题，随后恢复原停放位置并保存。与厨房/分水器联合核对仍为原有4项管孔/墙体/越界提示，未标记已确认 |

本轮只运行该新型号整链路及相关收纳/姿态专项，未运行全项目检查、其它134配置或脚轮机构运动。插件已加载清单缓存未识别新型号，因此使用同一项目原CLI隔离入口；首次沙箱中Blender初始化退出3221225506，普通本机进程续跑成功，失败目录未清理或伪装通过。批次output/model-pipeline/selection-nWQspP/batch.json记录最终passed:true。

桌面最终方案：1601厨房 · 大号拉斯克与可拆检修收纳；最终revision b86436a6e1c89a6c1d306f5c44466564fda1105429e22a90de2fdc8f9f989565。原方块已成为正式模型，厂家没有公开篮筐净尺寸。既有盲角内部层板与抽屉快拆五金的设计状态未由此次模型替换补齐。

没有脚轮回转/滚动动画或动力学验证。1601安装间隙属于方案试排，不是施工放样结论。

## 下载调研与参考来源

检索到的CGTrader免费粉色RÅSKOG为470mm长第三方旧尺寸，附带no-AI许可，未下载或复用；Sketchfab对应入口不能直接读取。未找到本次当前350×450×770款可直接采用的模型，故自行建立几何。搜索结果不等于证明全网没有适配模型。

- [第三方候选](https://www.cgtrader.com/free-3d-models/furniture/kitchen-furniture/ikea-raskog-pink-utility-trolley)
- [当前灰绿色官方页面](https://www.ikea.cn/cn/zh/p/raskog-la-si-ke-shou-tui-che-hui-lu-se-30591666/)
- [同款白色整体](https://www.ikea.com/us/en/images/products/raskog-utility-cart-white__1366882_pe957173_s5.jpg?f=xl)
- [同款脚轮细节](https://www.ikea.com/us/en/images/products/raskog-utility-cart-white__1366883_pe957174_s5.jpg?f=xl)
- [厨房场景/网底](https://www.ikea.com/us/en/images/products/raskog-utility-cart-white__1366884_pe957177_s5.jpg?f=xl)
- [组装说明](https://www.ikea.com/us/en/assembly_instructions/raskog-utility-cart-white__AA-2475409-3-100.pdf)
