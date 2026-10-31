# 柜体详细设计键盘操作验收

2026-10-31。适用于普通参数化柜体详细设计中可编辑的层板及竖隔板；未扩展厨房内部部件、固定结构板、门板或模块的复制／删除快捷键。

- 选中层板：Delete 直接删除，Ctrl+C（兼容 Meta+C）调用原复制操作并选中新层板，无需粘贴。副本由原核心选择有足够空间的相邻净格。
- ↑／↓ 移层板；←／→ 移竖隔板。每次1 mm，Shift为10 mm，继续遵守原核心的净空和尺寸限制。
- Ctrl+Z、Ctrl+Y、Ctrl+Shift+Z沿会话撤销／重做（共用工作区的厨房也可撤销／重做）。输入框、搜索、下拉、可编辑文本、输入法组合和模块管理表单保留自己的按键行为。
- 修改仍是草稿；保存柜体设计才沿原mutate应用，可整次撤销。取消不改家具；关闭时移除监听器。无新持久字段、加载脚本或空间语义。

## 已通过

- `node --check src/ui/cabinet-editor.js`。
- `node tests/test-cabinet-shelf-clearances.cjs`：426个净高编辑案例及生产面验证。
- `node tests/test-cabinet-workspace.cjs`：80个模块编辑及结构板生产面／往返。
- `node tests/test-cabinet-edit-operations.cjs`：尺寸、边界和项目往返。
- `node tests/test-cabinet-keyboard.cjs`：同一正式打包EXE，独立工作目录、数据、缓存及端口。实际按键覆盖复制、删除、1／10 mm移动、竖隔板、输入保护、局部撤销／重做、保存、应用撤销、正式文件刷新、取消与390px布局；源项目哈希保持。[桌面结果](desktop-results.json)。
- `node scripts/verify-browser.cjs cabinet-workspace cabinet-keyboard`：HTTP与断网file两入口；`output/playwright/verification-DQLzq3/results.json`。
- `node scripts/verify-browser.cjs cabinet-shelf-clearances`：HTTP与断网file层板净高交互；`output/playwright/verification-qhLa0h/results.json`。
- 已目视检查[桌面](desktop.png)及[390px](narrow.png)截图。窄屏沿用滚动布局，视图按钮仍可能竖向折行；不宣称已完成整套窄屏重设计。

## 发现与处理

初版把快捷键说明追加到左侧结构树，导致原模块拖拽验收失败。隔离原版对照通过；将说明移到画布下方后，工作区与键盘两入口复验均通过。桌面项目恢复会重排JSON键，测试按完整对象内容比较，避免键顺序误报。

## 未执行与边界

未运行全量检查或全部模型验证；生产构造器与核心规则未改动。Ctrl+C此处是直接复制层板的局部命令，不写系统剪贴板；未增加Ctrl+V。方向键只用于结构允许的轴向调整；固定结构板与其它部件不响应移动／删除。本轮未清理其它对话的工作树或用户已有未提交项目数据。
