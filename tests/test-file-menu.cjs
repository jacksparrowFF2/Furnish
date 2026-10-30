'use strict';
// Fresh browser contexts and a read-only server; never write the user's workspace.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const V=require('../scripts/lib/browser-verification.cjs');
(async()=>{
 const server=await V.staticServer(V.projectRoot);
 const browser=await V.loadPlaywright().chromium.launch(V.configuration().launchOptions);
 const output=path.join(V.projectRoot,'output/playwright/file-menu');fs.mkdirSync(output,{recursive:true});
 try{
  for(const protocol of ['http','file']){
   const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.route('**/api/furnish/**',route=>{
    const endpoint=new URL(route.request().url()).pathname;
    const workspace=JSON.parse(fs.readFileSync(path.join(V.projectRoot,'projects/workspace.furnish.json'),'utf8')).workspace;
    const storage={file:'D:\\1601装修\\Furnish项目\\workspace.furnish.json',savedAt:Date.now()};
    const value=endpoint.endsWith('/workspace')?{workspace,revision:'menu-fixture',storage}:endpoint.endsWith('/storage')?{...storage,directory:'D:\\1601装修\\Furnish项目',retention:'30 天',backups:[]}:[];
    return route.fulfill({json:value});
   });
   await page.goto(protocol==='http'?server.baseURL+'index.html':pathToFileURL(path.join(V.projectRoot,'index.html')).href);
   await page.locator('#repository-loading').waitFor({state:'hidden'});
   await page.locator('#fileMenu>summary').click();
   assert.equal(await page.locator('#file-pane-save').isVisible(),true);
   assert.equal(await page.locator('#file-pane-export').isVisible(),false);
   await page.screenshot({path:path.join(output,protocol+'-save.png')});
   await page.locator('#file-tab-save').focus();await page.keyboard.press('ArrowRight');
   assert.equal(await page.locator('#file-tab-export').getAttribute('aria-selected'),'true');
   assert.equal(await page.locator('#fileMenu').getAttribute('open'),'');
   for(const id of ['file-deliver','file-dxf','purchaseList','exportPng','exportCsv','printPlan'])assert(await page.locator('#'+id).isVisible(),id);
   const download=page.waitForEvent('download');await page.locator('#exportCsv').click();await download;
   assert.equal(await page.locator('#fileMenu').getAttribute('open'),null);
   await page.locator('#fileMenu>summary').click();
   await page.locator('#file-tab-history').click();
   await page.locator('#recoveryPoints').click();assert(await page.locator('#recovery-create').isVisible());
   await page.locator('#dlg').press('Escape');
   // Populate long names and many snapshots without persisting or mutating project state.
   await page.evaluate(()=>{store.designs=Array.from({length:18},(_,i)=>({id:'test-'+i,planId:PLAN.id,name:'1601 · 主卧方案与餐边柜调整前的备份 '+i,work:state}));renderDesigns();hist=Array.from({length:8},(_,i)=>({planId:PLAN.id,ts:Date.now()-i*60000,n:state.furniture.length,reason:'入口验收',data:{...JSON.parse(snap()),designNote:'snapshot restored'}}));renderHist();});
   await page.locator('#fileMenu>summary').click();await page.locator('#file-tab-history').click();
   await page.locator('#manageDesigns').click();assert.equal(await page.locator('.design-record').count(),18);
   assert.equal(await page.locator('#fileMenu').getAttribute('open'),null);
   await page.locator('.design-record').first().getByRole('button',{name:'恢复到当前方案',exact:true}).click();
   assert.equal(await page.locator('#dlg').isVisible(),false);
   await page.locator('#bar-manage-designs').click();assert.equal(await page.locator('.design-record').count(),18);await page.locator('#dlgClose').click();
   const beforeSnapshot=await page.evaluate(()=>state.designNote);
   await page.locator('#fileMenu>summary').click();await page.locator('#file-tab-history').click();await page.locator('#recoveryPoints').click();
   await page.locator('[data-recovery-preview]').last().click();await page.locator('#dlgActions').getByRole('button',{name:'恢复到此记录',exact:true}).click();
   assert.equal(await page.evaluate(()=>state.designNote),'snapshot restored');await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>state.designNote),beforeSnapshot);
   for(const viewport of [{width:1440,height:1000},{width:932,height:900},{width:390,height:740}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(150);
    if(!await page.locator('#fileMenu').evaluate(el=>el.open))await page.locator('#fileMenu>summary').click();
    for(const tab of ['save','export','history']){
     await page.locator('#file-tab-'+tab).click();
     const box=await page.locator('.file-pop').boundingBox();assert(box.x>=0&&box.x+box.width<=viewport.width+1,JSON.stringify(box));assert(box.y+box.height<=viewport.height+1,JSON.stringify(box));
     if(tab==='history'){assert.equal(await page.locator('#designList,#histList,[data-dload],[data-hload]').count(),0);assert(await page.locator('#manageDesigns').isVisible());assert(await page.locator('.file-recovery-region #recoveryPoints').isVisible());assert.equal(await page.locator('.file-recovery-region #repository-recovery').count(),protocol==='http'?1:0);}
     await page.screenshot({path:path.join(output,protocol+'-'+viewport.width+'-'+tab+'.png')});
    }
   }
   await page.keyboard.press('Escape');assert.equal(await page.locator('#fileMenu').getAttribute('open'),null);
   await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});await page.locator('#fileMenu>summary').click();assert(await page.locator('#file-pane-save').isVisible());
   assert.deepEqual(errors,[]);await context.close();console.log('PASS '+protocol+' file menu: tabs, download, recovery, responsive bounds, reload');
  }
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
