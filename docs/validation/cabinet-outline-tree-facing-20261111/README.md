# 整组轮廓、结构树编号及镜像台面方向

2026-11-11。用户补充：新增柜箱2D已显示，但选中轮廓仍只框住原柜；结构树层级不清且编号与预览不匹配；镜像洗衣区选择左侧台面延伸却出现在右侧，并要求检查厨房同类问题。

## 修复

- product-rules.assemblyBounds的入口曾只允许kitchen.assembly，漏掉laundry.assembly／独立原柜及自定义台面。现在所有kitchen交由柜体共享核心判定是否有实际组合外包。原outline、显示尺寸及底／顶查询一起获得同一外包；没有改写原w/d、模块分配宽或台面基准，没有把外包当作实体碰撞豁免。2D总外包轮廓覆盖新增柜箱与台面延伸；原台面／厨房模块手柄仍沿其各自尺寸语义，不用整组外包反写原台面尺寸。
- 共用componentTree新增可选boxOffset，原生组合按与生产预览相同的模块顺序累计整组编号。右侧不再每个模块都从柜箱1起算；普通独立编辑器缺省仍从1开始。模块容器标为group，新增模块→柜箱→部件→开放区边界板的缩进与连接竖线；选择、拖动和稳定ID保持。
- 台面新增extendWorktopFacing命令边界：面对产品的左／右，按父镜像转换一次后调用原extendWorktop局部坐标求解器。保留旧核心API、已保存outline和顶点序号，不自动翻转旧方案。小平面图显示面对柜体的X坐标（向右为正），数值编辑及拖点转换回原局部X；Y仍向前。生产预览、实际台面与小图方向一致。
- 普通厨房台面和L／U外边手柄已有旋转／镜像换算，本次复验通过，没有把异形台面专用入口扩展成普通厨房新持久能力。

无新持久字段、版本、加载脚本或保存机制；全部编辑仍走父草稿历史与mutate。外包查询现在正确覆盖原保存组合，打开不移动结构；具体几何、板件及空间输入未替换为包络。

## 已通过

- 位置／轮廓专项16组旋转、镜像与柜箱自身转向：共享外包、显示宽深、选中局部轮廓包含新增柜箱，原台面w不变；项目打包往返、关闭模块和反复恢复，另含非洗衣厨房／吊柜附属柜。
- 新台面方向专项16组整组旋转0／37／90／270°、镜像／非镜像与左／右：面对柜体的正确侧延伸300mm，真实台面面积和生产实体、整组外包、模块不变、旧局部API不变、项目保存与恢复默认。
- 负例：固定历史product-rules入口不能通过新增外包断言；模拟旧UI直接调用局部延伸命令不能通过镜像方向断言。子进程读取，不覆盖工作区。[负例结果](negative-controls.json)。
- HTTP／断网file／同一正式EXE的独立项目与缓存：树与预览所有柜箱名一一一致且唯一；模块分组／部件缩进；真实拖放、反复改宽、前后位置与对齐；镜像左／右延伸及实际Three石材与原柜世界边界核对；小平面方向与数值X只换算一次；撤销还原全部柜箱，保存刷新保持台面无镜像漂移。2D实际选中polygon与显示总宽覆盖新增柜箱，真实点选、管道遮罩及窄屏继续通过。[逐项结果](ui-results.json)。
- 含镜像左延伸台面的整组正式生产GLB按家具ID＋部件键核对，再由Blender5.2.3 LTS后台独立回读42件部件，最大世界边界差约0.000389mm。[回读及哈希](blender-readback.json)。
- 增量回归：cabinet-assembly、cabinet-native-independence、cabinet-snapped-resize、cabinet-components（105模板／状态）、cabinet-placement-parity、cabinet-preview、kitchen-preview、furniture-svg（352组目录／主题）、canvas-render-cache、directional-kitchen-solids、kitchen、kitchen-wall-adjust、product-rules、kitchen-worktop、kitchen-run-handles，及修改JS语法／差异检查通过。未运行全量scripts/check.cjs。

执行者实际查看：[树与预览编号](tree-numbers.png)、[镜像左延伸](facing-left.png)、[2D整组外框与1854×820显示尺寸](whole-selection.png)。测试附属柜／台面外扩部分与原方案窗墙有重叠，因此保留遮挡和碰撞提示，没有为了验收移动正式方案或隐藏建筑层。树截图中的父模块名称与柜箱叶节点是不同层级，柜箱叶节点数字与预览对应。

完整输出output/desktop-verification/laundry-carcass-WZZ5Fl。正式窗口通过MCP只读确认当前方案、revision和D盘保存位置；未编辑或刷新正式窗口。隔离测试前后核对源项目哈希，已有projects/workspace.furnish.json修改保留。验收证据复制到本目录，不依赖旧输出清理。[源码指纹](source-sha256.json)。
