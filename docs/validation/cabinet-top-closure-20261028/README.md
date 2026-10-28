# 顶封板与门顶退让验收

依据用户确认：封板50mm、门顶退让10mm；阳台局部图显示封板位于18mm柜顶板之上，门板遮盖封板，门顶距整体完成顶10mm。[完整构造及能力边界](../../CABINET-DESIGN-STANDARD.md#10-顶部封板与门顶退让2026-10-28)

生产模型将总完成高和柜箱高分开。启用保留完成高、位置、内部层板／抽屉及门分配，仅柜箱及顶板上界降低50；门底保持，门顶精确为完成高减10，包含历史1mm边缝，不再多扣成11。封板位于门后，独立箱各一段，跟随箱体接缝；侧见光板若存在保留完整完成高度。普通模式之外的专用分层／厨房组合没有开放此通用开关。

通过的增量检查：

- 28个Node文件：`cabinet-top-closure`、`cabinet`、`cabinet-model`、`cabinet-independent`、`cabinet-overlay`、`cabinet-opening-3d`、`cabinet-opening-volume-model`、`cabinet-shelf-clearances`、`cabinet-module-widths`、`cabinet-edit-operations`、`cabinet-design-upgrade`、`cabinet-custom-fronts`、`cabinet-dimensions`、`cabinet-workspace`、`cabinet-palette`、`tv-floor-overlay`、`cabinet-drawer-joints`、`project`、`project-validation`、`project-recovery`、`work-state`、`workspace-cache`、`repository-workspace`、`repository-storage`、`spatial-review-cache`、`replacement`、`generator-part-identities`、`furniture-production-solids`。
- 新构造覆盖共享／独立柜箱、12／18／30板厚、50封板与10实际门顶、柜箱顶板高度、端饰面、实际板件记录、门板尺寸、内部净高、整柜高度缩放、v27当前／命名方案往返、重复恢复不漂移、旧缺失不物化，以及替换模板清理旧构造。
- 0／37／90°及镜像的门顶相接与穿入1mm；空间确认随构造改变，单纯改色保持。
- 13个修改／新增JS文件语法检查。
- HTTP及断网file://两项浏览器专项：`cabinet-top-closure`和`cabinet-independent`，覆盖启用默认50／10、会话撤销重做、取消、保存、应用撤销重做、v27缓存刷新、生产封板／门顶读取、独立柜箱原链路、390px及无浏览器异常。[顶部专项证据](browser.json)
- [当前三柜实际板件及数据检查](current.json)：共11段50mm封板，三组门顶均为完成高减10；其余布置、命名方案及内部列数据相对修改前保留。工作区完整parse／text重复恢复无漂移。
- 当前8765本地服务已加载支持v27的校验代码，GET工作区返回v27及三组50／10设置；只读核对，没有向真实服务写入验收数据。

当前结果：

| 柜宽 | 完成高 | 柜箱高 | 门顶 | 分段封板数 |
|---:|---:|---:|---:|---:|
| 4161 | 2450 | 2400 | 2440 | 4 |
| 1637.5 | 2350 | 2300 | 2340 | 4 |
| 2250 | 2350 | 2300 | 2340 | 3 |

已目视 [闭合门板](closed.png)、[开启后结构](open.png)及[窄屏](mobile.png)。原始通过记录在本机 `output/playwright/verification-pQ1jBB`；更早一次浏览器专项用浮点严格相等比较2449.9999999999995与2450，修正为0.001mm容差后通过。仓库保存测试首次被沙箱阻止本地网络，授权后通过。没有名为`test-repository-core.cjs`的文件，实际运行对应`test-repository-workspace.cjs`与`test-repository-storage.cjs`。

未执行全量check、Blender、整屋导出、实机触屏或真实加工。未测房顶起伏、修边／固定节点和五金孔位，不将名义10mm当作所有房顶都能开启的保证。原始工作区备份留在 `D:\1601装修\.codex-tools\top-closure-20261028\workspace-before.furnish.json`。其他用户改动保留，提交的工作区差异只包含三柜构造和外层／缓存版本。
