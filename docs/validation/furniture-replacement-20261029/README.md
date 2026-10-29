# 家具库替换验收 · 2026-10-29

选中单件家具后，浮动工具条「替换」或属性「查找并替换」进入原家具库。保留分类、用途、搜索、收藏和自定义条目；同类分类优先显示但不限制跨类搜索。点击或键盘 Enter/空格选择候选，不进入新增家具通道。包含多件对象的组合洗衣区暂不支持单件替换。

临时平面图层显示新品与原占地虚线，原对象和原选择辅助线临时淡化／隐藏。候选采用新规格、配色与价格，不自动缩放。支持沿用旧尺寸调整基准、中心不动、局部背面中点不动；背面基准随旋转变化，镜像不改变背面中点。新定位选项不改写原 resizeAnchor。窄屏选择后收起库并聚焦候选，比较面板避让家具；图纸旋转同步作用于预览。

预演在完整方案副本中复用正式提交的 normalizeFurnitureEdit：厨房避让／关联、洗烘叠放、自动检修盖板和图层锁检查；确认后沿原 mutate 一次写入家具列表，全部关联调整一起撤销。旧专用字段仍由产品能力清理，不新增持久字段、项目版本、脚本或保存通道。采购订单原快照保留；新品采购状态重置为计划购买。

取消、Escape、改选、方案内容变化、切换方案或进入 3D 会清理临时模式；刷新不会恢复候选。规格弹窗在替换结束后不能再将「预览替换」误执行为新增。成果 SVG 删除预览层及原件淡化标记。

## 已通过

- 15 个 Node 增量套件：product-rules、furniture-replacement、design-workflow、design-consistency、laundry-stack、observation-layers、catalog-browsing、kitchen、floor-finishes、pegboard-auto、pegboard-local-hatches、tile-grout、tile-presets、wall-finishes、wall-tiling。
- Playwright：furniture-replacement、product-rules、catalog-library、current-furniture、portable-smoke，均覆盖本地 HTTP 和断网 file://。
- 替换专项覆盖预览不改方案／历史、取消、基准切换、旋转镜像背面定位、一次撤销及重做、刷新恢复、关联烘干机预演与提交一致、图纸旋转、导出隔离、失效会话、键盘选品及旧规格窗口保护。
- 桌面和 390 px 窄屏截图目视检查：候选可见，比较面板避让，无页面横向溢出。截图见本目录。
- 修改脚本语法及 git diff --check。

## 验收记录

隔离副本中的运行结果：

- 替换最终专项：output/playwright/verification-LkcHWT/results.json。
- 产品规则：output/playwright/verification-iRSLyN/results.json 的 product-rules 通过；该轮 current-furniture 窄屏抽屉在断点事件后被关闭，已调整验收等待顺序并完整复跑。
- 家具库：output/playwright/verification-lamiM8/results.json。
- 当前方案和基础冒烟最终复跑：output/playwright/verification-IKWFky/results.json。

旧 VM 提交测试改为同时加载抽出的共享归一化函数，保留原断言；洗烘属性面板假 DOM 补齐现有 querySelector 接口。当前方案浏览器测试在断点回调完成后再打开抽屉，避免测试时序使抽屉被关闭；未降低业务断言。

## 范围与边界

本轮未运行全量检查或真实手机触屏验收。候选预览在二维进行，从 3D 发起会切回平面；确认后的 3D 沿原生产同步。碰撞和安装待核对提示沿既有空间算法，提示不等于自动适配或厂家安装许可；字段／结构校验不通过时禁用确认。一次仅替换一个未锁定对象，不支持整组替换或多对象模板替换。

用户工作区 JSON 和其他聊天的模型／启动改动不纳入本次提交；验证使用独立存储与工作副本。
