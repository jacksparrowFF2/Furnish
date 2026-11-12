# 1601厨房检修结构与编辑器增量验收

2026-11-12，Codex执行。定制柜体参数化扩展，保留已有用户方案和仓库未提交装修数据。功能与参数见[契约](../../CABINET-KITCHEN-SERVICE.md)。未运行全量 `scripts/check.cjs`。

## 参考与视觉复核（按模板裁剪）

本轮不是固定产品外观精修。沿 `MODEL-VISUAL-REVIEW` 保留来源、可见特征、模型假设、生产检查和未知项；没有声称新建Blender资产、匹配参考焦距或完成照片材质还原。参考尺寸均不直接套录1601。

实际看过小红书卡扣图、碗碟抽上方薄托盘第1图、灶柜细节第1–3图。来源完整参数保留在契约。三项识别特征分别对应：`plinth` 的四脚／U形卡扣／独立薄前板；`bowls-B.innerTray` 的分格薄托盘和独立运动节点；`hob-hidden-fascia-B` 的真实孔、上延抽面、后退空气通道及单独水平隔板。

第一轮实际应用图发现：无底柜侧板仍落地；推车门150°会撞开启的B抽面；低机位看不到薄内抽。分别修正仅新地脚模式的侧／背起点、改90°限位，并使用较高的抽拉展示机位。第二轮检查关闭状态的进风路径，保留11mm前缝和18mm后通道。没有把原来被盖住的板上有孔等同于通风已合格。生产关闭／抽拉／拆卸图均实际查看；颜色延用原方案，未进行材质A/B或实物相似度评分。

## 通过项

- `test-cabinet-service-details.cjs`：42个孔的实际Three射线、孔间实体及数字板件；15种内外抽组合、内抽点击与独立状态；拆前板保留12个地脚部件；整抽拆下后可继续编辑和恢复；370净宽无底／无地脚入口；旋转、镜像、离地偏移；v86当前／命名／库／仓库／缓存及重复恢复；无关配色与采购不影响空间语义。补充拒绝标量孔／内抽配置和脚盘重叠的过浅柜箱负例。
- `test-cabinet-service-ui.cjs`：HTTP、断网file、实际打包EXE的独立目录／缓存／端口；真实编辑透气孔、草稿撤销、拆装踢脚与抽屉、内抽开度、390px、一次应用撤销重做、保存刷新、正式生产GLB稳定唯一身份。核心几何实现的三入口结果：`output/desktop-verification/cabinet-service-M4Vbe8/result.json`。最终布局参数另运行HTTP专项 `cabinet-service-RmlsWO`；之后新增的非法输入边界只重复核心定向负例，不扩跑全量界面。
- 相关增量回归：`test-cabinet-builder`、`test-cabinet-builder-open-zones`、`test-cabinet-builder-editing`、`test-cabinet-native-independence`、`test-kitchen-plinth`、`test-kitchen-dish-basket`、`test-product-rules`、`test-work-state`、`test-project`、`test-project-validation`、`test-repository-version-compat`、`test-workspace-cache`。
- 原水槽柜排除踢脚后的7块板件几何保持一致。厨房独立组合在关闭、抽拉、检修三种配置均没有新增柜间实体交叉。
- 独立只读路径审计：车日常停车不碰踢脚；拆踢脚后直移1200及侧移1497、10mm步进、271姿态无柜体实体碰撞；未拆踢脚的负例确实碰撞。分水器闭合及检修状态均无柜体实体穿入。
- Blender 5.2.3 LTS独立回读最终参数HTTP正式生产GLB：178个厨房网格的家具ID＋部件键唯一，导入面无退化，世界边界最大误差0.0002385mm，见[机器结果](blender-readback.json)。这是参数化柜的传递检查，不是固定产品新资产发布或实物外观评分。

正式方案只调整厨房与小推车两件记录；最终恢复日常关闭，C踢脚及B底板／两抽均装回，推车停在柜内。正式读回与原有159件家具比较及保存回执另记录在机器报告。

可复验命令：`node tests/test-cabinet-service-details.cjs`、`node tests/test-cabinet-service-ui.cjs`。取得本轮或新生成的 `service-http.glb` 后，使用本机Blender执行 `--background --factory-startup --python-exit-code 1 --python docs/validation/cabinet-service-20261112/readback.py -- <GLB> <结果JSON>`；脚本只核对夹具厨房ID，不混入地面等建筑节点。实际程序为 `%USERPROFILE%/scoop/apps/blender/current/blender.exe`。

## 实际图与边界

三状态图保存在本机聊天可写目录：

- `C:/Users/SPH/.codex/visualizations/2026/11/11/01a1cb6c-586f-78c0-bb18-b12355d83b42/kitchen-v4-closed.png`
- 同目录 `kitchen-v4-open.png`、`kitchen-v4-service.png`；另保留推车刚滚出时的 `kitchen-v4-rollout.png`。

正式应用的厨房专项仍有原有两条竖管切孔提示、占墙及超出房间提示，未冒充无问题；这次不移动建筑或设备解决历史边界。推车刚滚出时会占据柜门完整扫掠，移至操作区外后这些临时提示消失。实际关闭和检修最终取图均只保留上述四项原有提示。

未执行：实体五金、加工孔位、连接承重、气流／燃气安装合格判定、脚轮完整回转、柔性管变形、人体实机试用、整组分水器替换行程、固定产品独立发布及材质精修。卡扣、脚及内抽板厚为模型示意；C没有落地脚，需要两侧柜箱连接承托。厂家灶具净距与接口仍待核实。
