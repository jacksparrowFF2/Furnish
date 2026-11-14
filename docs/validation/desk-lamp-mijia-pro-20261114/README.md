# MJTD07YL 建模、视觉与生产验收 · 2026-11-14

## 范围、来源与版本

本次新建白色米家桌面学习灯Pro MJTD07YL，静态水平参考姿态。无上一正式资产；初稿及第二稿保留在本机output/desk-lamp-mijia-pro-20261114/drafts，最终源在assets/models/desk-lamp-mijia-pro/v1-final。全部正式源与脚本SHA256见[哈希](hashes.json)，引用原图SHA256见[资料清单](../../../assets/models/desk-lamp-mijia-pro/asset.json)。

实际程序为C:/Users/SPH/scoop/apps/blender/current/blender.exe，5.2.3 LTS，Cycles／OptiX，作者预检与独立发布分开执行。整链路基于2873c972加本次未提交改动，实际生产脚本指纹与阶段记录见[report](report.json)。

## 建模前参考解读

已实际打开规格图及商品图1、2、5、6；图3、4仅归档，不作为已目视核验依据。商品页来源是[京东自营](https://item.jd.com/100118995289.html)，几何来源是[同型号产品图](https://www.ithome.com/0/795/480.htm)及[带尺寸图](https://n.sinaimg.cn/spider20240913/8/w750h2458/20240913/e99e-7e40bfc954679fe33f7f39dff41173d1.jpg)，均为营销图，无用户实物近照。

| 特征 | 依据／关键尺寸 | 几何与物理分区 | 未知或简化 |
|---|---|---|---|
| 长条双翼灯头 | 标注宽520／深56mm | head-left/right、独立diffuser-left/right，真实向下发光面 | 灯头厚度估算 |
| 方底座与后立柱、前伸臂 | 底座213×159、整高470、臂长344mm | 独立底壳、接缝、四脚垫、立柱、前后铰接、灯臂 | 总占深420为姿态估算；铰轴／厚度未知 |
| 前圆形操控部 | 营销图白面与浅灰外圈 | control-rim真实环形开口、control-face独立白面、四灰点 | 小图标简化，不编造文字 |
| 细节材质 | 白喷涂／灰金属／乳白扩散板／橡胶 | 不同部件赋PBR材料 | 无厂家BRDF；未实现调臂／雷达 |

## 相机与比较条件

对照源为图1整体、图5／6前部。镜头未知，匹配为近似：作者Blender坐标米，整体70mm透视，位置(-.85,-1.35,.36)朝(0,0,.24)；局部正交.27m，位置(-.35,-.75,.48)朝(0,-.167,.445)。1000²、48spp、AgX曝光0，环境强度.15，三盏面积灯10／5／8W。配置及实际设备见[render](round03/render.json)和scripts/render-desk-lamp-review.py；模型主体未为拍图改变几何。

## 阶段与修订

1. **轮廓初稿**：实际查看标注图与初稿整体／局部；确认灯头、底座、后柱、长臂的主比例。初次拍摄过亮及相机偏高，不能清楚辨认操控面；第二轮改变观察条件，不能将画面亮度差异称为材质改进。初稿图片留在本机output根，非正式材质证据。
2. **结构／材质第二轮**：实际查看[整体](round02/materials-overall.png)与[局部](round02/materials-detail.png)。发现旋钮外圈误用实心圆柱遮住白色面板；改为真实环形薄壁，白面与按键保持独立层次。此项失败后修订，未覆盖上一源。
3. **第三轮复核**：固定第二轮机位／灯光／曝光重渲。[灰模整体](round03/silhouette-overall.png)、[灰模局部](round03/structure-detail.png)、[材质整体](round03/materials-overall.png)、[材质局部](round03/materials-detail.png)均实际打开。主轮廓／前白色操控面与金属外圈已可识别，扩散板、四脚垫与铰接分层保留。营销图相机未知、微小图标和壳厚仍估算，视觉为执行者核验，用户尚未确认。

## 已通过的生产检查

- 独立作者预检与发布：27稳定身份、源尺寸／单位、材质、网格法线与坏数据负例；见[contract](contract.json)、[negative](preflight-negative.json)。
- 正式HTTP与file构造／GLB导出，以及Blender回读部件世界边界、材质alpha，见[readback](readback.json)。
- 三机位实际Cycles渲染及下载工程重开，见[reopen](reopen.json)与report阶段。曝光验证由硬编码0修正为读取实际GLB的lighting.exposure并严格断言log2值，同时验证世界背景；旧无元数据仍0。
- 专项Node：18种高度／旋转／镜像实际Three顶点与数值生产实体一致；两块面光不受实时单灯预算截断；关灯无光源；导出无重复替身；项目反复恢复。
- 书桌deskLampVisible新建／旧缺失不物化，显式false改变生产实体缓存／空间确认；同型保留、跨型清理，当前／命名／库与v90缓存恢复；纯颜色／价格不清确认。
- 增量既有回归：product-rules、workspace-cache、work-state、lighting-preview、furniture-production-solids、furniture-solids-coverage与820项cache鲜建对照通过。

## 应用入口与问题复盘

HTTP与file均通过创建、底部离地、撤销重做、独立缓存恢复、27部件生产GLB及双发光面；见[记录](http-file-checks.json)、[HTTP](http-lamp-export.json)、[file](file-lamp-export.json)。早期桌面测试在尚有待写内容时调用reload，触发beforeunload保存流程，自动化超时；测试改为显式flush并等待pending=false后刷新。该次失败保留于本机output/desktop-verification/desk-lamp-NaqqtV/failure.json，不视为桌面通过。

修正测试后，桌面EXE保存／刷新和实际128spp高清预览通过（desk-lamp-hwsbxx）；原始正式文件哈希在隔离测试前后相同。执行者目视发现灯头靠近罗马帘，再向桌面中间移100mm，最终位置与复验见[应用记录](application.json)。

未运行全量check；未验证连续机械行程、真实设备联动、实验室照度或护眼认证。

最终桌面位置复验见[result](result.json)与[实际高清预览](reading-light.png)，[正式GLB面光记录](desktop-lamp-export.json)。`main`收尾前已重新通过MCP、仓库版本兼容／启动恢复、目录与资产索引回归；该桌面隔离测试前后正式文件哈希相同。
