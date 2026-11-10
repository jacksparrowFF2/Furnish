# 2D／3D 切换性能（2026-11-10）

## 修改范围

`create3D.enter()` 沿已有 `sync()` 输入签名复用建筑、家具与标签，不再每次 `sync(true)`。首次签名为空、二维修改和 `replan()` 清签名仍触发原生产构造；`retheme()` 失效链保持。无新持久字段、缓存键、加载脚本或保存／撤销通道。

进入改为 220ms 相机过渡；退出为 160ms 相机过渡及 160ms 淡出。移除进入前固定 420ms 等待和模型整体压扁／长高动画，减少逐帧几何变化的阴影重算。实体始终保持真实比例；平面取景、原截图缓存和退出停止渲染循环保持。CSS 淡入／淡出同步缩短至 160ms。

## 实际测量

使用同一本机打包 EXE `D:\1601装修\Furnish程序\Furnish-win32-x64\Furnish.exe`，独立源码、缓存和空闲端口，测试当前正式文件 `D:\1601装修\Furnish项目\workspace.furnish.json` 的副本，160 件家具。两次源文件 SHA-256 均为 `a7a7db07a613c4abcb98aaea5f03433f9351f07d78cf9b1f29bf38884f314881`，测试前后不变。正式窗口有未保存编辑，未刷新或操作正式方案。

| 场景 | 修改前 | 修改后 |
| --- | ---: | ---: |
| 首次进入 3D | 7029ms | 5128ms |
| 方案不变再次进入 | 3152ms | 298ms |
| 返回 2D | 1838ms | 397ms |
| 再次返回 2D | 1835ms | 389ms |

按页面 `setView()` 调用至完成计时；本机单次对照，不是跨设备性能保证。再次进入约减少 91%，返回约减少 78%。首次进入仍包含引擎、生产几何和 GPU 初始化成本，未优化所有模型构造。二维新增／修改后进入为 503／492ms，撤销／重做后为 1140／1124ms，建筑变化后为 1080ms。

本机原始证据（`output/`，不提交运行时副本）：

- `output/desktop-verification/view-baseline-Ypr8GK/result.json`
- `output/desktop-verification/view-switch-5czOLy/result.json` 及桌面 2D／3D、390px 窄屏、离线 file 截图。
- `output/desktop-verification/scene-measure-WGYJlH/result.json` 及三入口测量截图。

## 验证结果和边界

- `test-view-switch-desktop` 在隔离副本为真实生产构造器增加只读计数与 UUID 观察。不变场景不调用建筑／家具／标签／预留构造器，对象身份与位姿保持，整体比例为 1，退出停止 RAF；切换本身不改变 state。
- 二维新增、尺寸／位置修改、撤销重做真实更新生产模型；房间修改重建建筑；保存刷新保留修改；390px 无页面横向溢出。
- 打包桌面、HTTP 及断网 `file://` 三入口切换成功，无页面异常。HTTP 读取保存后的完整 161 件方案，file 使用自身原离线默认方案；不把不同方案／GPU负载的耗时互相比对。
- `test-scene-shadow-cache`、`test-scene-observation`、`test-scene-measure` 通过。阴影测试旧夹具缺少现有 `selectionTransform/sceneMeasure/active` 绑定，本次补齐测试环境，未改生产循环。
- 内联经典脚本／ES 模块、新测试语法及差异检查通过。实际查看桌面 3D 和窄屏截图，模型比例、画布、工具栏及标签正常。

未运行全量 `scripts/check.cjs`，未覆盖所有设备、模型编辑器、主题／漫游组合或长期内存测量。沿原场景保留机制，没有新增第二份场景。首次加载复杂方案仍需数秒；退出仍保留原截图编码成本。
