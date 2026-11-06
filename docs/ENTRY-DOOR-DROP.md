# 置物台柜下柜门独立下延

2026-11-06。用户要求中间小柜门越过下方隔板，遮住一部分喂食器。现新增`cabinet.entry.lowerDoorDrop`，单位mm：只加长下柜门下沿，隔板、上柜门、置物台、总高和设备位置保持。当前适用于使用entry分层结构的置物台柜，不是所有柜体的通用门板下延，也不等于无把手手扣构造。

## 基准与范围

`product-rules.cabinetEntry`声明缺失默认0和最小0；旧缺失不补写。`cabinet-core.entryLowerDoorBounds`集中门段原下沿基准、下延量与原上沿：原下沿=底座高+底部开放区总高−板厚+盖法内缩，下延量从这个基准向下扣除。生产`doorPose`仍保留原1mm边缝，因此本案400−18−100+1=283mm实际门下沿离柜体底部高度。底部离地另由已有mountHeight叠加一次。

上限由门原下沿到柜体底部的距离派生，防止向下越出柜体，不是厂家工艺或铰链载荷限制。改柜高／板厚／隔间后保留下延mm数，再按新几何验证，不按整柜高度等比拉伸此参数。更重、更长门板的铰链选型／孔位、强度与实物使用仍待加工方核对。

UI在柜体结构设置提供“下柜门向下延长 mm”，沿原草稿／mutate／撤销和保存链；恢复0时删除可选覆盖。完整cabinet配置进入已有3D／生产实体缓存与空间确认。实际预览／正式三维／数值板件／GLB共用构造器，没有仅在预览拉长的替代实现。下延>0的开启高度覆盖完整下门生产基准，并保持上下门段独立；缺失／0维持历史核对记录的分组语义。含新字段的当前／命名项目、家具库、工作区及恢复缓存采用v55，旧版本继续可读。

## 当前宠物柜应用

读取用户最新方案后执行：底部开放区400、下柜500、置物区450、柜高2350、总深350、板厚18；用户已经移除组合金属架并恢复独立米家喂食器（370高），这些调整保留。只设置下延100，并关闭中间小门以展示遮挡。喂食器上部约87mm被遮挡，下方出粮碗和右侧水碗露出；没有重新插入金属架、移动物品或更改隔板。

经MCP配置当前方案`dmw50fhba`，回执applied:true／persisted:true，正式文件`D:/1601装修/Furnish项目/workspace.furnish.json`。聚焦本柜、当前喂食器及水碗核对0问题／0未知。柜门关闭与完整开启检查分别进行，不把全屋既有30问题／12信息不足表述为已清零。

## 验证证据

- `tests/test-entry-door-drop.cjs`通过：实际生产门板只增加下部高度、上门／结构不变、范围与空值拒绝、地面边界、完整下延扫掠及等于／低于阈值、未知高度、离地／旋转／镜像、当前喂食器闭合净空、缓存／确认、替换、v55及重复恢复。
- `tests/test-entry-door-drop-desktop.cjs`通过：同一正式打包EXE隔离工作目录／端口／缓存，预览草稿、旧缺失、保存、一次撤销重做、刷新、非法输入拒绝、恢复0和窄屏。报告`output/desktop-verification/entry-door-drop-Vpuocy/result.json`。
- `output/model-pipeline/selection-y2faM6/batch.json`通过：新增专用`cabinet--entry-console-drop`参数化配置，HTTP／断网file正式构造与生产导出、上下门目标端态、逐件身份／边界Blender回读、三机位GPU渲染和下载BLEND重开。参数化模型不重做Blender作者源。Blender 5.2.3 LTS，Scoop current程序，GPU OPTIX。
- 增量回归`test-cabinet-model`、`test-cabinet-opening-3d`、`test-entry-console`、`test-entry-open-bay`、`test-entry-editor`、`test-workspace-cache`及`test-project-validation`通过；不是全量检查。旧entry-editor表单替身缺少实际界面已使用的document.querySelector及帮助区容器，本轮补齐；真实桌面测试独立覆盖此字段。
- 正式窗口已实际截图检查。只读复制正式文件到隔离EXE后，留存同机位`output/desktop-verification/entry-drop-final-sjmpAO/door-drop-before.png`、`door-drop-100.png`、`door-drop-open.png`，均已打开对照；正式源哈希不变。闭合图遮住设备上部，开启图显示隔板高度保持，门板下沿向下伸出。

未执行：具体铰链／加工孔位、门板自重及实物操作验收；本案100mm是布局选择，不推广为通用默认或制造要求。
