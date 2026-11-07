/* Local lifecycle metadata only: no project content, URLs, tokens or command lines. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
function start({root,app,proc=process,interval=30000}){
 const directory=path.join(root,'.local','desktop-runtime'),file=path.join(directory,'events.jsonl');
 function record(event,details={}){try{fs.mkdirSync(directory,{recursive:true});if(fs.existsSync(file)&&fs.statSync(file).size>1024*1024){const previous=file+'.previous';if(fs.existsSync(previous))fs.unlinkSync(previous);fs.renameSync(file,previous);}fs.appendFileSync(file,JSON.stringify({time:new Date().toISOString(),pid:proc.pid,event,...details})+'\n');}catch{/* Diagnostics must not terminate or block saving. */}}
 record('start',{electron:proc.versions?.electron,node:proc.versions?.node});
 const heartbeat=()=>{try{record('heartbeat',{processes:app.getAppMetrics().map(p=>({pid:p.pid,type:p.type,cpu:p.cpu?.percentCPUUsage,workingSetKB:p.memory?.workingSetSize,privateKB:p.memory?.privateBytes}))});}catch(e){record('metrics-error',{message:e.message});}};
 const timer=setInterval(heartbeat,interval);timer.unref();
 app.on('before-quit',()=>record('before-quit'));app.on('will-quit',()=>record('will-quit'));app.on('window-all-closed',()=>record('window-all-closed'));app.on('quit',(_event,exitCode)=>record('quit',{exitCode}));
 app.on('child-process-gone',(_event,d)=>record('child-process-gone',{type:d.type,reason:d.reason,exitCode:d.exitCode}));
 proc.on('uncaughtExceptionMonitor',e=>record('uncaught-exception',{message:e.message,stack:e.stack}));proc.on('exit',exitCode=>{clearInterval(timer);record('process-exit',{exitCode});});
 function window(win){win.on('unresponsive',()=>record('window-unresponsive'));win.on('responsive',()=>record('window-responsive'));win.on('close',()=>record('window-close-request'));win.on('closed',()=>record('window-closed'));win.webContents.on('render-process-gone',(_event,d)=>record('render-process-gone',{reason:d.reason,exitCode:d.exitCode}));}
 return {record,window,heartbeat,file};
}
module.exports={start};
