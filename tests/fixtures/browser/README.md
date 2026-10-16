# 浏览器验收输入

这些文件是固定测试输入，验收运行时复制到独立副本；不使用本机 Downloads、外部 D 盘目录或已有 output。

- `reimport-input.furnish.json`：原工作流验收的合成项目，含材料包装价、锁定原始结构、家具与命名方案，用于重新生成后续下载、绘图、房间净距及采购用例的输入。
- `1601-source.dxf`：原 1601 图纸验收输入，来自既有图纸目录；原图 SHA-256 由 `shared-boundaries-validation.json` 校验。
- `imported.furnish.json`、`zone-vertices-verified.furnish.json`、`region-split-verified.furnish.json`：原 1601 导入、顶点及区域拆分验收快照，供梁、管线、DXF 补充与区域合并用例使用。

这些是历史固定快照，不跟随 `projects/workspace.furnish.json` 中的当前设计更新。原始本地文件保留。浏览器验收入口与环境说明见 [浏览器验收](../../../docs/BROWSER-VERIFICATION.md)。
