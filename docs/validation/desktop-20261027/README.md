# Windows 桌面版专项验收（2026-10-27）

交付形态：Electron 45.0.0 Windows x64 便携文件夹，自带 Node／Chromium；本机链接包与无源码路径的独立便携包均生成。未改网页加载顺序、持久格式或原浏览器入口。

## 已通过

- `node --check`：`desktop/` 三个模块、生产 `serve.cjs`、打包／验收脚本和桌面测试。
- `node tests/test-desktop.cjs`：目录选择与无效配置、导航协议／同源限制、端口校验、正式服务启动／复用／归属关闭、同目录后端变化重启、错误端口归属、拒绝覆盖输出目录。
- `node tests/test-server-startup.cjs`：原浏览器服务启动、前端变化不重启、后端指纹重启、原工作区保存保持、控制授权及无关服务／超时。
- `node tests/test-repository-storage.cjs`、`node tests/test-repository-workspace.cjs`：原文件优先、缓存迁移、并行修订冲突拒绝、恢复副本、直接文件模式及数据往返。
- `node scripts/verify-desktop.cjs`：真实交付 EXE 在独立源码／工作区／桌面缓存副本中恢复当前1601与全部原工作槽，实际 Ctrl+Z／Ctrl+Shift+Z、保存／刷新／重启恢复；原生下载 JSON 并经原文件输入重新导入；390 px 内容宽度无页面横向溢出；生产 WebGL 三维、Blender 状态接口、打印到 PDF；另一个浏览器通过同一 HTTP 读取保存结果；断网直接 file:// 二维与 Three.js 三维。未出现渲染器异常，源用户工作区测试前后 SHA-256 一致。
- 独立便携包烟雾检查：将全包复制至隔离目录，既无 `furnish-desktop.json` 也无工作目录覆盖环境变量，双击对应的真实 EXE 能启动并在自己的 `projects/` 保存；再次启动退出重复进程、原窗口数保持1。
- 原生 Windows 窗口视觉检查：具有独立标题栏和 Furnish 菜单，原1601平面与属性／预算、保存状态可见；二维、三维及窄屏截图另行检查。
- `git diff --check`。

最终主验收结果及截图：`output/desktop-verification/2026-10-27T08-33-01-597Z/`。独立包默认目录与重复启动记录：`output/portable-smoke-rpYtEY/`。这些生成物含用户设计副本，仅本机保留，不进入 Git。验收最初发现的自动化等待和下载事件接入问题已修正，最终脚本完整通过。

## 未执行与边界

未运行全量 `scripts/check.cjs`，未重跑所有模型编辑器、空间规则或历史预览；本次改动不涉及这些实现。未操作物理打印机，未重新跑完整 Blender 渲染；只确认生产接口保留且可访问。未做其他 Windows 架构及 macOS／Linux 桌面打包。未签名，无安装器、文件关联或自动更新。桌面缓存与 Chrome／Edge 缓存各自保留，原文件锁和冲突保护继续生效，不自动合并同时编辑。
