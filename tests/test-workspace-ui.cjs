/* Production desktop acceptance. All edits run in a private copy and profile. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const {_electron,chromium}=require('playwright'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),source=path.resolve(process.argv[2]||path.join(root,'projects/workspace.furnish.json'));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function main(){
 const before=hash(source),run=path.join(root,'output/workspace-ui',new Date().toISOString().replace(/[:.]/g,'-')),isolated=path.join(run,'workspace');
 fs.mkdirSync(isolated,{recursive:true});
 for(const name of ['index.html','manifest.webmanifest','src','styles','vendor','assets'])fs.cpSync(path.join(root,name),path.join(isolated,name),{recursive:true});
 fs.mkdirSync(path.join(isolated,'scripts'));for(const name of require('../scripts/package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(isolated,'scripts',name));
 fs.mkdirSync(path.join(isolated,'projects'));fs.copyFileSync(source,path.join(isolated,'projects/workspace.furnish.json'));
 const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'profile'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 let desktop,browser;const errors=[],checks=[];
 const pass=s=>{checks.push(s);console.log('PASS '+s);};
 try{
  desktop=await _electron.launch({executablePath:require('../scripts/launch-desktop.cjs').desktopExecutable(root),env,timeout:60000});
  const page=await desktop.firstWindow();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.type()==='beforeunload'?d.accept():d.dismiss());
  await page.waitForURL(`http://127.0.0.1:${port}/`);await page.waitForFunction(()=>!repositoryBooting&&!!window.FurnishWorkflowTools);
  await page.locator('#repository-loading').waitFor({state:'hidden'});
  assert.deepEqual(errors,[],'desktop boot must have no renderer exceptions');
  const resize=async width=>{await desktop.evaluate(({BrowserWindow},w)=>BrowserWindow.getAllWindows()[0].setContentSize(w,960),width);await page.waitForFunction(w=>Math.abs(innerWidth-w)<=1,width);await page.waitForTimeout(400);};
  await resize(1280);
  const designs=await page.evaluate(()=>({active:FurnishDesign.activeDesign(store,PLAN.id)?.id,ids:store.designs.filter(d=>d.planId===PLAN.id&&d.editable).map(d=>d.id)}));
  if(designs.active&&designs.ids.length>1){const other=designs.ids.find(id=>id!==designs.active);await page.locator('#design-select').selectOption(other);assert.equal(await page.evaluate(()=>FurnishDesign.activeDesign(store,PLAN.id).id),other);await page.locator('#design-select').selectOption(designs.active);await page.locator('[data-workspace-mode]').first().waitFor();pass('scheme selector switches both ways through the original save path');}
  const initial=await page.evaluate(()=>snap());
  await page.evaluate(()=>{drawer('lib',true);drawer('panel',true);FurnishObservationLayers.open();});
  await page.waitForTimeout(500);
  assert.ok(await page.locator('.app').evaluate(el=>el.classList.contains('layers-overlay')));
  assert.ok((await page.locator('#stage').boundingBox()).width>=510);
  await page.screenshot({path:path.join(run,'01-panels.png')});pass('1280px: layers float instead of compressing the drawing');
  await page.locator('[data-workspace-mode="arrange"]').click();await page.waitForTimeout(400);
  assert.ok((await page.locator('#stage').boundingBox()).width>950);
  await page.locator('#catalog-density').click();assert.ok(await page.locator('#lib').evaluate(el=>el.classList.contains('catalog-compact')));
  await page.screenshot({path:path.join(run,'02-arrange.png')});
  await page.evaluate(()=>FurnishRepository.flush());await page.reload({waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>!repositoryBooting);assert.ok(await page.locator('#lib').evaluate(el=>el.classList.contains('catalog-compact')));
  assert.equal(await page.evaluate(()=>snap()),initial);pass('arrange shortcut and compact catalog persist without changing the design');
  await page.locator('[data-workspace-mode="review"]').click();await page.waitForTimeout(400);
  await page.locator('[data-space-filter="pending"]').click();assert.ok(await page.locator('[data-space-filter="pending"]').textContent());
  assert.ok((await page.locator('#panel').textContent()).includes('信息不足'));
  await page.screenshot({path:path.join(run,'03-review.png')});
  await page.locator('[data-tab="overview"]').click();assert.ok(await page.locator('.review-summary').isVisible());
  assert.equal(await page.locator('.overview-budget').getAttribute('open'),null);
  await page.locator('.overview-budget>summary').click();assert.ok(await page.locator('.price-summary').isVisible());pass('review categories share the badge counts; purchasing is folded in overview');
  await page.locator('[data-workspace-mode="detail"]').click();
  await page.evaluate(()=>FurnishObservationLayers.open());
  await page.locator('[data-layer-select="0"]').click();assert.ok(await page.locator('.layer-branch .observation-row').count());
  assert.equal(await page.locator('.layer-assignment').isVisible(),false);
  await page.locator('[data-layer-object]').first().check();assert.ok(await page.locator('.layer-assignment').isVisible());
  const layerId=await page.evaluate(()=>FurnishLayers.list(state).find(l=>l.id!=='0')?.id);
  if(layerId){const visible=await page.evaluate(id=>FurnishLayers.list(state).find(l=>l.id===id).visible,layerId);await page.locator(`[data-layer-visible="${layerId}"]`).click();await page.keyboard.press('Control+z');assert.equal(await page.evaluate(id=>FurnishLayers.list(state).find(l=>l.id===id).visible,layerId),visible);}
  pass('layer expansion, conditional assignment and production undo');
  console.log('STEP close layers');await page.evaluate(()=>FurnishObservationLayers.close());console.log('STEP tools');
  await page.locator('.rail-tool-menu>summary').click();await page.locator('#tiling-open').waitFor({state:'visible'});assert.ok(await page.locator('#ceiling-open').isVisible());
  console.log('STEP note');await page.locator('.rail-tool-pop [data-tool="note"]').click();assert.equal(await page.evaluate(()=>ui.tool),'note');
  console.log('STEP select');await page.locator('#tools [data-tool="select"]').click();
  pass('secondary tools include tiling, ceilings and working annotation selection');
  await page.evaluate(()=>{const f=state.furniture.find(f=>!furnitureLocked(f));selectIds([f.id]);});
  const edit=await page.evaluate(()=>{const f=getF(ui.sel.id),old=f.color;mutate(()=>f.color='#738e85');return {id:f.id,old};});
  await page.keyboard.press('Control+z');assert.equal(await page.evaluate(id=>getF(id).color,edit.id),edit.old);
  await page.keyboard.press('Control+Shift+z');await page.evaluate(()=>FurnishRepository.flush());await page.reload();await page.waitForFunction(()=>!repositoryBooting);
  assert.equal(await page.evaluate(id=>getF(id).color,edit.id),'#738e85');pass('furniture edits retain undo/redo, formal save and reload');
  for(const width of [1920,1101,390]){
   console.log('STEP resize '+width);await resize(width);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.locator('[data-workspace-mode="detail"]').click();await page.waitForTimeout(400);
   if(width===390){const box=await page.locator('aside.right').boundingBox(),actual=await page.evaluate(()=>innerWidth);assert.ok(box.x>=0&&box.x+box.width<=actual+1);}
   await page.screenshot({path:path.join(run,`04-detail-${width}.png`)});
  }
  await resize(1440);await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>is3D()&&!switching,null,{timeout:120000});
  await page.locator('.rail-tool-menu>summary').click();await page.locator('#vCamera').waitFor({state:'visible'});assert.equal(await page.locator('[data-tool="note"]').isVisible(),false);
  await page.waitForTimeout(500);await page.screenshot({path:path.join(run,'05-3d-tools.png')});pass('1920/1101/390 layouts and 3D tools');
  await page.locator('#vCamera').click();await page.locator('#cameraPanel').waitFor({state:'visible'});await page.keyboard.press('Escape');assert.ok(await page.locator('#vCamera').evaluate(el=>el===document.activeElement));pass('3D camera panel opens and returns keyboard focus on Escape');
  browser=await chromium.launch({headless:true,channel:'chrome'});const local=await browser.newPage();local.on('pageerror',e=>errors.push(e.message));
  await local.context().setOffline(true);await local.goto(pathToFileURL(path.join(isolated,'index.html')).href);await local.waitForFunction(()=>!!window.FurnishWorkflowTools&&!repositoryBooting);
  await local.locator('[data-workspace-mode="review"]').click();assert.ok(await local.locator('[data-space-filter]').count());pass('offline file:// entry retains the workspace controls');
  assert.deepEqual(errors,[]);assert.equal(hash(source),before);
  fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({checks,errors,sourceUnchanged:true},null,2));console.log('RESULTS '+run);
 }catch(e){console.error(e);throw e;}finally{if(browser)await browser.close();if(desktop){const child=desktop.process();let timer;try{await Promise.race([desktop.close(),new Promise(r=>{timer=setTimeout(()=>{child.kill();r();},5000);})]);}finally{clearTimeout(timer);}}assert.equal(hash(source),before);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
