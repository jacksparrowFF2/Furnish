# 夜景柜体描边修正 · 2026-11-14

组件柜体的 `LineBasicMaterial` 不随环境照明变暗，原棕色结构线在夜景曝光10下变成浅黄白线。`lighting-core.cabinetContours()` 仅处理 `cabinetOutline` 标记，按环境ambient相对白天1.1衰减线条的线性颜色；WeakMap保留原色，重复应用不累积，白天精确恢复。正式场景的applyLight及buildFurn分别覆盖切换、首次加载和几何重建。编辑器不调用该衰减接口，保持独立生产预览的结构线及活动板件提示。

未新增保存字段，未修改家具几何、安装高度、碰撞、核对语义或实体材质。结构线仍是环境照度近似，不参与逐灯照明／阴影；本次不扩展其他辅助线或选中高亮。

通过的增量检查：

- `node tests/test-cabinet-night-contours.cjs`：真实生产构造、反复昼夜切换、重建、独立编辑预览、原实体颜色及家具数据不变。
- `node tests/test-lighting-preview.cjs`：原灯光单位、预算、发光面及导出回归。
- lighting-core语法及index所有内联脚本语法检查。
- `node tests/test-cabinet-night-contours-ui.cjs`：HTTP、离线file及同正式Electron45.0.0 EXE隔离验收；实际按钮反复切换、编辑预览颜色、保存刷新重建、页面无异常。正式源文件哈希在测试前后相同。

本机证据：`output/desktop-verification/cabinet-night-contours-w1fM3G/result.json`；同目录各入口 `*-night-before.png`、`*-night-corrected.png`，桌面1601方案C猫窝床头柜同机位目视对照确认浅亮结构线消失，正常实体仍保留。测试前图通过同一隔离场景恢复原线色得到；曝光、几何及相机未改。

编辑器实际切到“三维检查”补验：`output/desktop-verification/cabinet-night-contours-BDVb8n/desktop-editor-structure-lines.png`，侧板、顶底板及层板边线清晰保留；与同目录正式夜景前后截图分别目视检查。补拍轮刷新曾超时，延长等待仍失败，未计为整轮通过：测试此前只在ready／saved状态flush，漏掉编辑三维显示后的未保存状态，触发Electron原生未保存保护；JS dialog处理不能处理此原生同步提示。测试改为桌面无条件显式flush后再刷新，生产保存保护保持。

最终三入口重验全部通过：`output/desktop-verification/cabinet-night-contours-f4EYQE/result.json`。先验证昼夜反复切换及明确flush后的刷新恢复，再独立进入“三维检查”目视保留结构线；所有入口均有夜景同机位前后及三维编辑预览截图，正式源文件哈希不变。中间一次EXE窗口在进入3D前关闭，该轮未计通过；超时／中断轮证据保留，不以它们替代最终通过记录。

未运行全量检查，未做Mac／其他显卡验证。首次沙箱HTTP测试受本机网络访问限制，放行隔离测试后通过；验收中补齐了buildFurn之后的亮度应用，避免只覆盖切换而漏掉初次加载。
