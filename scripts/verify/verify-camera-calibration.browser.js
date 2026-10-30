async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1480,height:1050},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(25000);
  const check=(ok,message)=>{if(!ok)throw Error(mode+': '+message);},shot=name=>p.screenshot({path:verification.output('playwright/camera-calibration/'+mode+'-'+name+'.png')});
  const enter=async()=>{
   await p.evaluate(()=>{
    const fit=FurnishSceneObservation.fit;FurnishSceneObservation.fit=(...args)=>{window.__calibrationCamera=args[1];window.__calibrationThree=args[0];return fit(...args);};
    const create=FurnishSceneObservation.create;FurnishSceneObservation.create=(...args)=>{const result=create(...args),update=result.update;result.update=(camera,bounds,architecture)=>{window.__calibrationArch=architecture;return update(camera,bounds,architecture);};return result;};
    const room=ROOMS.find(r=>r.name.includes('阳台'))||ROOMS[0],b=bbox(room.poly);
    mutate(()=>state.furniture=[{id:'calibration-washer',type:'washer',name:'Calibration',cx:(b[0]+b[2])/2,cy:(b[1]+b[3])/2,w:600,d:600,h:850,rot:0,color:'#eee'}]);selectIds([state.furniture[0].id]);
   });
   await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#vSelection').click();await p.waitForTimeout(1100);
  };
  const inspect=()=>p.evaluate(()=>{const c=__calibrationCamera,r=document.querySelector('#stage');return {fov:c.fov,aspect:c.aspect,position:c.position.toArray(),rotation:c.rotation.toArray(),width:r.clientWidth,height:r.clientHeight,dpr:devicePixelRatio,design:snap(),calibration:FurnishNavigation.cameraCalibration()};});
  const matches=(value,ratio=.25,distance=600)=>Math.abs(value.fov-2*Math.atan(value.height*value.dpr*ratio/(2*distance))*180/Math.PI)<1e-8;
  const open=async()=>{if(await p.locator('#cameraPanel').isHidden())await p.locator('#vCamera').click();};
  const advanced=async()=>{if(!await p.locator('#cameraAdvanced').evaluate(el=>el.open))await p.locator('#cameraAdvanced>summary').click();};
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib .item').first().waitFor();await enter();const orbit=await inspect();await open();
   check(await p.locator('.canvas-rail #vCamera').count()===1&&await p.locator('#showMenu #cameraCalibration').count()===0,'settings live in bottom toolbar popup');
   check(await p.locator('#cameraPanel').evaluate(el=>el.getBoundingClientRect().height<=300),'default desktop popup is compact');check(await p.locator('#cameraScreenAspect').isHidden()&&await p.locator('#cameraCalibrationStatus').isHidden(),'advanced fields and explanations are collapsed');await shot('compact');
   for(const degrees of [40,90]){await p.locator('#cameraFov').fill(String(degrees));await p.locator('#cameraFov').dispatchEvent('input');const value=await inspect(),expected=Math.min(75,2*Math.atan(Math.tan(degrees*Math.PI/360)/value.aspect)*180/Math.PI);check(Math.abs(value.fov-expected)<1e-8&&value.design===orbit.design,'manual orbit FOV without project edits');}
   await p.locator('#cameraFov').fill('60');await p.locator('#cameraFov').dispatchEvent('input');
   await p.locator('[data-camera-screen="24"]').click();check(Math.abs(Number(await p.locator('#cameraScreenWidth').inputValue())-531.3)<.1,'24 inch 16:9');
   await advanced();await p.locator('#cameraScreenAspect').selectOption('1.6');check(Math.abs(Number(await p.locator('#cameraScreenWidth').inputValue())-516.9)<.1,'16:10');
   await p.locator('[data-camera-screen="27"]').click();check(Math.abs(Number(await p.locator('#cameraScreenWidth').inputValue())-581.6)<.1,'27 inch');
   await p.locator('[data-camera-screen="6.5"]').click();await p.locator('[data-camera-distance="150"]').click();check(await p.locator('#cameraEyeDistance').inputValue()==='150','phone distance');
   await p.locator('[data-camera-screen="27"]').click();await p.locator('#cameraScreenAspect').selectOption('1.7777777777777777');
   await p.locator('#cameraCalibrationForm [type="submit"]').click();await p.waitForTimeout(1100);
   const auto=await inspect(),pixels=await p.evaluate(()=>Math.round(screen.width*devicePixelRatio));check(matches(auto,597.7/pixels)&&auto.calibration.orbitEnabled&&!auto.calibration.enabled,'size and distance calibrate orbit independently');
   await advanced();await p.locator('#cameraPixelMode').selectOption('manual');await p.locator('#cameraScreenWidth').fill('600');await p.locator('#cameraScreenPixels').fill('2400');await p.locator('#cameraEyeDistance').fill('600');await p.locator('#cameraCalibrationForm [type="submit"]').click();await p.waitForTimeout(1100);
   check(matches(await inspect()),'physical orbit projection');await shot('orbit-settings');
   await p.locator('#cameraCalibrationToggle').click();check(!await p.locator('#cameraFov').isDisabled(),'orbit manual fallback');await p.locator('#cameraApplyCalibration').click();await p.waitForTimeout(1100);
   await p.locator('#vIso').click();await p.waitForTimeout(1100);
   check(await p.evaluate(()=>{const T=__calibrationThree,c=__calibrationCamera,b=new T.Box3().setFromObject(__calibrationArch);c.updateMatrixWorld();return FurnishSceneObservation.corners(T,b).every(q=>{q.project(c);return Math.abs(q.x)<=1.1&&Math.abs(q.y)<=1.1&&q.z>-1&&q.z<1;});}),'calibrated whole-house iso fits production architecture');await shot('orbit-whole');
   await open();await p.locator('[data-mode="walk"]').click();check(!await p.locator('#cameraFov').isDisabled(),'walk starts manual when only orbit calibrated');
   await p.locator('#cameraCalibrationForm [type="submit"]').click();const before=await inspect();check(matches(before)&&before.calibration.enabled&&before.calibration.orbitEnabled,'both modes enable calibration');
   await p.locator('#cameraEyeDistance').fill('800');await p.locator('#cameraCalibrationForm [type="submit"]').click();const farther=await inspect();check(matches(farther,.25,800)&&JSON.stringify(before.position)===JSON.stringify(farther.position)&&JSON.stringify(before.rotation)===JSON.stringify(farther.rotation)&&before.design===farther.design,'walk calibration preserves eye and project');
   await advanced();await p.locator('#cameraCalibrationMethod').selectOption('ruler');const ruler=await p.locator('#cameraPhysicalRuler').evaluate(el=>el.getBoundingClientRect().width*devicePixelRatio*.25);await p.locator('#cameraRulerMm').fill(String(ruler));await p.locator('#cameraEyeDistance').fill('600');await p.locator('#cameraCalibrationForm [type="submit"]').click();check(matches(await inspect()),'ruler calibration');
   await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);check(matches(await inspect()),'narrow physical projection');
   check(await p.locator('#cameraPanel').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}),'bottom popup inside narrow viewport');await shot('narrow');
   await p.locator('#cameraAdvanced>summary').click();check(await p.locator('#cameraPanel').evaluate(el=>el.getBoundingClientRect().height<=330),'default narrow popup is compact');await shot('compact-narrow');
   await p.setViewportSize({width:1480,height:1050});await p.waitForTimeout(300);
   await p.evaluate(()=>{window.__originalDpr=devicePixelRatio;Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:devicePixelRatio*1.25});});await p.waitForTimeout(150);check(matches(await inspect()),'DPR-only update');await p.evaluate(()=>Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:__originalDpr}));await p.waitForTimeout(150);
   await p.locator('#cameraCalibrationToggle').click();check(!await p.locator('#cameraFov').isDisabled()&&(await inspect()).calibration.orbitEnabled,'manual walk keeps orbit calibration');await p.locator('#cameraApplyCalibration').click();
   await p.locator('#cameraPanelClose').click();check(await p.locator('#vCamera').evaluate(el=>el===document.activeElement),'close returns focus');await open();check(!await p.locator('#cameraAdvanced').evaluate(el=>el.open),'reopen starts compact');await p.locator('#cameraPanelClose').press('Escape');check(await p.locator('#cameraPanel').isHidden(),'Escape closes');
   await p.locator('#walkOverlay').click();await p.locator('#walkOverlay').waitFor({state:'hidden'});await shot('walk');await p.evaluate(()=>document.exitPointerLock());
   await p.reload();await p.locator('#lib .item').first().waitFor();await enter();check(matches(await inspect()),'refresh restores calibrated orbit');await open();await advanced();check(await p.locator('#cameraCalibrationMethod').inputValue()==='saved','saved screen scale');
   await p.locator('[data-camera-distance="700"]').click();await p.locator('#cameraCalibrationForm [type="submit"]').click();await p.waitForTimeout(1100);check(matches(await inspect(),.25,700),'saved scale distance-only edit');
   await p.locator('[data-mode="walk"]').click();check(matches(await inspect(),.25,700),'shared screen and distance');
   await p.setViewportSize({width:360,height:800});await p.evaluate(()=>{window.__originalDpr=devicePixelRatio;Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:3});});await p.waitForTimeout(200);
   await p.locator('[data-camera-screen="6.5"]').click();await p.locator('#cameraPixelMode').selectOption('manual');await p.locator('#cameraScreenPixels').fill('1080');await p.locator('#cameraCalibrationForm [type="submit"]').click();check(matches(await inspect(),67.8/1080,200),'phone 6.5 inch, DPR3, 20cm');await shot('phone-settings');
   await p.locator('#cameraPanelClose').click();await p.locator('#walkOverlay').click();await p.locator('#walkOverlay').waitFor({state:'hidden'});await shot('phone-walk');await p.evaluate(()=>document.exitPointerLock());
   await p.evaluate(()=>Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:__originalDpr}));await p.setViewportSize({width:1480,height:1050});await p.locator('[data-mode="orbit"]').click();await open();await p.locator('#cameraCalibrationToggle').click();check(!await p.locator('#cameraFov').isDisabled()&&(await inspect()).calibration.enabled,'orbit manual keeps walk calibrated');
   await p.locator('[data-view="2d"]').click();await p.waitForFunction(()=>!is3D()&&!switching);check(await p.locator('#cameraPanel').isHidden(),'leaving 3D closes popup');
   check(errors.length===0,'page errors '+errors.join(';'));results.push({mode,status:'PASS',errors});
  }catch(error){await shot('failure').catch(()=>{});throw error;}finally{await context.close();}
 }
 return results;
}
