/* Same packaged desktop and current formal plan; private source/cache/port. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url'),{_electron,chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),A=require('../scripts/lib/test-artifacts.cjs');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
(async()=>{
 const baseline=process.argv.includes('--baseline'),source=process.env.FURNISH_SWITCH_SOURCE||path.join(root,'projects/workspace.furnish.json'),before=sha(source),job=A.createRun({parent:path.join(root,'output/desktop-verification'),prefix:baseline?'view-baseline-':'view-switch-'});
 let app,browser,passed=false;const errors=[],report={baseline,source,sourceSha256:before,samples:[]};
 try{
  const work=job.workspace('workspace',root,{directories:['src','styles','vendor','assets'],files:['index.html','manifest.webmanifest']});fs.copyFileSync(source,path.join(work,'projects/workspace.furnish.json'));
  for(const name of require('../scripts/package-desktop.cjs').runtimeFiles)job.copy(path.join(root,'scripts',name),path.join('workspace/scripts',name));job.discard('profile');
  // Test-only observation of the actual production builders and scene objects.
  const file=path.join(work,'index.html');let html=fs.readFileSync(file,'utf8');
  for(const name of ['buildArch','buildFurn','buildLabels','buildHeaterClearances'])html=html.replace(new RegExp('function '+name+'\\(([^)]*)\\)\\{'),(_,args)=>`function ${name}(${args}){window.__builds??={};window.__builds.${name}=(window.__builds.${name}||0)+1;`);
  html=html.replace('return {automationCamera,',`window.__sceneProbe=()=>({builds:{...window.__builds},arch:archUp.children.map(o=>o.uuid),furniture:furnG.children.map(o=>({id:o.userData.fid,uuid:o.uuid,x:o.position.x,y:o.position.y,z:o.position.z,sig:o.userData.sig})),grow,furnGrow,active,raf,labels:labelG.children.length});\nreturn {automationCamera,`);fs.writeFileSync(file,html);
  const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
  const env={...process.env,FURNISH_DESKTOP_ROOT:work,FURNISH_DESKTOP_PROFILE:path.join(job.dir,'profile'),FURNISH_PORT:String(port),FURNISH_MCP_DISABLE:'1'};delete env.ELECTRON_RUN_AS_NODE;
  const executable=require('../scripts/launch-desktop.cjs').desktopExecutable(root);report.executable=executable;
  app=await _electron.launch({executablePath:executable,env,timeout:60000});const page=await app.firstWindow();page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));await page.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setTitle('Furnish · 视图切换验证（隔离副本）'));
  report.initial=await page.evaluate(()=>({plan:PLAN.id,furniture:state.furniture.length,state:JSON.stringify(state)}));
  async function toggle(p,mode,label){const sample=await p.evaluate(async({mode,label})=>{const start=performance.now();await setView(mode);return {label,mode,ms:performance.now()-start,view:viewMode,busy:switching,scene:window.__sceneProbe?.()};},{mode,label});assert.equal(sample.view,mode);assert.equal(sample.busy,false);report.samples.push(sample);console.log(label+': '+Math.round(sample.ms)+'ms');return sample;}
  await toggle(page,'3d','desktop cold');await page.screenshot({path:path.join(job.dir,'desktop-3d.png')});
  const first=await page.evaluate(()=>__sceneProbe());
  await toggle(page,'2d','desktop exit');await page.screenshot({path:path.join(job.dir,'desktop-2d.png')});
  assert.equal(await page.evaluate(()=>JSON.stringify(state)),report.initial.state,'view switches must not mutate the plan');
  const warm=await toggle(page,'3d','desktop warm');await toggle(page,'2d','desktop exit repeat');
  if(!baseline){
   assert.deepEqual(warm.scene.builds,first.builds,'unchanged re-entry reuses builders');assert.deepEqual(warm.scene.arch,first.arch);assert.deepEqual(warm.scene.furniture,first.furniture);assert.equal(warm.scene.grow,1);assert.equal(warm.scene.furnGrow,1);assert.equal(await page.evaluate(()=>__sceneProbe().raf),0);
   assert(warm.ms<1500,'warm transition must not retain multi-second choreography');
   // Two-dimensional edits must still reach the real production scene, undo/redo and reload.
   await page.evaluate(()=>mutate(()=>state.furniture.push({id:'switch-block',type:'block',name:'switch probe',cx:5000,cy:4000,w:300,d:400,h:500,mountHeight:120,rot:0,color:'#73918a'})));
   const added=await toggle(page,'3d','desktop after 2d add');assert(added.scene.furniture.some(f=>f.id==='switch-block'));assert.deepEqual(added.scene.arch,first.arch);
   await toggle(page,'2d','desktop edit exit');await page.evaluate(()=>mutate(()=>{getF('switch-block').h=750;getF('switch-block').cx+=500;}));
   const edited=await toggle(page,'3d','desktop after 2d edit'),a=added.scene.furniture.find(f=>f.id==='switch-block'),b=edited.scene.furniture.find(f=>f.id==='switch-block');assert.notEqual(a.uuid,b.uuid);assert.notEqual(a.x,b.x);assert.notEqual(a.sig,b.sig);
   await toggle(page,'2d','desktop undo exit');await page.evaluate(()=>undo());const undone=await toggle(page,'3d','desktop after undo');assert.equal(undone.scene.furniture.find(f=>f.id==='switch-block').sig,a.sig);
   await toggle(page,'2d','desktop redo exit');await page.evaluate(()=>redo());const redone=await toggle(page,'3d','desktop after redo');assert.equal(redone.scene.furniture.find(f=>f.id==='switch-block').sig,b.sig);
   await toggle(page,'2d','desktop architecture exit');await page.evaluate(()=>mutate(()=>state.rooms[Object.keys(state.rooms)[0]].name+=' · 切换验证'));const arch=await toggle(page,'3d','desktop architecture update');assert.notDeepEqual(arch.scene.arch,first.arch);
   await toggle(page,'2d','desktop save exit');await page.evaluate(()=>FurnishRepository.flush());await page.reload();await page.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting);assert.equal(await page.evaluate(()=>getF('switch-block').h),750);await toggle(page,'3d','desktop saved reload');
   await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(390,844));await page.waitForFunction(()=>innerWidth===390);await toggle(page,'2d','desktop narrow exit');await toggle(page,'3d','desktop narrow enter');await page.screenshot({path:path.join(job.dir,'desktop-narrow.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   browser=await chromium.launch({headless:true});const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${port}/`);await p.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting);await toggle(p,'3d','HTTP cold');await toggle(p,'2d','HTTP exit');await toggle(p,'3d','HTTP warm');
   await p.context().setOffline(true);await p.goto(pathToFileURL(file).href);await p.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting);await toggle(p,'3d','offline file cold');await toggle(p,'2d','offline file exit');await toggle(p,'3d','offline file warm');await p.screenshot({path:path.join(job.dir,'file-3d.png')});
  }
  assert.deepEqual(errors,[]);assert.equal(sha(source),before);passed=true;
 }finally{
  if(browser)await browser.close();if(app){await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows())w.destroy();}).catch(()=>{});await app.close();}
  report.passed=passed;report.errors=errors;report.sourceUnchanged=sha(source)===before;delete report.initial?.state;fs.writeFileSync(path.join(job.dir,'result.json'),JSON.stringify(report,null,2));job.finish(passed);console.log('Report: '+job.dir);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
