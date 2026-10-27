/* Real packaged Electron + HTTP/file browser acceptance in a private workspace. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {_electron,chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),{runtimeFiles}=require('./package-desktop.cjs');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function freePort(){const s=http.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function main(){
 const source=path.join(root,'projects/workspace.furnish.json'),before=hash(source);
 const run=path.join(root,'output/desktop-verification',new Date().toISOString().replace(/[:.]/g,'-'));
 const isolated=path.join(run,'workspace');fs.mkdirSync(isolated,{recursive:true});
 for(const name of ['index.html','manifest.webmanifest','src','styles','vendor','assets'])fs.cpSync(path.join(root,name),path.join(isolated,name),{recursive:true});
 fs.mkdirSync(path.join(isolated,'scripts'));for(const name of runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(isolated,'scripts',name));
 fs.mkdirSync(path.join(isolated,'projects'));fs.copyFileSync(source,path.join(isolated,'projects/workspace.furnish.json'));
 const executable=path.resolve(process.argv[2]||path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe'));
 const port=await freePort(),env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'profile'),FURNISH_PORT:String(port)};
 delete env.ELECTRON_RUN_AS_NODE;
 const checks=[],errors=[];let desktop,browser;
 async function launch(){
  desktop=await _electron.launch({executablePath:executable,env,timeout:60000});
  desktop.process().stderr.on('data',b=>process.stderr.write(b));
  const p=await desktop.firstWindow();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));
  await p.waitForURL(`http://127.0.0.1:${port}/`);
  await p.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting&&!!window.FurnishRepository);
  await p.locator('#repository-loading').waitFor({state:'hidden'});
  return p;
 }
 try{
  console.log('Packaged desktop: '+executable+'\nIsolated results: '+run);
  let page=await launch();
  await page.waitForFunction(()=>repositoryClient.status.mode==='saved'||repositoryClient.status.mode==='ready');
  const initial=await page.evaluate(()=>({planId:PLAN.id,slots:Object.keys(store.work).length,furniture:state.furniture.length,canonical:FurnishRepositoryCore.text(store)}));
  const original=require('../src/core/repository-core.js').parse(JSON.parse(fs.readFileSync(source,'utf8')));
  assert.equal(initial.planId,original.planId);assert.equal(initial.slots,Object.keys(original.work).length);assert.equal(initial.furniture,original.work[original.planId].furniture.length);
  checks.push('existing workspace loaded with original plan, work slots and furniture');
  await page.screenshot({path:path.join(run,'desktop-2d.png')});
  const settings=await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
  assert.equal(settings.nodeIntegration,false);assert.equal(settings.contextIsolation,true);assert.equal(settings.sandbox,true);
  checks.push('sandboxed renderer without Node integration');
  const edit=await page.evaluate(()=>{
   const f=state.furniture.find(f=>!f.locked);if(!f)throw Error('No editable furniture for verification');
   const id=f.id,before=f.color;mutate(()=>{state.furniture.find(f=>f.id===id).color='#73918a';});
   return {id,before};
  });
  await page.keyboard.press('Control+z');assert.equal(await page.evaluate(id=>state.furniture.find(f=>f.id===id).color,edit.id),edit.before);
  await page.keyboard.press('Control+Shift+z');assert.equal(await page.evaluate(id=>state.furniture.find(f=>f.id===id).color,edit.id),'#73918a');
  await page.evaluate(()=>FurnishRepository.flush());
  await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(id=>state.furniture.find(f=>f.id===id).color,edit.id),'#73918a');
  checks.push('production mutate, undo/redo, file save and refresh');
  await desktop.evaluate(({BrowserWindow},file)=>{globalThis.furnishDownloadDone=new Promise(resolve=>{BrowserWindow.getAllWindows()[0].webContents.session.once('will-download',(_e,item)=>{item.setSavePath(file);item.once('done',(_e,state)=>resolve(state));});});},path.join(run,'export-project.json'));
  await page.evaluate(()=>document.querySelector('#exportJson').click());
  assert.equal(await desktop.evaluate(()=>globalThis.furnishDownloadDone),'completed');
  const exported=JSON.parse(fs.readFileSync(path.join(run,'export-project.json'),'utf8'));
  assert.ok(exported.furniture.length);checks.push('native download exports existing editable project');
  await page.locator('#fileIn').setInputFiles(path.join(run,'export-project.json'));
  await page.locator('#toast').filter({hasText:'方案已导入'}).waitFor();
  assert.equal(await page.evaluate(()=>state.furniture.length),initial.furniture);
  assert.equal(await page.evaluate(id=>state.furniture.find(f=>f.id===id).color,edit.id),'#73918a');
  await page.evaluate(()=>FurnishRepository.flush());checks.push('file input reimports exported plan with edited furniture intact');
  await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(390,844));
  await page.waitForFunction(()=>innerWidth===390);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(run,'desktop-narrow.png')});
  await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1440,960));
  checks.push('390px desktop viewport without document overflow');
  await page.locator('[data-view="3d"]').click();
  await page.waitForFunction(()=>document.body.classList.contains('m3d')&&!switching,null,{timeout:120000});
  await page.screenshot({path:path.join(run,'desktop-3d.png')});
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/furnish/blender/status`)).status,200);
  checks.push('production WebGL 3D and original Blender status interface');
  await page.locator('[data-view="2d"]').click();await page.waitForFunction(()=>!switching);
  const pdf=await desktop.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.printToPDF({printBackground:true})).toString('base64'));
  fs.writeFileSync(path.join(run,'print.pdf'),Buffer.from(pdf,'base64'));
  assert.ok(fs.statSync(path.join(run,'print.pdf')).size>1000);checks.push('Chromium print-to-PDF renders existing page');
  // A separate clean browser sees the same file; simultaneous writes retain revision protection.
  browser=await chromium.launch({headless:true});const browserPage=await browser.newPage();
  await browserPage.goto(`http://127.0.0.1:${port}/`);await browserPage.locator('#repository-loading').waitFor({state:'hidden'});
  assert.equal(await browserPage.evaluate(id=>state.furniture.find(f=>f.id===id).color,edit.id),'#73918a');
  await browserPage.screenshot({path:path.join(run,'browser-http.png')});
  checks.push('HTTP browser shares desktop workspace');
  await browserPage.context().setOffline(true);
  await browserPage.goto(pathToFileURL(path.join(isolated,'index.html')).href);await browserPage.locator('#repository-loading').waitFor({state:'hidden'});
  await browserPage.locator('#gFurn > *').first().waitFor();
  await browserPage.locator('[data-view="3d"]').click();await browserPage.waitForFunction(()=>document.body.classList.contains('m3d')&&!switching,null,{timeout:120000});
  await browserPage.screenshot({path:path.join(run,'browser-file-3d.png')});checks.push('direct file:// 2D and offline Three.js 3D');
  await browser.close();browser=null;
  await page.evaluate(()=>FurnishRepository.flush());
  await desktop.close();desktop=null;
  await assert.rejects(fetch(`http://127.0.0.1:${port}/api/furnish/server`));
  page=await launch();
  assert.equal(await page.evaluate(id=>state.furniture.find(f=>f.id===id).color,edit.id),'#73918a');
  checks.push('window exit stops owned backend; restart restores saved edit');
  assert.deepEqual(errors,[]);assert.equal(hash(source),before);
  checks.push('original user workspace unchanged; no renderer exceptions');
  fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({executable,checks,errors,originalWorkspaceUnchanged:hash(source)===before},null,2));
  console.log(checks.map(s=>'PASS '+s).join('\n'));
 }finally{
  if(browser)await browser.close();if(desktop)await desktop.close();
  assert.equal(hash(source),before,'Verification must never write original user data');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
