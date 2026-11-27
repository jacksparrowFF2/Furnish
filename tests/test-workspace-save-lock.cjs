'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fork}=require('node:child_process'),{once}=require('node:events');
const {create}=require('../scripts/workspace-files.cjs');

if(process.argv[2]==='writer'){
 const root=process.argv[3],readDirectory=fs.readdirSync;
 fs.readdirSync=(directory,...args)=>{
  if(directory===path.join(root,'projects','backups')){
   process.send('locked');
   const sleeper=new Int32Array(new SharedArrayBuffer(4)),deadline=Date.now()+30_000;
   while(Date.now()<deadline)Atomics.wait(sleeper,0,100);
  }
  return readDirectory(directory,...args);
 };
 create(root).compactBackups({apply:true});
}else{
 async function test(){
  const run=require('../scripts/lib/test-artifacts.cjs').createRun({prefix:'workspace-lock-'});
  const projects=run.discard('projects'),lock=path.join(projects,'.workspace.lock');
  fs.mkdirSync(path.join(projects,'backups'),{recursive:true});
  const api=create(run.dir),maintain=()=>api.compactBackups({apply:true});
  fs.writeFileSync(lock,'');
  assert.throws(maintain,{status:409,message:/旧版保存锁/});
  assert.equal(fs.statSync(lock).size,0);
  fs.unlinkSync(lock);
  const child=fork(__filename,['writer',run.dir]),exited=once(child,'exit');
  let passed=false;
  try{
   const ready=await Promise.race([once(child,'message').then(([value])=>value),exited.then(()=>null)]);
   assert.equal(ready,'locked');
   const lockOwner=fs.readFileSync(lock,'utf8');
   assert.throws(maintain,{status:423});
   assert.equal(fs.readFileSync(lock,'utf8'),lockOwner);
   child.kill('SIGKILL');
   await exited;
   assert.equal(fs.readFileSync(lock,'utf8'),lockOwner);
   assert.equal(maintain().count,0);
   assert.deepEqual(fs.readdirSync(projects),['backups']);
   passed=true;
  }finally{
   if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
   await exited;
   run.finish(passed);
  }
 }
 test().catch(error=>{console.error(error);process.exitCode=1;});
}
