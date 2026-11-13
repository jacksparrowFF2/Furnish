/* A local executable override relocates the runtime without moving user data. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
function desktopExecutable(root,{executable,env=process.env,platform=process.platform,arch=process.arch}={}){
 const file=path.join(root,'.local/desktop-executable.json');
 const configured=executable||env.FURNISH_DESKTOP_EXE||(fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')).executable:undefined);
 if(configured){if(typeof configured!=='string'||!path.isAbsolute(configured)||!fs.statSync(configured,{throwIfNoEntry:false})?.isFile())throw Error('配置的 Furnish 桌面程序不存在，请检查 .local/desktop-executable.json 或 FURNISH_DESKTOP_EXE。');return configured;}
 const names=platform==='darwin'?['Furnish.app/Contents/MacOS/Electron',`output/desktop/Furnish-darwin-${arch}/Furnish.app/Contents/MacOS/Electron`]:['Furnish.exe','output/desktop/Furnish-win32-x64/Furnish.exe'];
 const chosen=names.map(name=>path.join(root,name)).find(p=>fs.statSync(p,{throwIfNoEntry:false})?.isFile());
 if(!chosen)throw Error('未找到 Furnish 桌面程序，请先打包或配置本机程序路径。');return chosen;
}
if(require.main===module){try{const root=path.resolve(__dirname,'..'),env={...process.env,FURNISH_DESKTOP_ROOT:root},executable=desktopExecutable(root);require('./windows-integrity.cjs').assertDesktopIntegrity(executable);delete env.ELECTRON_RUN_AS_NODE;const child=spawn(executable,[],{cwd:root,env,detached:true,windowsHide:true,stdio:'ignore'});child.on('error',e=>{console.error(e.message);process.exitCode=1;});child.unref();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={desktopExecutable};
