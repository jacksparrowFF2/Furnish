# TG10K60W增量验收 · 2026-10-29

完成用户图片对应小天鹅595×560×850mm固定型号，34具名网格／1竖轴／3随动门件，默认预览改为该款。原通用型及真实方案数据保持。来源与建模假设见[型号契约](../../WASHER-LITTLESWAN-TG10K60W.md)。

## 通过

- Blender 4.5.15 LTS实际建模、GLB发布；源SHA与资产匹配，部件／闭合尺寸／铰轴／真实圆孔及门环半径校验。错误轴心、封死圆孔两种负例分别拒绝，上一有效发布不被覆盖。
- `test-blender-washer-tg10k60w.cjs` 与原通用型共享实际几何契约：4组尺寸×5个角度；生产／数值顶点、圆门／圆孔保持、3随动与31固定件自碰撞、完整高度片扫掠、仅中间路径障碍、圆顶空角、旋转／镜像、测距／碰撞／高度分离、稳定部件身份和开关射线。
- 额外验证TG身份／安装参数、同族替换、跨族清理、两洗衣机型号不叠放、洗衣柜对齐／关联、当前和命名方案v35往返、三次恢复无漂移。
- HTTP与离线file：改尺寸、圆门编辑、撤销重做、锁定、刷新、v35保存、完整扫掠定位、34件正式生产GLB、390px窄屏；无脚本错误和外部请求。见 `summary.json`。
- 将两种入口实际导出的开关GLB在Blender回读：34件身份稳定、3门件110°竖轴且轴心不漂移、实际最低点200mm，与安装基准一致，无双重离地。见 `blender-result.json`。
- 相关回归：`test-product-rules`、`test-laundry-stack`、`test-laundry-catalog`、`test-laundry-resize-vessel`、`test-laundry-cabinet`、`test-laundry-area`、`test-laundry-integrated`、`test-washer-project-v35`、`test-shared-appliance-model`、`test-enclosed-boundary-distances`（102类×8变换）、`test-furniture-production-solids`、`test-furniture-solids-coverage`、`test-furniture-solids-cache`、`test-project-validation`；脚本后缀均为 `.cjs`。
- 正面、闭合斜视、开门及窄屏截图已目视核对。白宽门环、银灰控制区、右侧压筋与检修盖可识别；仍为布局近似。

## 边界／未执行

未运行全量 `scripts/check.cjs`、任意历史预览、厂家开角／隐藏铰链／振动及承托验证、玻璃透射或旧精修材质自动迁移。安装图625×600×865和带门深605作为来源记录展示，不宣称已经新增安装预留自动核对。12高度片凸包具有保守误报边界，不代表精确连续三角面碰撞；视觉圆孔不证明数值内腔可容纳设备。

本轮最终浏览器原始目录 `output/playwright/blender-washer-tg10k60w-YZcM8W`，仅归档必要证据。Git同步及保留项在交付前另行复查。
