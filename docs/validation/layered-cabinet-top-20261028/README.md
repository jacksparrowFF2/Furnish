# 玄关、餐边与洗衣上柜顶封验收

沿用用户已确认的50mm封板和10mm门顶退让；专用构造与范围见 [规范第12节](../../CABINET-DESIGN-STANDARD.md#12-分层柜与洗衣上柜的顶部构造2026-10-28)。原完成高保持，门板覆盖门后封板。特殊分层语义由项目／工作区v29保护，普通柜v27、箱组v28及旧缺失值继续读取。

当前应用：

| 对象 | 完成总高／安装 | 柜箱高 | 实际门顶 | 顶封结构 |
|---|---|---:|---:|---|
| 970宽置物台玄关 | 总高2350 | 2300 | 2340 | 1段正面板 |
| 1860宽餐边柜含冰箱 | 总高2420 | 2370 | 2410 | 两段正面板＋1块深度交接返板 |
| 1204宽洗衣上柜 | 离地1800、总高600 | 550 | 绝对离地2390 | 1段正面板，整体总顶2400 |

餐边柜储物上深350、冰箱深630；交接返板18厚、262深，三块顶封不相互穿插。冰箱835净宽、1920净高不变；台面、开放区、展示区标高保留。盖法由原嵌入式改全盖，门抽外面板宽度随之更新，内部净宽和功能配置保持。玄关落地鞋位无底板的已验收做法保留；实际柜箱高度不同不自动共侧板。

通过范围：

- 32个Node文件：`layered-cabinet-top-closure`、`cabinet-model`、`cabinet-top-closure`、`cabinet-box-groups`、`cabinet-independent`、`cabinet-overlay`、`cabinet-section-doors`、`cabinet-shelf-clearances`、`cabinet-opening-3d`、`cabinet-opening-volume-model`、`cabinet-drawer-joints`、`cabinet-dimensions`、`cabinet-palette`、`entry-shoe-floor`、`laundry-cabinet`、`kitchen`、`project`、`project-validation`、`project-recovery`、`workspace-cache`、`work-state`、`repository-workspace`、`spatial-review-cache`、`replacement`、`generator-part-identities`、`furniture-production-solids`、`kitchen-wall-adjust`、`kitchen-overlay`、`laundry-integrated`、`laundry-basin-joins`、`laundry-notch-closure`、`repository-storage`。
- 新几何18组，覆盖12／18／30板厚、冰箱左／右、相同／不同深度、正面板与返板无体积重叠、生产板件及唯一身份、原下段功能标高、精确门顶和净空、v29当前／命名方案往返、重复恢复不漂移、附属上柜安装和主柜总高。
- 0／37／90°及镜像下，上部门板接触阈值与穿入1mm；颜色保持空间确认，构造改变失效。总高相同而箱体顶不同的共侧板回归。
- 修改／新增JS语法检查及文档链接、差异检查。
- HTTP及断网file://专用柜专项：当前三种柜体、无改动保存、参数15mm试改、撤销重做、v29刷新、生产门顶、父子草稿保存、子柜设置入口的鼠标／键盘、390px及无浏览器异常。[浏览器证据](browser.json)
- 原普通柜顶封及柜体工作区浏览器专项通过HTTP／离线，含原父级导航与附属柜草稿。原始记录为本机 `verification-ltJc6Q`；最终专用柜／键盘专项及截图为 `verification-fJyFXX`。
- [当前实际板件及恢复](current.json)：三处目标修改与预期一致，历史命名方案保留，完整工作区重复parse／text无漂移。当前厨房布局及图层有后续用户编辑，保留在工作副本，不纳入本次数据提交。原始备份在 `D:\1601装修\.codex-tools\layered-top-20261028\workspace-before.furnish.json`。

已目视 [玄关](entry.png)、[餐边柜](sideboard.png)、[洗衣上柜](laundry.png)、[窄屏](mobile.png)。截图是隔离验收中将退让改为15mm的可调能力检查；当前真实方案仍为10mm。测试不向真实工作区服务写入验收数据。初次验收暴露内层整体设置入口不可达，已新增专用入口后复验通过。

未执行全量check、Blender、整屋导出、真实修边、设备散热和逐五金自身干涉验证。烟机嵌合、纯洞洞板和厨房父组合不套用此顶封；返板不代替固定节点和实际铰链选型。通用检查脚本中没有`test-kitchen-wall.cjs`，实际使用对应的`test-kitchen-wall-adjust.cjs`及相关厨房回归。
