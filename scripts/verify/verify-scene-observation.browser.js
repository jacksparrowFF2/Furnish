async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1480,height:1050},offline:mode==='file'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(25000);
  const check=(v,m)=>{if(!v)throw Error(mode+': '+m);},shot=name=>p.screenshot({path:verification.output('playwright/scene-observation/'+mode+'-'+name+'.png')});
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib .item').first().waitFor();
   // Capture production camera/model references without adding debug APIs to the app.
   await p.evaluate(()=>{
    const original=FurnishSceneObservation.create;FurnishSceneObservation.create=T=>{const observer=original(T),update=observer.update;window.__observation={T,observer};observer.update=(camera,bounds,architecture)=>{Object.assign(__observation,{observer,camera,bounds:bounds.clone(),architecture});return update(camera,bounds,architecture);};return observer;};
    const fit=FurnishSceneObservation.fit;FurnishSceneObservation.fit=(...args)=>{__observation.frame={bounds:args[2].clone(),options:args[4]};return fit(...args);};
    const room=ROOMS.find(r=>r.name==='阳台')||ROOMS.find(r=>r.name.includes('阳台'));if(!room)throw Error('balcony fixture missing');const b=bbox(room.poly);let n=0;
    const items=FurnishKitchen.createLaundryArea({id:'observe-base',cx:(b[0]+b[2])/2,cy:b[1]+340,rot:0,color:'#eee'},()=> 'observe-'+ ++n,'observation-group','left');
    mutate(()=>state.furniture=items);selectIds([items[0].id]);
   });
   check(await p.evaluate(()=>selIds().length===5),'five production members selected');
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);const baseline=await p.evaluate(()=>snap());
   await p.locator('#vSelection').click();await p.waitForTimeout(1300);
   const inspect=()=>p.evaluate(()=>{
    const d=__observation,{camera,bounds,T}=d,frame=d.frame;camera.updateMatrixWorld();
    const projected=FurnishSceneObservation.corners(T,bounds).map(p=>p.project(camera).toArray()),sx=1-2*frame.options.marginX/frame.options.width,sy=1-2*frame.options.marginY/frame.options.height;
    const center=bounds.getCenter(new T.Vector3()),ray=new T.Raycaster(camera.position,center.clone().sub(camera.position).normalize(),0,camera.position.distanceTo(center));
    const hits=ray.intersectObjects([d.architecture],true).filter(h=>h.object.isMesh&&h.object.visible);
    let clips=0;d.architecture.traverse(o=>{if(o.isMesh&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.clippingPlanes?.length))clips++;});
    const stage=document.querySelector('#stage').getBoundingClientRect(),pixels=projected.map(q=>({x:stage.left+(q[0]+1)*stage.width/2,y:stage.top+(1-q[1])*stage.height/2}));
    const rect={left:Math.min(...pixels.map(p=>p.x)),right:Math.max(...pixels.map(p=>p.x)),top:Math.min(...pixels.map(p=>p.y)),bottom:Math.max(...pixels.map(p=>p.y))},toolbar=document.querySelector('#fab').getBoundingClientRect();
    const toolbarOverlap=rect.left<toolbar.right&&rect.right>toolbar.left&&rect.top<toolbar.bottom&&rect.bottom>toolbar.top;
    return {projected,sx,sy,clips,toolbarOverlap,cutHits:hits.filter(h=>d.observer.clipped(h)).length,visibleHits:hits.filter(h=>!d.observer.clipped(h)).length,top:bounds.max.y};
   });
   let info=await inspect();check(info.top>=2.4-1e-5,'upper cabinet included');check(info.clips>0,'architectural surfaces use temporary cutaway');
   const fits=i=>i.projected.every(q=>Math.abs(q[0])<=i.sx+.001&&Math.abs(q[1])<=i.sy+.001&&q[2]>-1&&q[2]<1);
   check(fits(info)&&!info.toolbarOverlap,'whole group fits without toolbar obstruction');check(info.cutHits>0,'actual balcony obstruction is cut');check(info.visibleHits===0,'center sightline clear');await shot('group');
   await p.locator('#laundry-doors-open').click();await p.waitForTimeout(1300);info=await inspect();check(fits(info),'open production doors fit after model edit');await shot('open');
   const edited=await p.evaluate(()=>snap());await p.locator('#vRestoreWalls').click();check(await p.evaluate(()=>{let n=0;__observation.architecture.traverse(o=>{if(o.isMesh&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.clippingPlanes?.length))n++;});return n===0;}),'restore original materials');check(await p.evaluate(()=>snap())===edited,'temporary view does not change design');await shot('restored');
   await p.locator('#vSelection').click();await p.waitForTimeout(1100);
   await p.setViewportSize({width:390,height:844});await p.waitForTimeout(1600);info=await inspect();check(fits(info)&&!info.toolbarOverlap,'narrow resize reframes complete group without toolbar obstruction');await shot('narrow');
   await p.setViewportSize({width:1480,height:1050});await p.waitForTimeout(1300);await p.locator('#laundry-switch-sides').click();await p.waitForTimeout(1300);info=await inspect();check(fits(info),'mirror layout change reframes group');
   await p.evaluate(()=>undo());await p.waitForTimeout(1300);check(fits(await inspect()),'undo model update stays framed');await p.evaluate(()=>redo());await p.waitForTimeout(1300);check(fits(await inspect()),'redo model update stays framed');
   await p.locator('#laundry-doors-close').click();await p.waitForTimeout(1300);
   const washerPoint=await p.evaluate(()=>{const d=__observation,f=state.furniture.find(f=>f.type==='washer');let model;d.architecture.parent.traverse(o=>{if(o.userData.fid===f.id)model=o;});const b=new d.T.Box3().setFromObject(model,true),point=b.getCenter(new d.T.Vector3());point.z=b.max.z+.001;const q=point.project(d.camera),r=document.querySelector('#view3d canvas').getBoundingClientRect();return {id:f.id,x:r.left+(q.x+1)*r.width/2,y:r.top+(1-q.y)*r.height/2};});
   await p.mouse.click(washerPoint.x,washerPoint.y);await p.waitForTimeout(400);check(await p.evaluate(id=>ui.sel?.id===id,washerPoint.id),'cut wall does not block real furniture click '+JSON.stringify({washerPoint,selection:await p.evaluate(()=>ui.sel)}));await p.locator('#vSelection').click();await p.waitForTimeout(1100);
   // Stored low-wall preference must never cut the walk-through architecture.
   await p.evaluate(()=>mutate(()=>state.scene3d={...state.scene3d,cut:1.2}));await p.waitForTimeout(1100);await p.locator('[data-mode="walk"]').click();await p.waitForTimeout(400);
   const walk=await p.evaluate(()=>{const d=__observation;let clips=0,top=0;d.architecture.updateWorldMatrix(true,true);d.architecture.traverse(o=>{if(!o.isMesh)return;clips+=(Array.isArray(o.material)?o.material:[o.material]).filter(m=>m.clippingPlanes?.length).length;top=Math.max(top,new d.T.Box3().setFromObject(o).max.y);});return {walking:View3D.walking(),clips,top,eye:d.camera.position.y,cut:state.scene3d.cut,fov:d.camera.fov};});
   check(walk.walking&&walk.clips===0&&walk.top>2.4,'walk restores full-height architecture with no clipping');check(walk.cut===1.2,'walk preserves saved observation preference');check(walk.eye>=1.6&&walk.fov===45,'walk eye height and vertical fov');
   await p.locator('#walkOverlay').click();await p.locator('#walkOverlay').waitFor({state:'hidden'});await p.keyboard.down('KeyW');await p.waitForTimeout(250);await p.keyboard.up('KeyW');await shot('walk');await p.evaluate(()=>document.exitPointerLock());await p.waitForTimeout(250);
   await p.locator('#sun').press('ArrowRight');check(await p.evaluate(()=>state.scene3d.cut===1.2),'lighting edit during walk preserves saved low-wall preference');
   await p.locator('[data-mode="orbit"]').click();check(await p.locator('#vRestoreWalls').isHidden(),'leaving walk does not resume old cutaway');
   await p.reload();await p.locator('#lib .item').first().waitFor();check(await p.evaluate(()=>state.furniture.length===5&&state.scene3d.cut===1.2),'saved design and cut setting survive refresh');
   check(errors.length===0,'page errors '+errors.join(';'));results.push({mode,status:'PASS',info,walk,initialDesignBytes:baseline.length,errors});
  }catch(e){await shot('failure').catch(()=>{});throw e;}finally{await context.close();}
 }
 return results;
}
