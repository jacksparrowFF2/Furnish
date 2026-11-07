# 柜体升级第二阶段验收

2026-11-07，基线ca3f86a6。按用户授权逐步移除旧柜体分支，统一横向柜箱／隔间关系。不改用户正式JSON。

## 已通过

- `test-cabinet-composition`：1–6隔间、12／18／30mm板厚、无／双侧18mm见光板、所有相邻连接组合，共378种。验证柜箱及隔间归属、总宽／外宽／净宽闭合、实际生产侧板／顶板位置及数量、唯一部件身份、数值生产记录器。可选基线模式逐一对照旧widths／layout／moduleLayout／boxJoints／boxRanges／structureWidth，共378组一致。
- 同测试复现基线的全独立柜自动配门重排宽度负例，新实现保持每个柜箱边界；验证共享模式也返回一箱、派生子柜显式shared、增删复制排序及原列映射、当前／命名方案往返、重复恢复和空间配置边界。
- 指定正式D盘文件与基线核心／模型，读取当前、命名方案、厨房模块及洗衣附属柜，共796组生产模型。实际顶点、世界变换、authored身份按1e-8精度对照全部一致，读取不修改配置。此为配置出现次数，不是796件独立家具；比较前后使用同一产品规则，未调用重新配门操作。
- 增量：cabinet、advanced、edit-operations、module-widths、box-groups、independent、stacked-boxes、top-closure、layered-cabinet-top-closure、side-closure、resize-direction、components、drawer-assembly、net-depth、parameter-parity、full-width-drawers、design-upgrade；kitchen、U、tall、wall-adjust及laundry-cabinet通过。
- test-cabinet-catalog原断言落地新柜应缺失mountHeight，在未改柜体核心的main基线也失败；根据已生效的通用底部离地契约改为断言显式0，不改产品默认，更新后通过。
- 改动JS语法与diff空白检查通过。

## 界面与交付证据

`tests/test-cabinet-composition-ui.cjs`复用受管理的既有隔离运行器，HTTP／断网file://／同一正式EXE独立源码、项目、缓存和端口三入口均通过；正式D盘文件仅作副本来源，运行器核对来源哈希不变。最终报告与宽窄图：`output/desktop-verification/cabinet-composition-3ILjg2/result.json`，运行标记cleaned:true，源码／缓存副本已清理。

覆盖共享柜树归属、独立转换、左右18／12mm见光板、两箱三格、保存一次应用撤销／重做、取消不写入、复制插入中断原箱时的2→4箱预演、草稿撤销／重做、390px编辑及保存刷新。旋转37°、镜像及离地120mm在恢复后保留；恢复的实际生产侧板数等于箱数×2，无页面错误。

已实际查看最终桌面宽屏和390px截图，柜箱归属、两处连接选择和管理按钮可读。长标签原会挤压管理按钮，现使用可换行标签span与不缩小、不换行的专用按钮；同时修正样式优先级，并加入按钮可读性检查。

此前S8eCXt／QKTReu也通过三入口；LLrA9u因测试定位器同时命中二维rect与属性input而失败，已限定input；p9A6pF发现通用按钮样式覆盖nowrap，修正后最终三入口重跑通过。失败诊断保留，不将失败副本清理或计作通过。

## 边界与未执行

未运行项目全量、全型号Blender发布／导出／回读或自碰撞组合穷举。保留专用分层柜、厨房、设备位、上下分箱及已有运动机构的实际约束，未新增上下不同深度／不同横向分格。没有对尚未涉及的旧输入恢复代码宣称已清除。无新持久字段和加载资源，不改保存及撤销通道；其它对话的罐体贴图与用户JSON不在本次提交范围。
