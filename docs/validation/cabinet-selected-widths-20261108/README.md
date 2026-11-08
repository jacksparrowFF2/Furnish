# 柜箱编号与指定箱均分验收

2026-11-08。仅修改组件柜编辑UI及均分范围，未增加项目字段、加载脚本或保存通道；用户正式方案未修改。

- `node tests/test-cabinet-selected-widths.cjs`：18组旋转/镜像/相邻及非相邻指定箱，目标外宽守恒、其余柜箱及组件保持、项目往返、重复均分与无效选择通过。
- `node tests/test-cabinet-equalize.cjs`：既有60组旋转/镜像/离地、120块生产水平板及均分回归通过。
- `node tests/test-cabinet-preview.cjs`：原预览选取/拖动/取消及视图回归通过。三个改动JS语法与git diff --check通过。
- `node tests/test-cabinet-back-components-ui.cjs --equalize-only`：HTTP、离线file、同版隔离桌面全部通过；详见results.json。覆盖四柜编号及实际鼠标点击、空选择禁用、只选1/2等宽、草稿/应用撤销重做、保存刷新、既有四种均分、实际门端态和生产GLB逐板身份/边界、390px窄屏原入口。
- 已实际查看desktop-selected-boxes.png：柜箱1/2均725mm，柜箱3保留550mm，柜箱4保留1000mm，编号与结构树一致、目标范围可见。桌面使用独立工作目录、缓存和端口，保留sandbox/contextIsolation与源文件哈希检查。

第一次沙箱内桌面启动失败，后用获准的沙箱外隔离启动完成。开发中发现新编号未启用pointer-events，已补CSS并以真实鼠标点击复验；最终三入口全部通过。

范围保持所选箱现有外宽总和；需要先设置其他箱目标尺寸，不会自动求解房间剩余墙宽。板厚不同时净宽不同；依赖连接的柜箱可能随宽度修改平移，叠放整组外宽由预演表达。不代表已对用户原方案执行均分或全部空间核对。未运行全量check；未改变模型构造或安装语义，不适用Blender重建。

并行resize会话先提交2f32fdde并释放Git窗口后，本轮才追加共享文档及提交。本轮保留用户projects/workspace.furnish.json，不暂存；既有detached工作树不属本轮且可能保留独有成果，不清理。
