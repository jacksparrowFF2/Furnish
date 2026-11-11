/* Host-managed GUI launch: per caller, isolated preferences, exact addon identity, no user-window takeover. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const Runtime=require('./runtime.cjs');
function callerId(headers){
 const host=headers['x-dsh-host-id'],session=headers['x-dsh-session-id'];
 if(typeof host!=='string'||typeof session!=='string'||!host||!session)throw Error('GUI launch requires caller identity');
 return 'codex-gui-'+crypto.createHash('sha256').update(host+'\0'+session).digest('hex').slice(0,24);
}
function alive(pid){try{process.kill(pid,0);return true;}catch(e){return e.code==='EPERM';}}
function create({data,port,blender,instances,spawnImpl=spawn,timeout=40000,delay=ms=>new Promise(r=>setTimeout(r,ms)),now=Date.now}={}){
 const pending=new Map(),children=new Map();
 async function launch(id){
  const found=()=>instances().find(x=>x.instanceId===id&&x.ready);
  if(found())return {ok:true,instance:found(),reused:true};
  const directory=path.join(data,'gui',id),record=path.join(directory,'process.json'),log=path.join(directory,'blender.log');
  fs.mkdirSync(directory,{recursive:true});let saved;try{saved=JSON.parse(fs.readFileSync(record,'utf8'));}catch{}
  let child,error,launched=false;
  if(!saved||saved.instanceId!==id||!Number.isInteger(saved.pid)||!alive(saved.pid)){
   if(!blender)throw Error('Blender not found; bind a Furnish checkout or set FURNISH_BLENDER.');
   const bootstrap=path.join(directory,'connect.py'),blend=path.join(directory,'workspace.blend'),extension=path.join(Runtime.plugin,'vendor/dsh/extension');
   const code=['import sys, os, json, bpy','sys.dont_write_bytecode = True','sys.path.insert(0, '+JSON.stringify(extension)+')','import dsh_blender_bridge','dsh_blender_bridge.register()',
    'if not bpy.data.filepath:','    bpy.context.scene["furnishCodexManaged"] = '+JSON.stringify(id),'    bpy.ops.wm.save_as_mainfile(filepath='+JSON.stringify(blend)+')',
    'with open('+JSON.stringify(record)+', "w", encoding="utf-8") as receipt:','    json.dump({"pid": os.getpid(), "instanceId": '+JSON.stringify(id)+'}, receipt)',
    'bpy.ops.dshbb.start_server()',''].join('\n');
   fs.writeFileSync(bootstrap,code);
   const argv=['--factory-startup','--disable-autoexec'];if(fs.existsSync(blend))argv.push(blend);argv.push('--python',bootstrap);
   const fd=fs.openSync(log,'a');
   try{child=spawnImpl(blender,argv,{env:{...process.env,BLENDER_USER_CONFIG:path.join(directory,'config'),BLENDER_USER_SCRIPTS:path.join(directory,'scripts'),DSHBB_GATEWAY_PORT:String(typeof port==='function'?port():port),DSHBB_INSTANCE_ID:id,DSHBB_SESSION_KIND:'user-gui'},windowsHide:false,detached:true,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
   child.on('error',e=>{error=e;});child.unref?.();children.set(id,child);launched=true;
   if(Number.isInteger(child.pid))fs.writeFileSync(record,JSON.stringify({pid:child.pid,instanceId:id}));
  }
  const deadline=now()+timeout;
  while(now()<deadline){if(error)throw Error('Could not open Blender: '+error.message+'; log: '+log);const instance=found();if(instance)return {ok:true,instance,reused:!launched,workspace:path.join(directory,'workspace.blend'),log};await delay(200);}
  throw Error('Blender did not connect before the deadline; inspect '+log+'. The window and saved workspace were preserved; no automatic relaunch or takeover was attempted.');
 }
 function ensure(headers){const id=callerId(headers);if(!pending.has(id)){const work=launch(id).finally(()=>pending.delete(id));pending.set(id,work);}return pending.get(id);}
 return {ensure,children};
}
module.exports={create,callerId};
