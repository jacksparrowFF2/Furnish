# 转角书柜专项验收 · 2026-10-31

[产品与边界](../../CORNER-BOOKCASE-YESWOOD-Y00Y06.md) · [用户标注图](dimensions-reference.png) · [网页型号与源哈希](source.json)

[斜视](http-angle.png) · [正面](http-front.png) · [侧面](http-end.png) · [背侧](http-rear.png) · [390px断网预览](file-narrow.png)。上述截图已目视对照：五层、L形凹口、左右交错端挡与两面背板一致；木色、木纹、4mm边缘与隐藏结构仍为模型近似。窄屏标题／视角按钮与模型保持间隔。

[浏览器结果](summary.json)：真实Chrome在私有副本测试HTTP与断网file://，新增库条目、改尺寸、撤销重做、刷新恢复、正式3D及生产GLB导出14个稳定部件、窄屏、零页面异常／零外网请求。原用户workspace文件未写入。

[Blender结果](blender-summary.json)：实际5.2.3 LTS，14件源网格闭合、正体积，HTTP/file生产GLB回读保留非标2100mm总高及20mm板厚，缺件与同包络填实L缺角均拒绝发布且保留旧资产，源blend可重开。

Node增量入口共9个通过：test-corner-bookcase、test-product-rules、test-catalog-browsing、test-catalog-navigation、test-catalog-links、test-enclosed-boundary-distances、test-cabinet-interior-distances、test-bookcase-y52y09、test-blender-bookcase-asset。详细新模型边界见专项测试源。另检查改动JS/CJS语法与git diff --check。

初次后台Blender／Chrome受沙箱执行与回环网络限制，切换获准的本机后台执行后通过。首次Blender回读已完成但结果文件回执路径不一致，包装器报超时；修正回执后完整复跑通过。首次窄屏发现标题按钮覆盖模型顶部，调整取景并完整复跑HTTP/file后通过。

未运行全量check.cjs、实机触屏、厂家加工／承重与安装验证；未增加通用柜体结构编辑或陈设。L板空间片是保守矩形分解，圆边可能保守告警，不把包络边距当内腔许可。
