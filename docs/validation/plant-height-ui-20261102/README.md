# 盆栽离地高度输入框

2026-11-02。数据与生产模型已有mountHeight，但属性面板没有为君子兰／吊兰／豆瓣绿生成对应控件。增加“花盆底部离地高度”，只适用于已有garden植物及mountHeight能力，排除架体和自定义obj。使用原fMountHeight校验／锁定／mutate处理，无新字段或模型变化，正式布置未调整。

通过：`node --check src/ui/property-panel.js`、`test-balcony-garden.cjs`；[同一EXE隔离桌面及Chrome HTTP／断网file验收](results.json)，三个植物类型逐项确认控件存在、初始高度、上下移动不改变尺寸或XY、合法0、负数拒绝、撤销重做、保存刷新及锁定禁用。[桌面控件截图](desktop.png)。正式文件哈希不变。脚本首次遇到本机Playwright浏览器版本缺失，改用已安装Chrome；纯浏览器保存入口改为既有save后通过。未跑全量检查。

正式窗口在读取已保存状态后刷新；原方案和现有800／1300等高度不变。入口位于选中盆栽后的属性面板，名称为“花盆底部离地高度”，与植物自身尺寸分开。
