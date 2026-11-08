'use strict';
const B=require('../../src/core/cabinet-builder-core.js'),base=id=>B.update(B.create({id:'edit-'+id,cx:4000,cy:4500,rot:0}),{boxId:'box1'},{w:900,d:450,h:1200});
const cases=[];
for(const kind of ['rail','openZone','emptyZone','multiDoor','plinth','topClosure','trim-left','trim-right','trim-top','divider']){
 let f=base(kind),type=kind.startsWith('trim')?'trim':kind==='emptyZone'?'openZone':kind;
 if(kind==='rail'){f=B.add(f,'panel',{boxId:'box1',at:.2}).furniture;f=B.add(f,'shelf',{boxId:'box1',at:.85}).furniture;}
 const r=B.add(f,type,{boxId:'box1',...(kind==='multiDoor'?{params:B.doorComponent(2)}:{})});f=r.furniture;
 if(type==='openZone')f=B.update(f,r.selected,{from:.3,to:.6,back:false,side:kind==='emptyZone'?'none':'both',lower:kind!=='emptyZone',upper:kind!=='emptyZone',light:kind!=='emptyZone'});
 if(type==='multiDoor'){f=B.update(f,r.selected,{range:{bottom:.2,top:.8},drop:20});const p=B.selection(f,r.selected).component;f=B.updateLeaf(f,r.selected,p.segments[0].id,p.segments[0].leaves[0].id,{open:true,angle:35});}
 if(type==='trim')f=B.update(f,r.selected,{side:kind.split('-')[1],size:20});
 cases.push({kind,f,pick:r.selected});
}
module.exports=cases;
