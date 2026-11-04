# FA18-X231立柱档位与离地高度

2026-11-04开始，2026-11-05完成。局部结构改进，保留v1原资产／视觉记录；本次只改下方立柱与高度装配，不重做机头／材质。型号和原外观依据见[原视觉记录](../fan-x231-visual-20261104/README.md)。

## 用户参考与结构选择

实际打开[原尺寸图](../../../assets/models/fan-x231/references/user-dimensions.png)和[接缝批注](../../../assets/models/fan-x231/references/user-pole-joint.png)：全高1100mm、底座300mm有标注，下方杆体有中间接缝；用户明确要求通过增减立柱调高。没有短档标注、独立杆长或接头剖面。基于既有548mm建模杆长均分为274mm，派生0／1／2段的552／826／1100mm；前两档保留“估算”标记，不视为厂家安装规格。

v2源保留两段具名杆 `upright-lower`／`upright-upper`，其它27件身份保留。生产按实际总高h决定0／1／2段，只改变杆长及上部竖向位置；机头、控制柱和底座的竖向尺寸保持。默认标称全高与原材质保持，仅新增接缝。任意自定义h≥552沿杆长调整；旧h<552保留压缩兼容近似及原外包，未修改旧记录。复用h及mountHeight，无新专用字段。

## 实际视觉复核

- 桌面实际窗口三档：[两段](desktop-poles-2.png)、[一段](desktop-poles-1.png)、[无加长杆](desktop-poles-0.png)，通过原属性控件切换。使用正式聚焦视图，聚焦会随外包变化调整取景，不作为同机位像素对比。较早隔离取图有户型外待核对及墙体遮挡，未作为最终视觉证据；当前截图位于房间内，底部0、顶部对应实际h。
- 正式生产GPU：[全高正面](production-full-front.png)、[全高斜视](production-full-oblique.png)、[短档抬高760mm](production-short-elevated.png)。短档图底座悬于地面用于验证离地偏移，不意味着已经建模承托桌。
- 实际打开整体图，确认机头／控制柱形状保留、杆体确实减少而非整台压缩，全高接缝可见；源初版外观图作为历史依据，本轮未新增材质变化，不虚构材质A/B。局部结构执行者复核通过，不声称隐藏连接、摇头／俯仰机构或短档精确尺寸已确认。

## 增量验证

| 检查 | 实际结果 |
|---|---|
| 作者预检／独立发布 | 通过，29件源、米制、唯一身份／材质；六类真实错误注入拒绝。v1保留，新源在assets/models/fan-x231/v2 |
| 生产几何／空间 | test-fan-x231、test-fan-height及profile-spatial通过：三档27／28／29件、机头／控制柱／底座刚性尺寸、0与760离地、旋转镜像、外部间隔／包含、碰撞／高度分离、旧自定义高度、吸附 |
| 数据与缓存 | v48项目当前／命名方案／我的家具、工作区文件往返、v48缓存与v47恢复、重复恢复无漂移、跨类型替换清理；h／离地改动影响空间确认，纯配色／价格保持 |
| 共享链路回归 | product-rules、work-state、workspace-cache、project、project-validation、project-recovery、folding-chair-state通过；repository-version-compat、repository-workspace、repository-storage通过。全目录furniture-solids-cache在并行新增猫爬架的mountHeight能力校验处失败，未归为风扇通过项；该任务文件保持原样。风扇各档／离地实体切换与恢复专项通过；仅含本次改动的隔离交付副本进一步通过全目录492组fresh-builder缓存比较和41种形状世界缓存验证 |
| HTTP／断网file | 通过，正式全高／拆杆／尺寸拟合导出、撤销重做／刷新、390px、无外部请求／脚本异常。短档同时使用760mm离地；逐部件世界边界核对，偏移没有漏加或重复 |
| Blender生产回读 | 通过，逐部件身份／世界边界／材质，以及正式API三机位GPU渲染、下载工程重开 |
| 同一打包桌面EXE | [desktop-report.json](desktop-report.json)通过：独立源码／方案／缓存／端口；实际控件三档、离地760、撤销重做、保存刷新及[窄屏](desktop-narrow.png)。正式用户文件哈希保持 |

第二次整链路批次 `output/model-pipeline/selection-MFOHAs/`，报告归档 [pipeline-report.json](pipeline-report.json)；实际Blender为Scoop current／5.2.3 LTS，GPU为OPTIX／RTX 4070 Ti SUPER。前一次批次 `selection-gqmj1t` 保留，第二次增加非零离地正式导出覆盖，未冒充单次报告。源与原图哈希见 [hashes.json](hashes.json)。

未运行全量检查或其它型号整链路。普通家具家电的离地能力已作为规范要求写入技能、AGENTS、开发指南和PRODUCT-RULES，本次只实际补齐风扇，不宣称已改造所有存量产品。静态模型不包括真实接头、连续拆装动画、摇头／俯仰或气流；共享实体轮廓仍为保守空间检查。
