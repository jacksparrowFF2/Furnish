# 330ml／500ml 标准易拉罐

家具库中新增「易拉罐 · 330ml标准罐」「易拉罐 · 500ml标准罐」，类型分别为`beverage_can_330ml`／`beverage_can_500ml`。标准外包的闭罐，罐身现采用用户图片中的雪花清爽图示包装。330ml和500ml各自映射对应原图；未展示的背面为无文字绿色简化。尺寸资料与包装外观分别取证，不声称该品牌实物外包另经测量。

| 规格 | 默认直径×总高 mm | 依据 |
|---|---|---|
| 330ml standard | 66.2×115.2 | 用户第二张标注图；Ball产品资料为66.3×115.2，存在厂家口径差异 |
| 500ml standard | 66×168 | [Hanacans制罐厂](https://www.hanacans.com/aluminum-can-body)公布211罐身规格 |

容量不能唯一决定外形；330ml另有Ø58×145 sleek款，本次未加入。第一张汇总图的500ml直径73mm不作为本款尺寸。用户图中330ml封口外径55mm、罐口内径52.4mm仅适用于该图；模型顶部卷边约55.4mm，局部曲线为外观估算，未把罐口直径当罐身直径。[NOMOQ](https://help.nomoq.com/where-can-i-find-technical-specifications)也提供两种标准罐技术图入口。[Xem Studio](https://xemstudio.com/objects/beverage-cans/)有标准罐STEP/STL，页面注明CC BY 4.0；本次没有下载／采用第三方网格，采用自建Blender资产，保留编辑及离线发布能力。

生产模型分为body、bottom-rim、top-rim、lid、score-line、pull-tab、tab-rivet七件：缩颈肩部、卷边、浅凹盖面、闭合刻线、镂空拉环、铆钉和底部内凹均用独立层次几何表达。闭罐无开盖交互，不定义可放置内部物品的空腔。局部尺寸、喷涂粗糙度及金属反射为外观估算，不作容积、壁厚、密封或堆码承重认证。尺寸编辑是非标布局缩放。

底部复用mountHeight，新建0，与自身高度独立；姿态沿现有pose3D。2D为原矩形选择／占地，3D、正式导出和数值实体共用storage-supply-model→static-asset。碰撞使用实际具名网格的保守轮廓／高度包络，圆罐角区及拉环空角可能保守告警；没有柜内穿板或同阵列碰撞豁免。

两款均支持现有[inventoryArray](INVENTORY-ARRAY.md)：总数1–200、层／排／列、左右／前后／上下0–1000mm间距、整齐／隔排错位、单件0／90／180／270°转向。每罐保留独立ID、实际实体和采购资料；复制重新分配阵列身份，解除保留物品位置，修改沿一次mutate进入保存和撤销。旧单件缺失阵列字段不补写。普通单件最低v57，倾斜时v58；显式易拉罐阵列最低v66，保留旧版本读取，未改变其它阵列的最低版本。

当前源工程／GLB：`assets/models/storage-supplies/beverage-can-{330,500}/v6/`；原白罐v1保留。离线资产：`src/data/beverage-can-{330,500}-blender-asset.js`。作者命令`node scripts/blender-asset.cjs author-beverage-can-330 <新目录>`（500同理）；独立发布`publish-beverage-can-330 <GLB>`；整链路`node scripts/verify/verify-model-pipeline.cjs beverage-can-330,beverage-can-500 gpu`。新增配置自动出现在`--list`。

参考原图、来源与哈希见[产品档案](../assets/models/beverage-cans/asset.json)，分阶段渲染、生产传递、实际阵列UI与验证边界见[验收记录](validation/beverage-cans-20261107/README.md)。

## 雪花清爽包装（2026-11-07）

在原七件几何上添加圆柱UV与768×1024贴图。330ml取user-4.png的矮罐，500ml取user-3.png的高罐，保留绿色、白色雪花、银白旋纹及可见容量／清爽字样；330ml小字受原图分辨率限制。按照片圆柱投影反算横向采样，深绿区连续减轻照片自带高光，背侧没有猜造条码或配料表。不可见侧、局部色彩和表面反射仍为近似。

受限作者`blender-model-beverage-can-printed.py`加载各自v1源，受限发布器`publish-beverage-can-printed.py`独立比较每个三角形，拒绝几何变化、缺UV、金属误贴、错误图像尺寸及透明罐身。仅body接图，拉环／盖／卷边保持金属；GLB和离线脚本都嵌入图案。每种罐的所有阵列成员共用一张运行贴图，普通猫粮／其它静态产品原范围保持。印刷body不再用通用color字段染色，旧color数据保留。

没有新实例字段或空间语义版本：runtime资产版本2，物理geometryVersion仍1，阵列v66／离地／复制／保存保持。最终源、同机位前后图、正式生产纹理逐像素和配对UV回读、10个发布负例及24罐三入口界面见[包装验收](validation/beverage-cans-print-20261107/README.md)。
