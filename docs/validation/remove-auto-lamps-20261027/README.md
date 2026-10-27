# 移除按区域自动分配的默认灯（2026-10-27）

用户明确本轮只移除默认按区域布灯；各区域灯具样式待后续图片建模。

## 行为

- `index.html` 的建筑生成不再按 `r.at` 创建白色圆盘和对应 PointLight，移除仅用于这些对象的显示／发光更新循环。
- 已放置的家具灯具、筒灯、吊顶灯带及对应开关保持；开关提示改为说明已放置筒灯和灯带。
- 没有新增灯具、布灯界面、持久字段或迁移，没有改写真实 `projects/workspace.furnish.json`。
- 夜景不再获得原先按区域自动补光，尚未布灯的区域会更暗；现有环境光／日照机制保持。

## 增量验证

通过：入口内联脚本与全部原生脚本合并语法检查，`git diff --check`；以下 7 组相关 Node 回归：

- `test-downlight.cjs`
- `test-ceiling-continuous-light.cjs`
- `test-observation-layers.cjs`
- `test-scene-observation.cjs`
- `test-blender-part-identity.cjs`
- `test-room-ceiling-height.cjs`
- `test-scene-shadow-cache.cjs`

实际 Chromium 在隔离副本运行 HTTP 和断网 file:// 两条路径：三维场景自动灯集合为 0（网格及点光源均无）；添加现有 DL269 后，其实体与向下 SpotLight 保留；日夜及顶灯开关不重新生成自动灯；刷新后筒灯恢复且自动灯仍为 0；无页面异常。结果见 [results.json](results.json)，截图见 [HTTP](http-scene.png)／[离线 file](file-scene.png)，已人工查看画面。验收使用示例户型，并在私有副本内添加一盏现有筒灯，不写真实用户方案。

隔离副本只额外注入只读探针，读取生产场景中的 `lampG`、`furnG`；不替代生产模型。临时执行脚本在本机忽略产物 `output/playwright/remove-auto-lamps/verify.cjs`，截图与结果长期保留于此目录。

未执行全量 `scripts/check.cjs`、无关历史预览、真实触屏或照度／施工验算；本轮不新增 UI 或加载依赖。
