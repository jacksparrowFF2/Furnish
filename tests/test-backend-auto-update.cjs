'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {connect}=require('../desktop/backend.cjs'),Runtime=require('../scripts/server-runtime.cjs'),C=require('../src/core/repository-core.js'),Client=require('../src/io/repository-storage.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output');fs.mkdirSync(out,{recursive:true});const isolated=fs.mkdtempSync(path.join(out,'auto-backend-'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const s=http.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n;}
async function until(fn){const end=Date.now()+30000;while(Date.now()<end){const value=await fn();if(value)return value;await sleep(100);}throw Error('Timed out waiting for automatic backend replacement');}
(async()=>{
 let owner,client;
 try{
  fs.mkdirSync(path.join(isolated,'scripts'));for(const name of require('../scripts/package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(isolated,'scripts',name));fs.cpSync(path.join(root,'src'),path.join(isolated,'src'),{recursive:true});
  const plan=require('../src/data/plans.js')[0],work=require('../src/core/work-state.js').create({makeId:()=> 'fixture',colorFor:()=> '#eee',materials:{}}).fresh(plan);work.furniture=[];
  const seed={v:40,planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[]};fs.mkdirSync(path.join(isolated,'projects'));const file=path.join(isolated,'projects/workspace.furnish.json');fs.writeFileSync(file,C.text(seed));
  const model=path.join(isolated,'src/render/fridge-model.js');assert(fs.existsSync(model));fs.appendFileSync(model,'\n// automatic generation A\n');
  const port=await freePort();owner=await connect({root:fs.realpathSync(isolated),port,executable:process.execPath});const url=owner.url,metadata=()=>Runtime.request(url+'api/furnish/server');
  const before=await metadata(),original=hash(file);assert.equal(before.updateAvailable,false);
  const raced=require('node:child_process').spawn(process.execPath,[path.join(isolated,'scripts/serve.cjs')],{cwd:isolated,env:{...process.env,FURNISH_PORT:String(port),FURNISH_BACKEND_EXPECTED:'0'.repeat(64)},stdio:'ignore',windowsHide:true});assert.equal(await new Promise(r=>raced.once('exit',r)),1);assert.equal((await metadata()).pid,before.pid,'a changed generation must not replace the old service');
  const denied=await fetch(url+'api/furnish/server/ensure',{method:'POST',headers:{'X-Furnish-Restart':'invalid'}});assert.equal(denied.status,403);
  const cross=await fetch(url+'api/furnish/server/ensure',{method:'POST',headers:{'X-Furnish-Restart':before.token,Origin:'https://untrusted.example'}});assert.equal(cross.status,403);
  const stat=fs.statSync(model);fs.writeFileSync(model,fs.readFileSync(model,'utf8').replace('automatic generation A','automatic generation B'));fs.utimesSync(model,stat.atime,stat.mtime);
  const stale=await metadata();assert(stale.updateAvailable,'same-size model edit with restored mtime must be detected');
  const busy=require('../scripts/backend-update.cjs').create({entry:path.join(isolated,'scripts/serve.cjs'),root:isolated,port,instance:before,busy:()=>true}).ensure();assert(busy.updateBusy);assert(!busy.updating,'a rendering task must prevent automatic restart');assert.equal((await metadata()).pid,before.pid);
  const results=await Promise.all([1,2].map(()=>fetch(url+'api/furnish/server/ensure',{method:'POST',headers:{'X-Furnish-Restart':stale.token}})));assert(results.some(r=>r.status===200));assert(results.every(r=>[200,403].includes(r.status)));
  const next=await until(async()=>{const info=await metadata();return info&&info.pid!==before.pid&&!info.updateAvailable&&!info.updating&&info;});assert.equal(next.owner,before.owner);assert.equal(hash(file),original,'updating alone must never write the project');
  const request=async(route,method='GET',body)=>{const r=await fetch(url+'api/furnish'+route,{method,headers:body?{'Content-Type':'application/json','X-Furnish-Request':'workspace-v1'}:{},...(body?{body:JSON.stringify(body)}:{})});const v=await r.json();if(!r.ok)throw Object.assign(Error(v.error),{status:r.status,code:v.code});return v;};
  client=Client.create({request,fingerprint:async v=>crypto.createHash('sha256').update(C.text(v)).digest('hex'),onChange(){},delay:60000,debounce:false});await client.initialize([]);
  // A changed minimum-format rule must not change the base revision of the
  // untouched recorded file. The successful next write adopts the new format.
  fs.appendFileSync(path.join(isolated,'src/core/project-core.js'),"\nif(typeof module==='object'&&module.exports){const prior=module.exports.formatVersion;module.exports.formatVersion=(...args)=>Math.max(40,prior(...args));}\n");
  fs.writeFileSync(model,fs.readFileSync(model,'utf8').replace('automatic generation B','automatic generation C'));
  const edit=structuredClone(seed);edit.work[plan.id].ceilingHeight=2701;client.schedule(edit);await assert.rejects(client.flush(),e=>e.code==='BACKEND_UPDATING');assert.equal(hash(file),original);assert(client.pending);
  const latest=structuredClone(edit);latest.work[plan.id].ceilingHeight=2702;client.schedule(latest);
  await until(()=>client.status.mode==='saved'&&!client.pending);assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).workspace.work[plan.id].ceilingHeight,2702);assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).version,40);assert.notEqual((await metadata()).pid,next.pid);
  client.stop();await owner.close();owner=null;await assert.rejects(fetch(url));
  const late=require('node:child_process').spawn(process.execPath,[path.join(isolated,'scripts/serve.cjs')],{cwd:isolated,env:{...process.env,FURNISH_PORT:String(port),FURNISH_BACKEND_OWNER:before.owner},stdio:'ignore',windowsHide:true});assert.equal(await new Promise(r=>late.once('exit',r)),0);await assert.rejects(fetch(url),'a late replacement cannot restart after its desktop closed');
  console.log('PASS lazy model/asset fingerprints, preserved-mtime update, authenticated concurrent replacement, same origin and data, old-page automatic retry/latest pending edits, inherited ownership and shutdown');
 }finally{client?.stop();if(owner)await owner.close();assert(path.resolve(isolated).startsWith(path.resolve(out)+path.sep));await sleep(300);await fs.promises.rm(isolated,{recursive:true,force:true,maxRetries:20,retryDelay:100});}
})().catch(e=>{console.error(e);process.exitCode=1;});
