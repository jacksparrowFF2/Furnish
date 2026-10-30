# Scoop Blender 5.2.3 LTS：TG10K60W精修模型整链路验证

2026-10-30，Windows。本轮明确使用 `C:/Users/SPH/scoop/apps/blender/current/blender.exe`，未回退商店版。基线提交 `992f697`；在独立副本重新生成／发布资产，正式模型及真实方案文件不参与写入。

## 结论与兼容修复

建模 → GLB导出／重新导入发布 → Furnish正式生产入口 → HTTP／离线生产导出 → Scoop回读 → 正式渲染API／Cycles OptiX → PNG、BLEND、GLB下载及工程重开均通过。

初次发布发现Blender5.2布尔切割后的空材质槽：`front-frame`、`side-1`、`side--1`的GLB没有分配声明的白色材质，严格发布器拒绝。修复洗衣机作者脚本：按本产品每部件单材质契约，导出前重建该材质槽并将所有面的索引设为0。未放宽导入校验；错误提示增加部件名和槽数。新增 `tests/test-blender-washer-materials.cjs` 检查实际GLB所有三角网格的材质引用、声明材质及仅门窗Alpha；它能拒绝本次未修正的真实Scoop导出，并接受修正文件和原正式文件。

## 已通过

| 阶段 | 实际结果 | 证据 |
|---|---|---|
| Scoop建模及发布 | 5.2.3 LTS，47具名网格／1运动父节点，源BLEND和GLB生成；独立进程回读并校验尺寸、环径、圆孔、父轴、材质后生成离线资产 | `pipeline-summary.json` |
| 生产几何 | 重建资产通过4组尺寸×5门角、圆门／圆孔、数值／Three顶点、5随动件自碰撞、完整扫掠／中途障碍／空角、旋转镜像、测距／碰撞和稳定身份 | `test-blender-washer-tg10k60w.cjs` |
| 状态及确认 | 原v35方案／工作区往返、恢复、型号替换与柜体关联保持；几何v2确认定向失效且配色等非空间编辑保持 | `test-washer-project-v35.cjs`、`test-washer-front-confirmation.cjs` |
| Furnish应用 | HTTP与断网file加载；改尺寸／角度、撤销重做、锁定、刷新、窄屏；正式生产47件GLB，门窗Alpha0.12保留，无脚本错误或外部请求 | `browser-summary.json`、`furnish-front.png` |
| 生产回读 | Scoop回读两种入口的开／关GLB，47件身份、5随动件竖轴110°、固定轴心、200mm安装高度单次叠加、Alpha0.12 | `blender-roundtrip.json` |
| 完整生产场景渲染 | 原始编辑态生产GLB经正式本地API渲染640×448、32采样，OptiX／RTX4070TiSUPER，无CPU回退，三个下载接口成功 | `production-render-api.json` |
| 标称尺寸近景渲染 | 另建隔离产品验收场景，仍经正式View3D导出器输出595×560×850mm闭合模型，再交正式API渲染800×800、32采样；同样OptiX，无CPU回退 | `studio-export.json`、`studio-render-api.json`、`cycles-nominal.png` |
| 下载工程重开 | Scoop重开作者工程：47件均有单一有效材质且所有面索引0；重开正式API下载的BLEND：47件、实测595×560×850mm、Alpha0.12、Cycles／GPU、32采样／800×800 | `blend-reopen.json` |
| 相关回归 | 交换材质、Blender路径发现、后台API／启动器生命周期／下载／取消及GPU后端选择单测通过 | 对应tests下增量套件 |

当前正式资产JS／GLB／BLEND的SHA256与验证前一致，见 `pipeline-summary.json`。Scoop重建的源工程、交换文件及完整产物保留在本机 `output/validation/scoop-tg10k60w-20261030-tiFS81/workspace/assets/models/washer-tg10k60w-scoop-fixed/`；这里仅归档必要证据，不提交隔离工作区和大型中间工程。

## 复现入口与范围

在隔离副本、全新输出目录中运行：

```text
node scripts/blender-asset.cjs author-washer-tg10k60w <新目录>
node scripts/blender-asset.cjs publish-washer-tg10k60w <新GLB>
node tests/test-blender-washer-materials.cjs <新GLB>
node tests/test-blender-washer-tg10k60w.cjs
node scripts/verify/verify-blender-appliance.cjs --tg10k60w
<Scoop blender.exe> --background --factory-startup --python scripts/verify/verify-blender-appliance.py -- <浏览器导出目录> --tg10k60w
node scripts/verify/verify-blender-local.cjs <生产GLB> auto
```

几何回归需在隔离副本内把新GLB与发布JS同步到该副本的标准资产位置。近景验收使用独立构图；初次空墙体测试夹具缺少现有三维定位基准，已修正为具有有效坐标基准的验收场景，不涉及真实户型或产品代码改动。两种正式API渲染均是基础材质／基础光照验证，不是1601精修工程效果图，WebGL环境反射与Cycles基础光照的外观存在差异。

未运行全量检查、全部其它模型／其它GPU、真实施工／实物铰链与限位、材质库迁移或绑定精修工程流程；没有把Alpha近似表述为物理折射。47件／门径／开角等仍沿该型号既有布局假设。
