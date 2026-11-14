'use strict';
module.exports=async(p,V)=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),errors=[];p.on('dialog',d=>d.accept());p.on('pageerror',e=>errors.push(e.message));
 const added=await p.evaluate(()=>{
  const item=libAll().flatMap(c=>c.items).find(i=>i[0]==='acwall_midea_mxc3p');if(!item)throw Error('Missing MXC3P catalog item');
  const f=createCatalogFurniture(item,3000,3000)[0];mutate(()=>{state.furniture=[f];});select({kind:'furn',id:f.id});return {id:f.id,bottom:f.mountHeight};
 });
 assert.equal(added.bottom,2200);await p.locator('#fBottomElevation').fill('2050');await p.locator('#fBottomElevation').dispatchEvent('change');assert.equal(await p.evaluate(id=>getF(id).mountHeight,added.id),2050);
 await p.evaluate(()=>undo());assert.equal(await p.evaluate(id=>getF(id).mountHeight,added.id),2200);await p.evaluate(()=>redo());assert.equal(await p.evaluate(id=>getF(id).mountHeight,added.id),2050);
 await p.locator('#fH').fill('310');await p.locator('#fH').dispatchEvent('change');assert.equal(await p.evaluate(id=>getF(id).h,added.id),310);assert.equal(await p.evaluate(id=>getF(id).mountHeight,added.id),2050);
 await p.evaluate(async()=>{save();await FurnishStorage.write(store);if(window.FurnishRepository&&repositoryClient?.status.mode!=='error')await FurnishRepository.flush();});if(V.mode==='desktop')await p.waitForFunction(()=>!repositoryClient?.pending);
 await p.reload({waitUntil:'domcontentloaded',timeout:120000});await p.waitForFunction(()=>!repositoryBooting);assert.deepEqual(await p.evaluate(id=>{const f=getF(id);return [f.w,f.d,f.h,f.mountHeight];},added.id),[870,199,310,2050]);
 const f=await p.evaluate(id=>getF(id),added.id);await require('../../scripts/lib/model-browser-fixture.cjs').install(p,{fixture:{...f,cx:0,cy:0}});
 await p.evaluate(async()=>{await View3D.automationCamera({view:'3d',mode:'orbit',horizontalFov:45,position:{x:-600,y:1700,z:2450},target:{x:0,y:0,z:2200}});await View3D.automationReady();});
 await V.screenshot('model');const geometry=await require('../../scripts/lib/model-browser-fixture.cjs').capture(p,V.artifact(V.mode+'-acwall.glb'));assert.equal(geometry.parts.length,17);assert(geometry.parts.every(part=>part.key.startsWith('explicit:acwall-midea-mxc3p-v1:')));
 fs.writeFileSync(V.artifact(V.mode+'-acwall.json'),JSON.stringify({fixture:f,geometry},null,2));await p.setViewportSize({width:390,height:844});await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await V.screenshot('narrow');assert.deepEqual(errors,[]);
 return ['actual catalog creation, real bottom-height and body-height controls, undo/redo, private save/reload, 17-part production export, narrow screen'];
};
