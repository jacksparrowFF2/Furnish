/* Packaged desktop against an existing isolated model-pipeline snapshot. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{_electron}=require('playwright');
async function main(workspace){
 const root=path.resolve(__dirname,'../..'),isolated=path.resolve(workspace);assert(isolated.startsWith(path.join(root,'output')+path.sep));
 const run=path.join(isolated,'../cat-tower-desktop');fs.mkdirSync(run,{recursive:true});
 const source=path.join(root,'projects/workspace.furnish.json'),hash=()=>crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),before=hash();
 const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'cache'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 const exe=path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe'),desktop=await _electron.launch({executablePath:exe,env,timeout:60000}),errors=[];
 try{
  const p=await desktop.firstWindow();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));await p.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting&&!!window.FurnishRepository);
  assert(await p.evaluate(()=>LIB.flatMap(c=>c.items).some(i=>i[0]==='cat_tower_jd_10141711472484')));
  const fixture=require(path.join(isolated,'scripts/lib/model-profiles.cjs')).profiles().find(p=>p.id==='cat-tower').fixture;
  await p.evaluate(f=>{mutate(()=>{state.furniture=[{...f,id:'cat-desktop',cx:8200,cy:4100}];});selectIds(['cat-desktop']);},fixture);
  await p.locator('#fH').fill('2700');await p.locator('#fH').press('Tab');assert.equal(await p.evaluate(()=>state.furniture[0].h),2700);
  await p.evaluate(()=>undo());assert.equal(await p.evaluate(()=>state.furniture[0].h),2400);await p.evaluate(()=>redo());
  await p.evaluate(()=>FurnishRepository.flush());await p.reload();await p.waitForFunction(()=>!repositoryBooting);assert.equal(await p.evaluate(()=>state.furniture[0].h),2700);
  await p.evaluate(()=>selectIds(['cat-desktop']));await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>is3D()&&!switching);
  await p.evaluate(()=>View3D.automationCamera({focusIds:['cat-desktop']}));await p.screenshot({path:path.join(run,'desktop-3d.png')});
  await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(390,844));
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(run,'desktop-narrow.png')});
  assert.deepEqual(errors,[]);assert.equal(hash(),before);
  fs.writeFileSync(path.join(run,'report.json'),JSON.stringify({passed:true,exe,isolated,sourceUnchanged:true,catalog:true,heightControl:true,undoRedo:true,saveReload:true,narrow:true,errors},null,2));console.log('PASS cat tower desktop: '+run);
 }finally{await desktop.close();}
}
main(process.argv[2]).catch(e=>{console.error(e.stack);process.exitCode=1;});
