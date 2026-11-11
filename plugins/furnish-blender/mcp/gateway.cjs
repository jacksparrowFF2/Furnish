/* A shared, authenticated loopback Gateway. No DSH host packages or global addon changes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const Runtime=require('./runtime.cjs');
async function start({data=Runtime.dataDirectory(),port=Number(process.env.FURNISH_BLENDER_PORT||39878)}={}){
 const built=Runtime.prepare(data),key=Runtime.token(data);
 process.env.DSH_BLENDER_WORKDIR=path.join(data,'work');
 process.env.DSH_BLENDER_CONFIG=path.join(data,'engine-config.json');
 // Pin the configuration too: do not inherit an unrelated ~/.dsh profile.
 fs.writeFileSync(process.env.DSH_BLENDER_CONFIG,JSON.stringify({features:{virtualGui:'off'}}));
 process.env.DSH_HOST_ID='furnish-codex';
 let blender=process.env.FURNISH_BLENDER;
 if(!blender)try{let binding;try{binding=JSON.parse(fs.readFileSync(path.join(data,'furnish.json'),'utf8'));}catch{}const root=require('./furnish.cjs').rootOf(binding?.root);blender=require(path.join(root,'scripts/blender-server.cjs')).findBlender();}catch{/* Standalone installs can use upstream detection when no Furnish checkout is bound. */}
 if(blender)process.env.DSH_BLENDER_EXE=blender;
 process.env.DSH_QUEUE_STATE=path.join(data,'work/state/queue.json');
 const {createGatewayApp}=await import(pathToFileURL(path.join(built.engine,'runtime/gateway/app.js')).href);
 const {CFG}=await import(pathToFileURL(path.join(built.engine,'runtime/config.js')).href);
 const app=createGatewayApp({port,host:'127.0.0.1'}),handler=app.server.listeners('request')[0];
 const {currentCaller}=await import(pathToFileURL(path.join(built.engine,'runtime/http/caller.js')).href);
 const sendAddon=app.addonClient.send.bind(app.addonClient);
 // The upstream engine otherwise sees all ready instances. Route each caller to its attached session.
 app.addonClient.send=(type,params,timeout,opts={})=>{
  const caller=currentCaller(),instanceId=caller?app.sessionRegistry.listFor(caller)[0]?.instanceId:undefined;
  return sendAddon(type,params,timeout,{...opts,...(!opts.instanceId&&instanceId?{instanceId}:{})});
 };
 const identity={name:'furnish-codex-blender',version:'1.1.0',fingerprint:Runtime.gatewayFingerprint(built),data:fs.realpathSync(data),pid:process.pid,port};
 const gui=require('./gui.cjs').create({data,port:()=>app.server.address()?.port||port,blender:blender||CFG.blenderExe,instances:()=>app.addonGateway.list()});
 let lastRequest=Date.now();
 app.server.removeListener('request',handler);
 app.server.on('request',(req,res)=>{
  lastRequest=Date.now();
  if(req.headers.origin||req.headers.authorization!=='Bearer '+key){res.writeHead(403,{'content-type':'application/json'});res.end(JSON.stringify({ok:false,error:'Gateway authentication required; browser requests are not accepted.'}));return;}
  if(req.url==='/codex/identity'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(identity));return;}
  if(req.url==='/codex/instances'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,instances:app.addonGateway.list()}));return;}
  if(req.url==='/codex/gui'&&req.method==='POST'){
   req.resume();Promise.resolve().then(()=>gui.ensure(req.headers)).then(result=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(result));}).catch(e=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:false,code:'gui_launch_failed',error:e.message}));});return;
  }
  return handler(req,res);
 });
 await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(port,'127.0.0.1',resolve);});
 identity.port=app.server.address().port;
 fs.writeFileSync(path.join(data,'gateway.json'),JSON.stringify(identity,null,2));
 const stop=()=>{clearInterval(idle);app.close();};
 const idle=setInterval(()=>{
  // Keep background work alive after a Codex client disconnects; retire only when idle.
  const jobs=app.jobQueue.list();
  if(Date.now()-lastRequest>10*60*1000&&!app.addonGateway.list().some(x=>x.ready)&&!jobs.some(j=>!['completed','failed','canceled'].includes(j.state)))stop();
 },30000);idle.unref();
 process.once('SIGTERM',stop);process.once('SIGINT',stop);
 return {app,identity,gui,stop};
}
if(require.main===module)start().then(({identity})=>console.error(JSON.stringify(identity))).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={start};
