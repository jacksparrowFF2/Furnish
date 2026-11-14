# 灯光单位修正与独立高清预览验收

2026-11-14。用户同意修正预算／单位／曝光并接入光追，随后明确不保留旧「现有效果」功能。实现保留快速三维编辑，正式效果入口为「高清预览」，Cycles出图继续原入口。契约见[说明](../../LIGHTING-PREVIEW.md)。

## 已通过

- `test-lighting-preview`：光度往返、发光面积、主照明优先与阴影、旋转／镜像／完成面转换、弧形发光面正交基、全部灯源不受光栅预算裁剪、关闭／隐藏负例、导出无重复面灯近似、全部供应文件和权重哈希。
- `test-lighting-planning/test-downlight/test-panel-light/test-ceiling-lighting/test-ceiling-continuous-light/test-ceiling-section-transforms/test-ceiling-display`：原尺寸、实体、开孔、安装、项目往返不变；更新的单位及新发光材质开关；灯带真实接收面、封闭遮挡负例、连续弧段与截面变换。
- `test-blender-render/test-blender-affine/test-blender-part-identity/test-blender-sync/test-blender-refined/test-blender-device`：原GLB身份／变换、基础和精修服务、同步权限与恢复、GPU选择等相关回归。
- `test-backend-auto-update`：新核心及ES模块沿现有源扫描、语法预检、后台接替和旧页保存重试。
- `test-lighting-preview-modules`：无GPU／项目访问的实际Chrome完整离线ESM加载；Windows保留名`aux.wgsl.js`改为可检出的`furnish-aux.wgsl.js`，匹配导入与供应哈希；第三方原始空白保留，不为差异检查重排供应代码。
- `test-lighting-preview-ui`三入口实际通过：HTTP停止／关闭，断网file编辑与明确高清提示，正式打包EXE的独立源码／项目／端口／缓存。1601保持真实完整墙顶，3687生产网格、23面源及6夜灯，公共相机与生产快照。真实WebGPU128采样＋OIDN完成；已实际打开PNG检查，无黑画布或假占位图。首次准备含编译约24.6秒，缓存后一次约12.8秒，1200×674。
- 实际编辑关闭主灯后旧图失效且下载隐藏；下一生产快照无顶灯矩形，夜灯独立。移动灯具与切换到内容相同的复制方案均取消旧预览。停止／关闭销毁iframe，完成也释放预览GPU上下文；不可用WebGPU负例退出，快速编辑与Cycles入口仍可用。390px面板不过界；预览无外部HTTP依赖请求。
- 实际高清分支1920×1079／1024采样＋OIDN约120.0秒完成，已打开全尺寸PNG和面板截图复核。上述耗时包括快照之后的预览准备与编译，以本机一次实测为准；不是其他GPU的速度保证。
- 基础Cycles使用同一隔离GLB，经当前生产`blender-render.py`实际128采样／1200×674出图，OptiX RTX4070TiSUPER，无CPU回退。另存`.blend`回读：3684导入网格、42打包纹理、6个夜灯聚光与1日光，无重复面灯聚光；曝光因子10、世界RGB0.015、AgX。已打开实际PNG。精修工程参数保留由原受信副本／参数回归验证，本轮未重渲用户精修源工程。

以上共15套相关Node回归及三入口UI验证；最后一次快速预览11.3秒，高清120.0秒。测试各自先复制正式项目，结束核对源SHA256不变；原用户方案和仓库`projects/workspace.furnish.json`的既有未提交改动均保留。大文件和实际图片归档于`D:/1601装修/设计建议/1601-高清预览接入-20261114/`；最终UI记录`output/desktop-verification/lighting-preview-3ksb4s`，高清`lighting-preview-RlMXmz`，三入口`lighting-preview-oBsFB6`。正式项目无新增字段或迁移。文件哈希、实际设备与耗时见[结果](results.json)。

## 边界

本轮为所改灯光、导出与预览链的增量验证，未运行全量检查。未进行Mac／其他实体GPU、长期反复开关的显存压力、真实IES／照度／眩光或米家联动测试；不把规划强度当作厂家光度。快照、纹理、BVH／TLAS准备和首次GPU编译仍有耗时。

快速编辑保留有限光源及光栅洗顶近似；高清使用解析发光矩形与真实反弹，Cycles保留glTF生产发光薄壳和AgX。当前两者不是同一显示变换的严格A/B；前一轮受控对照另见[历史实验](../living-lighting-comparison-20261114/README.md)。
