# 艺术玻璃表面局部复核

2026-11-08，执行者 Codex。沿 MODEL-VISUAL-REVIEW 模板裁剪为材质局部修改：既有参数化闭合板、九种配置、尺寸／安装／状态保持，不新建固定成品资产；作者重建／发布不适用。基线是本地 `03ab748e` 的 `art-glass-model.js`，原字节保存在 `output/art-glass-garden-20261108/art-glass-model-before.js`，SHA256 `859f8f3514059beff14b5d3ba0e477684cdf4a502e3f5b42aa3f5ba75f43842c`。最终源哈希及视图见 [surface-results.json](surface-results.json)。

## 参考解读和采用范围

实际读取 [Glass Garden main.js](https://github.com/Johnlzx/glass-garden/blob/32e8e3a5efcfeab075c8d068ac3d3f8f14db6258/src/main.js)、[surface.js](https://github.com/Johnlzx/glass-garden/blob/32e8e3a5efcfeab075c8d068ac3d3f8f14db6258/src/surface.js)、[shaders.js](https://github.com/Johnlzx/glass-garden/blob/32e8e3a5efcfeab075c8d068ac3d3f8f14db6258/src/shaders.js)。该项目是正交整屏平面，取固定花园照片多点采样模拟模糊／偏折，合成鼠标软光；它没有户型几何透射和真实环境反射。借鉴固定的多尺度高度场／微法线思路，沿 Furnish 原生成器独立实现，没有复制第三方源码或照片；没有引入其构建链、动画、鼠标光、照片背景或夹丝配置。

实际打开原 [samples-1](../../../assets/models/art-glass/references/samples-1.png)、[samples-2](../../../assets/models/art-glass/references/samples-2.png)、[samples-3](../../../assets/models/art-glass/references/samples-3.png)，以既有实物图复核以下识别点。照片和采样场景的相机、背景距离及光照不同，未作摄影配准或还原率判定，尺寸仍以 ART-GLASS 既有依据为准。

| 特征／优先级 | 可见特征和本次处理 | 表达／依据与未知 |
|---|---|---|
| 波纹／1 | 水立方有不规则大块，银波纹／水波纹有大波与细纹；减少方格噪声的规则走向 | 原单面法线的周期域扭曲，保留各自细纹权重；虚拟幅度／尺度仍为外观估算 |
| 颗粒／2 | 香梨细密、银霞较粗，表面高光具有颗粒层次 | 四档高度场；两款独立标准打包粗糙度贴图，G为粗糙度、B为0；无实测表面扫描 |
| 竖纹／3 | 大灯芯／长虹应保持连续竖向，不能随镜头移动或尺寸拉伸 | 原法线与毫米节距保持；金元宝／钻石也保持原法线字节 |

贴图256²，按宽高／原毫米pitch重复，微表面不随时间变化。香梨／银霞局部粗糙度范围是原名义值的0.8–1.2倍，空间平均不保证恰等于名义值；后表面和四周仍是原平面抛光材质。局部+Z花纹面、闭合厚度板及稳定身份 `art-glass:pane` 保持。GLB使用标准PBR，无自定义着色器和未烘焙节点；r160导出器对单独DataTexture的金属／粗糙度合并会失败，因此用同一张标准G/B打包图供两槽共用，金属度仍为0。

## 固定比较条件

九块实际生产构造器样片，各240×360×8 mm；顺序从左到右、从上到下：水立方、大灯芯、长虹、银波纹、水波纹、金元宝、香梨、银霞、钻石。背景卡片在玻璃后120 mm，七条蓝绿竖条用于观察偏折；没有把背景图烘焙到玻璃颜色中。

前后均使用相同生产几何、背景、机位、曝光和灯光。相机垂直FOV35°，正面位置(0,.59,2.15)m，斜视(.65,.59,2.2)m，目标(0,.59,0)m，1000×1000。WebGL为原Three r160物理材质／RoomEnvironment／ACES，Cycles为AgX／曝光0、世界强度.4、两矩形面光180W与100W、96采样、固定seed0。两引擎环境各自固定，不能将它们互相视为完全同光照。

Blender由项目发现逻辑选取 `C:/Users/SPH/scoop/apps/blender/current/blender.exe`，实际5.2.3 LTS，Cycles实际GPU OPTIX／RTX4070 Ti SUPER。完整设备、GLB哈希、对象材质槽／内嵌图像／工程重开见 [blender-surface-results.json](blender-surface-results.json)。

## 两轮材质复核

第一轮同时改进波纹走向和颗粒层次，但把银波／水波的细纹权重降为.03。实际打开 [第一轮正面](round-01-after-front.png) 发现水波过于平滑，因此第二轮恢复原.05／.08，只保留不规则的大波纹走向。未修改几何、相机、灯光或曝光；原版重新同条件渲染。

| 复核项 | 原版 | 最终版 | 执行者目视结论 |
|---|---|---|---|
| 正面整体与波纹 | [原版](cycles-before-front.png) | [最终](cycles-after-front.png) | 大块／波纹走向较不规则，第二轮保留细颗粒；仍是程序近似，水立方不等于实物不规则蜂窝形 |
| 斜视与邻接边 | [原版](cycles-before-oblique.png) | [最终](cycles-after-oblique.png) | 花纹保持在板面，方向／抛光边保持；未发现新增边缘轮廓或不透明覆盖 |
| WebGL正式材质 | [原版](webgl-before-front.png) | [最终](webgl-after-front.png) | 颗粒差异细微，高光有变化；真实背景偏折明显弱于Cycles，不能宣称两者等效 |

已实际打开整图及参考图检查波纹／颗粒区域。轮廓、结构阶段不适用本次材质修改；没有新增开口、门扇或真实位移。视觉局部修改由执行者复核，用户尚未确认；未宣称与实物精确一致、改善所有花纹或提高隐私等级。

## 正式生产与尺寸验证

| 检查 | 结果与证据 |
|---|---|
| Node增量 | `test-art-glass.cjs`通过：九种确定性／单位向外法线、接缝周期、实际生产尺寸和底高、旋转镜像／碰撞／接触／高度分离、项目／缓存／重复恢复／复制替换及非空间编辑确认保持 |
| 光学范围负例 | 四款未改配置法线与旧版逐字节一致；粗糙度只给香梨／银霞正面，抛光背面和其它配置无粗糙度图；每实例独立贴图，改尺寸只改重复次数 |
| 隔离正式EXE／HTTP／file | [desktop-results](desktop-results.json)：同一打包EXE独立工作目录／缓存／端口；属性编辑、无效值、锁定、撤销重做、保存刷新、390px、HTTP读取与断网file生产GLB通过，未写正式方案 |
| 生产导出／Blender回读 | 两入口单板及九块样片实际尺寸通过，GLB内嵌法线与G/B纹理，实际对象材质槽只两款粗糙度输入连接，无金属／其它槽污染；前后每视图1836个三角形保持 |
| 正式渲染／下载工程 | [API结果](api-results.json)：真实API GPU渲染与PNG／BLEND／GLB下载通过；下载BLEND重开，九板及两款颗粒材质槽通过 |
| 同条件GPU图／工程 | 四次Cycles出图；四份BLEND打包图片、保存重开通过。产物保存在本机 `output/art-glass-garden-20261108/` |

新增粗糙度图沿原艺术玻璃材质生命周期释放，未扩大到全局材质缓存。无新字段、数据版本、实体、空间确认或默认尺寸改动；用户正式方案未变，既有精修Blender工程沿原材质同步选项。没有执行全量检查、真实微几何／焦散或隐私／厂家加工验证。

## 复现与保留

先从本地基线 `03ab748e` 导出旧 `src/render/art-glass-model.js` 到上述before文件，再依次运行（桌面EXE沿本机配置指定 `FURNISH_VERIFY_EXE`）：

```text
node tests/test-art-glass.cjs
node scripts/verify/verify-art-glass.cjs
node scripts/verify/verify-art-glass-surface.cjs output/art-glass-garden-20261108/art-glass-model-before.js
node scripts/verify/verify-art-glass-render.cjs
blender --background --factory-startup --python-exit-code 1 --python scripts/verify/art-glass-surface-blender.py -- output/art-glass-garden-20261108
```

旧源、第一轮源、前后GLB／可重开BLEND和日志均保留本机output。隔离副本供复现保留，不是新Git工作树。初次沙箱进程／回环访问受限后在授权的本机执行环境复验通过；第一轮单独粗糙度数据图导出失败已修正并重跑，未把失败结果计入通过。
