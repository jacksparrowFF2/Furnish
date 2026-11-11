'use strict';
const assert=require('node:assert/strict'),A=require('../src/core/cabinet-assembly-core.js'),B=require('../src/core/cabinet-builder-core.js'),K=require('../src/core/kitchen-core.js'),SVG=require('../src/render/furniture-svg.js'),G=require('../src/core/layout-geometry.js'),P=require('../src/core/project-core.js');
const Rules=require('../src/core/product-rules.js');
const near=(a,b)=>assert(Math.abs(a-b)<.002,a+' != '+b),palette={ink:'#222'};
let count=0;
for(const rot of [0,37,90,270])for(const flip of [false,true])for(const ownRot of [0,90]){
 let n=0,f=A.editableKitchen(K.createLaundryCabinet({id:'position',cx:4000,cy:3000,rot,flip},()=> 'p'+(++n),'left')[0]),a=K.assemblyConfig(f,true),part=B.create();
 a.cabinet1={w:600,d:450,h:870,x:1600,y:125,mountHeight:0,rot:ownRot,cabinet:structuredClone(part.cabinet)};a.cabinet1.cabinet.boxes[0].h=870;
 a.cabinet2={w:600,d:750,h:870,x:ownRot?1600:1000,y:ownRot?-475:125,mountHeight:0,rot:ownRot,cabinet:structuredClone(a.cabinet1.cabinet)};a.cabinet2.cabinet.boxes[0].d=750;
 K.validate(f);const baseline=structuredClone(f),q=a.cabinet1,c=ownRot===0?1:0,s=ownRot===90?1:0;
 assert(A.alignmentTargets(f,'cabinet1').some(r=>r.id==='cabinet2'));
 for(const align of ['front','back','center']){
  const next=A.alignPart(f,'cabinet1','cabinet2',align),p=K.assemblyConfig(next).cabinet1,t=K.assemblyConfig(next).cabinet2,edge=align==='front'?1:align==='back'?-1:0;
  near(-p.x*s+p.y*c+edge*p.d/2,-t.x*s+t.y*c+edge*t.d/2);near(p.x*c+p.y*s,q.x*c+q.y*s);near(p.mountHeight,q.mountHeight);near(p.h,q.h);assert.deepEqual(next.kitchen.modules,baseline.kitchen.modules);assert.deepEqual(next.kitchen.laundry.assembly.cabinet2,baseline.kitchen.laundry.assembly.cabinet2);
  const bounds=A.bounds(next),outline=G.localOutline(next);assert.deepEqual(Rules.assemblyBounds(next),bounds);near(Rules.dimensions(next).w,bounds.w);near(Rules.dimensions(next).d,bounds.d);assert.equal(next.w,baseline.w,'reported envelope never rewrites the native tabletop width');for(const [x,y]of K.assemblyCorners(next,K.laundryParts(next).find(r=>r.key==='cabinet1').furniture)){assert(x>=bounds.left-.002&&x<=bounds.right+.002&&y>=bounds.back-.002&&y<=bounds.front+.002);assert(outline.some(p=>Math.abs(p[0]-bounds.left)<.002));}
  const markup=SVG.render(next.type,next.w,next.d,next.color||'#aaa',palette,next),match=markup.match(/data-kitchen-assembly="cabinet1" transform="translate\(([^ ]+) ([^)]+)\) rotate\(([^)]+)\)"/);assert(match,'added cabinet must render in 2D');near(+match[1],p.x);near(+match[2],p.y);near(((+match[3]-ownRot)%360+360)%360,0);assert(markup.includes('data-component-box="box1"'));
  const derived=K.laundryParts(next).find(r=>r.key==='cabinet1').furniture;assert(G.footprints(next).some(poly=>G.inPoly(derived.cx,derived.cy,poly)),'2D geometry includes the added box outside the original host');
  P.validateWork({furniture:[next]});assert.deepEqual(P.unpack(P.pack({planId:'demo',current:{furniture:[next]},designs:[],catalog:[]})).current.furniture[0],next);const restored=JSON.parse(JSON.stringify(next));K.validate(restored);assert.deepEqual(restored,next);near(K.assemblyConfig(A.alignPart(restored,'cabinet1','cabinet2',align)).cabinet1.y,p.y);
 }
 const disabled=structuredClone(f);disabled.kitchen.laundry.assembly.cabinet1.enabled=false;assert(!SVG.render(disabled.type,disabled.w,disabled.d,'#aaa',palette,disabled).includes('data-kitchen-assembly="cabinet1"'));
 assert.throws(()=>A.alignPart(f,'cabinet1','missing','front'));assert.throws(()=>A.alignPart(f,'cabinet1','cabinet2','invalid'));assert.deepEqual(f,baseline,'alignment does not mutate its source');
 count++;
}
console.log('PASS '+count+' rotated/mirrored position cases: front/back/centre, stable width/height/neighbours, 2D structure/footprint, disabled and restore');
const C=require('../src/core/cabinet-core.js');
{
 let f=A.componentizeKitchen(K.fromWall({id:'wall',type:'kitchenwall',cx:5000,cy:5000,rot:90,flip:true,mountHeight:1600,...C.preset('wall')}));
 const added=A.addCabinet(f);f=A.edit(added.furniture,added.id,{x:2000,y:250});const part=K.laundryParts(f).find(r=>r.key===added.id).furniture;
 assert(G.footprints(f).some(poly=>G.inPoly(part.cx,part.cy,poly)),'wall kitchen footprints include separate added cabinets');
 assert(SVG.render(f.type,f.w,f.d,'#aaa',palette,f).includes('data-kitchen-assembly="'+added.id+'"'),'generic wall kitchen does not fall back to an envelope rectangle');
}
console.log('PASS generic kitchen added-cabinet drawing and wall footprints');
