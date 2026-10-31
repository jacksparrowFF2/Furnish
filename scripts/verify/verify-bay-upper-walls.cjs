'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {_electron,chromium}=require('playwright'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),{runtimeFiles}=require('../package-desktop.cjs'),source=path.resolve(process.argv[2]||path.join(root,'projects/workspace.furnish.json'));
const run=path.join(root,'output/bay-upper-walls-verification',new Date().toISOString().replace(/[:.]/g,'-')),workspace=path.join(run,'workspace');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main(){
 const before=hash(source),snapshot=require('../../src/core/repository-core.js').parse(JSON.parse(fs.readFileSync(source,'utf8')));fs.mkdirSync(workspace,{recursive:true});
 for(const name of ['index.html','manifest.webmanifest','src','styles','vendor','assets'])fs.cpSync(path.join(root,name),path.join(workspace,name),{recursive:true});fs.mkdirSync(path.join(workspace,'scripts'));for(const name of runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(workspace,'scripts',name));fs.mkdirSync(path.join(workspace,'projects'));fs.copyFileSync(source,path.join(workspace,'projects/workspace.furnish.json'));
 const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const env={...process.env,FURNISH_DESKTOP_ROOT:workspace,FURNISH_DESKTOP_PROFILE:path.join(run,'profile'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 const errors=[],results=[];let app,browser;
 async function inspect(page,entry){
  console.log('Inspect '+entry);
  page.on('pageerror',e=>errors.push(e.message));await page.locator('#repository-loading').waitFor({state:'hidden'});
  const headers=await page.evaluate(()=>{const p=FurnishProject.effectivePlan(PLAN,state),h=FurnishBayWindows.upperWalls(p);return h;});assert.equal(headers.length,2,entry+' full-depth headers');
  assert.deepEqual(headers.map(h=>h.bottom).sort(),[2295,2304]);assert(headers.every(h=>h.top===2700));
  const ids=await page.evaluate(()=>state.furniture.filter(f=>f.type==='window_surround').map(f=>f.id));assert.equal(ids.length,2);
  await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>document.body.classList.contains('m3d')&&!switching,null,{timeout:120000});
  const size=await page.evaluate(async()=>{globalThis.bayVerificationExport=(await View3D.blenderScene({includeCeilings:false})).buffer;return bayVerificationExport.byteLength;});console.log(entry+' GLB bytes '+size);const chunks=[];
  for(let offset=0;offset<size;offset+=262144){const encoded=await page.evaluate(({offset})=>{const bytes=new Uint8Array(bayVerificationExport,offset,Math.min(262144,bayVerificationExport.byteLength-offset));let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);},{offset});chunks.push(Buffer.from(encoded,'base64'));}
  const buffer=Buffer.concat(chunks);await page.evaluate(()=>delete globalThis.bayVerificationExport);fs.writeFileSync(path.join(run,entry+'.glb'),buffer);const gltf=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString()),nodes=gltf.nodes.filter(n=>n.extras?.furnishPartKey?.startsWith('explicit:bay-upper-wall:'));assert.equal(nodes.length,2);assert.equal(new Set(nodes.map(n=>n.extras.furnishPartKey)).size,2);
  for(let i=0;i<ids.length;i++){await page.waitForFunction(()=>View3D.blenderSyncSignature()!==null);await page.evaluate(id=>{selectIds([id]);View3D.focusSelection();},ids[i]);await page.waitForFunction(()=>View3D.blenderSyncSignature()!==null);await page.screenshot({path:path.join(run,entry+'-'+i+'.png')});}
  results.push({entry,headers,exportParts:nodes.map(n=>n.extras.furnishPartKey),glbSha256:hash(path.join(run,entry+'.glb'))});
 }
 try{
  console.log('Isolated results: '+run);app=await _electron.launch({executablePath:path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe'),env,timeout:60000});const page=await app.firstWindow();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].hide());await page.waitForURL(`http://127.0.0.1:${port}/`);await inspect(page,'desktop');
  await page.locator('[data-view="2d"]').click();await page.waitForFunction(()=>!switching);await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>FurnishBayWindows.upperWalls(FurnishProject.effectivePlan(PLAN,state)).length),2);
  browser=await chromium.launch({headless:true});const httpPage=await browser.newPage({viewport:{width:1440,height:960}});await httpPage.goto(`http://127.0.0.1:${port}/`);await inspect(httpPage,'http');
  const context=await browser.newContext({viewport:{width:1440,height:960}}),fileCache={...snapshot,work:{[snapshot.planId]:snapshot.work[snapshot.planId]},designs:[],activeDesigns:{},customPlans:snapshot.customPlans.filter(p=>p.id===snapshot.planId)};await context.addInitScript(s=>localStorage.setItem('huxing-design-v42',JSON.stringify(s)),fileCache);await context.setOffline(true);const filePage=await context.newPage();filePage.on('pageerror',e=>errors.push(e.message));await filePage.goto(pathToFileURL(path.join(workspace,'index.html')).href);await inspect(filePage,'file');
  assert.deepEqual(errors,[]);assert.equal(hash(source),before);fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({source,sourceUnchanged:true,sourceSha256:before,results,errors},null,2));console.log('PASS same EXE + HTTP + offline file: both derived headers, production GLB identity, focus views, refresh and source preservation');
 }catch(e){console.error(e);throw e;}finally{if(browser)await browser.close();if(app){let timer;await Promise.race([app.close(),new Promise(resolve=>{timer=setTimeout(()=>{app.process().kill();resolve();},5000);})]);clearTimeout(timer);}}
}
main().catch(()=>{process.exitCode=1;});
