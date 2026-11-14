# 默认渐进高清观察验收

2026-11-14。按用户要求，主三维观察默认自动渐进采样，低性能先降分辨率、持续较慢才回退；编辑辅助、独立高清下载和Cycles保留。无项目数据格式、家具参数、曝光或灯光强度修改。实现与性能阈值见[契约](../../LIGHTING-PREVIEW.md)。

## 已通过

- `test-progressive-view.cjs`：相机浮点尾差／真实移动、横竖视口、排除首次编译耗时、12秒前不误判、1200→640→回退、相机重采样保留降档、健康采样及收敛负例、连续高GPU耗时。
- `test-lighting-preview.cjs`：原光学单位、全部生产光源、关闭／隐藏、阴影预算、导出和离线供应哈希。
- `test-lighting-preview-modules.cjs`：真实Chrome完整离线ESM加载，新增经典策略脚本随预览页面加载，无CDN依赖。
- `test-backend-auto-update.cjs`：实际回环服务的懒加载文件指纹、更新接替、同源数据及旧页保存重试。首次受限环境回环连接超时；允许本机服务后隔离重跑通过。
- `index.html`内嵌ES模块语法与全体经典脚本合并声明检查；所改模块`node --check`、差异空白检查。
- `test-progressive-view-ui.cjs`：HTTP与离线file入口，及本机正式EXE的独立源码／项目／端口／缓存；先复制正式1601，结束核对源SHA256不变。桌面真实完整方案C、同客厅机位，1200最长边／256采样／OIDN实际收敛，已打开图片目视复核。相机移动后复用同一iframe和一次生产导出，显示的视角键必须匹配最新相机；灯光改变后重新导出，主灯面源减少而独立床头灯带保留。
- 实际iframe不接收指针，交互立即隐藏旧图并恢复；选中灯具时保留生产辅助线、取消选择恢复高清；模式本机记忆、离开2D/3D清理、显式重试、不支持WebGPU及file回退；390px控制栏不越界、不遮挡日夜控制，抽屉展开时跟随其它画布工具隐藏。实时画布覆盖视口，无外部HTTP请求／未处理页面错误。
- 独立高清面板打开时实时iframe被销毁。`test-lighting-preview-ui.cjs --desktop-only`重新实际完成128采样PNG、关闭主灯／移动灯具／复制方案失效、停止取消、无WebGPU负例、390px面板及Cycles入口。旧测试要求关顶灯后面源总数为零，已改为精确比较仍开启的独立床头灯带所有者；未放宽为任意非零值。结果`output/desktop-verification/lighting-preview-WrzS7l/result.json`。
- 正式窗口只刷新与进入3D，读回仍为1601方案C，已保存无待写；实际看到默认自动模式及收敛结果。没有向正式文件做布置编辑。

完整渐进三入口证据：`output/desktop-verification/progressive-view-wLIPJv/result.json`；窄屏修订HTTP：`progressive-view-d3s3o6`。画布覆盖与窄屏最终验证：`progressive-view-wLY4fi`。首采样之前的编译等待不进入性能计时，90秒初始化超时保护持续至首个有效样本；首采样保护的最终三入口复验：`output/desktop-verification/progressive-view-GBwbve/result.json`，HTTP、离线file及正式EXE全部通过。首次附加测试用不配对的canvas合成pointerdown导致轨道控制残留，后续机位移动使独立预览按契约过期；改为host上的完整暂停／释放事件，最终复验无此问题。

## 未执行与边界

只做相关模块、真实加载与GPU/UI增量检查，未运行全量`check.cjs`。未测Mac、其他实体显卡、低配实机、长时间反复开关显存压力；分级阈值用合成时序覆盖，不当作低配实测。首次全屋快照、BVH与编译仍需时间，初始图像有噪点；交互及编辑辅助阶段暂时使用生产编辑画布。光源规划估值／曝光、完整物理吊顶、真实反弹及既有高清和Cycles差异继续沿原契约，不把预览当作照度验收。

源正式文件校验：`D:\1601装修\Furnish项目\workspace.furnish.json`，SHA256 `B6E9CB91CB9210CA6C0A6050CF48C2C2CB70134DF790561B8750D49B77A2B509`（本轮隔离验收前后及正式只读复核）。历史5个detached工作树继续保留，本轮未新建分支／工作树。
