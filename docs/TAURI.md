# Tauri 并行对照入口

Electron 继续作为正式应用，`npm run desktop`、打包、桌面快捷方式和 MCP 入口保持原样。Tauri 是实验入口，使用相同 `index.html`、生产模型、Node HTTP 后端、`mutate`、撤销栈及项目保存格式，没有第二套业务实现，也没有前端构建步骤。

## 构建与启动

安装 Rust stable（Cargo）和平台原生构建工具。macOS 对照入口要求 14+，以使用独立 WKWebView data store；Windows 需要 MSVC 和 WebView2。依赖锁在 `desktop-tauri/Cargo.lock`。

```sh
npm run tauri:build
npm run tauri
```

可用 `FURNISH_CARGO` 指定 Cargo 可执行文件。原生构建输出为 `output/tauri-build.noindex/release/furnish-tauri`（Windows 加 `.exe`）；macOS 另生成按二进制哈希隔离、本机签名的 `.app`，用 `current-app.json` 指向当前包。启动器通过 LaunchServices 打开 `.app`，保持系统对 WebKit 服务的正确归属。包由启动器注入本机服务地址，目前依赖本机 Node 与源码，不能直接双击或作为独立便携安装包。不会替换 `~/Applications/Furnish.app`。

每次不带 `--workspace` 的启动创建新的 `verification.noindex/tauri-comparison/compare-*.noindex/`，复制代码和工作区，保留源文件哈希；不复制 `.local/storage.json`，不连接正式保存目录。默认通过原 `workspace-files.info({inspect:false})` 只读定位本机当前正式文件，支持已有外置保存目录；可用 `FURNISH_TEST_PROJECT=/绝对路径/workspace.furnish.json` 指定其它源文件。所有编辑只写副本。副本保留，不能把它当作原方案的自动同步。

控制台和 `<engine>-launch.json` 给出实际工作目录、进程、端口及缓存信息。复用同一个副本启动另一种壳：

```sh
npm run tauri -- --workspace /绝对路径/compare-xxx.noindex/workspace
npm run tauri:electron -- --workspace /绝对路径/compare-xxx.noindex/workspace
```

同一副本只允许一个对照应用运行；两壳使用相同端口、各自缓存。macOS Electron 关窗后仍可能保留进程，需从菜单退出应用才能释放该副本。需要严格性能比较时为每壳从同一源文件建立新副本并核对源哈希，避免前一次编辑或缓存影响。不要同时跑其它 GPU 渲染或构建。

Tauri 通过原 `desktop/backend.cjs` 检查服务身份／指纹，只关闭本入口托管的服务，不结束借用服务。关窗和正常退出先调用页面原 `FurnishRepository.flush()`；失败保留窗口和恢复缓存。终端中断、崩溃或强制结束不能保证完成保存，应从窗口正常关闭。macOS data store 使用副本路径哈希生成 UUID，避免与正式 Electron、浏览器及其它副本混用。恢复验证须使用原副本路径和端口。

## 功能边界

当前对照重点为二维编辑、生产保存恢复、撤销重做、WebGL 三维和渐进观察的资源开销。Tauri 不向页面开放文件系统或 shell，只向当前回环 origin 的 main 窗口授权关闭请求／确认与测试结果回传。macOS 原生壳通过环境接收诊断脚本内容，不直接读取 Documents 中的脚本或项目；项目仍由既有 Node 服务提供。

- Electron 保留原生保存对话框；Tauri 下载先写独立临时目录，正常退出时由启动器归档到副本旁 `exports-tauri/`，文件名增加时间戳避免覆盖；运行时路径见启动记录的 exportsDirectory。控制台记录下载是否完成，异常中断时保留临时原件。
- Tauri 暂不接入正式 Codex MCP 端点和注册菜单；对照 Electron 同样通过 `FURNISH_MCP_DISABLE=1` 关闭 MCP，避免测量偏差及抢占正式端点。
- Tauri 暂时拒绝新窗口和外部导航；依赖弹窗的打印／预览与外链行为未达 Electron 同等能力。
- WebKit 与 Chromium 的 WebGPU／着色器和下载行为需分别验证；出现“流畅观察”回退时不能将其作为同等光追画质的内存收益。
- Windows、Linux、便携打包、长期稳定性、全部设备及完整 Blender 工作流需后续平台验收。

## 内存采样与验证

```sh
npm run tauri:memory -- /绝对路径/tauri-launch.json 2d 5
npm run tauri:memory -- /绝对路径/electron-launch.json 3d-smooth 5
node tests/test-tauri.cjs
node tests/test-desktop.cjs
```

采样为 macOS/Linux 的 RSS，默认每秒一次，输出独立 JSON。入口进程树包含 Node 启动器、桌面壳及自建后端。macOS WebKit XPC 进程可能由系统托管，不在树下；采集器尝试通过系统 responsible PID 识别，只将责任进程属于当前入口树的 WebKit 服务计入 attributedRssMiB。该辅助识别需要 python3；不可用或归属不明时额外列出未归属候选，不能直接相加归属 Furnish。RSS 也会重复统计共享页，不等于物理占用或 GPU 显存。报告应保留进程清单，结合系统活动监视器的应用归组／内存压力判断，不只引用主进程或包体大小。

依次比较：二维加载稳定、三维流畅观察、精细渐进完成、返回二维、关窗后。保持同源工作区、1440×960 窗口、相同实际内容视口、相机与画质；记录首开耗时、WebGPU 可用性及回退状态。至少重复一轮，不能用一次快照证明没有泄漏。

`--probe tests/helpers/tauri-probe.js` 仅供隔离副本自动验证：通过真实生产入口检查修改、撤销重做、保存刷新，再观察三维两档及返回二维。探针在 `on_page_load` 注入，不进入正式页面；会修改副本家具配色。下载、导入、打印和真实键盘手势仍需单独验收。

自动串行运行两种壳的生产链路检查与阶段 RSS 记录：

```sh
FURNISH_TEST_PROJECT=/绝对路径/workspace.furnish.json npm run verify:tauri
```

结果写入各自隔离目录 `verification.json` 和 `stdout.log`。这是增量检查，不是全量验收；精细档等待收敛或明确回退，最长 120 秒；记录实际状态与超时，必须确认收敛及画质一致后再比较。退出阶段测试会正常关闭隔离窗口。
