# 预览测试修复与独立柜箱完整复验

2026-11-11。用户要求修好两项预览测试，区分夹具错误与实际缺陷，并复验完整独立编辑流程。

## 根因分别确认

1. **两项最初报错来自夹具。** `test-cabinet-preview.cjs` 与 `test-kitchen-preview.cjs` 的模拟Element缺少浏览器实际提供的 `dataset`。补齐后又发现VM没有注入预览依赖的Kitchen／CabinetAssembly等真实共享核心。补齐DOM接口和入口依赖后，原有层板／隔板射线、拖动限位、取消、逐门扇、相机、尺寸显示、烟机不进入柜体预览及清理断言全部通过，没有删除或放宽原断言，也没有给生产代码增加忽略异常的回退。
2. **扩展真实操作后另发现实际缺陷。** 生产组件层板同时保留 `cabinetBuilder` 稳定组件身份和旧 `kitchenShelf` 别名。`cabinet-preview.tag()` 的旧捕获监听先取走该层板，导致组件手势的start／move／end未执行。隔离浏览器的1100mm层板拖动没有正确提交，一次撤销退回了此前数值编辑之前的1198mm；公开组件回调轨迹为空。
3. **修复实际路由而非仅修测试。** 带组件身份的厨房网格由既有组件手势处理；旧层板入口不再接管。普通旧柜与旧厨房仍沿原入口。没有改变生产几何、持久字段、项目格式或加载机制，当前独立柜箱v83契约保持。

厨房测试夹具新增真实需要的classList、捕获监听顺序、stopImmediatePropagation和指针捕获接口，以真实Three网格／相机／射线执行现代组件回归。它仍只模拟轻量DOM和Renderer，不替代真实浏览器验收。

## 负例证明

以本次开始时的 `e98325bf` 为固定历史版本：

- 两个原始测试夹具配当前生产脚本，均复现builderSelection处的dataset TypeError。
- 修好的夹具及新增组件断言配历史生产脚本，会在“真实组件射线必须保留稳定组件身份”的断言失败，证明现代组件回归能检出真实缺陷。
- 当前夹具配修复后的生产脚本，两项测试均通过。

负例加载只在子进程内替换读取内容，不覆盖工作区文件。[负例结果](negative-controls.json)保留历史来源与预期失败信息。

## 通过项

- 两项预览测试完整通过。现代组件额外覆盖镜像／非镜像、1720mm自身高与120mm独立离地、真实射线命中、start→move→end一次提交、旧回调拒绝、轨道控制不截获、pointercancel／Escape／丢失捕获精确恢复、Shift方向键1mm微调；台面及邻柜高度保持。
- HTTP、断网file、同一正式打包EXE的独立缓存／端口／源码与正式项目副本，均通过完整独立柜箱流程：高度870→1720，台面保留；调整台面至960不回写柜箱；层板数值编辑／真实鼠标拖动／Escape取消／一次撤销／移除；柜箱500×750×720、离地120、左右及前后偏移；原柜箱移除、草稿撤销重做、恢复；原上柜超出旧台面占地；390px窄屏；应用撤销重做、保存、刷新与重开。真实洗衣机数据不变。
- 相邻空柜箱拖放、绿色安装预览及洗衣区编辑保存另以HTTP／离线file／隔离桌面三入口复验通过，见[洗衣区结果](laundry-ui-results.json)；完整输出位于 `output/desktop-verification/laundry-carcass-pL8dwP/`。
- 每种入口的公开组件回调均记录两次start、一次cancel、一次end，无运行时错误；[逐项结果](ui-results.json)及[手势轨迹](desktop-component-gestures.json)随文档保留。
- 正式生产GLB按家具ID＋部件键核对整组柜体、水槽、台面及附属柜；Blender5.2.3 LTS独立回读32件部件，最大世界边界差约0.000389mm。[回读与哈希](blender-readback.json)。
- 相关增量回归：cabinet-component-edit（120组配置／144个刚性网格）、cabinet-builder-editing、cabinet-horizontal-editing（108块板件）、cabinet-placement-parity和cabinet-native-independence通过。未运行全量 `scripts/check.cjs`。

完整独立编辑证据目录：`output/desktop-verification/cabinet-native-independent-0aRlCW/`。真实DOM／WebGL检查与执行者看图确认：柜箱保持1720mm，层板拖动位置与属性一致，台面不随之升高；在后续独立离地／尺寸配置与刷新后斜视中仍一致。

[真实组件层板拖动](shelf-pointer.png) · [独立高度／台面](height-1720.png) · [刷新后斜视](restored-oblique.png) · [源码指纹](source-sha256.json)

正式窗口没有编辑或刷新，正式项目只复制用于隔离验证并核对源文件哈希；已有未提交方案保留。与插件任务仅协调文件归属与Git收尾，互不提交对方成果。
