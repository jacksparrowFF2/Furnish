# Blender 导出与一键渲染

2026-10-21 后续全量回归已通过273组Node套件、12套内置方案、31个生产预览与全部163个规范浏览器场景。实际OptiX验证基础渲染、精修工程活动／Furnish机位及持续同步；本轮修复剪切变换导入误差、侧栏顶面选项重开丢失、二维透明三维层截获点击和损坏柜体启动恢复。数据与精修源工程未改写，详见 [完整记录与边界](validation/full-regression-blender-20261021/summary.json)。下文早期增量验收记录保留其原检查范围。

导出对非等比父级缩放叠加部件旋转形成的剪切使用独立几何烘焙，保留镜像TRS，避免Blender分解矩阵时损失约毫米级形状；普通导出中带剪切的实例会自动展开，其余实例仍可保留。此过程只处理导出副本，不修改生产网格、家具尺寸或方案字段。

## BlenderMCP 交互精修（2026-10-21）

已安装并验证社区 `mcp-for-blender` 2.2.2，可通过MCP查询活动工程、调整材质／灯光／镜头、保存和取回渲染图。Furnish本地服务仍读取已登记工程的保存快照；MCP未保存的调整不会进入一键渲染。当前1601绑定为 `D:/1601装修/渲染/1601-BlenderMCP验证-20261021/1601-MCP精修验证.blend`，户型 `custom_mv37igji`。原固定区域样板保留。

安装位置、客户端重启、多个Blender窗口的端口归属、工具错误判定及复用入口见 [skill MCP参考](../skills/furnish-blender/references/mcp.md)。这不增加Furnish运行依赖、加载脚本或持久项目字段；不是Blender到Furnish的双向几何编辑。

2026-10-21：三维工具栏新增「Blender 渲染」。直接打开 `index.html` 可离线导出 GLB；通过 `node scripts/serve.cjs --open` 打开后可调用本机 Blender，完成后预览并下载 PNG、Blender 工程和本次 GLB。

## 使用

2026-10-21：渲染入口改为画布右侧非模态面板；可保持面板打开，在左侧操作鸟瞰／漫游机位，点击一键渲染后在右侧查看静态结果。改变视角后需再次渲染，不是拖动时实时光追。关闭面板任务继续，重开恢复最近结果；窄屏使用下方浮层。

渲染来源可选「生产场景 · 基础材质」或「已绑定的精修工程」。后者先复制已保存的 `.blend`，更新当前生产布局，再沿用工程的兼容材质、灯光、世界环境、曝光、色彩管理及Cycles参数。源工程不被覆盖；后台使用磁盘版本，未保存的Blender编辑不会自动进入渲染。

## 精修工程绑定

在本机命令行登记已经建立持续同步的精修工程，网页不接收任意文件路径：

```powershell
node scripts/blender-project.cjs 'D:\1601装修\渲染\1601固定区域效果图-20261021\1601-固定区域机位.blend' custom_mv37igji
```

绑定保存在忽略的 `.local/blender-project.json`，与Furnish项目保存字段分开。仅同一户型可使用，缺少绑定或户型不符时拒绝精修请求，不静默降级为基础材质。状态接口只返回名称及户型ID。提交任务时复制工程，之后修改或重存源文件不影响本次快照；历史任务仍按原策略保留。

绑定同户型时面板默认使用精修工程和该工程的活动相机，也可选Furnish当前视角。1601固定工程另含客厅／餐厅／厨房／主卧机位，其他工程须有对应命名相机才能使用这些区域选项。当前工程／固定机位按4:3出图，Furnish视角按其相机比例出图；预览限32采样，精细保留工程采样。当前精修入口需要Cycles工程。

`scripts/blender-refined.py` 调用生产同步合并，保留原网格对象的兼容材质、灯光和世界；自由机位通过同次GLB导入的相机及坐标锚点传入，不推算网页屏幕坐标。Worker进度包含精修来源、机位、材质绑定保留数量、灯光数量、曝光及采样，任务API的 `renderInfo` 返回同样记录。原基础来源保留旧管线。

真实1601工程已验证工程机位与Furnish改变后的机位，两条路径均保留4355个已有网格材质绑定、8盏灯光、Nishita世界、AgX和-0.6曝光；模板及源工作区未改写。见 [精修验收](validation/blender-refined-20261021/summary.json)。未执行全量回归或未保存活动工程的自动抓取。

## 基础导出与任务

1. 在 Furnish 三维场景调整相机、墙体剖切及可见图层。
2. 打开「Blender 渲染」。鸟瞰通常关闭「包含当前可见的顶面与吊顶」；室内视角可开启。要完整墙体，先在「显示」选择「全高墙」。当前隐藏的顶面不会因勾选而重新生成。
3. 「导出 Blender 场景 GLB」下载自包含场景。在 Blender「文件 → 导入 → glTF 2.0」导入，将 `FurnishCamera` 设为活动相机后可继续编辑、布光和渲染。
4. 「一键渲染」通过本地服务运行 Cycles，默认自动选择 GPU。基础来源预览最长边 960 px、32采样，精细最长边1920 px、128采样；精修来源按上节保留工程参数。完成后下载PNG、打包工程或本次生产GLB；GLB本身不包含精修工程节点。

## GPU 渲染（2026-10-21）

设备可选「自动 · 优先 GPU」「仅 GPU」「CPU」。自动按 OptiX、CUDA、HIP、oneAPI、Metal 顺序探测当前 Blender 实际可用的设备，只启用选定后端的 GPU，关闭 CPU 混合计算；不会保存或改写用户全局偏好。未找到 GPU 时自动模式使用 CPU；仅 GPU 模式明确失败。自动模式下可捕获的 GPU 渲染错误会重存 CPU 配置并重试一次，进程崩溃或系统驱动异常仍按失败报告。

进度及完成信息显示实际后端、显卡名称与回退原因，服务 API 返回 `device`（请求模式）及 `renderDevice`（实际设备）。旧客户端未传模式时使用自动模式。下载的 `.blend` 保留本次实际渲染设备设置。

本机 NVIDIA GeForce RTX 4070 Ti SUPER、16GB 显存、驱动 617.42，已使用商店 Blender 4.5.14 LTS 通过 OptiX 完成真实 GPU 渲染，包含生产 GLB 实例化零件、结果下载和界面回显。其他 GPU 后端的选择逻辑通过模拟设备回归，未进行对应实体显卡验收。见 [GPU 验收](validation/blender-gpu-20261021/summary.json)。

GPU 主要改善速度，不自动提高相同设置的画面质量。室内效果图还需要室内机位、合适的窗外与室内照明、PBR 材质及真实尺度纹理、足够的模型细节和采样。当前世界光与基础材质是渲染起点，不能将 GPU 接入等同于已完成室内写实效果图。

关闭面板不会取消服务端任务，重开会恢复最近任务。一个服务同时只运行一个任务，运行中可取消。失败可重试。任务以场景快照渲染；渲染期间修改 Furnish 不更新已经提交的场景。

## Windows 与商店版

需要 Blender 4.2+；本次实际验证 Microsoft Store Blender 4.5.14 LTS。无需重装，不修改 WindowsApps 权限。

服务优先读取 `FURNISH_BLENDER`，其次检查商店执行别名 `%LOCALAPPDATA%\Microsoft\WindowsApps\blender-launcher.exe`、PATH 的 `blender.exe` 及 Blender Foundation 常规安装目录。商店别名是系统重解析点，允许通过 `lstat` 识别，不能用 `existsSync/stat` 的失败推定未安装。安装位置随商店更新变化时无需重新填写包路径。

自定义安装可在启动服务的 PowerShell 中设置：

```powershell
$env:FURNISH_BLENDER = 'D:\Apps\Blender\blender.exe'
node scripts/serve.cjs --open
```

商店执行别名若被禁用，可在 Windows「应用执行别名」中检查 Blender。找到入口仅表示具备候选程序；真正的启动、版本、导入和渲染错误在任务中显示。启动等待上限 90 秒，单次任务上限 30 分钟。

## 数据与实现

- `src/io/blender-export.js` 从当前生产场景建立独立快照：复制网格几何、材质及世界矩阵，保留米单位、旋转、镜像、当前开合和实例化零件。相机保留世界姿态与投影，记录原毫米坐标中心。
- 只导出建筑、家具和灯具中的可见实体；不导出选择框、房间名、尺寸、空间核对和舞台大地面。默认排除顶面与吊顶，包括与其同层的自动顶灯。无实体或有家具模型错误时拒绝导出。
- 临时定位透视使用的着色器剖切不烘焙进 GLB，导出使用原材质；实际「剖切墙」生产几何会保留。浏览器专用着色器、环境反射、曝光与阴影贴图不直接迁移，GLB 保留基础 PBR 属性与纹理。纹理单边上限 2048 px。
- 复用项目 Three.js r160；官方 GLTFExporter 与 TextureUtils 的源码、MIT 许可和离线包装位于 `vendor/three-r160`。包装为普通脚本工厂，通过现有 Three.js 实例导出，没有第二套引擎、CDN 或运行时构建。维护时可运行 `node scripts/build-blender-exporter.cjs` 重建包装。
- `scripts/blender-server.cjs` 接在工作区 API 前，限定回环同源、固定自定义请求头、256 MB 输入和渲染参数范围；只接受内嵌资源的 GLB，不接受 HTTP 提供的执行文件路径、任意命令或 Python。使用参数数组、`shell:false`、隐藏窗口和固定 worker。
- `scripts/blender-render.py` 用工厂空场景、关闭自动执行导入 GLB，设置米单位、活动相机、AgX、基础环境光、Cycles 设备和降噪；先保存打包的 `.blend`，再渲染 PNG。不会打开或覆盖用户已有 Blender 工程及启动偏好。
- 商店启动器可能提前退出或不传 stdout。worker 通过任务专属、带随机 token 的原子进度文件报告实际 Blender PID 和阶段；启动器退出 0 不视为成功，成功需 worker 完成记录及 PNG、BLEND 两个结果。取消使用实际 worker PID，启动期使用取消标记。
- 结果位于 `.local/blender-renders/<随机任务编号>/`。任务表仅在服务内存保留最近 16 项，重启后不能通过旧 URL 下载；磁盘文件仍可直接取回。当前不自动清理历史结果，需用户按需移除。
- 没有新增项目字段、格式版本、撤销记录或保存通道；导出和渲染不修改尺寸、空间确认及采购数据。

## 验证与边界

增量验收记录见 [summary.json](validation/blender-render-20261021/summary.json)。覆盖普通脚本共享声明与入口资源、快照米制与旋转镜像、相机、隐藏与顶面、实例化属性、GLB 校验、接口同源限制、单任务、启动器提前退出、失败、取消和结果下载。HTTP 和断网 `file://` 生产导出、刷新与 390 px 窄屏通过；实际商店版 Blender 导入、Cycles 渲染、界面关闭重开及 PNG/BLEND/GLB 下载通过。

未执行全量 `node scripts/check.cjs` 或无关历史预览遍历。未验证其他操作系统或其他 Blender 版本；GPU 验收范围见上节。保留相机与空间几何不保证与 WebGL 的光照观感相同；当前基础世界光适合作为后续精修起点，另有本机单向[持续同步试用版](BLENDER-SYNC.md)；尚不支持动画片段导出、浏览器着色器烘焙或 Blender 修改反向写回。

增量复验：

```text
node tests/test-blender-render.cjs
node tests/test-blender-device.cjs
node tests/test-server-startup.cjs
node scripts/verify-browser.cjs blender-render portable-smoke
node scripts/verify/verify-blender-live.cjs
```

最后一项会调用真实安装的 Blender，使用隔离副本与独立回环端口，不读写仓库中的用户工作区。
