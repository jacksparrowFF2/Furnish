# 柜体双端拉伸与固定端（2026-11-05）

## 需求与使用

用户要求改变柜体拉长/缩短的方向，避免只能从一侧调整后逐件重定位。新增普通柜体的负向宽/深手柄，和原正向手柄一起按实际抓取侧固定对侧；角点手柄保留原同时改宽深行为。普通柜体松手不再额外pushOut移动固定端，墙体/家具碰撞仍由既有空间核对呈现，不承诺自动避障后仍固定。

在「整个柜体 → 整体尺寸与结构 → 调整宽度时固定」选择中心、柜体左端或右端。左右按原产品正面局部轴，随旋转/镜像映射到户型；局部端点变化用实际宽差的一半平移。仅改高度或深度时，局部宽度端基准不平移中心。底部离地、角度、镜像、现有柜内缩放及板厚规则保留。模块管理导致整柜变宽及隔板改宽也复用同一位姿换算，厨房专用整排/模块/薄柜/洗衣柜端点语义不改写，嵌套子柜不提供独立整体定位选项。

数字设置和拖动独立：拖动时固定抓取点对侧，不改保存的数字基准。旧resizeAnchor的left/right/top/bottom仍按原图外包框读取，不静默改成产品坐标。缺失仍中心，不自动物化新字段；旧非中心设置在柜体菜单中继续可选。新local-left/local-right值仅在普通柜体界面开放，显式导入的新值仍由共用规则校验。左右端选择入口也在原属性「尺寸调整基准」中。

## 实现与兼容

- design-core.resizeAnchorPosition集中局部/旧世界坐标基准，resizeFurniture、柜体草稿、模块操作与数值宽编辑复用；原mutate、草稿/应用撤销及保存不另建通道。
- snapping.resize以sideX/sideY表达移动方向，在同一有限边缘/磁吸/尺寸校验路径计算；省略仍保持旧正向行为，滑门收门端与厨房专用分支保留。
- plan-renderer从原生产尺寸派生两端手柄，canvas-interactions携带方向并使用从抓取点开始的位移。旋转图纸的屏幕转换沿旧路径。
- 持久化继续复用resizeAnchor；新增枚举语义受项目/工作区/恢复缓存v51保护，旧文件继续读取，旧应用拒绝新版本。无新加载模块。仅更换基准不影响空间确认，实际尺寸和位置变化沿既有签名失效；复制/替换复用原字段保留规则。

## 验证通过

- test-cabinet-resize-direction：180组局部基准、两个方向的宽/深/角点、0/37/90/180/270°与镜像、分数宽度、有限边缘磁吸、生产pointermove监听器、安装离地保持、源数据不变、当前/命名项目往返；另验150mm独立柜箱下限等于/低于值、锁定、非空间基准编辑不清确认。
- 相关增量：cabinet-boundary-snapping、furniture-fit、furniture-recovery、cabinet-workspace、cabinet-edit-operations、cabinet-stacked-boxes、cabinet-side-closure、workspace-cache、work-state、project-validation、furniture-replacement、product-plan-outline、kitchen-resize、kitchen-outer-edges、kitchen-edge-snapping、snapping、project、project-recovery、repository-version-compat，均使用tests/test-*.cjs入口；改动JS语法检查通过。
- scripts/verify/verify-cabinet-resize-direction.cjs使用正式打包EXE，独立源码/项目/缓存/端口：12次真实宽度拖动（0/90/37°×镜像×两端）在松手后仍保留对侧；数字选项、镜像左端宽度、取消、应用撤销/重做、模块复制时固定端、v51保存刷新、窄屏、HTTP与离线file://双手柄，页面无异常，正式源项目哈希不变，见[results.json](results.json)。保存/恢复快照语义一致（JSON键序可能不同），源文件未修改。
- 已实际查看[平面双端手柄](desktop-two-ended-handles.png)与[数字基准](desktop-numeric-anchor.png)截图。新增深度反向行为已覆盖核心/生产指针监听器；桌面真实鼠标专项主要验证宽度，未单列深度鼠标拖动截图。

## 已知基线失败及未执行

扩展检查发现两项修改前即可复现的断言，分别用git HEAD源在独立Node进程回读验证，未改生产代码或放宽断言以掩盖：

1. test-curtains-sliding.cjs:54：三联动窗替换为TV时mountHeight预期undefined，当前为693.75，涉及既有底部标高迁移。
2. test-furniture-snapping-audit.cjs:12：art_glass_partition旋转37°/非镜像的move距离断言，当前7.819552732064885，预期0；发生在本次未修改的move路径。

未运行全量check.cjs。未改变用户当前正式布置，未新做Blender/GLB/家具几何；本次仅尺寸位姿与界面能力。厨房保持原末端调整模型，不把“固定产品左端”强加于L/U形/附属设备的专用操作。成功验收副本按test-artifacts收尾，早期失败现场保留。主目录已有方案修改与历史工作树保留，本次没有创建临时分支。
