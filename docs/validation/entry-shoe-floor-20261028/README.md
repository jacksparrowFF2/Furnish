# 落地鞋位验收

2026-10-28，用户截图要求取消最底横板。当前柜体 `fmv5b78gp2` 为970×350×2350 mm、零底座。模型取消横板并将侧／背板延伸至原安装底部；中间鞋层板保持，不新增保存字段。

- `test-entry-shoe-floor.cjs`：生产实体、底部开放、侧／背板接地、中层板接触／0.1mm穿入、0/37/90/180°及镜像、非零底座保留、项目往返、空间确认失效及配色保留通过。
- 相关回归：entry-console、entry-editor、entry-shared-board、cabinet-model、cabinet-interior-distances、cabinet-opening-3d、cabinet-opening-volume-model通过。涉及1258块实际板件、960条高度裁剪射线与1680个开启顶点。
- 改动JS语法与`git diff --check`通过。
- `node scripts/verify-browser.cjs entry-shoe-floor`：隔离副本中HTTP、完全离线file://通过当前柜体的无底板检查、保存原设计、可撤销编辑／撤销重做、刷新无漂移、390px无页面溢出和无页面异常。见[结果](results.json)、[日志](browser.log)、[桌面截图](desktop.png)。截图保留当前下柜门打开状态，底部无横板已目视检查。

第一次浏览器因默认沙箱浏览器路径缺失，指定已安装浏览器后又遇到回环连接EACCES；沙箱外隔离运行成功。首次缓存等待因保存未改动设计不触发写入超时，验收补入可撤销编辑后复验通过，产品代码未因测试等待改动。

未运行全量检查、Blender或施工五金／承重检查；无新加载方式，file验收用于确认实际离线生产预览。主目录中其他吊顶修改及工作区数据未纳入本次成果。
