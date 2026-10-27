# 平板灯吊顶反射增量验收 · 2026-10-27

原直接光只朝下，实时渲染没有墙地反弹，开灯后铝扣板仍黑。新增两处向上反射近似（总3 cd，面板下900 mm，162°全锥角，penumbra=1，4 m范围），阴影512像素、near20 mm；展示假设不是实测光通量或反射率。

[无反射近似](before.png)／[修正后仰视](after.png)使用同机位、曝光0.8、真实生产铝扣板和完整整板开口。已视觉查看板面、拼缝、灯面与墙顶交界；三个顶面采样RGB和由0分别变为404／441／528，灯面保持更亮。挡板位于反射源和顶面之间但不遮相机，采样354→0，验证补光受遮挡；顶灯关闭后8个预览光源全部隐藏。见[记录](results.json)。

原墙面同条件对比最大1 cm亮度变化41→6，未回退硬边光斑，见[墙面记录](wall-gradient.json)及[当前墙面](wall-after.png)。这些显示像素数值只验证本场景，不代表照度或任意场景结论。

通过test-panel-light（生产几何、安装、恢复、八光源开关、六直接光快照、旋转镜像、重建释放两张真实WebGLRenderTarget）、test-product-rules、test-bath-heater-se2、test-blender-render；HTTP/file界面贴合、开关、撤销／重做、刷新、项目导入导出、390 px验收通过，见[browser-results.log](browser-results.log)。改动JS与入口内联语法及git diff检查通过。

未运行全量检查、实机Blender重渲染或实物照度验收。反射使用固定位置和强度，未计算真实反射率或多次光线反弹；有限阴影与额外两光源存在精度和性能边界。旧方案数据与安装几何不变。

整合灯带提交c9c3b07后，通用阴影释放及两类预览补光排除已合并；test-panel-light、test-ceiling-lighting、test-blender-render、test-blender-sync及HTTP/file平板灯界面复验通过。
