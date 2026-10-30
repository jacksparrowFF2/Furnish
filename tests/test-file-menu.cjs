 'use strict';
// All archive API requests are intercepted; only fresh browser caches may change.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),V=require('../scripts/lib/browser-verification.cjs');
(async()=>{
 const server=await V.staticServer(V.projectRoot),browser=await V.loadPlaywright().chromium.launch(V.configuration().launchOptions);
 const output=path.join(V.projectRoot,'output/playwright/file-menu');fs.mkdirSync(output,{recursive:true});
 try{for(const protocol of ['http','file']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[];let requests=0;
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/api/furnish/**',route=>{requests++;const endpoint=new URL(route.request().url()).pathname;
   const workspace=JSON.parse(fs.readFileSync(path.join(V.projectRoot,'projects/workspace.furnish.json'),'utf8')).workspace;
   const storage={file:'D:/1601装修/Furnish项目/workspace.furnish.json',savedAt:Date.now(),directory:'D:/1601装修/Furnish项目',retention:'30 天'};
   return route.fulfill({json:endpoint.endsWith('/workspace')?{workspace,revision:'menu-fixture',storage}:endpoint.endsWith('/storage')?storage:[]});
  });
  await page.goto(protocol==='http'?server.baseURL+'index.html':pathToFileURL(path.join(V.projectRoot,'index.html')).href);
  await page.locator('#repository-loading').waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-file-tab],#manageDesigns,#saveDesign,#file-pane-history').count(),0);
  assert(await page.locator('header #saveMenu #saved').isVisible());assert((await page.locator('#saved').innerText()).length>0);
  await page.locator('#saveMenu>summary').click();assert(await page.locator('#file-save-status').isVisible());
  await page.locator('#storage-settings').click();assert.equal(await page.locator('#saveMenu').getAttribute('open'),null);
  if(protocol==='http'){assert(await page.locator('#storage-retry').isVisible());await page.locator('#dlgClose').click();
   // Save failure and retry remain truthful after moving the indicator into the header.
   await page.evaluate(()=>{window.testClient=repositoryClient;repositoryClient={status:{mode:'error',message:'验收：磁盘不可写'},schedule(){},async retry(){window.testRetried=true;}};syncSaved();});
   assert(await page.locator('#saved').evaluate(el=>el.classList.contains('err')));
   await page.locator('#saveMenu>summary').click();assert((await page.locator('#file-save-status').innerText()).includes('磁盘不可写'));
   await page.locator('#storage-settings').click();await page.locator('#storage-retry').click();assert(await page.evaluate(()=>window.testRetried));await page.locator('#dlgClose').click();
   await page.evaluate(()=>{repositoryClient=window.testClient;delete window.testClient;syncSaved();});
  }else{assert.equal(await page.locator('#storage-directory').count(),0);assert.equal(requests,0);}
  await page.locator('#fileMenu>summary').click();assert.equal((await page.locator('#fileMenu>summary').innerText()).trim(),'导出');
  assert.equal(await page.locator('#fileMenu #importJson').count(),0);
  for(const id of ['file-backup','file-deliver','file-dxf','purchaseList','exportPng','exportCsv','printPlan'])assert(await page.locator('#'+id).isVisible(),id);
  const download=page.waitForEvent('download');await page.locator('#exportCsv').click();await download;assert.equal(await page.locator('#fileMenu').getAttribute('open'),null);
  await page.locator('#moreMenu>summary').click();assert(await page.locator('#moreMenu #recoveryPoints').isVisible());assert(await page.locator('#moreMenu #importJson').isVisible());
  assert.equal(await page.locator('#moreMenu #repository-recovery').count(),protocol==='http'?1:0);
  await page.locator('#recoveryPoints').click();assert(await page.locator('#recovery-create').isVisible());await page.locator('#dlgClose').click();
  await page.locator('#moreMenu>summary').click();await page.locator('.file-maintenance>summary').click();await page.locator('#resetMenu').click();assert(await page.locator('#dlg').isVisible());await page.locator('#dlgClose').click();
  await page.evaluate(()=>{hist=[{planId:PLAN.id,ts:Date.now(),n:state.furniture.length,reason:'入口验收',data:{...JSON.parse(snap()),designNote:'snapshot restored'}}];renderHist();});
  const note=await page.evaluate(()=>state.designNote);await page.locator('#moreMenu>summary').click();await page.locator('#recoveryPoints').click();await page.locator('[data-recovery-preview]').click();
  await page.locator('#dlgActions').getByRole('button',{name:'恢复到此记录',exact:true}).click();assert.equal(await page.evaluate(()=>state.designNote),'snapshot restored');await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>state.designNote),note);
  await page.locator('#bar-manage-designs').click();assert(await page.locator('#design-history').isVisible());await page.locator('#dlgClose').click();
  for(const viewport of [{width:1440,height:1000},{width:932,height:900},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.waitForTimeout(150);
   for(const id of ['saveMenu','fileMenu','moreMenu']){
    await page.locator('#'+id+'>summary').click();await page.waitForTimeout(50);
    const box=await page.locator('#'+id+'>.menu-pop').boundingBox();assert(box.x>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,JSON.stringify({id,box}));
    assert.equal(await page.locator('#saveMenu[open],#fileMenu[open],#moreMenu[open]').count(),1);
    await page.screenshot({path:path.join(output,protocol+'-'+viewport.width+'-'+id+'.png')});
    await page.keyboard.press('Escape');assert.equal(await page.locator('#'+id).getAttribute('open'),null);assert(await page.locator('#'+id+'>summary').evaluate(el=>el===document.activeElement));
   }
  }
  await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});assert(await page.locator('#saved').isVisible());assert(await page.locator('#bar-manage-designs').isVisible());
  if(protocol==='file')assert.equal(requests,0);assert.deepEqual(errors,[]);await context.close();console.log('PASS '+protocol+': split save/export/more, save failure/retry, downloads, recovery/undo, reset, keyboard and responsive bounds');
 }}finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
