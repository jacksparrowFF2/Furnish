# Codex Blender 插件与 Furnish 建模工作流

插件位于 [`plugins/furnish-blender`](../plugins/furnish-blender/README.md)，适配上游 DSH × Blender 的独立引擎，移除对 DSH 宿主、Cordis、工具卡片及附件服务的运行依赖。供应源码保留在仓库，可离线使用；锁定提交 `68513f23e068eaa36cd958af9ba9aa068c64752b`，原许可证及本地修复记录随插件交付。

## 安装与实际入口

Node.js 24.9+，Blender 路径复用现有显式配置／Scoop／商店别名发现逻辑。无需为 Furnish 前端增加构建工具。

```powershell
codex plugin marketplace add .
codex plugin add furnish-blender@furnish-local
```

市场文件为 `.agents/plugins/marketplace.json`，插件使用官方支持的 `.codex-plugin/plugin.json` 与 `.mcp.json` 兼容格式，参见 [OpenAI 插件打包文档](https://developers.openai.com/plugins/build/plugins)。安装不代表当前聊天已热加载新工具；重启客户端或在新聊天验证工具发现。

1.0.1修正启动参数：清单使用`cwd: "."`及`args: ["mcp/server.cjs"]`；Codex将相对cwd解析到安装副本，兼容清单args不展开`${CLAUDE_PLUGIN_ROOT}`。原先按绝对脚本路径进行的测试没有覆盖这一层。新增`verify-codex-blender-registration.cjs`读取`codex mcp get furnish_blender --json`，使用其中实际命令／参数／工作目录完成工具发现，禁止未展开的占位符。实现依据为[Codex官方配置解析源码](https://github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/plugin_config.rs)。

首次用 `furnish_model action=bind root=<Furnish工作目录>` 在插件数据目录绑定仓库，再用 `action=doctor` 查路径及清单。插件缓存中的相对父目录不能作为 Furnish 仓库。显式单次 root 优先于绑定；FURNISH_ROOT／FURNISH_BLENDER 仍可用于固定配置。

## 工具与职责

| 工具 | 适配范围 |
|---|---|
| blender_session | doctor/status、列出实例、attach/claim/release、写权限与人改冲突信息 |
| blender_op | 原 catalog 与 plan 算子；loop/opt/preset/txn 按 Gateway 参数传递 |
| blender_py | 已附着 GUI 的持久 Python 内核，保留会话归属与人类暂停规则 |
| blender_see | viewport/camera/custom 单帧 PNG，使用原生 MCP 图片块，保留相机／预览元数据 |
| blender_run | 后台 headless/render，立即返回ID；status/wait/collect/cancel沿同一队列，wait最多30秒 |
| blender_inspect | 仅原命令目录中 access=read 的命令，拒绝写入及内部传输命令 |
| furnish_model | bind/doctor/profiles、单配置隔离 verify 与 status/collect，不直接修改正式方案或发布正式资产 |

Gateway默认使用39878端口，与既有 BlenderMCP 9876及上游默认39877分开。GUI扩展在独立实例中设置 Gateway Port=39878；保留原扩展名称。先读取实例和工程身份，再附着。正式精修工程继续可使用既有 BlenderMCP，不自动迁移、关闭或覆盖。

HTTP只接受带本机随机密钥的回环请求并拒绝浏览器Origin；扩展沿上游WebSocket握手。多个Codex客户端共享同一插件数据目录且源码指纹一致的Gateway，分别携带独立会话身份。端口冲突明确失败，不抢占其它服务。后台任务不因MCP退出被主动取消；十分钟无请求且无活动任务后Gateway退出。Python具有本机用户权限，操作对象仍应是授权的工程副本。

## 建模流程变化

1. **参考测量**：实际打开原图及局部，记录来源／哈希／未知；catalog发现图像测量算子。未标定时保留像素，不把图像估算升级为厂家尺寸。
2. **迭代**：固定相机，按轮廓→结构→材质实际渲染看图，保留同机位前后证据。上游catalog的提示与分数是工具数据，Furnish的`BLENDER-VISUAL-REVIEW.md`及产品文档优先；IoU不能替代目视验收。
3. **技术门禁**：源工程预检、具名部件／运动审计和上游装配检查可辅助创作；正式发布仍走Furnish独立发布器和型号白名单。
4. **生产验证**：`furnish_model action=profiles`返回真实132项清单（本轮）；`verify profile=<id>`后台调用既有`verify-model-pipeline.cjs`。作者／独立发布／空间／HTTP与file生产导出／逐部件Blender回读／GPU三机位／下载工程重开全部由原流程负责，不另建生产规则。
5. **分项交付**：后台回执保存`passed`与技术阶段，视觉状态明确为not-executed，待执行者看图后另记结论。无新产品字段、项目版本、应用加载脚本、保存或撤销通道。

## 修复与验证

本地修改只涉及供应引擎的队列启动参数：显式`--python-exit-code 1`，确保脚本异常进入failed；`--factory-startup`位于输入`.blend`之前，避免重置已载入场景，同时排除用户启动文件及扩展；载入前关闭blend自动执行。原始／修订文件哈希见UPSTREAM.json。

增量命令：

```powershell
npm run test:codex-blender
npm run verify:codex-blender:registration
npm run verify:codex-blender
npm run verify:codex-blender:gui
```

本轮在Blender 5.2.3 LTS实际验证GUI连接、检查／Python／原生截图、标定量测、后台脚本／工程保留／渲染及异常负例；side-table使用RTX 4070 Ti SUPER／OPTIX通过原生产整链路。证据见[2026-11-11验收](validation/codex-blender-plugin-20261111/README.md)。这不扩大上游对其它Blender版本、全部算子或全部型号的兼容承诺。

未移植DSH TUI选中芯片、宿主卡片、virtual-gui及一键安装依赖。部分外部图像／科学计算／导出算子需要额外依赖，缺失时沿原回执报告；不自动安装。headless队列不隐式加载GUI的K内核，长脚本应使用普通bpy或显式准备自己的依赖。本轮未执行全部132配置、全部228算子或Furnish全量回归，也未修改正式布局进行桌面保存测试。
