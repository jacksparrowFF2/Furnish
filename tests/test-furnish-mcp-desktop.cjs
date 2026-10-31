'use strict';
// Real packaged EXE + real stdio MCP. All edits stay in a private project/profile.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http'),{spawn}=require('node:child_process'),readline=require('node:readline'),{pathToFileURL}=require('node:url');
const {_electron,chromium}=require('playwright'),root=path.resolve(__dirname,'..'),C=require('../src/core/repository-core.js'),Files=require('../scripts/workspace-files.cjs');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const freePort=async()=>{const s=http.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));return port;};
(async()=>{
 const run=fs.mkdtempSync(path.join(root,'output/mcp-desktop-')),workspace=path.join(run,'workspace');fs.mkdirSync(workspace);
 const originalFile=Files.create(root).info().file,before=hash(originalFile),repoFile=path.join(root,'projects/workspace.furnish.json'),repoBefore=hash(repoFile),initial=Files.create(root).read().workspace;
 for(const name of ['src','styles','assets','vendor'])fs.cpSync(path.join(root,name),path.join(workspace,name),{recursive:true});
 fs.copyFileSync(path.join(root,'index.html'),path.join(workspace,'index.html'));fs.mkdirSync(path.join(workspace,'scripts'));
 for(const name of require('../scripts/package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(workspace,'scripts',name));
 fs.mkdirSync(path.join(workspace,'projects'));fs.writeFileSync(path.join(workspace,'projects/workspace.furnish.json'),C.text(initial));
 const executable=path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe'),port=await freePort(),env={...process.env,FURNISH_DESKTOP_ROOT:workspace,FURNISH_DESKTOP_PROFILE:path.join(run,'profile'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;delete env.FURNISH_MCP_DISABLE;
 let app,child,browser;const checks=[],errors=[];
 fs.writeFileSync(path.join(run,'source-snapshot.json'),C.text(initial));
 try{
  app=await _electron.launch({executablePath:executable,env,timeout:60000});const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting&&!!window.FurnishMcp,null,{timeout:120000});
  await new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(fs.existsSync(path.join(workspace,'.local/desktop-mcp/runtime.json'))){clearInterval(t);resolve();}else if(++n>100){clearInterval(t);reject(Error('No desktop runtime'));}},50);});
  child=spawn(process.execPath,[path.join(root,'scripts/furnish-mcp.cjs'),'--root',workspace],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  const pending=new Map();let seq=0;readline.createInterface({input:child.stdout}).on('line',line=>{const m=JSON.parse(line);pending.get(m.id)?.(m);pending.delete(m.id);});
  const rpc=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq,t=setTimeout(()=>{pending.delete(id);reject(Error('MCP test timeout '+method));},150000);pending.set(id,value=>{clearTimeout(t);resolve(value);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
  assert.equal((await rpc('initialize',{protocolVersion:'2025-11-25'})).result.serverInfo.name,'furnish');assert.equal((await rpc('tools/list')).result.tools.length,4);
  const call=async(name,args={})=>{const r=(await rpc('tools/call',{name,arguments:args})).result;if(r.isError)throw Error(r.content[0].text);return r.structuredContent;};
  const read=()=>call('get_current_plan'),live=await read();assert.equal(live.furniture.length,initial.work[initial.planId].furniture.length);assert.equal(JSON.parse(fs.readFileSync(path.join(workspace,'.local/desktop-mcp/runtime.json'))).root,fs.realpathSync(workspace));assert(live.save.message.includes(path.join(workspace,'projects')));checks.push('real packaged desktop and stdio read isolated formal project');
  const writeArgs=(current,id)=>({planId:current.plan.id,revision:current.revision,requestId:id});
  const copyArgs={...writeArgs(live,'copy-1'),name:'MCP 隔离验收副本'},copy=await call('copy_design',copyArgs);assert(copy.persisted);assert.notEqual(copy.activeDesign.id,live.activeDesign.id);assert.equal(copy.activeDesign.name,copyArgs.name);assert.equal((await call('copy_design',copyArgs)).activeDesign.id,copy.activeDesign.id);assert.equal((await read()).designs.length,copy.designs.length);checks.push('copy enters independent design, preserves original and retry never duplicates');
  const f=copy.furniture.find(f=>['desk','table','chair'].includes(f.type)&&!f.locked);assert(f,'fixture needs an editable simple furniture');
  const next={id:f.id,cx:f.cx+71,cy:f.cy+29,w:f.w+40,d:f.d+20,h:760,rot:90},editArgs={...writeArgs(copy,'edit-1'),updates:[next]},edited=await call('update_furniture',editArgs);assert(edited.persisted);
  const actual=edited.furniture.find(x=>x.id===f.id);for(const k of ['cx','cy','w','d','h','rot'])assert.equal(actual[k],next[k]);assert.equal(edited.undo.available,copy.undo.available+1);await call('update_furniture',editArgs);assert.equal((await read()).undo.available,edited.undo.available);checks.push('mm position/width/depth/height/rotation uses one existing undo; idempotent retry');
  const stale=(await rpc('tools/call',{name:'update_furniture',arguments:{...writeArgs(copy,'stale'),updates:[{id:f.id,cx:1}]}})).result;assert(stale.isError);assert.equal((await read()).revision,edited.revision);checks.push('stale revision refused without edits');
  await page.locator('#undo').click();let undone=await read();assert.deepEqual(undone.furniture.find(x=>x.id===f.id),f);await page.locator('#redo').click();assert.equal((await read()).furniture.find(x=>x.id===f.id).cx,next.cx);checks.push('native UI undo and redo reverse MCP furniture edits');
  await page.evaluate(id=>mutate(()=>getF(id).locked=true),f.id);let locked=await read();const beforeLock=JSON.stringify(locked.furniture);
  const lockReply=(await rpc('tools/call',{name:'update_furniture',arguments:{...writeArgs(locked,'locked'),updates:[{id:f.id,cx:1}]}})).result;assert(lockReply.isError);assert.equal(JSON.stringify((await read()).furniture),beforeLock);
  await page.evaluate(id=>mutate(()=>delete getF(id).locked),f.id);
  await page.evaluate(id=>{mutate(()=>Object.assign(state,FurnishLayers.create(state,'mcp-locked','MCP锁定层')));mutate(()=>Object.assign(state,FurnishLayers.assign(state,['furniture:'+id],'mcp-locked')));mutate(()=>Object.assign(state,FurnishLayers.update(state,'mcp-locked',{locked:true})));},f.id);
  const layerBase=await read(),layerReply=(await rpc('tools/call',{name:'update_furniture',arguments:{...writeArgs(layerBase,'layer-locked'),updates:[{id:f.id,cx:1}]}})).result;assert(layerReply.isError);assert.equal((await read()).revision,layerBase.revision);await page.evaluate(()=>mutate(()=>Object.assign(state,FurnishLayers.update(state,'mcp-locked',{locked:false}))));
  const batchBase=await read(),batch=(await rpc('tools/call',{name:'update_furniture',arguments:{...writeArgs(batchBase,'invalid-batch'),updates:[{id:f.id,cx:999},{id:'missing',w:1000}]}})).result;assert(batch.isError);assert.equal((await read()).revision,batchBase.revision);checks.push('locked furniture and invalid batch are atomic failures');
  const space=await call('check_space',{focusIds:[f.id]}),production=await page.evaluate(id=>FurnishProject.spaceCheck(FurnishProject.effectivePlan(PLAN,state),state.furniture,{passage:state.spaceThreshold||800,focusIds:[id]}),f.id);assert.deepEqual(space.issues.map(({confirmed,...i})=>i),production);checks.push('space check equals production rules and saved threshold');
  await page.evaluate(()=>FurnishRepository.flush());const disk=Files.create(workspace).read();assert.equal(disk.workspace.activeDesigns[live.plan.id],copy.activeDesign.id);if(live.activeDesign)assert.deepEqual(disk.workspace.designs.find(d=>d.id===live.activeDesign.id).work,initial.designs.find(d=>d.id===live.activeDesign.id).work);
  const saved=await read();await page.reload();await page.waitForFunction(()=>!repositoryBooting,null,{timeout:120000});const refreshed=await read();assert.deepEqual(refreshed.furniture,saved.furniture);assert.equal(refreshed.activeDesign.id,copy.activeDesign.id);assert.notEqual(refreshed.revision,saved.revision);checks.push('formal save, original design preservation and page reload roundtrip with new session revision');
  await page.screenshot({path:path.join(run,'desktop.png')});
  const externalApi=Files.create(workspace),external=externalApi.read();external.workspace.work[live.plan.id].designNote='external writer conflict fixture';const externalWrite=externalApi.write(external.workspace,external.revision);
  const conflictBase=await read(),conflict=(await rpc('tools/call',{name:'update_furniture',arguments:{...writeArgs(conflictBase,'save-conflict'),updates:[{id:f.id,cx:next.cx+1}]}})).result;
  assert(conflict.isError);assert(conflict.structuredContent.applied);assert.equal(conflict.structuredContent.persisted,false);assert.equal(externalApi.read().revision,externalWrite.revision);
  const blockedBase=await read(),blocked=(await rpc('tools/call',{name:'update_furniture',arguments:{...writeArgs(blockedBase,'blocked-after-conflict'),updates:[{id:f.id,cx:next.cx+2}]}})).result;assert(blocked.isError);assert.equal((await read()).revision,blockedBase.revision);checks.push('external write conflict preserves disk, returns applied but unsaved and blocks further edits');
  // This is an isolated fixture: choose the existing keep-cache close branch.
  await app.evaluate(({dialog})=>{dialog.showMessageBoxSync=()=>1;});
  browser=await chromium.launch({headless:true});const filePage=await browser.newPage();filePage.on('pageerror',e=>errors.push(e.message));await filePage.context().setOffline(true);await filePage.goto(pathToFileURL(path.join(workspace,'index.html')).href);await filePage.waitForFunction(()=>!repositoryBooting);assert(await filePage.locator('#gFurn > *').count());assert(await filePage.evaluate(()=>!!window.FurnishMcp));checks.push('direct offline file:// startup preserved');await browser.close();browser=null;
  await app.close();app=null;assert(!fs.existsSync(path.join(workspace,'.local/desktop-mcp/runtime.json')));checks.push('desktop quit removes runtime endpoint');
  assert.deepEqual(errors,[]);const originalProjectUnchanged=hash(originalFile)===before,originalRepositoryUnchanged=hash(repoFile)===repoBefore;
  fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({passed:true,checks,errors,originalProjectUnchanged,originalRepositoryUnchanged,isolatedRootVerified:true},null,2));console.log(JSON.stringify({run,checks,originalProjectUnchanged,originalRepositoryUnchanged},null,2));
 }finally{child?.kill();if(browser)await browser.close();if(app)await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
