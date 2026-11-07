'use strict';
const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),J=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const host={...C.preset('base'),id:'host',type:'cabinet',cx:1000,cy:2000,rot,flip,mountHeight:100},f={id:'box',type:'block',cx:1000,cy:2000,w:200,d:150,h:100,rot,flip},list=[host,f],before=JSON.stringify(list),targets=S.elevationTargets(f,{plan:{},furniture:list});
 assert(targets.some(t=>t.name==='层板'));assert(targets.some(t=>t.name==='顶板'));assert(!targets.some(t=>t.name==='踢脚底座'),'occluded support is excluded');
 const t=targets.find(t=>t.name==='层板');
 for(const delta of [-12,0,12])near(S.elevation(t.bottom+delta,targets,12).bottom,t.bottom);
 assert.equal(S.elevation(t.bottom+12.01,targets,12).hit,null);
 const moved=P.editBottomHeight(f,t.bottom);assert(!G.volumeOverlap(moved,host,{},list));
 const upper={...moved,id:'upper',mountHeight:t.bottom+100},group=S.elevationTargets([moved,upper],{plan:{},furniture:[host,moved,upper]});assert(group.some(v=>Math.abs(v.bottom-t.bottom)<1e-5),'stack can snap to a shelf without changing relative height');
 const restored=J.unpack(J.pack({planId:'elevation',current:{furniture:[host,moved]},designs:[],catalog:[]}));near(P.bottomHeight(restored.current.furniture[1]),t.bottom);near(S.elevationTargets(restored.current.furniture[1],{plan:{},furniture:restored.current.furniture}).find(v=>v.name==='层板').bottom,t.bottom);
 assert.equal(JSON.stringify(list),before);
 assert.equal(S.elevationTargets({...f,cx:9000},{plan:{},furniture:list}).length,0);
 assert.equal(S.elevationTargets(f,{plan:{furnitureDatum:'finished-floor'},furniture:list}).length,0,'unknown floor must not infer a world level');
 assert.equal(S.elevationTargets(f,{plan:{},furniture:[f,{id:'envelope',type:'block',cx:1000,cy:2000,w:800,d:600,h:850}]}).length,0,'bounding box is not a shelf');
}
console.log('PASS actual shelf snapping, threshold, rotations/mirrors, occlusion, separation, unknown datum and project roundtrip');
