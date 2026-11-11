'use strict';
const assert=require('node:assert/strict');
const B=require('../src/core/cabinet-builder-core.js'),M=require('../src/core/cabinet-motion.js'),G=require('../src/core/layout-geometry.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const source=P.unpack(require('./fixtures/beam-body-project.json')).current.furniture.find(f=>f.id==='body-cabinet'),upgraded=B.upgrade(source),before=JSON.stringify(upgraded);
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
for(const height of [2399,2401,1800])for(const width of [1999,2000,2200])for(const depth of [599,600,750])for(const rot of [0,37,90])for(const flip of [false,true]){
 const f={...B.resize(upgraded,{h:height,w:width,d:depth}),rot,flip,mountHeight:123},boards=M.boards(f,{includeStatic:true});
 near(Math.max(...boards.map(p=>p.top)),height);near(Math.max(...G.bodyParts(f).map(p=>p.vertical.top)),height+123);
 const sides=boards.filter(p=>p.metadata.cabinetSide);assert(sides.length>0);
 near(Math.min(...sides.flatMap(p=>p.poly.map(v=>v[0]))),-width/2);near(Math.max(...sides.flatMap(p=>p.poly.map(v=>v[0]))),width/2);
 near(Math.min(...boards.filter(p=>p.metadata.cabinetBack).flatMap(p=>p.poly.map(v=>v[1]))),-depth/2);
 for(const side of sides){const edges=side.poly.map((p,i)=>Math.hypot(p[0]-side.poly[(i+1)%side.poly.length][0],p[1]-side.poly[(i+1)%side.poly.length][1]));near(Math.min(...edges),18);}
 const project=P.pack({planId:'resize',current:{furniture:[f]},designs:[{name:'resized',work:{furniture:[f]}}],catalog:[]});assert.deepEqual(P.unpack(project).current.furniture[0],f);assert.deepEqual(D.restoreFurniture([f],{makeId:()=> 'id',colorFor:()=> '#fff'}),[f]);
 const restored=B.resize(f,{h:source.h,w:source.w});near(Math.max(...M.boards(restored,{includeStatic:true}).map(p=>p.top)),source.h);
}
assert.equal(JSON.stringify(upgraded),before);assert(require('../src/core/cabinet-component-profiles.js').equivalent(source,upgraded));
const anchored=B.resize(upgraded,{h:2399});
assert.equal(B.spatial(anchored).profileBoundsRule,'rigid-outer-faces-v1');assert.equal(B.spatial(upgraded).profileBoundsRule,'rigid-outer-faces-v1','captured-board models share the corrected construction contract');
assert.equal(B.spatial(B.create()).profileBoundsRule,undefined,'ordinary component boxes retain their confirmation contract');
const reviewPlan={id:'profile-review',walls:[],doors:[],wins:[],slides:[],rooms:[{id:'room',poly:[[0,0],[10000,0],[10000,10000],[0,10000]]}],ceilingHeight:4000},fingerprint=f=>P.checkFingerprint({kind:'beam',id:f.id},reviewPlan,[f],800),currentFingerprint=fingerprint(anchored),plain=B.create({id:'plain',cx:2000,cy:2000,rot:0}),plainFingerprint=fingerprint(plain),originalSpatial=B.spatial;
try{B.spatial=f=>{const value=originalSpatial(f);delete value.profileBoundsRule;return value;};assert.notEqual(fingerprint(anchored),currentFingerprint,'captured-board confirmations must be reviewed under the new construction rule');assert.equal(fingerprint(plain),plainFingerprint,'unrelated ordinary boxes retain their confirmations');}finally{B.spatial=originalSpatial;}
assert.equal(fingerprint({...anchored,price:123,color:'#111111',purchaseStatus:'ordered'}),currentFingerprint,'procurement and color keep the spatial confirmation');
const box=upgraded.cabinet.boxes[0],top=box.components.find(p=>p.kind==='board'&&p.profile?.parts.some(part=>part.metadata.cabinetTop)),moved=B.update(upgraded,{boxId:box.id,componentId:top.id},{y:top.y+20}),resized=B.resize(moved,{h:2399});
near(Math.max(...M.boards(moved,{includeStatic:true}).map(p=>p.top)),2420);
near(Math.max(...M.boards(resized,{includeStatic:true}).map(p=>p.top)),(top.y+20)*resized.h/source.h+top.h/2);
for(const rot of [0,37,90])for(const flip of [false,true]){
 const f={...B.resize(upgraded,{h:2399}),rot,flip,mountHeight:123},beam={id:'beam',name:'contact',poly:P.polygon(f),bottomHeight:2522,topHeight:2700},plan={id:'contact',walls:[],rooms:[{id:'room',poly:[[0,0],[10000,0],[10000,10000],[0,10000]]}],beams:[beam],ceilingHeight:4000};
 const issues=plan=>P.spaceCheck(plan,[f],{scanPassages:false}).filter(v=>v.kind==='beam');
 assert.equal(issues(plan).length,0,'production top contact is clear');
 assert(issues({...plan,beams:[{...beam,bottomHeight:2521}]}).some(v=>!v.pending),'one mm penetration still reported');
 assert(issues({...plan,beams:[{id:'beam',poly:beam.poly}]}).some(v=>v.pending),'unknown beam remains pending');
}
console.log('PASS profiled cabinet resize preserves exact outer faces and rigid board thickness across rotation/mirror, elevation and persistence');
