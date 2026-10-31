# 2D 物体方向标注增量验收

2026-10-31。选中家具显示四向标签，默认开启，通过“显示 → 编辑辅助 → 物体方向”关闭。左右为面对产品正面的产品左右，镜像后随实体换侧；前为局部二维 +Y／三维 +Z。标签为整件产品坐标，组合柜不逐段定义正面。

## 已通过

- `node tests/test-furniture-directions.cjs`：0／30／90／180／270° 家具旋转、全部四种图纸旋转、镜像、三种缩放、内侧退让及非法尺寸／比例，无状态改写。
- `node tests/test-furniture-labels.cjs`、`node tests/test-plan-label-dom-cache.cjs`：原家具名称排版及 DOM 缓存。
- `node tests/test-drawing.cjs`、`node tests/test-drawing-readability.cjs`、`node tests/test-drawing-export.cjs`：原图纸标注、旋转及导出范围。
- `node --check src/render/plan-renderer.js`、`node --check src/app.js`。
- `node scripts/verify/verify-furniture-directions-desktop.cjs`：使用现有 `output/desktop/Furnish-win32-x64/Furnish.exe`，复制当前工作区至独立目录／缓存／动态端口。检查四向标签、旋转镜像、撤销重做、正式文件保存刷新、偏好刷新、缩放、390px 窗口及隐藏家具层。成果 SVG 排除标注，HTTP 和直接 `file://` 均显示四向标签，无页面错误，源项目 SHA-256 不变。
- 目视检查默认、旋转镜像及窄屏截图：前方绿色，其余中性色；标签文字正向，向内退让后不覆盖原尺寸数字。截图与运行 summary 留在本地 `output/playwright/directions-*/`，不含在提交中。

## 范围及边界

不改模型几何、项目版本、空间确认、碰撞或持久恢复链。开关仅记入原 `huxing-ui.layers`，不进入项目撤销记录。旧偏好无 directions 时使用默认 true；不为旧实例补字段。

本次没有运行全量检查、全模型视觉验收、Blender 或 3D 导出。极小物体、多件相互重叠、屏幕边缘及窄屏固定浮层可能遮挡标签，未实现全场景避让；放大并逐件检查可提高可读性。方向描述产品约定坐标，不判定摆放是否符合设计意图，也不推断各组合模块的独立正面。
