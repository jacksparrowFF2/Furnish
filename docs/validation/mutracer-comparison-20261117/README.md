# MuTracer完整场景隔离对照（2026-11-17）

结论：本次原生接入未通过实际材质效果一致性检查，也未测得最终完成更快。源输入统一，不等于转换后渲染语义已等价。生产渲染器、正式方案、原vendor和项目依赖不变。

## 输入与隔离

本机Apple M6。使用现有打包Electron的独立工作目录／工程／端口／缓存，正式文件先固定复制成输入。每组只导出一次生产GLB，两个引擎各收同一buffer的副本，同一相机世界变换。完整场景5442网格、2244003三角形；MuTracer转换后数量相同，投影视场和相机变换数值误差为零或浮点尾差。未删对象或重新布灯。1200×672可被16整除，避免MuTracer内部对齐改变像素数；原标准精细档1200×674不用于本轮计时，两个引擎同时改成上述统一尺寸和宽高比。

固定256采样、8次散射上限、相同源材质和灯光／曝光、ACES、相同OIDN small guided权重。关闭MuTracer默认bevel，关闭动态分辨率／低清fallback／自适应采样／中间降噪，使用1个直接光候选以对齐现有单样本NEE；射灯半径显式0以匹配原点状射灯。共用原光源组装后的Three场景；环境常量按原TextureCache的8位量化转换为1×1浮点图。没有调曝光或灯强来强行对齐画面。

现有引擎区分直接／间接radiance clamp，MuTracer是单一clamping接口，因此本轮两边统一关闭clamp，避免把不同偏置算成速度。此处是共同控制设置，不冒称原生产默认的间接clamp=10。

MuTracer 0.3.1 npm包，下载未执行安装脚本；归档包及UMD SHA256见[results.json](results.json)。在忽略的verification.noindex/mutracer-study中解包，UMD、Worker和权重全部经本机路由提供；最终验证记录没有运行时CDN请求。未更改package.json或引入项目构建工具。MuTracer官方转换器使用OpenPBR，现有引擎使用glTF compliant材质，不能预先假定两套BRDF完全一致。

## 时间口径

从创建预览iframe计时，包含模块／解析／转换／BVH／着色器初始化。MuTracer当前适配器还会释放共用准备路径创建的空Three WebGPU上下文，这部分开销包含在其端到端时间内，未当作纯内核性能。

- 首图：满分辨率至少1采样且GPU提交完成。是带噪声的技术首帧，不等于视觉上干净可用。
- 16采样：满分辨率至少16采样且GPU提交完成，仍未降噪；额外保存早期PNG。
- 追踪结束：256采样与GPU完成检查点。
- 最终完成：256采样＋OIDN＋实际画布呈现完成。原生PNG编码单列在MuTracer完成通知之后的ms中，不混入finishedMs。

两边都只在稀疏检查点等待GPU完成，未逐帧同步。第一轮原版首图使用已有GPU读回时点，后续统一加入呈现队列完成检查；首轮只作接入试跑。首图和16采样不能替代最终画质比较。

首图及16采样通知在保存对应PNG后发出，包含这两次同步截图开销；最终计时也受到前面截图的影响。两边执行同样的稀疏截图流程，因此这些数值用于本次端到端接入比较，不作为无采集开销的内核基准。

## 控制结果

最终FP32控制组`mutracer-comparison-Rxqkfj`：同一OIDN权重、显式FP32、固定512分块；原版getRuntimeInfo确认FP32及动态分块关闭。保持光照／材质参数原输入。

| 检查点 | 现有引擎 | MuTracer |
| --- | ---: | ---: |
| 技术首图，至少1采样 | 2.746秒 | 1.519秒 |
| 至少16采样，未降噪 | 6.097秒 | 4.533秒 |
| 256采样追踪完成 | 46.904秒 | 52.065秒 |
| 256采样＋降噪／呈现 | 47.083秒 | 52.177秒 |

MuTracer最后PNG编码及传输后通知52.209秒。最终约慢10.8%，但因下述材质缺口，这些是接入试验数据，不能称严格同材质／同画质性能排名。初始及反向顺序结果也约为原版46.4–46.6秒、MuTracer52.2–52.7秒，未显示最终提速。小样本不作统计置信区间或硬件上限判断。

## 材质与图像检查未通过

- 1410个源材质实例中，20个清漆、3个透射材质。coatWeight／roughness、transmissionWeight、IOR等记录的主要数值可映射；三款玻璃的IOR及非薄壳标记匹配。
- **至少9个实际bumpMap被原生Three转换器遗漏。** 读取0.3.1转换器及原生材质字段，未找到等价bumpMap通道。本轮不把它转换成改变实体轮廓的displacement，也不删除原版贴图来制造等价。该项直接判定兼容性未通过。
- 两个引擎法线／切线数据精度、材质模型、发光三角形重要性采样及透明事件预算不完全相同。MuTracer诊断记录8788个发光三角形采样选择；现有引擎没有相同发光网格NEE。这是算法差异，不代表省略或新增源发光材质。
- 相机投影全矩阵和世界变换一致，网格数与三角形数相同，MuTracer纹理atlas scale=1，未触发预算降采样；不能用机位、丢几何或纹理分辨率变化解释图像差异。
- 已打开客厅两引擎最终图及16采样图，MuTracer窗外颜色、墙面及家具表面不同。客厅平均RGB/A绝对差约3.98–3.99/255、最大76–89；远大于本项目原版重复渲染约0.09/255。
- 厨房近景`mutracer-comparison-VEek3v`：原版51.229秒、MuTracer55.118秒；平均差9.804/255、最大126。实际看图，玻璃后的内容、反射、台面／墙面明暗不同。不能声称玻璃及清漆实际效果一致。此组用于兼容性检查，未作为最终统一FP32控制主表。

**本轮严格同材质条件没有完全达成，材质兼容性失败；未启用MuTracer为正式渲染器。** 未通过的一致性结果与成功完成渲染分别报告，不把测试器PASS当作等价替换通过。

## 复现与检查

```sh
mkdir -p verification.noindex/mutracer-study
npm pack @meimu/mutracer@0.3.1 --pack-destination verification.noindex/mutracer-study --ignore-scripts
tar -xzf verification.noindex/mutracer-study/meimu-mutracer-0.3.1.tgz -C verification.noindex/mutracer-study
node tests/test-mutracer-comparison-ui.cjs --desktop-only
```

实际使用固定工程副本：FURNISH_TEST_PROJECT指定该副本；FURNISH_MUTRACER_VARIANTS=mutracer,three可反向；FURNISH_PROFILE_CAMERA=kitchen用近景。研究目录应先准备，包不是正式离线发布依赖。测试请求超时240秒，当前场景均完整结束。测试fixture不发布私人GLB／方案／PNG；输出留在忽略的output中。

新增兼容性单测覆盖bumpMap缺口拒绝、IOR数值不匹配、投影／几何统计及不凭计数自动宣布视觉等价。改动脚本语法、相关原渐进策略和灯光核心单测、差异检查完成后归档。未运行全量check、其它硬件、白天／全型号或生产保存恢复链；没有修改这些生产链路。
