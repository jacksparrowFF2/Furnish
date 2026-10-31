/* Fixed local launcher only. Replacement preserves origin, cache and pending UI. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),runtime=require('./server-runtime.cjs');
function create({entry,root,port,instance,busy=()=>false}){
 const current=runtime.watch(entry);let child=null,lastError='';
 function status(){let availableFingerprint;try{availableFingerprint=current();}catch(e){return {...instance,updateAvailable:true,updating:false,updateBusy:busy(),updateError:'后台代码尚未完整就绪：'+e.message};}return {...instance,availableFingerprint,updateAvailable:availableFingerprint!==instance.fingerprint,updating:!!child&&child.exitCode===null,updateBusy:busy(),...(lastError?{lastUpdateError:lastError}:{})};}
 function ensure(){
  const state=status();if(!state.updateAvailable||state.updating||state.updateError)return state;
  if(state.updateBusy)return state;
  try{runtime.validate(entry);}catch(e){lastError='后台代码校验未通过，已保留原服务和编辑：'+e.message;return status();}
  const log=path.join(root,'.local','backend-update.log');fs.mkdirSync(path.dirname(log),{recursive:true});if(fs.existsSync(log)&&fs.statSync(log).size>128000)fs.writeFileSync(log,'');const fd=fs.openSync(log,'a');lastError='';
  try{child=spawn(process.execPath,[entry],{cwd:root,windowsHide:true,detached:true,env:{...process.env,FURNISH_PORT:String(port),FURNISH_BACKEND_EXPECTED:state.availableFingerprint},stdio:['ignore',fd,fd]});child.once('error',e=>{lastError='后台启动失败：'+e.message;child=null;});child.once('exit',code=>{if(code)lastError='后台更新未完成，请查看本机后台更新日志（退出码 '+code+'）';});child.unref();}
  finally{fs.closeSync(fd);}
  return status();
 }
 return {status,ensure};
}
module.exports={create};
