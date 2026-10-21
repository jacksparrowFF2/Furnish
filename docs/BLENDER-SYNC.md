# Furnish → Blender 持续同步（试用）

2026-10-21 后续全量回归见 [记录](validation/full-regression-blender-20261021/summary.json)。修复旋转、镜像与非等比缩放组合的导出剪切损失，真实接收器逐一核对沙发全部部件的世界几何边界；原点变化、隐藏、删除撤销、材质与机位保留及OptiX渲染通过。本轮使用隔离插件目录和工程，未改写活动Blender窗口或真实装修数据。

2026-10-21：本机单向同步，Furnish 管户型、家具尺寸和布局，Blender 保留材质精修、灯光、机位及用户添加的物体。无需更换商店版 Blender；实测 Microsoft Store Blender 4.5.14 LTS。

## 使用

1. 项目目录运行 `node scripts/serve.cjs --open`，进入三维；室内效果图建议选择全高墙并显示所需顶面。
2. 打开「Blender 渲染 → 持续同步 · 试用」，下载 `furnish-sync.zip`。
3. Blender「编辑 → 偏好设置 → 插件」菜单选择「从磁盘安装」，选择 ZIP 并启用 Furnish Live Sync。在三维视图按 N，打开 Furnish 页签。
4. 从 Furnish 复制本地服务地址及连接密钥，粘贴到插件，点击「连接并持续同步」。首次建议新建空 Blender 文件，避免与普通导入模型叠放。
5. Furnish 点击「立即推送场景」或开启「自动推送布局变化」。两端分别显示推送与接收状态。随后可在 Blender 调材质、布光、设置机位，正常保存 `.blend` 和渲染。

自动推送等待三维布局稳定，拖拽期间不打包。关闭面板仍继续，切回二维暂不推送，回到三维后检查变化。刷新页面关闭自动推送；重开 Blender 文件需重新连接。服务重启更换密钥，请重新复制。Furnish 停止推送与 Blender 停止接收分别控制。

默认「保留 Blender 材质」。关闭后下次接收采用 Furnish 材质／配色；选项本身不触发相同版本重新接收，可停止并重新连接。选中受管理物体可勾选「保留此物体的 Blender 姿态」，例如保留窗帘打开或电视转向；这只保留变换，几何仍由源更新。

旧工程可选「接管同名旧导出对象」：仅适用于同一保存版本、可唯一匹配的旧对象，首次接收先验证匹配再接管。失败会暂停，建议新建同步文件后迁移精修材质。原 1601 样板与当前模型版本有差异，不能保证直接接管。

## 同步契约

- 每次发布生产场景完整 GLB；家具移动、旋转、镜像、尺寸、增删、撤销恢复和可见性进入快照，价格等非三维编辑不触发。不是鼠标每帧或动画直播。
- 家具保存 ID 与生产子节点路径构成稳定标识，实例化网格在同步边界展开；家具数组重排不改变标识。建筑使用图层及层内序号，结构重建或子节点顺序变化可能生成新部件，不保证任意模型升级后的语义匹配。
- 保留原 Blender 对象并替换网格／源变换；部件类型和材质槽数量兼容才保留精修材质。源删除只删除受管理对象，材质暂存并设 fake user，Furnish 撤销后恢复；隐藏不以删除替代。用户新增物体、灯光、活动相机及世界设置保留。
- 首次无活动相机／灯光时可用源相机／灯光作起点，后续由 Blender 管理。直接编辑受管理网格会被下次源几何覆盖；修改器随原对象保留，但未验收任意第三方修改器组合。
- 首次源中心作为毫米锚点，后续中心变化换算为 Blender 米制位移，避免漂移。切换户型时浏览器自动停止推送，插件拒绝向已连接另一户型的文件接收。
- 无新 Furnish 项目字段、保存或撤销通道，不影响空间确认。Blender 修改不反向写回，插件不自动保存工程。应用失败暂停；不承诺任意 Blender 异常后的完整事务回滚。

## 实现与本地数据

`src/ui/blender-sync.js` 维护临时发布开关，`View3D.blenderSyncSignature()` 复用生产三维缓存签名。`src/io/blender-export.js` 添加标识、隐藏状态和实例展开；普通离线导出仍使用可见实体。

`scripts/blender-sync-server.cjs` 接入原 Blender API，验证同步元数据、唯一标识及内嵌资源，提供 SHA-256 不可变版本和原子 latest 索引。浏览器发布限定回环同源和专用请求头；插件使用每次服务启动生成的密钥，只连接本机 HTTP，不接受远程程序、脚本或任意路径。

`scripts/blender-sync-addon.py` 后台线程只下载与校验，主线程定时更新并回报接收状态；关闭文件／卸载停止接收，重复版本不重复导入，清理临时导入对象和无引用数据。

快照位于 `.local/blender-sync/`，暂不自动清理。删除过的精修材质以 Blender fake user 保留，可按需手动清理。完整快照及实例展开会增加大场景的体积和耗时。

## 验证

记录见 [验收结果](validation/blender-sync-20261021/summary.json)。真实浏览器自动发布并由实际安装的 ZIP 插件经本地 HTTP 接收，覆盖布局变化、隐藏、删除撤销、坐标锚点、精修材质／机位／灯光、重复接收、姿态保留、采用源材质、旧对象接管、异户型与重复标识拒绝，以及 GPU 渲染。

```text
node tests/test-blender-sync.cjs
node tests/test-blender-render.cjs
node tests/test-blender-device.cjs
node tests/test-server-startup.cjs
node scripts/verify-browser.cjs blender-render portable-smoke
node scripts/verify/verify-blender-sync.cjs
```

浏览器及真实 Blender 测试使用隔离副本／插件目录，不修改用户偏好或装修工作区。未执行全量回归、其他平台／Blender 版本、1601 精修工程完整接管或双向编辑冲突合并。
