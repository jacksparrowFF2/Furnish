/* Independent control thread: a blocked HTTP/event loop cannot answer restart requests. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const runtime=require('./server-runtime.cjs');
const recordPath=(root,port)=>path.join(root,'.local','server-runtime',port+'.json');
const controlPath=(root,port)=>'/recover/'+require('node:crypto').createHash('sha256').update(root+'\0'+port).digest('hex');
function read(root,port){
 try{
  const value=JSON.parse(fs.readFileSync(recordPath(root,port),'utf8'));
  return value.version===1&&value.root===root&&value.port===port&&Number.isInteger(value.pid)&&value.pid>0&&Number.isInteger(value.recoveryPort)&&value.recoveryPort>0&&value.recoveryPort<=65535&&typeof value.token==='string'&&/^[0-9a-f-]{36}$/.test(value.token)?value:null;
 }catch{return null;}
}
async function recover(root,port){
 const record=read(root,port);if(!record)return false;
 const result=await runtime.request(`http://127.0.0.1:${record.recoveryPort}${controlPath(root,port)}`,{method:'POST',token:record.token,timeoutMs:6000});
 return result?.recovering===true&&result.root===root&&result.pid===record.pid;
}
function start(instance,port){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(__filename,{workerData:{instance,port}});
  const failed=error=>reject(error);
  worker.once('error',failed);
  worker.on('message',message=>{
   if(message.type==='probe')worker.postMessage({type:'alive',nonce:message.nonce});
   if(message.type==='ready'){
    worker.removeListener('error',failed);
    worker.on('error',error=>console.error('Furnish recovery control unavailable: '+error.message));
    worker.unref();
    resolve(()=>{
     // A replacement may already have registered; only remove our own record.
     if(read(instance.root,port)?.token===instance.token)try{fs.unlinkSync(recordPath(instance.root,port));}catch{}
     worker.terminate();
    });
   }
  });
 });
}
if(!isMainThread){
 const http=require('node:http'),crypto=require('node:crypto');
 const {instance,port}=workerData;
 const probes=new Map();
 parentPort.on('message',message=>{if(message.type==='alive')probes.get(message.nonce)?.();});
 const responsive=()=>new Promise(resolve=>{
  const nonce=crypto.randomUUID();
  const finish=value=>{clearTimeout(timer);probes.delete(nonce);resolve(value);};
  const timer=setTimeout(()=>finish(false),1500);
  probes.set(nonce,()=>finish(true));parentPort.postMessage({type:'probe',nonce});
 });
 let checking;
 const server=http.createServer(async(req,res)=>{
  const host=req.headers.host||'',origin=req.headers.origin;
  const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  if(req.url!==controlPath(instance.root,port)||req.method!=='POST'||req.headers['x-furnish-restart']!==instance.token||!/^127\.0\.0\.1:\d+$/.test(host)||origin&&origin!=='http://'+host||req.headers['sec-fetch-site']==='cross-site'){
   reply(403,{error:'Invalid local recovery request'});return;
  }
  // Two fresh pings prevent a single delayed event-loop turn from causing termination.
  checking??=(async()=>!(await responsive())&&!(await responsive()))().finally(()=>{checking=null;});
  const stalled=await checking;
  reply(200,{recovering:stalled,root:instance.root,pid:process.pid});
  // This worker can only terminate its own process, never a PID from a file or port scan.
  if(stalled)setTimeout(()=>process.kill(process.pid,'SIGKILL'),100);
 });
 server.listen(0,'127.0.0.1',()=>{
  const file=recordPath(instance.root,port);
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  fs.writeFileSync(file,JSON.stringify({version:1,root:instance.root,port,pid:process.pid,token:instance.token,recoveryPort:server.address().port}),{mode:0o600});
  parentPort.postMessage({type:'ready'});
 });
}
module.exports={start,recover};
