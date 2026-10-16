# 长期验收证据

这里保留精选的历史验收证据，便于跨电脑审视；图片不代替当前代码的回归和实机验证。自动化截图与完整日志继续留在不入 Git 的 output 目录。

- [2026-10-16 UI 审视报告](ui-audit-20261016/report.html)：报告及配套 15 张截图一起保留，相对图片链接可独立使用。
- [78 项浏览器全量验收](browser-full-20261016.json)：初始失败名单、修复后逐项通过结果与数据保护范围；[水槽标注前后](../MEASUREMENTS.md#开孔与外沿标签分离2026-10-16-全量浏览器复验)保留实际显示问题证据。
- [验收脚本归类](script-layout-20261016.json)：源内容一致性、目录变化、兼容入口及迁移后的专项复验。
- [1601 仓库保存验收](repository-saves/1601-saved.png)：设计文件保存提示及当前布置；判定与实机边界见 [仓库保存](../REPOSITORY-SAVES.md)。
- [区域合并记录](multi-region-merge/merge-validation.json)、[带孔往返记录](multi-region-merge/hole-reimport-validation.json)、[恢复截图](multi-region-merge/hole-reimported.png)：保留原有区域合并证据。
- 模型截图位于 `models/`，由相应模型文档和 [迁移清单](output-cleanup-20261016.json) 定位。包括鱼缸、水槽、洗碗机、餐边柜、折叠餐桌、扫拖机器人、花洒、沙发、电视柜、热水器和二维遮挡对照。

预览 HTML 通过 `node scripts/generate-previews.cjs` 重新生成，不作为长期证据重复保存。原 output 文件在整理时全部保留在本机；没有压缩、重绘或重新截图替换归档图。
