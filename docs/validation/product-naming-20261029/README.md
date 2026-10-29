# 家具命名与共通能力验收（2026-10-29）

## 行为与升级

种类、品牌、型号／产品名、显示名称分别表达。TG10K60W 种类为洗衣机，型号为 TG10K60W；库默认名为“小天鹅洗衣机 TG10K60W · 10kg”。通用／具体洗衣机继承 washer profile，洗烘设备的 alignLaundryBay 由共用能力声明，界面和计算共用判断。

旧项目／命名方案／缓存恢复精确更新已知旧库默认名，其它自定义名称与数据保留；旧收藏键、原规格查询保留。既有项目不需新增持久字段即可显示种类并继承动作，不将未知型号的 washer 改成具体型号。

本地原工作区只读核验：25份 work 记录中共21台洗衣机恢复后均有种类和对齐能力。原 projects/workspace.furnish.json 在任务开始即有用户未提交修改，本次未写入、未提交该文件。

## 已通过

- 所有改动 JS 的 node --check 与 git diff --check。
- test-product-naming：当前全部目录种类、旧默认名／自定义名、恢复幂等、当前和命名方案项目往返、空间确认不因更名失效、旧收藏身份、旋转／镜像及净宽相等与超限。
- test-product-rules、test-catalog-browsing、test-catalog-links、test-procurement、test-laundry-catalog、test-work-state、test-purchase-group、test-furniture-replacement、test-replacement、test-cabinet-design-upgrade。
- test-blender-washer-tg10k60w：47件生产与数值实体、尺寸缩放、门轴和圆孔、五种姿态自碰撞、完整高度扫掠及部件身份。
- product-naming、catalog-library 浏览器验收：隔离副本，HTTP及断网file://。覆盖两款洗衣机真实对齐按钮、朝向／镜像／离地、撤销重做、刷新、旧默认名、旧收藏、产品资料、采购种类及实际CSV下载、390px窄屏。结果与逐项日志见本目录。
- 目视检查桌面资料面板、空位对齐和窄屏资料布局，截图见本目录。CSV表头与数据已检查，种类与型号分列。

## 未执行与边界

未运行 node scripts/check.cjs 全量检查，未遍历历史预览；本次不改变模型几何、安装参数或加载机制。成果HTML表列作定点源码核对，未另做完整成果HTML导出界面验收。空位对齐不证明满足实际散热、振动或安装要求；OBJ替代几何不自动继承此动作。

本机Playwright Chromium副本无法启动（spawn UNKNOWN），改用已安装Chrome完成验收，无外部请求或用户仓库写入。静态验收服务的仓库API不可用提示属隔离环境，浏览器缓存／刷新仍已检查，不能将其描述成仓库API自动保存验收。

## 复现

```powershell
node tests/test-product-naming.cjs
$env:FURNISH_BROWSER_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/verify-browser.cjs product-naming catalog-library
```
