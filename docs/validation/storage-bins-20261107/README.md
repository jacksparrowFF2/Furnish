# 懒角落七款固定收纳盒：参考与验收

2026-11-07，执行者为本次Codex会话。新建七款白色ABS直角空盒，用户明确先做7款固定尺寸，伸缩款待补资料；上一有效版本不适用。原始输入、源工程和GLB全部保留，未改正式方案。

## 参考解读

原图实际打开：附件1规格/材质、附件2柜内排列照片、附件3深柜大号尺寸/近景。每款资料档案 `assets/models/<profile>/asset.json` 保存原图路径、SHA256、字节数与来源；全部沿用原始PNG字节。京东连接器读取SKU100259402044，名称/品牌/货号7107126；Chrome实际页面进一步确认全部7款选项，组合装是既有深柜大/中号数量组合。动态价格不写入未逐规格核实的库价格。

| 特征 | 观察与依据 | 对应部件/实现 | 未知/简化 |
|---|---|---|---|
| 外包 | 深柜大号图标20cm宽、28cm深、15cm高；其它6款选项标注 | 各款独立W/H/D；尺寸见型号文档 | 手测误差约0.5cm，仅该图注，非精密公差 |
| U口 | 前面中央低沿、两侧立边、低口内角圆滑；照片估算 | front-u-wall真实非凸轮廓、真实厚度，低沿60mm、立边14mm、低口圆角8mm | U口尺寸无厂家标注 |
| 顶部/内腔 | 顶部敞开，可看到内壁和底部 | base、left/right/back-wall；真实开口，射线穿过U口后命中后壁 | 2.5mm壁厚、3mm底板为外观估算；不认证容积 |
| 塑料 | 附件1标ABS，附件2/3白色柔和反射 | 近白主色#eeefeb、粗糙度0.42、金属度0；支持原配色 | 未实测光学参数；微纹理/底部隐藏筋脚不编造 |
| 连续外角 | 参考正面外角与前侧连接圆滑 | 小倒角和独立薄壁几何 | 外部大圆角、注塑一体连接/接缝以布局近似保留，非照片级复制 |

原图局部：[深柜大号](reference-detail.png)，来自附件3原图像素框(375,295,470,330)。模型局部为640²阶段图框(95,155,445,335)：[灰模](clay-detail.png)、[材质](material-detail.png)。照片内杂物/橱柜只作参考，本模型不包含。

## 相机与阶段

独立后台Scoop `C:/Users/SPH/scoop/apps/blender/current/blender.exe`，实际5.2.3 LTS；作者EEVEE阶段图640²。Blender坐标X/-Z/Y换算Furnish X/Y/Z，原点在底部。正交相机位置 `(span*1.15,-span*2.5,H*.5+span*.65)`，目标(0,0,H/2)，正交跨度span*1.65，span=max(W,H,D)。两盏0.8m面积光，位置(-.8,-.8,1)/( .7,.2,.8)、90/70W，世界灰0.35、AgX、曝光0。照片未知焦距与灯光，只近似匹配可见侧面与俯角，不声称摄影标定一致。

| 阶段 | 实际看图/结果 | 结论 |
|---|---|---|
| 轮廓初版 | [七款灰模](clay-all-seven.png)：宽窄/深浅、150mm高度比例、前低后高正确 | 执行者通过布局轮廓；外大圆角简化已明示 |
| 结构初版 | 灰模全图和局部打开，内壁/底板/真实U口可见；数值射线验证开口 | 执行者通过；没有制造假前后修订证据 |
| 材质 | 同一几何/相机/光照从灰色覆盖材质切换近白ABS，[七款PBR](material-all-seven.png) | 执行者通过近似白色塑料；非实测质感 |
| 正式生产 | [七款斜视](production-all-seven.png)、[正面](production-front-all-seven.png)、[背面](production-back-all-seven.png)，逐张来自正式生产GLB与基础渲染API | 三方向实际打开；五件部件、U口、内外壁和白色保留 |

本次识别差异限于三项：外角比照片更直、底板连接线可见、照片中不明底部结构省略。未靠改变已知尺寸贴合单张透视图。独立作者图和正式API图的机位/光照不同，各自成组，不把二者当同光材质A/B。七款联系表分别自动取景，卡片不是统一物理比例尺。用户尚未作视觉确认。

## 技术验证

七款完整入口：`node scripts/verify/verify-model-pipeline.cjs storage-bin-shallow-large,storage-bin-deep-medium,storage-bin-deep-large,storage-bin-deeper-medium,storage-bin-deeper-large,storage-bin-ultradeep-medium,storage-bin-ultradeep-large gpu`。

批次 `output/model-pipeline/selection-xaNlY5/batch.json` 全部通过且源资产/方案哈希未变化。归档[逐阶段摘要](pipeline-summary.json)。每款实际执行作者预检、源工程故障注入拒绝、独立GLB发布、尺寸/空间/状态、HTTP与断网file生产导出、Blender逐部件回读、正式API三机位GPU渲染、下载工程重开。请求gpu、实际OPTIX/NVIDIA GeForce RTX 4070 Ti SUPER，无CPU回退。正式相机model-studio-v2、36°、512²、固定2000lux主光/AgX/曝光0。无需门/铰轴/活动端态验证，静态盒没有运动机构。

定向测试通过：test-storage-bins、test-storage-supplies、test-beverage-cans、test-inventory-array、test-workspace-cache、test-product-rules、test-project、test-project-validation、test-repository-workspace、test-repository-version-compat；19个变更JS/新离线资产语法检查和资产索引检查通过。未运行全量check.cjs。

新测试覆盖7款真实开口射线/非退化三角形、实际生产尺寸/离地0/68/1400、非标缩放、旋转/镜像、外部间隔/包含/局部穿入/高度分离/柜体层板穿入、17件多层错位阵列/转向/三向间距/拒绝非法值、复制新身份/解除保留位置、当前与命名项目v68、重复恢复无漂移。通用收纳物测试的容纳柜深按物品深度+50mm派生，避免以350mm柜体断言450mm深盒应完整放入。

共享版本67由同期柜体任务使用；本任务显式阵列68判定放在其前。仅关联元数据不改变旧空间语义；真实阵列位置变化正常触发原缓存/确认。单件v57、pose3D v58保持。

## 三入口界面

最终三入口UI全部通过，[报告](ui-report.json)；桌面/HTTP/断网file每个入口逐款执行7款相同检查，脚本 `tests/test-storage-bins-ui.cjs`。桌面沿同一打包EXE、独立源码/缓存/端口运行；每款12件、两层/两排/三列，离地900mm，逐件60个生产部件；原正式JSON保持。

初轮UI专用检查误沿用了易拉罐印刷数量断言，导致0与12比较失败；已将测试改为盒体真实部件/独立ID，不改模型或放宽生产几何检查。失败现场 `output/playwright/storage-bins-ui-1ztmse` 保留。

## 边界

通过范围是软件生产尺寸、保守空间、数据与近似视觉。未执行厂家净空/容积、ABS壁厚实测、堆码承重/套叠稳定性和伸缩机构；没有新增空腔/同阵列碰撞豁免。前U壁凹口仍可能被部件凸包保守覆盖；二维矩形不是箱内净空承诺。成功隔离工作副本按原工具清理，失败/调试目录保留。

额外在无建筑遮挡的隔离生产场景补拍7款各12件阵列，[深柜大号](deep-large-array.png)、[超深中号](ultradeep-medium-array.png)，每组实际导出60件部件/12个独立家具ID。UI流程原有方案墙体会遮挡模型，流程截图仅用于面板与保存验证；不把遮挡图当作模型外观验收。[桌面420px](desktop-narrow.png)、[HTTP420px](http-narrow.png)、[离线420px](file-narrow.png)已实际查看/归档。
`nHTTP入口为只读静态测试服务，页面“保存服务未就绪”提示属该夹具预期，验证的是恢复缓存刷新；桌面验证真实隔离文件保存，file验证本机恢复缓存。未把静态服务当作已验证正式HTTP文件写入。
