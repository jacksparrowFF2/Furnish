# 飘窗板材验收 · 2026-10-31

范围：新增独立石英石窗台板、三／四面木制包套。采用定制参数化板件路线；不是某个固定成品型号。参数、坐标和保存契约见[说明](../../WINDOW-LINING.md)。

## 参考解读与视觉复核

三份用户原图已实际打开，来源、字节数和SHA256见[asset.json](../../../assets/models/window-lining/asset.json)。照片未提供尺寸，所有初值只是布局假设。

| 特征 | 参考与局部 | 实现与未知 |
|---|---|---|
| 窗洞内侧有实际进深，石材板独立铺在下方 | 图1、图2；[接角局部](reference-crops/stone-wood-joint.png)，原像素框(80,300,440,250) | 左右立板与顶板，另加石板；缝宽、封边、安装固定方式未知 |
| 四面木饰面围合，中间是实际开口 | 图3；[顶部局部](reference-crops/surround-header.png)，原像素框(30,110,695,120) | 四块独立板，横板通长、侧板夹在横板之间；无背板 |
| 石材无下挂、耳朵；外侧收边较窄 | 图1文字及近景；图3外缘 | 直板不另加下挂／耳朵；本次不建型材脱缝、收边线或五金，不能据此出施工节点 |

本次为通用板件功能，用户已确认结构而未要求匹配某个照片尺寸。按影响裁剪固定产品视觉流程：照片相机匹配、逐轮改造旧有效资产不适用；灰模独立阶段和材质A/B未执行，不追认完成。实际查看生产构造器渲染的开口、侧板进深、顶部接角及两种底面材质，结构与基本材质展示执行者复核通过。未宣称还原具体木纹、石英石花色、胶缝或图3的收边线。

[同机位结构对照](production-models.png)：生产builder直接生成三面＋石材及四面木套；透视35°、camera=(2.7,2.35,3.6)m、lookAt=(0,1.35,0)m、单幅600×520。半球光强2、方向光强3、方向光位置(-2,5,4)m；同环境、同颜色空间sRGB。这是两种配置对照，不是改造前后图，也未声称复现原照片未知布光。实际主场景材质、界面和两个入口另见[桌面3D](desktop-scene.png)、[离线3D](file-scene.png)、[桌面属性](desktop-properties.png)、[窄屏](desktop-narrow.png)。

## 通过项

- `tests/test-window-lining.cjs`：实际Three生产外包、逐板厚度与法线、三／四面缓存切换、空洞／贴边／0.1mm穿板、0/37/90°旋转及镜像、未知高度、包含／外部距离、内部六向净距；尺寸修改保留板厚，复制／替换、命名方案／v42项目／工作区／缓存往返和三次恢复无漂移。图例可在缺省参数下生成。
- 关联增量回归：`test-product-rules`、`test-project`、`test-project-validation`、`test-project-recovery`、`test-workspace-cache`、`test-repository-version-compat`、`test-replacement`、`test-furniture-replacement`、`test-catalog-navigation`、`test-pipebox`、`test-furniture-solids-cache`、`test-enclosed-boundary-distances`、`test-model-pipeline`。目录全包含回归纳入112类×8组变换，缓存回归428次新构造对照。
- 同一打包EXE，在`output/window-lining-verification/workspace`、独立缓存和随机端口运行；正式外置文件只复制不修改。实际addItem分开添加、表单切换三／四面、键盘撤销重做、浮动尺寸表单、板厚／离地／颜色、锁定与非法输入、保存刷新、390px布局、HTTP共享文件、断网file三维及生产GLB均通过，无页面异常。详见[结果JSON](results.json)。
- Blender 5.2.3 LTS，实际程序`C:/Users/SPH/scoop/apps/blender/current/blender.exe`独立后台回读：桌面三面＋石板4件、file四面4件，家具ID＋板件键唯一、逐板尺寸及绝对标高、非退化面、对象材质槽均通过。[逐板结果](blender-readback.json)。没有修改用户正在打开的Blender工程。
- 原外置文件SHA256：`07551bc7d643752d08a78e1775f3d1734c2cd8fcfc820de1bb188a170bdddced`，验收前后一致。仓库内已有`projects/workspace.furnish.json`用户修改保留，不纳入提交。
- 15份改动JS/CJS和入口内联ES模块语法、13个新增文档本地链接检查通过；生产源码及双入口GLB的[哈希](source-hashes.json)已归档。资产导航按本次提交范围生成，排除另一个对话尚未发布的椅子试作源文件。

专项入口：`node scripts/verify/verify-window-lining.cjs <源工作区路径>`；随后用独立Blender执行`--background --factory-startup --python scripts/verify/readback-window-lining.py -- output/window-lining-verification`。本机GLB与日志留在该output目录，报告及截图已归档在本目录。

## 边界与未执行

未运行全量check、全部配置GPU整链路、施工固定／防水／耐候／承重核对。参数化模型无独立作者BLEND或离线网格资产，固定型号作者预检／发布校验不适用；实际生产GLB已回读。未将构件自动绑定窗口、自动切墙或推断安装缝，仍使用原家具放置和空间核对规则。标准材质只是外观表达，不证明材料真实性能。

验收中发现的二维局部变量遮蔽已修正，并加实际SVG调用回归；早期验收脚本曾替换主页面DOM引发计时器错误，现用独立iframe展示对照图，最终运行无页面异常。
