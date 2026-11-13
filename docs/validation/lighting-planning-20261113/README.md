# 1601吊顶／照明与MCP增量验收

日期：2026-11-13。范围：16工具清单、吊顶区域编辑、批量单件新增／删除、已有场景设置、通用参数灯体及既有SE2/G12展示光照。没有修改原方案或新增持久字段。

## 已取得证据

- `tests/test-furnish-mcp.cjs`：stdio发现、校验、鉴权／来源拒绝及退出清理通过。
- `tests/test-codex-mcp-registration.cjs`：按当前核心工具清单验证注册／幂等／有效工具限制，最新证据 `output/codex-mcp-registration-wQKL4F`。
- `tests/test-furnish-mcp-desktop.cjs`：真实打包EXE、独立项目／缓存／端口，16工具，完整区域增删改／撤销重做／保存刷新、批量新增顺序和一次撤销、无效整批拒绝、锁定、显式删除及图层清理、场景保存等通过。首轮 `output/mcp-desktop-WX31aq/results.json` 的正式文件哈希变动来自同时执行的用户授权照明副本编辑；隔离根目录核对通过，仓库方案文件未变，未回滚用户数据。最终含默认层锁定／停用区域重新启用负例的复验 `output/mcp-desktop-PwjJPv/results.json` 同样通过；正式文件哈希因并行授权出图时切换场景再次变化，隔离根目录通过、仓库方案文件未变。
- `tests/test-lighting-planning.cjs`：正式Three灯体尺寸／底高／旋转镜像、完成面换算、非铝扣板替换、恢复、夜灯开关及错误款式负例、SE2保持29实体网格通过；另覆盖拥挤光源预算、移动后恢复、总开关、父层隐藏和低能力显卡预算。
- 既有 `test-panel-light/test-bath-heater-se2/test-panel-bull-g12` 通过，实体身份、面板安装、原尺寸／项目链保持。`test-enclosed-boundary-distances` 的150目录类型×8组组合通过。
- 三入口UI初轮 `output/desktop-verification/lighting-planning-OwjiIT` 的HTTP／离线file通过；桌面修正夹具正式源路径后 `lighting-planning-P8azMh` 通过。加入实际WebGL控制台错误收集后，`lighting-planning-Yva9q2` 正确检出全屋灯光uniform溢出，旧测试只捕获pageerror未检出该故障，不能以原先通过证明显示正确。
- 修复光源预算后的真实EXE `lighting-planning-s3Mas7` 通过，无shader错误。最终三入口 `lighting-planning-i9kbi6` 的HTTP、离线file及真实EXE均通过；截图使用orbit，避免漫游首次提示遮住画面。生产GLB按新增家具ID检查实际网格，不再引用闭包外不存在的错误变量。

正式副本 `dmwf2m9mc`，原方案 `dmwd80ij0`。最后验收以装修目录 `设计建议/1601-灯光吊顶方案A/正式效果/预览记录.json` 为准，包含原方案portable数据对比、保存回执、新增21件灯具专项空间复查与吊顶净高。截图是实际生产画布，未使用生成图片。

正式出图中，两次从2D返回3D的相机请求出现连接重置，原因未单独定位；未盲目重放修改，重新只读获取副本／保存回执及原方案对比成功。各房间图片已在重置前取得，最终保留2D布置视图。

## 边界

仅做上述增量验证，未运行全量 `scripts/check.cjs`、实测照度、眩光、灯带电气调光、米家断电恢复／网关联动、真实PIR触发、防水接线、浴霸风管与支撑验收。全案原有空间问题和资料不足保持，新增灯位0冲突不代表整屋可施工或全部通过。参数化占位灯不是成品外观还原。
