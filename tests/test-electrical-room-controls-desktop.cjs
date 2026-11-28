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
 const original=hash(source),job=Artifacts.createRun({parent:path.join(root,'output/desktop-verification.noindex'),prefix:'electrical-room-controls-'});
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
   const smart=points=>points.find(r=>r.room&&r.variant.gangs>1&&r.variant.control==='smart');
   const centre=poly=>poly.reduce(([x,y],p)=>[x+p[0]/poly.length,y+p[1]/poly.length],[0,0]);
   const inside=room=>[room.at,...(room.polys||[room.poly]).map(centre)].find(p=>p&&FurnishElectrical.roomFor(ROOMS,...p)?.id===room.id);
   const available=ROOMS.filter(room=>inside(room));
   const addFixture=(room,panelVariant)=>{
    const [cx,cy]=inside(room);
    mutate(()=>state.furniture.push({id:uid(),name:'电气验收点位',type:'panel_bull_g12',panelVariant,cx,cy,w:86,d:10,h:86,rot:0,color:'#f5f5f2',mountHeight:887}));
   };
   let points=readPoints(),button=smart(points);
   if(!button){
    addFixture(available[0],'xiaomi-2pro-2-white');
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
   return {switchId:button?.id,point:button?.number,room:button?.room?.id,other:peer?.room.id,otherPoint:peer?.number,
    start:button&&camera(button.room),next:peer&&camera(peer.room),total:points.length,
    lamp:state.furniture.find(f=>FurnishProducts.panelActionTarget(f)==='light')?.id};
  });
  assert(data.switchId&&data.other&&data.lamp,'fixture must contain a smart switch, a light and points in two rooms');
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
  await controls.locator('summary').click();
  assert.equal(await controls.locator('fieldset').count(),2);
  const savedBefore=await page.evaluate(id=>getF(id).panelActions??null,data.switchId);
  await controls.locator('[data-action-add="0:press"]').click();
  await controls.locator('[data-action-target]').last().selectOption(data.lamp);
  await controls.locator('[data-action-verb]').last().selectOption('on');
  await controls.locator('[data-action-test="0:press"]').click();
  assert.match(await controls.locator('[data-action-result]').textContent(),/已开灯/);
  assert.deepEqual(await page.evaluate(id=>getF(id).panelActions??null,data.switchId),savedBefore);
  await controls.locator('[data-actions-save]').click();
  const stored=await page.evaluate(id=>getF(id).panelActions,data.switchId);
  assert(stored.some(a=>a.key===0&&a.gesture==='press'&&a.targetId===data.lamp&&a.action==='on'));
  await page.evaluate(()=>undo());
  assert.deepEqual(await page.evaluate(id=>getF(id).panelActions??null,data.switchId),savedBefore);
  await page.evaluate(()=>redo());
  assert.deepEqual(await page.evaluate(id=>getF(id).panelActions,data.switchId),stored);
  await page.screenshot({path:path.join(job.dir,'switch-actions.png')});
  await page.evaluate(async()=>{
   await FurnishRepository.flush();
   if(repositoryClient.status.mode!=='saved')throw Error(repositoryClient.status.message);
  });
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
  console.log(JSON.stringify({passed,run:job.dir,checks:['room filtering in 2D, 3D and walk','independent collapse','whole-plan export','switch preview, undo/redo and reload']}));
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
