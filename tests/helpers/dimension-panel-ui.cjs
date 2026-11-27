'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function dimensions(p,run,label){
 const original=await p.evaluate(()=>structuredClone(getF('block')));
 const openSize=()=>p.locator('#fab [data-fab-edit="size"]').click();
 const applySize=()=>p.getByRole('button',{name:'应用尺寸',exact:true}).click();
 const heights=p.locator('[data-furniture-height-fields]');
 if(label==='desktop'){
  const audit=await p.evaluate(()=>{
   const seen=new Set(),grouped=[],dedicated=[],combined=[];
   for(const it of FurnishCatalogData.library.flatMap(c=>c.items)){
    if(seen.has(it[0]))continue;
    seen.add(it[0]);
    const items=createCatalogFurniture(it,5000,5000);
    if(items.length!==1){combined.push(it[0]);continue;}
    const f=items[0];
    if(furnitureUsesDetailedDesign(f)){dedicated.push(f.type);continue;}
    state.furniture=[f];selectIds([f.id]);
    const group=document.querySelector('[data-furniture-height-fields]');
    if(!group?.querySelector('#fMountHeight,#fBottomElevation,#stool-bottom,#covering-bottom'))throw Error('missing bottom elevation: '+f.type);
    if(document.querySelector('#panel #fW,#panel #fD'))throw Error('duplicate footprint editing: '+f.type);
    for(const id of ['fH','fMountHeight','fBottomElevation'])if(document.querySelectorAll('#'+id).length>1)throw Error('duplicate '+id+': '+f.type);
    grouped.push(f.type);
   }
   return {grouped,dedicated,combined};
  });
  require('node:fs').writeFileSync(path.join(run.dir,'dimension-audit.json'),JSON.stringify(audit,null,2));
  console.log('Dimension audit: '+audit.grouped.length+' types grouped; '+audit.dedicated.length+' dedicated; '+audit.combined.length+' combinations');
  for(const type of ['washer','sink_arrow_680','curtain','shower_arrow_cream','electrical_box_strong','chair']){
   await p.evaluate(type=>{const it=FurnishCatalogData.library.flatMap(c=>c.items).find(it=>it[0]===type),f=createCatalogFurniture(it,5000,5000)[0];mutate(()=>state.furniture=[f]);selectIds([f.id]);},type);
   const before=await p.evaluate(()=>structuredClone(state.furniture));
   await openSize();await applySize();
   assert.deepEqual(await p.evaluate(()=>structuredClone(state.furniture)),before,type+' unchanged values preserve installation');
   const bottom=heights.locator('#fMountHeight,#fBottomElevation,#stool-bottom,#covering-bottom');
   await bottom.fill(String(Number(await bottom.inputValue())+100));await bottom.dispatchEvent('change');
   await p.evaluate(()=>undo());assert.deepEqual(await p.evaluate(()=>structuredClone(state.furniture)),before,type+' elevation undo');
  }
  await p.evaluate(f=>{mutate(()=>state.furniture=[f]);selectIds([f.id]);},original);
 }
 assert.equal(await heights.locator('input').count(),2);
 await p.locator('#fH').fill('140');await p.locator('#fH').dispatchEvent('change');
 await p.locator('#fMountHeight').fill('800');await p.locator('#fMountHeight').dispatchEvent('change');
 assert.deepEqual(await p.evaluate(()=>{const f=getF('block');return [f.h,f.mountHeight];}),[140,800]);
 await heights.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(run.dir,label+'-dimensions.png')});
 if(label==='narrow')await p.evaluate(()=>drawer('panel',false));
 await openSize();assert.equal(await p.locator('#fab-height,#fab-bottom').count(),0);
 await p.locator('#fab-width').fill('450');await p.locator('#fab-depth').fill('250');
 await p.screenshot({path:path.join(run.dir,label+'-dimension-dialog.png')});await applySize();
 assert.deepEqual(await p.evaluate(()=>{const f=getF('block');return [f.w,f.d,f.h,f.mountHeight];}),[450,250,140,800]);
 await p.evaluate(()=>{undo();undo();undo();});assert.deepEqual(await p.evaluate(()=>structuredClone(getF('block'))),original);
 await p.evaluate(()=>{redo();redo();redo();});assert.equal(await p.evaluate(()=>getF('block').w),450);
 await openSize();await p.locator('#fab-width').fill('0');
 await p.locator('#fab-size-form').evaluate(form=>form.dispatchEvent(new Event('submit',{cancelable:true})));
 assert(await p.locator('#fab-size-error').textContent());assert.equal(await p.evaluate(()=>getF('block').w),450);
 await p.getByRole('button',{name:'取消',exact:true}).click();
 await p.evaluate(()=>{undo();undo();undo();});
};
