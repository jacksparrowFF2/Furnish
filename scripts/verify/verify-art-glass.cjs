/* Packaged EXE and offline production-export acceptance, in an isolated copy. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{_electron,chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),run=path.join(root,'output/art-glass-verification'),isolated=path.join(run,'workspace'),{runtimeFiles}=require('../package-desktop.cjs');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function main(){
 const source=path.join(root,'projects/workspace.furnish.json'),before=hash(source);fs.mkdirSync(isolated,{recursive:true});
 for(const n of ['index.html','manifest.webmanifest','src','styles','vendor','assets'])fs.cpSync(path.join(root,n),path.join(isolated,n),{recursive:true});
 fs.mkdirSync(path.join(isolated,'scripts'),{recursive:true});for(const n of runtimeFiles)fs.copyFileSync(path.join(root,'scripts',n),path.join(isolated,'scripts',n));
 fs.mkdirSync(path.join(isolated,'projects'),{recursive:true});fs.copyFileSync(source,path.join(isolated,'projects/workspace.furnish.json'));
 const socket=http.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'profile-'+Date.now()),FURNISH_PORT:String(port),FURNISH_MCP_DISABLE:'1'};delete env.ELECTRON_RUN_AS_NODE;
 const errors=[],checks=[];let app,browser,page;
 try{
  const exe=process.env.FURNISH_VERIFY_EXE||path.join(root,'output/desktop/Furnish-win32-x64/Furnish.exe');
  app=await _electron.launch({executablePath:exe,env,timeout:60000});page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await page.waitForURL(`http://127.0.0.1:${port}/`);await page.locator('#repository-loading').waitFor({state:'hidden'});
  await page.evaluate(()=>{mutate(()=>{state.furniture=[];state.furnitureDatum='survey';});addItem(LIB.flatMap(c=>c.items).find(i=>i[0]==='art_glass_partition'),3000,3000);});
  const id=await page.evaluate(()=>state.furniture[0].id);assert.equal(await page.locator('#fArtGlassPattern option').count(),9);assert.equal(await page.locator('#fH').count(),1);
  await page.locator('#fArtGlassPattern').selectOption('cube');await page.locator('#fArtGlassPattern').blur();await page.keyboard.press('Control+z');assert.equal(await page.evaluate(id=>getF(id).artGlassPattern,id),'fluted');await page.keyboard.press('Control+Shift+z');assert.equal(await page.evaluate(id=>getF(id).artGlassPattern,id),'cube');
  for(const [selector,value] of [['#fGlassDepth',6.5],['#fH',2200],['#fMountHeight',120]]){await page.locator(selector).fill(String(value));await page.locator(selector).dispatchEvent('change');}
  await page.locator('[data-fab-edit="size"]').click();await page.locator('#fab-width').fill('1100');await page.locator('#fab-size-form [type="submit"]').click();
  assert.deepEqual(await page.evaluate(id=>{const f=getF(id);return [f.w,f.d,f.h,f.mountHeight];},id),[1100,6.5,2200,120]);
  await page.locator('#fGlassDepth').fill('31');await page.locator('#fGlassDepth').dispatchEvent('change');assert.equal(await page.evaluate(id=>getF(id).d,id),6.5);
  await page.evaluate(id=>{mutate(()=>getF(id).locked=true);selectIds([id]);},id);assert(await page.locator('#fArtGlassPattern').isDisabled());assert(await page.locator('#fGlassDepth').isDisabled());await page.evaluate(id=>{mutate(()=>delete getF(id).locked);selectIds([id]);},id);
  checks.push('catalog; nine choices; actual property edits; thin decimal depth; invalid input; lock; undo/redo');
  await page.screenshot({path:path.join(run,'desktop-properties.png')});await page.evaluate(()=>FurnishRepository.flush());await page.reload();await page.locator('#repository-loading').waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(id=>{const f=getF(id);return [f.w,f.d,f.h,f.mountHeight,f.artGlassPattern];},id),[1100,6.5,2200,120,'cube']);checks.push('v46 save and refresh');
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(390,844));await page.evaluate(id=>selectIds([id]),id);await page.locator('#tgPanel').click();await page.locator('#fArtGlassPattern').scrollIntoViewIfNeeded();assert(await page.locator('#fArtGlassPattern').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(run,'desktop-narrow.png')});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1440,960));checks.push('390px desktop property layout');
  await page.locator('[data-view="3d"]').click();await page.waitForFunction(()=>document.body.classList.contains('m3d')&&!switching,null,{timeout:120000});
  await page.screenshot({path:path.join(run,'desktop-scene.png')});fs.writeFileSync(path.join(run,'desktop.glb'),Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array((await View3D.blenderScene()).buffer)))));
  checks.push('packaged EXE production WebGL and GLB');
  // Controlled sample arrangement: every pane is the production constructor,
  // exported by the application exporter. Background remains behind each pane.
  const samples=await page.evaluate(async()=>{
   const T=await import(JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports.three),group=new T.Group(),patterns=Object.keys(FurnishProducts.artGlassPatterns);
   const cam=new T.PerspectiveCamera(35,1,.01,30);cam.position.set(.05,.7,2.7);cam.lookAt(0,.6,0);
   for(const [i,pattern] of patterns.entries()){
    const f={id:'sample-'+pattern,type:'art_glass_partition',name:pattern,w:240,d:8,h:360,mountHeight:0,artGlassPattern:pattern,color:'#ffffff'},g=FurnishArtGlassModel.build(T,f);g.position.set((i%3-1)*.29,(2-Math.floor(i/3))*.41,0);g.userData.fid=f.id;group.add(g);
    const back=new T.Group();back.position.copy(g.position);back.position.z=-.09;back.userData.fid='background-'+i;
    const m=new T.Mesh(new T.BoxGeometry(.26,.38,.008),new T.MeshStandardMaterial({color:'#d9cbb1'}));m.position.y=.18;m.name='card';back.add(m);
    for(let j=0;j<7;j++){const b=new T.Mesh(new T.BoxGeometry(.012,.30,.004),new T.MeshStandardMaterial({color:j%2?'#7eaa97':'#193746'}));b.position.set((j-3)*.032,.18,.01);b.name='stripe-'+j;back.add(b);}
    group.add(back);
   }
   const light=new T.DirectionalLight('#ffffff',3);light.position.set(1,3,4);light.updateMatrixWorld();
   const out=await FurnishBlenderExport.encode(T,{groups:[group],camera:cam,sun:light});return Array.from(new Uint8Array(out.buffer));
  });fs.writeFileSync(path.join(run,'samples.glb'),Buffer.from(samples));checks.push('nine production sample panes export with embedded optical textures');
  browser=await chromium.launch({headless:true,channel:process.env.FURNISH_BROWSER_CHANNEL||'chrome'});const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${port}/`);await p.locator('#repository-loading').waitFor({state:'hidden'});assert.equal(await p.evaluate(id=>getF(id).d,id),6.5);checks.push('HTTP browser saved-file read');
  await p.context().setOffline(true);await p.goto(pathToFileURL(path.join(isolated,'index.html')).href);await p.locator('#repository-loading').waitFor({state:'hidden'});await p.evaluate(()=>{mutate(()=>state.furniture=[]);addItem(LIB.flatMap(c=>c.items).find(i=>i[0]==='art_glass_partition'),3000,3000);});await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>document.body.classList.contains('m3d')&&!switching,null,{timeout:120000});fs.writeFileSync(path.join(run,'file.glb'),Buffer.from(await p.evaluate(async()=>Array.from(new Uint8Array((await View3D.blenderScene()).buffer)))));checks.push('offline file:// production loading and GLB');
  assert.deepEqual(errors,[]);assert.equal(hash(source),before);fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({checks,errors,sourceSha256:before},null,2));console.log(checks.map(x=>'PASS '+x).join('\n'));
 }catch(e){if(page)await page.screenshot({path:path.join(run,'failure.png')});throw e;}
 finally{if(browser)await browser.close();if(app){let timer;await Promise.race([app.close(),new Promise(r=>{timer=setTimeout(()=>{app.process().kill();r();},5000);})]);clearTimeout(timer);}}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
