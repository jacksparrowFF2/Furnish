# 厨房新增柜箱台面生成完整验收

2026-11-12。修复前[审计](../kitchen-added-worktop-audit-20261112/README.md)确认新增柜箱有实体但没有台面，入口／核心仅支持洗衣柜。本次核心提交deb20e2c补齐普通一字/L/U厨房入口、各向出挑、显式轮廓v87、单次历史及恢复。旧审计的acceptance:false不是本次验收结果。

## 实现与兼容

`worktopSupports`共用实际同顶高柜箱／承托范围，按柜箱局部正面补原配置台面总深与柜深差，再旋转合并；后沿与侧沿不自动加挑。普通厨房存kitchen.worktop，洗衣柜保持laundry.worktop，旧缺失不补写。重建从原默认主台面及当前柜箱计算，不把旧生成或手动延伸作为基底，相同结果不新增撤销步。断开／围成内孔的组合、锁定／吊柜及非法顶点原子拒绝，错误不改变原草稿。

Kitchen.outline/topGeometry/slabGeometry/frontEdges读取统一轮廓；2D、实体、石材、下挂／反收／斜切及GLB同源，原水槽／灶孔、高柜和障碍切口继续扣除。分边正视投影整组实际轮廓并按该边范围裁剪，同时修正单原柜箱边的镜像回退方向。柜箱和主柜尺寸位置不随台面拉伸。显式新字段最低v87由product-rules集中声明，当前／命名／组件库与仓库版本检测同源，历史项目与缓存保留，无新保存或撤销通道。见[完整契约](../../KITCHEN-DESIGN.md#按柜箱轮廓生成厨房台面2026-11-12)。

## 自动与生产验证

- `test-kitchen-added-worktop.cjs`：96组覆盖一字1边、L2边、U3边，左右转角、宿主0/37/90/270度、镜像和U形不等柜深。每组4种边型，共384个生产构造配置。以实际石材射线核对原配置30mm前挑（29mm处有石材、31mm处无）、后沿无额外石材、各向下挂中心和正视分图；不以总包络代替实体。重复5次完全一致，原模块／安装输入不变，项目／命名／组件库／仓库／缓存及重复恢复无漂移，旧缺失不升v87。另验证水槽／高柜真实扣孔、关闭／偏高偏低柜箱、锁定及非法／不连续轮廓；虚拟框沿原阳台核心回归。
- 新fixture读取柜深剖面的实际台面端点，避免把U形较短回折边误放到较长边的包络端点，或把L转角块误当作端柜而制造假空隙。曾出现的夹具连通性／版本期望错误均修正后重跑，没有放宽生产规则。
- [三入口结果](ui-results.json)：HTTP、断网file、同一打包EXE各操作六个边，18条完整流程通过。实点入口、编辑新增箱宽度、生产预览射线、连续生成3次、单次撤销回旧轮廓、重做、保存、应用撤销重做、刷新、2D新增箱及重开再生成／取消全程验证。执行者实际查看[一字](straight.png)、[L转角](L-turn.png)、[L镜像分边正视](L-front.png)、[U回折](U-return.png)与[U刷新2D](U-restored-2d.png)。
- 六份正式场景GLB按家具ID＋稳定部件键与新构造器逐件核对世界边界，再由Blender5.2.3 LTS独立回读：一字28件、L各48件、U各68件，最大误差约0.000246mm，数量仅对应本次配置。报告：[一字](straight-run0-blender.json)、[L主边](L-run0-blender.json)、[L转角](L-run1-blender.json)、[U主边](U-run0-blender.json)、[U连接边](U-run1-blender.json)、[U回折](U-run2-blender.json)。
- 相关增量17项通过：kitchen-added-worktop、cabinet-worktop-generate、kitchen-worktop、kitchen-run-handles、cabinet-assembly-position、workspace-cache、repository-workspace、repository-version-compat、project、project-validation、kitchen-tall、laundry-comprehensive、cabinet-service-details、cabinet-native-independence、cabinet-worktop-facing、cabinet-assembly、cabinet-outer-grips。repository-version-compat初次回环被沙箱EACCES阻止，授权运行同一测试后通过。修改源语法及差异检查通过。原阳台laundry-carcass完整HTTP流程另过。

## 隔离与边界

正式窗口和正式方案没有被本次测试修改或刷新，用户projects/workspace.furnish.json未提交修改保留。测试使用独立源码、工作目录、缓存、项目和端口，运行器核对源项目文件前后哈希不变。运行还包含并行界面体验改善的区块，按文件归属分开提交；截图里的台面卡片／分栏布局来自并行UI工作。见[核心提交指纹及范围](committed-core-sha256.json)，运行器已自动移除一次性源码副本，未宣称保存完整运行时源码哈希。输出：output/desktop-verification/kitchen-added-worktop-TgO1m4，原阳台补验：laundry-carcass-TEnQ4m。

未跑全项目scripts/check.cjs，未穷举24箱任意拓扑。无孔连续直角轮廓、32顶点和6000mm范围约束保持，不能合并时提示调整而不填满空区；未新增石材承重、接缝、加工及悬挑支撑施工判断。
