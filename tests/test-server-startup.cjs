'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const path=require('node:path');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function run(port,cwd=root){
 const child=spawn(process.execPath,['scripts/serve.cjs'],{cwd,env:{...process.env,FURNISH_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let output='';
 const closed=new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>resolve({code,output}));});
 const ready=new Promise((resolve,reject)=>{
  child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('Close this window'))resolve();});
  child.stderr.on('data',chunk=>{output+=chunk;});
  child.on('exit',()=>reject(Error('Exited before ready: '+output)));
  child.on('error',reject);
 });
 // Most invocations intentionally exit without becoming a server.
 ready.catch(()=>{});
 return {child,closed,ready};
}
function listen(server){return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server.address().port));});}
(async()=>{
 const reservation=http.createServer();
 const port=await listen(reservation);
 await new Promise(resolve=>reservation.close(resolve));
 const first=run(port);
 try{
  await first.ready;
  const reused=await run(port).closed;
  assert.equal(reused.code,0,reused.output);
  assert.match(reused.output,/Furnish is already running/);
  assert.equal(first.child.exitCode,null,'Original server must stay running');
 }finally{first.child.kill();await first.closed;}
 // Exercise real disk changes in an isolated checkout, never the user's sources/data.
 const output=path.join(root,'output');fs.mkdirSync(output,{recursive:true});
 const isolated=fs.mkdtempSync(path.join(output,'server-startup-'));
 let active;
 try{
  fs.mkdirSync(path.join(isolated,'scripts'));
  for(const file of ['serve.cjs','repository-server.cjs','server-runtime.cjs','blender-server.cjs','blender-render.py'])fs.copyFileSync(path.join(root,'scripts',file),path.join(isolated,'scripts',file));
  fs.cpSync(path.join(root,'src'),path.join(isolated,'src'),{recursive:true});
  active=run(port,isolated);await active.ready;
  const url=`http://127.0.0.1:${port}`;
  const info=await (await fetch(url+'/api/furnish/server')).json();
  assert.equal(info.pid,active.child.pid);
  assert.equal((await fetch(url+'/api/furnish/blender/status')).status,200);
  assert.equal((await fetch(url+'/api/furnish/server/restart',{method:'POST'})).status,403);
  assert.equal((await fetch(url+'/api/furnish/server/restart',{method:'POST',headers:{'X-Furnish-Restart':info.token,Origin:'https://other.example'}})).status,403);
  // A different checkout cannot stop or reuse this server.
  const other=await run(port).closed;assert.equal(other.code,1);
  const plan=require('../src/data/plans.js')[0];
  const work=require('../src/core/work-state.js').create({makeId:()=>require('node:crypto').randomUUID(),colorFor:()=>'#aabbcc',materials:require('../src/data/catalog.js').materials}).fresh(plan);
  const workspace={v:2,planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[]};
  const saved=await fetch(url+'/api/furnish/workspace',{method:'PUT',headers:{'Content-Type':'application/json','X-Furnish-Request':'workspace-v1'},body:JSON.stringify({workspace,baseRevision:null})});
  assert.equal(saved.status,200);const revision=(await saved.json()).revision;
  // Frontend edits and touching identical backend bytes do not require a restart.
  fs.writeFileSync(path.join(isolated,'index.html'),'<title>Frontend edit</title>');
  fs.appendFileSync(path.join(isolated,'src/ui/repository-workspace.js'),'\n// Frontend-only edit\n');
  fs.utimesSync(path.join(isolated,'scripts/serve.cjs'),new Date(),new Date());
  assert.equal((await run(port,isolated).closed).code,0);
  assert.equal((await (await fetch(url+'/api/furnish/server')).json()).pid,info.pid);
  // kitchen-core is a lazy validation dependency; it must still be fingerprinted.
  fs.appendFileSync(path.join(isolated,'src/core/kitchen-core.js'),'\n// Updated backend validation\n');
  const old=active;active=run(port,isolated);await active.ready;await old.closed;
  const updated=await (await fetch(url+'/api/furnish/server')).json();
  assert.notEqual(updated.pid,info.pid);assert.notEqual(updated.fingerprint,info.fingerprint);
  fs.appendFileSync(path.join(isolated,'scripts/blender-server.cjs'),'\n// Updated render bridge\n');
  const previousRender=active;active=run(port,isolated);await active.ready;await previousRender.closed;
  assert.notEqual((await (await fetch(url+'/api/furnish/server')).json()).fingerprint,updated.fingerprint);
  assert.equal((await (await fetch(url+'/api/furnish/workspace')).json()).revision,revision);
  assert.equal((await run(port,isolated).closed).code,0);
  const afterRestart=await fetch(url+'/api/furnish/workspace',{method:'PUT',headers:{'Content-Type':'application/json','X-Furnish-Request':'workspace-v1'},body:JSON.stringify({workspace,baseRevision:revision})});
  assert.equal(afterRestart.status,200,'New backend must still accept file saves');
  fs.appendFileSync(path.join(isolated,'scripts/serve.cjs'),'\n// Updated startup code\n');
  const previous=active;active=run(port,isolated);await active.ready;await previous.closed;
  assert.notEqual((await (await fetch(url+'/api/furnish/server')).json()).pid,updated.pid);
 }finally{
  if(active){active.child.kill();await active.closed;}
  assert.ok(path.resolve(isolated).startsWith(path.resolve(output)+path.sep));fs.rmSync(isolated,{recursive:true,force:true});
 }
 const unrelated=http.createServer((req,res)=>res.end('Not Furnish'));
 try{
  const result=await run(await listen(unrelated)).closed;
  assert.equal(result.code,1);
  assert.match(result.output,/another or unrecognized service/);
 }finally{await new Promise(resolve=>unrelated.close(resolve));}
 const stalled=http.createServer(()=>{});
 try{
  const result=await run(await listen(stalled)).closed;
  assert.equal(result.code,1);
  assert.match(result.output,/another or unrecognized service/);
 }finally{stalled.closeAllConnections();await new Promise(resolve=>stalled.close(resolve));}
 console.log('Server startup: fresh start, reuse, backend update/restart with saved data, frontend-only changes, checkout identity, control authorization, unrelated service and timeout passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
