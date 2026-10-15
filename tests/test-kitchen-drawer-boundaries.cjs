const assert=require('node:assert/strict'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js');
const f=K.configure({id:'k',type:'counter',cx:4000,cy:4000,rot:37,flip:true,color:'#eeeeee'},{version:1,shape:'U',corner:'right',depth:600,counterDepth:630,baseHeight:830,thickness:20,modules:[{run:0,width:800,role:'drawer'},{run:0,width:500,role:'door'},{run:1,width:700,role:'door'},{run:2,width:738,role:'sink'}],endExtensions:[{run:0,length:350,depth:250,cabinetDepth:200}]}),heights=v=>K.drawerHeights(v,v.kitchen.modules[0]);
const before=structuredClone(f),custom=K.setDrawerHeight(K.setDrawerHeight(K.setDrawerCount(f,0,4),0,0,120),0,1,150);
assert.deepEqual(K.resizeDrawerBoundary(f,0,0,0),f,'click/zero drag does not migrate legacy drawers');
assert.equal(K.resizeDrawerBoundary(f,0,0,0).kitchen.modules[0].drawerHeights,undefined);
for(let boundary=0;boundary<3;boundary++)for(const delta of [-20,20]){
 const v=K.resizeDrawerBoundary(custom,0,boundary,delta),expected=heights(custom).slice();expected[boundary]+=delta;expected[boundary+1]-=delta;assert.deepEqual(heights(v),expected);
 assert.equal(heights(v).reduce((a,b)=>a+b),730);const only=structuredClone(v);only.kitchen.modules[0].drawerHeights=custom.kitchen.modules[0].drawerHeights;assert.deepEqual(only,custom,'only the adjacent two heights change');
 const restored=P.unpack(P.pack({planId:'p',current:{furniture:[v]},designs:[],catalog:[]})).current.furniture[0];assert.deepEqual(restored,v);
 for(const row of K.elevationRuns(v))for(const i of row.indices)if(i===0){const local=row.indices.indexOf(i);assert.deepEqual(K.drawerHeights(row.furniture,row.furniture.kitchen.modules[local]),expected,'elevation uses original drawer heights');}
}
assert.deepEqual(heights(K.resizeDrawerBoundary(custom,0,0,-24)),[96,174,182.5,277.5]);
assert.throws(()=>K.resizeDrawerBoundary(custom,0,0,-24.01),/96/);
assert.throws(()=>K.resizeDrawerBoundary(custom,0,0,54.01),/96/);
for(const boundary of [-1,3,NaN,1.5])assert.throws(()=>K.resizeDrawerBoundary(custom,0,boundary,1));
for(const delta of [NaN,Infinity,-Infinity])assert.throws(()=>K.resizeDrawerBoundary(custom,0,0,delta));
assert.throws(()=>K.resizeDrawerBoundary(custom,1,0,1));assert.throws(()=>K.resizeDrawerBoundary({...custom,locked:true},0,0,1),/解锁/);
assert.throws(()=>K.resizeDrawerBoundary(K.setDrawerCount(f,0,1),0,0,1));assert.deepEqual(f,before);
console.log('PASS drawer boundary adjacent-only resizing, fixed total and other cabinets, exact minimum, no-op legacy, transforms/elevations and project restoration');
