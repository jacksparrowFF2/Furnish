'use strict';
module.exports=async(p,V)=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),errors=[],remote=[];
 p.on('pageerror',e=>errors.push(e.stack||e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(p.url()).origin)remote.push(r.url());});
 // Count real production exports: camera moves must reuse the same BVH and GPU context.
 await p.evaluate(()=>{window.liveExports=0;window.liveAudits=[];const original=View3D.progressiveScene;View3D.progressiveScene=async()=>{liveExports++;const data=await original();liveAudits.push({rects:data.lighting.rects.length,spots:data.lighting.spots.length});return data;};});
 const call=(name,args={})=>p.evaluate(({name,args})=>FurnishMcp.execute(name,args),{name,args});
 let c=await call('get_current_plan',{includeDetails:true});const write=()=>({planId:c.plan.id,revision:c.revision,requestId:'progressive-ui-'+Math.random().toString(36).slice(2)});
 if(V.mode==='desktop'){
  c=await call('configure_scene',{...write(),settings:{night:true,lamps:true,cut:2.8,labels:false,wallNumbers:false,clearances:false}});
  await p.setViewportSize({width:1640,height:1060});await p.locator('#tgLib').click();await p.locator('#tgPanel').click();
  await call('set_camera',{...write(),view:'3d',mode:'orbit',horizontalFov:70,position:{x:8410,y:6270,z:1660},target:{x:8410,y:3400,z:1880}});
 }else await p.evaluate(()=>setView('3d'));
 await p.evaluate(()=>View3D.automationReady());await p.locator('#progressive-mode').waitFor();assert.equal(await p.locator('#progressive-mode').inputValue(),'auto');
 if(V.mode==='file'){
  await p.waitForFunction(()=>document.querySelector('#progressive-controls')?.dataset.state==='fallback');assert.match(await p.locator('#progressive-status').textContent(),/直接打开文件/);assert.equal(await p.locator('#progressive-frame').count(),0);
 }else{
  const progress=setInterval(async()=>{try{console.log('LIVE '+V.mode+' '+await p.locator('#progressive-status').textContent());}catch{}},10000);
  try{await p.waitForFunction(()=>{const d=document.querySelector('#progressive-controls');if(d?.dataset.state==='fallback')throw Error(document.querySelector('#progressive-status').textContent);return d?.dataset.state==='progressive';},null,{timeout:180000});}finally{clearInterval(progress);}
  await V.screenshot('progressive');const viewport=await p.locator('#progressive-frame').boundingBox(),film=await p.frameLocator('#progressive-frame').locator('canvas').boundingBox();assert(Math.abs(viewport.width-film.width)<1&&Math.abs(viewport.height-film.height)<1,'live film fills its viewport without stretching to a different aspect');assert.equal(await p.locator('#progressive-frame').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  const baseline=await p.evaluate(()=>{window.liveFrame=document.querySelector('#progressive-frame');return liveExports;});
  const previous=await p.evaluate(()=>View3D.progressiveState().viewKey),camera=await p.evaluate(()=>View3D.automationCamera());
  await p.evaluate(camera=>View3D.automationCamera({mode:'orbit',position:{...camera.position,x:camera.position.x+100},target:camera.target}),camera);
  await p.waitForFunction(previous=>View3D.progressiveState()?.viewKey!==previous,previous);
  await p.waitForFunction(()=>!document.querySelector('#progressive-frame')?.hidden&&document.querySelector('#progressive-frame').dataset.viewKey===View3D.progressiveState()?.viewKey&&/采样|已收敛/.test(document.querySelector('#progressive-status').textContent),null,{timeout:60000});
  assert(await p.evaluate(()=>liveFrame===document.querySelector('#progressive-frame')),'camera motion reuses the iframe');assert.equal(await p.evaluate(()=>liveExports),baseline);
  // The input-transparent overlay hides immediately for the host's interaction events.
  await p.locator('#view3d').dispatchEvent('pointerdown',{pointerId:1,pointerType:'mouse',button:0,clientX:100,clientY:100});assert(await p.locator('#progressive-frame').evaluate(e=>e.hidden));
  await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup',{pointerId:1})));await p.waitForFunction(()=>!document.querySelector('#progressive-frame')?.hidden,null,{timeout:15000});
  if(V.mode==='desktop'){
   const progress=setInterval(async()=>{try{console.log('LIVE settled '+await p.locator('#progressive-status').textContent());}catch{}},10000);
   try{await p.waitForFunction(()=>/已收敛/.test(document.querySelector('#progressive-status')?.textContent||''),null,{timeout:180000});}finally{clearInterval(progress);}
   await V.screenshot('converged');
   await p.evaluate(()=>selectIds([state.furniture.find(f=>f.type==='surface_light').id]));await p.waitForFunction(()=>View3D.progressiveState()?.editing&&document.querySelector('#progressive-frame')?.hidden);assert.match(await p.locator('#progressive-status').textContent(),/编辑中/);await p.evaluate(()=>selectIds([]));await p.waitForFunction(()=>!document.querySelector('#progressive-frame')?.hidden,null,{timeout:15000});
   fs.writeFileSync(V.artifact('live-result.json'),JSON.stringify(await p.evaluate(()=>({status:document.querySelector('#progressive-status').textContent,exports:liveExports,state:View3D.progressiveState()})),null,2));
   c=await call('get_current_plan',{includeDetails:true});c=await call('configure_scene',{...write(),settings:{lamps:false}});
   await p.waitForFunction(()=>liveFrame!==document.querySelector('#progressive-frame'));await p.waitForFunction(()=>!!document.querySelector('#progressive-frame'),null,{timeout:60000});assert(await p.evaluate(()=>liveExports)>baseline,'light change requests a new production scene');await p.waitForFunction(()=>liveAudits.length>=2);assert(await p.evaluate(()=>liveAudits.at(-1).rects<liveAudits[0].rects),'off main lights disappear from the next production scene');
   await p.locator('#vLightingPreview').click();await p.waitForFunction(()=>!document.querySelector('#progressive-frame'));await p.locator('#lighting-stop').click();await p.locator('#lighting-close').click();
  }
 }
 await p.locator('#progressive-mode').selectOption('smooth');await p.waitForFunction(()=>!document.querySelector('#progressive-frame'));assert.equal(await p.locator('#view3d canvas').count(),1);
 await p.evaluate(()=>setView('2d'));assert.equal(await p.locator('#progressive-controls').count(),0);await p.evaluate(()=>setView('3d'));await p.locator('#progressive-mode').waitFor();assert.equal(await p.locator('#progressive-mode').inputValue(),'smooth','local preference survives exit/reentry');
 if(V.mode!=='file'){
  await p.evaluate(()=>Object.defineProperty(navigator,'gpu',{get:()=>undefined,configurable:true}));await p.locator('#progressive-mode').selectOption('auto');await p.waitForFunction(()=>document.querySelector('#progressive-controls').dataset.state==='fallback');assert.match(await p.locator('#progressive-status').textContent(),/WebGPU/);assert(await p.locator('#progressive-retry').isVisible());
  await p.locator('#progressive-retry').click();await p.waitForFunction(()=>document.querySelector('#progressive-controls').dataset.state==='fallback');assert.equal(await p.locator('#progressive-frame').count(),0);
 }
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>closeDrawers());await p.waitForFunction(()=>{const a=document.querySelector('#progressive-controls').getBoundingClientRect(),b=document.querySelector('.scene-light').getBoundingClientRect();return !(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);});await V.screenshot('fallback-narrow');assert(await p.locator('#progressive-controls').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 return [V.mode+': default progressive, real WebGPU samples and camera reuse where supported; pointer pause/resume, preference, exit cleanup, unsupported-device/file fallback, narrow UI, no remote requests'];
};
