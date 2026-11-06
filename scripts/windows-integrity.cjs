/* Read-only mandatory-integrity inspection. Never reset workspace security. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
function readIntegrity(file,{platform=process.platform,run=execFileSync}={}){
 if(platform!=='win32')return {supported:false};
 // Fixed read-only command; the path is data in an environment variable, never interpolated code.
 const source=fs.readFileSync(path.join(__dirname,'windows-integrity.ps1'),'utf8'),command='& {\n'+source+'\n} -LiteralPath $env:FURNISH_INTEGRITY_TARGET';
 let raw;try{raw=run('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{env:{...process.env,FURNISH_INTEGRITY_TARGET:path.resolve(file)},encoding:'utf8',windowsHide:true,timeout:15000,stdio:['ignore','pipe','pipe']});}catch(e){throw Error('无法读取 Windows 完整性标签，请检查程序路径、READ_CONTROL 权限和 PowerShell 可用性。',{cause:e});}
 const label=JSON.parse(raw.replace(/^\uFEFF/,''));if(!Number.isInteger(label.rid)||label.rid<0)throw Error('无效的 Windows 完整性标签');return {supported:true,...label};
}
function assertDesktopIntegrity(file,options){const label=readIntegrity(file,options);if(label.supported&&label.rid<8192)throw Error('桌面程序带有低完整性标签（S-1-16-'+label.rid+'），运行后无法创建 Electron 沙箱窗口站。请将整个桌面包部署到工作区外的正常完整性目录，并配置 .local/desktop-executable.json；不要重置仓库 ACL 或关闭沙箱。');return label;}
if(require.main===module){try{const file=process.argv[2];if(!file)throw Error('用法：node scripts/windows-integrity.cjs <文件或目录>');console.log(JSON.stringify({path:path.resolve(file),...readIntegrity(file)}));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={readIntegrity,assertDesktopIntegrity};
