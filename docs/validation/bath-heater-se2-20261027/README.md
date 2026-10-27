# SE2 风暖浴霸增量验收 · 2026-10-27

通过：`test-bath-heater-se2.cjs`检查目录、品牌型号、300×600×112 mm实际生产外包（箱体110＋面板近似2）、最低点、有限顶点与法线、五道格栅／柔光板／显示区、部件身份唯一及真实Three与数值实体范围一致；0／37／90／180°及镜像；完整格贴合、等于0.1／超出0.1 mm、错误方向／尺寸／标高、未知高度，以及当前／命名项目三次恢复无漂移。

相关增量回归通过：ceiling-panel-devices、ceiling-panel-layout、product-rules、enclosed-boundary-distances（91目录类型×8变换）、work-state、project、project-validation、project-recovery、furniture-solids-coverage、furniture-production-solids、blender-part-identity、blender-model-identities。覆盖原通用浴霸、外部距离／完整包含／局部重叠／高度分离、实际实体及项目校验。最初误用两个不存在的测试文件名；已按实际脚本名称补跑通过。

`node scripts/verify/verify-bath-heater-se2.cjs`：仅复制源码／固定夹具至静态隔离副本，仅生成SE2生产预览，未读写真实工作区项目。HTTP与离线file://均通过预览、目录新增、自动整板安装、相邻筒灯冲突、整格二维开口、重新安装、撤销重做、主三维方向缓存重建、390 px操作、刷新、真实项目下载再导入和删除恢复。结果见[results.json](results.json)。

视觉证据：[发光面](http-front.png)、[斜视](http-side.png)、[吊顶安装](http-installed.png)、[窄屏属性](http-mobile.png)，file模式也保存对应截图。生产预览最初相机过近，视觉检查发现裁切后已调整机位并重新采集。

未运行全量check.cjs及无关历史预览；未验证实物、厂商配光、热工／风量或Blender Live Sync实际传输。≥130 mm是用户图要求，当前仅提示、不自动校验；面板厚2 mm、机身缩进及细节为近似。详见[模型说明](../../BATH-HEATER-AOPU-SE2.md)。

合并厨房平板灯后复验：保留两个型号及通用浴霸的独立规则、生产入口和属性文案；SE2／平板灯／原浴霸数值回归与91类型测距通过。浏览器工具同时复验三类设备的HTTP／file完整链路，避免共享属性合并影响原型号。
