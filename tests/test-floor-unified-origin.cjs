const assert=require('node:assert/strict'),F=require('../src/core/floor-finish-core.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),{plan,work}=fixture({partition:true}),ids=plan.rooms.map(r=>r.id),[a,b]=ids;
work.rooms[a].mat='tile800';work.rooms[b].mat='antislip';work.furniture[0].rot=37;work.furniture[0].flip=true;
const original=copy(work),basis={origin:[-701.25,430.5]},newSettings=F.setLayoutBasis(work,plan,ids,basis);
assert.deepEqual(work,original);assert.deepEqual(newSettings.furniture,work.furniture);assert.deepEqual(newSettings.architecture,work.architecture);
for(const id of ids){const s=newSettings.floorFinishes.areas[id];assert.deepEqual(s.layout.origin,basis.origin);assert.equal(s.enabled,false);assert.equal(s.tileThickness,undefined);assert.equal(s.baseThickness,undefined);}
assert.equal(newSettings.floorFinishes.areas[a].layout.width,800);assert.equal(newSettings.floorFinishes.areas[b].layout.width,300);assert.equal(newSettings.floorFinishes.areas[b].drop,undefined);
assert.equal(Object.keys(P.effectivePlan(plan,newSettings).floorFinish.areas).length,0,'saving origins never enables old regions');
assert.deepEqual(F.setEnabled(newSettings,plan,ids,true).floorFinishes.areas[b].layout.origin,basis.origin,'future enable retains prepared origin');
const active=F.setEnabled(newSettings,plan,ids,true);active.floorFinishes.areas[a]={rawZ:0,tileThickness:10,baseThickness:40,mode:'layers',layout:{width:600,height:300,gap:3,angle:37,origin:[11,22]}};
active.floorFinishes.areas[b]={rawZ:0,tileThickness:10,mode:'reference',reference:a,drop:5,enabled:false,layout:{width:300,height:300,gap:2,angle:90,origin:[33,44]}};
const before=copy(active),next=F.setLayoutBasis(active,plan,ids,basis);
for(const id of ids){const expected=copy(before.floorFinishes.areas[id]);expected.layout.origin=basis.origin;assert.deepEqual(next.floorFinishes.areas[id],expected,'origin-only batch preserves every other field');}
assert.deepEqual(active,before);assert.equal(P.effectivePlan(plan,next).floorFinish.areas[a].finishedZ,50);
const enabledBath=F.setEnabled(next,plan,[b],true);assert.equal(P.effectivePlan(plan,enabledBath).floorFinish.areas[b].finishedZ,45);
const direction=F.setLayoutBasis(next,plan,ids,{...basis,angle:-37});for(const id of ids)assert.equal(direction.floorFinishes.areas[id].layout.angle,-37);
for(const angle of [-360,360])assert.doesNotThrow(()=>F.setLayoutBasis(next,plan,ids,{...basis,angle}));
const one=F.setLayoutBasis(direction,plan,[a],{origin:[100.5,200.5]});assert.deepEqual(one.floorFinishes.areas[b],direction.floorFinishes.areas[b],'later independent edit does not propagate');
const mixed=copy(work);mixed.rooms[b].mat='wood';assert.throws(()=>F.setLayoutBasis(mixed,plan,ids,basis),/瓷砖区域/);assert.deepEqual(mixed.floorFinishes,undefined,'invalid target fails atomically');
assert.throws(()=>F.setLayoutBasis(work,{...plan,rooms:plan.rooms.map(r=>r.id===a?{...r,counted:false}:r)},[a],basis),/瓷砖区域/);
for(const bad of [{origin:[NaN,0]},{origin:[1e6+.01,0]},{origin:[0]},{origin:[0,0],angle:360.01},{origin:[0,0],angle:null},{origin:[0,0],extra:true}])assert.throws(()=>F.setLayoutBasis(work,plan,ids,bad));
assert.throws(()=>F.setLayoutBasis(work,plan,[],basis));assert.throws(()=>F.setLayoutBasis(work,plan,['missing'],basis));
assert.deepEqual(F.setLayoutBasis(next,plan,[a,a,b],basis),next);
let restored=copy(direction);const restore=W.create({makeId:()=> 'restored',colorFor:()=> '#ddd',materials:{tile800:{},antislip:{},wood:{}}}).restore;
for(let i=0;i<4;i++){const payload={planId:plan.id,current:restored,designs:[{name:'统一起点',work:restored}],catalog:[]},unpacked=P.unpack(P.pack(payload));assert.deepEqual(unpacked.designs[0].work.floorFinishes,direction.floorFinishes);assert.deepEqual(P.copyProject(payload,'custom_unified').current.floorFinishes,direction.floorFinishes);restored=restore(unpacked.current,plan);assert.deepEqual(restored.floorFinishes,direction.floorFinishes);}
const issue={kind:'floorheight',id:work.furniture[0].id};assert.equal(P.checkFingerprint(issue,P.effectivePlan(plan,before),before.furniture,800),P.checkFingerprint(issue,P.effectivePlan(plan,next),next.furniture,800),'pure origin batch preserves spatial confirmation inputs');
console.log('PASS unified floor origin, optional direction, disabled/new/untiled targets, atomic validation, independent edits, unchanged layers/furniture, repeated project recovery and spatial confirmations');
