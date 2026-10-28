# 柜顶完成面与房顶距离验收

2026-10-28。五项Node回归：test-furniture-height-measurements、test-furniture-finished-datum、test-cabinet-dimensions、test-property-first-batch、test-property-second-batch。design-core及property-panel语法通过。

专项 `node scripts/verify-browser.cjs furniture-height-measurements`，指定本机Chrome，在隔离副本运行HTTP和离线file://：60 mm地面完成面、2400 mm柜高、2800 mm天花标高，显示顶部2400 mm／房顶间距340 mm；改2500后撤销重做与刷新一致。桌面及390px截图目视通过（窄屏等待抽屉过渡结束）。核心另覆盖survey基准、旋转镜像、贴顶／超高与未知地面。

- [桌面](desktop.png)
- [窄屏](mobile.png)
- [浏览器结果](browser.log)

未执行全量check、Blender或实机触屏。无生产几何和持久字段变化；命名方案／项目往返沿原完成面基准回归。房顶按中心所在房间天花设置，梁和独立吊顶仍需现有空间检查。


## 三维柜旁提示补验

三维浮标改为共用完成面／房顶读数，移除毛坯离地浮标和重复完成面标签；高度线从已知完成面开始。扩展原专项通过HTTP和离线file://，60 mm地面下2350 mm柜高对应房顶间距390 mm，改高及撤销重做与右侧一致；390px目视无提示裁切。

- [三维桌面](scene.png)
- [三维窄屏](scene-mobile.png)
- [补验日志](scene-browser.log)

本次仅变更主场景显示与验收，不修改并行任务的柜体模型／数据。


## 分行卡片显示

顶部距地面、顶部距房顶、底部距地面分三行，标签／数值两列对齐，顶部标注地砖完成面基准，底部读数弱化；不透明底色隔绝背景文字。相关主页面脚本语法检查及HTTP／离线专项通过，桌面和390px截图已目视。中间一次专项因三维更新尚未完成就读取标签而失败，验收改为等待目标数值出现后通过。没有数据或计算变化，本轮未另跑数值回归或全量检查。

- [分行桌面](scene-card.png)
- [分行窄屏](scene-card-mobile.png)
- [分行验收日志](scene-card-browser.log)
