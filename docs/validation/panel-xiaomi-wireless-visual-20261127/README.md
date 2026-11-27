# 小米智能无线开关 XMWS01XS 参考图建模复核

2026-11-27。新建京东 100197232066 白色双开，核对墙装中立姿态。尺寸和安装说明取厂家资料，后壳细部和材质按可见外观估算。

## 参考解读

| 参考 | 实际查看区域 | 识别特征与依据 |
| --- | --- | --- |
| [京东同款外观原图](../../../assets/models/panel-xiaomi-wireless/references/jd-appearance.jpg) | 白色主体在图中约 (124, 560, 385, 445) | 双片等宽按键几乎铺满正面，中央是贯通的细直缝，靠底每键一个竖向短指示窗。斜视可见连续后壳和按键后沿的层次。 |
| [小米有品按键原图](../../../assets/models/panel-xiaomi-wireless/references/white-in-use.jpg) | 面板约 (250, 101, 581, 576)，左键指示窗约 (392, 565, 12, 18) | 近正面确认外角圆弧、中央内侧直角和指示窗相对位置。按压中的右键仅用于核对分件。 |
| [小米说明书](../../../assets/models/panel-xiaomi-wireless/references/manual.pdf) | 结构示意、安装及基本参数 | XMWS01XS 外包 86 × 86 × 11 mm，双键及底部扣手有示意。截面、扣手尺寸和实际塑料材料牌号未知。 |

参考图原字节及 SHA-256 见[产品档案](../../../assets/models/panel-xiaomi-wireless/asset.json)。两条镜像布置的指示窗以正面估算为约 0.65 × 1.6 mm，中心距底约 14 mm。用凹孔和静态扩散件表达，不依靠表面印点。按键中缝估算 0.42 mm，外角估算 2.8 mm。两键、背板、外壳和指示窗分别分件。按键下边的小扣手按说明书位置建盲槽，背面未见的标签、电池及墙内配件省略。

## 作者视图

使用 Blender 5.3.0（`/Applications/Blender.app/Contents/MacOS/Blender`）。工程相机为正交，正面、右前斜视及从下方观察的细节视角对应作者脚本 `front`、`oblique`、`detail`。原图焦段与布光未知，角度按主要边线和可见侧近似匹配。灰模和白色 PBR 在相同机位、灯光、曝光与 Cycles CPU 采样下复核。

| 阶段 | 实际查看的渲染 | 结论 |
| --- | --- | --- |
| 轮廓 | [灰模正面](clay-front.jpg)、[灰模斜视](clay-oblique.jpg) | 双键等宽、四外角圆弧、近方形外包与斜视厚度通过。 |
| 结构 | [灰模斜视](clay-oblique.jpg)、[下沿灰模局部](clay-detail.jpg) | 中缝贯通，两指示窗分件且下沉，后壳分层和两处扣手可辨。 |
| 材质 | [正面](front.jpg)、[斜视](oblique.jpg)、[下沿局部](detail.jpg) | 白色按键的微光泽、侧壳分色和未点亮的指示窗通过目视复核。商品图的布光条件使其斜视缝更暗。 |

本次为初版视觉复核。源 GLB 的 SHA-256 为 `9d8afdc6f345f88c15abfe622ab4dc8c84eeb62f5eddaf42be3f329ca754df10`，源 BLEND 为 `7f9acd8c2f3729eb30eb7cef6fe6b3f1dcbcfa630a90073deeb92a1aca9c97ab`。作者预检与发布器独立通过。

## 正式生产复核

- 在 macOS 实际打包桌面应用的隔离工作区验收面板库选款、标准厚度 11 mm、底高编辑、撤销重做、正式保存和刷新。MCP 换款与批量新增也读回了产品身份和厚度，显式厚度可覆盖标准值。
- 独立模型管线覆盖作者负例、尺寸／空间／状态、HTTP 和离线 `file://` 生产导出、Blender 回读和下载工程重开。三个生产机位由 Cycles 在 Metal GPU 上渲染，已目视检查[正面](production-front.jpg)、[斜视](production-oblique.jpg)和[背面](production-back.jpg)。
- 生产正面仍能辨认双键、窄缝与指示窗，斜视保留后壳分层。生产背面按外轮廓简化。模型为中立静态姿态，按键端态和实物配对不在本次范围内。
- [增量验证结果](verification.json)记录阶段结果、设备和源码指纹。未执行全仓回归及窄屏验收，外观为执行者对照复核。
