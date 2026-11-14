'use strict';
module.exports=async(p,V)=>{
 const assert=require('node:assert/strict'),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.evaluate(()=>{
  const apply=FurnishLighting.cabinetContours;window.contourAudit={};FurnishLighting.cabinetContours=(group,lighting)=>{contourAudit.group=group;apply(group,lighting);};
  const build=FurnishCabinetModel.build;FurnishCabinetModel.build=(...args)=>{const group=build(...args);if(args[3]?.removableHints)contourAudit.preview=group;return group;};
  window.contourColors=group=>{const colors=[];group.traverse(o=>{if(o.userData.cabinetOutline)colors.push(o.material.color.toArray());});return colors;};
  mutate(()=>{
   if(!state.furniture.some(f=>f.cabinet?.version===2&&!f.kitchen)){
    const B=FurnishCabinetBuilder;let f=B.create({id:'night-contour-fixture',cx:5000,cy:4000,rot:0,color:'#503c28'});f=B.add(f,'shelf',{boxId:'box1',at:.5}).furniture;f=B.add(f,'door',{boxId:'box1'}).furniture;state.furniture.push(f);
   }
   state.scene3d=FurnishDesign.sceneSettings({...state.scene3d,night:true,labels:false,wallNumbers:false,clearances:false});
  });
 });
 await p.evaluate(async()=>{await setView('3d');await View3D.automationReady();});
 const count=await p.evaluate(()=>contourColors(contourAudit.group).length);assert(count>0,'current production plan includes outlined cabinets');
 const id=await p.evaluate(()=>state.furniture.find(f=>f.cabinet?.version===2&&!f.kitchen)?.id);assert(id);
 await p.evaluate(async id=>{selectIds([id]);View3D.focusSelection();await View3D.automationReady();},id);
 const night=await p.evaluate(()=>contourColors(contourAudit.group));await V.screenshot('night-corrected');
 // Same isolated production geometry/camera/exposure, with the old unattenuated contours.
 await p.evaluate(async()=>{FurnishLighting.cabinetContours(contourAudit.group,FurnishLighting.environment(false));await View3D.automationReady();});await V.screenshot('night-before');
 await p.evaluate(async()=>{FurnishLighting.cabinetContours(contourAudit.group,FurnishLighting.environment(true));await View3D.automationReady();});
 for(let i=0;i<2;i++){
  await p.locator('[data-t="night"]').click({force:true});await p.evaluate(()=>View3D.automationReady());
  const day=await p.evaluate(()=>contourColors(contourAudit.group));assert.equal(day.length,night.length);day.forEach((color,j)=>color.forEach((v,k)=>assert(Math.abs(night[j][k]-v*.015/1.1)<1e-9)));
  await p.locator('[data-t="night"]').click({force:true});await p.evaluate(()=>View3D.automationReady());assert.deepEqual(await p.evaluate(()=>contourColors(contourAudit.group)),night);
 }
 await p.evaluate(async mode=>{save();await FurnishStorage.write(store);if(mode==='desktop')await FurnishRepository.flush();},V.mode);
 p.once('dialog',dialog=>dialog.accept());
 await p.reload({waitUntil:'domcontentloaded',timeout:120000});await p.waitForFunction(()=>!repositoryBooting,null,{timeout:120000});
 await p.evaluate(()=>{const apply=FurnishLighting.cabinetContours;FurnishLighting.cabinetContours=(g,l)=>{window.reloadedContours=[];apply(g,l);g.traverse(o=>{if(o.userData.cabinetOutline)reloadedContours.push(o.material.color.toArray());});};});
 await p.evaluate(async()=>{await setView('3d');await View3D.automationReady();});assert.deepEqual(await p.evaluate(()=>reloadedContours),night,'reload rebuilds correct night colors');
 await p.evaluate(id=>{const build=FurnishCabinetModel.build;FurnishCabinetModel.build=(...args)=>{const group=build(...args);if(args[3]?.removableHints){window.editorContourColors=[];group.traverse(o=>{if(o.userData.cabinetOutline)editorContourColors.push(o.material.color.toArray());});}return group;};FurnishCabinetBuilderUI.open(id);},id);
 await p.locator('#cab-builder canvas').waitFor();await p.getByRole('button',{name:'三维检查',exact:true}).click();
 assert(await p.evaluate(()=>editorContourColors.some(c=>c[0]>.05)),'night editor preserves full structure-line color');await V.screenshot('editor-structure-lines');await p.getByRole('button',{name:'取消',exact:true}).click();
 assert.deepEqual(errors,[]);return ['night/day toggle restores exact colors, repeated toggles stable, production night before/after, independent editor structure lines, save/reload rebuild; formal source protected by harness hash'];
};
