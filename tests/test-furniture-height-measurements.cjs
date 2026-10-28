'use strict';
const assert=require('node:assert/strict'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),F=require('../src/core/floor-finish-core.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const {plan,work}=fixture(),id=plan.rooms[0].id;
const next=F.setLayers(work,plan,[id],{rawZ:0,tileThickness:10,baseThickness:50,bathroomBaseThickness:45});
const f={id:'cab',type:'wardrobe',name:'Cabinet',cx:1500,cy:1500,w:800,d:600,h:2400,rot:0,color:'#ddd'};
next.furniture=[f];next.rooms[id].ceilingHeight=2800;
for(const datum of ['survey','finished-floor'])for(const rot of [0,37,90])for(const flip of [false,true]){
 next.furnitureDatum=datum;const p=P.effectivePlan(plan,next),item={...f,rot,flip},m=D.furnitureHeightMeasurements(item,p);
 assert.equal(m.top,datum==='survey'?2340:2400);assert.equal(m.bottom,datum==='survey'?-60:0);assert.equal(m.roofGap,datum==='survey'?400:340);
 for(const h of [2740,2741]){const n=D.furnitureHeightMeasurements({...item,h},p);assert.equal(n.roofGap,2800-h-(datum==='survey'?0:60));}
}
next.furnitureDatum='finished-floor';delete next.floorFinishes.areas[id].baseThickness;
let m=D.furnitureHeightMeasurements(f,P.effectivePlan(plan,next));assert.equal(m.top,null);assert.equal(m.roofGap,null);
next.furnitureDatum='survey';m=D.furnitureHeightMeasurements(f,P.effectivePlan(plan,next));assert.equal(m.top,null);assert.equal(m.roofGap,400);
console.log('PASS finished-floor height display, legacy datum, rotation/mirror, contact/overrun and unknown floor');
