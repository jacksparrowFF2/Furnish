'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process');
const runtime=require('../scripts/server-runtime.cjs'),recovery=require('../scripts/server-recovery.cjs');
const root=path.resolve(__dirname,'..'),output=path.join(root,'output');
const children=new Set();
function run(cwd,port){
 const child=spawn(process.execPath,['scripts/serve.cjs'],{cwd,env:{...process.env,FURNISH_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let logs='';
 const closed=new Promise(resolve=>child.once('exit',code=>resolve({code,logs})));
 const ready=new Promise((resolve,reject)=>{
  child.stdout.on('data',b=>{logs+=b;if(logs.includes('Close this window'))resolve();});
  child.stderr.on('data',b=>{logs+=b;});child.once('error',reject);
  child.once('exit',()=>reject(Error(logs)));
 });
 ready.catch(()=>{});
 const running={child,closed,ready};children.add(running);closed.then(()=>children.delete(running));return running;
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const isolated=fs.realpathSync(fs.mkdtempSync(path.join(output,'server-recovery-')));
 let active,contender;
 const reservation=http.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));
 const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const url=`http://127.0.0.1:${port}`;
 try{
  fs.mkdirSync(path.join(isolated,'scripts'));
  for(const file of require('../scripts/package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(root,'scripts',file),path.join(isolated,'scripts',file));
  fs.cpSync(path.join(root,'src'),path.join(isolated,'src'),{recursive:true});
  // Block only the real production main thread; its independent recovery thread stays alive.
  const entry=path.join(isolated,'scripts/serve.cjs');
  fs.writeFileSync(entry,fs.readFileSync(entry,'utf8').replace('if(control(req,res)',"if(req.url==='/test-hang'){res.end('blocking');setImmediate(()=>{while(true){}});return;}if(control(req,res)"));
  active=run(isolated,port);await active.ready;
  const recordFile=path.join(isolated,'.local/server-runtime',port+'.json');
  const record=JSON.parse(fs.readFileSync(recordFile,'utf8'));
  const route='/recover/'+require('node:crypto').createHash('sha256').update(isolated+'\0'+port).digest('hex');
  const control=`http://127.0.0.1:${record.recoveryPort}${route}`;
  assert.equal((await fetch(control,{method:'POST'})).status,403);
  assert.equal((await fetch(control,{method:'POST',headers:{'X-Furnish-Restart':record.token,Origin:'https://other.example'}})).status,403);
  assert.equal(await recovery.recover(isolated,port),false,'A responsive main thread must never be killed');
  assert.equal(active.child.exitCode,null);
  // Seed a real saved workspace, then recover without losing its revision or bytes.
  const plan=require('../src/data/plans.js')[0];
  const work=require('../src/core/work-state.js').create({makeId:()=>require('node:crypto').randomUUID(),colorFor:()=>'#aabbcc',materials:require('../src/data/catalog.js').materials}).fresh(plan);
  const workspace={v:2,planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[]};
  const saved=await fetch(url+'/api/furnish/workspace',{method:'PUT',headers:{'Content-Type':'application/json','X-Furnish-Request':'workspace-v1'},body:JSON.stringify({workspace,baseRevision:null})});
  assert.equal(saved.status,200);const revision=(await saved.json()).revision;
  const savedBytes=fs.readFileSync(path.join(isolated,'projects/workspace.furnish.json'));
  await fetch(url+'/test-hang');
  assert.equal(await runtime.request(url+'/api/furnish/server'),null);
  // A different directory, a forged token and a stale record must fail closed.
  const otherRoot=path.join(isolated,'other');
  fs.mkdirSync(path.join(otherRoot,'.local/server-runtime'),{recursive:true});
  fs.writeFileSync(path.join(otherRoot,'.local/server-runtime',port+'.json'),JSON.stringify({...record,root:otherRoot}));
  assert.equal(await recovery.recover(otherRoot,port),false,'A copied registry cannot authorize another directory');
  assert.equal((await run(root,port).closed).code,1);
  fs.writeFileSync(recordFile,JSON.stringify({...record,token:require('node:crypto').randomUUID()}));
  assert.equal(await recovery.recover(isolated,port),false);
  assert.equal(active.child.exitCode,null);
  fs.writeFileSync(recordFile,JSON.stringify(record));
  const old=active;active=run(isolated,port);contender=run(isolated,port);
  const outcome=process=>Promise.race([process.ready.then(()=>true),process.closed.then(result=>{assert.equal(result.code,0,result.logs);return false;})]);
  const outcomes=await Promise.all([outcome(active),outcome(contender)]);
  assert.equal(outcomes.filter(Boolean).length,1,'Exactly one simultaneous launcher must own the server');
  if(!outcomes[0])active=contender;
  contender=null;
  assert.match((await old.closed).logs,/Furnish:/);
  const info=await runtime.request(url+'/api/furnish/server');
  assert.equal(info.pid,active.child.pid);assert.notEqual(info.pid,record.pid);
  assert.equal((await (await fetch(url+'/api/furnish/workspace')).json()).revision,revision);
  assert.deepEqual(fs.readFileSync(path.join(isolated,'projects/workspace.furnish.json')),savedBytes);
  assert.equal((await run(isolated,port).closed).code,0,'Recovered service can be reused');
  active.child.kill();await active.closed;active=null;
  assert.equal(await recovery.recover(isolated,port),false,'A dead controller cannot authorize recovery');
 }finally{
  const remaining=[...children];
  for(const process of remaining)process.child.kill('SIGKILL');
  await Promise.all(remaining.map(process=>process.closed));
  assert.ok(isolated.startsWith(fs.realpathSync(output)+path.sep));fs.rmSync(isolated,{recursive:true,force:true});
 }
 console.log('Server recovery: real main-thread hang, concurrent same-port recovery/reuse, saved bytes/revision, healthy process, cross-directory, token/origin and stale controller protection passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
