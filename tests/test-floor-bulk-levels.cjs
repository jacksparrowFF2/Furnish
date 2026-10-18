'use strict';
const assert=require('node:assert/strict'),F=require('../src/core/floor-finish-core.js'),P=require('../src/core/project-core.js'),T=require('../src/core/wall-tiling-core.js'),G=require('../src/core/finish-guide-core.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const {plan,work}=fixture({partition:true}),[a,b]=plan.rooms.map(r=>r.id),copy=v=>JSON.parse(JSON.stringify(v));
work.rooms[a].use='kitchen';work.rooms[b].use='bathroom';work.rooms[a].mat='wood';
const layout={width:600,height:300,gap:2,angle:90,origin:[12,34]};
work.floorFinishes={version:1,areas:{[a]:{enabled:false,mode:'level',rawZ:1,targetZ:99,layout},[b]:{mode:'reference',reference:a,drop:5},orphan:{mode:'layers',rawZ:3}}};
const original=copy(work),values={rawZ:0,tileThickness:10,baseThickness:50,bathroomBaseThickness:45},next=F.setLayers(work,plan,[a,b,a],values),ep=P.effectivePlan(plan,next);
assert.deepEqual(work,original);assert.equal(ep.floorFinish.areas[a].finishedZ,60);assert.equal(ep.floorFinish.areas[b].finishedZ,55);assert.deepEqual(next.floorFinishes.areas[a].layout,layout);
assert.equal(next.floorFinishes.areas[a].enabled,undefined);for(const key of ['reference','drop','targetZ'])assert(!Object.hasOwn(next.floorFinishes.areas[b],key)&&!Object.hasOwn(next.floorFinishes.areas[a],key));
for(const key of ['furniture','architecture','rooms'])assert.deepEqual(next[key],work[key]);assert.deepEqual(next.floorFinishes.areas.orphan,work.floorFinishes.areas.orphan);
const partial=F.setLayers(work,plan,[a],values);assert.deepEqual(partial.floorFinishes.areas[b],work.floorFinishes.areas[b]);
assert.equal(P.effectivePlan(plan,F.setLayers(next,plan,[a,b],{rawZ:-10,tileThickness:0,baseThickness:0})).floorFinish.areas[b].finishedZ,-10);
for(const bad of [{...values,tileThickness:NaN},{...values,bathroomBaseThickness:-1},{...values,rawZ:20001},{...values,baseThickness:1001}])assert.throws(()=>F.setLayers(work,plan,[a],bad));
assert.throws(()=>F.setLayers(work,plan,[],values));assert.throws(()=>F.setLayers(work,plan,[a,'missing'],values));assert.deepEqual(work,original);
const tiled=T.setEnabled(next,ep,[a,b],true),derived=P.effectivePlan(plan,tiled);assert(derived.wallTiling.surfaces.every(e=>e.originZ===(e.face.roomId===a?60:55)));assert.deepEqual(G.inspect(derived,tiled).ready,[true,true,true]);
const custom=T.setHeights(tiled,derived,[b],{reference:'survey',startHeight:72}),changed=F.setLayers(custom,derived,[a,b],{...values,baseThickness:60});assert.deepEqual(changed.wallTiling,custom.wallTiling);assert(P.effectivePlan(plan,changed).wallTiling.surfaces.filter(e=>e.face.roomId===b).every(e=>e.originZ===72));
let restored=tiled;for(let i=0;i<4;i++){restored=P.unpack(P.pack({planId:plan.id,current:restored,designs:[{name:'批量标高',work:restored}],catalog:[]})).current;assert.deepEqual(restored.floorFinishes,tiled.floorFinishes);assert.deepEqual(restored.wallTiling,tiled.wallTiling);assert(P.effectivePlan(plan,restored).wallTiling.surfaces.some(e=>e.originZ===55));}
assert.deepEqual(P.copyProject({planId:plan.id,current:tiled,designs:[],catalog:[]},'custom_bulk_copy').current.floorFinishes,tiled.floorFinishes);
console.log('PASS bulk floor layers, bathroom exception, non-tile rooms, preserved layouts/unselected/orphans, atomic validation, own-floor wall starts, custom starts and repeated project recovery');
