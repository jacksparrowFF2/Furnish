# 吊顶边距与精确退让增量验收

2026-10-25：9组Node回归通过：ceiling-edge-distances、ceiling-boundary-edit、ceiling-regions、ceiling-design、ceiling-assembly、ceilings、functional-zones、zone-boundaries、region-operations。新增用例覆盖四边有符号读数、0／小数精确输入、负数及未知参考拒绝、外移纠正、跨边翻转拒绝、共线分点、旋转镜像与斜向平行边、非平行／无投影交叠排除、孔洞朝向、多参考明确选择及重复项目恢复。5个本次变化JS文件语法及git差异检查通过。

HTTP与断网file://三套专项通过：[最终距离专项](distance-browser.json)、[距离／旧整边](browser.json)、[旧顶点专项](boundary-browser.json)。覆盖拖动中实时读数、精确250.125／123.456 mm、0贴边、非法输入跨页签／边选择保留、原几何不变、恢复读数、翻转拒绝、共线分点联动、生产三维、一次保存／撤销重做、刷新、真实下载上传、取消及390px。新面板增高后，旧整边窄屏用例增加滚动避开固定保存栏；最终仍验证了实际拖动。另断言窄屏标注屏幕字号至少12px。

目视检查：[桌面](editor.png)、[窄屏表单](mobile.png)、[窄屏画布距离](mobile-dimension.png)。全部浏览器在隔离副本运行，未刷新用户页或改写真实workspace。无新持久字段／版本，参考与未应用输入仅属本次会话；未运行全量、实机触屏或复杂户型人工设计。

统一退让只定义在朝向一致、平行且投影有重叠范围的房间边界之间。没有匹配边时显示不可用；读数不构成整块区域完全位于房间内的证明。自交、退化及生成窄边继续拒绝。
