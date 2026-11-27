# 小米智能无线开关（双开） · XMWS01XS

在「电器 → 86开关插座面板 · 公牛／小米」放入面板，再在「面板种类」选 **小米智能无线开关（双开） · 白色**。也可在插座布置视图更改现有面板的款式。

| 项目 | 数值或适用范围 |
| --- | --- |
| 对应商品 | 京东 100197232066 白色双开，型号 XMWS01XS |
| 厂家外包 | 86 × 86 × 11 mm |
| 安装与供电 | CR2450 电池。厂家支持粘贴、台面摆放和螺丝固定于 86 盒。方案面板入口采用贴墙姿态。 |
| 安装基准 | 正面局部 +Z，底边局部 Y=0。独立底部离地 `mountHeight` 0–20000 mm，软件新建初值 0。 |
| 可见结构 | 双独立按键、窄中缝、指示窗盲孔及静态扩散件、带扣手的后壳。圆角和细部尺寸来自参考照片估算。 |

资料见[用户提供的京东商品](https://3.cn/3dM7-M05?jkl=@J6zb5FvQUb@)、[小米说明书](../assets/models/panel-xiaomi-wireless/references/manual.pdf)及[产品档案](../assets/models/panel-xiaomi-wireless/asset.json)。

沿用 `panel_bull_g12` 与既有 `panelVariant`，新增款式值 `xiaomi-wireless-2-white`。原面板默认斜五孔，旧方案无字段时仍按原设定读取。款式切换按共享规则同步标准厚度和产品来源，保留位置、自定义尺寸和底部离地。面板平面、3D 和空间实体共用原生产入口。无线款可记录米家控制关系，布线入口排除该款作为强电端点。若既有布线引用的面板改为无线款，线路保留供复核，端点显示待核对。

墙装中立姿态为静态模型。内部电池、螺丝、附带胶贴和硅胶垫、电路、网关联动及按键行程未建模。材质为按商品图估算的不透明 PBR。空间算法按共用实体判定，细小盲孔不作为安装预留。

可编辑 [Blender](../assets/models/panel-xiaomi-wireless/v1/panel-xiaomi-wireless-v1.blend) 和 [GLB](../assets/models/panel-xiaomi-wireless/v1/panel-xiaomi-wireless-v1.glb) 共用 [生产离线资产](../src/data/panel-xiaomi-wireless-blender-asset.js)。[参考图与生产验收](validation/panel-xiaomi-wireless-visual-20261127/README.md)。
