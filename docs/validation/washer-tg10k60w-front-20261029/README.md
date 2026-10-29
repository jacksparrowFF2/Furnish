# TG10K60W正面精修v2 · 2026-10-29

根据用户新增实机正面与内筒近照，修正旧版外观推测。机身仍595×560×850mm；门径、轴心、面板及内筒细节为近照估算，不能当厂家图纸。见[型号契约](../../WASHER-LITTLESWAN-TG10K60W.md)。

## 完成与通过

- 独立Blender新目录重建，保留旧源副本；最新源工程和GLB更新到原型号目录，运行资产升为`washer-littleswan-tg10k60w@2`。47具名网格／5随动门件，额外小字／标识均为网格，不依赖外部图片或运行字体。
- 通宽银灰面板、左侧抽屉分缝／品牌、金属旋钮／电源／功能小字；取消蓝色显示块。宽凹门框、压圈／透明窗／门控标记、胶圈、金属内筒／三瓣压型／提升筋／孔点，调整检修盖和贴标。正面／斜视／开门／390px窄屏截图目视核对。运输包装未建模。
- 发布器核对闭合尺寸、47件集合、已知父轴、实际圆孔和环径；只对本型号door-glass允许受限简单Alpha，失败保留上一有效资产。错误轴心、封孔、机壳错误透明三种负例全部拒绝，见三个`rejected-*.json`。
- `test-blender-washer-tg10k60w.cjs`：4组尺寸×5个门角的生产／数值顶点、圆孔／圆门、5随动与42固定件自碰撞、实际顶点扫掠覆盖、顶部空角与中途障碍、旋转／镜像、当前碰撞／100mm测距、身份稳定与实际开关射线。继承该型号身份、替换、柜体关联和项目往返检查；仅门窗透明。
- 原通用`test-blender-washer-asset.cjs`仍通过；相关`test-product-rules`、`test-washer-project-v35`、`test-shared-appliance-model`、`test-enclosed-boundary-distances`（102类×8变换）、`test-furniture-production-solids`通过，后缀均`.cjs`。
- `verify-blender-appliance.cjs --tg10k60w`：HTTP与离线file、改尺寸／角度、撤销重做、锁定、刷新、v35、扫掠定位、47件生产GLB、390px窄屏，无脚本错误和外部请求。见`summary.json`。
- 真实Blender4.5.15 LTS回读两种入口的开关生产GLB：47个身份稳定、5门件竖轴110°且轴心固定、安装底200mm只叠加一次；见`blender-result.json`。
- 门径／轴心变化纳入专用空间确认语义标记，旧版空间确认需重新核对。存储仍v35，无新持久字段。

原始浏览器目录：`output/playwright/blender-washer-tg10k60w-nSZgJr`。仅归档必要证据，不收录隔离工作区和中间草稿。

合并最新边几与柜门主线后：共用发布器保留边几类型与TG专用透明／版本限制，边几实际再次发布和`test-side-table.cjs`通过。`test-washer-project-v35`、`test-side-table-project-v36`、`test-cabinet-adjacent-hinges`、`test-washer-front-confirmation`及103类×8变换的包络测距复验通过。合并边几加载／缓存后重跑HTTP和离线浏览器及真实Blender回读，见`merged-summary.json`与`merged-blender-result.json`，原始目录`output/playwright/blender-washer-tg10k60w-FMlYBD`。生产导出仅本型号门窗使用Alpha0.12，并在Blender中保留。

## 保留边界

未运行全量检查、厂家铰轴／开角／安装或承托实测、物理折射、精修场景材质迁移。透明使用Alpha近似，标识／认证贴为矢量近似且未生成可扫描二维码。内筒孔点为视觉几何，数值实体仍保守，不代表开放内部容纳能力；12个高度片有保守误报边界。图示安装参考单独展示，不宣称完成施工安装验收。
