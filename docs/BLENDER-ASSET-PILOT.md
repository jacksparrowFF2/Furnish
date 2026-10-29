# Blender 家电资产试点：奥普 SE2

2026-10-29。固定型号的首个完整试点，仍使用现有 `bath_heater_aopu_se2`，没有新增家具类型、保存字段或应用内任意文件导入界面。

## 已走通的链路

`scripts/blender-model-se2.py` 在独立后台 Blender 中根据既有 SE2 模型资料重新建模 → 保存 [源工程](../assets/models/se2/se2-v1.blend) → 导出 [自包含 GLB](../assets/models/se2/se2-v1.glb) → `scripts/publish-blender-asset.py` 在另一个后台进程实际重新导入 GLB → 验证并生成 `src/data/se2-blender-asset.js` → `static-asset-model.js` 构建 Furnish 生产模型 → 生产 GLB 再导入 Blender。

本轮实测 Blender 4.5.15 LTS。没有在用户活动 Blender 窗口清场、加载工程或覆盖原精修工程。源工程保留可编辑的独立部件；GLB 和发布模块均进入版本管理，运行时不需要 Blender、网络或异步 fetch 模型。

## 使用与维护

```powershell
# 新建目录；已有 blend/glb 时拒绝覆盖，防止丢失手工精修。
node scripts/blender-asset.cjs author-se2 output/se2-new-source

# 可在 Blender 打开源工程编辑后导出 GLB，保留自定义属性、部件名称和单位。
# 此命令会更新仓库内的试点运行资产，应审查差异并运行下面的增量验证。
node scripts/blender-asset.cjs publish-se2 assets/models/se2/se2-v1.glb

node tests/test-blender-appliance-asset.cjs
node tests/test-bath-heater-se2.cjs
node scripts/preview-bath-heater-se2.cjs
node scripts/verify/verify-blender-appliance.cjs
```

Blender 发现复用现有 `blender-server.cjs`，必要时用 `FURNISH_BLENDER` 指向本机程序或商店启动别名；浏览器复用项目 `FURNISH_PLAYWRIGHT`、`FURNISH_BROWSER_CHANNEL` 等配置。商店启动器先退出不算成功，CLI 等待本次独有的 Python 结果文件并核对 GLB SHA-256。失败日志保存在忽略的 `.local/asset-jobs/`，发布校验失败不会替换旧运行资产。

打开 `output/bath-heater-se2/preview.html` 可看生产模型，支持发光面、侧面、拖动环绕及窄屏。家具库现有「奥普 SE2 风暖浴霸」自动使用发布资产，无需迁移或重新摆放。

## 尺寸与行为契约

资料、型号、未知参数和安装边界沿用 [SE2 文档](BATH-HEATER-AOPU-SE2.md)。面罩局部 X=300、Z=600 mm；面板厚2 mm是视觉假设，上部箱体110 mm，总高112 mm。原点为面罩最低点／平面中心；Blender `(x,-z,y)` 对应 Furnish `(x,y,z)`，资产以米表达，界面及产品规则继续使用毫米。

29 个独立部件沿用旧 `bath-heater-se2:<name>` 身份；显示、数值实体记录器、测距和碰撞读取同一份导入顶点与三角面。没有另一套碰撞包围盒或按型号放行的空腔豁免。原二维轮廓、`directional()`、`bodyParts()`、整板匹配与安装高度规则保持。原 `buildLegacySE2` 留作回退及尺寸回归基线；主入口和本模型预览明确加载新资产，不触发回退。

非标准宽深仍仅表示旧有布局草模缩放。保留两个原模型行为：改高时面板厚度保持2 mm，仅机身改高；圆形显示区的直径随宽度变化，位置随深度变化。低于面板厚度的旧输入仍按原逻辑收缩面板并省略机身。旋转、镜像与世界定位在原外层执行，安装基准不重复叠加。发布时坐标量化至0.0001 mm，用于去除GLB浮点交换噪声，避免接触面被误判为微量穿入；这不是安装精度承诺。

资产固定为 `bath-heater-aopu-se2@1`。此次外形与尺寸行为维持原模型，旧实例不补写字段。后续更换型号、改变部件集合、缩放语义或安装参数必须新增并审查对应版本／接入规则，不能用发布命令静默改变旧方案的空间语义。

## 发布能力边界

2026-10-29第四个配置：`author-dishwasher`／`publish-dishwasher`服务现有米家台面5套双片折叠门，校验60个具名网格、嵌套水平门轴及下篮滑轨，保留两个可信端态及原安装预留。当前共四个明确产品配置；真实连续连杆轨迹未模拟。见[折叠门契约](DISHWASHER-BLENDER-FOLD.md)。

2026-10-29第三个配置：`author-fridge`／`publish-fridge`服务现有四门双抽屉冰箱，允许经契约校验的4个运动父节点与30个具名网格，新增Furnish运动装配及完整扫掠。详见[活动部件试点](FRIDGE-BLENDER-MOTION.md)。该轮增加到三个明确产品配置；下文两个静态配置的限制仍适用于各自命令，冰箱也未支持任意glTF动画片段。

2026-10-29后续：同一CLI新增 `author-y52y09`／`publish-y52y09`，验证成品六格书柜流程；SE2命令和尺寸契约保持不变。书柜配置按12块具名板件校验，沿柜体生产板件链路接回尺寸编辑和空间能力，详见 [Y52Y09最新接入](BOOKCASE-YESWOOD-Y52Y09.md#2026-10-29blender-成品家具流程)。这些配置仍不接受任意未知型号。

SE2配置是受限的静态资产发布入口，非通用 glTF 导入器。只接受自包含、无骨骼／动画／形变／贴图的三角网格，每个部件一个不透明基本 PBR 材质；支持发光强度扩展。部件集合、稳定身份、300×112×600 mm边界、原点及面板／机身高度分区必须符合SE2契约。Y52Y09配置另行校验其板件配方。复杂材质、外部资源和不支持的扩展明确拒绝；未验收任意第三方模型、活动门扇、贴图烘焙或任意修改器组合。

产品规则仍由 `product-rules.js` 管理；GLB 不能自动证明散热、电源、风管或施工净空要求。130 mm安装空间仍是资料记录，现有整板匹配不会自动证明其满足。旧生产构造器和新资产均属于布局／外观近似，本轮着重验证流程及能力保持，没有宣称新增实物精度。

## 验收

见 [增量记录](validation/blender-appliance-pilot-20261029/README.md)。没有运行全量 `scripts/check.cjs`、遍历历史预览或改写真实装修数据。
