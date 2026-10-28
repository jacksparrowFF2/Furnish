# 吊顶完成面高度验收

2026-10-28。地砖完成标高60mm、吊顶绝对底高2400mm时，编辑器显示2340mm。改为2350mm后保存2410mm绝对高度，距2800mm房顶390mm；独立中央板输入2440→2450mm，保存2500→2510mm。HTTP及离线file://专项通过中央板、普通底高、保存、撤销重做、刷新、二维标签、SVG导出、三维及属性读数和390px截图。

通过：test-ceiling-height-measurements、test-ceiling-design、test-ceiling-current、test-ceiling-regions、test-ceiling-display、test-property-first-batch、test-property-second-batch。新增单测覆盖多标高范围、贴顶、超高、未知完成面、旧0基准和只读派生。主三维模块及改动JS语法通过。

- [三维桌面](desktop.png)
- [三维窄屏](mobile.png)
- [高度专项日志](browser.log)
- [现有吊顶流程复验](current-browser.log)

中间测试区域600mm宽配300mm内退导致回型内边退化，调整验收区域尺寸后专项通过；既有ceiling-current浏览器脚本在隐藏页输入高度，已修正为先切区域页再输入。

未执行全量check、Blender或实机触屏。底部距房顶包含板厚，非板顶净空；未扣梁或其它吊顶构件。多房间读数为覆盖范围，编辑以较低完成面为输入基准；未知完成面禁用该高度输入，保留绝对高度。没有新持久字段或版本。
