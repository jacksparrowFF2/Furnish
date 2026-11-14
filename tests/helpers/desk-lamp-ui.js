'use strict';
module.exports=async(p,V)=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),errors=[];p.on('dialog',d=>d.accept());p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GPUValidation/i.test(m.text()))errors.push(m.text().slice(0,300));});
 if(V.mode!=='desktop'){
  const s=require('../../scripts/workspace-files.cjs').create(require('node:path').resolve(__dirname,'../..')).read().workspace;s.work={[s.planId]:s.work[s.planId]};s.designs=s.designs.filter(d=>d.id===s.activeDesigns[s.planId]);s.customPlans=s.customPlans.filter(d=>d.id===s.planId);
  await p.evaluate(async s=>{s.updatedAt=Date.now()+1000;delete s._repository;localStorage.setItem('huxing-design-v'+s.v,JSON.stringify(s));await FurnishStorage.write(s);},s);await p.reload({waitUntil:'domcontentloaded',timeout:120000});await p.waitForFunction(()=>!repositoryBooting);
 }
 console.log('Lamp UI '+V.mode+': loaded');
 const added=await p.evaluate(()=>{
  const item=libAll().flatMap(c=>c.items).find(i=>i[0]==='desk_lamp_mijia_pro');if(!item)throw Error('Missing catalog lamp');
  const f=createCatalogFurniture(item,3419.5,9220)[0];Object.assign(f,{rot:90,mountHeight:745});mutate(()=>{state.furniture=state.furniture.filter(o=>o.type!=='desk_lamp_mijia_pro');state.furniture.find(o=>o.id==='fmv5c10yi4').deskLampVisible=false;state.furniture.push(f);});return {id:f.id};
 });
 await p.evaluate(id=>{mutate(()=>state.furniture.find(f=>f.id===id).mountHeight=780);undo();},added.id);assert.equal(await p.evaluate(id=>getF(id).mountHeight,added.id),745);await p.evaluate(()=>redo());assert.equal(await p.evaluate(id=>getF(id).mountHeight,added.id),780);await p.evaluate(()=>undo());
 console.log('Lamp UI '+V.mode+': undo/redo checked');
 await p.evaluate(async()=>{save();await FurnishStorage.write(store);if(window.FurnishRepository&&repositoryClient?.status.mode!=='error')await FurnishRepository.flush();});if(V.mode==='desktop')await p.waitForFunction(()=>!repositoryClient?.pending);await p.reload({waitUntil:'domcontentloaded',timeout:120000});await p.waitForFunction(()=>!repositoryBooting);assert.equal(await p.evaluate(id=>getF(id).mountHeight,added.id),745);
 console.log('Lamp UI '+V.mode+': save/reload checked');
 await p.evaluate(async()=>{await setView('3d');await View3D.automationCamera({view:'3d',mode:'orbit',horizontalFov:50,position:{x:1750,y:9100,z:1550},target:{x:3403,y:9250,z:1070}});await View3D.automationReady();});await V.screenshot('reading-desk');
 const glb=await p.evaluate(async id=>{const data=await View3D.highQualityScene(),view=new DataView(data.buffer),j=JSON.parse(new TextDecoder().decode(new Uint8Array(data.buffer,20,view.getUint32(12,true))));return {parts:j.nodes.filter(n=>n.extras?.furnishId===id&&n.mesh!==undefined).length,faces:data.lighting.rects.filter(r=>r.owner===id),lamp:getF(id)};},added.id);assert.equal(glb.parts,27);assert.equal(glb.faces.length,2);assert(glb.faces.every(f=>f.normal[1]<-.999));
 fs.writeFileSync(V.artifact(V.mode+'-lamp-export.json'),JSON.stringify(glb,null,2));
 if(V.mode==='desktop'){
  await p.locator('#vLightingPreview').click();await p.waitForFunction(()=>/已完成|未完成|已改变/.test(document.querySelector('#lighting-status')?.textContent||''),null,{timeout:180000});const result=await p.locator('#lighting-status').textContent();assert.match(result,/已完成/);await V.screenshot('reading-light-preview');
  const image=await p.locator('#lighting-image img').evaluate(async img=>{const b=await(await fetch(img.src)).blob();return new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(b);});});fs.writeFileSync(V.artifact('reading-light.png'),Buffer.from(image,'base64'));await p.locator('#lighting-close').click();
 }
 assert.deepEqual(errors,[]);return ['actual MJTD07YL catalog constructor, editable bottom elevation, undo/redo, private cache/file reload, real 27-part production export and two uncapped area emitters'+(V.mode==='desktop'?', actual WebGPU desk render':'')];
};
