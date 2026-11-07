# 柜体升级第一阶段

2026-11-07。按用户授权直接升级抽盒结构，不保留旧抽盒尺寸分支，不修改正式项目JSON。参数和适用范围见 [组件契约](../../CABINET-COMPONENTS.md)。

## 已通过

- `test-cabinet-drawer-assembly`：432组真实Three生产配置、1584只木抽盒，覆盖有抽屉的普通／分层／玄关模板，12／18／30mm板厚、缺省／0／6／50mm背厚及关闭／37%／全开。检查底侧背板逐面连接、板件稳定身份与数值记录器（闭合基准加真实运动量）的对应；不以总外包代替板件。
- 同测试覆盖无背板旧开关／显式0使用同一抽盒几何、边界无净宽／零侧板拒绝、当前及命名方案往返、重复恢复、普通及保留厨房的定向空间版本、无抽屉柜及纯颜色／价格边界。
- 正式D盘工作区只读遍历当前、命名方案及厨房派生模块，共746组配置通过新校验，无写回。此数量不等于746件不同家具。
- 增量回归：cabinet、advanced、edit-operations、components、drawer-joints、net-depth、back-components、parameter-parity、independent、stacked-boxes、full-width-drawers、custom-fronts、opening-volume-model、model；kitchen、dish-basket、drawer-tiers、laundry-cabinet。改动JS语法及diff空白检查通过。

## 界面证据与范围

- `output/desktop-verification/cabinet-back-components-xFCSls/failure.json` 中HTTP及断网file两段全部通过，覆盖背板、全部模板参数入口、抽屉／门选择、取消、撤销重做、保存刷新和390px。该整批桌面在厨房保存后的刷新等待超时，不标记整批通过。
- 以最终源码串行执行 `test-cabinet-parameter-parity-ui --desktop-only --kitchen-only`，同一正式EXE使用独立源码／项目／缓存／端口。`output/desktop-verification/cabinet-parameter-parity-9M3vch/result.json` 的地柜／吊柜外观、37%开合、撤销重做、保存刷新及窄屏全部通过；成功副本已自动清理，报告和截图保留。已实际打开该批桌面地柜宽屏／390px截图，以及iE9dOO批次玄关／餐边柜部件选择截图目视检查。
- iE9dOO的全模板桌面复验也在长批次刷新阶段停滞，84QY8d的并发厨房定向批次启动等待超时；这些副本与诊断保留。已按独立profile/workspace身份关闭前两批超时EXE，不操作正式窗口。最终串行定向通过不能替代全部模板桌面整批通过。
- 本机main基线加本阶段核心／模型／规则补丁的隔离副本，排除其它对话未提交改动，重跑抽盒、共享组件、抽盒连接、参数和净深测试通过；临时副本已清理。首次tar提取未能还原无关中文参考图片，实际测试所需源码／测试／vendor均在，未据此声称资产整链路验证。
- 本阶段不编辑正式方案；各隔离UI运行器校验来源项目哈希保持。

## 未执行与边界

未运行全量检查、Blender导出／回读和全部自碰撞组合穷举。未新增UI或文件加载资源，不扩展模板能力；柜体五金、封边、连接件及加工公差仍不是制造验证。共享工作区中其它对话的阵列、易拉罐和三维手柄修改不属于本阶段成果。
