'use strict';
const path=require('node:path'),{spawn}=require('node:child_process'),{randomUUID}=require('node:crypto');
// The desktop uses the exact production server, including locks, backups and Blender.
async function connect({root,executable,port=8765,timeoutMs=20000}){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('FURNISH_PORT 必须是 1–65535 的端口号');
 const runtime=require(path.join(root,'scripts/server-runtime.cjs'));
 const entry=path.join(root,'scripts/serve.cjs'),fingerprint=runtime.fingerprint(entry);
 const url=`http://127.0.0.1:${port}/`;
 const matches=info=>info?.app==='furnish'&&info.protocol===1&&info.root===root&&info.fingerprint===fingerprint;
 const existing=await runtime.request(url+'api/furnish/server');
 if(existing){
  if(existing.app!=='furnish'||existing.protocol!==1||existing.root!==root)throw Error('端口 '+port+' 正被其他目录或其他服务使用。请先保存并关闭原服务，再启动桌面版。');
  if(matches(existing))return {url,owned:false,close:async()=>{}};
  // The production launcher already restarts a changed backend for this directory.
 }
 const owner=randomUUID(),child=spawn(executable,[entry],{cwd:root,windowsHide:true,env:{...process.env,ELECTRON_RUN_AS_NODE:'1',FURNISH_PORT:String(port),FURNISH_BACKEND_OWNER:owner},stdio:['ignore','pipe','pipe','ipc']});
 let output='',failure=null;
 const closed=new Promise(resolve=>{child.once('error',e=>{failure=e;resolve();});child.once('exit',resolve);});
 for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{output=(output+b.toString()).slice(-5000);});
 const close=async()=>{
  runtime.stopOwner?.(root,owner);
  // An automatic replacement inherits ownership, but has a different PID/IPC.
  const current=await runtime.request(url+'api/furnish/server');
  if(current?.app==='furnish'&&current.root===root&&current.owner===owner){
   await runtime.request(url+'api/furnish/server/shutdown',{method:'POST',token:current.token});
   const end=Date.now()+5000;while(Date.now()<end&&await runtime.request(url+'api/furnish/server'))await new Promise(r=>setTimeout(r,60));
  }
  if(child.exitCode===null){
  const timer=setTimeout(()=>child.kill(),5000);timer.unref();
  if(child.connected)child.send({type:'furnish-shutdown'},()=>{});else child.kill();
  await closed;clearTimeout(timer);
 }};
 try{
  const end=Date.now()+timeoutMs;
  while(Date.now()<end){
   if(failure||child.exitCode!==null)throw failure||Error(output||'本地服务启动失败');
   const info=await runtime.request(url+'api/furnish/server');
   if(info){
    if(matches(info))return {url,owned:info.pid===child.pid,close};
    if(info.root!==root||info.app!=='furnish')throw Error('端口已被另一个服务占用：'+port);
   }
   await new Promise(resolve=>setTimeout(resolve,120));
  }
  throw Error('本地服务启动超时。'+output);
 }catch(e){await close();throw e;}
}
module.exports={connect};
