'use strict';
const assert=require('node:assert/strict'),A=require('../src/core/cabinet-assembly-core.js'),B=require('../src/core/cabinet-builder-core.js'),K=require('../src/core/kitchen-core.js'),Z=require('../src/core/zone-geometry.js'),P=require('../src/core/project-core.js');
for(const rot of [0,37,90,270])for(const flip of [false,true]){
 let n=0,f=A.editableKitchen(K.createLaundryCabinet({id:'generate',cx:4000,cy:3000,rot},()=> 'p'+(++n),'left')[0]);f.flip=flip;const a=K.assemblyConfig(f,true),part=B.update(B.create(),{boxId:'box1'},{w:260,d:280,h:f.kitchen.baseHeight});a.cabinet1={w:part.w,d:part.d,h:part.h,x:f.w/2+130,y:0,mountHeight:0,cabinet:part.cabinet};K.validate(f);
 const before=structuredClone(f),generated=A.generateWorktop(f);assert.deepEqual(A.generateWorktop(generated),generated);assert.equal(Math.max(...K.outline(generated).map(p=>p[0])),f.w/2+260);assert.deepEqual(f,before);assert.deepEqual(generated.kitchen.modules,f.kitchen.modules);
 const extended=A.extendWorktopFacing(generated,{side:'left',width:500,depth:820});assert.deepEqual(A.generateWorktop(extended),generated,'rebuild discards manual additions rather than accumulating');
 const moved=A.edit(f,'cabinet1',{w:350,x:f.w/2+175});assert.equal(Math.max(...K.outline(A.generateWorktop(moved)).map(p=>p[0])),f.w/2+350);
 const floating=A.edit(f,'cabinet1',{mountHeight:100});assert.deepEqual(K.outline(A.generateWorktop(floating)),K.outline(A.generateWorktop({...f,kitchen:{...f.kitchen,laundry:{...f.kitchen.laundry,assembly:{...f.kitchen.laundry.assembly,cabinet1:{...a.cabinet1,enabled:false}}}}})));
 assert.throws(()=>A.generateWorktop(A.edit(f,'cabinet1',{x:f.w/2+500})),/不连续/);assert.deepEqual(P.unpack(P.pack({planId:'test',current:{furniture:[generated]},designs:[],catalog:[]})).current.furniture[0],generated);
}
console.log('PASS 8 layout-driven worktops: connected carcass union, exact support height, repeated generation, size changes, manual-reset, disconnected rejection and project restoration');
