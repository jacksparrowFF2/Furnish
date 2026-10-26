# 三维柜门开合性能（2026-10-26）

主场景点击柜门经原 `mutate → commit → renderAll`，属性和全案核对对大量生产板件检查吊顶；此前在每个板件循环里重复生成同一吊顶截面、路径和端板，并对明显分离对象裁切。`ceiling-core.checks()` 改为每次调用按吊顶准备几何，先做保守平面／高度排除，再执行原精确截面求交。`project-core.spaceCheck()` 为开启障碍板件准备平面包围框，远处板件不再反复扫描完整扫掠；同一家具已知／未知高度命中分别去重。没有跨次缓存、持久数据或加载变化，未知高度继续检查。

## 验证

- 吊顶、柜体、厨房、项目、竖管和梁高共 79 个增量测试文件通过，包含实际生产网格、凹形／旋转／镜像、设备开孔、安装高度和项目恢复；对远处床的真实生产板件，断言不再进入精确开启扫掠判断。
- 新增 `test-ceiling-check-broadphase.cjs` 对直线／闭合截面、端板和平顶，与原无提前排除算法做 6,174 组比较；涵盖接触、极小穿入、分离、未知高度、旋转和镜像，输出一致且不修改输入。
- 修改模块及新增脚本语法检查、差异检查通过。未运行全量 `scripts/check.cjs`，未做实机触屏或 GPU 帧率验收。
- HTTP、断网 `file://` 的真实方案副本验证衣柜、玄关局部检修盖板和厨房模块开合、撤销重做、项目往返、自动保存刷新及 390 px 布局。桌面与窄屏截图仅作视觉检查，时间测量不包含单击等待双击的既有 350 ms，也不包含 GPU 完成时间。
- 初轮三环境功能断言、完整空间检查结果逐值比较均通过，但结束时真实文件的哈希保护检查发现外部更新而报错；静态服务器只接受 GET/HEAD，未提供保存 API。保留外部修改，最终使用冻结副本重做基线／HTTP／断网file三环境对照；同时替换基线的两个核心模块，结果见对应 JSON。

## 测量及边界

`core-comparison.json` 用同一真实方案派生的 8,093 个板件、4 个吊顶，交替执行修复前与修复后核心算法并逐值比较。Node 中吊顶检查中位数从 **3,066 ms 降至 43 ms**（约 71 倍）；它只代表此核心函数和这份输入，不能换算为整次三维操作帧率。

浏览器整次同步回调仍包括自动避让、二维刷新、属性核对、全案核对和三维同步。最终冻结副本顺序对照每对象开关两次：HTTP 衣柜、玄关检修盖板和厨房柜约 **1.3–1.9 秒 → 0.56–0.72 秒**。原始每次时间、中位数及完整分段统计保存在 `comparison.json` 和三份结果 JSON。多轮测试有明显运行负载波动，样本量小，不将结果推广到所有柜体、设备或整次GPU呈现时间。

剩余开销包括整案刷新、厨房自动避让和大量板件空间核对；单击仍保留原双击判别延迟。没有降低阴影、像素比或几何精度，也没有关闭碰撞核对来获得这些结果。

## 复现

使用只读冻结副本可避免其他窗口继续编辑真实项目干扰输入一致性检查：

```powershell
New-Item -ItemType Directory -Force output/playwright/cabinet-toggle
Copy-Item projects/workspace.furnish.json output/playwright/cabinet-toggle/fixed-workspace.json
node scripts/verify/verify-cabinet-toggle-performance.cjs --workspace output/playwright/cabinet-toggle/fixed-workspace.json --core-only --baseline-ref 4889a8e
node scripts/verify/verify-cabinet-toggle-performance.cjs --workspace output/playwright/cabinet-toggle/fixed-workspace.json --baseline-ref 4889a8e
```

省略 `--baseline-ref` 仅验证当前 HTTP；追加 `--file` 使用断网直接打开。`--smoke` 每对象开关两次，用于保存／恢复链路复验。测试使用全新浏览器存储及只读静态服务器，不连接正式仓库保存服务。
