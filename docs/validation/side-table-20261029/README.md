# 双抽岩板边几增量验收 · 2026-10-29

[型号契约](../../SIDE-TABLE-TMALL-635382906309.md)。

## 通过

- 独立Blender 4.5.15 LTS建模、35网格／2活动父节点、GLB重新导入发布、来源哈希；生产模型无旧边几回退。
- 标准680×300×612、850×400×800及最小500×180×560生产几何；11 mm岩板、185 mm上格净高；标准270 mm下格及两抽屉220×240×80 mm内径；0／半程／全程抽屉与固定结构无穿插。
- 0／37／90／180度及镜像；当前实体和完整扫掠、关闭时行程告警、柜内行程、接触、微量穿板、局部重叠、完整格内包含、高度分离／未知、外部110 mm实际测距。
- 两布尔字段默认／校验／替换清理；开合改变确认、采购价格／颜色不清确认；v36项目、命名方案、仓库写回、旧缓存回退、连续三次恢复无漂移。
- HTTP和断网file://：独立生产预览、主应用添加、独立双抽开合、锁定、改尺寸、撤销重做、自动保存及刷新、核对定位、390 px窄屏，无页面异常。[浏览器汇总](summary.json)。
- 生产GLB全部35个稳定身份网格；Blender回读两种加载方式的开／关GLB，10块活动板刚性同向位移297.142857 mm（850 mm草模），静板无漂移。闭合外观不变的错误轴心负例被拒绝，上一输出保持。[Blender汇总](blender-summary.json)。
- 相关回归：test-product-rules、test-workspace-cache、test-enclosed-boundary-distances（103类×8变换）、test-cabinet-interior-distances、test-work-state、test-project、test-project-validation、test-repository-workspace、test-repository-storage、test-washer-project-v35。

初次窄屏发现画布溢出，已限制canvas视口并复验；视觉检查补上脚轮连接底板的支架后，重新生成发布35件资产。最终HTTP／file及Blender记录均为修正后版本。Blender回读断言修正为Z向上坐标后通过。沙箱无法启动Blender／Edge及loopback EACCES的问题，通过授权独立后台进程完成检查。

## 未执行与边界

未运行scripts/check.cjs全量及无关历史预览。商品页正文未取得；实物五金行程、材质、承重和刹车机械未验证。圆边包络及抽屉完整扫掠存在保守空角，不能作为制造／施工验证。未改写真实用户方案。无剩余已知测试失败。

[闭合](http-closed.png) · [双抽拉出](http-open.png) · [离线窄屏](file-narrow.png)
