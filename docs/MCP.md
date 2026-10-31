# Furnish 专用 MCP

MCP 连接正在运行的 Furnish 桌面主窗口。它读取的是当前画布和保存状态，包括尚在保存中的编辑，不是重新解析一份磁盘项目来代替桌面状态。默认连接本仓库；桌面快捷方式的 `furnish-desktop.json` 须指向相同工作目录。

## 工具与坐标

| 工具 | 行为 |
| --- | --- |
| `get_current_plan` | 返回当前户型、方案列表、家具完整记录、模型坐标说明、保存状态、撤销计数及 `revision`。`includeDetails:true` 另返回当前完整 `work`。 |
| `copy_design` | 以当前布置创建并进入具名可编辑副本，原方案保留。调用现有 `FurnishDesignUI.createDesign`，不另建复制／保存机制。 |
| `update_furniture` | 按家具 ID 一次批量修改 `cx/cy/w/d/h/rot`，先完整预演与校验，再通过一次原 `mutate()` 应用，整批可从界面撤销／重做。 |
| `check_space` | 使用当前方案保存的 `spaceThreshold` 和生产 `spaceCheck`；支持 `focusIds`，输出未知信息和既有确认状态，不改变家具或确认记录。 |

输入使用 mm，`cx/cy` 是户型模型坐标中的家具中心，`w/d` 是家具局部宽深，`h` 是机身高度，`rot` 是角度。屏幕旋转、缩放、镜像不改变这些输入的解释。尺寸调整复用 `resizeFurniture` 及原尺寸基准；尺寸可能联动中心或关联家具，调用者应读取返回的实际结果。省略字段保持原值，不把缺失高度补成厂家尺寸。第一版不编辑安装高度、柜体分区、墙体或材质。

修改请求需要 `planId`、读取时的 `revision` 和唯一 `requestId`。先读取，再复制方案，使用复制结果的新 revision 调整家具。方案被手工修改、撤销／重做或页面重载后，旧 revision 失效；不会自动重读后强行套用旧请求。完全相同的 requestId 重试返回原回执，同一 ID 携带不同参数则拒绝；回执缓存仅限本次页面会话最近 200 次修改，重载后须重新读取，不盲目重放。

```json
{
  "planId": "从读取结果获取",
  "revision": "从最近一次读取或修改回执获取",
  "requestId": "每次新操作的唯一编号",
  "updates": [{"id": "家具ID", "cx": 3200, "cy": 5800, "w": 1800, "d": 450}]
}
```

沿用现有方案语义：复制并进入新方案会清空跨方案撤销栈，复制本身不是家具编辑撤销项；原方案和恢复点保留。新方案内的家具修改可撤销／重做。单件／图层锁定、正在拖动／绘制／模态编辑、无效参数或已知保存冲突会拒绝写操作。允许形成空间冲突的有效布局，后续通过空间核对判断，不擅自移动避让。

修改后等待原 `repositoryClient.flush()`，返回 `applied` 和 `persisted`。保存期间出现外部修订冲突时可能 `applied:true,persisted:false`：画布编辑和原恢复缓存保留，正式文件不会被覆盖；MCP 工具以错误回执提示，不能将其表述为保存成功。读取仍可用，后续写入停止，沿界面原恢复流程处理。请求超时也不能证明未执行，先重新读取；不要换 requestId 盲目重试。

## 连接与本机配置

入口为 `node scripts/furnish-mcp.cjs`，或 `npm run mcp`。它使用 MCP 2025-11-25 的 stdio 生命周期和换行 JSON-RPC，协商兼容 2025-06-18、2025-03-26、2024-11-05；仅宣告四个工具，不提供脚本执行、任意文件或远程网络访问工具。无新增 npm 依赖。

在 Codex 配置中添加 stdio 服务，例如从本仓库运行：

```powershell
codex mcp add furnish -- node C:/Users/SPH/Documents/GitHub/Furnish/scripts/furnish-mcp.cjs
```

建议在 `[mcp_servers.furnish]` 设置 `tool_timeout_sec = 180`，与本地保存等待匹配。配置由 Codex 管理，不把用户全局配置纳入 Git。已有聊天可能需要在 MCP 设置中重新加载服务或打开新聊天，才能发现新增工具。[Codex 官方配置说明](https://learn.chatgpt.com/docs/extend/mcp)。协议依据 [MCP stdio](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) 与 [Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)。

桌面主进程创建 `127.0.0.1` 随机端口、随机会话令牌和 `.local/desktop-mcp/runtime.json` 发现记录。stdio 客户端只读取该工作目录的记录；HTTP 连接验证令牌、Host，拒绝带 Origin／Sec-Fetch-Site 的浏览器请求，没有 CORS。端点只转发已校验的四种命令到主窗口，不接受调用者脚本；网页沙箱、无 Node 集成保持。令牌不出现在工具回执或日志中，退出时关闭端点并移除本实例记录。`FURNISH_MCP_DISABLE=1` 可在启动前禁用；浏览器和 file:// 页面不会创建监听端点。

本机包网页沿源码刷新；接入 MCP 改动了 `desktop/main.cjs`，因此旧包须备份并更新 `resources/app/main.cjs` 后重启，或在新目录重打包。便携包通过原复制式打包携带两个 MCP 运行脚本及共用核心。

## 验证

`tests/test-furnish-mcp.cjs` 验证真实 stdio 初始化／工具发现／调用、错误参数、未启动桌面、HTTP 鉴权和来源拒绝、退出清理。`tests/test-furnish-mcp-desktop.cjs` 用真实打包 EXE、独立项目／缓存／端口及真实 stdio 客户端验证复制、批量尺寸／位置、撤销／重做、锁定、旧版本、生产核对、保存、刷新和断网 file://。测试从正式文件只读取快照，核对端点与保存路径属于隔离根目录；记录正式文件与仓库文件前后哈希，如用户并行编辑导致变化如实报告，不覆盖或回滚用户编辑。

此接口继承现有空间算法边界；未知高度、资料缺失和路径可达性不因使用 MCP 而变为已通过。最终布置仍需桌面目视核对。
