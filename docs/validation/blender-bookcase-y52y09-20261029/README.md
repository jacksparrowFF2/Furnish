# Y52Y09 Blender 成品家具流程增量验收

2026-10-29，Windows、Blender 4.5.15 LTS、Edge实际WebGL，隔离工作树与私有浏览器工作区。未操作活动Blender工程或真实装修数据。

## 已通过

- 独立后台Blender建模12块具名板件，保存 `.blend`／GLB，再实际重新导入并发布离线资产。来源SHA-256与生产运行资产一致。故意将顶板上移10mm的GLB被拒绝，旧资产哈希保持不变。
- `test-blender-bookcase-asset.cjs`：默认全部12块使用导入网格；六个前向射线分别穿过开放格抵达背板；生产网格／旧构造／数值实体逐板外包一致；宽深高改变、24mm板厚、额外层板和配色；固定板厚和局部圆边；原v3同步身份保持。真实吸附、外部100mm间隔、格内六向净距、层板／侧板／背板穿入、层板刚好接触与0.001mm相交、高度分离和项目往返；覆盖旋转／镜像。
- 相关回归：`test-bookcase-y52y09.cjs`、`test-cabinet-model.cjs`、`test-cabinet.cjs`、`test-cabinet-catalog.cjs`、`test-cabinet-interior-distances.cjs`、`test-cabinet-shelf-clearances.cjs`、`test-cabinet-boundary-snapping.cjs`、`test-enclosed-boundary-distances.cjs`、`test-blender-model-identities.cjs`、`test-blender-part-identity.cjs`、`test-blender-appliance-asset.cjs`、`test-bath-heater-se2.cjs`。含本型号新测试共13项，通过；覆盖保守未知高度、重复恢复、旧模板和相关柜体生产链路。
- 改动JS／Python语法、主module语法、普通脚本共享声明和入口脚本引用通过。仅生成本型号及受影响的SE2预览，未遍历历史预览。
- [浏览器记录](summary.json)：HTTP与断网`file://`分别验证生产加载、改为1500×300×900mm、撤销重做、刷新恢复、生产GLB导出；12个导入BufferGeometry部件、v3身份完整，排除旧ExtrudeGeometry回退。预览资产标识、正面／斜视及390px窄屏通过，无页面脚本错误或外部网络依赖。
- [真实Blender再导入](blender-result.json)：两种入口的生产GLB均保留12个网格、12个唯一v3身份和材质。往返 `.blend` 留在本机验收输出。
- 人工查看 [正面](http-face.png)、[斜视](http-side.png)、[断网窄屏](file-narrow.png)，六格开放结构、背板和柜身完整，无整体外包实体填格。
- 扩展发布器重新发布原SE2到临时模块，与原SE2运行资产深比较语义相同；原家电相关回归通过。

## 边界及未执行

合入最新main（包含同期口袋门成果）后，书柜新旧模型、柜内净距、94类家具的包含测距和口袋门兼容回归通过；HTTP与断网file浏览器生产加载、尺寸状态和导出再次通过，共享普通脚本声明及入口资源引用检查通过。主目录真实装修数据由另一任务提交保留，本试点未修改该数据。

没有运行全量 `scripts/check.cjs`。此次保持原 `solidParts()` 矩形板件包络，圆边按保守实体核对；没有增加逐三角面精确碰撞或任何设备空腔豁免。产品实木纹理、五金、防倾倒、承重和厂家未标注尺寸未验证。

发布仅支持SE2与Y52Y09明确配置的静态无贴图基本材质资产。未验任意第三方资产、其它平台／Blender版本、精修工程Live Sync接管或材质迁移；生产导出再导入不等于这些能力已验证。
