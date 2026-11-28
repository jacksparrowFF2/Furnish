# 整应用运行内存优化（2026-11-17）

## 改动与归因

本轮不改前端、生产模型、画质参数或碰撞核心，只修改本地后台的源码指纹和静态文件传输：

- `server-runtime.watch()` 原先把依赖图中全部源码 Buffer 放在闭包的 Map 中，长期保留约 130 MiB 源码／资产字节。现在跨轮只保留文件路径、stat 签名与最终指纹；字节只在本次哈希计算时使用。检测仍覆盖完整文件集、大小／mtime／ctime／inode、懒加载模型、增加与删除。
- `sources()` 对不含 ASCII `require` 的文件不再创建巨大 UTF-8 字符串来寻找不可能存在的字面量依赖；原路径＋NUL＋原始字节＋NUL 的 SHA256 协议不变，更新预检仍照常解析全部源文件。
- `serve.cjs` 静态响应从整文件 Buffer 改为有背压的 ReadStream，限制并发下载中的应用缓冲。打开／stat 成功才发成功头，保留 MIME、no-store、路径保护、缺失／目录拒绝和 HEAD 无正文行为；客户端中断时销毁读流。API 保存、MCP、Blender 与后台归属链不变。

`test-server-memory` 用 WeakRef 和测试子进程的 GC 直接验证**仍存活的 watcher 不再持有源码 Buffer**，同时检验指纹协议和更新检测。该 GC 仅用于小型单元测试，生产及下述运行对照均未添加或调用强制 GC。

## 指标与条件

使用正式已打包 Electron 45，固定1601输入，独立源码／项目／缓存／端口。基准输入在 `verification.noindex/runtime-memory-input.noindex/workspace.furnish.json`，不跟随其它聊天对正式方案的后续编辑。每个阶段采样三次；二维旧版及最终版各运行两次。旧版取 `f076ba37` 的 server-runtime.cjs／serve.cjs，其余代码与候选相同。

采集整个应用自建进程组：Electron 主进程、renderer、GPU／Utility、自建 Node 后台。RSS 用 `ps` 独立保存；physical footprint 用 macOS `footprint` 对同组 PID 的总输出，不用页面堆替代整应用指标。它不包括其它应用和全系统 WindowServer 的未归属开销，不是跨平台测量公式。

等待二维空闲 30 秒、流畅三维 6 秒、精细渐进收敛后 6 秒、返回二维后 20 秒。不强制 GC。场景、1440×928 内容视口、DPR及材质设置相同；前后 1609 个前端／资产／vendor 文件合并 SHA256 相同。精细渐进均实际收敛，渲染缓冲均 1200×1091；没有通过回退或减采样来节省内存。

## 实际运行结果

阶段内取三次 physical footprint 的中位数；二维表格再对两次运行取均值，其余为一组完整流程。单位 MiB，数据均为整应用进程组；表中取整，差值按原始读数计算。

| 阶段 | 旧版 | 最终候选 | 差值 |
| --- | ---: | ---: | ---: |
| 二维空闲（两次均值） | 1461 | 1302 | −158，约 11% |
| 三维流畅观察 | 3140 | 2947 | −193，约 6% |
| 精细渐进收敛后 | 6603 | 6456 | −147，约 2% |
| 返回二维 | 2923 | 2764 | −159，约 5% |

二维单次读数旧版为 1502 / 1419 MiB，最终版为 1309 / 1296 MiB；存在自然回收和运行波动。本轮主要释放了后台固定开销，不宣称精细光追整体内存大幅下降。后台自身二维 footprint 两轮约 258 / 233 MiB，最终版约 103 / 103 MiB。

**RSS 没有在每个阶段下降。** 例如二维两次 RSS 均值约 2016→2136 MiB，而对应整组 physical footprint 下降；完整流程中三维 RSS 读数也有明显波动。全部 RSS 和 footprint 原样保留，不能把本表比例表述成 RSS 或显存同比下降，也不能由短测宣称长期无泄漏。

摘要见 [results.json](results.json)。本机原始数据：

- 完整旧版：`verification.noindex/tauri-comparison/compare-4oknPj.noindex/runtime-memory.json`。
- 最终候选完整流程：`verification.noindex/tauri-comparison/compare-mnZSRd.noindex/runtime-memory.json`。
- 二维复测：旧版 `compare-NNy3UW.noindex`，最终版 `compare-A6Eb2g.noindex`。
- 早期候选 `compare-JOIatY.noindex` 未含无 require 文件的解码预筛，不混入最终二维均值；仍保留原始结果供审计。

各目录保存三次 footprint 原始 JSON；前端校验哈希、精细缓冲尺寸、输入哈希和运行状态在摘要中，所有运行无页面异常，冻结输入未变。

## 验证与边界

已通过：

- `tests/test-server-memory.cjs`：源码 Buffer 可释放、原始 SHA 协议、扫描根以外的字面量依赖、同大小／恢复 mtime 修改、懒加载文件增删及存活 watcher 的持续正确性。
- `tests/test-static-stream.cjs`：8 MiB 二进制 SHA256、Unicode／空格／# URL、MIME／no-store、HEAD、空文件、目录／缺失／隐藏路径及请求中断后服务存活。
- `tests/test-server-startup.cjs`：服务新建／复用／代码更新、同源身份和授权边界、无关服务和超时。
- `tests/test-backend-auto-update.cjs`：模型／资产指纹、修改时间恢复、并发鉴权接替、同源与数据、旧页面重试和最新 pending 编辑、owner 继承与退出。
- `verify-desktop.cjs` 使用本机 Chrome 完成正式桌面恢复、修改、真实键盘撤销重做、保存刷新、下载／导入、390px窄屏、WebGL、打印 PDF、HTTP共享、断网 file:// 二维／三维、退出关闭自建服务、重启恢复，冻结输入哈希未变。报告 `verification.noindex/desktop-verification/verification-Qmeoyo.noindex/results.json`。
- 新增脚本语法及 Git 差异检查。

没有修改几何／碰撞模块或渲染器，故没有重跑无关全部型号 Blender 回读或全量回归；也未做 Windows/Linux、Tauri、长时间泄漏、全部显卡或真实打印机验收。静态流传输中途发生文件／连接错误时会中断响应，客户端应按原加载失败流程处理，不返回截断的成功文件。

## 复现

```sh
node tests/test-server-memory.cjs
node tests/test-static-stream.cjs
FURNISH_TEST_PROJECT=/绝对路径/固定输入.json node scripts/profile-runtime-memory.cjs
FURNISH_TEST_PROJECT=/绝对路径/固定输入.json FURNISH_RUNTIME_VARIANTS=before,after node scripts/profile-runtime-memory.cjs --2d-only
```

profile-runtime-memory 是隔离诊断入口，需要本机可运行的正式 Electron；macOS 物理指标依赖系统 footprint 工具。基线只在新副本中还原两个脚本，不切换仓库、不修改正式文件。只希望读取自己的当前方案时仍用原正式应用／MCP。
