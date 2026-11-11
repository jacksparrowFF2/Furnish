/* Scoped acceptance with the packaged EXE, a copy of the current file and private cache. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{_electron}=require('playwright');
const root=path.resolve(__dirname,'..'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function main(){
 const source=path.resolve(process.argv[2]||path.join(root,'projects/workspace.furnish.json')),before=hash(source),run=fs.mkdtempSync(path.join(root,'output/chair-vihals-folding-desktop-')),isolated=path.join(run,'workspace');fs.mkdirSync(isolated);
 for(const name of ['index.html','src','styles','vendor','assets'])fs.cpSync(path.join(root,name),path.join(isolated,name),{recursive:true});
 fs.mkdirSync(path.join(isolated,'scripts'));for(const name of require('../scripts/package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(isolated,'scripts',name));
 fs.mkdirSync(path.join(isolated,'projects'));fs.copyFileSync(source,path.join(isolated,'projects/workspace.furnish.json'));
 const portServer=http.createServer();await new Promise(r=>portServer.listen(0,'127.0.0.1',r));const port=portServer.address().port;await new Promise(r=>portServer.close(r));
 const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'cache'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 const desktop=await _electron.launch({executablePath:require('../scripts/launch-desktop.cjs').desktopExecutable(root),env,timeout:60000}),errors=[];
 try{
  const page=await desktop.firstWindow();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));await page.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting&&!!window.FurnishRepository);
  assert.equal(await page.locator('#lib .item').filter({hasText:'VIHALS'}).count(),1);
  const B=require('../src/core/cabinet-core.js'),host={id:'folding-host-desktop',type:'cabinet',...B.preset('storage'),w:900,d:350,h:2350,rot:0,color:'#f3f1ec'};host.cabinet.plinth=50;host.cabinet.columns=[{door:'double',doorOpen:true,drawers:[],shelves:[1050,1400,1850]}];
  const fixtures=[host,{id:'folding-chair-desktop',type:'chair_ikea_vihals',name:'VIHALS',w:430,d:470,h:800,rot:0,color:'#74856b',foldingChairFolded:true,mountHeight:68}];
  await page.evaluate(fixtures=>{const at=PLAN.rooms.find(r=>r.counted!==false&&r.at)?.at||[0,0];for(const f of fixtures){f.cx=at[0];f.cy=at[1];}mutate(()=>{state.furniture=fixtures;});selectIds(['folding-chair-desktop']);},fixtures);
  assert.equal(await page.locator('#folding-chair-state').inputValue(),'folded');
  await page.locator('#folding-chair-state').selectOption('open');assert.equal(await page.evaluate(()=>getF('folding-chair-desktop').foldingChairFolded),false);
  await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>getF('folding-chair-desktop').foldingChairFolded),true);
  await page.evaluate(()=>redo());assert.equal(await page.evaluate(()=>getF('folding-chair-desktop').foldingChairFolded),false);
  await page.locator('#folding-chair-state').selectOption('folded');
  await page.locator('#fC').evaluate(el=>{el.value='#b67a58';el.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(await page.evaluate(()=>getF('folding-chair-desktop').color),'#b67a58');
  await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>getF('folding-chair-desktop').color),'#74856b');await page.evaluate(()=>redo());assert.equal(await page.evaluate(()=>getF('folding-chair-desktop').color),'#b67a58');
  await page.locator('#fMountHeight').fill('118');await page.locator('#fMountHeight').press('Tab');assert.equal(await page.evaluate(()=>getF('folding-chair-desktop').mountHeight),118);await page.evaluate(()=>undo());
  await page.evaluate(()=>mutate(()=>{getF('folding-chair-desktop').locked=true;}));assert(await page.locator('#folding-chair-state').isDisabled());await page.evaluate(()=>undo());
  await page.evaluate(()=>FurnishRepository.flush());await page.reload();await page.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting);assert.equal(await page.evaluate(()=>getF('folding-chair-desktop').type),'chair_ikea_vihals');assert.equal(await page.evaluate(()=>getF('folding-chair-desktop').foldingChairFolded),true);assert.equal(await page.evaluate(()=>getF('folding-chair-desktop').color),'#b67a58');assert.equal(await page.evaluate(()=>getF('folding-chair-desktop').mountHeight),68);
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.evaluate(()=>{selectIds(['folding-host-desktop','folding-chair-desktop']);View3D.focusSelection();});await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>furnitureRenderErrors.size),0);await page.screenshot({path:path.join(run,'desktop-model.png')});
  const colored=await page.evaluate(async()=>Array.from(new Uint8Array((await View3D.blenderScene({includeHidden:false,expandInstances:true})).buffer)));fs.writeFileSync(path.join(run,'colored-folded.glb'),Buffer.from(colored));
  await page.evaluate(()=>FurnishRepository.flush());
  assert.deepEqual(errors,[]);assert.equal(hash(source),before);fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,source,sourceUnchanged:true,root:isolated,executable:'output/desktop/Furnish-win32-x64/Furnish.exe',catalog:true,undoRedo:true,saveRefresh:true,production3D:true,foldedControl:true,colorControl:true,supportControl:true,lockControl:true,errors},null,2));console.log('PASS packaged desktop VIHALS folded/color/support controls: '+run);
 }finally{await desktop.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
