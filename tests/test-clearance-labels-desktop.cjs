/* Product axes and board references, using an isolated copy in the packaged EXE. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{_electron}=require('playwright');
const root=path.resolve(__dirname,'..'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function main(){
 const source=path.resolve(process.argv[2]||path.join(root,'projects/workspace.furnish.json')),before=hash(source),run=fs.mkdtempSync(path.join(root,'output/clearance-labels-desktop-')),isolated=path.join(run,'workspace');fs.mkdirSync(isolated);
 for(const name of ['index.html','src','styles','vendor','assets'])fs.cpSync(path.join(root,name),path.join(isolated,name),{recursive:true});
 fs.mkdirSync(path.join(isolated,'scripts'));for(const name of require('../scripts/package-desktop.cjs').runtimeFiles)fs.copyFileSync(path.join(root,'scripts',name),path.join(isolated,'scripts',name));
 fs.mkdirSync(path.join(isolated,'projects'));fs.copyFileSync(source,path.join(isolated,'projects/workspace.furnish.json'));
 const portServer=http.createServer();await new Promise(r=>portServer.listen(0,'127.0.0.1',r));const port=portServer.address().port;await new Promise(r=>portServer.close(r));
 const env={...process.env,FURNISH_DESKTOP_ROOT:isolated,FURNISH_DESKTOP_PROFILE:path.join(run,'cache'),FURNISH_PORT:String(port)};delete env.ELECTRON_RUN_AS_NODE;
 const desktop=await _electron.launch({executablePath:require('../scripts/launch-desktop.cjs').desktopExecutable(root),env,timeout:60000}),errors=[];
 let page;
 try{
  page=await desktop.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));console.log('Desktop opened: '+run);
  await page.waitForFunction(()=>typeof repositoryBooting!=='undefined'&&!repositoryBooting&&!!window.FurnishRepository);
  const probeId='clearance-probe';
  await page.evaluate(id=>{
   setPlan(PLANS[0].id);const center=ROOMS.find(r=>r.name==='客厅').at,host={...FurnishCabinet.preset('storage'),id:'clearance-host',type:'cabinet',cx:center[0],cy:center[1],w:1218,d:500,h:600,rot:90};
   host.cabinet={...host.cabinet,backThickness:18,plinth:0,columns:[{width:200,door:'none',doorOpen:false,drawers:[],shelves:[]},{width:964,door:'none',doorOpen:false,drawers:[],shelves:[]}]};
   const probe={id,type:'block',name:'柜内方向验收块',cx:host.cx+43,cy:host.cy+302,w:530,d:300,h:100,rot:90,mountHeight:18,color:'#aabbcc'};
   mutate(()=>{state.furniture=[host,probe];state.drawing={...state.drawing,rotation:0};});ui.layers.clear=true;ui.layers.directions=true;selectIds([id]);renderAll();
  },probeId);
  const labels=await page.locator('[data-edit-overlay="directional-distance"]').allTextContents();console.log('Labels: '+JSON.stringify(labels));
  assert(labels.some(s=>s.includes('后 · 背板 39 mm')),labels.join('\n'));
  assert(labels.some(s=>s.includes('右 · 右侧板 24 mm')));
  assert(labels.some(s=>s.includes('左 · 隔板 410 mm')));
  await page.locator('#fab [data-fab-edit="distance"]').click();
  assert.match(await page.locator('#fab-editor').innerText(),/背板/);
  const axisChecks=await page.evaluate(()=>{
   const results=[];
   for(const rot of [0,37,90,180,270])for(const flip of [false,true])for(const drawing of [0,90,180,270]){
    const f={id:'probe',type:'block',w:100,d:80,h:100,cx:0,cy:0,rot,flip},frame=FurnishDrawing.clearanceFrame(f,drawing),marks=FurnishDrawing.furnitureDirections(f,{rotation:0});
    for(const [dir,key]of Object.entries(frame.directions)){
     const n=marks.find(m=>m.key===key).normal,target={...f,id:'target',cx:n[0]*300,cy:n[1]*300},m=FurnishSnapping.directional(f,{rotation:frame.rotation,furniture:[target]})[dir];
     if(!m||Math.abs(m.distance-(['front','back'].includes(key)?220:200))>.01)throw Error('Axis mismatch '+[rot,flip,drawing,dir,key]);
     const dx=m.b.x-m.a.x,dy=m.b.y-m.a.y;if(dx*n[0]+dy*n[1]<=0)throw Error('Direction disagrees with product marker');
    }results.push({rot,flip,drawing});
   }return results;
  });
  // Actual numeric placement must use the displayed product direction.
  await page.locator('#fab-editor [data-distance-edit="t"]').click();
  assert.match(await page.locator('#dlg').innerText(),/后.*背板/s);
  const initial=await page.evaluate(id=>({cx:getF(id).cx,cy:getF(id).cy}),probeId);
  await page.locator('#directional-gap-input').fill('30');await page.locator('#dlgActions .primary').click();
  await page.waitForFunction(id=>Math.abs(directionalMeasurements(getF(id)).t.distance-30)<.01,probeId);console.log('Placement reached 30 mm');
  const moved=await page.evaluate(id=>({cx:getF(id).cx,cy:getF(id).cy}),probeId);assert(moved.cx>initial.cx);assert(Math.abs(moved.cy-initial.cy)<.01);
  await page.evaluate(()=>undo());assert.deepEqual(await page.evaluate(id=>({cx:getF(id).cx,cy:getF(id).cy}),probeId),initial);
  await page.evaluate(()=>redo());assert.deepEqual(await page.evaluate(id=>({cx:getF(id).cx,cy:getF(id).cy}),probeId),moved);
  await page.evaluate(()=>FurnishRepository.flush());await page.reload();await page.waitForFunction(()=>!repositoryBooting);
  assert.deepEqual(await page.evaluate(id=>({cx:getF(id).cx,cy:getF(id).cy}),probeId),moved);
  await page.evaluate(id=>{selectIds([id]);ui.layers.clear=true;ui.layers.directions=true;renderAll();},probeId);
  // Fit the selected cabinet rather than the entire apartment for visual review.
  await page.evaluate(()=>{const f=getF('clearance-probe');view.s=.75;view.x0=f.cx-svg.clientWidth/2/view.s;view.y0=f.cy-svg.clientHeight*.55/view.s;applyView();});
  await page.screenshot({path:path.join(run,'desktop-labels.png')});
  await page.locator('#fab [data-fab-edit="distance"]').click();await page.screenshot({path:path.join(run,'desktop-panel.png')});
  await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(390,844));
  await page.waitForFunction(()=>innerWidth===390);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#fab-editor .fab-distance-grid').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(run,'desktop-narrow.png')});
  const group=await page.evaluate(()=>measurementDirectionNames([getF('clearance-probe'),getF('clearance-host')]));assert.equal(group.l,'图纸左');assert.equal(group.b,'图纸下');
  const external=await page.evaluate(()=>measurementReferenceShort({entity:{kind:'furniture',name:'桌子'}}));assert.equal(external,'外部障碍');
  assert.deepEqual(errors,[]);assert.equal(hash(source),before);
  fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify({passed:true,source,sourceUnchanged:true,axisChecks:axisChecks.length,numericPlacement:true,undoRedo:true,saveRefresh:true,narrow:true,labels,errors},null,2));console.log('PASS clearance labels desktop: '+run);
 }catch(e){console.error(e.stack);if(page)console.error(await page.evaluate(()=>({error:document.querySelector('#directional-gap-error')?.textContent,selected:selItems().map(f=>({id:f.id,cx:f.cx,cy:f.cy})),gaps:directionalMeasurements()})).catch(()=>null));if(page)await page.screenshot({path:path.join(run,'failure.png')}).catch(()=>{});throw e;
 }finally{
  if(page&&!page.isClosed())await page.evaluate(()=>FurnishRepository.flush()).catch(()=>{});
  const child=desktop.process();let timer;
  try{await Promise.race([desktop.close(),new Promise(resolve=>{timer=setTimeout(()=>{child.kill();resolve();},10000);})]);}finally{clearTimeout(timer);}
 }
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
