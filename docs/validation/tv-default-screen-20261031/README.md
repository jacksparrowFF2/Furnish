# 电视默认画面（2026-10-31）

用户希望通用电视不再显示黑屏。生产电视 case 的屏幕沿原 index:site-145 使用 `primitives.tvScreenMat()`；不改几何、部件身份、项目和用户方案。

程序绘制蓝绿色山湖日景，1024×576，共用 sRGB CanvasTexture；材质为白色基础贴图和强度 0.65 的白色自发光贴图，粗糙度 0.65、金属度 0。这是装饰示意画面，非特定品牌或真实节目。一个 primitives 实例只创建一套画面材质，与现有共享材质一样保留至页面退出。无 DOM 或无 CanvasTexture 的数值记录器回退到原屏幕材质，不改变空间规则或确认。

## 已通过

- `node --check src/render/model-primitives.js`。
- `node tests/test-tv-view-consistency.cjs`：所有目录尺寸、自定义深度、生产几何与 SVG 对齐、旋转／镜像、垂直包络及输入不变。补齐该夹具原先缺失的真实 SofaBed 模块，恢复生产分发链路执行。
- `node tests/test-beam-body-collisions.cjs`：包含电视等安装物的高度分离、梁碰撞与旋转镜像回归。
- 使用正式 `output/desktop/Furnish-win32-x64/Furnish.exe`，独立工作目录／缓存／端口 8893，复制项目文件，检查完整应用进入生产 3D。仅在隔离 HTML 添加近景取图钩子，实际调用 `buildFurniture`；4 个原有网格保持，屏幕纹理非空且宽度 1024。目视正向、边框与画面正常，见[近景](tv-closeup.png)。
- HTTP 和阻断外网的 file:// 分别加载离线脚本与 Three，实际创建电视材质；宽高 1024×576、sRGB、0.65 自发光、重复调用返回同一材质。

运行脚本及详细结果在忽略目录 `output/tv-default-screen/verify.cjs`、`checks.json`。正式用户窗口／缓存／保存目录未用于测试。

## 未执行与边界

没有运行全量检查、Blender 导出／回读、视频播放或自选画面；没有新增字段和编辑操作，因此不新增保存／撤销通道。材质不产生照亮房间的真实屏幕光源。旧电视尺寸仍按原实现，未知产品安装要求不作推定。
