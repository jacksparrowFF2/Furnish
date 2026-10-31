'use strict';
const assert=require('node:assert/strict'),D=require('../src/core/drawing-core.js');
const base={w:800,d:600,cx:100,cy:200,rot:0},near=(a,b)=>a.forEach((v,i)=>assert(Math.abs(v-b[i])<1e-8,`${a} != ${b}`));
for(const flip of [false,true])for(const rot of [0,30,90,180,270])for(const rotation of [0,90,180,270])for(const scale of [.02,.1,1]){
 const f={...base,flip,rot},before=JSON.stringify(f),marks=D.furnitureDirections(f,{scale,rotation});assert.equal(marks.length,4);
 for(const m of marks){
  const expected={front:[0,300],back:[0,-300],left:[flip?400:-400,0],right:[flip?-400:400,0]}[m.key],edge=D.rotate(expected,rot);
  near(m.edge,[base.cx+edge[0],base.cy+edge[1]]);
  const delta=D.rotate([m.at[0]-m.edge[0],m.at[1]-m.edge[1]],rotation),half=['front','back'].includes(m.key)?300:400;near(delta.map(v=>v*scale),m.normal.map(v=>-v*Math.min(22,half*.55*scale)));
  near(D.rotate(m.normal,-rotation-rot),{front:[0,1],back:[0,-1],left:[flip?1:-1,0],right:[flip?-1:1,0]}[m.key]);
 }assert.equal(JSON.stringify(f),before);
}
assert.deepEqual(D.furnitureDirections({...base,w:0}),[]);assert.deepEqual(D.furnitureDirections(base,{scale:0}),[]);
console.log('PASS product directions: front/back, mirror, arbitrary furniture rotation, all drawing rotations, fixed screen spacing, no mutations');
