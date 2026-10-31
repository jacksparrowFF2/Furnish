/* Real packaged renderer, private source/project/cache/port; no live-plan edits. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{_electron}=require(process.env.FURNISH_PLAYWRIGHT||'playwright'),F=require('../lib/model-browser-fixture.cjs');
async function main(executable,id='washer-tg10k60w'){
 const root=path.resolve(__dirname,'../..'),run=fs.mkdtempSync(path.join(root,'output/appliance-desktop-')),isolated=path.join(run,'workspace');fs.mkdirSync(isolated);
 for(const name of ['index.html','src','styles','vendor','assets'])fs.cpSync(path.join(root,name),path.join(isolated,name),{recursive:true});fs.mkdirSync(path.join(isolated,'scripts'));for(const name of require('../package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(isolated,'scripts',name));fs.mkdirSync(path.join(isolated,'projects'));fs.copyFileSync(path.join(root,'projects/workspace.furnish.json'),path.join(isolated,'projects/workspace.furnish.json'));
 const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'cache'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 const desktop=await _electron.launch({executablePath:path.resolve(executable),env,timeout:60000}),errors=[];
 try{
  const page=await desktop.firstWindow();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));await page.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting&&!!window.FurnishRepository);
  const profile=require('../lib/model-profiles.cjs').profiles().find(p=>p.id===id);assert(profile&&['washer-tg10k60w','fridge','hood'].includes(id));await F.install(page,profile);await page.evaluate(()=>{selectIds(['model-pilot']);View3D.focusSelection();});await page.waitForTimeout(1000);await page.evaluate(()=>selectIds([]));
  const geometry=await F.capture(page,path.join(run,'desktop.glb'));assert.equal(geometry.parts.length,profile.asset.parts);if(id==='washer-tg10k60w'){const glass=geometry.parts.find(p=>p.key.endsWith(':door-glass'));assert.equal(glass.materials[0].physical.KHR_materials_transmission.transmissionFactor,1);assert(Math.abs(glass.materials[0].physical.KHR_materials_volume.thicknessFactor-.0018)<1e-6);}else{const face=geometry.parts.find(p=>p.key.endsWith(id==='fridge'?':door-left':':sloped-glass'));assert(face.materials[0].physical.KHR_materials_clearcoat.clearcoatFactor>.5);}await page.screenshot({path:path.join(run,'desktop-closed.png')});
  await page.evaluate(f=>mutate(()=>{state.furniture=[f];}),profile.alternate);await F.capture(page,path.join(run,'desktop-open.glb'));await page.waitForTimeout(200);await page.screenshot({path:path.join(run,'desktop-open.png')});assert.deepEqual(errors,[]);
  // This synthetic studio is deliberately not a persisted floorplan. Exercise
  // the packaged renderer/export here; project persistence has separate suites.
  const actualRoot=await desktop.evaluate(()=>process.env.FURNISH_DESKTOP_ROOT);assert.equal(actualRoot,isolated);fs.writeFileSync(path.join(run,'desktop.json'),JSON.stringify({passed:true,profile:id,executable:path.resolve(executable),isolatedRoot:isolated,actualRoot,productionMaterial:true,parts:geometry.parts.length,errors},null,2));console.log(run);
 }finally{await desktop.evaluate(({BrowserWindow})=>{for(const window of BrowserWindow.getAllWindows())window.destroy();});await desktop.close();}
}
if(require.main===module)main(...process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
