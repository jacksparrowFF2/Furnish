/* Run the production coordinators against tiny fixtures; no GPU or real project edits. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const T=require('../scripts/lib/test-artifacts.cjs'),repo=path.resolve(__dirname,'..');
function fixture(parent,name){
 const root=path.join(parent,name);for(const dir of ['src','styles','assets','vendor','templates','scripts/lib','tests/fixtures/browser','projects'])fs.mkdirSync(path.join(root,dir),{recursive:true});
 for(const file of ['index.html','src/app.js','assets/model.glb','scripts/generate-previews.cjs','scripts/lib/model-profiles.cjs','tests/fixtures/browser/reimport-input.furnish.json','projects/workspace.furnish.json'])fs.writeFileSync(path.join(root,file),'fixture:'+file);
 return root;
}
function load(file,mapping,extra,tail=''){
 const mod={exports:{}},sandbox={require:id=>Object.hasOwn(mapping,id)?mapping[id]:require('node:module').createRequire(file)(id),module:mod,__dirname:path.dirname(file),__filename:file,process,console:{log(){},error(){}},...extra};
 vm.runInNewContext(fs.readFileSync(file,'utf8')+'\n'+tail,sandbox,{filename:file});return mod.exports;
}
(async()=>{
 const suite=T.createRun({prefix:'verification-cleanup-contract-',removeEntire:true});let passed=false;
 try{
  const root=fixture(suite.dir,'browser');let setupFailure=false,workerFailure=false,prepared=0,closed=0;const roots=[];
  const V={projectRoot:root,loadPlaywright:()=>({}),configuration:()=>({launchOptions:{channel:'fixture'}}),staticServer:async()=>({baseURL:'http://127.0.0.1:1/',close:async()=>{closed++;}})};
  const child=async(args,options={})=>{

   roots.push(options.env.FURNISH_VERIFY_ROOT);fs.writeFileSync(path.join(options.env.FURNISH_VERIFY_ROOT,'output/evidence.png'),'screenshot');return {code:workerFailure?1:0,output:'case log'};
  };
  // Locate the current workspace from the preparation command, not from directory ordering.
  const dispatch=async(args,options={})=>{if(!options.env){prepared++;const work=path.resolve(path.dirname(args[0]),'..'),output=path.join(work,'output');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'preview.html'),'rebuildable');return {code:setupFailure?1:0,output:'prepared'};}return child(args,options);};
  const browser=load(path.join(repo,'scripts/verify-browser.cjs'),{'./lib/browser-verification.cjs':V,'./lib/test-artifacts.cjs':T},{dispatch},'child=dispatch;');
  await browser.main(['portable-smoke','beam-roof']);assert.equal(prepared,1);assert.equal(new Set(roots).size,1,'cases must reuse one batch workspace');assert.equal(closed,1);
  const work=roots[0],run=path.dirname(work);assert(!fs.existsSync(path.join(work,'src')));assert(!fs.existsSync(path.join(work,'assets')));assert(!fs.existsSync(path.join(work,'output/preview.html')));assert(fs.existsSync(path.join(work,'output/evidence.png')));assert(fs.existsSync(path.join(run,'results.json')));assert(fs.existsSync(path.join(run,'beam-roof.log')));
  workerFailure=true;await assert.rejects(browser.main(['portable-smoke','beam-roof']),/verification failed/);const failedWork=roots.at(-1);assert(fs.existsSync(path.join(failedWork,'src/app.js')));assert(fs.existsSync(path.join(failedWork,'output/preview.html')));assert.equal(JSON.parse(fs.readFileSync(path.join(path.dirname(failedWork),'results.json'))).notRun.length,1);
  setupFailure=true;await assert.rejects(browser.main(['portable-smoke']),/Preview preparation failed/);assert.equal(closed,2,'preparation failure must not start a service');
  const browserRuns=fs.readdirSync(path.join(root,'output/playwright')).map(n=>path.join(root,'output/playwright',n));assert(browserRuns.some(r=>fs.existsSync(path.join(r,'failure.json'))&&fs.existsSync(path.join(r,'workspace 迁移 #/assets'))));
  const project=fixture(suite.dir,'model'),binary=path.join(project,'blender-fixture');fs.writeFileSync(binary,Buffer.alloc(5000,1));
  const profiles=['one','two'].map(id=>({id,type:'fixture',route:'parametric',fixture:{name:id},tests:[]}));let failTwo=false,interrupt=false,calls=[];
  const stub=async(profile,ctx)=>{calls.push({id:profile.id,root:ctx.root});if(interrupt)throw Error('synthetic interruption');const run=fs.mkdtempSync(path.join(ctx.batch,profile.id+'-'));fs.writeFileSync(path.join(run,'render.png'),'render');fs.writeFileSync(path.join(run,'authored.blend'),'author source');return {run,passed:!(failTwo&&profile.id==='two'),failedStage:failTwo?'fixture':undefined};};
  const mod={exports:{}},customRequire=id=>id==='../blender-server.cjs'?{findBlender:()=>binary}:id==='../lib/model-profiles.cjs'?{profiles:()=>profiles}:id==='../lib/test-artifacts.cjs'?T:require(id);
  vm.runInNewContext(fs.readFileSync(path.join(repo,'scripts/verify/verify-model-pipeline.cjs'),'utf8')+'\nrunProfile=stub;', {require:customRequire,module:mod,__dirname:path.join(project,'scripts/verify'),process,console:{log(){},error(){}},stub});
  const pipeline=mod.exports;const success=await pipeline.main(['all']);assert.equal(new Set(calls.map(c=>c.root)).size,1);assert.equal(success.workspacePruned,true);assert(!fs.existsSync(path.join(calls[0].root,'src')));for(const r of success.results){assert(fs.existsSync(path.join(r.run,'render.png')));assert(fs.existsSync(path.join(r.run,'authored.blend')));}
  failTwo=true;calls=[];await assert.rejects(pipeline.main(['all']),/pipelines failed/);const failed=calls[0].root,batch=path.dirname(failed);assert(fs.existsSync(path.join(failed,'src/app.js')));assert(!fs.existsSync(path.join(batch,'.furnish-test-lock.json')));
  failTwo=false;calls=[];const resumed=await pipeline.main(['all','--resume='+batch]);assert.deepEqual(calls.map(c=>c.id),['two'],'resume reuses a passing profile and retries only failure');assert.equal(resumed.workspacePruned,true);assert(!fs.existsSync(path.join(failed,'src')));await assert.rejects(pipeline.main(['all','--resume='+batch]),/workspace was cleaned/);
  const previous=process.env.FURNISH_KEEP_TEST_WORKSPACES;try{process.env.FURNISH_KEEP_TEST_WORKSPACES='1';calls=[];const kept=await pipeline.main(['all']);assert(!kept.workspacePruned);assert(fs.existsSync(path.join(calls[0].root,'src/app.js')));}finally{if(previous===undefined)delete process.env.FURNISH_KEEP_TEST_WORKSPACES;else process.env.FURNISH_KEEP_TEST_WORKSPACES=previous;}
  interrupt=true;calls=[];await assert.rejects(pipeline.main(['all']),/synthetic interruption/);assert(fs.existsSync(path.join(calls[0].root,'src/app.js')));assert(fs.existsSync(path.join(path.dirname(calls[0].root),'failure.json')));
  passed=true;console.log('PASS real browser/model coordinators: one reusable workspace, success pruning, evidence retention, setup/case/interruption preservation, resumable failure and opt-out');
 }finally{suite.finish(passed);}
})().catch(e=>{console.error(e);process.exitCode=1;});
