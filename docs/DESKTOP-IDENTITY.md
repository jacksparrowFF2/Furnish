# Furnish 应用图标

2026-11-07，按用户要求替换正式程序的Electron默认图标。暖陶色`#ad603d`圆角底与暖白`#fff5e9`线条；房屋外轮廓和内部户型分区表达装修、家具与空间布局。矢量源为`assets/icons/furnish.svg`。

## 资产与生产入口

- `icon-192.png`、`icon-512.png`继续沿原manifest／BrowserWindow路径使用，无新增网页脚本或应用配置。
- `furnish.ico`含16、24、32、48、64、128、192、256八档PNG压缩帧，覆盖文件列表、桌面和任务栏。
- `node scripts/generate-app-icons.cjs`用本机Chrome把同一SVG渲染为PNG／ICO，仅重建资产时需要Playwright和Chrome。正式运行与打包直接使用已提交的资产。
- `scripts/package-desktop.cjs`复制运行时后，调用`windows-app-icon`通过系统资源API替换RT_ICON／RT_GROUP_ICON并回读所有帧。其余PE资源保留，不修改安装高度、缓存、项目格式或保存路径。无额外npm包、rcedit下载或运行时网络请求。

资源更新先枚举旧图标语言／ID，完成事务后读取每个图标字节和唯一图标组核对。无效ICO在打开写事务前拒绝。字符串名称图标组不支持时明确失败，未在原生回调中抛出托管异常。未来若Electron改变图标资源结构，应保留失败产物检查，不能用扩大删除资源范围来跳过验证。

## 本机部署与验证

正式`D:\1601装修\Furnish程序\Furnish-win32-x64\Furnish.exe`先在独立候选文件中完成资源和Node模式验证，确认没有进程占用后原子替换。旧EXE保存在`D:\1601装修\Furnish诊断\icon-20261107\Furnish-before-branding.exe`；桌面及固定任务栏快捷方式备份在`.local/desktop-icon-backup-20261107`。只更新精确匹配该正式EXE的快捷方式IconLocation，保留目标、参数和工作目录。

两处快捷方式均改用D盘`assets/icons/furnish.ico`；安全通知Explorer重新读取图标关联，没有结束Explorer或删除系统图标缓存，没有额外打开Furnish窗口。正式窗口继续使用原代码目录的新512PNG。

通过项：

- `test-windows-app-icon`：八档PNG帧、实际Electron副本资源替换与逐字节回读、唯一图标组；`.text`代码段哈希／机器类型／入口点不变；损坏ICO不改变已验证EXE。
- 正式EXE回读8帧通过；Node模式退出码0，Electron45.0.0／Node24.22.0不变，完整性仍为Medium8192。
- 已实际查看512PNG及从正式EXE提取的32像素图标（`output/desktop-icon/native-extracted.png`），均为新户型标识。
- `test-desktop`及相关Node语法／差异检查通过。未运行全量模型检查或重开用户刚关闭的窗口做任务栏截图；固定快捷方式与实际EXE均已更新，图标用于下次启动。

用户装修文件、浏览器恢复缓存及其他对话正在开发的三维控件均保留。本次未改变程序签名／分发策略；本机仍沿已有未签名便携包方式使用。
