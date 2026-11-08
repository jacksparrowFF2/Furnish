# 组件柜可拆卸层板、虚化与碰撞开关（2026-11-08）

适用组件柜的活动层板、固定结构横板及开放区上下边界；不自动修改正式方案或升级旧柜。

## 行为

- 选中逐板勾选“可拆卸（需要时可取下）”，结构树及所选层板宽度显示标记。
- 生产模型使用独立克隆材质，25%不透明度、关闭depthWrite与该板阴影，保留弱轮廓；可继续选取编辑。其它部件及全局共享材质保持。
- 默认仍参与碰撞。可另勾选“不参与碰撞检测（模拟取下）”，保留层板参数和虚化位置示意，仅排除该板的生产数字实体；测距及全案碰撞共用solidParts。挂衣杆与该层板的实体相交预检也沿此开关。
- 碰撞关闭不改变安装尺寸标注／层格净高，不模拟五金、承重或真实取出路径。重启碰撞时若与现有挂衣杆相交，按原预演拒绝且不部分修改；取消可拆卸也先原子验证。
- 能力标记不清空间确认；碰撞开关参与空间签名。关闭可拆卸会清除对应碰撞豁免。旧缺失不补写，仍为未标注、参与碰撞。显式字段最低项目／仓库v77，恢复缓存读取旧版本。

## 已通过

- `node tests/test-cabinet-removable.cjs`：全部水平板角色、逐板独立性、错误类型拒绝、输入不变、旋转／镜像／离地、真实生产板件与稳定身份不变、实体穿板碰撞开／关／恢复、挂衣杆预检、共享材质隔离、净尺寸保留、单板／边界组件复用、当前／命名／组件库／项目／仓库v77重复恢复及v72–77缓存回读。
- `test-furniture-solids-cache`：788项真实生产缓存对照及41种唯一形状缓存回归；`test-spatial-review-cache`确认空间核对缓存的非空间编辑独立性。
- `test-workspace-cache`、`test-repository-version-compat`、`test-project`：旧缓存迁移、严格仓库版本拒绝、项目保存恢复及20项基础回归。
- `test-cabinet-horizontal-editing`：108块实际试点层板的真实Three尺寸、开口联动、旧v76恢复。
- `test-cabinet-builder`、`test-cabinet-builder-open-zones`、`test-cabinet-builder-upgrade`：原组件柜、开启、实体、升级及历史v72／73／75恢复回归。
- `node tests/test-cabinet-back-components-ui.cjs --removable-only`：HTTP、断网file、同打包桌面的四类层板两开关、草稿撤销重做、应用保存撤销重做、刷新恢复和正式GLB透明材质。证据：`output/desktop-verification/cabinet-removable-gTAtUd/result.json`。
- 桌面补充正视／三维／700px窄屏截图并实际看图，刷新复验：`output/desktop-verification/cabinet-removable-CRw943/result.json`。使用同EXE、独立源码副本／工作文件／缓存／端口，源文件哈希验证保持。归档[属性与开关](desktop-removable-wide.png)、[三维虚化](desktop-removable-3d.png)。

## 未执行及边界

未运行全量检查、Blender回读及施工拆装验证。透明是布局显示效果，不表达真实板材透光。正式用户方案未作标记或开关修改。初次沙箱测试因本机网络权限受限未启动；放行隔离验收后通过。早期桌面脚本等待load超时，改用项目既有flush与DOMContentLoaded等待后通过。保留失败记录，不将其计作通过。
