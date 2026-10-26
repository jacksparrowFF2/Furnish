# 组合图精调、翼边贴合与安装卡槽增量验收

2026-10-26：25组Node增量通过：test-ceiling*／test-ceilings，加project、project-validation、project-recovery、repository-workspace、repository-storage、workspace-cache。新增test-ceiling-mount-contact核对26节点H形实体、横肋上下空槽、下挡边与空腔、实际四项尺寸、镜像和旋转、旧14节点模板保留、新旧几何空间签名不同、非法尺寸拒绝；选定翼边点精确定位至[300,222.345] mm，石膏与金属实际生产包络同面，H形实体／空槽的生产端面射线分别命中／不命中，所有网格及法线有限。核心定位容差1e-7 mm，生产Float32包络容差0.001 mm。

v23当前／命名方案四次恢复无漂移、项目复制及命名方案复制、仓库往返、v22缓存候选兼容均通过。旧up预设／无mount字段不补新细节；新upMount预设和显式升级使用同一生产轮廓。

八套浏览器在HTTP及断网file://通过，全部使用隔离副本与合成夹具：

- [ceiling-contact](ceiling-contact.json)：旧实例一键补齐26节点，镜像与示意尺寸4→4.2 mm保留；连接近景、滚轮缩放、中键平移及Esc精确还原，数字编辑保留viewBox和原3D canvas；先点灯槽、再点石膏顶点及边线，结果与真实鼠标投影一致（1e-6 mm容差），生产预览收到同坐标；取消贴合不关闭窗口，草稿不改正式状态；一次撤销／重做、v23缓存、刷新及实际导出／导入精确恢复、390px工具栏无横向溢出。
- [ceiling-section-interaction](ceiling-section-interaction.json)、[ceiling-live](ceiling-live.json)、[ceiling-assembly](ceiling-assembly.json)：既有旋转／拖动／镜像、增删节点、自动更新、固定像素节点、原v18／v19／v20结构及保存链路复验。
- [ceiling-aluminum](ceiling-aluminum.json)、[ceiling-panel-layout](ceiling-panel-layout.json)、[ceiling-panel-devices](ceiling-panel-devices.json)：同核心、版本链路上的原铝扣板、排版起点／角度、浴霸与筒灯开孔复验。
- [portable-smoke](portable-smoke.json)：HTTP／离线file://加载、缓存刷新、撤销／重做及生产3D。

已目视检查[桌面接缝与H形卡槽](http-editor.png)、[390px](http-mobile.png)。首轮交互发现相邻上下翼点在缩小显示时重叠命中，已增加最近点选择及源／目标阶段命中过滤；取消平移不经SVGRect的Float32中转，直接使用viewBox文本。浏览器对鼠标及SVGPointList有像素／Float32精度限制，验收读取真实事件投影和原始points字符串，不把屏幕取整误判为数据漂移。卡槽入口改为默认展开，便于直接发现。

未运行全量check、实机触屏、跨GPU或施工安装验证。两点贴合是一次定位，不建立永久绑定；目标为边线时沿线位置受鼠标分辨率影响，法向贴合与选中点一致，放大可提高选点精度。39／22.5／13.6／18.6 mm来自用户图，H形小尺寸为可编辑示意，不作厂家加工或承托要求；多槽型材端板仍需唯一槽口，否则保留待核对。
