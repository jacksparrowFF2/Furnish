# 佳帮手透明工具收纳箱 · 大号

家具库「透明工具箱 · 佳帮手大号」，独立类型 `toolbox_jiabangshou_390`。宽390 × 深270 × 高210 mm来自用户尺寸图；PP材质同图标注，图注声明手工测量可能有1–2cm误差。已读取京东SKU100359220602，商品名、品牌与图一致；未将抓取到的39.9元写作本规格确定价格，库中保持价格未知。完整链接及原图见[资料档案](../assets/models/toolbox-jiabangshou-390/asset.json)。

正面定义为长边、局部+Z，左右灰扣位于两短侧。闭盖空箱，不含图中演示工具。16个具名部件包含真实薄壁收分箱体、盖沿与薄盖面、上层分格托盘、侧扣和加强筋。壁厚、圆角、托盘分格、扣手机构及筋条数量是图片估算／采样，背面按对称简化。Alpha仅作透明PP近似，不是真实透射／雾度；双侧扣不透明。没有开盖交互、容积或箱内可放置空腔语义，不代表厂家操作预留或承重验证。

底部离地沿mountHeight、新建0，与自身210mm高度独立；w/d/h支持非标布局缩放，不能解释成其它实物型号。复用storageSupplyRevision=2、已有pose3D及复制／替换／撤销／保存恢复，单件最低v57，姿态v58，无新字段。数值实体沿生产部件保守包络；透明不等于无碰撞，圆角和薄壳内空区可能保守告警。

最终[Blender源工程](../assets/models/storage-supplies/toolbox-jiabangshou-390/v2/toolbox-jiabangshou-390-v1.blend)、[GLB](../assets/models/storage-supplies/toolbox-jiabangshou-390/v2/toolbox-jiabangshou-390-v1.glb)及离线JS同源；v1保留初版，目录v2与文件v1部件身份契约分别管理。作者/发布复用 `node scripts/blender-asset.cjs author-toolbox-jiabangshou-390 <新目录>`、`publish-toolbox-jiabangshou-390 <GLB>`；清单自动登记，`node scripts/verify/verify-model-pipeline.cjs toolbox-jiabangshou-390 gpu`只验本型号。

已通过单型号整链路、生产尺寸/离地/空间/状态、HTTP与断网file、GLB逐片Blender回读、GPU三视图和下载工程重开；实际打包EXE隔离桌面通过属性编辑、撤销重做、保存刷新和390px显示。透明白名单两个真实GLB负例均拒绝且保留已有发布结果；薄壳闭合/退化面检查通过。详见[视觉与验证记录](validation/toolbox-jiabangshou-390-20261107/README.md)。未执行全项目回归、开盖轨迹及实物容量测量。

## 关联阵列（2026-11-08）

选中工具箱后，数量面板可编辑总数、层/排/列、左右/前后/层间距、整齐/隔排错位及0/90/180/270度单件转向。总数1–200，行列1–50，三向间距0–1000mm。修改行列保持总数；修改层数按满层换算，末层可不满。解除阵列保留现有位置。

复用inventoryArray及原mutate/MCP动作，不新增字段或模型。旧单件不自动关联，首次有效编辑可一次撤销回原单件。复制重映射阵列身份，跨类型替换清理字段；锁定、非法值和实际碰撞沿原规则。显式工具箱阵列最低v71，项目当前/命名方案/我的家具/工作区及离线缓存同链路；原单件v57与姿态v58保持。

本次未修改当前正式方案，也未改变闭盖几何和材质；阵列不代表堆码承重认证。核心及三入口定向结果见[验收记录](validation/toolbox-array-20261108/README.md)。
