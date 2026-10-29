# SE2 Blender → Furnish 试点增量验收

2026-10-29。Windows，Blender 4.5.15 LTS，实际 Edge／WebGL，独立工作树及私有浏览器副本。

## 已通过

- Blender 从既有SE2尺寸／外观近似重新建模，保存可编辑 `.blend` 及GLB；另一个后台进程实际导入GLB，发布离线网格。CLI新目录建模、正常发布均实测；动画GLB被拒绝，旧运行资产SHA-256保持不变。未接触用户活动Blender工程。
- `tests/test-blender-appliance-asset.cjs`：GLB与运行资产来源哈希；29个唯一部件；有限顶点／单位法线；实际Three几何与旧生产模型逐部件外包尺寸对比，含0／37／90／180度、镜像、宽深／高度缩放、0离地及小于面板厚度；原面板厚度与圆形显示区缩放保留；配色；实际吸附；共用测距、刚好接触、0.1mm穿入、完整包含与高度分离。
- `tests/test-bath-heater-se2.cjs`：原型号、默认值、生产实体、整板匹配、旋转镜像、对齐容差、未知高度、当前／命名方案项目往返及三次恢复无漂移。
- 相关回归：`test-ceiling-panel-devices.cjs`、`test-panel-light.cjs`、`test-snapping.cjs`、`test-drag-feature-snapping.cjs`、`test-enclosed-boundary-distances.cjs`、`test-blender-model-identities.cjs`、`test-blender-part-identity.cjs`。共9项测试文件（含上面两项），均通过。
- 改动JavaScript语法、主入口module语法、普通脚本共享声明及本地脚本路径检查。
- `scripts/verify/verify-blender-appliance.cjs`：HTTP及断网`file://`分别完成真实生产模型加载、改宽／离地、撤销重做、刷新缓存恢复、生产GLB导出；29个v3部件身份完整；模型预览正面／侧面与390px窄屏，无页面脚本错误或外部网络依赖。记录见 [browser-summary.json](browser-summary.json)。
- `scripts/verify/verify-blender-appliance.py`：两种入口的生产GLB均在独立真实Blender进程重新导入，29个网格／唯一v3身份／材质完整。记录见 [blender-result.json](blender-result.json)。往返工程保存在本机忽略的验收输出中。
- 人工查看正面／侧面截图，柔光面、五条格栅、显示区和上部箱体方向完整。首轮窄屏取景裁切已修正，最终 [390px截图](file-narrow.png) 完整显示模型；[发光面](http-face.png)、[侧面](http-side.png)。

## 未执行和边界

没有运行全量 `scripts/check.cjs`，没有遍历历史预览；本轮没有改动产品安装规则、项目格式或真实装修工作区。尚未验证任意第三方GLB、贴图、动画／骨骼、复杂材质、任意修改器、其他平台或其他Blender版本。

本轮验证生产GLB可再导入Blender，没有进行用户精修工程的Live Sync接管／材质迁移。既有SE2的130mm安装空间不在现有自动校验范围，风管／电源／支撑和厂家未标注细节仍待核对。
