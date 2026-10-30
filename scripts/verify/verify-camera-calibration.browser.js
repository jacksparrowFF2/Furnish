async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1480,height:1050},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(25000);
  const check=(ok,message)=>{if(!ok)throw Error(mode+': '+message);},shot=name=>p.screenshot({path:verification.output('playwright/camera-calibration/'+mode+'-'+name+'.png')});
  const capture=()=>p.evaluate(()=>{
   const fit=FurnishSceneObservation.fit;FurnishSceneObservation.fit=(...args)=>{window.__calibrationCamera=args[1];return fit(...args);};
   const room=ROOMS.find(r=>r.name.includes('阳台'))||ROOMS[0],b=bbox(room.poly);
   mutate(()=>state.furniture=[{id:'calibration-washer',type:'washer',name:'Calibration',cx:(b[0]+b[2])/2,cy:(b[1]+b[3])/2,w:600,d:600,h:850,rot:0,color:'#eee'}]);
   selectIds([state.furniture[0].id]);
  });
  const enter=async()=>{await capture();await p.locator('[data-view="3d"]').click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#vSelection').click();await p.waitForTimeout(1100);};
  const inspect=()=>p.evaluate(()=>{
   const c=__calibrationCamera,r=document.querySelector('#stage');
   return {fov:c.fov,aspect:c.aspect,position:c.position.toArray(),rotation:c.rotation.toArray(),width:r.clientWidth,height:r.clientHeight,dpr:devicePixelRatio,design:snap(),calibration:FurnishNavigation.cameraCalibration()};
  });
  const matches=(value,ratio=.25,distance=600)=>Math.abs(value.fov-2*Math.atan(value.height*value.dpr*ratio/(2*distance))*180/Math.PI)<1e-8;
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib .item').first().waitFor();await enter();
   const orbit=await inspect();await p.locator('#showMenu>summary').click();
   check(await p.locator('#cameraFovLabel').innerText()==='鸟瞰水平视角','orbit FOV has a clear mode-specific label');
   for(const degrees of [40,90]){
    await p.locator('#cameraFov').fill(String(degrees));await p.locator('#cameraFov').dispatchEvent('input');
    const value=await inspect(),expected=Math.min(75,2*Math.atan(Math.tan(degrees*Math.PI/360)/value.aspect)*180/Math.PI);
    check(Math.abs(value.fov-expected)<1e-8&&value.design===orbit.design,'orbit FOV changes projection without editing project');
   }
   await p.locator('#cameraFov').fill('60');await p.locator('#cameraFov').dispatchEvent('input');
   await p.locator('#cameraCalibration>summary').click();
   await p.locator('[data-camera-screen="24"]').click();check(await p.locator('#cameraEyeDistance').inputValue()==='600','desktop preset uses 60 cm midpoint');
   check(Math.abs(Number(await p.locator('#cameraScreenWidth').inputValue())-531.3)<.1,'24 inch 16:9 width');
   await p.locator('#cameraScreenAspect').selectOption('1.6');check(Math.abs(Number(await p.locator('#cameraScreenWidth').inputValue())-516.9)<.1,'16:10 option changes physical width');
   await p.locator('[data-camera-screen="27"]').click();check(Math.abs(Number(await p.locator('#cameraScreenWidth').inputValue())-581.6)<.1,'27 inch preserves 16:10 selection');
   await p.locator('[data-camera-screen="6.5"]').click();check(await p.locator('#cameraEyeDistance').inputValue()==='200','phone uses 20 cm midpoint');
   await p.locator('[data-camera-distance="150"]').click();check(await p.locator('#cameraEyeDistance').inputValue()==='150','phone range includes 15 cm');
   const automatic=await p.evaluate(()=>Math.round(screen.width*devicePixelRatio));
   check(Number(await p.locator('#cameraScreenPixels').inputValue())===automatic,'presets read browser screen pixels automatically');
   await p.locator('[data-camera-screen="27"]').click();await p.locator('#cameraScreenAspect').selectOption('1.7777777777777777');
   await p.locator('#cameraCalibrationForm [type="submit"]').click();
   check(await p.evaluate(expected=>Math.abs(FurnishNavigation.cameraCalibration().mmPerPixel-597.7/expected)<1e-9,automatic),'size and distance alone apply automatic calibration');
   await p.locator('#cameraPixelMode').selectOption('manual');
   await p.locator('#cameraScreenWidth').fill('600');await p.locator('#cameraScreenPixels').fill('2400');await p.locator('#cameraEyeDistance').fill('600');
   await p.locator('#cameraCalibrationForm [type="submit"]').click();
   check((await inspect()).fov===orbit.fov,'calibration keeps orbit manual');check(await p.locator('#cameraCalibrationStatus').innerText(),'status available');await shot('settings');
   await p.locator('#showMenu>summary').click();await p.locator('[data-mode="walk"]').click();const before=await inspect();
   check(matches(before),'walk uses actual canvas dimensions in physical projection '+JSON.stringify({fov:before.fov,height:before.height,dpr:before.dpr,calibration:before.calibration}));check(await p.locator('#cameraFov').isDisabled(),'manual slider disabled while calibrated');
   await p.locator('#showMenu>summary').click();await p.locator('#cameraEyeDistance').fill('800');await p.locator('#cameraCalibrationForm [type="submit"]').click();
   const farther=await inspect();check(matches(farther,.25,800)&&farther.fov<before.fov,'larger eye distance narrows FOV');
   check(JSON.stringify(before.position)===JSON.stringify(farther.position)&&JSON.stringify(before.rotation)===JSON.stringify(farther.rotation)&&before.design===farther.design,'calibration does not move eye or edit project');
   await p.locator('#cameraCalibrationMethod').selectOption('ruler');
   const ruler=await p.locator('#cameraPhysicalRuler').evaluate(el=>el.getBoundingClientRect().width*devicePixelRatio*.25);
   await p.locator('#cameraRulerMm').fill(String(ruler));await p.locator('#cameraEyeDistance').fill('600');await p.locator('#cameraCalibrationForm [type="submit"]').click();check(matches(await inspect()),'measured ruler equals display calibration');
   await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);const narrow=await inspect();check(matches(narrow),'narrow resize uses smaller physical canvas');
   check(await p.locator('#cameraCalibrationForm [type="submit"]').isVisible(),'calibration form usable on narrow screen');await shot('narrow');
   check(await p.locator('#showMenu>.showpop').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}),'narrow menu stays inside viewport');
   await p.setViewportSize({width:1480,height:1050});await p.waitForTimeout(500);
   // Simulate a page zoom DPR change with no resize: render loop must still refresh.
   await p.evaluate(()=>{window.__originalDpr=devicePixelRatio;Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:devicePixelRatio*1.25});});
   await p.waitForTimeout(150);check(matches(await inspect()),'DPR-only change refreshes projection');
   await p.evaluate(()=>Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:__originalDpr}));await p.waitForTimeout(150);
   await p.locator('#cameraCalibrationToggle').click();check(!await p.locator('#cameraFov').isDisabled()&&!(await inspect()).calibration.enabled,'manual fallback keeps saved calibration');
   await p.locator('#cameraCalibrationToggle').click();check(matches(await inspect()),'saved calibration can be reenabled');
   await p.locator('#showMenu>summary').click();
   await p.locator('#walkOverlay').click();await p.locator('#walkOverlay').waitFor({state:'hidden'});await shot('walk');await p.evaluate(()=>document.exitPointerLock());
   await p.reload();await p.locator('#lib .item').first().waitFor();check(await p.evaluate(()=>FurnishNavigation.cameraCalibration()?.enabled),'calibration survives reload');
   await enter();await p.locator('[data-mode="walk"]').click();check(matches(await inspect()),'restored calibration applies on reentry');
   await p.locator('#showMenu>summary').click();await p.locator('#cameraCalibration>summary').click();
   check(await p.locator('#cameraCalibrationMethod').inputValue()==='saved','refresh reuses saved screen scale');
   await p.locator('[data-camera-distance="700"]').click();await p.locator('#cameraCalibrationForm [type="submit"]').click();
   check(matches(await inspect(),.25,700),'distance can change after refresh without remeasuring screen');await p.locator('#showMenu>summary').click();
   await p.setViewportSize({width:360,height:800});await p.evaluate(()=>{window.__originalDpr=devicePixelRatio;Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:3});});await p.waitForTimeout(200);
   await p.locator('#showMenu>summary').click();if(!await p.locator('#cameraCalibration').evaluate(el=>el.open))await p.locator('#cameraCalibration>summary').click();await p.locator('[data-camera-screen="6.5"]').click();
   await p.locator('#cameraPixelMode').selectOption('manual');
   await p.locator('#cameraScreenPixels').fill('1080');await p.locator('#cameraCalibrationForm [type="submit"]').click();
   const phone=await inspect();check(matches(phone,67.8/1080,200),'phone 6.5 inch 20:9, 1080 px, DPR 3 and 20 cm projection');await shot('phone-settings');
   await p.locator('#showMenu>summary').click();await p.locator('#walkOverlay').click();await p.locator('#walkOverlay').waitFor({state:'hidden'});await shot('phone-walk');await p.evaluate(()=>document.exitPointerLock());
   await p.evaluate(()=>Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:__originalDpr}));await p.setViewportSize({width:1480,height:1050});
   await p.locator('[data-mode="orbit"]').click();check(!await p.locator('#cameraFov').isDisabled(),'leaving walk restores manual orbit lens');
   check(errors.length===0,'page errors '+errors.join(';'));results.push({mode,status:'PASS',fov:before.fov,narrowFov:narrow.fov,phoneFov:phone.fov,errors});
  }catch(error){await shot('failure').catch(()=>{});throw error;}finally{await context.close();}
 }
 return results;
}
