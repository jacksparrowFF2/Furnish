# 佳帮手透明工具箱参考图建模复核

依照 docs/templates/MODEL-VISUAL-REVIEW.md 的阶段记录，2026-11-07由执行者复核；用户尚未确认视觉还原。尺寸、视觉与生产传递分别判定。

## 范围与来源

新建大号390×270×210 mm、透明PP、空箱闭盖；不含展示工具。原图与完整商品链接见[资产档案](../../../assets/models/toolbox-jiabangshou-390/asset.json)，实际查看原图及[产品局部](reference-product.png)、[盖面和灰扣局部](reference-lid-catch.png)。京东读取结果：SKU100359220602，佳帮手工具收纳箱透明分格便携家用螺丝零件小型五金收纳工具盒，佳帮手京东自营旗舰店；规格未单独返回，390×270×210始终以附件为据。图注手量误差1–2cm不作为代码验收公差。

| 特征 | 参考裁切框(x,y,w,h) | 依据与表达 | 未知/简化 |
|---|---|---|---|
| 长方收分轮廓、圆角箱壁 | (170,800,870,700) | 标注外包390/270/210；body独立薄壁，底部收分 | 壁厚/收分/圆角图片估算 |
| 厚盖沿、浅盖面与两道筋 | (650,840,385,340) | lid/upper-rim/lid-panel/lid-stiffeners真实分层 | 细槽/运输配件未知，不编造标志 |
| 透明上托盘、长中央格和前后小格 | (170,800,870,700) | tray及6件独立隔板；空箱可见层次 | 被工具遮挡的分格按近似对称简化 |
| 两短侧灰色折下扣手 | (650,840,385,340) | left/right-catch三边真开口，灰色不透明PP | 曲线、轴、开启轨迹未实测，不提供运动 |
| 箱面竖筋 | (170,800,870,700) | front/back-ribs；按观察采样 | 数量及横向底筋未作实物复刻 |

## 相机与固定条件

作者比较使用正交镜头，位置(0.468,-0.819,0.612)m、目标(0,0,0.105)m（Blender坐标），ortho_scale=0.6435m；640²、EEVEE、AgX、世界0.35，两面0.8m面积光90/70W。条件存于v1/v2的review.blend及作者脚本，哈希见[hashes.json](hashes.json)。匹配商品的前右上视方向，但抬高视角以检查空托盘；没有相机标定，不是像素叠合认证。正式GPU三视图为model-studio-v2，实际RTX4070 Ti SUPER、OPTIX/Cycles、512²，具体机位存于本机pipeline报告引用路径。

## 轮廓、结构与材质阶段

| 阶段 | 实际打开的图 | 结论与最多三项差异 |
|---|---|---|
| 初版轮廓 | [v1轮廓](../../../assets/models/storage-supplies/toolbox-jiabangshou-390/v1/silhouette.png) | 外包及收分符合标注比例；保留箱身、盖沿层次。无前版本，不虚构改善图 |
| 初版结构 | [v1灰模](../../../assets/models/storage-supplies/toolbox-jiabangshou-390/v1/clay.png) | 空托盘、侧扣、竖筋分层存在；盖面纵向筋不足，下一轮添加 |
| 初版材质 | [v1材质](../../../assets/models/storage-supplies/toolbox-jiabangshou-390/v1/material.png) | PP过乳白、盖内隔板偏弱；灰扣保留不透明，需降低透明件Alpha |
| 修订结构 | [v2灰模](../../../assets/models/storage-supplies/toolbox-jiabangshou-390/v2/clay.png) | 增加lid-stiffeners两道真实筋，不改外包；相同机位检查通过 |
| 修订材质 | [v2材质](../../../assets/models/storage-supplies/toolbox-jiabangshou-390/v2/material.png) | 同光同机位body/tray/panel Alpha .24→.14，rim/隔板 .38→.30，盖内层次增强；EEVEE Alpha仍有颗粒，正式生产另看下图 |

执行者判定轮廓/结构阶段通过，材质为透明PP视觉近似通过；圆角、卡扣弯曲及托盘细节仍有估算差异。未做实物磨砂雾度/折射匹配，透明Alpha不等于真实透射。初版源与GLB保留，最终v2含16件；文件v1指身份契约。

## 正式生产复核

实际打开[桌面显示](desktop.png)、[正面](production-front.png)、[斜视](production-oblique.png)、[背面](production-back.png)。空箱透明度、分格、两灰扣、盖沿和筋条传递保留；长边正面、局部+Z，左右按正面解释。生产图空箱与参考中满装工具造成明暗差异，不额外制作虚构工具。源EEVEE颗粒未出现在实时模型；正式GPU图PP对比受环境影响，未调全局灯光掩盖差异。

| 检查 | 结论 | 证据 |
|---|---|---|
| 作者预检与注入负例、独立发布 | 通过 | [pipeline-report.json](pipeline-report.json)，新目录作者与独立进程发布 |
| 生产尺寸、离地、旋转/镜像、空间及项目往返 | 通过 | storage-supplies及model-profile-spatial：0/68/1400mm，尺寸编辑，外距/包含/穿板/高度分离，重复恢复与替换 |
| HTTP/断网file生产导出、编辑/撤销/刷新/窄屏 | 通过 | 同pipeline报告http-file-production；未改正式数据 |
| 生产GLB逐片Blender回读与材质Alpha | 通过 | 同报告blender-production-readback，16件与世界边界核对 |
| GPU三视图与下载BLEND重开 | 通过 | render-front/oblique/back与downloaded-blend-reopen；OPTIX实际GPU |
| 同打包EXE隔离桌面 | 通过 | [desktop-report.json](desktop-report.json)，mountHeight=900→最低900/最高1110mm，撤销重做、保存刷新、390px；sandbox/contextIsolation开启 |
| 薄壳闭合、退化面及材质错误部件负例 | 通过 | [materials-topology.json](materials-topology.json)：16件闭合，私有副本焊接glTF法线拆点后检查；灰扣Alpha .2和箱壁Alpha .7拒绝且未覆盖已接受结果 |
| 开盖、托盘取出与手扣运动 | 不适用 | 本次仅闭盖静态，无伪造轴心与开启预留 |
| 全项目回归/真实容量与承重 | 未执行 | 本次增量型号验证；缺实物测量资料 |

## 复现与边界

单型号整链路：node scripts/verify/verify-model-pipeline.cjs toolbox-jiabangshou-390 gpu；桌面：node tests/test-toolbox-jiabangshou-desktop.cjs。材质负例脚本scripts/verify/verify-toolbox-materials.py以新输出目录运行。实际Blender使用Scoop current/blender.exe，5.2.3 LTS；请求GPU和实际OPTIX均记录。

单件保存复用v57、姿态v58，无新字段/保存通道。未知厂家开盖间隙保持未知，frontClearance=0仅表示未建操作预留。实际薄壳视觉内空不授予数值柜内空腔语义；逐部件包络可对内空区保守报碰撞。库中价格未知，不按商品抓取报价推断选中大号成交价。

本机完整证据批次output/model-pipeline/selection-HRObTg，桌面output/desktop-verification/toolbox-AWvSiq。隔离工作副本由已有成功清理器回收，报告和导出证据保留。阶段图及本报告哈希清单持久归档，不将增量通过表述为全量通过。
