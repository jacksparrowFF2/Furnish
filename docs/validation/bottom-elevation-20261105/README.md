# 存量家具家电离地高度验收 · 2026-11-05

已补齐全目录148条／121种type的底部离地能力。自身高度与整体安装高度独立；旧字段缺失只读原位置，不批量移动旧对象。规则、特殊基准和v49契约见[产品规则](../../PRODUCT-RULES.md#2026-11-05存量类型的离地补齐)。此次未修改用户正式方案文件。

## 已执行

| 检查 | 结果与范围 |
| --- | --- |
| 全目录实际属性控件 | HTTP下逐一创建148条目录模板，模拟旧缺失字段，通过实际输入框增加400mm。38条原生、105条共用offset、4条台面、1条混水器中心；均有可编辑底部控件 |
| 正式三维导出 | 每条导出原位及抬高GLB，共296份；每条底部实际位移400mm，误差小于浮点容差；导出底边对底部目标／数值实体采用2mm容差，最大约1.43mm，全部通过。数值范围未知0条 |
| 离线file入口 | 17条代表产品：block、净化器、婴儿床、边几、淋浴房、浴缸、两款吊灯、地毯、四款布帘、纱帘、绿植、两款装饰画；同样实际编辑和正式导出通过。最终浴缸／帘布规则再定向复验 |
| 组合逐部件 | 镜像／37°厨房及关联箭牌水槽165件、37°整体洗衣柜及独立落地洗衣机53件、两个共板柜80件；按家具ID+部件key对照上下界，柜体及附属组件增加300mm，独立洗衣机保持0，无部件丢失、重复偏移 |
| 导入OBJ | 带curtain原类型及bottomPhysical标记的OBJ，物理底部独立平移；改变XY及旋转后的缓存命中不重复叠加旧安装基准 |
| 桌面EXE | 正式打包程序，在独立工作目录／端口／新缓存运行。chair、wardrobe、wallart、旧curtain、sink_arrow_680、shower_arrow_cream、plant：实际输入700mm、撤销重做、归零及三维截图通过；最后保存、刷新恢复、390px窄屏通过；正式文件SHA-256前后相同 |
| 核心／数据增量 | 98项注册模型及高度／空间／项目／缓存相关回归通过；含580次生产实体缓存对照和41形状LRU压力检查。后续柜体连接、浮点归零、OBJ及范围修正，定向复验bottom-elevation、entry-shared-board、entry-pegboard、kitchen、laundry-area、sink-surface、product-rules、project、project-validation、workspace-cache、repository-version-compat、window-coverings、spatial-review-cache及furniture-finished-datum |
| 语法与差异 | 修改JS/CJS及index内联模块语法检查、git diff --check通过 |

`test-bottom-elevation`另外覆盖：新建默认及旧缺失、无尺寸定义读取、0／20000mm及越界、重复恢复无漂移、当前／命名项目／工作区／缓存v49、旋转／镜像／抬高后的高度分离、柜板与开启空间、价格／配色不清空间确认、台面跟随与手动解除、完整洗衣柜附属部件、柜体同高才共板。counterElevation内部范围扩至40000mm，使20000mm柜体底部叠加台面厚度后仍可校验／保存；超过旧2000mm范围标记v49。

## 证据与复验

- [全目录报告](catalog-report.json)、[离线报告](offline-report.json)、[组合报告](linked-report.json)、[桌面报告](desktop-report.json)、[98项增量报告](regression-report.json)。全量GLB与原始日志保留在本机output/elevation-audit、elevation-linked、elevation-regression；不将大批生成资产作为生产资产提交。
- 桌面目视：[衣柜700mm](wardrobe-raised.png)、[帘布700mm](curtain-raised.png)、[窄屏](narrow.png)。目视确认控件／标注与抬高姿态，不代表照片级外观精修。
- 可复用入口：`node scripts/verify/verify-elevation-browser.cjs`、`node scripts/verify/verify-elevation-linked.cjs`、`node scripts/verify/verify-elevation-desktop.cjs`。需本机Chrome时设置FURNISH_BROWSER_PATH；file入口设置FURNISH_ELEVATION_FILE=1，可用FURNISH_ELEVATION_INDICES选择目录索引。桌面入口需已有output/desktop/Furnish-win32-x64/Furnish.exe。

## 边界与未执行

本次验证整体离地语义和生产传递，没有重做既有外观、厂家尺寸或材质。圆角／软包等数值实体保留原保守包络：全目录底边核对在2mm容差内；部分曲面顶部仍比渲染网格更高（本轮样本最大约41.1mm），净距可能偏保守。它们不能作为厂家安装精度或空腔净空证明；没有承诺曲面逐三角形精确碰撞。

未运行node scripts/check.cjs全量检查，未进行全型号Blender重新建模／渲染或全部门角穷举。98项为对应增量阶段，后续小修按受影响链路定向复验，不表述成最终提交的全项目全量通过。原有独立工作树及用户未提交方案保留，没有清理其它任务成果。
