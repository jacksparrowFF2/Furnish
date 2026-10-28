# 内部编辑保留所属柜体层级

进入厨房自定义模块、洗衣柜吊柜或开放格的内部编辑后，左侧继续显示外层模块及分区入口。点击入口先读取并校验当前输入，再接续整柜草稿；“整个柜体”返回外层，最终保存沿原单次 mutate。关联设备的模块索引映射随返回保留。没有新增持久字段、加载路径或生产几何变化。

## 增量验证

- `node --check`：cabinet-editor、kitchen-editor、柜体工作区浏览器验收脚本。
- `tests/test-cabinet-workspace.cjs`：80组模块操作、结构板生产面及恢复通过。
- `tests/test-cabinet-editor-completion.cjs`：144组厨房层板操作及生产板件通过。
- `node scripts/verify-browser.cjs cabinet-workspace`：HTTP及离线file://通过。覆盖常驻外层四个入口、直接切换吊柜／开放格、未失焦宽度接续、非法尺寸阻止跳转、鼠标与键盘返回、水槽柜入口、整柜保存／取消、应用撤销重做和刷新，以及390px入口可访问性；原模块增删复制排序、会话撤销重做、结构板尺寸编辑也通过。
- 浏览器最终结果：`output/playwright/verification-Pu5ew7/results.json`。截图位于其 `workspace 迁移 #/output/playwright/cabinet-workspace/`，包括HTTP与file的`*-nested-navigation.png`、`*-nested-mobile.png`，已目视。

首次运行默认浏览器路径缺失，配置本机已有Playwright浏览器后，沙箱阻止回环服务访问；在获准的沙箱外环境使用隔离项目副本完成验证。中间一次新增断言误读旧数据缺省柜宽而失败，改为读取整柜宽的原有回退语义后通过；不修改项目数据来满足测试。

## 边界

内部编辑器仍采用原来的子会话草稿，跨分区切换会重建子会话撤销历史；整柜最终保存仍支持应用撤销。未运行全量check、实机触屏或Blender；本轮不改变生产模型。原有用户工作区改动保留，不纳入本次提交。
