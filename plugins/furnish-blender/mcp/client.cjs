'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),{spawn}=require('node:child_process'),{pathToFileURL}=require('node:url');
const Runtime=require('./runtime.cjs');
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
function request(port,key,headers,route,payload,timeout=45000){
 return new Promise((resolve,reject)=>{
  const body=payload===undefined?null:JSON.stringify(payload);
  const req=http.request({hostname:'127.0.0.1',port,path:route,method:body?'POST':'GET',headers:{authorization:'Bearer '+key,...headers,...(body?{'content-type':'application/json','content-length':Buffer.byteLength(body)}:{})}},res=>{
   const chunks=[];let size=0;res.on('data',b=>{size+=b.length;if(size>24*1024*1024)res.destroy(Error('Gateway response exceeds 24 MiB'));else chunks.push(b);});res.on('error',reject);
   res.on('end',()=>{try{const data=Buffer.concat(chunks);if(res.headers['content-type']?.includes('image/png')&&res.statusCode===200){let metadata={};if(res.headers['x-dsh-view'])metadata=JSON.parse(decodeURIComponent(res.headers['x-dsh-view']));resolve({png:data,metadata});}else{const value=JSON.parse(data.toString('utf8'));if(res.statusCode>=400&&value.ok!==false)value.ok=false;resolve(value);}}catch(e){reject(e);}});
  });
  const timer=setTimeout(()=>req.destroy(Error('Gateway deadline exceeded; read status before retrying a write.')),timeout);req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end(body);
 });
}
class Client{
 constructor({data=Runtime.dataDirectory(),port=Number(process.env.FURNISH_BLENDER_PORT||39878),session=process.env.CODEX_THREAD_ID||crypto.randomUUID(),agent='main',autoGui=process.env.FURNISH_BLENDER_AUTO_GUI!=='0'}={}){
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('FURNISH_BLENDER_PORT must be 1–65535');
  this.data=data;this.port=port;this.key=Runtime.token(data);this.session=session;this.agent=agent;this.attached=null;this.autoGui=autoGui;
  this.headers={'x-dsh-host-id':'furnish-codex','x-dsh-session-id':session,'x-dsh-agent-id':agent,'x-dsh-agent-role':'main','x-dsh-display-name':'Codex'};
 }
 async ensure(){
  if(this.starting)return this.starting;
  this.starting=this.connect();try{return await this.starting;}finally{this.starting=null;}
 }
 async connect(){
  const built=Runtime.prepare(this.data);
  const probe=async()=>{
   const info=await request(this.port,this.key,{},'/codex/identity',undefined,1500);
   if(info.name!=='furnish-codex-blender'||info.fingerprint!==Runtime.gatewayFingerprint(built)||info.data!==fs.realpathSync(this.data))throw Object.assign(Error('Gateway port belongs to another runtime or workspace; stop the old idle Gateway or select a different FURNISH_BLENDER_PORT.'),{conflict:true});
   return info;
  };
  try{return await probe();}catch(e){if(e.conflict)throw e;if(e.code!=='ECONNREFUSED')throw Error('Gateway port is occupied or unresponsive; no process was replaced: '+e.message);}
  const log=fs.openSync(path.join(this.data,'gateway.log'),'a');
  const child=spawn(process.execPath,[path.join(__dirname,'gateway.cjs')],{env:{...process.env,FURNISH_BLENDER_DATA:this.data,FURNISH_BLENDER_PORT:String(this.port)},windowsHide:true,detached:true,stdio:['ignore',log,log]});
  let launchError;child.on('error',e=>{launchError=e;});child.unref();fs.closeSync(log);
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){if(launchError)throw launchError;await new Promise(r=>setTimeout(r,150));try{return await probe();}catch(e){if(e.conflict)throw e;}}
  throw Error('Gateway did not start; inspect '+path.join(this.data,'gateway.log'));
 }
 async call(route,payload,timeout){await this.ensure();return request(this.port,this.key,this.headers,route,payload,timeout);}
 async sessionAction(action,args={}){
  if(action==='ensure')return {ok:true,session:await this.ready(true)};
  if(action==='doctor'||action==='status'){
   let r=await this.call('/'+action);const selected=await this.call('/lease',{action:'status',sessionId:this.attached||undefined});
   const instanceId=selected.ok&&selected.session?.status==='ready'?selected.session.instanceId:null;
   if(action==='doctor'&&instanceId&&r.addon?.kind==='ambiguous-instance'){
    const probe=await this.call('/cmd',{name:'get_addon_info',params:{}},5000);
    if(probe.ok===true&&!probe.result?.error)r={ok:true,kind:'ok',addon:{kind:'ok',instanceId,connected:true},readiness:{gateway:{live:true},addon:{connected:true,instanceId},bpy:{ok:true,error:null},instanceId,ready:true},probe:probe.result,config:r.config,globalDiagnosis:r};
   }
   const ownedReady=!!instanceId&&r.readiness?.bpy?.ok===true;
   const kind=ownedReady?'ok':r.kind||r.addon?.kind||'unavailable';
   return {...r,...(ownedReady?{readiness:{...r.readiness,instanceId,ready:true,addon:{...r.readiness.addon,instanceId}}}:{}),...(action==='doctor'?{kind,ok:r.ok!==false&&kind==='ok',config:{...r.config,http:'127.0.0.1:'+this.port,gateway:'127.0.0.1:'+this.port,addon:'ws://127.0.0.1:'+this.port+'/addon'}}:{})};
  }
  if(action==='list'){const sessions=await this.call('/lease',{action:'list'});return {...sessions,...await this.call('/codex/instances')};}
  if(!['list','attach','claim','detach','release','grant','revoke','grants','mark_read','presence','heartbeat','pause','resume'].includes(action))throw Error('Unsupported session action. Virtual GUI lifecycle stays outside this Codex adapter.');
  const payload={...args,action};
  for(const [snake,camel] of Object.entries({session_id:'sessionId',instance_id:'instanceId',grant_id:'grantId',ttl_ms:'ttlMs'}))if(args[snake]!==undefined){payload[camel]=args[snake];delete payload[snake];}
  payload.sessionId=payload.sessionId||this.attached||undefined;
  const result=await this.call('/lease',payload);
  if(result.ok&&['attach','claim'].includes(action))this.attached=result.session.id;
  if(result.ok&&['detach','release'].includes(action))this.attached=null;
  return result;
 }
 async ready(allowLaunch=this.autoGui){
  let r=await this.call('/lease',{action:'status',sessionId:this.attached||undefined});
  if(r.ok&&r.session?.status==='ready'){this.attached=r.session.id;return r.session;}
  if(!r.ok&&r.code!=='session_not_found')throw Error(JSON.stringify(r));
  if(!allowLaunch)throw Error('Attach a ready Blender instance using blender_session before GUI operations (automatic GUI launch is disabled).');
  const launched=await this.call('/codex/gui',{},45000);if(!launched.ok)throw Error(JSON.stringify(launched));
  r=await this.sessionAction('attach',{instance_id:launched.instance.instanceId});
  if(!r.ok||r.session?.status!=='ready')throw Error(JSON.stringify(r));
  return r.session;
 }
 async catalogModule(name){const b=Runtime.prepare(this.data);return import(pathToFileURL(path.join(b.engine,'runtime/catalog',name+'.js')).href);}
 async execute(name,a){
  if(name==='blender_session')return this.sessionAction(a.action,a.args||{});
  if(name==='blender_op'){
   const action=a.action||'plan',args=a.args||{};
   if(action==='plan'){
    if(!['catalog','help'].includes(a.op)&&args.dry_run!==true)await this.ready();
    return this.call('/plan',{op:a.op,args},300000);
   }
   if(!['loop','opt','preset','txn'].includes(action))throw Error('action must be plan, loop, opt, preset or txn');
   await this.ready();return this.call('/'+action,{...args,op:a.op,sessionId:this.attached},300000);
  }
  if(name==='blender_py'){
   if((!!a.code)===(!!a.file))throw Error('Supply exactly one of code or file');await this.ready();
   return this.call('/act',{code:a.code||'',file:a.file||null,py:true,sessionId:this.attached,timeoutMs:120000,waitMs:0},135000);
  }
  if(name==='blender_see'){
   const spec={...(a.args||{}),mode:a.viewpoint==='camera'?'camera':a.viewpoint==='custom'?'viewport':'current'};
   if(a.viewpoint==='custom'&&(!Array.isArray(spec.from)||!Array.isArray(spec.look_at)))throw Error('custom view requires args.from and args.look_at as three-number arrays');
   await this.ready();
   delete spec.asJson;return this.call('/view',spec,135000);
  }
  if(name==='blender_inspect'){
   const {COMMAND_CATALOG}=await this.catalogModule('commands');
   if(!a.command)return {ok:true,commands:Object.fromEntries(Object.entries(COMMAND_CATALOG).filter(([,v])=>v.access==='read'))};
   if(COMMAND_CATALOG[a.command]?.access!=='read')throw Error('Not a read-only command; use blender_py or blender_op');
   await this.ready();
   return this.call('/cmd',{name:a.command,params:a.args||{}},135000);
  }
  if(name==='blender_run'){
   const action=a.action||'list';if(!['submit','status','wait','collect','cancel','list','perf'].includes(action))throw Error('Unknown job action');
   const args={...(a.args||{})};
   if(action==='submit'&&!['headless','render'].includes(args.kind))throw Error('submit requires args.kind=headless or render');
   if(action==='submit'&&args.kind==='render'&&(args.script||args.script_file))throw Error('render does not accept Python; use kind=headless');
   if(['status','wait','collect','cancel'].includes(action)&&!a.id)throw Error('Job id required');
   if(action==='wait')args.timeout_ms=Math.max(1,Math.min(30000,Number(args.timeout_ms)||30000));
   return this.call('/job',{...args,surface:'queue',op:action,...(a.id?{id:a.id}:{})},45000);
  }
  throw Error('Unknown Blender tool: '+name);
 }
 async release(){if(this.attached)try{await request(this.port,this.key,this.headers,'/lease',{action:'release',sessionId:this.attached},2000);}catch{}this.attached=null;}
}
module.exports={Client,request,object};
