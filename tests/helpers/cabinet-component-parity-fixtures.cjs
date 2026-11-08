'use strict';
const B=require('../../src/core/cabinet-builder-core.js');
const base=id=>B.update(B.create({id,cx:0,cy:0,rot:0}),{boxId:'box1'},{w:800,d:500,h:1200});
const cases=B.palette.map(({kind})=>{
 let f=base('parity-'+kind);
 if(kind!=='box'){
  const r=B.add(f,kind,{boxId:'box1'});f=r.furniture;
  if(kind==='openZone')f=B.update(f,r.selected,{side:'both',light:true,extendSides:true});
  if(kind==='drawerModule')f=B.update(f,r.selected,{lanes:2,frontBottomOffset:-10,frontTopOffset:15});
  if(kind==='door')f=B.update(f,r.selected,{finish:'glass',handle:'knob'});
  if(kind==='trim')f=B.update(f,r.selected,{side:'right',size:35});
 }
 return {kind,f};
});
// Different box depths and horizontal divisions exercise local moving origins.
let mixed=base('parity-mixed');
mixed=B.add(mixed,'shelf',{boxId:'box1'}).furniture;
mixed=B.add(mixed,'divider',{boxId:'box1',at:.4}).furniture;
const next=B.addBox(mixed,{target:'box1',side:'right',params:{...B.box(),d:300,h:700}});mixed=next.furniture;
mixed=B.add(mixed,'slidingTop',{boxId:next.selected.boxId}).furniture;
mixed=B.add(mixed,'trim',{boxId:'box1'}).furniture;
cases.push({kind:'mixed',f:mixed});
for(const kind of ['splitDoor','multiDoor'])for(const [i,mode]of ['left','right','double','up','down'].entries()){
 const r=B.add(base('parity-'+kind+'-'+mode),kind,{boxId:'box1'});let f;
 if(kind==='splitDoor')f=B.update(r.furniture,r.selected,{mode,finish:['solid','wood','glass'][i%3]});
 else {const p=B.selection(r.furniture,r.selected).component;f=B.updateSegment(r.furniture,r.selected,p.segments[0].id,{mode,finish:['solid','wood','glass'][i%3]});}
 cases.push({kind:kind+'-'+mode,f});
}
for(const source of require('../fixtures/cabinet-builder-open-zones.json'))cases.push({kind:'pilot-'+source.id,f:B.upgrade(source)});
const pose=(source,phase)=>{
 let f=B.setOpening(source,phase>0);
 if(phase>0&&phase<1){f=structuredClone(f);for(const b of f.cabinet.boxes)for(const p of b.components){if(p.kind==='door')p.angle=p.maxAngle*phase;if(p.kind==='splitDoor')for(const key of ['lower','upper'])p[key].angle=p.maxAngle*phase;if(p.kind==='multiDoor')for(const s of p.segments)for(const leaf of s.leaves)leaf.angle=(leaf.maxAngle??s.maxAngle)*phase;if(['drawers','drawerModule','slidingTop'].includes(p.kind))p.extension=phase;}B.validate(f);}
 return f;
};
module.exports={cases,pose};
