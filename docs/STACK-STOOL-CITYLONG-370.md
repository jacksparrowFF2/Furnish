# 370 mm 软包叠放方凳

2026-10-31。类型 `stool_citylong_370`，家具库「家具 → 椅凳」中的「禧天龙 软包叠放方凳 · 37cm」。按用户三张商品图制作奶油白软包版本；型号编号和价格未知。图片中的营销文字仅作参考，未当作操作指令或已验证性能。

## 依据与边界

| 参数 | 数值 | 依据 |
|---|---|---|
| 单把外包宽×深×高 | 370×370×467 mm | 用户尺寸图标注 |
| 数量 | 1–12，默认1 | 布局功能范围，不是厂家安全叠放上限 |
| 每增加一把的高度 | 默认70 mm，可调50–200 mm | 叠放图外观估算，未提供实测尺寸 |
| 叠放总高 | 单把高度+(数量−1)×增高 | 共享核心派生，不覆盖单把h |
| 整叠底部离地 | 默认0 mm，可调 | 布局定位，可放在柜底板或层板上 |
| 外壳壁厚 | 建模参考5 mm | 第一张图标注；不同软包版本是否同结构未确认 |
| 外壳锥度／拱口／软垫曲面 | 外观近似 | 透视图片估算，不是厂家尺寸 |

参考图：[叠放](../assets/models/stack-stool/references/user/stack.png)、[单把外观](../assets/models/stack-stool/references/user/appearance.png)、[尺寸与颜色](../assets/models/stack-stool/references/user/dimensions.png)。前图为布艺版，后两图为仿皮革版；本模型采用后两图的奶油白软包外观，未宣称不同版本叠放参数相同。未模拟织物／皮革微纹理、品牌小字、内部加强筋、脚垫、受压变形或真实接触力学。

四把按默认值占用 **370×370×677 mm**，六把为370×370×817 mm。柜体应比较**内部净宽、净深、净高**，另留取放余量；未定义厂家取放预留。每把增高未实测，模型不证明实物能按此高度嵌套、可安全叠几把或稳定承重。整叠作为一个布局对象，叠放数量不是采购订单件数字段。

## 生产资产与空间能力

Blender 5.2.3 LTS 后台建模，保留[源工程](../assets/models/stack-stool/v4/stack-stool-v1.blend)及[GLB](../assets/models/stack-stool/v4/stack-stool-v1.glb)。四片转角薄壳具有真实拱口，另有独立软垫，共5件闭合正体积网格。早期有效草稿仅作本机保留，不替代最终发布资产。

`stack-stool-model.js` 通过现有 `static-asset-model.js` 读取已独立重新导入校验的离线网格，逐把沿Y按mm增高装配，每件身份包含叠放序号。主场景、可交互预览、生产GLB和数值实体共用构造器；源坐标Furnish X宽/Y高/Z深、正面+Z，底部中心原点，Blender使用(x,-z,y)。外层继续统一旋转、镜像和完成地面基准，不重复加高。

`FurnishProducts.stoolStack()/dimensions()/vertical()` 同源计算数量、总高和上下界。`FurnishGeometry.bodyParts()` 及 `FurnishSnapping.directional()/cabinetInterior()` 读取生产实体，不以型号豁免穿板。有结构柜体仍通过现有生产板件判断内腔。凳壳为弯曲薄壳，现有数值截面是保守处理，可能填充局部凹角，不能用凳腿之间的空隙验证其它物体穿入，也不是逐三角面精确碰撞。非标准宽深和单把高度仅表示整体缩放草模，壁厚也随缩放，不表示其它真实产品规格。

## 状态契约

- 可选 `stoolCount`：1–12整数，缺失读1；`stoolPitch`：50–200有限mm，缺失读70。`mountHeight`复用现有字段，缺失读0；`h`仍表示单把高度。
- 新建写三项初值，旧缺失不补写。复制／命名方案／项目／工作区保留，跨型号替换按产品字段能力清理，同型替换保留。
- UI沿原 `mutate()`、锁定、撤销重做及自动保存。3D与数值实体缓存读取数量、增高及离地；空间确认仅在方凳对象中追加有效数量／增高与语义标记，无关类型保持原签名；价格、采购和配色不清确认。
- 含该类型的当前方案、命名方案或自定义目录使用项目／工作区v39；v39缓存继续读取旧版本。旧项目不含该类型时保持原格式版本。加载新增两个本地经典脚本，无远程依赖。

## 复验

```powershell
node scripts/blender-asset.cjs author-stack-stool output/stool-new-source
node scripts/blender-asset.cjs publish-stack-stool assets/models/stack-stool/v4/stack-stool-v1.glb
node scripts/preview-stack-stool.cjs
node tests/test-stack-stool.cjs
node scripts/verify/verify-stack-stool.cjs
# 后台 Blender运行 scripts/verify/verify-stack-stool-blender.py
```

预览入口生成于 `output/stack-stool/preview.html`；验收见[记录](validation/stack-stool-20261031/README.md)。未运行全量检查；未进行实物测绘、真实叠放接触／稳定性及厂家施工核对。
