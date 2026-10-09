# 模块与加载约定

Furnish 使用浏览器原生脚本，无需构建。直接打开 `index.html` 的兼容性是拆分代码时的约束；三维模块与 Three.js 的 data-URL import map 继续保留在入口中。

## 数据与规则

- `src/data/plans.js`：内置户型。
- `src/data/catalog.js`：材料、家具分类与按类型估算的参考价格。自定义家具仍来自浏览器存储。
- `src/data/i18n.js`：英文名称、简繁转换与按语言选择文案。当前语言及 DOM 更新由主应用管理。
- `src/data/style-presets.js`：风格预设。
- `src/core/style-core.js`：应用家具配色与房间材料，复用 `design-core.js` 的房间用途规则。调用者负责撤销、保存、渲染和提示。

这些模块不读取 DOM 或当前应用状态。浏览器通过 `FurnishPlans`、`FurnishCatalogData`、`FurnishI18n`、`FurnishStylePresets`、`FurnishStyles` 获取数据与接口；Node 通过 `require()` 直接读取同一份实现。`FurnishCatalog` 保留给现有家具库 UI 接口，避免与静态数据混用。风格和户型测试无需按源码文本位置截取代码。

## 浏览器适配与主应用

- `src/ui/budget-panel.js`：概览、家具清单、报价面板与 CSV 导出；计算仍交给 `project-core.js`。
- `src/ui/furniture-actions.js`：选择、剪贴板、旋转、对齐、尺寸恢复及定位操作；复用现有规则、历史与渲染。
- `src/io/image-export.js`：浏览器下载与 PNG 导出。
- `src/app.js`：当前户型、状态、历史、SVG 渲染、属性面板、指针事件与应用初始化。它仍是下一轮进一步拆分的入口。

这三个浏览器适配文件是普通脚本，与 `app.js` 共用全局词法作用域。其顶层只声明函数、常量或局部操作状态，不读取尚未初始化的 `state`、`ui`、`PLAN` 或 DOM；调用时读取最新状态，避免撤销、切换户型或载入项目后继续引用旧对象。

入口加载顺序为：原有数据与 core/io → 户型、语言、家具和风格预设 → 风格规则 → 浏览器适配 → `app.js` → 创建 DOM 按钮及挂接行为的 UI 扩展 → 三维模块。不要给这些脚本添加 `async`，也不要将提前加载的适配文件改成独立 ESM 后继续依赖全局词法变量。

## 样式与成果导出

`styles/app.css` 提供主样式；随后加载 `styles/floorplan-editor.css` 和 `styles/project-workspace.css`，保留原有覆盖顺序。编辑器和工作台不再动态插入样式。

成果 HTML 的内嵌样式继续由导出代码生成，使用户下载的成果能够独立打开；它不依赖上述应用样式文件。

## 验证

运行 `node scripts/check.cjs` 检查源码语法、入口资源路径、全部回归与内置户型。浏览器验收应覆盖应用风格及撤销、语言切换、家具复制及尺寸编辑、预算 CSV、PNG、编辑器与项目工作台、3D。拆分三维加载方式前还需补齐真实 `file://` 验收。
