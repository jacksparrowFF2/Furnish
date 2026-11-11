'use strict';
const assert=require('node:assert/strict'),A=require('../src/core/cabinet-assembly-core.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js'),Z=require('../src/core/zone-geometry.js'),M=require('../src/core/cabinet-motion.js'),Rules=require('../src/core/product-rules.js');
const near=(a,b)=>assert(Math.abs(a-b)<.002,a+' != '+b);
let count=0;
for(const rot of [0,37,90,270])for(const flip of [false,true])for(const side of ['left','right']){
 let n=0,f=A.editableKitchen(K.createLaundryCabinet({id:'facing',cx:4000,cy:3000,rot},()=> 'part'+(++n),'left')[0]);f.flip=flip;const before=structuredClone(f),next=A.extendWorktopFacing(f,{side,width:300,depth:820}),facing=K.outline(next).map(([x,z])=>[x*(flip?-1:1),z]),min=Math.min(...facing.map(p=>p[0])),max=Math.max(...facing.map(p=>p[0]));
 near(min,side==='left'?-f.w/2-300:-f.w/2);near(max,side==='right'?f.w/2+300:f.w/2);assert(Z.area(K.topGeometry(next).polys)>Z.area(K.topGeometry(f).polys));assert(M.solidParts(next,{}).some(p=>p.boardKey.startsWith('台面:')));near(Rules.dimensions(next).w,A.bounds(next).w);assert.deepEqual(next.kitchen.modules,f.kitchen.modules);assert.deepEqual(f,before);
 assert.deepEqual(P.unpack(P.pack({planId:'test',current:{furniture:[next]},designs:[],catalog:[]})).current.furniture[0],next);assert.deepEqual(A.setWorktop(next,null),f);
 const canonical=A.extendWorktop(f,{side:'left',width:300,depth:820});near(Math.min(...K.outline(canonical).map(p=>p[0])),-f.w/2-300);
 count++;
}
console.log('PASS '+count+' facing-left/right worktops: mirrored/rotated, production slab, whole envelope, independent modules, legacy local API and project restoration');
