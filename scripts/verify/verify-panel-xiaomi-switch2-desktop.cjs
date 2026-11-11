/* Exact packaged EXE, private source/project/profile/port; never edit the user's plan. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {_electron}=require('playwright'),root=path.resolve(__dirname,'../..'),Artifacts=require('../lib/test-artifacts.cjs'),{runtimeFiles}=require('../package-desktop.cjs');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function main(){
 const source=process.argv[2]||'D:/1601装修/Furnish项目/workspace.furnish.json',executable='D:/1601装修/Furnish程序/Furnish-win32-x64/Furnish.exe',before=sha(source),localSource=path.join(root,'projects/workspace.furnish.json'),localHash=sha(localSource);
 const job=Artifacts.createRun({parent:path.join(root,'output/desktop-verification'),prefix:'panel-xiaomi-'}),run=job.dir,checks=[];let desktop,passed=false;
 try{
  const isolated=job.workspace('workspace',root,{directories:['src','styles','vendor','assets'],files:['index.html','manifest.webmanifest']});
  fs.copyFileSync(source,path.join(isolated,'projects/workspace.furnish.json'));
  for(const name of runtimeFiles)job.copy(path.join(root,'scripts',name),path.join('workspace/scripts',name));
  const s=http.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));
  job.discard('profile');const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'profile'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
  desktop=await _electron.launch({executablePath:executable,env,timeout:60000});const page=await desktop.firstWindow(),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.waitForURL(`http://127.0.0.1:${port}/`);await page.locator('#repository-loading').waitFor({state:'hidden'});
  await page.evaluate(()=>{const item=LIB.flatMap(c=>c.items).find(i=>i[0]==='panel_bull_g12');addItem(item,3000,3000);});
  const id=await page.evaluate(()=>selIds()[0]);assert(id,'catalog add selects new panel');
  await page.locator('#fPanelVariant').selectOption('xiaomi-2pro-3-grey');assert.equal(await page.evaluate(id=>getF(id).panelVariant,id),'xiaomi-2pro-3-grey');
  assert.equal(await page.evaluate(id=>getF(id).d,id),5);assert.equal(await page.locator('#fC').count(),0,'Xiaomi colors are selected with the variant');
  const width=await page.locator('[data-panel-settings]').evaluate(e=>({group:e.getBoundingClientRect().width,parent:e.parentElement.getBoundingClientRect().width,select:e.querySelector('select').getBoundingClientRect().width}));assert(width.group>=width.parent*.95&&width.select>=width.group*.95,'panel controls use the full property column');
  await page.evaluate(()=>undo());assert.equal(await page.evaluate(id=>getF(id).panelVariant,id),'socket5-diagonal');await page.evaluate(()=>redo());assert.equal(await page.evaluate(id=>getF(id).panelVariant,id),'xiaomi-2pro-3-grey');
  checks.push('real catalog add, property variant selection, undo/redo');
  await page.evaluate(id=>{mutate(()=>{state.furniture=state.furniture.filter(f=>f.id===id);const f=getF(id),room=canvasEffectivePlan().rooms.find(r=>r.counted!==false&&r.at);if(room){f.cx=room.at[0];f.cy=room.at[1];}});},id);
  // Exercise the normal bottom-height property input, not a parallel save channel.
  const elevation=page.locator('#fMountHeight,#fBottomElevation');assert.equal(await elevation.count(),1);await elevation.fill('1200');await elevation.press('Tab');assert.equal(await page.evaluate(id=>FurnishProducts.bottomHeight(getF(id)),id),1200);
  for(const key of await page.evaluate(()=>Object.keys(FurnishProducts.panelOptions))){await page.locator('#fPanelVariant').selectOption(key);assert.equal(await page.evaluate(id=>getF(id).panelVariant,id),key);}
  await page.locator('#fPanelVariant').selectOption('xiaomi-2-2-white');await page.evaluate(()=>FurnishRepository.flush());await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(id=>getF(id).panelVariant,id),'xiaomi-2-2-white');assert.equal(await page.evaluate(id=>FurnishProducts.bottomHeight(getF(id)),id),1200);
  checks.push('all 49 options, independent bottom height, saved v85 file and refresh');
  await page.evaluate(id=>selectIds([id]),id);await page.locator('#fPanelVariant').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(run,'properties.png')});
  await page.evaluate(id=>mutate(()=>{getF(id).locked=true;}),id);assert(await page.locator('#fPanelVariant').isDisabled());await page.evaluate(()=>undo());assert(await page.locator('#fPanelVariant').isEnabled());
  await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(390,844));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#tgPanel').click();if(!await page.locator('#fPanelVariant').isVisible())await page.locator('#tgPanel').click();await page.locator('#fPanelVariant').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(run,'narrow.png')});await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1280,960));
  checks.push('locked control, 390px layout');
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);assert.equal(await page.evaluate(()=>furnitureRenderErrors.size),0);
  const F=require('../lib/model-browser-fixture.cjs'),bundle=require('../../src/data/panel-xiaomi-switch2-blender-asset.js');
  for(const key of Object.keys(bundle.variants)){
   await page.locator('#fPanelVariant').selectOption(key);const exported=await F.capture(page,path.join(run,key+'.glb'));
   assert.equal(exported.parts.length,bundle.variants[key].parts.length);assert(exported.parts.every(p=>p.key.startsWith('explicit:panel-xiaomi-switch2:'+key+':')));assert(exported.bounds[0][1]>=1.19&&exported.bounds[1][1]<=1.40);
  }
  checks.push('live 3D variant cache: all 12 Xiaomi export actual selected parts');
  await page.locator('[data-view="2d"]').click();await page.waitForFunction(()=>!switching);await page.evaluate(()=>FurnishRepository.flush());
  assert.deepEqual(errors,[]);assert.equal(sha(source),before);assert.equal(sha(localSource),localHash);
  const report={passed:true,executable,source,originalHash:before,originalUnchanged:true,repositoryPlanUnchanged:true,checks,errors,run};fs.writeFileSync(path.join(run,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));passed=true;
 }finally{if(desktop){if(!passed)desktop.process().kill();await desktop.close().catch(()=>{});}assert.equal(sha(source),before);job.finish(passed);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
