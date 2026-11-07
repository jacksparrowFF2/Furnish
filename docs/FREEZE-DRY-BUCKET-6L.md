# meoof 6L 冻干桶

家具库「冻干桶 · meoof 6L」，独立类型 `freeze_dry_bucket_meoof_6l`。用户尺寸图的6L标注为 **宽316 × 深309 × 高187 mm**；轴向按图中两个底边尺寸映射到局部X／Z，包含闭盖、垂落提手的模型外包。用户第二图用于奶油白配色和升级款6L轮廓；不套用旁边13L经典款的高桶比例。两张原图与完整商品链接保存在[产品档案](../assets/models/freeze-dry-bucket-6l/asset.json)，资料足够，未额外读取商品页。

正面为竖排 `meoof.` 印字面、局部+Z。底部离地复用mountHeight，新建0，与自身187mm高度独立；完成地面基准沿原floorBase只叠加一次。w/d/h可作非标布局缩放，不代表其它容量。默认操作预留0表示没有建模开盖操作要求，价格未知。

Blender源保留圆角收底桶身、盖沿／暖灰接缝、盖面浅凹层、前侧开盖凸舌、两侧镂空垂落提手和独立枢轴、淡色竖排品牌，10个具名材质分区由同一静态生产构造器使用。桶壁收分、圆角、提手曲线／枢轴位置、字体和PBR粗糙度均为图片外观估算；背侧按对称简化。小字、隐藏真空结构、内胆壁厚、容积、密封性能、提手实际机构和开盖行程未知；不提供开盖交互或可收纳内腔，不作施工／容量认证。

最终作者资产位于[源工程](../assets/models/storage-supplies/freeze-dry-bucket-6l/v3/freeze-dry-bucket-6l-v1.blend)、[GLB](../assets/models/storage-supplies/freeze-dry-bucket-6l/v3/freeze-dry-bucket-6l-v1.glb)，v1／v2保留为修订历史。v3为目录版本；文件中的v1对应当前静态部件身份契约，不是目录版本。运行资产为 `src/data/freeze-dry-bucket-6l-blender-asset.js`，沿storage-supply-model与static-asset-model供显示、实体和正式导出同源使用。二维复用矩形占地，数值碰撞使用逐具名部件的保守包络，圆角及提手空角可能保守告警，不推定桶内空腔。

复用现有storageSupplyRevision=2能力：本类型最低v57，含pose3D时最低v58；没有新增持久字段／保存通道。现有v62纸品阵列、v63物品阵列、v64负间距逻辑保持。底部／尺寸／姿态进入原缓存与空间确认，非空间编辑保持既有行为。

作者：`node scripts/blender-asset.cjs author-freeze-dry-bucket-6l <新目录>`；发布：`publish-freeze-dry-bucket-6l <GLB>`；隔离整链路：`node scripts/verify/verify-model-pipeline.cjs freeze-dry-bucket-6l gpu`。清单自动从storage-supply-specs登记，共用storage-supplies专项。桌面UI复验：`node tests/test-freeze-dry-bucket-desktop.cjs`，使用本机配置的打包EXE与独立工作区／缓存／端口。

增量结果、参考解读、三阶段图、前后对照和算法边界见[本次验收](validation/freeze-dry-bucket-6l-20261107/README.md)。不宣称全项目回归或用户已认可外观。
