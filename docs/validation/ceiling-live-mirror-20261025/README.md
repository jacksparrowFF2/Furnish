# 独立截面实时刷新、尺寸图与镜像增量验收

2026-10-25：21组Node回归通过：tests/test-ceiling*／test-ceilings及project、project-validation、project-recovery、repository-workspace、repository-storage、workspace-cache。新增test-ceiling-mirror-dimensions核对左右／上下镜像的实际顶点、柔光板及灯带多边形和发光方向，旋转后镜像、再旋转和尺寸重建、四项实际尺寸长度、反射两次还原、原点附近上下镜像、水平翼边保护、生产Three.js网格包络与有限法线，v20当前／命名方案／仓库／缓存四次恢复无漂移。最后补充原点镜像条件后复验新用例及原assembly通过。

九套浏览器均通过HTTP与断网file://：

- [ceiling-live](ceiling-live.json)：组合／独立四项39／22.5／13.6／18.6 mm尺寸；参数自动改为45 mm；固定5.6／8px节点在滚轮缩放与390px不放大；坐标输入不点更新即改几何，已打开生产预览收到同一节点并复用canvas；空值保留原文及上次几何；鼠标按住时几何已更新、Esc恢复；自绘左右镜像两次还原、上下镜像实时3D；v20一次撤销／重做、刷新、实际导出／导入；返回主工作区再取消不改已保存数据；窄屏尺寸文字无裁切。
- [原独立编辑](ceilings.json)：自绘轮廓、路径／发光／平顶固定、厚度覆盖、生产像素、精确输入、应用／撤销／恢复／项目往返及窄屏。旧验收的“第一次应用只更新输入”步骤改为等待自动预览；采用现在可一次提交。
- [原组合](ceiling-assembly.json)：实际生产尺寸／柔光板／中央板、参数独立与空值保留、原观察方向、v18精确恢复及项目往返。
- [原鼠标交互](ceiling-section-interaction.json)：增删点、旋转、拖动、取消、原v19缓存恢复。
- [端板](ceiling-end-caps.json)、[连续灯带](ceiling-continuous-light.json)、[转角](ceiling-corners.json)、[主设计工作区](ceiling-design.json)：按原几何与保存链路回归，更新自动预览等待与新标题。
- [加载与基本保存](portable-smoke.json)：HTTP及离线file://、缓存刷新、撤销／重做和正式3D。

目视检查[参数化四项尺寸](http-dimensions.png)、[自绘镜像与实时预览](http-editor.png)、[390px](http-mobile.png)。首次旧流程回归发现双轴吸附会压扁短边，已改为只吸附较近的一轴；首轮新专项发现关闭平顶仍校验失效参照，已修正并加入核心与真实返回链路验证。其余初次失败为SVG文本选择／多元素定位及旧测试交互步骤，修正后通过。

所有浏览器在私有副本运行，不写用户workspace。未运行全量check、实机触屏、跨GPU人工复验或施工安装验证。自绘槽口宽等隐藏结构不推定，改顶点后只标真实包络；镜像姿态不代表有效承托，启用中央板时仍需有效连接。手动缩放可裁掉几何，但尺寸文字约束在图框内；文字可能在极小比例时靠近几何。
