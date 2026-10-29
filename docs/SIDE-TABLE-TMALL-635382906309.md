# 双抽岩板边几 · 天猫 635382906309

2026-10-29。家具库「双抽岩板边几 · 68cm」，type=`sidetable_tmall_635382906309`；保留原通用边几。品牌和厂家型号未知；没有猜测品牌、木种或价格。未改动真实方案家具。

## 依据与方向

[用户商品链接](https://detail.tmall.com/item.htm?abbucket=0&id=635382906309&mi_id=0000n64ioooJG8d3oTuI_3sSR6yl6NubVt7Jui-6QXW-OA4&rn=1d72a6e371179b1c55984da266deb1b9&skuId=5776584417656&spm=a1z10.3-b-s.w4011-14781637738.244.629a5884FD6Y30)。本次淘宝商品接口返回平台错误，网页读取失败；未取得标题、SKU、价格、正文及材质说明，不能声称已核验网页。使用用户提供的六张截图，[尺寸图](references/side-table-tmall/reference-1.png)、[短边正视](references/side-table-tmall/reference-3.png)、[开启照片](references/side-table-tmall/reference-6.png)。图2、5为相反方向观察，和尺寸图的同一结构兼容，不新增镜像型号。

| 参数 | 模型采用值 | 依据 |
|---|---|---|
| 外包宽×深×高 | 680×300×612 mm | 尺寸图68、30、61.2 cm；包含脚轮 |
| 岩板 | 11 mm | 图示11±0.5 mm；尺寸图提示家具测量±1 cm |
| 长边内跨 | 595 mm | 图示59.5 cm |
| 上层净高 | 185 mm | 图示18.5 cm，层板上表面至顶横梁底面 |
| 下格净高 | 270 mm | 图示27 cm，底板上表面至层板底面 |
| 下部抽屉区／开放格分配 | 270／325 mm | 图示27／32.5 cm；270含分隔板，不当抽屉内径 |
| 两抽屉内径 | 220×240×80 mm | 图示宽22×深24×高8 cm；宽沿Z、深沿X |
| 木框截面 | 长向42.5、深向28 mm | 42.5由680−595分配两端；深向与圆角为外观估算 |
| 结构板／抽屉板 | 18／12／8 mm，层板20 mm | 未标注，模型假设 |
| 脚轮 | 20 mm轮及连接底板的支架 | 图片只说明带可刹车滑轮；型号、轮径、刹车五金未知 |
| 完整拉出 | 220 mm | 布局假设，非厂家滑轨限位 |

长边正面为局部+Z，宽X、高Y、深Z；抽屉在面对长边正面的左侧，向−X短边拉出。镜像时随模型翻转。原点地面／外包平面中心，生产资产用m，界面及持久数据用mm。没有将正面600 mm通用预留套给左侧抽屉；完整开启单独检查。

## 模型、尺寸编辑和状态

独立后台Blender 4.5.15 LTS建模，保存[可编辑源工程](../assets/models/side-table/side-table-v1.blend)及[GLB](../assets/models/side-table/side-table-v1.glb)；再经独立Blender重新导入和受限side-table发布配置，生成离线普通脚本资产。35个独立部件、2个抽屉父节点、10块活动板。发布检查稳定身份、逐件尺寸／中心、轴心及层级、外包、材质及来源SHA256。错误轴心即使反向补偿子网格使闭合外观相同，也必须拒绝并保留上一资产。

`side-table-core`派生具名板件目标尺寸；`side-table-model`逐板拟合导入网格，再对抽屉父节点作刚性平移。改外宽深高保持已定义板厚和185 mm上层净高，扩大下部柜区；抽屉内深按长边内跨同比变化，内宽为深度−80，内高保持80。非标尺寸仅是布局草模；允许范围宽≥500、深≥180、高≥560 mm，防止结构倒置。圆角随单板拟合有轻微非等比变化，未模拟五金孔、榫接、刹车运动及承载性能。木纹和白色岩板为视觉近似，未宣称材质认证或大理石天然纹理。

产品规则集中两个可选布尔字段`sideTableUpperOpen/sideTableLowerOpen`，缺失均读false，新建false；复制保留，跨型号替换清理。属性控件调用已有`upd/mutate`，锁定禁用，沿原撤销、保存通道。项目／工作区v36及独立v36缓存保护新类型和字段，旧缓存可读且不会强制补写字段。新建、命名方案、项目、仓库、重复恢复均覆盖。

生产网格经`FurnishCabinetMotion.solidParts()`、`bodyParts()`与`directional()`共用，没有填实整柜。当前开启影响实体、二维选择／抽屉图例和全部缓存、空间确认；采购／价格／颜色不清除空间确认。完整行程含柜内起点至柜外终点，按移动板件外包作保守水平扫掠和高度范围；无需打开抽屉才检查。该扫掠可能填满抽屉内腔和高低板之间空角，不等于连续三角面精确碰撞，也不把独立放置的物体自动绑定为随抽屉移动的物品。

## 查看与复验

`node scripts/preview-side-table.cjs`生成`output/side-table/preview.html`，调用生产构造器，支持双抽独立姿态、正／短边／背侧、环绕缩放及窄屏。家具库客厅分类可添加本型号。

```powershell
node scripts/blender-asset.cjs author-side-table <新目录>
node scripts/blender-asset.cjs publish-side-table assets/models/side-table/side-table-v1.glb
node tests/test-side-table.cjs
node tests/test-side-table-project-v36.cjs
node scripts/verify/verify-side-table.cjs
node scripts/verify/verify-side-table-blender.cjs
```

详细验收与截图见[记录](validation/side-table-20261029/README.md)。未验证实物材料／安装承载／五金限位；未运行全量检查，也未修改已有用户方案。
