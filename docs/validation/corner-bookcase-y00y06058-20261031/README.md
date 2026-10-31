# 0.58米转角书柜专项验收

型号与估算边界见[产品契约](../../CORNER-BOOKCASE-YESWOOD-Y00Y06058.md)。[网页规格图](../../../assets/models/corner-bookcase-580/references/product-page/dimensions-reference.avif)明确58×58×190 cm，参数表45 cm视为与该SKU不一致。只归档商品图片，不保存包含账户／地址信息的整页截图。

[生产预览斜视](http-angle.png) · [正面](http-front.png) · [390px断网预览](file-narrow.png)；标题与模型无覆盖、五层交替结构已目视。图内陈设未制作，20mm板厚、背板、底座、臂宽及木纹为估算。

正式API的GPU三机位已目视：[正面](studio-front.png)、[斜视](studio-oblique.png)、[背面](studio-back.png)。基础验收光照表达轮廓，非实物扫描或1601精修效果。

[隔离批次](pipeline-batch.json)只选择两款转角柜：[450报告](pipeline-450.json)、[580报告](pipeline-580.json)均通过。实际Blender 5.2.3 LTS，作者／错误工程预检、独立发布、空间与状态、HTTP及断网file正式生产导出、按家具ID+部件键逐片回读、GPU三机位、下载blend重开通过。sourceUnchanged为true，真实源资产与用户工作区未由验证批次修改。

[快速浏览器结果](summary.json)另验真实家具库点击新增、改尺寸／撤销重做／刷新与窄屏；[额外发布负例](blender-summary.json)验证缺件／同外包填实L形缺角拒绝并保留旧文件。无页面错误及外网资源请求。

Node增量：test-corner-bookcase-580、test-corner-bookcase、test-product-rules、test-catalog-browsing、test-catalog-navigation、test-enclosed-boundary-distances、test-cabinet-interior-distances、test-model-pipeline。整链路另运行两款test-model-profile-spatial。未运行check.cjs、其余89个模型配置、实机触屏及厂家承重／安装核对。
