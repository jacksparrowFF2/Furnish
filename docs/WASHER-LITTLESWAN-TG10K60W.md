# 小天鹅 TG10K60W · 10kg

按用户提供的四张图片在 Blender 建模并导入 Furnish，新增独立 `washer_littleswan_tg10k60w`。默认洗衣机预览切换此款；旧通用 `washer` 及原方案保留，不批量改写用户数据。

## 资料与尺寸

| 项目 | mm／说明 | 依据 |
|---|---|---|
| 机身宽×深×高 | 595×560×850 | [参数](references/washer-tg10k60w/specifications.png)、[尺寸图](references/washer-tg10k60w/dimensions.png) |
| 开放不封闭柜参考空位 | 625×600×865 | [安装图](references/washer-tg10k60w/installation.png) |
| 左右／顶部／背部预留 | 左右各15、顶部15、背部30 | 同安装图，独立于实体尺寸 |
| 带柜门参考深度 | 建议605 | 同安装图；仅深度不能证明柜门开启 |
| 水电 | 三孔10A接地插座、4分专用水龙头、自带1.5m电源线 | 同安装图，接口位置／标高未知 |
| 其它 | 10kg、1400转/分、变频、一级能效、无烘干 | 商品参数，价格未知 |

安装总深600与“560机身＋背部30”之间未解释的10mm不擅自分配。没有产品链接，保留用户原图。实物门轴、开角、后管尺寸及振动／承托条件仍待资料或实测。

## 资产与规则

源工程／GLB：`assets/models/washer-tg10k60w/washer-tg10k60w-v1.*`；离线发布模块：`src/data/washer-tg10k60w-blender-asset.js`。资产 `washer-littleswan-tg10k60w@1`，34个具名网格、1个竖轴父节点、3个随动门件。

白机身与宽白圆门环、银灰控制区、旋钮／蓝色区域、侧板压筋／椭圆、圆检修盖和四脚参照[外观图](references/washer-tg10k60w/appearance.png)。细部、板厚及内部结构为照片布局近似；蓝色区未复制宣传贴纸，玻璃按现有不透明PBR资产约定近似，未模拟透射。

门外径420、孔径340、中心离地410、左轴X=-212／Z=266、0–110°均为本例建模假设，不是厂家参数。正面局部+Z，安装底部为最低脚底。机身尺寸包含已建模门体，未给定的后管尺寸不推测。

`washer-motion-core` 按产品 `washerProfile` 选择参考与资产，生产和数值实体复用 `washer-model`。改尺寸先拟合圆门／真实圆孔，再刚性转动，仅用于布局缩放。当前轮廓取生产门体顶点，完整开启仍由12个高度片保守扫掠，不声明逐三角面连续碰撞或柜内自由空腔。

尺寸、吸附、测距、碰撞、安装高度、镜像／旋转、空间确认与门角字段复用原链路，无新持久字段／格式版本，沿用v35。洗衣柜按laundry能力识别；叠放按washer／dryer类别识别，防止两台不同型号洗衣机误配成洗烘。保留原连接层，但不证明实物允许叠放。跨洗衣机型号替换更新身份并保留兼容门角、离地和柜体关联，替换烘干机清理专用门角；旧实例不改型号或尺寸。

安装参考写入产品规则并在属性中展示；本次未新增安装预留自动判定。已有实体、开启与柜板核对继续执行，图示预留和水电另核对。

## 复现及验证

```powershell
node scripts/blender-asset.cjs author-washer-tg10k60w <全新目录>
node scripts/blender-asset.cjs publish-washer-tg10k60w assets/models/washer-tg10k60w/washer-tg10k60w-v1.glb
node scripts/preview-washer.cjs
node tests/test-blender-washer-tg10k60w.cjs
node scripts/verify/verify-blender-appliance.cjs --tg10k60w
```

原通用预览用 `FURNISH_WASHER_PROFILE=generic` 生成；原浏览器 `--washer` 明确选择通用型。Blender回读增加 `--tg10k60w`，比较34件生产开／关GLB、竖轴、角度和离地仅叠加一次。证据见[增量记录](validation/washer-tg10k60w-20261029/README.md)。未运行全量检查。
