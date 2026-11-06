# 原目录桌面启动失败：低完整性标签

2026-11-06，Windows 11 build 26300。直接原因已通过原生转储、最小 Win32 API 和同文件 A/B/A 验证；标签写入者及精确写入时间未能追溯。精简结果见 [evidence.json](evidence.json)。

## 具体权限与失败链

仓库 `C:\Users\SPH\Documents\GitHub\Furnish` 的 SACL 含显式可继承 `SYSTEM_MANDATORY_LABEL_ACE`：`S-1-16-4096`／Low Mandatory Level，`OI|CI`，`NW`。原 `output/desktop/Furnish-win32-x64/Furnish.exe` 继承该标签。上级 `GitHub` 和工作区外正式 D 盘 EXE 没有低完整性标签，按 Windows 默认视为 Medium（8192）。

[微软 MIC 文档](https://learn.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control)说明：新进程完整性取用户与可执行文件的较低级别；普通 DACL 授权不能覆盖强制完整性检查。因此即使当前用户有完全控制，Low EXE 的新进程仍为 Low。问题与之前怀疑的未知 DACL SID、GPU 驱动无因果证据。

原生 Electron 45.2.3 `--version` 首个主动断点处，BrokerServices 第三个虚函数 `CreateAlternateDesktop(2)` 返回 12，线程 LastError 为 5。反汇编显示 `CreateWindowStationW(NULL,0,0x80000008,sd)` 失败后，以 `0xA` 重试仍失败。Chromium 随后触发 `int3; ud2`，正常运行退出码为 `0x80000003`。未加载 Furnish 网页或方案。依据为[沙箱接口](https://github.com/chromium/chromium/blob/main/sandbox/win/src/sandbox.h)、[窗口站创建](https://github.com/chromium/chromium/blob/main/sandbox/win/src/window.cc)和[错误码](https://github.com/chromium/chromium/blob/main/sandbox/win/src/sandbox_types.h)；发布二进制的对应调用和数值已实际检查，未把仅有导出符号的近邻名称当成准确函数名。

## 对照实验

| 实验 | 结果 |
|---|---|
| 原 DACL 复制到 D 盘；在 D 盘复刻所有祖先 DACL | Electron正常 |
| 工作区内独立运行时改用正常 DACL | 仍退出0x80000003 |
| 相同 EXE 在 C 盘临时目录／D 盘运行 | 正常 |
| 不加载Electron，同一Python在原工作区调用窗口站API | 实际token为S-1-16-4096，四种调用均ERROR_ACCESS_DENIED(5) |
| 相同Python位于D盘 | token为S-1-16-8192，四种调用均成功 |
| 相同D盘Electron45.2.3：正常→显式Low→恢复Medium | exit 0→2147483651→0 |

Python 对照均在 WinSta0，作业对象 UI 限制位为0，无AppContainer／AppSilo；实际区别为令牌完整性。标准用户启动、显式WinSta0启动、改文件名、移除诊断环境变量均未消除原路径问题。所有标签变更只在独立诊断副本，最后恢复该副本Medium，正式仓库与可用程序标签不变。

## “突然发生”与安装命令

Low标签影响新进程，不会追溯降低已经运行的旧窗口，因此旧窗口先前可用、后来重启失败与该机制相符。现存记录中，桌面启动探针日志在22:27:01／22:27:28已生成，`.local/playwright-browsers`创建于22:27:36；更早22:16–22:17的隔离启动任务没有完成回执，不能把它们当成通过结果。安装器源码仅解压到浏览器目录并chmod下载的可执行文件，未发现设置仓库SACL的操作。没有依据把`npx playwright install chromium`认定为标签来源。

Codex本机日志21:58起记录选择MXC；[官方文档](https://learn.chatgpt.com/docs/windows/windows-sandbox)说明MXC负责本机隔离，但未建立本次标签写入的审计链。Security事件4670在当晚20:00后无匹配记录。因此只确认“继承的Low标签导致失败”，不宣称某次Codex更新、某个人或某条安装命令已被证明是写入者。未自动启用全局审计或修改Codex安全设置。

用户新装的`.local/playwright-browsers/chromium-1248/chrome-win64/chrome.exe`也实际继承Low（4096）。它同样受父目录标签影响，不能用安装成功证明浏览器可正常启动。后续Playwright浏览器缓存宜使用工作区外的标准`%LOCALAPPDATA%\ms-playwright`，或测试中显式使用已安装Chrome；本轮没有改用户环境变量或删除其浏览器缓存。

## 防止复发与验证

生产EXE继续位于工作区外的D盘整包，源代码与正式方案保存位置保持。不要把程序部署目录作为新的Codex源码工作区；保留整个包及正确的`furnish-desktop.json`。不重置仓库ACL、不删除特殊SID、不提升仓库完整性、不禁用Electron沙箱。

`scripts/windows-integrity.cjs`／`.ps1`通过`GetNamedSecurityInfo(LABEL_SECURITY_INFORMATION)`只读查询SACL中的强制标签，无需审计SACL权限。源码启动和MCP启动在启动EXE前拒绝低于Medium的运行时并给出部署位置指引；打包完成后检查实际EXE，低标签产物仅报告文件生成并明确警告，不能显示Desktop ready。原生EXE在应用代码前崩溃，无法靠网页内自检挽救；因此外部启动／打包检查是预防入口。

复查命令（不改权限）：

```powershell
node scripts/windows-integrity.cjs output/desktop/Furnish-win32-x64/Furnish.exe
node scripts/windows-integrity.cjs "D:\1601装修\Furnish程序\Furnish-win32-x64\Furnish.exe"
```

增量通过：`test-windows-integrity`（实际Low文件及正式Medium文件、边界、路径只作数据传入、无权限／执行策略修改）、`test-desktop-executable`、`test-codex-mcp-registration`、`test-desktop`。启动入口对原Low EXE实际退出1并说明原因，对正常D盘EXE激活原窗口；生产MCP只读核对仍为原方案且已保存。未运行全量模型／桌面验收，本次没有网页、模型、项目格式或持久数据变化。

原始进程转储与本轮临时运行时／Python副本已清理，精简JSON、文本分析和诊断脚本保留。删除隔离祖先复刻树前仅撤销该树内本轮引入的删除限制，未调整正式仓库、原包或可用程序的权限。既有任务目录不清理。
