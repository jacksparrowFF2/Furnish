# 置物台柜固定层板拖动

2026-11-06。用户指出：上柜内部层板能拖动，下面的下柜底层板不能拖动。上方是`columns[].shelves[]`活动层板；下方是由entry分层尺寸生成的固定结构板。原生产构造器没有为entry固定板提供可选取身份，预览拖动也只接收层板／竖隔板，所以点击下方板件不能进入同样的调整流程。

## 本次行为

固定结构板保持其类型，新增可选取及拖动身份，不伪装成可删除／复制的普通层板。三块边界板共用`structuralBoards`／`editStructuralBoard`：

| 板件 | 调整内容 | 保持的相邻边界 |
|---|---|---|
| 下柜底层板 | shoeHeight增加时lowerHeight等量减少 | 置物台及上柜位置保持 |
| 置物台板 | lowerHeight增加时nicheHeight等量减少 | 上柜底层板位置保持 |
| 上柜底层板 | 调整nicheHeight | 下方置物台及总高保持 |

普通层板位置、板厚、总宽／深／高不随结构板拖动改变；相关柜门与背板由原生产构造器联动。已有下柜门下延量独立保留。仍按原结构规则保留下柜最小高度、层板40mm间距、抽屉占高、上柜保留高度和门下沿限制。这些是既有软件构造限制，不是厂家工艺或铰链规格。

若底部自动中层板启用，它仍随开放区总高保持二分，不单独改成活动层板。因此下柜底层板的下方净高与shoeHeight按0.5倍变化，净高输入／范围使用同一系数；当前用户取消中层板时按1倍变化。

真实鼠标拖动、方向键、10mm吸附／Alt跳过吸附、Escape撤回本次拖动均沿原预览链路。结构板上下净高和板底相对柜体底部位置可输入；位于柜体编辑草稿内，保存仍是一次mutate／撤销。餐边柜既有结构板也接入同一拖动入口，不改变它的原联动规则。

没有新持久字段、默认尺寸、项目版本、脚本加载或保存通道。结构变化沿已有entry尺寸、完整cabinet缓存／确认及实际生产板件传递。原site-30板件和循环身份保留，只补充cabinetInspect标签；自动中层板不获得错误的独立拖动身份。

## 验证

- `tests/test-entry-structural-drag.cjs`通过：真实生产板件的标签／身份／上下表面、三块边界联动与固定邻居、自动半层净高换算、精确最小／最大范围、不可变编辑、实际板件位置、离地／旋转／镜像、缓存／确认、当前／命名项目及重复恢复、餐边柜回归。
- `tests/test-entry-structural-drag-ui.cjs`通过。Chrome使用同一正式生产预览及隔离真实repository保存服务，实际部件树选取、鼠标拖动、边界停止、Escape恢复、方向键、一次保存／撤销重做、刷新、窄屏、餐边柜联动及无页面错误。报告`output/playwright/entry-structure-EqbCbt/result.json`，已查看`dragged-board.png`。仅在隔离副本改高度，正式方案没有被拖动测试改写。
- `output/model-pipeline/selection-KV1f5c/batch.json`通过：新增`cabinet--entry-console-structure`验证配置，以实际核心编辑后的柜体测试HTTP／断网file生产、门端态、逐板身份／边界Blender回读、三机位GPU及下载工程重开。参数化模型保留原生产路线，不另造静态作者模型。
- 既有`test-cabinet-shelf-clearances`（426组数值编辑及生产表面）、`test-entry-console`、`test-entry-door-drop`、`test-entry-editor`、`test-cabinet-model`、`test-cabinet-opening-3d`与`test-entry-open-bay`通过；未运行全量检查。

桌面复验：原项目目录中的Electron在提供调试接口前原生退出（0x80000003）。相同EXE及资源复制到D盘独立目录后正常；未关闭沙箱、未替换Electron版本、未重置项目ACL。`tests/test-entry-structural-drag-desktop.cjs`随后通过实际打包EXE的鼠标拖动、取消、键盘、保存／撤销重做、刷新与窄屏检查；报告`output/desktop-verification/entry-structure-mXxHRO/result.json`，已查看同目录截图。正式桌面和MCP已恢复，用户缓存沿原链路自动恢复并保存，未用测试方案覆盖。恢复细节见[桌面启动故障](DESKTOP.md#2026-11-06启动目录故障恢复)。早先失败诊断保留，不清理未知任务目录。

施工验收未执行；拖动固定结构板会改变相邻柜箱空间及门板长度，具体柜体结构与五金应由加工方复核。
