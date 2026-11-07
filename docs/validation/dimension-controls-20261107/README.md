# 尺寸与离地属性集中显示（2026-11-07）

用户截图中的方块长宽位于快捷浮窗，高度/离地在右栏。检查目录后，131个独立普通类型存在同类编辑分散，现由property-panel复用原模型专属高度/安装控件，集中显示宽/深（方块为长/宽）、原高度字段和离地；原没有高度编辑能力的产品只读显示本体高度，未知保持未知。不新增类型白名单、字段或保存通道。11个柜体类型及counter组合保留专用设计器，见[目录审计](dimension-audit.json)。

快捷尺寸浮窗复制同组标签、边界、只读/禁用与当前显示值，一次mutate提交尺寸及离地。原值应用不写入默认h、不解除台面关联；仅实际修改离地时调用editBottomHeight。原属性绑定/安装基准继续使用，配电箱、窗饰等标签保留；结构说明仍在各型号属性中。纸品派生尺寸沿原禁用规则。

`node tests/test-block-array-ui.cjs`调用`tests/helpers/dimension-panel-ui.cjs`，已通过隔离同EXE桌面、HTTP、断网file://：目录131类型均具有四个集中字段且无重复ID；方块右栏尺寸编辑、四字段浮窗、原子撤销/重做、非法离地拒绝；原阵列/生产GLB/桌面保存刷新验证继续通过。桌面另对washer/sink_arrow_680/curtain/shower_arrow_cream/electrical_box_strong/chair检查原值应用逐字段不变、单独修改离地后一次撤销恢复。结果见[三入口报告](report.json)。

Node增量：test-block-placeholder、test-product-rules、test-work-state、test-bottom-elevation、test-property-first-batch、test-property-second-batch及改动脚本语法通过。first-batch旧夹具第二VM缺FurnishCabinet导致placementPanel引用报错，本轮补注入真实核心后通过，不改产品规则。

目视证据：[右栏四字段](desktop-dimensions.png)、[浮窗四字段](desktop-dimension-dialog.png)、[断网右栏](file-dimensions.png)。独立390px窄屏验证见narrow-report.json及narrow-dimensions.png/narrow-dimension-dialog.png。未运行全量检查、未遍历独立用户自定义OBJ资产或实机触屏；只读高度不代表新增加了产品高度调节能力。正式方案、仓库workspace与并行柜体改动保留，成功测试临时副本由test-artifacts回收，失败诊断保留。
