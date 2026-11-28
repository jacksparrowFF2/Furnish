/* Isolated acceptance of the actual editor, production capture and portable report. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),Artifacts=require('../scripts/lib/test-artifacts.cjs'),V=require('../scripts/lib/browser-verification.cjs');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function scenario(page,run,mode,desktop){
 page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.waitForFunction(()=>!repositoryBooting&&!!window.FurnishPresentationUI);
 await page.evaluate(()=>FurnishPresentationUI.open());await page.locator('#presentation-overview').click();await page.locator('#presentation-title').fill('方案讲解验收 <img onerror=alert(1)>');await page.locator('#presentation-overview-text').fill('按动线、收纳和检修组织设计。');await page.getByRole('button',{name:'保存',exact:true}).click();
 await page.locator('#presentation-add').click();await page.locator('#presentation-page-title').fill('公共区域动线');await page.locator('#presentation-need').fill('同时满足通行与收纳');await page.locator('#presentation-approach').fill('柜体沿墙布置');await page.locator('#presentation-basis').fill('以当前方案尺寸为依据；待现场复尺');await page.locator('#presentation-instruction').fill('装修公司专属交底');await page.locator('#presentation-capture').click();await page.locator('#presentation-preview img').waitFor();await page.getByRole('button',{name:'保存讲解页',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.presentation.pages[0].capture.kind),'2d');assert.equal(await page.evaluate(()=>FurnishPresentation.pageState(state.presentation.pages[0],FurnishProject.effectivePlan(PLAN,state),state).stale),false);
 await page.locator('#presentation-issue-add').click();await page.locator('#presentation-issue-text').fill('设备安装条件待厂家核对');await page.locator('#presentation-assignee').fill('厂家与装修公司');await page.locator('#presentation-issue-basis').fill('依据测试复核记录确认');await page.locator('#presentation-issue-status').selectOption('confirmed');await page.getByRole('button',{name:'保存事项',exact:true}).click();
 await page.locator('#presentation-release').click();await page.locator('#presentation-version').fill('V1 · 交底验收');await page.getByRole('button',{name:'记录当前版本',exact:true}).click();assert.equal(await page.evaluate(()=>FurnishPresentation.releaseState(FurnishProject.effectivePlan(PLAN,state),state)),'与记录版本一致');
 console.log(mode+': editor, capture, confirmation and version saved');const before=await page.evaluate(()=>JSON.stringify(state.presentation));await page.evaluate(()=>{closeDialog();undo();});assert.equal(await page.evaluate(()=>state.presentation.release),undefined);await page.evaluate(()=>redo());assert.deepEqual(await page.evaluate(()=>state.presentation),JSON.parse(before));
 await page.evaluate(async()=>{if(window.FurnishRepository)await FurnishRepository.flush();else await autosave.flush();});await page.reload();await page.waitForFunction(()=>!repositoryBooting&&!!window.FurnishPresentationUI);assert.deepEqual(await page.evaluate(()=>state.presentation),JSON.parse(before));
 await page.evaluate(()=>FurnishPresentationUI.open());await page.locator('#presentation-export').click();await page.locator('#delivery-audience').selectOption('owner');const reportPath=path.join(run,mode+'-owner.html');
 if(desktop){await desktop.evaluate(({BrowserWindow},file)=>{globalThis.presentationDownload=new Promise(resolve=>{BrowserWindow.getAllWindows()[0].webContents.session.once('will-download',(_e,item)=>{item.setSavePath(file);item.once('done',(_e,status)=>resolve(status));});});},reportPath);await page.getByRole('button',{name:'导出成果 HTML',exact:true}).click();assert.equal(await desktop.evaluate(()=>globalThis.presentationDownload),'completed');}
 else {const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'导出成果 HTML',exact:true}).click();await (await downloaded).saveAs(reportPath);}
 console.log(mode+': report download completed');const owner=fs.readFileSync(reportPath,'utf8');assert.match(owner,/公共区域动线/);assert.match(owner,/data:image\/jpeg;base64/);assert.ok(!owner.includes('<h3>施工交底</h3>'));assert.match(owner,/&lt;img onerror=alert\(1\)&gt;/);
 const result=await page.evaluate(()=>{const input={planId:PLAN.id,current:state,designs:[],catalog:[]},packed=FurnishProject.pack(input);return {version:packed.version,same:JSON.stringify(FurnishProject.unpack(packed).current.presentation)===JSON.stringify(state.presentation),report:FurnishDesignUI.reportHTML('交底','',false,{}, {audience:'contractor'})};});assert.equal(result.version,94);assert.ok(result.same);assert.match(result.report,/<h3>施工交底<\/h3>/);fs.writeFileSync(path.join(run,mode+'-contractor.html'),result.report);
 await page.evaluate(async()=>{closeDialog();await setView('3d');await View3D.automationCamera({preset:'whole',horizontalFov:60});const id=state.furniture[0]?.id;if(id){const c=await View3D.automationCamera({focusIds:[id]});await View3D.automationCamera({mode:c.mode,focusIds:[id],position:{...c.position,x:c.position.x+100},target:c.target});}});await page.waitForFunction(()=>is3D()&&!switching);await page.evaluate(()=>FurnishPresentationUI.open());await page.locator('#presentation-add').click();await page.locator('#presentation-page-title').fill('房间三维讲解');await page.locator('#presentation-capture').click();await page.locator('#presentation-preview img').waitFor();await page.getByRole('button',{name:'保存讲解页',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.presentation.pages[1].capture.kind),'3d');
 console.log(mode+': production 3D captured');const target=await page.evaluate(()=>state.presentation.pages[1].capture.camera);await page.evaluate(async()=>{closeDialog();await View3D.automationCamera({preset:'top'});await FurnishPresentationUI.recall(state.presentation.pages[1]);});const actual=await page.evaluate(()=>View3D.automationCamera());for(const k of ['x','y','z'])assert.ok(Math.abs(actual.position[k]-target.position[k])<2,mode+' camera '+k);assert.deepEqual(actual.focusIds,target.focusIds);
 await page.evaluate(()=>{FurnishPresentationUI.open();});await page.locator('[data-page-up]').nth(1).click();assert.equal(await page.evaluate(()=>state.presentation.pages[0].title),'房间三维讲解');await page.locator('[data-page-down]').first().click();
 await page.screenshot({path:path.join(run,mode+'-wide.png')});
 const multi=await page.evaluate(()=>FurnishDesignUI.reportHTML('多视角交付验收','布局与检修说明',false,{}, {audience:'both'}));assert.equal((multi.match(/<figure>/g)||[]).length,2);fs.writeFileSync(path.join(run,mode+'-multi.html'),multi);
 if(mode==='http'){
  const report=await page.context().newPage();try{await report.goto(pathToFileURL(path.join(run,mode+'-multi.html')).href);await report.locator('.presentation-page img').first().waitFor();await report.screenshot({path:path.join(run,'report-reading.png')});await report.pdf({path:path.join(run,'report-print.pdf'),format:'A4',printBackground:true,margin:{top:'12mm',right:'12mm',bottom:'12mm',left:'12mm'}});}finally{await report.close();}
 }
 await page.evaluate(()=>{closeDialog();mutate(()=>{const f=state.furniture[0];if(f)f.cx+=10;else state.notes.push({id:'presentation-change',x:0,y:0,text:'方案变更'});});});
 const stale=await page.evaluate(()=>({states:state.presentation.pages.map(p=>FurnishPresentation.pageState(p,FurnishProject.effectivePlan(PLAN,state),state).stale),issue:FurnishPresentation.issueState(state.presentation.issues[0],FurnishProject.effectivePlan(PLAN,state),state),report:FurnishPresentationUI.reportSection('both')}));assert.deepEqual(stale.states,[true,true]);assert.match(stale.issue,/重新确认/);assert.ok(!stale.report.includes('data:image/'));assert.match(stale.report,/旧图未作为当前方案展示/);
 await page.evaluate(()=>FurnishPresentationUI.open());if(mode!=='desktop')await page.setViewportSize({width:390,height:844});else await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(390,844));
 await page.locator('[data-page-edit]').first().click();assert.ok(await page.locator('#presentation-capture').isVisible());assert.ok(await page.evaluate(()=>document.querySelector('#dlg .dlg-box').scrollWidth<=document.querySelector('#dlg .dlg-box').clientWidth+1));await page.screenshot({path:path.join(run,mode+'-narrow.png')});await page.getByRole('button',{name:'返回',exact:true}).click();await page.locator('[data-page-delete]').last().click();assert.equal(await page.evaluate(()=>state.presentation.pages.length),1);await page.evaluate(()=>{closeDialog();undo();});assert.equal(await page.evaluate(()=>state.presentation.pages.length),2);
 if(mode==='desktop'){
  const mcp=await page.evaluate(async()=>{
   const read=await FurnishMcp.execute('get_presentation',{}),current=await FurnishMcp.execute('get_current_plan',{});
   if(read.presentation.pages.some(p=>p.capture))throw Error('Read unexpectedly returned large images');
   const presentation=read.presentation;presentation.overview+=' MCP 讲解补充';
   const args={planId:current.plan.id,revision:read.revision,requestId:'presentation-mcp-acceptance',presentation,capturePageId:presentation.pages[0].id,releaseLabel:'V2 MCP'};
   const done=await FurnishMcp.execute('configure_presentation',args),retry=await FurnishMcp.execute('configure_presentation',args);
   const after=await FurnishMcp.execute('get_presentation',{});
   let rejected=false;try{await FurnishMcp.execute('configure_presentation',{...args,requestId:'presentation-stale-revision'});}catch{rejected=true;}
   return {applied:done.applied,persisted:done.persisted,idempotent:JSON.stringify(done)===JSON.stringify(retry),staleRejected:rejected,release:after.releaseState,captures:after.captures.length};
  });assert.ok(mcp.applied&&mcp.persisted&&mcp.idempotent&&mcp.staleRejected);assert.equal(mcp.release,'与记录版本一致');assert.equal(mcp.captures,2);
 }
 assert.deepEqual(errors,[]);return {mode,passed:true,editing:true,real2D3DCapture:true,viewRecall:true,reorderDeleteUndo:true,saveReload:true,portableProject:true,ownerContractor:true,staleImageOmitted:true,confirmationInvalidation:true,narrow:true,mcp:mode==='desktop',errors};
}
async function main(){
 const job=Artifacts.createRun({parent:path.join(root,'verification.noindex/presentation-verification'),prefix:'presentation-'}),run=job.dir;let passed=false,server,browser,desktop;
 const storageFile=path.join(root,'.local/storage.json'),storage=fs.existsSync(storageFile)?JSON.parse(fs.readFileSync(storageFile,'utf8')):{},source=path.resolve(process.env.FURNISH_TEST_PROJECT||storage.file||(storage.directory?path.join(storage.directory,'workspace.furnish.json'):path.join(root,'projects/workspace.furnish.json'))),before=hash(source);console.log('Presentation results: '+run);
 try{
  const isolated=job.workspace('workspace',root,{directories:['src','styles','vendor','assets','scripts'],files:['index.html','manifest.webmanifest']});job.copy(source,'workspace/projects/workspace.furnish.json',{disposable:false});
  const results=[];
  if(process.argv.includes('--desktop')){
   const port=await new Promise(resolve=>{const s=http.createServer();s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n));});});
   const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:job.discard('profile'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
   desktop=await require('playwright')._electron.launch({executablePath:require('../scripts/launch-desktop.cjs').desktopExecutable(root),env,timeout:60000});const page=await desktop.firstWindow();await page.waitForURL('http://127.0.0.1:'+port+'/');
   // Native download dialogs are redirected only inside this isolated test window.
   await desktop.evaluate(({BrowserWindow},run)=>{BrowserWindow.getAllWindows()[0].webContents.session.on('will-download',(_e,item)=>item.setSavePath(run+'/'+item.getFilename()));},run);
   results.push(await scenario(page,run,'desktop',desktop));
  }else{
   server=await V.staticServer(isolated);browser=await V.loadPlaywright().chromium.launch(V.configuration().launchOptions);
   for(const mode of ['http','file']){const context=await browser.newContext({viewport:{width:1440,height:1000},offline:mode==='file',acceptDownloads:true}),page=await context.newPage();try{await page.goto(mode==='http'?server.baseURL:pathToFileURL(path.join(isolated,'index.html')).href);results.push(await scenario(page,run,mode));}finally{await context.close();}}
  }
  assert.equal(hash(source),before);fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({results,originalWorkspaceUnchanged:true},null,2));console.log(JSON.stringify(results));passed=true;
 }catch(e){fs.writeFileSync(path.join(run,'failure.json'),JSON.stringify({message:e.message,stack:e.stack},null,2));throw e;}finally{if(browser)await browser.close();if(desktop){const timeout=setTimeout(()=>desktop.process().kill('SIGKILL'),8000);try{await desktop.close();}finally{clearTimeout(timeout);}}if(server)await server.close();assert.equal(hash(source),before);job.finish(passed);}
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={scenario};
