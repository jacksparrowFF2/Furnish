# 四门双抽屉冰箱：Blender 活动部件试点

2026-10-29。复用 `fridge_french_drawer`，闭合外包833×595×1910mm；图片、尺寸来源及未知型号见 [冰箱资料](FRIDGES.md)。普通冰箱／普通对开门冰箱仍用原静态流程。本次没有修改真实装修方案。

## 源工程与发布

独立后台 Blender 建模，保存 [可编辑工程](../assets/models/fridge/fridge-v1.blend) 和 [GLB](../assets/models/fridge/fridge-v1.glb)。发布器再用独立 Blender 重新导入，验证30个具名网格、4个运动父节点、部件身份／角色、闭合尺寸／中心、轴声明、父节点枢轴位置与静止变换，生成离线脚本 `src/data/fridge-blender-asset.js`。源GLB哈希随运行资产记录。失败保留上一有效资产。

```powershell
node scripts/blender-asset.cjs author-fridge output/fridge-new-source
node scripts/blender-asset.cjs publish-fridge assets/models/fridge/fridge-v1.glb
node scripts/preview-fridges.cjs
```

author使用新目录，拒绝覆盖已有源文件；商店启动器退出不代表完成，以独有结果文件确认。未操作用户活动Blender。Furnish毫米坐标 `(x,y,z)` 转 Blender米坐标 `(x,-z,y)`。此配置允许4个声明的EMPTY父节点；仍不支持任意第三方模型、动画片段、骨骼、贴图或复杂节点材质。

## 门轴与尺寸

`product-rules.js`统一定义尺寸、运动字段及范围；`fridge-core.js`派生布局、二维当前轮廓和最大行程扫掠；`fridge-model.js`把具名导入网格装到独立门轴／滑轨父节点。右门屏幕随右门，抽屉各零件随对应滑轨。

|字段|单位／范围|缺失值|
|---|---|---|
|fridgeLeftAngle／fridgeRightAngle|度，0–100|0，闭合|
|fridgeUpperExtension／fridgeLowerExtension|比例，0–1；界面百分比|0，收回|

左右按面对产品正面理解。默认门轴位于两侧，抽屉参考行程350mm；**门轴、100°上限、行程和内部结构均为布局假设**，未获型号手册确认。外包尺寸来自原图片，不等于安装空间。

保留合法宽深高编辑：先拟合闭合顶点及枢轴，再执行刚性旋转／平移，不能在已旋转父级上施加非均匀缩放。抽屉行程随深度同比变化；箱板及内部件在本款中随对应轴缩放，未提供真实改制或固定板厚承诺。非标准尺寸仅作布局草模。旧记录缺少新字段保持缺失／按闭合解释，不强行补写。

## 空间能力

生产Three构造与数值实体记录器使用同一导入顶点，保留 `bodyParts()`、`directional()`、当前实体测距／碰撞和稳定部件身份。二维选择轮廓随当前门／抽屉展开。新模型不再套用原冰箱柜位的整体容纳豁免，进入柜板仍应告警。

当前姿态实体与完整开启空间分开：项目核对始终检查最大100°／完整抽屉行程，不因当前闭合而跳过。旋转扫掠以不大于2°采样、补足弧线与弦的误差，再取保守凸包；保留原项目5mm平面接触容差。凸包可能在实际轨迹空角误报，不能称逐三角面连续精确碰撞。高度区间、旋转／镜像与未知高度处理沿共用项目规则；核对定位显示同源完整扫掠。

自碰撞复验覆盖闭合、中间及最大姿态、非均匀改尺寸和极小尺寸；发现并修复下抽屉底板与固定箱底穿插。这是代表姿态检查，未穷举任意多个运动部件的组合或模拟五金、软密封及变形。

## 保存与兼容

四字段沿现有属性 `mutate()`、锁定、复制、替换、撤销重做、自动保存、导入及命名方案链路；换成其它类型时清理不支持字段。包含本款的当前／命名方案采用项目v31，即使闭合也保护已改变的空间语义。仓库读写与本地缓存支持31，旧项目不含本款时仍按所需版本保存。空间确认上下文含运动字段和语义版本，价格／配色不清除空间确认。

旧实例位置和尺寸保留，但本款从实心静态近似变为带空腔及活动部件的布局近似，应重新空间核对。新身份 `fridge-v1:*` 可追溯；未验证旧精修Blender工程材质自动接管到新拓扑，不能宣称无损迁移。

## 复验

详见 [验收记录](validation/blender-fridge-motion-20261029/README.md)。重点入口：`test-blender-fridge-motion.cjs`、`test-fridge-project-v31.cjs`、`test-fridges.cjs`、`verify-blender-appliance.cjs --fridge`，以及实际Blender执行 `scripts/verify/verify-blender-appliance.py -- <本次结果目录> --fridge`。
