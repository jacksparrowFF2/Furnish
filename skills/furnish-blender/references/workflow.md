# 已有的项目入口

先在实际仓库检查脚本与文档，路径不同时按真实位置解析。

| 工作 | 入口 |
|---|---|
| 生产／精修任务 | `src/ui/blender-render.js`、`scripts/blender-server.cjs`、`scripts/blender-render.py` |
| 精修工程登记／合并 | `scripts/blender-project.cjs`、`scripts/blender-refined.py` |
| 同步与材质保留 | `src/io/blender-export.js`、`src/ui/blender-sync.js`、`scripts/blender-sync-server.cjs`、`scripts/blender-sync-addon.py` |
| 原1601客厅材质／布光 | `scripts/render-1601-living.cjs`、`scripts/blender-1601-living.py` |
| 1601区域机位 | `scripts/blender-1601-regions.py` |
| 任务／GPU／服务回归 | `tests/test-blender-render.cjs`、`tests/test-blender-device.cjs`、`tests/test-server-startup.cjs` |
| 真实精修界面验收 | `node scripts/verify/verify-blender-refined.cjs`，使用隔离副本，需先登记1601精修工程 |

## 1601已有资产

当前仓库位置示例为 `C:/Users/SPH/Documents/GitHub/Furnish`，资产位于 `D:/1601装修`。检查文件是否仍存在，不因旧记录覆盖用户后来编辑。

- `Blender材质库/1601客厅程序材质.blend`：40项程序资产。添加到 Blender「偏好设置 → 文件路径 → 资产库」后使用资产浏览器；也可从 `.blend/Material` 追加。地砖使用1601起铺基准，移用需调整。
- `渲染/1601持续同步演示-20261021/1601-持续同步试用.blend`：活动同步工程。窗帘打开和电视转向保留Blender姿态，不反向写回Furnish。
- `渲染/1601固定区域效果图-20261021/1601-固定区域机位.blend`：客厅／餐厅／厨房／主卧相机与摄影补光。1601户型ID为 `custom_mv37igji`，不要用于其他户型。

后台任务读取登记工程的磁盘快照。若后来在另一个交互工程中完成精修，先保存并重新登记相应文件；两个独立工程的参数不会自动互通。

## 坐标和保留契约

Furnish持久尺寸为mm，导出为m。Blender坐标为 `(X,Y,Z)=((x-OX)/1000,(OY-y)/1000,z/1000)`。以首次中心作锚点和生产导出标识匹配，不靠对象显示名猜来源。

材质保留依赖稳定ID、部件类型和槽数量兼容。模型重构或建筑序号变化可能生成新部件；不保证任意旧工程直接接管。删除／撤销保留的材质可能带fake user，不随意清理用户资产。

## MCP与skill

已接入社区项目 `https://github.com/ahujasid/mcp-for-blender`（旧名 blender-mcp），不是Blender官方集成。MCP让agent检查／操作活动场景；skill记录操作判断和流程；Furnish本地API提供产品功能，三者用途不同。本流程不依赖第三方MCP；具体安装、当前1601副本、工具调用及重连边界见 [MCP 接入与实测](mcp.md)。不要把Furnish同步插件称作MCP。
