/* Real UI + API, disposable archive and fresh browser profiles only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),V=require('../scripts/lib/browser-verification.cjs'),C=require('../src/core/repository-core.js');
const output=path.join(root,'output/playwright',process.env.FURNISH_STORAGE_FIXTURE?'local-archive-large':'local-archive');fs.mkdirSync(output,{recursive:true});
const run=fs.mkdtempSync(path.join(output,'run-')),api=require('../scripts/repository-server.cjs').create(run),builtInPlan=require('../src/data/plans.js')[0];
let uid=0;const W=require('../src/core/work-state.js').create({makeId:()=> 'browser'+ ++uid,colorFor:()=> '#aabbcc',materials:require('../src/data/catalog.js').materials}),work=W.fresh(builtInPlan);
const seed=process.env.FURNISH_STORAGE_FIXTURE?JSON.parse(fs.readFileSync(process.env.FURNISH_STORAGE_FIXTURE,'utf8')).workspace:{v:Math.max(2,require('../src/core/project-core.js').formatVersion([work])),planId:builtInPlan.id,work:{[builtInPlan.id]:work},designs:[],customPlans:[]},plan={id:seed.planId};
api.write(seed,null);let dropNextSave=false;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.wasm':'application/wasm'};
const server=http.createServer(async(req,res)=>{
 if(dropNextSave&&req.method==='PUT'&&req.url==='/api/furnish/workspace'){dropNextSave=false;await api.handle(req,{writeHead(){},end(){res.destroy();}});return;}
 if(await api.handle(req,res))return;
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await V.loadPlaywright().chromium.launch(V.configuration().launchOptions),context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const ready=async()=>{await page.locator('#repository-loading').waitFor({state:'hidden'});await page.waitForFunction(()=>repositoryClient?.status.mode==='saved');};
 const settings=async()=>{if(!await page.locator('#storage-settings').isVisible())await page.locator('#fileMenu summary').click();await page.locator('#storage-settings').click();await page.locator('#storage-directory').waitFor();};
 try{
  await page.goto(base);await ready();const original=await page.evaluate(()=>state.furniture[0].cx);
  dropNextSave=true;await page.evaluate(()=>mutate(()=>state.furniture[0].cx+=25));await page.waitForFunction(()=>repositoryClient.status.mode==='saved'&&!repositoryClient.pending);
  assert.equal(api.read().workspace.work[plan.id].furniture[0].cx,original+25);
  await page.evaluate(()=>undo());await page.waitForFunction(()=>repositoryClient.status.mode==='saved'&&!repositoryClient.pending);assert.equal(api.read().workspace.work[plan.id].furniture[0].cx,original);
  await page.evaluate(()=>redo());await page.waitForFunction(()=>repositoryClient.status.mode==='saved'&&!repositoryClient.pending);assert.equal(api.read().workspace.work[plan.id].furniture[0].cx,original+25);
  await page.reload();await ready();assert.equal(await page.evaluate(()=>state.furniture[0].cx),original+25);
  await settings();await page.screenshot({path:path.join(output,'desktop.png')});
  const downloadEvent=page.waitForEvent('download');await page.locator('#storage-backups button').filter({hasText:'下载'}).first().click();const downloaded=await downloadEvent;await downloaded.saveAs(path.join(run,'download.furnish.json'));C.parse(JSON.parse(fs.readFileSync(path.join(run,'download.furnish.json'),'utf8')));
  const destination=path.join(run,'装修 项目 #');await page.locator('#storage-directory').fill(destination);await Promise.all([page.waitForEvent('load'),page.locator('#storage-move').click()]);await ready();
  assert.equal(api.info().directory,destination);assert.equal(api.read().workspace.work[plan.id].furniture[0].cx,original+25);
  await settings();await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'narrow.png')});
  assert.ok(await page.locator('#storage-directory').evaluate(el=>el.getBoundingClientRect().right<=innerWidth));
  // Restore the oldest version through the actual confirmation and reload flow.
  await page.locator('#storage-backups button').filter({hasText:'恢复此版本'}).last().click();await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'确认恢复',exact:true}).click()]);await ready();
  assert.equal(await page.evaluate(()=>state.furniture[0].cx),original);assert.ok(api.recoveries().length);
  // An unsaved browser edit based on the restored revision must not resume over
  // the user's explicitly selected history after damaged-primary recovery.
  await page.evaluate(async()=>{state.furniture[0].cx+=99;store.work[PLAN.id]=state;store.updatedAt=Date.now()+1000;localStorage.setItem(STORE,JSON.stringify(store));await window.FurnishStorage.write(store);});
  fs.writeFileSync(api.info().file,'broken primary\n');await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>repositoryClient.status.mode),'error');
  await settings();await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('localStorage unavailable');};});await page.locator('#storage-backups button').filter({hasText:'恢复此版本'}).last().click();await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'确认恢复',exact:true}).click()]);await ready();assert.equal(await page.evaluate(()=>state.furniture[0].cx),original);assert.equal(api.read().workspace.work[plan.id].furniture[0].cx,original);assert.ok(fs.readdirSync(path.join(destination,'damaged')).length);
  // Offline file mode: no archive API, retain latest IndexedDB semantics and refresh.
  const offline=await browser.newContext();await offline.setOffline(true);const filePage=await offline.newPage(),requests=[];filePage.on('pageerror',e=>errors.push(e.message));filePage.on('request',req=>{if(req.url().includes('/api/furnish'))requests.push(req.url());});
  await filePage.goto(pathToFileURL(path.join(root,'index.html')).href);await filePage.locator('#repository-loading').waitFor({state:'hidden'});
  const fileX=await filePage.evaluate(()=>state.furniture[0].cx);await filePage.evaluate(()=>mutate(()=>state.furniture[0].cx+=17));await filePage.waitForFunction(()=>!savePending&&!saveErr&&savedAt>0);await filePage.reload();await filePage.locator('#repository-loading').waitFor({state:'hidden'});assert.equal(await filePage.evaluate(()=>state.furniture[0].cx),fileX+17);
  await filePage.locator('#fileMenu summary').click();await filePage.locator('#storage-settings').click();await filePage.screenshot({path:path.join(output,'file-offline.png')});assert.deepEqual(requests,[]);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({status:'PASS',fixtureBytes:Buffer.byteLength(C.text(seed)),checks:['HTTP autosave despite lost successful response','undo redo','refresh','path migration','history download','full restore','damaged primary restore over divergent browser cache','390px','offline file autosave refresh without API'],errors},null,2));
  console.log('PASS real browser local archive, location settings, downloads, restore, undo/redo/refresh, 390px and offline file://');
 }catch(e){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw e;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
