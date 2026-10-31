/* Scoped acceptance with the packaged EXE, a copy of the current file and private cache. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{_electron}=require('playwright');
const root=path.resolve(__dirname,'../..'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function main(){
 const source=path.resolve(process.argv[2]||path.join(root,'projects/workspace.furnish.json')),before=hash(source),run=fs.mkdtempSync(path.join(root,'output/sofa-bed-desktop-')),isolated=path.join(run,'workspace');fs.mkdirSync(isolated);
 for(const name of ['index.html','src','styles','vendor','assets'])fs.cpSync(path.join(root,name),path.join(isolated,name),{recursive:true});
 fs.mkdirSync(path.join(isolated,'scripts'));for(const name of require('../package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(isolated,'scripts',name));
 fs.mkdirSync(path.join(isolated,'projects'));fs.copyFileSync(source,path.join(isolated,'projects/workspace.furnish.json'));
 const portServer=http.createServer();await new Promise(r=>portServer.listen(0,'127.0.0.1',r));const port=portServer.address().port;await new Promise(r=>portServer.close(r));
 const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'cache'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 const desktop=await _electron.launch({executablePath:path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe'),env,timeout:60000}),errors=[];
 try{
  const page=await desktop.firstWindow();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));await page.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting&&!!window.FurnishRepository);
  assert.equal(await page.locator('#lib .item').filter({hasText:'Y107H03'}).count(),1);
  await page.evaluate(()=>{mutate(()=>{state.furniture=[{id:'sofa-desktop',type:'sofa_bed_yeswood_y107h03',name:'Y107H03 1.25米沙发床',w:1250,d:838,h:770,cx:5000,cy:4000,rot:0,color:'#c89d68'}];});selectIds(['sofa-desktop']);});
  const original=await page.evaluate(()=>JSON.stringify(state.furniture));await page.evaluate(()=>mutate(()=>{state.furniture[0]=FurnishDesign.resizeFurniture(state.furniture[0],{w:1400});}));await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>JSON.stringify(state.furniture)),original);await page.evaluate(()=>redo());assert.equal(await page.evaluate(()=>state.furniture[0].w),1400);await page.evaluate(()=>undo());
  await page.evaluate(()=>FurnishRepository.flush());await page.reload();await page.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting);assert.equal(await page.evaluate(()=>state.furniture[0].type),'sofa_bed_yeswood_y107h03');
  await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.evaluate(()=>{selectIds(['sofa-desktop']);View3D.focusSelection();});await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>furnitureRenderErrors.size),0);await page.screenshot({path:path.join(run,'desktop-model.png')});
  assert.deepEqual(errors,[]);assert.equal(hash(source),before);fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,source,sourceUnchanged:true,root:isolated,executable:'output/desktop/Furnish-win32-x64/Furnish.exe',catalog:true,undoRedo:true,saveRefresh:true,production3D:true,errors},null,2));console.log('PASS packaged desktop sofa bed: '+run);
 }finally{await desktop.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
