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
   const roomOf=f=>f.room?.id;
   const targets=FurnishElectrical.panelActionTargets(state,ROOMS);
   const ownTargets=targets.filter(f=>roomOf(f)===button.room.id).map(f=>f.id);
   const lights=targets.filter(f=>f.kind==='light');
   const otherLights=lights.filter(f=>roomOf(f)!==button.room.id);
   const otherLamp=otherLights.find(f=>f.id==='fmvs5p45s1')||otherLights[0];
   return {switchId:button?.id,point:button?.number,room:button?.room?.id,other:peer?.room.id,otherPoint:peer?.number,doorPair,
    start:button&&camera(button.room),next:peer&&camera(peer.room),total:points.length,
    lamp:(otherLamp||lights[0])?.id,otherLamp:otherLamp?.id,ownTargets,allTargets:targets.length,
    livingStrip:['fmwng69uh9','fmwnp38p49'].every(id=>points.some(p=>p.id===id))?targets.find(t=>t.label==='客厅灯带')?.id:undefined};
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
  const switchPurpose=page.locator('[data-switch-purpose]');
  const listPurpose=current.locator(`[data-electrical-id="${data.switchId}"] .electrical-row-purpose`);
  const savedListPurpose=await listPurpose.textContent();
  assert.equal(await page.locator('#electrical-form').getByText('原用途说明',{exact:true}).count(),0);
  const switchStyle=await page.locator('#electrical-form select[name="variant"] option:checked').textContent();
  assert((await page.locator('#electrical-form h2').textContent()).endsWith(switchStyle));
  assert.equal(await page.locator('#electrical-form input[name="purpose"]').count(),0);
  const originalPurpose=await switchPurpose.textContent();
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
  const result=controls.locator('[data-action-result]');
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
  const curtainIds=['fmv3wtxgq12','fmv3wt92611'];
  const selectedOptions=controls.locator('[data-action-target] option:checked');
  const hasCurtainPair=curtainIds.every(id=>savedBefore?.some(a=>a.key===2&&a.gesture==='press'&&a.targetId===id));
  if(hasCurtainPair){
   const curtainLabels=await selectedOptions.evaluateAll((options,ids)=>options.filter(o=>ids.includes(o.value)).map(o=>o.textContent),curtainIds);
   assert.equal(curtainLabels.length,2);
   await controls.locator('[data-action-test="2:press"]').click();
   const messages=(await result.textContent()).split('　');
   for(const label of curtainLabels)assert(messages.some(message=>[`${label} · 已打开`,`${label} · 已关闭`].includes(message)));
  }
  await controls.locator('[data-action-key="1"]').click();
  assert.equal(await controls.locator('[data-action-gesture]').inputValue(),'double');
  assert.equal(await controls.locator('[data-action-target]').last().inputValue(),data.lamp);
  const lampLabel=await target.locator('option:checked').textContent();
  const doublePurpose=switchPurpose.locator('dl > div').filter({has:page.getByText('中键 · 双击',{exact:true})});
  assert.match(await doublePurpose.locator('dd').textContent(),/^开灯 /);
  assert((await doublePurpose.locator('dd').textContent()).includes(lampLabel));
  assert.equal(await switchPurpose.getByText('按键配置待应用').count(),1);
  assert.equal(await listPurpose.textContent(),savedListPurpose);
  await controls.locator('[data-action-test="1:double"]').click();
  assert((await result.textContent()).split('　').includes(`${lampLabel} · 已开灯`));
  const checkCycle=hasCurtainPair&&!savedBefore.some(a=>a.key===1&&a.gesture==='press');
  if(checkCycle){
   await controls.locator('[data-action-gesture]').selectOption('press');
   for(const id of curtainIds){
    await controls.locator('[data-action-add="1:press"]').click();
    await target.selectOption(id);
    await controls.locator('[data-action-verb]').last().selectOption('cycle');
   }
   await controls.locator('[data-actions-reset]').click();
   const messages=await controls.locator('[data-action-test="1:press"]').evaluate(button=>{
    const original=Date.now;
    try{
     return [1000,1500,2000,2250].map(now=>{
      Date.now=()=>now;
      button.click();
      return button.closest('[data-panel-actions]').querySelector('[data-action-result]').textContent.split('　');
     });
    }finally{Date.now=original;}
   });
   const labels=await selectedOptions.allTextContents(),firstOpen=messages[0][0].endsWith('开始开帘');
   const outcomes=firstOpen?['开始开帘','已暂停','开始关帘','已暂停']:['开始关帘','已暂停','开始开帘','已暂停'];
   assert.deepEqual(labels,['飘窗布帘','飘窗纱帘']);
   assert.deepEqual(messages,outcomes.map(outcome=>labels.map(label=>`${label} · ${outcome}`)));
   await controls.locator('.electrical-switch-face').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(job.dir,'curtain-cycle.png')});
  }
  assert.deepEqual(await page.evaluate(id=>getF(id).panelActions??null,data.switchId),savedBefore);
  await controls.locator('[data-actions-save]').click();
  const stored=await page.evaluate(id=>getF(id).panelActions,data.switchId);
  assert(stored.some(a=>a.key===1&&a.gesture==='double'&&a.targetId===data.lamp&&a.action==='on'));
  if(checkCycle)assert.deepEqual(stored.filter(a=>a.key===1&&a.gesture==='press').map(a=>[a.targetId,a.action]),curtainIds.map(id=>[id,'cycle']));
  assert.equal(await controls.locator('[data-action-key="1"]').getAttribute('aria-pressed'),'true');
  assert.equal(await switchPurpose.getByText('按键配置待应用').count(),0);
  assert((await doublePurpose.locator('dd').textContent()).includes(lampLabel));
  assert((await listPurpose.getAttribute('title')).includes(lampLabel));
  await switchPurpose.scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(job.dir,'switch-purpose.png')});
  await page.evaluate(()=>undo());
  assert.deepEqual(await page.evaluate(id=>getF(id).panelActions??null,data.switchId),savedBefore);
  assert.equal(await switchPurpose.textContent(),originalPurpose);
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
  assert.equal(JSON.parse(fs.readFileSync(path.join(work,'projects/workspace.furnish.json'),'utf8')).version,stored.some(a=>a.action==='cycle')?113:112);
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

  await page.evaluate(async()=>{await setView('2d');});
  const stripSwitches=[['fmwng69uh9',2],['fmwnp38p49',0]];
  const selectStripKey=async ([id,key])=>{
   await page.evaluate(id=>selectIds([id]),id);
   await controls.locator(`[data-action-key="${key}"]`).click();
   await controls.locator('[data-action-gesture]').selectOption('press');
  };
  if(data.livingStrip){
   for(const [id,key] of stripSwitches){
    await selectStripKey([id,key]);
    const panelActions=await page.evaluate(id=>getF(id).panelActions||[],id);
    if(!panelActions.some(a=>a.key===key&&a.gesture==='press'&&a.targetId===data.livingStrip)){
     await controls.locator(`[data-action-add="${key}:press"]`).click();
     if(!data.livingStrip.startsWith('ceiling-light:'))throw Error('expected a ceiling component target');
     const stripOption=target.locator(`option[value="${data.livingStrip}"]`);
     if(!await stripOption.count())await otherTargets.check();
     assert.equal(await stripOption.textContent(),'客厅灯带');
     await target.selectOption(data.livingStrip);
     assert.equal(await controls.locator('[data-action-verb]').last().inputValue(),'toggle');
     await controls.locator('[data-actions-save]').click();
    }
    assert.match(await switchPurpose.textContent(),/切换 客厅灯带/);
    if(key===2){
     assert.deepEqual(await switchPurpose.locator('dd').allTextContents(),['切换 走廊吸顶灯','切换 客厅吸顶灯','切换 客厅灯带']);
     assert.equal(await page.locator(`#electrical-inline-rows [data-electrical-id="${id}"] .electrical-row-purpose`).textContent(),'走廊吸顶灯 · 客厅吸顶灯 · 客厅灯带');
     await switchPurpose.scrollIntoViewIfNeeded();
     await page.screenshot({path:path.join(job.dir,'ceiling-strip-purpose.png')});
    }
   }
   const lamps=await page.evaluate(()=>FurnishDesign.sceneSettings(state.scene3d).lamps);
   await controls.locator('[data-actions-reset]').click();
   for(const [i,entry] of stripSwitches.entries()){
    await selectStripKey(entry);
    await controls.locator(`[data-action-test="${entry[1]}:press"]`).click();
    assert.equal(await result.textContent(),`客厅灯带 · ${(i?lamps:!lamps)?'已开灯':'已关灯'}`);
   }
   const id=stripSwitches[0][0],floating=page.getByRole('region',{name:'场景开关操作'});
   await page.evaluate(async id=>{
    await setView('3d');
    const f=getF(id),target=FurnishElectrical.endpoint(f,canvasEffectivePlan(),state.furniture);
    const a=f.rot*Math.PI/180;
    await View3D.automationCamera({mode:'orbit',position:{x:target.x-1700*Math.sin(a),y:target.y+1700*Math.cos(a),z:target.z+180},target:{x:target.x,y:target.y,z:target.z}});
    selectIds([id]);
   },id);
   await floating.waitFor({state:'visible'});
   assert.deepEqual(await floating.locator('[data-scene-switch-key]').allTextContents(),['左键','中键','右键']);
   await floating.getByRole('button',{name:'右键'}).click();
   assert.match(await floating.textContent(),/切换 客厅灯带/);
   await floating.getByRole('button',{name:'试按单击'}).click();
   assert.equal(await floating.getByRole('status').textContent(),`客厅灯带 · ${lamps?'已关灯':'已开灯'}`);
   const [card,viewport]=await Promise.all([floating.boundingBox(),page.locator('#view3d').boundingBox()]);
   assert(card.x>=viewport.x&&card.y>=viewport.y&&card.x+card.width<=viewport.x+viewport.width&&card.y+card.height<=viewport.y+viewport.height);
   await page.screenshot({path:path.join(job.dir,'scene-switch.png')});
   await floating.getByRole('button',{name:'编辑配置'}).click();
   await floating.waitFor({state:'hidden'});
   assert.equal(await controls.locator('[data-action-key="2"]').getAttribute('aria-pressed'),'true');
   await controls.locator('[data-action-test="2:press"]').click();
   assert.equal(await result.textContent(),`客厅灯带 · ${lamps?'已开灯':'已关灯'}`);
   await page.evaluate(()=>select(null));
   await page.waitForFunction(()=>!selIds().length);
   await page.evaluate(id=>selectIds([id]),id);
   await floating.waitFor({state:'visible'});
   await page.evaluate(()=>select(null));
   await floating.waitFor({state:'hidden'});
   await page.evaluate(async()=>{await setView('2d');});
  }
  const gapFixture=await page.evaluate(()=>{
   const E=FurnishElectrical,plan=canvasEffectivePlan();
   const plate={id:uid(),name:'E999 · 间距验收点位',type:'panel_bull_g12',panelVariant:'socket5-diagonal',w:86,d:10,h:86,cx:0,cy:0,rot:0,color:'#f5f5f2',mountHeight:1734};
   const face=E.surfaces(plan,state,plate).find(s=>{
    if(s.kind!=='wall'||s.length<440)return false;
    const a=E.place(plate,s,s.length/2-70),b=E.place(plate,s,s.length/2+66);
    const room=E.roomFor(plan.rooms,a.cx,a.cy);
    return room&&E.roomFor(plan.rooms,b.cx,b.cy)===room&&FurnishProducts.floorBase(plan,a).known&&FurnishProducts.floorBase(plan,b).known;
   });
   const start=face.length/2-70;
   const a=E.place(plate,face,start),b=E.place({...plate,id:uid()},face,start+136);
   const raw=E.place(b,face,start+135);
   mutate(()=>state.furniture.push(a,b));
   selectIds([b.id]);
   return {ids:[a.id,b.id],raw:{cx:raw.cx,cy:raw.cy}};
  });
  const measureGap=()=>page.evaluate(ids=>{
   const [a,b]=ids.map(getF);
   return Math.hypot(a.cx-b.cx,a.cy-b.cy)-(a.w+b.w)/2;
  },gapFixture.ids);
  const assertGap=async expected=>assert(Math.abs(await measureGap()-expected)<1e-6);
  await assertGap(50);
  const properties=page.locator('#electrical-form');
  for(const key of ['cx','cy'])await properties.locator(`input[name="${key}"]`).fill(String(gapFixture.raw[key]));
  await properties.getByRole('button',{name:'应用面板属性'}).click();
  await assertGap(4);
  await page.evaluate(()=>undo());
  await assertGap(50);
  await page.evaluate(()=>redo());
  await assertGap(4);
  await page.evaluate(()=>undo());
  const drag=await page.evaluate(ids=>{
   const [a,b]=ids.map(getF);
   zoomToBox(groupBox([a,b]),430);
   const screen=(x,y)=>{
    const point=svg.createSVGPoint();
    [point.x,point.y]=drawingPoint([x,y]);
    const p=point.matrixTransform(svg.getScreenCTM());
    return {x:p.x,y:p.y};
   };
   return {from:screen(b.cx,b.cy),to:screen(b.cx+(a.cx-b.cx)*.25,b.cy+(a.cy-b.cy)*.25)};
  },gapFixture.ids);
  await page.mouse.move(drag.from.x,drag.from.y);
  await page.keyboard.down('Alt');
  try{
   await page.mouse.down();
   await page.mouse.move(drag.to.x,drag.to.y,{steps:6});
   await page.mouse.up();
  }finally{await page.keyboard.up('Alt');}
  await assertGap(4);
  await page.screenshot({path:path.join(job.dir,'panel-spacing.png')});
  const socketPurpose=properties.getByLabel('用途',{exact:true});
  assert.equal(await socketPurpose.inputValue(),'间距验收点位');
  assert((await properties.locator('h2').textContent()).endsWith('10A斜五孔'));
  await socketPurpose.fill('');
  await properties.getByRole('button',{name:'应用面板属性'}).click();
  assert.equal(await socketPurpose.inputValue(),'');
  assert.equal(await page.evaluate(id=>getF(id).name,gapFixture.ids[1]),'E999 · 10A斜五孔');
  await socketPurpose.fill('电脑机箱');
  await properties.getByRole('button',{name:'应用面板属性'}).click();
  assert((await properties.locator('h2').textContent()).endsWith('10A斜五孔'));
  assert.equal(await page.locator(`#electrical-inline-rows [data-electrical-id="${gapFixture.ids[1]}"] .electrical-row-purpose`).textContent(),'电脑机箱');
  await page.evaluate(async()=>{
   await FurnishRepository.flush();
   if(repositoryClient.status.mode!=='saved')throw Error(repositoryClient.status.message);
  });
  await page.reload();
  await page.locator('#repository-loading').waitFor({state:'hidden'});
  await assertGap(4);
  await page.evaluate(id=>selectIds([id]),gapFixture.ids[1]);
  assert.equal(await socketPurpose.inputValue(),'电脑机箱');
  assert.equal(await page.evaluate(id=>getF(id).name,gapFixture.ids[1]),'E999 · 电脑机箱');
  if(data.livingStrip){
   for(const [id,key] of stripSwitches){
    const actions=await page.evaluate(id=>getF(id).panelActions,id);
    assert(actions.some(a=>a.key===key&&a.gesture==='press'&&a.action==='toggle'&&a.targetId===data.livingStrip));
   }
  }
  assert.deepEqual(errors,[]);
  passed=true;
  console.log(JSON.stringify({passed,run:job.dir,checks:['room filtering in 2D, 3D and walk','independent collapse','whole-plan export','concise device labels and cross-room bindings','switch preview, undo/redo and reload','separate style, live switch purpose and saved socket purpose','50 mm threshold and 4 mm saved panel spacing','saved purpose shared by list and properties',...(data.livingStrip?['existing ceiling strip shared by two switches','3D switch overlay and property editor share preview']:[]),...(checkCycle?['two-curtain open/stop/close cycle']:[])]}));
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
