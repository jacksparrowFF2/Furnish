# 凹入式飘窗窗上墙体 · 2026-10-31

用户要求：次卧按主卧做法加石材板与三面木套；依据[现场照片](reference.png)补齐两处飘窗上方墙体，并直接修复建筑生成规则。照片已实际打开，箭头对应窗洞顶到房顶之间的实体及整个窗洞进深。照片没有尺寸；本次尺寸取当前方案已有建筑参数，不推断承重属性或构造配筋。原图和关键截图哈希见[记录](hashes.json)。

## 当前方案操作

保持当前`主卧布局改进`（`dmvv767tf`），专用MCP先读planId/revision后按实际洞口调整新增构件；MCP未提供新增／离地／形式编辑的部分通过正式桌面UI完成，沿原撤销和保存流程。次卧石材板1471×718×20 mm、底距完成地面587；三面木套1471×718×1637 mm、板厚18、底距完成地面607。原台面647、地面完成层60、石板顶667、窗顶2304，换算无重复抬高。保留主卧原两件及其它家具，总数73。正式文件已保存至D盘原位置；本次测试始终在其复制件运行，未将测试编辑写回正式文件。

## 修复范围与依据

原代码只在窗框薄墙范围填充窗顶以上，遗漏台体整个进深上方。新增共用派生几何和生产构造器；空间墙体共用高度范围，避免低家具误判、上方穿墙漏判。不补写草稿／基线／命名方案，不改墙体平面、窗洞宽高、原台体或家具记录。房顶从邻室建筑标高读取；缺少高度不猜造。新空间上下文仅影响含本类窗上墙体的确认。

## 已通过

- `test-bay-upper-walls`：生产Three几何宽深及底顶；左右／上下轴、反向；邻室房顶优先、未知房顶、倒置排除；精确接触与0.1mm穿入、未知家具高；空间派生幂等、开窗高度变化、确认更新与纯配色保持；实际建筑当前／命名方案往返且版本保持v16。
- 关联增量：`test-bay-windows`、`test-recessed-bay-windows`、`test-bay-assemblies`、`test-bay-editing`、`test-window-lining`、`test-beam-body-collisions`、`test-product-rules`、`test-wall-finishes`、`test-spatial-review-cache`、`test-room-ceiling-height`、`test-ceiling-height`、`test-beam-heights`、`test-project-validation`。未运行全量check。
- 同一打包EXE，独立源码／设计／缓存／端口；实际加载两处墙体、三维与定位、刷新保持。另验HTTP与断网file，三入口生产GLB均导出两件唯一稳定身份的窗上墙体。正式源文件哈希保持。详见[结果](results.json)。[主卧桌面](desktop-0.png)、[次卧桌面](desktop-1.png)、[主卧HTTP](http-0.png)、[次卧HTTP](http-1.png)、[主卧离线](file-0.png)、[次卧离线](file-1.png)已实际目视复核，可见窗上部分连续封闭，开口保留。次卧自动定位机位左侧受现有柜体遮挡，截图不作为其全部表面的无遮挡验收；完整进深、标高及木套顶部接触另由生产几何与Blender回读核对。
- Blender 5.2.3 LTS独立后台回读三个实际生产GLB中的墙体节点，保留原二进制、网格引用和世界变换；共6件的尺寸、底顶标高、对象材质槽、非退化面通过。见[回读](blender-readback.json)。程序使用Scoop `current/blender.exe`，不改正在打开的Blender工程。
- `test-model-assets`修正新窗套档案加入后的历史硬编码总数：保留原39档案及原130图覆盖，单独核对窗套两type／3图，总数与实际清单一致，仍逐份校验哈希／来源／缺失资料及错误输入。

复现：`node tests/test-bay-upper-walls.cjs`；`node scripts/verify/verify-bay-upper-walls.cjs <源工作区路径>`；用Blender执行`--background --factory-startup --python-exit-code 1 --python scripts/verify/readback-bay-upper-walls.py -- <该轮output目录>`。本次实际整屋GLB约93 MB，测试使用分块传输；此前将整屋二进制展开为JS数组的验收脚本导致页面关闭，现已修正。离线测试只保存当前工作区快照，避免多方案缓存超过浏览器配额；不删改原方案。

## 未执行与边界

未运行全量、全部固定产品GPU流程、施工结构核验或墙上涂层／砖材数量重算。派生窗上墙体沿已有建筑净高，不把吊顶表面当作结构顶；未新增梁字段。与原窗体渲染相同，普通窗框薄墙部分仍由原入口负责，新构造只补原台体进深范围，避免重复几何。本轮不扩展MCP工具集。
