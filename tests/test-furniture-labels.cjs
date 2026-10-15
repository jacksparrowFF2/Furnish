const assert=require('node:assert/strict'),D=require('../src/core/drawing-core.js');
const item={id:'sofa',name:'源氏木语非常长的三人沙发型号与颜色规格',cx:3000,cy:2500,w:2160,d:900,rot:0},before=JSON.stringify(item);
const hit=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
for(const rotation of [0,90,180,270])for(const rot of [0,30,45,90,135]){const f={...item,rot},v=D.furnitureLabels([f],{rotation})[0];assert(v.lines.length<=2);assert(v.lines.length>0);const angle=(rot+rotation)*Math.PI/180,center=D.rotate([f.cx,f.cy],rotation);for(const p of [[v.box[0],v.box[1]],[v.box[2],v.box[1]],[v.box[2],v.box[3]],[v.box[0],v.box[3]]]){const dx=p[0]-center[0],dy=p[1]-center[1];assert(Math.abs(Math.cos(angle)*dx+Math.sin(angle)*dy)<=f.w/2-20);assert(Math.abs(-Math.sin(angle)*dx+Math.cos(angle)*dy)<=f.d/2-20);}}
const long=D.furnitureLabels([{...item,w:700,d:500}])[0];assert(long.truncated);assert(long.lines.join('').endsWith('…'));assert(D.furnitureLabels([item],{scale:.015})[0].lines.length===0);assert(D.furnitureLabels([item],{scale:.1})[0].lines.length>0);
const overlap=[item,{...item,id:'other'}],chosen=D.furnitureLabels(overlap,{selected:['other']});assert(chosen.find(v=>v.id==='other').lines.length>0);const boxes=chosen.filter(v=>v.box).map(v=>v.box);for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!hit(boxes[i],boxes[j]));
const ascii=D.furnitureLabels([{...item,name:'Sofa A 2.16m (Snow white)'}])[0];assert(ascii.lines.length>0);assert.equal(JSON.stringify(item),before);
const G=require('../src/core/layout-geometry.js'),table={id:'table',type:'table',name:'餐桌',cx:0,cy:0,w:900,d:1400,rot:0},seat={id:'seat',type:'chair',name:'餐椅',cx:-500,cy:-310,w:450,d:550,rot:-90};
for(const rotation of [0,90,180,270])for(const selected of [[],['seat']]){
 const label=D.furnitureLabels([table,seat],{rotation,selected}).find(v=>v.id==='seat');
 if(label.box){const b=label.box,poly=[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]].map(p=>D.rotate(p,-rotation));assert(!G.polygonOverlap(poly,G.corners(table),0),'a seat label cannot be partly hidden by the table');}
 assert(D.furnitureLabels([table,{...seat,cx:-1500}],{rotation,selected}).find(v=>v.id==='seat').lines.length>0,'pulling the chair out restores its full name');
}
console.log('PASS furniture label wrapping/truncation, projected footprint containment, four views, seat/table occlusion, low-zoom density, selected priority and unchanged saved names');
