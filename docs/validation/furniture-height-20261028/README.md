# 柜顶完成面与房顶距离验收

2026-10-28。五项Node回归：test-furniture-height-measurements、test-furniture-finished-datum、test-cabinet-dimensions、test-property-first-batch、test-property-second-batch。design-core及property-panel语法通过。

专项 `node scripts/verify-browser.cjs furniture-height-measurements`，指定本机Chrome，在隔离副本运行HTTP和离线file://：60 mm地面完成面、2400 mm柜高、2800 mm天花标高，显示顶部2400 mm／房顶间距340 mm；改2500后撤销重做与刷新一致。桌面及390px截图目视通过（窄屏等待抽屉过渡结束）。核心另覆盖survey基准、旋转镜像、贴顶／超高与未知地面。

- [桌面](desktop.png)
- [窄屏](mobile.png)
- [浏览器结果](browser.log)

未执行全量check、Blender或实机触屏。无生产几何和持久字段变化；命名方案／项目往返沿原完成面基准回归。房顶按中心所在房间天花设置，梁和独立吊顶仍需现有空间检查。
