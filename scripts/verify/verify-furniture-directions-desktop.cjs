/* Production EXE, private workspace/cache; no writes to the source project. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{_electron,chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function main(){
 const source=path.join(root,'projects/workspace.furnish.json'),before=hash(source),run=fs.mkdtempSync(path.join(root,'output/playwright/directions-')),isolated=path.join(run,'workspace');fs.mkdirSync(isolated);
 for(const name of ['index.html','src','styles','vendor','assets'])fs.cpSync(path.join(root,name),path.join(isolated,name),{recursive:true});
 fs.mkdirSync(path.join(isolated,'scripts'));for(const name of require('../package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(isolated,'scripts',name));
 fs.mkdirSync(path.join(isolated,'projects'));fs.copyFileSync(source,path.join(isolated,'projects/workspace.furnish.json'));
 const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'cache'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 const desktop=await _electron.launch({executablePath:path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe'),env,timeout:60000}),errors=[];let browser;
 const ready=p=>p.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting&&!!window.FurnishRepository);
 try{
  const p=await desktop.firstWindow();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));await ready(p);
  await p.evaluate(()=>{mutate(()=>{state.furniture=[{id:'direction-test',type:'sofa',name:'方向核对沙发',w:1800,d:850,h:800,cx:5000,cy:5000,rot:0,color:'#c89d68'}];});selectIds(['direction-test']);zoomSel();});
  const marks=p.locator('[data-edit-overlay="furniture-directions"]');assert.equal(await marks.locator('[data-product-direction]').count(),4);
  await p.screenshot({path:path.join(run,'desktop-default.png')});
  await p.evaluate(()=>mutate(()=>Object.assign(getF('direction-test'),{rot:30,flip:true})));assert.equal(await marks.locator('[data-product-direction]').count(),4);
  await p.evaluate(()=>undo());assert.equal(await p.evaluate(()=>getF('direction-test').rot),0);await p.evaluate(()=>redo());assert.equal(await p.evaluate(()=>getF('direction-test').flip),true);
  await p.locator('#showMenu summary').click();await p.locator('[data-layer="directions"]').click();assert.equal(await marks.count(),0);
  await p.evaluate(()=>FurnishRepository.flush());await p.reload();await ready(p);assert.equal(await p.evaluate(()=>ui.layers.directions),false);
  await p.evaluate(()=>{setLayer('directions',true);selectIds(['direction-test']);zoomSel();});
  for(let i=0;i<4;i++){await p.locator('#drawing-right').click();assert.equal(await marks.locator('[data-product-direction]').count(),4);assert.equal(await p.evaluate(()=>getF('direction-test').rot),30);}
  assert.equal(await p.evaluate(()=>preparePlanSVG().svg.querySelectorAll('[data-product-direction]').length),0);
  await p.evaluate(()=>{view.s*=1.5;applyView();});assert.equal(await marks.locator('[data-product-direction]').count(),4);
  await p.screenshot({path:path.join(run,'desktop-rotated-mirrored.png')});
  await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(390,844));await p.waitForTimeout(400);await p.evaluate(()=>zoomSel());await p.screenshot({path:path.join(run,'desktop-narrow.png'),animations:'disabled'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.evaluate(()=>setLayer('furn',false));assert.equal(await marks.count(),0);await p.evaluate(()=>setLayer('furn',true));
  await p.evaluate(()=>FurnishRepository.flush());await p.reload();await ready(p);await p.evaluate(()=>{selectIds(['direction-test']);zoomSel();});assert.equal(await marks.locator('[data-product-direction]').count(),4);
  browser=await chromium.launch({headless:true});const context=await browser.newContext();
  for(const url of [`http://127.0.0.1:${port}/`,require('node:url').pathToFileURL(path.join(isolated,'index.html')).href]){
   const q=await context.newPage();q.on('pageerror',e=>errors.push(e.message));await q.goto(url);await q.waitForFunction(()=>typeof renderSel==='function'&&typeof state!=='undefined');if(url.startsWith('http'))await ready(q);
   await q.evaluate(()=>{const f=state.furniture[0];if(!f)throw Error('missing furniture');selectIds([f.id]);zoomSel();});assert.equal(await q.locator('[data-product-direction]').count(),4);await q.close();
  }
  assert.deepEqual(errors,[]);assert.equal(hash(source),before);
  fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,sourceUnchanged:true,desktop:true,rotationMirror:true,undoRedo:true,saveRefresh:true,preferenceRefresh:true,zoom:true,narrow390:true,exportClean:true,http:true,file:true,errors},null,2));console.log('PASS furniture directions: '+run);
 }finally{await browser?.close();await desktop.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
