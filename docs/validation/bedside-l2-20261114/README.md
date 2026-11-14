# 1601 L2床头柔光 · 2026-11-14

本目录记录定制参数化反射灯槽、v91预览参数和方案C的实际生产验收。原方案B保留。具体模型假设与未确认参数见[契约](../../COVE-LIGHT.md)。

Node专项已通过18种高度／旋转／镜像下的实际Three顶点与数值实体、向上发光面／光度单位／关闭与隐藏、GLB无重复替身、v91反复恢复／替换与空间确认输入范围。HTTP/file、桌面UI和最终实际出图记录见下文。

## 参数化整链路

[report](report.json)记录geometry-state、HTTP/file正式GLB、Blender逐部件边界／材料回读、studio生产导出、front／oblique／back三机位实际Cycles和下载BLEND重开均通过。作者预检／资产发布不适用于本定制参数化部件，没有声称新增易来官方Blender资产。已实际打开[斜视](channel-oblique.png)与[正面](channel-front.png)，可见窄长铝槽；壁厚与端盖仍为方案估算。

最初HTTP生产验证发现新SVG分支引用尚未初始化的x/y，已改为明确的局部坐标，并增加实际SVG调用断言；失败记录留在本机selection-iJhMQM，之后selection-KorC23整链路通过。该管线快照早于独立床头开关标记，几何未再改变；独立开关／隐藏和最终UI／高清预览另按最终源码专项复验，不将早期管线指纹冒称最终指纹。最终关键代码哈希见[hashes](hashes.json)。

## 光学与空间边界

实际Three射线验证：从前方三种眼高看向光面，前挡板或底板先遮挡；从上方可见真实向上发光面。此项只证明所测模型方向与截面遮挡，不代替实物卧姿与漫反射眩光测量。两处灯槽当前空间核对issues=[]；没有自动标记确认，没有据未知厂家型材或安装条件宣称施工通过。

方案C的[应用记录](application.json)对比原方案B：原有183件保留在B；C新增2灯槽、移除3旧阅读灯占位，原有其余家具属性无变化。只改场景为夜景／顶灯关闭；原床、床头柜、窗帘、主灯及起夜灯位置保持。

## 增量验证范围

专项cove-light、desk-lamp、lighting-preview、product-rules、work-state、workspace-cache、furniture-production-solids、catalog-navigation、repository-startup-validation、repository-version-compat与资产索引检查通过。未运行全量check，未做现场照度／真实米家驱动或低亮频闪测试。

## 应用入口与捕获时序

[HTTP/file UI记录](http-file-ui.json)覆盖实际属性面板亮度／色温、undo／redo、保存／刷新与生产发光面。首次桌面已完成主卧1200px/128spp，但第二机位调用快照时被场景修订保护拒绝；未绕过保护或篡改快照。捕获脚本改为等待公共highQualitySignature连续稳定，再导出并开启预览，原生产失效保护保持。

最终两机位1920px/1024spp出图采用同一夜景、曝光10与预览30%；源记录包含全部真实灯光：2个向上面源与6处低位夜灯采样，未混入关闭的主灯／吊顶灯带。不是AI生成图，也没有在图像导出后调色或增亮。最终桌面结果与图片见下方完成记录。

## 最终结果

[桌面结果](result.json)通过；隔离EXE项目／缓存／端口与正式目录分离，验证运行前后正式文件哈希一致。主卧[高清](main-bedside.png)1920×1079/1024spp、120.8秒；老人房[高清](elder-bedside.png)同分辨率／采样、109.1秒。两图均实际打开目视：床头墙有连续上洗暖白光带，床头板与两侧空间保留，未看到裸露点状灯珠。此为执行者目视，用户尚未确认方案观感。

保留原方案B，正式方案C保存成功；两灯槽当前MCP空间核对无问题，未自动确认。源码收尾保留原有projects/workspace.furnish.json修改及历史工作树。
