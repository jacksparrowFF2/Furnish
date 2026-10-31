# 源氏木语 Y107H03 · 1.25米沙发床

2026-10-31。新增独立类型 `sofa_bed_yeswood_y107h03`，家具库「家具 → 沙发」内显示「源氏木语 Y107H03 沙发床 1.25米（梨白）」。现支持收起／展开端态切换，未修改1601正式方案。

## 商品资料与尺寸

用户提供的[京东商品](https://item.jd.com/10222453768218.html?pcdk=tYm4zPuxlfwfMDJGKB3FpmsLp6UaRNDrZfrEncvYAtvwb3VqGIj8y7DNuXVth1_2.rQ4a.tlbT)对应「【15】1.25米山毛榉原木色（梨白）」；页面规格货号Y107H03、实木框架、布艺海绵、坐垫翻折、可拆洗。依据为实际读取的详情图与用户补发的[完整尺寸图](../assets/models/sofa-bed/references/user-dimensions.png)，不套用检索中出现的Y98H01／Y107H08等其它型号尺寸。

| 标注 | 数值 | 模型使用 |
|---|---|---|
| 收起总宽×总深×总高 | 1250×838×770 mm | 生产网格包络 |
| 坐高／坐宽 | 400／1180 mm | 上层坐垫顶与软包宽 |
| 坐垫深／单层厚 | 760／50 mm | 固定垫与两片折垫分开；折垫长度见下方估算 |
| 标注坐深 | 590 mm；侧视含靠枕为500 mm | 使用范围不同，不当作两种总深 |
| 靠垫高度／上、下厚 | 560／100、160 mm | 长靠垫与上薄下厚轮廓 |
| 腰枕长×高 | 560×260 mm | 两只独立软枕；厚度与倾斜估算 |
| 木框高度 | 722 mm | 后立柱顶部 |
| 腿间距／腿粗 | 1150／50×50 mm | 前柱内侧净距与截面外包 |
| 底架离地 | 85 mm | 金属横架底部；轮子仍落地 |
| 侧板长×高 | 740×260 mm | 两侧独立板件 |

商品图注明实木测量约±10 mm、软体约±30 mm，细节以实物为准；这不是程序的浮点验证容差。原图分片06–09、翻折步骤15–16、框架28–30及原始地址清单保留于 `assets/models/sofa-bed/references/`。

## 展开结构与推算边界（2026-10-31）

依据[三种形态图](../assets/models/sofa-bed/references/04.jpg)、[两档展开图](../assets/models/sofa-bed/references/13.jpg)、[一抽二铺图](../assets/models/sofa-bed/references/14.jpg)、翻垫15、滑轮16和裸架28–30：后靠背和两侧箱板留在原位，前栏／前柱随抽拉底架前移，中级支撑另移动，两片折垫展开为三段平整垫面；腰枕在床态平放。

图片没有给出可直接套用的本型号展开总长。**模型占深2018 mm是布局推算值，不是厂家标注**：以图上590 mm坐深作为两片翻垫的参考段长，两级590／1180 mm行程，收起838 mm加1180 mm得到2018 mm。固定垫深760 mm、两片590 mm，垫面总长1940 mm；展开床面高300 mm、垫厚50 mm和底架细节为结合三段铺平图的建模值。仅保留收起／展开两个端态，不把图片推算升级为真实五金行程或连续机构轨迹。

## 几何、资产与应用

Scoop实际Blender5.2.3 LTS制作79件具名网格和6个运动父节点，保留[当前可编辑工程](../assets/models/sofa-bed/v3/sofa-bed-v1.blend)、[自包含GLB](../assets/models/sofa-bed/v3/sofa-bed-v1.glb)，独立回读发布离线普通脚本。资产版本为 `sofa-bed-yeswood-y107h03@2`；首版49件收起源保留在v2目录，早期制作副本仍在本机 `.local/sofa-bed-drafts/`。

`sofa-bed-core.js`定义角色、两级抽拉、嵌套X轴翻垫、平放腰枕和端态包络；`sofa-bed-model.js`先拟合参考顶点再作刚性变换，显示、生产预览和数值实体同源。静态后框／侧板／靠垫不随展开移动；不把整件沙发拉长模拟展开。地面中心为原点，正面+Z，旧实例cx/cy仍指收起基体中心，展开只向前延伸；宽深高改动表示非标布局缩放。

属性「沙发床形态」选择收起／展开，沿原update／mutate、撤销和保存。输入w/d仍为收起基体尺寸，当前总占深、二维选择／占地及3D当前实体读取派生包络。79件生产网格沿 `bodyParts()`／`directional()`提供测距与碰撞，不按型号放行。前方另给出保守展开操作区，高度覆盖人工翻垫可能占用空间；它不是经验证的精确连杆扫掠，可能在空角或实际不经过的位置报占用。

### 新字段和恢复

- `sofaBedOpen`：可选布尔值，仅本型号支持；新建false，旧缺失只读取false、不补写。复制保留，跨类型替换由共用产品字段能力清理；非法值拒绝。
- 当前／命名方案／自定义目录含本型号时使用项目与工作区v40，缓存读写支持v40及历史版本；原其它型号版本判定保留。三次恢复无漂移，不强制修改旧实例宽深高与位置。
- 3D与数值实体缓存纳入字段，空间确认对本型号追加 `sofa-bed-endpoints-v2` 与状态。旧49件几何的确认重新核对；价格、配色及采购等非空间编辑不清确认。

### 外观与算法边界

木框厚度、伸缩架槽位、轮子／连接件和软包鼓度仍是照片近似；保留具名嵌套翻轴用于端态装配，不提供连续动画或声称实物机构已求解。软垫与框体的隐蔽交接没有制作工艺级剖面，未验证软包压缩、内部泡棉、承重或施工安装。曲面实体使用现有保守高度截面，不是连续逐三角面碰撞。木色可编辑，梨白软包／黑色金属独立材质，价格待填写。

## 验证和复验

已执行的完整记录见[增量验收](validation/sofa-bed-motion-20261031/README.md)。

```powershell
node scripts/blender-asset.cjs author-sofa-bed output/sofa-bed-new-source
node scripts/blender-asset.cjs publish-sofa-bed assets/models/sofa-bed/v3/sofa-bed-v1.glb
node tests/test-sofa-bed.cjs
node tests/test-sofa-bed-project-v40.cjs
node scripts/preview-sofa-bed.cjs
$env:FURNISH_BROWSER_CHANNEL='msedge'
node scripts/verify/verify-model-pipeline.cjs sofa-bed gpu
node scripts/verify/verify-sofa-bed-desktop.cjs 'D:/1601装修/Furnish项目/workspace.furnish.json'
```

桌面验收读取正式文件的副本，用同一打包EXE和独立目录／端口／缓存，不改变真实方案。正式窗口需刷新才能读取新增目录；独立预览在 `output/sofa-bed/preview.html`，其构造器与正式应用相同。

首版静态模型的历史验收保留在[49件收起记录](validation/sofa-bed-y107h03-20261031/README.md)，不将其旧结论作为当前79件展开模型的验收。
