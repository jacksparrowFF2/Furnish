# 灯带洗顶与型材遮挡 · 2026-10-27

用户提供了连续暖色洗顶实景与顶部出光、侧壁／底板不透明的型材示意。原实现只有灯带自发光，没有照亮接收面的机制；顶灯按钮也未即时更新建筑缓存。

新实现不改灯槽尺寸：从生产发光面跨宽度取5条线源，向实际天花逐纹素做生产建筑射线遮挡，再生成连续暖光遮罩；不透明型材、石膏、端板、梁等阻挡的光不生成。只有实际天花接收到光，才近似一次较弱的向下反射。顶部加不透明封板、无接收面及接收面在灯带下方的反例全部无洗顶／反射。柔光板透射仍是模型近似。

[室内仰视](interior.png)为生产低灯槽、真实平顶在简化中性房间中的验收，不是照片级复刻用户客厅；已视觉核对天花连续渐变、交角、侧壁／底板及墙面无原串珠热点。[当前项目开灯前](before.png)／[当前项目开灯后](after.png)为隔离副本、同机位对比，原项目文件不被验收写回。鸟瞰裁切仍可能改变虚拟反射光的阴影，不能以鸟瞰局部明暗代表实物照度。

通过：test-ceiling-lighting、test-ceiling-continuous-light、test-ceiling-channel-switch、test-ceiling-assembly、test-ceiling-end-caps、test-ceiling-regions、test-blender-affine、test-blender-part-identity、test-blender-model-identities及test-blender-render；改动JS与入口脚本语法、git diff --check。覆盖实体不变、遮挡正反例、方向、端退让、关闭／剖切、重复绑定及Blender快照不重复补光。Blender实体与shader清理检查使用实际Three.js快照，未启动真实Blender重渲染。

[浏览器记录](browser.log)与[执行结果](results.json)：HTTP及离线file://真实导入当前工作区副本，顶灯即时启停、重复开关计数、剖切、同机位前后截图、室内仰视和shader错误检查通过。未增加持久字段或改加载机制；本轮未重复全套保存／撤销／窄屏流程，原方案数据无修改。

本轮为增量检查，未运行全量check.cjs。遮罩最大192×192／目标40 mm间距，有限宽度5线采样，未做完整多次光线反弹；仅烘焙水平天花下表面，直接遮挡按生产建筑组，不包含家具。极窄槽、复杂自绘、很大空间、密集场景性能和真实配光仍需另验。具体参数见[吊顶文档](../../CEILINGS.md#灯带实时照明2026-10-27)。
