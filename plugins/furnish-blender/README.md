# Furnish × Blender for Codex

将 [DSH × Blender](https://github.com/sixtysevenlf/dsh-blender-plugin) 的独立 Gateway、Python 建模引擎、算子目录和 Blender 扩展适配为 Codex 插件。不需要 DSH、Cordis、npm 安装或 Furnish 前端构建步骤。依赖本机 Node.js **24.9+** 与 Blender。

## 安装

本仓库的 `.agents/plugins/marketplace.json` 提供 `furnish-blender`。在 Codex 插件目录选择 **Furnish Local** 来源安装 **Furnish × Blender**；修改或首次加入本地市场后重启客户端，在新聊天验证工具发现。也可使用 `codex plugin marketplace add jacksparrowFF2/Furnish` 导入此仓库市场。

已支持 plugin CLI 的 Codex 也可在仓库运行 `codex plugin marketplace add .`，再运行 `codex plugin add furnish-blender@furnish-local`。官方格式依据：[插件打包](https://developers.openai.com/plugins/build/plugins)。

本地 MCP 兼容入口（不使用插件目录时）：

```powershell
codex mcp add furnish_blender -- node C:/path/to/Furnish/plugins/furnish-blender/mcp/server.cjs
```

插件工具：`blender_session`、`blender_op`、`blender_py`、`blender_see`、`blender_run`、`blender_inspect`、`furnish_model`。参数采用 MCP 工具清单；不是 DSH 工具参数的逐字兼容接口。插件中含配套建模 skill。

## 首次检查

1. `furnish_model(action="bind",root="C:/path/to/Furnish")`：在插件数据目录记住工作目录；再用 `action="doctor"` 核对共用 Blender 发现规则。绑定应在首次启动 Gateway 前完成。
2. `blender_op(op="catalog")`：检查离线算子目录，不启动 Blender。第一次使用 Gateway 时，Node 内置 TS 转换器将锁定源码生成到本机数据目录，不修改供应源码。
3. **后台路线**：`blender_run(action="submit",args={"kind":"headless","script":"import bpy; print(bpy.app.version_string)"})`，随后按 id 调用 wait/collect，核对 completed、退出码与实际日志。
4. **GUI 路线**：在独立 Blender 实例安装 `vendor/dsh/extension/dsh_blender_bridge.zip`，将扩展偏好的 **Gateway Port** 改为 **39878**，在 N 面板 Connect。`blender_session(action="doctor")` 必须返回 kind=ok，再按返回实例身份 attach。扩展保留上游名称 DSH Blender Bridge。不要在同一实例运行两个 agent bridge；当前旧 BlenderMCP 用户使用独立配置/实例，原实例不受影响。

源安装会从 Furnish 的 `scripts/blender-server.cjs` 复用 Scoop/显式配置等发现顺序；缓存安装请设置 FURNISH_ROOT，或明确设置 FURNISH_BLENDER。当前聊天不会因写入配置自动热加载新工具。

## 本机配置与生命周期

| 环境变量 | 用途 |
|---|---|
| FURNISH_ROOT | Furnish 工作目录；缓存插件不能假定其父目录是仓库 |
| FURNISH_BLENDER | Blender 可执行文件；显式设置优先 |
| FURNISH_BLENDER_PORT | 默认 39878；与扩展偏好端口一致 |
| FURNISH_BLENDER_DATA | 插件缓存、日志、任务和 Gateway 密钥目录；优先于 PLUGIN_DATA |

否则使用 Codex 的 PLUGIN_DATA；源码模式使用仓库 `.local/codex-blender`。Gateway 只绑定 127.0.0.1，HTTP 需要本机随机 bearer key，拒绝浏览器 Origin；扩展使用原上游 WebSocket 握手。客户端身份映射为上游会话/agent头以保留归属、冲突与暂停规则。不发送遥测，不自动安装依赖、修改全局偏好或停用其他扩展。

Gateway由插件按需启动并在同一数据目录/源码指纹间复用；端口被其它服务占用时报错，不夺取端口。后台任务不因 MCP 客户端退出而中断；无活动任务且十分钟没有请求后 Gateway 退出。客户端正常退出释放已附着会话。异常退出的会话沿上游超时处理。

Python拥有本机用户权限，不构成沙箱。浏览器来源拒绝和本机认证不意味着可以执行不可信脚本。只操作当前任务授权的工程副本。

## Furnish 建模工作流

参考解读／像素测量 → 相机匹配 → 轮廓／结构／材质逐阶段看图 → 具名部件／运动检查 → Furnish 独立发布 → 单配置生产整链路 → 正式模型视觉对照。

`furnish_model(action="profiles")` 返回真实注册清单。`action="verify",profile="side-table"` 调用现有 `scripts/verify/verify-model-pipeline.cjs`，立即返回 id，后续 status/collect 收取回执。验证在原流程隔离副本中进行，不将验证发布资产写进当前工作目录。作业日志和完整报告留在本机；`passed=true` 不表示参考照片还原度通过。该工具不提供 `all`，按实际影响选择配置。

本插件保留上游 catalog 的完整目录与执行引擎，未宣称逐个验证所有算子。外部图像/科学计算/导出检查算子可能需要额外 Python 包；virtual-gui、DSH TUI 选中芯片、宿主卡片和一键安装依赖未移植。headless 队列只承诺实际支持的 script/script_file/file/outdir/timeout_ms 等参数，不自动加载 GUI 内核。

## 验证与来源

```powershell
node tests/test-codex-blender-plugin.cjs
node scripts/verify/verify-codex-blender.cjs
```

真实测试及边界见仓库 `docs/CODEX-BLENDER-PLUGIN.md`。源码、锁定提交和逐文件哈希见 `vendor/dsh/UPSTREAM.json`，本地修复见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。升级供应源码须显式复核并更新锁定清单，不自动追随远端 main。
