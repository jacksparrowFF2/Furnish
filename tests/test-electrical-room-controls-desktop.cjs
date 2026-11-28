'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto'),net=require('node:net');
const {_electron}=require('playwright');
const Artifacts=require('../scripts/lib/test-artifacts.cjs');
const {runtimeFiles}=require('../scripts/package-desktop.cjs');
const {desktopExecutable}=require('../scripts/launch-desktop.cjs');
const root=path.resolve(__dirname,'..');
const source=process.env.FURNISH_TEST_PROJECT||path.join(root,'projects/workspace.furnish.json');
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function loopbackPort(){
 const socket=net.createServer();
 await new Promise((resolve,reject)=>socket.once('error',reject).listen(0,'127.0.0.1',resolve));
 const {port}=socket.address();
 await new Promise(resolve=>socket.close(resolve));
 return port;
}
async function main(){
 const original=hash(source),job=Artifacts.createRun({parent:path.join(root,'verification.noindex/desktop-verification'),prefix:'electrical-room-controls-'});
 let app,passed=false;
 try{
  const work=job.workspace('workspace',root,{directories:['src','styles','vendor'],files:['index.html','manifest.webmanifest']});
  job.copy(source,'workspace/projects/workspace.furnish.json',{disposable:false});
  for(const name of runtimeFiles)job.copy(path.join(root,'scripts',name),path.join('workspace/scripts',name));
  job.discard('profile');
  const port=await loopbackPort(),env={...process.env,FURNISH_DESKTOP_ROOT:work,FURNISH_DESKTOP_PROFILE:path.join(job.dir,'profile'),FURNISH_PORT:String(port)};
  delete env.ELECTRON_RUN_AS_NODE;
  app=await _electron.launch({executablePath:desktopExecutable(root),env,timeout:60000});
  const page=await app.firstWindow(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.setDefaultTimeout(25000);
  await page.waitForURL(`http://127.0.0.1:${port}/`);
  await page.locator('#repository-loading').waitFor({state:'hidden'});
  await page.evaluate(()=>{FurnishElectricalUI.setMode('electrical');if(is3D())return setView('2d');});
  const data=await page.evaluate(()=>{
   const readPoints=()=>FurnishElectrical.points(state,canvasEffectivePlan());
   const smart=points=>{
    const supported=points.filter(r=>r.room&&r.variant.gangs===3&&r.variant.control==='smart');
    return supported.find(r=>r.id==='fmwng69uh19')||supported[0];
   };
   const centre=poly=>poly.reduce(([x,y],p)=>[x+p[0]/poly.length,y+p[1]/poly.length],[0,0]);
   const inside=room=>[room.at,...(room.polys||[room.poly]).map(centre)].find(p=>p&&FurnishElectrical.roomFor(ROOMS,...p)?.id===room.id);
   const available=ROOMS.filter(room=>inside(room));
   const addFixture=(room,panelVariant)=>{
    const [cx,cy]=inside(room);
    mutate(()=>state.furniture.push({id:uid(),name:'电气验收点位',type:'panel_bull_g12',panelVariant,cx,cy,w:86,d:10,h:86,rot:0,color:'#f5f5f2',mountHeight:887}));
   };
   let points=readPoints(),button=smart(points);
   if(!button){
    addFixture(available[0],'xiaomi-2pro-3-white');
    points=readPoints();button=smart(points);
   }
   const inAnotherRoom=r=>r.room&&r.room.id!==button.room.id&&inside(r.room);
   let peer=points.find(inAnotherRoom);
   if(!peer){
    addFixture(available.find(room=>room.id!==button.room.id),'socket5-diagonal');
    points=readPoints();peer=points.find(inAnotherRoom);
   }
   const camera=room=>{
    const a=inside(room);
    return {position:{x:a[0],y:a[1],z:1600},target:{x:a[0]+500,y:a[1],z:1600}};
   };
   const doorPair=points.filter(r=>['fmwng69uh19','fmwnpyy8h2'].includes(r.id)).map(r=>r.number);
   const roomOf=f=>FurnishElectrical.roomFor(ROOMS,f.cx,f.cy)?.id;
   const targets=state.furniture.filter(FurnishProducts.panelActionTarget);
   const ownTargets=targets.filter(f=>roomOf(f)===button.room.id).map(f=>f.id);
   const lights=targets.filter(f=>FurnishProducts.panelActionTarget(f)==='light');
   const otherLamp=lights.find(f=>roomOf(f)!==button.room.id);
   return {switchId:button?.id,point:button?.number,room:button?.room?.id,other:peer?.room.id,otherPoint:peer?.number,doorPair,
    start:button&&camera(button.room),next:peer&&camera(peer.room),total:points.length,
    lamp:(otherLamp||lights[0])?.id,otherLamp:otherLamp?.id,ownTargets,allTargets:targets.length};
  });
  assert(data.switchId&&data.other&&data.lamp,'fixture must contain a smart switch, a light and points in two rooms');
  if(data.doorPair.length===2){
   assert.equal(data.doorPair[0][0],data.doorPair[1][0]);
   assert.equal(Number(data.doorPair[1].slice(1))-Number(data.doorPair[0].slice(1)),1);
  }
  await page.locator('#electrical-list').click();
  const dock=page.locator('#electrical-list-rows'),scope=dock.locator('[data-electrical-scope]');
  const groups=dock.locator('[data-electrical-area]'),current=groups.filter({has:page.locator(`[data-electrical-id="${data.switchId}"]`)});
  await scope.selectOption('all');
  const numGroups=await groups.count();
  assert(numGroups>1);
  await current.locator('summary').click();
  await page.waitForFunction(id=>!document.querySelector('#electrical-list-rows [data-electrical-area="'+id+'"]').open,data.room);
  await scope.selectOption(data.other);
  assert.equal(await groups.count(),1);
  assert.equal(await groups.first().getAttribute('data-electrical-area'),data.other);
  assert.equal(await page.locator(`#gElectrical [data-electrical-symbol="${data.switchId}"]`).count(),0);
  const exported=await page.evaluate(()=>{const copy=svg.cloneNode(true);FurnishElectricalUI.draw(copy,{exporting:true});return copy.querySelectorAll('[data-electrical-symbol]').length;});
  assert.equal(exported,data.total);
  await scope.selectOption('all');
  assert.equal(await current.evaluate(el=>el.open),false);
  await current.locator('summary').click();
  await current.locator(`[data-electrical-id="${data.switchId}"]`).click();

  const controls=page.locator('[data-property-fold="electrical-actions"]');
  assert.equal(await controls.evaluate(el=>el.open),true);
  await controls.locator('summary').click();
  assert.equal(await controls.evaluate(el=>el.open),false);
  await page.evaluate(()=>renderPanel());
  assert.equal(await controls.evaluate(el=>el.open),false);
  await controls.locator('summary').click();
  assert.deepEqual(await controls.locator('[data-action-key]').allTextContents(),['左键','中键','右键']);
  const face=await controls.locator('.electrical-switch-face').boundingBox();
  assert(Math.abs(face.width-face.height)<1);
  await controls.locator('[data-action-key="1"]').click();
  assert.equal(await controls.locator('[data-action-key="1"]').getAttribute('aria-pressed'),'true');
  await controls.locator('[data-action-gesture]').selectOption('double');
  const savedBefore=await page.evaluate(id=>getF(id).panelActions??null,data.switchId);
  await controls.locator('[data-action-add="1:double"]').click();
  const target=controls.locator('[data-action-target]').last();
  const otherTargets=controls.locator('[data-action-other-rooms]');
  const values=loc=>loc.evaluateAll(options=>options.map(option=>option.value).sort());
  if(data.ownTargets.length&&data.allTargets>data.ownTargets.length){
   assert.equal(await otherTargets.isChecked(),false);
   assert.equal(await target.locator('optgroup').count(),1);
   assert.deepEqual(await values(target.locator('optgroup option')),[...data.ownTargets].sort());
   await otherTargets.check();
   assert.deepEqual(await values(target.locator('optgroup').first().locator('option')),[...data.ownTargets].sort());
  }else assert.equal(await otherTargets.count(),0);
  assert.equal(await target.locator('optgroup option').count(),data.allTargets);
  for(const [id,label] of [['fmv3wt92611','飘窗纱帘'],['fmv3wtxgq12','飘窗布帘'],['fmwf2mkf13','睡眠区吸顶灯']]){
   const option=target.locator(`option[value="${id}"]`);
   if(await option.count())assert.equal(await option.textContent(),label);
  }
  const entranceLights=target.locator('option[value="fmvs5p45s1"], option[value="fmvs67k751"], option[value="fmvs67weh2"]');
  if(await entranceLights.count()===3)assert.deepEqual(await entranceLights.allTextContents(),['筒灯 1','筒灯 2','筒灯 3']);
  await target.selectOption(data.lamp);
  if(await otherTargets.count()){
   await otherTargets.uncheck();
   assert.equal(await target.inputValue(),data.lamp);
   assert.equal(await target.locator('optgroup option').count(),data.ownTargets.length+(data.otherLamp?1:0));
  }
  await controls.locator('[data-action-verb]').last().selectOption('on');
  await controls.locator('[data-action-key="2"]').click();
  assert.equal(await controls.locator('[data-action-add="2:press"]').count(),1);
  await controls.locator('[data-action-key="1"]').click();
  assert.equal(await controls.locator('[data-action-gesture]').inputValue(),'double');
  assert.equal(await controls.locator('[data-action-target]').last().inputValue(),data.lamp);
  await controls.locator('[data-action-test="1:double"]').click();
  assert.match(await controls.locator('[data-action-result]').textContent(),/已开灯/);
  assert.deepEqual(await page.evaluate(id=>getF(id).panelActions??null,data.switchId),savedBefore);
  await controls.locator('[data-actions-save]').click();
  const stored=await page.evaluate(id=>getF(id).panelActions,data.switchId);
  assert(stored.some(a=>a.key===1&&a.gesture==='double'&&a.targetId===data.lamp&&a.action==='on'));
  assert.equal(await controls.locator('[data-action-key="1"]').getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>undo());
  assert.deepEqual(await page.evaluate(id=>getF(id).panelActions??null,data.switchId),savedBefore);
  await page.evaluate(()=>redo());
  assert.deepEqual(await page.evaluate(id=>getF(id).panelActions,data.switchId),stored);
  await page.evaluate(async()=>{
   await FurnishRepository.flush();
   if(repositoryClient.status.mode!=='saved')throw Error(repositoryClient.status.message);
  });
  await controls.locator('[data-action-key="1"]').click();
  await controls.locator('[data-action-gesture]').selectOption('double');
  await controls.locator('[data-action-test="1:double"]').click();
  await controls.locator('.electrical-switch-face').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(job.dir,'switch-actions.png')});
  assert.equal(JSON.parse(fs.readFileSync(path.join(work,'projects/workspace.furnish.json'),'utf8')).version,112);
  await page.reload();
  await page.locator('#repository-loading').waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(id=>getF(id).panelActions,data.switchId),stored);

  await page.evaluate(async room=>{await setView('3d');await View3D.automationCamera({roomId:room});},data.room);
  const first=page.locator('.electrical-scene-marker').filter({hasText:new RegExp('^'+data.point+'$')});
  const second=page.locator('.electrical-scene-marker').filter({hasText:new RegExp('^'+data.otherPoint+'$')});
  await first.waitFor({state:'attached'});
  assert.equal(await second.count(),0);
  await page.screenshot({path:path.join(job.dir,'room-only-3d.png')});
  await page.evaluate(async camera=>{await View3D.automationCamera({mode:'walk',...camera});},data.next);
  const walked=await page.evaluate(async()=>({
   camera:await View3D.automationCamera(),room:FurnishElectricalUI.scopedRoom()?.id,
   labels:FurnishWiringUI.sceneOverlay().markers.map(marker=>marker.label)
  }));
  assert.equal(walked.camera.mode,'walk');
  assert.equal(walked.room,data.other,JSON.stringify(walked.camera.position));
  assert(walked.labels.includes(data.otherPoint));
  assert(!walked.labels.includes(data.point));
  await page.evaluate(async()=>{await View3D.automationCamera({preset:'whole'});});
  await first.waitFor({state:'attached'});
  await second.waitFor({state:'attached'});
  assert.deepEqual(errors,[]);
  passed=true;
  console.log(JSON.stringify({passed,run:job.dir,checks:['room filtering in 2D, 3D and walk','independent collapse','whole-plan export','concise device labels and cross-room bindings','switch preview, undo/redo and reload']}));
 }finally{
  if(app){
   if(!passed)await app.evaluate(({app})=>app.exit()).catch(()=>{});
   await app.close().catch(()=>{});
  }
  assert.equal(hash(source),original);
  job.finish(passed);
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
