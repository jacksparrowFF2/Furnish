# 小米智能开关2／2 Pro · 86面板

2026-11-11。在家具库「电器 → 86开关插座面板 · 公牛／小米」放入面板，然后在属性「86面板种类」选择小米智能开关2或2 Pro。每款有单开／双开／三开、白色／深空灰，共12个独立选项；保留公牛37款及原 `panel_bull_g12` 类型，不迁移已有实例。

## 依据与尺寸

来源为用户给定京东自营商品[2 Pro](https://item.jd.com/100434281318.html)、[普通款2](https://item.jd.com/100313419465.html)的商品详情。已读取详情实际CSS图片并下载原字节，URL清单与SHA256索引在 `assets/models/panel-xiaomi-switch2/references/product-page/sources.json` 及 `asset.json`。促销主图不作为结构比例依据。

| 项目 | 普通款2 | 2 Pro | 依据 |
|---|---|---|---|
| 面板外宽／高 | 86×86 mm | 86×86 mm | 普通详情01、Pro详情34标注 |
| 露墙厚度 | 7.9 mm | 顶部最薄3.5 mm，底部1°微倾；模型最大约5 mm | 普通详情07，Pro详情07／08；5 mm按86×tan(1°)+3.5推算并取0.1mm，非厂家底部实测 |
| 厂家总深度 | 单双开30.7，三开34.7 mm | 34.8 mm | 普通详情01、Pro详情34；仅记录，不计入面板占地 |
| 表面 | 全致密釉面近似；灰色喷涂金属质感 | AG玻璃及AF涂层近似 | 普通详情08／11，Pro详情09；采用不透明PBR，不模拟透射或折射 |
| 底部离地 | 独立mountHeight，0–20000 mm，新建0 | 相同 | 软件布局初值，不代表建议安装高度 |

Pro商品参数接口曾返回 XMQBKG05LM，而本次详情参数图列出 XMQBKG07/08/09LM；存在页面版本差异，故采购记录使用商业名称与单／双／三开标签，不擅自给各SKU硬填型号编号。普通款尺寸以明确标注“小米智能开关2”的详情列为准，不混用选购表中老款智能开关11 mm或老Pro12 mm。

## 结构与适用范围

正面为局部+Z，底边局部Y=0。墙外中框、按键凹缝、每片独立按键、下方每键圆点指示窗均为具名几何。Pro按键与中框采用真实微倾分层，普通款保持平面及较厚中框；外侧圆角与内部细缝分别建模。圆角、缝宽0.36 mm、指示点直径约0.64 mm／离底15.7 mm为图片估算，不作为加工尺寸。指示点不发光，不模拟电气动作。没有可读标记的白色面板不编造文字。

只建墙外面板，底盒、端子、墙内机构与电路省略。测距及碰撞针对可见实体，不进行底盒深度、接线、功率或智能网关施工校验。每个部件仍沿共用 `FurnishSnapping.directional()`／`FurnishGeometry.bodyParts()` 生产链，旋转／镜像、完整包含、局部重叠及高度分离无额外豁免。凹缝的空间判定沿现有保守网格实体算法。

## 数据与交互

共用 `panelVariant` 字段，新增值 `xiaomi-{2|2pro}-{1|2|3}-{white|grey}`。公牛 `panelVariants` 保留37款原作者契约；界面与字段校验读取合并的 `panelOptions`。`xiaomiPanelVariants`／`panelSpec()` 是小米款式、尺寸及品牌来源唯一规则。

`editPanelVariant()` 在已有深度等于上一个标准厚度时切换到新款标准厚度；已自定厚度保留，宽高、名字、位置和底部离地均保留。配色由选项固定，其部件不被普通颜色框重新着色；缩放仅作布局近似。切换同步品牌、商业型号、商品来源，不套用抓取时临时优惠价格。公牛互换不重写原自定义颜色／采购元数据。操作通过已有mutate，沿撤销重做及自动保存。

小米值要求项目／工作区v85；公牛仍v84，缺字段旧实例仍读原默认。当前／命名方案／自定义库、缓存候选、复制替换及重复恢复共用现有链路。缓存读取完整款式，空间确认读取去除配色的结构键；同型号同位数配色切换不清除空间确认。价格与普通颜色编辑也不影响空间确认。不同种类的采购条目分别汇总。

Blender源为 `assets/models/panel-xiaomi-switch2/v2/panel-xiaomi-switch2-v1.blend`，12款GLB逐一独立回读并通过尺寸／身份／不透明材质检查后发布到 `src/data/panel-xiaomi-switch2-blender-asset.js`。原86生产构造器按款式选择对应资产。离地只在静态构造器叠加一次。作者脚本及独立发布器分别是 `scripts/blender-model-panel-xiaomi-switch2.py`、`scripts/publish-panel-xiaomi-switch2.py`。

适用验证入口：

```powershell
node tests/test-panel-xiaomi-switch2.cjs
node tests/test-panel-xiaomi-switch2-publisher.cjs
node tests/test-panel-bull-g12.cjs
node scripts/verify/verify-panel-xiaomi-switch2-desktop.cjs
node scripts/verify/verify-model-pipeline.cjs panel-xiaomi-switch2 auto
```

执行证据、实际结果及未执行项见[本次视觉与生产验收](validation/panel-xiaomi-switch2-20261111/README.md)。
