'use strict';
const assert=require('node:assert/strict'),A=require('../src/core/cabinet-assembly-core.js'),K=require('../src/core/kitchen-core.js'),B=require('../src/core/cabinet-builder-core.js'),S=require('../src/core/snapping.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<.003,a+' != '+b);
let count=0;
for(const rot of [0,37,90,270])for(const flip of [false,true])for(const ownRot of [0,90])for(const side of ['left','right']){
 let n=0,f=A.editableKitchen(K.createLaundryCabinet({id:'grip',cx:5000,cy:4000,rot},()=> 'p'+(++n),'left')[0]);f.flip=flip;
 const part=B.create(),a=K.assemblyConfig(f,true),sign=side==='left'?-1:1,w=ownRot?part.d:part.w;a.cabinet1={w:part.w,d:part.d,h:part.h,rot:ownRot,x:sign*(f.w/2+w/2),y:0,mountHeight:0,cabinet:part.cabinet};K.validate(f);
 const before=structuredClone(f),handle=A.outerCabinetHandles(f).find(h=>h.id==='cabinet1'&&h.edge===side);assert(handle);const fixed=side==='left'?f.w/2:-f.w/2,edgeBefore=A.bounds(f)[side],dx=side==='left'?-1:1,aa=K.world(f,handle.x,handle.z),bb=K.world(f,handle.x+dx,handle.z),u=bb.map((v,i)=>v-aa[i]),start={x:aa[0]+u[0]*13,y:aa[1]+u[1]*13};
 const result=S.resizeAssemblyCabinet(f,'cabinet1',side,{x:start.x+u[0]*80-u[1]*30,y:start.y+u[1]*80+u[0]*30},{start,grid:10,scale:.5}),next=result.furniture;
 near(A.bounds(next)[side],edgeBefore+dx*80);near(A.bounds(next)[side==='left'?'right':'left'],fixed);assert.deepEqual(next.kitchen.modules,f.kitchen.modules);assert.deepEqual(next.kitchen.laundry.assembly.upper,f.kitchen.laundry.assembly.upper);assert.deepEqual(K.outline(next),K.outline(f));near(next.cx,f.cx);near(next.cy,f.cy);near(next.kitchen.baseHeight,f.kitchen.baseHeight);
 const key=ownRot?'d':'w';near(K.assemblyConfig(next).cabinet1[key],a.cabinet1[key]+80);assert.deepEqual(S.resizeAssemblyCabinet(f,'cabinet1',side,start,{start,grid:10}).furniture,f);assert.deepEqual(f,before);assert.deepEqual(P.unpack(P.pack({planId:'test',current:{furniture:[next]},designs:[],catalog:[]})).current.furniture[0],next);
 assert.throws(()=>A.resizeCabinetEdge(f,'cabinet1',side,-1000));assert.throws(()=>A.resizeCabinetEdge({...f,locked:true},'cabinet1',side,80));count++;
}
console.log('PASS '+count+' external added-cabinet grips: exact world drag, fixed opposite side, unchanged native cabinets/worktop, mirror/rotation, zero travel and project restore');
