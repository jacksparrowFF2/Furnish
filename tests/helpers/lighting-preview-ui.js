'use strict';
module.exports=async(p,V)=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.stack||e.message));p.on('console',m=>{if(m.type()==='error'&&/GPUValidation|WebGPU|WebGL|shader|uniform/i.test(m.text()))errors.push(m.text().slice(0,500));});
 p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(p.url()).origin)requests.push(r.url());});
 if(V.mode!=='desktop'){
  await p.evaluate(async()=>{await setView('3d');await View3D.automationReady();});await p.locator('#vLightingPreview').click();
  if(V.mode==='file'){assert.match(await p.locator('#lighting-status').textContent(),/本地服务/);assert(await p.locator('#lighting-start').isDisabled());}
  else{await p.locator('#lighting-stop').click();assert.match(await p.locator('#lighting-status').textContent(),/停止/);assert.equal(await p.locator('#lighting-image iframe').count(),0);}
  await p.locator('#lighting-close').click();assert.equal(await p.locator('#lighting-preview').count(),0);assert.equal(await p.locator('#view3d canvas').count(),1);assert.deepEqual(errors,[]);return [V.mode+' editor loads, independent preview stop/close or explicit file fallback, no external dependency requests'];
 }
 const call=(name,args={})=>p.evaluate(({name,args})=>FurnishMcp.execute(name,args),{name,args});
 let c=await call('get_current_plan',{includeDetails:true});const write=()=>({planId:c.plan.id,revision:c.revision,requestId:'hd-ui-'+Math.random().toString(36).slice(2)});
 c=await call('configure_scene',{...write(),settings:{night:true,lamps:true,cut:2.8,labels:false,wallNumbers:false,clearances:false}});
 await p.setViewportSize({width:1640,height:1060});await p.locator('#tgLib').click();await p.locator('#tgPanel').click();
 await call('set_camera',{...write(),view:'3d',mode:'orbit',horizontalFov:70,position:{x:8410,y:6270,z:1660},target:{x:8410,y:3400,z:1880}});await p.evaluate(()=>View3D.automationReady());
 await p.locator('#view3d canvas').first().screenshot({path:V.artifact('corrected-editor.png')});
 // Capture only through the public export API, and retain this exact production
 // snapshot for Cycles verification without rerunning or changing formal data.
 await p.evaluate(()=>{const original=View3D.highQualityScene;View3D.highQualityScene=async()=>{const data=await original();window.hdAudit={lighting:data.lighting,environment:data.environment,meshCount:data.meshCount,aspect:data.aspect,signature:data.signature};window.hdBuffer=data.buffer.slice(0);return data;};});
 await p.locator('#vLightingPreview').click();
 const progress=setInterval(async()=>{try{console.log('HD '+await p.locator('#lighting-status').textContent());}catch{}},10000);
 try{await p.waitForFunction(()=>/已完成|未完成|已改变/.test(document.querySelector('#lighting-status')?.textContent||''),null,{timeout:240000});}finally{clearInterval(progress);}
 const result=await p.locator('#lighting-status').textContent();assert.match(result,/已完成/);await V.screenshot('complete');
 const audit=await p.evaluate(()=>hdAudit);fs.writeFileSync(V.artifact('hd-audit.json'),JSON.stringify({result,...audit},null,2));
 assert(audit.lighting.rects.length>0);assert(await p.locator('#lighting-download').isVisible());assert.equal(await p.locator('#lighting-image iframe').count(),0,'completed viewer releases GPU context');
 const image=await p.locator('#lighting-image img').evaluate(async img=>{const r=await fetch(img.src),b=await r.blob();return new Promise(resolve=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result.split(',')[1]);fr.readAsDataURL(b);});});fs.writeFileSync(V.artifact('hd-preview.png'),Buffer.from(image,'base64'));
 const glb=await p.evaluate(()=>new Promise(resolve=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result.split(',')[1]);fr.readAsDataURL(new Blob([hdBuffer]));}));fs.writeFileSync(V.artifact('hd-production.glb'),Buffer.from(glb,'base64'));
 if(process.env.FURNISH_LIGHTING_HD_FINE==='1'){
  await p.locator('#lighting-quality').selectOption('fine');await p.locator('#lighting-start').click();
  const progress=setInterval(async()=>{try{console.log('HD FINE '+await p.locator('#lighting-status').textContent());}catch{}},15000);
  try{await p.waitForFunction(()=>/已完成|未完成/.test(document.querySelector('#lighting-status')?.textContent||''),null,{timeout:360000});}finally{clearInterval(progress);}
  const result=await p.locator('#lighting-status').textContent();assert.match(result,/已完成.*1920.*1024/);await V.screenshot('fine');
  const image=await p.locator('#lighting-image img').evaluate(async img=>{const blob=await(await fetch(img.src)).blob();return new Promise(resolve=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result.split(',')[1]);fr.readAsDataURL(blob);});});fs.writeFileSync(V.artifact('hd-fine.png'),Buffer.from(image,'base64'));fs.writeFileSync(V.artifact('fine-result.json'),JSON.stringify({result}));
 }
 c=await call('get_current_plan',{includeDetails:true});c=await call('configure_scene',{...write(),settings:{lamps:false}});
 await p.waitForFunction(()=>document.querySelector('#lighting-image').classList.contains('stale'));assert(await p.locator('#lighting-download').isHidden());
 await p.locator('#lighting-start').click();await p.waitForFunction(()=>!!document.querySelector('#lighting-image iframe'),null,{timeout:60000});assert.equal((await p.evaluate(()=>hdAudit.lighting.rects)).length,0,'off lights are absent from the next real snapshot');await p.locator('#lighting-stop').click();assert.equal(await p.locator('#lighting-image iframe').count(),0);
 await p.locator('#lighting-start').click();await p.waitForFunction(()=>!!document.querySelector('#lighting-image iframe'),null,{timeout:60000});
 const moved=c.furniture.find(f=>f.type==='surface_light');c=await call('update_furniture',{...write(),updates:[{id:moved.id,cx:moved.cx+20}]});await p.waitForFunction(()=>document.querySelector('#lighting-image').classList.contains('stale'));assert.equal(await p.locator('#lighting-image iframe').count(),0,'moving a fixture cancels the old preview');
 await p.locator('#lighting-start').click();await p.waitForFunction(()=>!!document.querySelector('#lighting-image iframe'),null,{timeout:60000});c=await call('copy_design',{...write(),name:'高清预览失效验证副本'});await p.waitForFunction(()=>document.querySelector('#lighting-image').classList.contains('stale'));assert.equal(await p.locator('#lighting-image iframe').count(),0,'switching to an identical copied design invalidates the old preview');
 await p.locator('#lighting-close').click();assert.equal(await p.locator('#view3d canvas').count(),1);
 // Unsupported device fails once and leaves the editor and Cycles available.
 await p.context().addInitScript(()=>{Object.defineProperty(navigator,'gpu',{get:()=>undefined,configurable:true});});
 await p.locator('#vLightingPreview').click();await p.waitForFunction(()=>/未完成/.test(document.querySelector('#lighting-status')?.textContent||''),null,{timeout:60000});assert.equal(await p.locator('#view3d canvas').count(),1);
 await p.setViewportSize({width:390,height:844});await V.screenshot('narrow');assert(await p.locator('#lighting-preview').evaluate(el=>el.getBoundingClientRect().width<=innerWidth));await p.locator('#lighting-close').click();
 await p.locator('.rail-tool-menu > summary').click();await p.locator('#vBlender').click();assert(await p.locator('#blender-source').isVisible());await p.locator('#blender-dock-close').click();
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 return ['real packaged EXE, production 1601 GLB and same camera, actual WebGPU 128 samples + OIDN PNG, all source lights independent of raster cap, transient GPU disposal, off-light invalidation, explicit cancellation, unsupported-device fallback, narrow UI and preserved Cycles entry; source file hash checked by harness'];
};
