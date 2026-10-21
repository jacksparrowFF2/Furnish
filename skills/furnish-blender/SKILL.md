---
name: furnish-blender
description: 将 Furnish 生产场景同步到 Blender，复用精修工程的材质、布光和机位，进行 GPU 室内渲染、固定区域出图及材质资产复用。适用于 Furnish 与 Blender 联动；普通家具尺寸建模遵循 furnish-modeling。
---

# Furnish 与 Blender 精修渲染

先区分用户需要生产基础预览、精修效果图、持续同步、材质库，还是 Blender 场景编辑。精修图应读取已保存的 `.blend`：仅导入 GLB 并新建世界光不能替代精修工程。

## 找到真实入口

- 在实际 Furnish 仓库读 `AGENTS.md`、`docs/ARCHITECTURE.md` 及相关的 `docs/BLENDER-RENDER.md`／`docs/BLENDER-SYNC.md`。保留未提交修改及真实装修数据。
- 本地服务默认 `node scripts/serve.cjs`、回环8765端口；通过 `/api/furnish/blender/status` 检查设备、精修工程绑定和任务。进程存在或启动器退出不表示渲染成功，以进度及实际结果为准。
- Windows 商店入口可能是 `%LOCALAPPDATA%/Microsoft/WindowsApps/blender-launcher.exe` 的重解析别名，复用项目发现逻辑，不更改 WindowsApps 权限。
- 本流程复用项目固定 Python／Node 脚本。交互精修优先使用 BlenderMCP 的 `get_scene_info`、`execute_blender_code`、`look`；安装、重连或工具未刷新时读 [MCP 接入与实测](references/mcp.md)。保留当前工程未保存编辑。

## 按任务执行

- **持续同步**：生产快照包含稳定ID、毫米原点、米制世界矩阵、展开实例及隐藏状态。Furnish拥有布局与几何，Blender保留兼容的精修材质、灯光、相机和新增物体。刷新网页需重新启用发布，服务重启需更新连接密钥；用同版本接收回执确认成功。
- **精修出图**：确认精修参数已保存、工程绑定同一户型。用 `node scripts/blender-project.cjs <工程.blend> <户型ID>` 在本机登记。右侧渲染来源选精修工程；自由角度使用Furnish当前视角，效果图使用工程活动／固定机位。网页不能指定任意 `.blend` 路径。
- **GPU**：复用 `scripts/blender-render.py` 的设备选择。精修入口加载工程副本并更新布局，保留世界、曝光、色彩管理、程序材质及灯光。预览减少采样，精细沿用保存采样；区分请求GPU与实际设备。
- **区域机位／材质资产**：读 [项目工作流](references/workflow.md)。1601脚本包含专用坐标，不能不经检查用于其他户型。
- **MCP 精修**：先读工程路径、户型ID和活动机位，确认连接的是目标窗口。用小步脚本调整材质／灯光／镜头，保存后再通过 Furnish 渲染；`look` 的实体或材质预览不能当作 Cycles 成片。不要用 MCP 改写 Furnish 拥有的尺寸与布局。

对正在使用的工程先另存副本。渲染工作副本不覆盖源 `.blend`；后台使用磁盘保存版本，不把未保存的交互改动说成已接入渲染。

## 验证与交付

- 检查实际PNG和进度，确认精修来源、机位、实际GPU及材质／环境／灯光／曝光保留；下载的 `.blend` 应能再次渲染。
- 自由机位检查相机姿态、投影和坐标锚点，尤其是旋转、镜像和源原点变化，不只验证固定机位。
- 室内图保留真实墙顶，先检查遮挡和构图，再提高分辨率。程序材质不是实物扫描，摄影补光不是照度或施工依据。
- 分别报告完成项、增量验收和边界；不将静态重渲染描述为拖动时实时光追，不将单向同步描述为双向编辑。
