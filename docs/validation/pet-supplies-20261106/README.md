# 猫水碗／猫砂包装：视觉与调研复核

本记录按MODEL-VISUAL-REVIEW模板裁剪至两个静态小物件。2026-11-06新建；旧占位体仍留在历史方案，不把此前的方块当作商品模型。

## 参考解读与未知项

| 参考 | 实际打开的原图 | 可确认特征 | 尺寸与未知 |
|---|---|---|---|
| 水碗 | assets/models/pet-bowl/references/user-dimensions.png | 低圆筒、奶油外壁、灰银金属内胆与圆唇、明显凹腔 | 用户图65高，跨口箭头180；R字样不规范，暂按直径。隐藏底部、壁厚及水量未知 |
| 猫砂 | assets/models/litter-bag/references/mix-packaging-family.jpg | 同系列白蓝软包装、Mix／2.5kg、上部封口 | 同系列营销图，不保证同SKU批次；不以透视图推厂家尺寸。初版300×400×100为布局假设；最终v4改用用户提供的250×220×80 |

参考原图SHA256、字节数及来源URL记录在各产品asset.json。只采用可辨认文字，未将促销标签、广告功效或无法辨认的小字刻入模型。图中猫粮不建入水碗，水面另作不透明PBR示意。

## 识别特征及阶段看图

水碗用独立外壳、闭合薄内胆与圆唇表达轮廓、遮挡及反射；轴心使用共享单顶点扇面，没有中心重合顶点／退化环。内胆中心底面10、口沿65已用实际生产射线分别检查，水面49不填满整个碗体。底部胶垫形状为估算。

作者阶段用Cycles／24 samples／800²，同一模型机位生成clay-front和material-front，再转反面观察。水碗近似机位Blender坐标(.20,-.32,.23)m、目标(0,0,.032)m、正交比例.27m；无参考相机参数，未做像素配准，照片中的透视和猫的遮挡不作为尺寸依据。

猫砂作者机位(.45,-.65,.62)m、目标(0,0,.05)m、正交比例.57m。v1印字只变换轮廓顶点，曲面弦面低于袋面导致字样局部被遮挡；v2细分字面后恢复可读；v3减少不影响识别的曲面及字面采样、适当抬升字面，保持清晰，离线资产约1MB。v1、v2、v3的同机位material-front图和源工程保留。最多两项差异：印字完整性、重复显示成本；未宣称包装营销图精确复刻。

已实际打开水碗灰模／材质正面、包装v1/v2材质正面以及正式生产GPU斜视与背视：水碗口沿、凹腔和物理分区可辨，包装软袋、封边、Mix可辨；印刷图案、底部结构和批次对应仍是简化／未知。未把未执行的精确相机匹配写为通过。

## 小红书文字调研

使用Agent Reach工作流的公开搜索＋已连接小红书读取工具。两次站内搜索共12条结果，读取5篇正文；以下只归纳已读文字，没有读取笔记图片／视频或评论，不声称看过对应实拍图。全部链接沿同条搜索结果保留完整访问参数（xsec_source为空也保留），没有猜造或删除token。

- [《猫砂包怎么收纳？8kg猫砂补砂只走2步》](https://www.xiaohongshu.com/search_result/6ab12366000000003300f925?xsec_token=AB3R48AsCixupRbQJ2fA7jd2TOb4o5J40KLOQ7GsmezA4=&xsec_source=)：作者建议库存与日用分开，库存放干燥低位并加托盘，日用小桶靠近猫砂盆，量拉出通道及开盖空间。该文对象为约8kg大袋，不能直接把它的日用量和桶规格套给本案2.5kg袋；低位与减少搬动的思路可用。
- [《我简直是天才》](https://www.xiaohongshu.com/search_result/69d073cd000000001f006abc?xsec_token=AB5VzEmRlOB2TlHg39w46A-12ylczCBCWMP1UK0IRDcJs=&xsec_source=)：作者文字说明把囤货放在猫砂架底部深处，前部保留机器人清扫。这里只能借鉴低位利用和留清洁通道，未取得额定承重、材料或实际安装结构。
- [《猫砂盆上置物架，爱囤猫砂猫粮的我太需要了》](https://www.xiaohongshu.com/search_result/688ed31d000000002302cf53?xsec_token=AByaEulUPDxWO-fxfKH-pIEcQ82pb8vxaIdD4CLFvzBOY=&xsec_source=)：82×40cm角落的DIY设想，作者明确尚未做完，不能当作已验证成品或承重案例。
- [《阳台绿植花架+自制猫砂柜分享》](https://www.xiaohongshu.com/search_result/6aca3e11000000001802ad6f?xsec_token=ABBOH2I-xC45w5E3T8jmvw0YAE53nfBcq81ZllU70m7DQ=&xsec_source=)：70×40×80cm置物架拆层板改猫砂柜，是猫砂盆 enclosure 的个人案例；并非囤货架的加载证明，不据此选金属管规格。
- [《猫砂封口妙招✨》](https://www.xiaohongshu.com/search_result/6a50cad900000000110055f1?xsec_token=ABJGyNGIUqBYPqh_yeocgCHZh9y8JsFeUTznxaCNA42ps=&xsec_source=)：说明开封后的防潮需求；未验证其加热封口办法，不将该方法作为本案建议。当前保留原包装／可靠封口及独立日用收纳的方向。

本案选择为设计推断：柜底存库存，饮水区独立，包装按实际尺寸再定排列；不因点赞数、架子外观或作者的“稳固”描述认定承重通过。原2.5kg小袋可按袋取用，不强制额外购买大桶。

## 技术与生产复核

独立后台Blender 5.2.3 LTS，实际路径沿Scoop current发现；未修改活动工程。作者预检与独立发布均通过。两配置已登记生产清单，整链路报告`output/model-pipeline/selection-ByHSny/batch.json`两款均passed：作者及负例、独立发布、几何／空间、HTTP与断网file生产导出、逐件Blender回读、正式studio导出、GPU正面／斜视／背面、下载BLEND重开。

`test-pet-supplies.cjs`覆盖源哈希、实际外包／凹腔／金属材质、离地、缩放、旋转镜像、外部间隔／完整包含／高度分离、v53当前与命名方案、重复恢复、替换及十袋与实际柜板净空。最终十袋按用户提供外包尺寸排布；不是包装压缩或堆放稳定性结论。

MCP的get_furniture_parameters新增只写动作replacementCatalogKey，值必须来自当前家具库。configure沿共享replaceFurniture、原批量预演／锁定／mutate／撤销／flush，保持ID及中心并用新品规格；不持久化动作键，不接受任意type或obj注入。相关专用桌面测试在独立打包EXE工作区执行。

`test-pet-supplies-desktop.cjs`通过，报告`output/desktop-verification/pet-supplies-xttwpV/result.json`：单次替换保持ID／中心／朝向，新品规格覆盖旧占位，动作键不持久化、内置模型不伪造个人库身份、撤销重做、无效批次原子回滚、锁定拒绝和保存刷新恢复。最初误把新生成家具ID当作个人库ID，被原项目校验拒绝，已修正；没有放宽校验。静态浏览器夹具没有正式保存服务，不能用于MCP写入验收，故该专项使用真实隔离EXE；HTTP／断网file的模型验收沿整链路执行。

正式MCP已复制并保存「客厅宠物柜 · 水碗与十袋猫砂模型」：水碗／托盘前移70mm（cx9840、cy5870），在面对柜墙的喂食器右侧；十袋中心cx9856、两列cy6206.408／6516.408，底标高18／118／218／318／418mm，各列五袋；总模型包络610×400×500mm。原大占位替换为第一袋，未留下重复大方块。正式写回均persisted:true，局部核对无提示。储砂门打开作展示；其余用户结构和历史命名方案保留。

同一正式文件只读副本在相同打包EXE、独立工作目录／缓存／端口下重新查看，截图`output/desktop-verification/pet-model-plan-HTYJB4/water-position.png`和`pet-model-overall.png`已实际打开，水碗、托盘与十袋可辨；`result.json`记录正式文件前后哈希一致。正式原生相机请求未完成等待，因此最终视图证据来自该正式保存副本，而非宣称原生截图成功。全屋原有29项需处理、12项信息不足仍存在，不能把宠物区局部核对当作全屋通过。

未做厂家包装实测、承重计算／加载、精确摄影配准或全项目全量检查。玻璃折射、可用水量、纸塑包装真实压缩与堆叠稳定性均不在模型能力内。


## 用户补充尺寸后的最终版本

用户补充“2.5公斤猫砂袋装的尺寸为25 *22 *8”，按cm理解为250×220×80mm，优先于原先布局估算。原文另存产品references/user-dimensions.txt并记哈希。猫砂v4在新目录重建；外形按用户外包修改，印刷和软包装细节仍为同系列视觉近似，未称厂家实测或批次精确复刻。旧v1/v2/v3及先前方案保留。

正式当前方案十袋已全部更新250×220×80，两个中心cy6231.408／6491.408、cx9904，底标高18／98／178／258／338mm；总包络510×220×400，25kg不变。储砂柜深恢复350、cx9931，与原柜墙齐平；第一块层板相对柜底板顶500，形成500净高，新增该板后层板列表500／1000／1550／1900，上方收纳回收。当前低位仍为板底0直接落地；不把减小包装尺寸当作免做防潮／稳定性和承托检查的依据。MCP更新均persisted:true，局部空间核对无提示。先前500深／1000净高、两列155mm偏移等记录仅为用户补尺寸前的阶段，不再代表最终方案。


最终猫砂v4整链路重跑报告`output/model-pipeline/selection-tYGQGi/batch.json`为passed；GPU实际为OPTIX／NVIDIA GeForce RTX 4070 Ti SUPER。更新默认尺寸后的桌面替换／保存测试报告`output/desktop-verification/pet-supplies-8H7btd/result.json`为passed。最终正式保存副本定位图与全景`output/desktop-verification/pet-model-plan-LYiMRr/water-position.png`、`pet-model-overall.png`已实际打开，源文件前后哈希一致；该阶段全屋界面提示为30项需处理／12项信息不足，局部宠物区核对无提示。旧阶段29项的数字只对应当时快照。后续金属架／抽拉板作为新方案继续设计，不把此阶段模型交付记录当作已完成金属架。
