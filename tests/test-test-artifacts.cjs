'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{once}=require('node:events');
const T=require('../scripts/lib/test-artifacts.cjs'),helper=require.resolve('../scripts/lib/test-artifacts.cjs');
(async()=>{
 const suite=T.createRun({prefix:'artifact-contract-',removeEntire:true}),root=suite.dir;
 const make=options=>T.createRun({root,parent:path.join(root,'jobs'),prefix:'case-',...options});
 let passed=false,child;
 try{
  const source=path.join(root,'source');for(const dir of ['src','assets','scripts','projects','docs'])fs.mkdirSync(path.join(source,dir),{recursive:true});
  for(const file of ['src/app.js','assets/model.glb','scripts/test.cjs','index.html','projects/workspace.furnish.json','docs/baseline.md','docs/changed.md'])fs.writeFileSync(path.join(source,file),'source:'+file);
  const job=make(),work=job.workspace('workspace',source,{directories:['src','assets','scripts','docs']}),out=path.join(work,'output');fs.mkdirSync(out);
  fs.writeFileSync(path.join(work,'docs/new-evidence.png'),'evidence');fs.writeFileSync(path.join(work,'docs/changed.md'),'new report');
  fs.writeFileSync(path.join(work,'src/app.js'),'private edit');assert.equal(fs.readFileSync(path.join(source,'src/app.js'),'utf8'),'source:src/app.js','workspace copies must not hard-link production inputs');
  fs.writeFileSync(path.join(out,'preview.html'),'generated');fs.writeFileSync(path.join(out,'snapshot.json'),'before');job.generated(out);
  fs.writeFileSync(path.join(out,'snapshot.json'),'after');fs.writeFileSync(path.join(out,'result.png'),'evidence');fs.writeFileSync(path.join(job.dir,'report.json'),'report');
  const status=job.finish(true);assert.equal(status.cleaned,true);assert(!fs.existsSync(path.join(work,'src')));assert(!fs.existsSync(path.join(work,'assets')));assert(!fs.existsSync(path.join(work,'index.html')));assert(!fs.existsSync(path.join(out,'preview.html')));
  assert.equal(fs.readFileSync(path.join(out,'snapshot.json'),'utf8'),'after');assert(fs.existsSync(path.join(out,'result.png')));assert(fs.existsSync(path.join(work,'projects/workspace.furnish.json')));assert(fs.existsSync(path.join(job.dir,'report.json')));assert(!fs.existsSync(path.join(job.dir,'.furnish-test-lock.json')));
  assert(!fs.existsSync(path.join(work,'docs/baseline.md')));assert(fs.existsSync(path.join(work,'docs/new-evidence.png')));assert.equal(fs.readFileSync(path.join(work,'docs/changed.md'),'utf8'),'new report');
  assert.equal(job.finish(false),status,'finish must be idempotent');assert.throws(()=>job.discard('../outside'),/escapes/);
  const failed=make();failed.workspace('workspace',source);failed.finish(false);assert(fs.existsSync(path.join(failed.dir,'workspace/src/app.js')));assert.equal(JSON.parse(fs.readFileSync(path.join(failed.dir,'.furnish-test-run.json'))).status,'failed');
  const resumed=T.openRun(failed.dir,{root,existing:true});resumed.finish(true);assert(!fs.existsSync(path.join(failed.dir,'workspace/src')));
  for(const mode of ['environment','pin']){
   const keep=make({env:mode==='environment'?{FURNISH_KEEP_TEST_WORKSPACES:'1'}:{}});keep.workspace('workspace',source);
   if(mode==='pin')fs.writeFileSync(path.join(keep.dir,'.keep'),'keep for inspection');
   assert.equal(keep.finish(true).kept,true);assert(fs.existsSync(path.join(keep.dir,'workspace/src/app.js')));
  }
  const unknown=path.join(root,'legacy');fs.mkdirSync(unknown);fs.writeFileSync(path.join(unknown,'unique.blend'),'unique');const old=T.openRun(unknown,{root,existing:true});assert.equal(old.finish(true).kept,true);assert.equal(T.openRun(unknown,{root,existing:true}).finish(true).kept,true);assert(fs.existsSync(path.join(unknown,'unique.blend')));
  const tampered=make();tampered.discard('work');fs.mkdirSync(path.join(tampered.dir,'work'));const meta=path.join(tampered.dir,'.furnish-test-run.json'),foreign={token:'foreign',pid:99999};fs.writeFileSync(meta,JSON.stringify(foreign));assert(tampered.finish(true).cleanupError);assert.deepEqual(JSON.parse(fs.readFileSync(meta)),foreign);assert(fs.existsSync(path.join(tampered.dir,'work')));
  const linked=make(),outside=path.join(root,'outside');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'keep.txt'),'safe');linked.discard('work');fs.mkdirSync(path.join(linked.dir,'work'));const junction=path.join(linked.dir,'work/link');
  fs.symlinkSync(outside,junction,process.platform==='win32'?'junction':'dir');assert(linked.finish(true).cleanupError);assert.equal(fs.readFileSync(path.join(outside,'keep.txt'),'utf8'),'safe');fs.unlinkSync(junction);
  const script="const fs=require('node:fs'),path=require('node:path'),T=require(process.argv[1]);const job=T.createRun({root:process.argv[2],parent:path.join(process.argv[2],'process'),prefix:'active-'});job.workspace('workspace',process.argv[3]);process.send(job.dir);process.on('message',()=>{});";
  child=cp.spawn(process.execPath,['-e',script,helper,root,source],{stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});const [active]=await once(child,'message');
  assert.throws(()=>T.openRun(active,{root,existing:true}),/locked/);const neighbor=make();neighbor.finish(true);assert(fs.existsSync(path.join(active,'workspace/src/app.js')),'another successful job must not sweep an active job');
  const activeLock=path.join(active,'.furnish-test-lock.json'),lockBytes=fs.readFileSync(activeLock);fs.unlinkSync(activeLock);assert.throws(()=>T.openRun(active,{root,existing:true}),/live process/,'a missing lock must not make a live owner disposable');fs.writeFileSync(activeLock,lockBytes);
  const closed=once(child,'close');child.kill();await closed;child=null;
  assert(fs.existsSync(path.join(active,'workspace/src/app.js')));assert.throws(()=>T.openRun(active,{root,existing:true}),/locked/,'interrupted work is not automatically reclaimed');
  for(const fail of [false,true]){
   const prefix=path.join(root,'fixtures',fail?'failure-':'success-');
   // temporaryDirectory uses the checkout output boundary, including this nested synthetic suite.
   const code="const fs=require('node:fs'),T=require(process.argv[1]),dir=T.temporaryDirectory(process.argv[2]);fs.writeFileSync(dir+'/fixture.json','fixture');console.log(dir);"+(fail?'process.exitCode=1;':'');
   const result=cp.spawnSync(process.execPath,['-e',code,helper,prefix],{encoding:'utf8',windowsHide:true});assert.equal(result.status,fail?1:0,result.stderr);const dir=result.stdout.trim();assert.equal(fs.existsSync(dir),fail);
  }
  passed=true;console.log('PASS test output success/failure, artifact retention, copy isolation, active/interrupted locks, resume, pins, legacy boundaries, ownership and junction refusal');
 }finally{if(child){const closed=once(child,'close');child.kill();await closed;}suite.finish(passed);}
})().catch(e=>{console.error(e);process.exitCode=1;});
