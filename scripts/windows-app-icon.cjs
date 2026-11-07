'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
function apply(executable,icon,{verifyOnly=false}={}){
 if(process.platform!=='win32')throw Error('EXE 图标资源更新仅支持Windows');
 const source=fs.readFileSync(path.join(__dirname,'windows-app-icon.ps1'),'utf8'),command='& {\n'+source+'\n} -Executable $env:FURNISH_ICON_EXE -Icon $env:FURNISH_ICON_ICO -VerifyOnly:([bool]::Parse($env:FURNISH_ICON_VERIFY))';
 const output=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{env:{...process.env,FURNISH_ICON_EXE:path.resolve(executable),FURNISH_ICON_ICO:path.resolve(icon),FURNISH_ICON_VERIFY:String(verifyOnly)},encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});return JSON.parse(output.replace(/^\uFEFF/,''));
}
if(require.main===module){try{if(!process.argv[2])throw Error('用法：node scripts/windows-app-icon.cjs <EXE> [ICO] [--verify]');console.log(JSON.stringify(apply(process.argv[2],process.argv[3]&&!process.argv[3].startsWith('--')?process.argv[3]:path.resolve(__dirname,'../assets/icons/furnish.ico'),{verifyOnly:process.argv.includes('--verify')})));}catch(e){console.error(e.stderr?.toString()||e.message);process.exitCode=1;}}
module.exports={apply};
