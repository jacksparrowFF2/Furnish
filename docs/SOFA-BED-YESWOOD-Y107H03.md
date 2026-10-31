# 源氏木语 Y107H03 · 1.25米沙发床

2026-10-31。新增独立类型 `sofa_bed_yeswood_y107h03`，家具库「家具 → 沙发」内显示「源氏木语 Y107H03 沙发床 1.25米（梨白·收起）」。本次交付收起模型，未修改1601正式方案。

## 商品资料与尺寸

用户提供的[京东商品](https://item.jd.com/10222453768218.html?pcdk=tYm4zPuxlfwfMDJGKB3FpmsLp6UaRNDrZfrEncvYAtvwb3VqGIj8y7DNuXVth1_2.rQ4a.tlbT)对应「【15】1.25米山毛榉原木色（梨白）」；页面规格货号Y107H03、实木框架、布艺海绵、坐垫翻折、可拆洗。依据为实际读取的详情图与用户补发的[完整尺寸图](../assets/models/sofa-bed/references/user-dimensions.png)，不套用检索中出现的Y98H01／Y107H08等其它型号尺寸。

| 标注 | 数值 | 模型使用 |
|---|---|---|
| 收起总宽×总深×总高 | 1250×838×770 mm | 生产网格包络 |
| 坐高／坐宽 | 400／1180 mm | 上层坐垫顶与软包宽 |
| 坐垫深／单层厚 | 760／50 mm | 两层独立坐垫 |
| 标注坐深 | 590 mm；侧视含靠枕为500 mm | 使用范围不同，不当作两种总深 |
| 靠垫高度／上、下厚 | 560／100、160 mm | 长靠垫与上薄下厚轮廓 |
| 腰枕长×高 | 560×260 mm | 两只独立软枕；厚度与倾斜估算 |
| 木框高度 | 722 mm | 后立柱顶部 |
| 腿间距／腿粗 | 1150／50×50 mm | 前柱内侧净距与截面外包 |
| 底架离地 | 85 mm | 金属横架底部；轮子仍落地 |
| 侧板长×高 | 740×260 mm | 两侧独立板件 |

商品图注明实木测量约±10 mm、软体约±30 mm，细节以实物为准；这不是程序的浮点验证容差。原图分片06–09、翻折步骤15–16、框架28–30及原始地址清单保留于 `assets/models/sofa-bed/references/`。

## 几何、资产与应用

Scoop实际Blender5.2.3 LTS后台制作49件具名网格，保留[可编辑工程](../assets/models/sofa-bed/v2/sofa-bed-v1.blend)、[自包含GLB](../assets/models/sofa-bed/v2/sofa-bed-v1.glb)及独立回读发布的离线普通脚本。v2目录是尺寸图校正后的制作迭代，资产身份仍为首次交付的 `sofa-bed-yeswood-y107h03@1`；上一有效制作保留在本机 `.local/sofa-bed-drafts/`。

生产构造器 `sofa-bed-model.js` 与预览、数值实体共用静态资产。地面中心为原点，X宽/Y高/Z深，正面+Z；Blender按 `(x,-z,y)` 转换，边界仅换算一次mm到m。主场景复用原旋转、镜像与完成地面基准；`bodyParts()`／`directional()`读取49件生产网格，不增加按型号的碰撞豁免。

无新增持久字段或格式版本，沿原尺寸编辑、复制、替换、mutate、撤销、恢复缓存、保存和项目／命名方案往返。改宽深高是整体缩放的布局草模，木框和软包厚度随之缩放，不代表另一真实SKU。配色编辑只影响木框，软包为近似梨白，金属与轮子保留独立材质。目录价格保留未知，避免把页面促销到手价固化为通用报价。

## 实现边界

本模型表现收起外观与当前实体。商品页展示抽出底架、翻折垫面及三种使用形态；本次没有将图片间插值实现为机构动画，也未把其它型号的1900 mm等数据当作本型号的展开尺寸。未提供展开状态的空间核对、连续机构轨迹、承重、榫卯施工或软包受压模拟。

隐藏钢架截面／数量、轮子和连接位置、面料曲面／滚边／木色为图片近似；靠背与折垫的隐蔽交接是布局几何，未建可制造的内部泡棉结构。曲面实体沿既有保守高度截面判定，不是逐三角面连续碰撞。尺寸标注与目视还原分别验收。

## 验证和复验

已执行的完整记录见[增量验收](validation/sofa-bed-y107h03-20261031/README.md)。

```powershell
node scripts/blender-asset.cjs author-sofa-bed output/sofa-bed-new-source
node scripts/blender-asset.cjs publish-sofa-bed assets/models/sofa-bed/v2/sofa-bed-v1.glb
node tests/test-sofa-bed.cjs
node scripts/preview-sofa-bed.cjs
$env:FURNISH_BROWSER_CHANNEL='msedge'
node scripts/verify/verify-model-pipeline.cjs sofa-bed gpu
node scripts/verify/verify-sofa-bed-desktop.cjs 'D:/1601装修/Furnish项目/workspace.furnish.json'
```

桌面验收读取正式文件的副本，用同一打包EXE和独立目录／端口／缓存，不改变真实方案。正式窗口需刷新才能读取新增目录；独立预览在 `output/sofa-bed/preview.html`，其构造器与正式应用相同。
