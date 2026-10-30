# 本地正式存档验收（2026-10-30）

正式数据已迁移至 `D:\1601装修\Furnish项目`；本机配置位于忽略的 `.local/storage.json`。原 `projects/workspace.furnish.json` 及原恢复目录保留，既有未提交的设计修改未纳入代码提交。

## 实际数据

[迁移核对](migration.json)：新旧正式文件 SHA-256 相同，字节无变化；9 个工作槽、16 个命名方案保留，89 个受管迁移／冲突副本逐份校验一致，并保留一份迁移时的正式文件历史。未符合受管文件命名的旧目录内容仍在原位置，不自动删除。通过日常 `http://127.0.0.1:8765/api/furnish/storage` 和工作区接口只读确认正式目录及对应修订已切换至 D 盘。

## 增量验证

22 个 Node 测试文件通过：

- 存档／缓存：`test-workspace-files`、`test-repository-storage`、`test-repository-workspace`、`test-workspace-cache`、`test-autosave`、`test-recovery-storage`。
- 服务／桌面后端：`test-server-startup`、`test-server-recovery`、`test-desktop`。新增运行依赖已加入桌面分发清单。
- 直接依赖仓库存储的版本及恢复链：`test-bay-assemblies`、`test-ceiling-aluminum`、`test-ceiling-panel-layout`、`test-ceiling-regions`、`test-ceiling-storage`、`test-dishwasher-project-v32`、`test-fridge-project-v31`、`test-hood-project-v33`、`test-merged-format`、`test-side-table-project-v36`、`test-tile-grout`、`test-wall-tiling-storage`、`test-washer-project-v35`。

上述测试均位于 `tests/`，扩展名 `.cjs`。飘窗旧测试的清理逻辑原先只认识正式文件，新增历史目录后改为校验专用临时目录后清理整个测试副本；生产数据不受影响。回环连接及系统临时目录原子替换在正常权限下复验通过。

`test-workspace-files.cjs` 覆盖原始字节历史、无变化不备份、基准冲突、迁移／再次迁移、目标冲突、不覆盖源数据、旧服务配置失效、重启恢复、备份写失败、残留临时文件、正式文件损坏、显式恢复保留损坏原文、历史保留策略及未知文件不清理。`test-repository-storage` 增补历史API／跨站拒绝和保存失败后续编辑重试，冲突不能重试绕过。

[浏览器结果](browser.json)：`node tests/test-local-archive-browser.cjs` 使用临时正式文件、真实 HTTP API 和独立浏览器会话，通过自动保存、撤销重做、刷新、含中文／空格／井号路径迁移、历史真实下载、整工作区恢复、损坏正式文件恢复且不被分歧浏览器缓存覆盖（包括 localStorage 不可写、只由 IndexedDB 保留恢复标记）、390px，以及断网 `file://` 编辑／刷新恢复且不请求存档 API。页面异常为 0。

目视检查：[桌面设置](desktop.png)、[390px设置](narrow.png)、[直接打开HTML](file-offline.png)。窄屏路径在输入框内滚动，正式路径文字可换行，历史列表及按钮可访问。

变更模块语法检查及 `git diff --check` 通过。此次不运行全量 `scripts/check.cjs`、全屋模型／Blender、真实触屏或新桌面安装包发布；桌面验证限共享服务的启动／关闭与打包依赖，主进程仅更新说明文字。浏览器持久缓存仍受来源／用户清理限制；同盘历史不能代替异盘备份，不支持自动跨设备同步或并行设计合并。目录选择当前为完整路径输入。
