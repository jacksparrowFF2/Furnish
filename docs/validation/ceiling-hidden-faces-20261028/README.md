# 隐藏吊顶后白线残留修正 · 2026-10-28

原因：`ceiling-model.createDisplay`在hidden模式中排除了light／diffuser，这两类是生产灯带发光面与柔光板，隐藏结构后仍组成白色细框。面板透视辅助线本身已随父网格隐藏，此次不修改它的生成。

修正：hidden对所有带ceiling.part的生产网格应用临时隐藏；ghost继续让light／diffuser保持原显示。restore、图层过滤、导出快照和材质资源释放仍沿原显示覆盖。没有改生产顶点、身份、灯带开关、独立家具灯具或保存结构，未写入真实项目。

## 已通过

- 两个变化脚本语法与git差异空白检查。
- `node tests/test-ceiling-display.cjs`：新增真实上发光灯槽构造，验证light／diffuser在顶灯开与关时都随hidden隐藏，ghost／solid恢复，原材质、几何、投影和可见性可恢复；已隐藏图层不会被恢复显示。原25%透视、仰视、面板辅助线、裁切和资源释放回归保持。
- `node tests/test-ceiling-assembly.cjs`及`node tests/test-ceiling-channel-switch.cjs`：生产柔光板尺寸、射线、碰撞、关闭构造及恢复链路。
- 当前真实工作区只读构造：原hidden残留diffuser×1与light×1；修正后hidden可见吊顶网格0，restore恢复67。没有保存或改写该方案。
- `node scripts/verify-browser.cjs ceiling-display`通过HTTP与断网file://。夹具增加真实灯槽及柔光板，检查hidden全部隐藏、ghost恢复发光面、仰视保持实体、偏好刷新、项目／撤销历史不变、GLB实际编码前恢复原材质和可见性、390px三模式按钮。保留原铝扣板深度比较，避免修正引入显示回归。使用本机已有浏览器路径PLAYWRIGHT_BROWSERS_PATH。
- 已目视[透视](http-ghost.png)与[隐藏](http-hidden.png)：隐藏截图中灯槽白色细框消失，保留墙面地面及原场景标注。

结果见[browser-results.json](browser-results.json)。

未执行全量Node／浏览器、真实触屏或Blender；实际GLB编码验证通过不等于执行Blender渲染。隐藏属于观察偏好，顶灯实际照明仍由原开关控制，不改项目数据或空间核对。
