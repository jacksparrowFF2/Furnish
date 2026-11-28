# 验证产物目录与自动清理

验证批次、隔离方案、日志、截图和临时包默认写入根目录的 `verification.noindex/`。常用分组为 `desktop-verification/`、`playwright/`、`model-pipeline/`。新验证入口复用 `scripts/lib/test-artifacts.cjs`。预览生成器在验证副本中仍可将应用预览生成到该副本的 `output/`，随副本登记清理。

使用 `scripts/lib/test-artifacts.cjs` 的验证入口，在关闭测试应用／浏览器后调用 `job.finish(passed)`。成功或正常结束的失败验证均自动清理登记的 `disposable` 源码／资产副本；失败状态与失败报告仍保留。截图、日志、报告、项目文件必须位于未登记为 disposable 的路径。不要把整个工作区或包含方案的父目录登记为 disposable。

`job.discard('profile')` 或 `profile-<engine>` 只清理明确列出的图形／网络缓存子目录，不删除 Local Storage、IndexedDB、Cookie 或其它配置数据。未登记的缓存不猜测删除。`generated()` 登记的未变更生成文件仅在成功时清理，失败时保留以供排查。整目录临时夹具 `removeEntire` 仍仅在成功时删除。

`verify:tauri` 在子进程退出、方案及验收报告写入后恢复同一归属标记并执行清理。交互式 `tauri-launch`／`prepare()` 必须保留工作区，以支持反复启动及两壳对照，不能在准备完成或单次关闭时删掉仍待使用的副本。原生签名包启动验收也仍显式保留完整现场；含符号链接的包不交给通用清理器猜测处理。

需要保留完整调试现场时设置 `FURNISH_KEEP_TEST_WORKSPACES=1`，或在该测试目录放置 `.keep`。异常终止、进程仍运行、归属锁不匹配、未知旧目录或含符号链接的目录均保留并记录原因。此机制只处理本次归属明确的目录，不定时扫描或清理历史验证批次，更不涉及正式应用与用户工作目录。

专项验证：`node tests/test-test-artifacts.cjs`，覆盖成功／失败清理、证据与方案保留、浏览器存储、显式保留、活动／中断锁、越界、所有权及符号链接拒绝。
