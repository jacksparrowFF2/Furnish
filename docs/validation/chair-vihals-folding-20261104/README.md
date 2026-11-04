# VIHALS 折叠、配色与柜内收纳复核

2026-11-04，执行者Codex。沿MODEL-VISUAL-REVIEW模板的参考解读→固定相机→轮廓／结构／材质→生产复核执行；未额外增加逐轮用户审批。适用白色90592738官方源衍生的展开／折叠端态及自定义预览颜色，不宣称连续真实连杆或其它型号。

## 来源、版本与坐标

实际重新打开[官方折叠尺寸图](../../../assets/models/chair-vihals/references/1391724_pe965844.jpg)及[折叠场景照片](../../../assets/models/chair-vihals/references/1414874_pe974960.jpg)，并对照上次已归档的背侧近照。完整来源与原件SHA256见[asset.json](../../../assets/models/chair-vihals/asset.json)。图上折叠高880／深90，原网格实际折起约895.648／89.081；差异不隐藏。折叠照片中的座面应在靠背下方，两道U框收拢，座面底壳／包边仍可见，销钉和侧铰片保留；隐藏机构与准确轴心未知。

上一有效源为v1，保留。新源v2：[展开作者工程](../../../assets/models/chair-vihals/v2/chair-vihals-v1.blend)、[折叠端态副本](../../../assets/models/chair-vihals/v2/chair-vihals-folded.blend)、[GLB](../../../assets/models/chair-vihals/v2/chair-vihals-v1.glb)。源／程序／相关源码指纹及阶段结果见[pipeline-batch.json](pipeline-batch.json)、[pipeline-report.json](pipeline-report.json)。Scoop current Blender5.2.3 LTS，OptiX／RTX4070Ti SUPER；米制网格，Furnish(x,y,z)转Blender(x,-z,y)。

## 固定相机与阶段复核

[review-camera.json](review-camera.json)：65mm透视，Blender位置(1.15,-1.95,1.20)m、看向(0,0,0.4)m，640²；Cycles24采样、AgX曝光0、同世界／两面积灯。对参考可见面近似匹配，照片内参与灯光未知。前后图未换相机／曝光，正式三机位另由生产联合包络取景，不称其匹配了照片。

| 阶段 | 实际打开的前后图／参考 | 执行者复核 |
|---|---|---|
| 轮廓 | 官方折叠照片、[第一版](folded-before.png) | U框基本收拢，宽430、深约89；实际高约896，保留约16mm差异，按较大外包核对 |
| 结构 | [第一版](folded-before.png) → [修正版](folded-after.png)，[前局部](detail-before.png)／[后局部](detail-after.png)、[灰模](folded-gray.png)／[侧面](folded-side.png) | 第一版座面过高，穿入靠背；座组额外下移80mm后位于靠背下方，保留原座面、铰片刚性形状。通过静态目视；80mm为照片近似，非已验证滑轨参数 |
| 材质 | 同几何[灰模](folded-gray.png) → 修正版白色、[正式折叠生产图](production-folded.png)、[柜内绿色](live-cabinet-green.png) | 保留原贴图、PP／钢架层次与暗色销钉，颜色在生产模型中生效；销钉／轴不随主体乘色。通过预览配色复核，不代表厂家色卡 |

本轮只处理最多三项主要差异：座面与靠背交叠、端态包络／承托、主体配色传递。没有按“相似度”自动认定通过。近看保留官方低模的少量折面／细节不足，未凭图片补造连续机构。

参考照片[座背裁图](reference-crops/folded-seat-back.png)为原900²图像的(270,100,430,480)像素框；前／后局部为各640²渲染相同(210,70,230,340)像素框，没有非等比拉伸。侧面补图相机为(2.7,-0.2,0.9)m、仍看向(0,0,0.4)m，65mm；首个侧面取景裁掉顶部，已扩大相机距离重渲并实际检查全物体入镜，不将其当作主相机前后对比。

## 技术及实际恢复验证

| 范围 | 结果／证据 |
|---|---|
| Blender三组具名父节点、角色／枢轴／轴向／单位／材质负例、独立发布 | 通过，流水线报告；展开源与折叠源分开，不能用折叠副本替代闭合作者发布 |
| 开／折刚性部件长度、非等比改尺寸后旋转、0／68／700承托高、旋转／镜像，真实Three与数值生产顶点边界 | 通过，test-folding-chair-state及流水线geometry-state |
| 实际柜板：净高1050可容纳、900仅余4.352，等于模型高接触、低0.1mm穿层板、低0.1mm穿底板、展开椅不能放入350深柜 | 通过；不增加空腔或包含豁免 |
| v47当前／命名方案／家具库／工作区／缓存；旧v46恢复、旧缺失保持展开不补字段，三次恢复无漂移；替换清理 | 通过，专项及缓存／版本兼容／工作区回归 |
| 状态／安装改变确认失效，配色／价格／采购不清空间确认 | 通过，定向fingerprint回归；本型号geometryVersion2 |
| HTTP与断网file两端态、真实生产GLB逐片回读、OptiX正面／斜视／折叠、下载工程重开 | 通过，流水线报告及[正面](production-front.png)、[斜视](production-oblique.png)、[折叠](production-folded.png) |
| 真实桌面折叠、颜色、承托控件及锁定、撤销重做、保存刷新、3D | 通过，[desktop-summary.json](desktop-summary.json)，同一打包EXE独立副本／缓存／端口，正式文件前后哈希相等 |
| 真实桌面配色后GLB的15个对象材质槽、PBR颜色乘数、512²贴图和UV | 通过，[colored-pbr-readback.json](colored-pbr-readback.json)，读取实际material_slots并沿Base Color上游检查乘数；销钉／轴保留白色因子 |

可复用桌面检查入口为`node tests/test-folding-chair-desktop.cjs <只读正式文件路径>`，内建独立柜格fixture，不依赖本机临时数据。该控件／配色导出检查在模型流水线后独立完成，没有修改运行几何。源工程和下载工程的基础身份／边界仍由流水线回读覆盖。

## 用户方案中的收纳展示

通过Furnish MCP复制原“主卧调整2”为 **VIHALS折叠椅 · 柜内收纳展示**，原方案完整内容比较未变；回执均applied:true、persisted:true。副本在“整墙A · 工具450＋风扇900＋叠凳900 · 深350”右侧900柜格新增绿色椅子，底部mountHeight=68、中心(9931,7965)、旋转90°。右格第一层板从相对净高900上移到1050，仅打开该格双门。

最终保存与原方案内容审计见[live-storage-audit.json](live-storage-audit.json)；刷新后再次用MCP核对折叠状态、配色、承托高度和展示副本均保持，恢复了柜内取景。

生产板件核对：左右各217mm、顶部154.352mm、底部0mm，当前椅子实体无穿板；MCP focusIds椅子核对0问题／0待定。[实际桌面画布](live-cabinet-green.png)。模型约430×89.081×895.648mm，源图880mm只作资料值，未用更小值证明适合。

展示打开的整墙A柜门使相邻“玄关柜二”门／抽屉操作区新增两项冲突提示，保留算法结果；不同时使用相邻门抽或先关闭展示柜门。它们不是椅子本体与板件重叠，不将“椅子当前无碰撞”扩张为“全案无问题”。

## 边界与未执行

连续连杆轨迹、完整折叠扫掠、自碰撞全过程、实物机构／公差、承重、其它型号整链路和项目全量未执行。只有两个静态端态；柜内放得下不表示能在柜内展开。U框等非凸结构仍有既有凸截面保守边界；自定义颜色是乘色近似，明亮颜色受兼容PBR上限影响。执行者看图通过，用户尚未确认视觉还原度。
