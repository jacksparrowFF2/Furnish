'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function dimensions(p,run,label){
 const original=await p.evaluate(()=>structuredClone(getF('block')));
 if(label==='desktop'){
  const audit=await p.evaluate(()=>{const seen=new Set(),grouped=[],dedicated=[],combined=[];for(const it of FurnishCatalogData.library.flatMap(c=>c.items)){if(seen.has(it[0]))continue;seen.add(it[0]);const items=createCatalogFurniture(it,5000,5000);if(items.length!==1){combined.push(it[0]);continue;}const f=items[0];if(furnitureUsesDetailedDesign(f)){dedicated.push(f.type);continue;}mutate(()=>state.furniture=[f]);selectIds([f.id]);const group=document.querySelector('[data-furniture-size-fields]');if(!group||group.querySelectorAll('input').length!==4)throw Error('missing grouped dimensions: '+f.type);for(const id of ['fW','fD','fH','fMountHeight','fBottomElevation'])if(document.querySelectorAll('#'+id).length>1)throw Error('duplicate '+id+': '+f.type);grouped.push(f.type);}return {grouped,dedicated,combined};});
  require('node:fs').writeFileSync(path.join(run.dir,'dimension-audit.json'),JSON.stringify(audit,null,2));console.log('Dimension audit: '+audit.grouped.length+' types grouped; '+audit.dedicated.length+' dedicated; '+audit.combined.length+' combinations');
  for(const type of ['washer','sink_arrow_680','curtain','shower_arrow_cream','electrical_box_strong','chair']){
   await p.evaluate(type=>{const it=FurnishCatalogData.library.flatMap(c=>c.items).find(it=>it[0]===type),f=createCatalogFurniture(it,5000,5000)[0];mutate(()=>state.furniture=[f]);selectIds([f.id]);},type);
   const before=await p.evaluate(()=>structuredClone(state.furniture));await p.locator('#fab [data-fab-edit="size"]').click();await p.getByRole('button',{name:'应用尺寸',exact:true}).click();assert.deepEqual(await p.evaluate(()=>structuredClone(state.furniture)),before,type+' unchanged values preserve installation/legacy omission');
   await p.locator('#fab [data-fab-edit="size"]').click();const bottom=await p.locator('#fab-bottom').inputValue();await p.locator('#fab-bottom').fill(String(Number(bottom)+100));await p.getByRole('button',{name:'应用尺寸',exact:true}).click();await p.evaluate(()=>undo());assert.deepEqual(await p.evaluate(()=>structuredClone(state.furniture)),before,type+' elevation atomic undo');
  }
  await p.evaluate(f=>{mutate(()=>state.furniture=[f]);selectIds([f.id]);},original);
 }
 assert.equal(await p.locator('[data-furniture-size-fields] input').count(),4);
 await p.locator('#fW').fill('340');await p.locator('#fW').dispatchEvent('change');assert.equal(await p.evaluate(()=>getF('block').w),340);await p.evaluate(()=>undo());
 if(label==='narrow')await p.waitForFunction(()=>!document.querySelector('#toast.show'),null,{timeout:10000});
 await p.locator('[data-furniture-size-fields]').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(run.dir,label+'-dimensions.png')});
 if(label==='narrow'){await p.evaluate(()=>drawer('panel',false));await p.waitForTimeout(300);}
 await p.locator('#fab [data-fab-edit="size"]').click();for(const [id,v] of [['width',450],['depth',250],['height',140],['bottom',800]])await p.locator('#fab-'+id).fill(String(v));
 await p.screenshot({path:path.join(run.dir,label+'-dimension-dialog.png')});await p.getByRole('button',{name:'应用尺寸',exact:true}).click();assert.deepEqual(await p.evaluate(()=>{const f=getF('block');return [f.w,f.d,f.h,f.mountHeight];}),[450,250,140,800]);
 await p.evaluate(()=>undo());assert.deepEqual(await p.evaluate(()=>structuredClone(getF('block'))),original);await p.evaluate(()=>redo());assert.equal(await p.locator('#fH').inputValue(),'140');await p.evaluate(()=>undo());
 await p.locator('#fab [data-fab-edit="size"]').click();await p.locator('#fab-bottom').fill('-1');await p.locator('#fab-size-form').evaluate(form=>form.dispatchEvent(new Event('submit',{cancelable:true})));assert(await p.locator('#fab-size-error').textContent());assert.deepEqual(await p.evaluate(()=>structuredClone(getF('block'))),original);await p.getByRole('button',{name:'取消',exact:true}).click();
};
