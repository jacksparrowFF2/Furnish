'use strict';
const assert=require('node:assert/strict'),E=require('../src/core/tile-editor-core'),T=require('../src/core/wall-tiling-core'),P=require('../src/core/project-core'),F=require('../src/core/floor-finish-core'),W=require('../src/core/wall-finish-core'),C=require('../src/core/tile-preset-core'),I=require('../src/core/tile-interaction-core'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
function setup(reverse=false,use='kitchen'){const fixtureData=fixture({openingHosts:true});if(reverse){for(const w of fixtureData.draft.walls)[w.a,w.b]=[w.b,w.a];fixtureData.plan=require('../src/core/floorplan-core').build(fixtureData.draft);}const {plan,work:base}=fixtureData;for(const r of Object.values(base.rooms))Object.assign(r,{use,mat:'tile800'});let work=F.setLayers(base,plan,plan.rooms.map(r=>r.id),{rawZ:0,tileThickness:10,baseThickness:40});work=T.setEnabled(work,P.effectivePlan(plan,work),plan.rooms.map(r=>r.id),true);for(const f of T.faces(P.effectivePlan(plan,work),work))work=W.edit(work,f,{tileThickness:10,bondThickness:20});return {plan,work};}
for(const use of ['kitchen','balcony','bathroom'])for(const reverse of [false,true]){
 let {plan,work}=setup(reverse,use);const effective=w=>P.effectivePlan(plan,w),group=E.groups(work,effective(work)).find(g=>g.members?.some(t=>t.face.wallId==='east'));
 const walls=E.groups(work,effective(work)).filter(g=>g.kind==='wall');assert.deepEqual(walls.map(g=>g.number),walls.map((_,i)=>i+1),'one contiguous logical wall numbering per room');
 assert(group&&group.members.length===3,'window head/sill and side segments form one wall');
 assert(group.members.every(t=>t.face.wallId.startsWith('east')),'perpendicular corners do not merge');
 const fresh=structuredClone(work);delete fresh.wallTiling;const freshGroup=E.groups(fresh,effective(fresh)).find(g=>g.key===group.key),initialized=E.edit(fresh,effective(fresh),[freshGroup],{enabled:true});assert(E.groupValues(initialized,effective(initialized),freshGroup).every(v=>v.offset===0),'new wall segments start with one shared grid');
 const before=structuredClone(work),values=E.groupValues(work,effective(work),group);
 assert.equal(values.length,3);assert.deepEqual(work,before,'viewing never rewrites old offsets');
 let next=E.editLinked(work,effective(work),[group],{width:600,height:300,angle:90,offset:127,startHeight:-48,followFloor:false});
 const equal=E.groupValues(next,effective(next),group);assert(equal.every(v=>v.offset===127&&v.startHeight===-48&&v.angle===90));
 const elevations=E.members(group).map(t=>T.elevation(effective(next),next,T.faces(effective(next),next).find(f=>T.same(f,t.face))));
 const origins=elevations.map(e=>e.zero+e.dir*e.layout.offset);assert(origins.every(v=>Math.abs(v-origins[0])<1e-6),'production segments share one world origin');
 const full=E.elevation(next,effective(next),group);assert(full.sections.some(r=>r[0]>0&&r[2]<full.width),'window sill/head preserved');assert.equal(full.patterns.length,3);
 const context=I.context(effective(next),next,group),patch=I.patch(context,[11,7],true);next=E.editLinked(next,effective(next),[group],patch);assert(E.groupValues(next,effective(next),group).every(v=>v.offset===138&&v.startHeight===-41),'whole-wall gestures translate all segments');
 assert.deepEqual(next.wallFinishes,work.wallFinishes);assert.deepEqual(next.furniture,work.furniture);
 const outside=T.faces(effective(work),work).filter(f=>!E.contains(group,f));for(const face of outside)assert.deepEqual(T.record(next,face),T.record(work,face));
 const preset=C.capture(work,effective(work),group.roomId,'wall','coplanar','整墙关联');work=C.apply(work,effective(work),preset,group.members.map(t=>({roomId:t.roomId,face:t.face,variantId:preset.source.assignments.find(a=>T.same(a.face||a,t.face))?.variantId||preset.variants[0].id})),['gap'],{link:true}).work;
 const linked=E.editLinked(work,effective(work),[group],{startHeight:25});assert.deepEqual(linked.tilePresets,work.tilePresets,'unmodified preset groups remain linked');
 assert.throws(()=>E.editLinked(work,effective(work),[group],{offset:1},'preset'),/局部起点/);
 const round=P.unpack(P.pack({planId:plan.id,current:next,designs:[],catalog:[]})).current;assert.deepEqual(round,next);assert.deepEqual(E.groups(round,effective(round)),E.groups(next,effective(next)));
 const stale=structuredClone(group);stale.members.pop();assert.throws(()=>E.edit(next,effective(next),[stale],{gap:3}),/整墙已变化/);
 // Different finished planes are separate surfaces even when survey walls align.
 let stepped=W.edit(next,group.members[0].face,{tileThickness:12,bondThickness:20});assert(!E.groups(stepped,effective(stepped)).some(g=>g.members?.length===3&&E.contains(g,group.members[0].face)));
}
console.log('PASS coplanar wall grouping, real window opening, reverse direction, world-aligned offsets and gestures, legacy records, links, round trip and finish steps');
module.exports={setup};
