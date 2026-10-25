# 平顶共面、仰视与二维梁参考增量验收

2026-10-25：11组Node回归通过：ceiling-coplanar、ceilings、ceiling-assembly、ceiling-regions、ceiling-corners、ceiling-continuous-light、ceiling-end-caps、navigation-input、scene-observation、blender-model-identities、beam-heights。新生产用例验证flat材质深度优先、实际板底2400／板顶2412 mm、明确和按原顶梁厚派生的梁同底、截面材质不偏移、剖切和项目往返。旧beam-heights的缓存夹具缺state.furniture，补齐空数组后恢复生产几何／缓存验证。6个变化JS文件语法通过，相关差异检查通过；入口内联脚本由真实浏览器加载验收。

只读实际方案：走廊平顶2400×12 mm，与两根梁的平面交叠约253708和268057 mm²；两根梁按原顶2700和保存厚300 mm显示，底面同为2400 mm。没有写入用户workspace，也未推定新的梁实测高度。

HTTP与断网file://五套专项通过：

- [共面及相机](camera-browser.json)：同一正式生产平顶分别关闭／开启深度优先，三处斜视梁色干扰像素780→1、1474→2、955→1，剩余像素位于轮廓边缘；正式主场景鼠标从水平线继续仰视、反向俯视、俯视预设、390px与项目无改动通过。完整数值见[pixels.json](pixels.json)。
- [二维梁参考](beam-reference-browser.json)：有效方案毫米轮廓、两个梁范围与高度、推算标识、覆盖吊顶填充且不拦截拖动、保存撤销刷新和实际项目往返、390px字号通过。
- [观察剖切及原梁编辑](regression-browser.json)：旧观察定位、漫游／环绕切换和梁高度编辑专项复验。
- [原顶点与边界](boundary-browser.json)：原顶点增删、拖动、吸附及保存往返复验。

已目视检查[深度对比的修正结果](depth-fixed.png)、[主场景仰视](corridor-up.png)、[梁参考桌面](beams-editor.png)、[梁参考390px](beams-mobile.png)。浏览器全在隔离副本运行，夹具为合成走廊，不携带实际用户完整方案。

未运行全量检查、实机触屏或不同GPU的人工复验。负polygonOffset只改变WebGL栅格深度优先，不改变生产网格，不布尔裁除梁板体积交叠，也不表示施工无冲突。二维梁高按同一beamVertical规则读取，推算或未知状态不补写实测值；没有新持久字段或格式版本。
