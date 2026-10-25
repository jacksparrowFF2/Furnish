# 截面整体变换与鼠标节点增删验收

2026-10-25：20组相关Node增量回归通过：所有test-ceiling*／test-ceilings，以及project、project-validation、project-recovery、repository-workspace、repository-storage和workspace-cache。新用例核对型材、柔光板和灯带刚体变换后的真实顶点／灯光多边形，参数再生、移动／角度吸附、倾斜翼边连接拒绝、旋转生产网格与法线，以及v19项目／命名方案／工作区／缓存四次恢复无漂移。原v18未旋转结构保留。仓库API回归首次受沙盒本机端口限制，允许本机测试后通过。14个变化JS模块及新测试语法检查通过。

[新增交互](interaction-browser.json)在HTTP和断网file://通过：区域与截面右键加点／删点、双击加点和选点Delete删除；真实鼠标拖动灯槽、旋转把手、90°按钮、精确45°输入；水平翼边连接拒绝倾斜姿态；Esc还原；自绘石膏返回仍保留独立灯槽姿态；草稿不改正式状态、一次撤销／重做、v19缓存及刷新恢复、重新打开、390px无横向溢出、无页面异常。三维实时更新沿用原canvas。

[原组合回归](assembly-browser.json)在两种入口通过：分部件参数、真实型材及柔光板三维尺寸、中央板接触、实时2D／生产3D、观察方向保留、空参数不丢失、柔光板开关、保存撤销刷新、实际项目导出／导入、v18缓存和390px。

相关ceiling-design、ceiling-boundaries、ceiling-edge-distances、ceiling-uniform-inset与portable-smoke另行增量复验，详见本目录相关回归结果。已目视检查[桌面](http-editor.png)和[390px](http-mobile.png)。全部浏览器测试使用隔离副本和合成夹具，未写用户项目。

未运行全量check、实机触屏、跨GPU人工检查或厂家施工验证。角度为几何安装姿态，不推定型材承托性能；轮廓仍受现有0.1mm短边、自交和闭合偏移内侧自交限制。旋转后若需中央板连接，水平翼边契约要求改用独立连接或关闭中央平顶；不自动改用户连接设置。自绘灯槽使用实际顶点，不补猜尺寸。
