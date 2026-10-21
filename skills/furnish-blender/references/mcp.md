# BlenderMCP 接入与精修交接

## 本机已安装的组件（2026-10-21）

- 上游：<https://github.com/ahujasid/mcp-for-blender>，PyPI `mcp-for-blender==2.2.2`，插件1.8／协议14。通过现有 uv 安装到隔离工具环境，不使用全局 conda Python。
- Codex 用户配置：`~/.codex/config.toml` 的 `mcp_servers.blender`，stdio命令 `C:/Users/SPH/.local/bin/mcp-for-blender.exe`。新增前备份为 `config.toml.before-blender-mcp-20261021.bak`；不要覆盖其他 MCP 配置。
- 环境：`BLENDER_HOST=127.0.0.1`、`BLENDER_PORT=9876`、`BLENDER_MCP_SAFE_MODE=1`、`BLENDER_MCP_DISABLE_TELEMETRY=1`。安全模式仅校验 MCP 脚本，不等于隔离 Blender 或保护无认证的插件 socket；连接保持本机。
- Microsoft Store Blender4.5.14的实际插件位置为 `%LOCALAPPDATA%/Packages/BlenderFoundation.Blender4.5LTS_ppwjx1n5r4v9t/LocalCache/Roaming/Blender Foundation/Blender/4.5/scripts/addons/blender_mcp.py`。普通 `%APPDATA%/Blender Foundation/...` 的安装成功不能证明商店实例会加载。用 Blender 的 `bpy.utils.user_resource('SCRIPTS')` 或实际目录确认，不修改 WindowsApps 权限。
- 插件已启用并保存用户偏好；新打开的 Blender 可自动监听9876。配置新增后若当前 Codex 没有工具，重新启动 Codex 再发现工具；不能将写入配置说成当前会话已热加载。

## 每次操作的有效检查

1. 使用 `get_scene_info(fields=['settings'], limit=...)` 读取真实工程路径、相机、引擎。多个 Blender 窗口时，9876由先成功监听的实例拥有，不代表当前前台窗口。路径错误时停止修改，切换连接或给目标窗口使用独立端口，不能以窗口焦点代替身份检查。
2. 通过 `execute_blender_code` 读取受管理集合的 `furnishPlanId`、材质、世界、曝光及灯光。Furnish管理几何／布局，MCP负责精修外观；保留稳定ID与姿态锁，不默认将 Blender 修改写回 Furnish。
3. 在副本上小步调整。安全模式禁止os/sys、任意文件读写、处理器／定时器注册和动态执行；普通bpy材质／灯光／渲染／保存可用。若子表达式导航被拒绝，将合法对象访问拆成普通变量，例如先 `cycles_addon=bpy.context.preferences.addons['cycles']` 再 `prefs=cycles_addon.preferences`。不为方便执行而关闭安全模式。
4. 检查工具返回文本。2.2.2 的脚本拒绝或执行异常可能仍有 `isError=false`，只有 `Code executed successfully:` 及实际产物／断言才支持成功结论。
5. Cycles用GPU生成PNG，`look(image='Render Result')`可取回成片；`look(mode='camera', shading='solid')`仅用于遮挡／构图。`look` 的 rendered 视口模式不支持 Cycles。不要将视口截图当成完成的精修渲染。
6. 保存精修 `.blend` 后，以本机CLI `node scripts/blender-project.cjs <文件> <户型ID>` 登记，Furnish再渲染其磁盘快照。未保存改动不会进入后台任务。同步插件、MCP插件和后台渲染是三个独立链路。

长时间渲染使用 Furnish 后台队列；MCP2.2.2的插件socket等待约180秒，超时不证明渲染已停止，不立即重复提交。

## 当前1601验证副本

`D:/1601装修/渲染/1601-BlenderMCP验证-20261021/1601-MCP精修验证.blend`，户型ID `custom_mv37igji`。原固定机位工程保留，原持续同步窗口的未保存编辑没有被覆盖。当前Furnish本机精修登记已指向此副本，后续以实际配置为准。

初次MCP验证读取4355网格、8灯、9相机；沙发织物粗糙度0.82→0.86、Sheen0.25→0.30，摄影补光20→24W，固定客厅机位、Nishita世界、AgX和曝光-0.6保留。比较修改前后全部网格顶点／面数量及世界矩阵未变（该次不是逐顶点坐标哈希验收）。OptiX RTX4070TiSUPER，1280×960／64采样，图片 `01-MCP客厅验证.png`。

后续客厅二次精修已保存到同一绑定文件：最新参数为1920×1440／160采样、曝光-0.75、沙发粗糙度0.83／Sheen0.36、自然主光340W／摄影补光18W／顶面补光12W。四张正式图、精修前备份及完成归档位于 `D:/1601装修/渲染/1601客厅精修-20261021`；机位坐标存于场景 `livingRefineShots`。默认 `1601固定机位 | 01-客厅`，另有三个 `1601精修 | ...` 机位供Blender切换，Furnish机位UI未新增选项。保存后逐顶点坐标、拓扑与世界矩阵哈希和4355网格全部一致，Furnish侧栏复用通过。详情见实际仓库的 `docs/BLENDER-1601-LIVING.md` 及 `docs/validation/1601-living-refine-20261021/summary.json`。

检查材质实际使用方时读取 `object.material_slots[].material`；同步后可能使用对象级材质覆盖，只读 `object.data.materials` 会误判精修材质未被使用。

## 当前会话工具未刷新时的协议验证

优先使用已发现的MCP工具。只有尚未刷新或诊断连接时，使用本skill的 `scripts/mcp-client.py`，它调用上游stdio服务器，不直接绕过MCP向socket发脚本。运行环境需含官方mcp SDK；本机uv工具环境的 `Scripts/python.exe` 已包含。每次调用启动一个临时客户端并在结束关闭，不再并行启动多个诊断客户端。

```powershell
# 根据 uv tool dir 得到实际工具目录；下面是本机路径示例
$mcpPython = 'C:/Users/SPH/AppData/Roaming/uv/tools/mcp-for-blender/Scripts/python.exe'
& $mcpPython <skill目录>/scripts/mcp-client.py --list --output <输出目录>/tools.json
& $mcpPython <skill目录>/scripts/mcp-client.py --tool get_scene_info --arguments <参数.json> --output <结果.json>
```

参数JSON为工具原始参数，例如 `{"fields":["settings"],"limit":5}`；脚本执行用 `{"code":"import bpy\nprint(bpy.data.filepath)"}`。图片块另存PNG，结果JSON保留图片路径，避免在日志中输出base64。脚本拒绝或执行失败返回非零；普通文本查询仍需核对返回内容与目标身份。
