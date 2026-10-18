'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),T=require('../src/core/wall-tiling-core.js'),P=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),W=require('../src/core/work-state.js'),Cache=require('../src/io/workspace-cache.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),base=fixture({partition:true}),plan=base.plan,work=base.work,ids=plan.rooms.map(r=>r.id),ep=w=>P.effectivePlan(plan,w);
work.floorFinishes={version:1,areas:{}};
for(const [i,id] of ids.entries()){work.rooms[id]={...work.rooms[id],use:i?'bathroom':'kitchen',mat:'tile800'};work.floorFinishes.areas[id]={mode:'layers',rawZ:0,tileThickness:10,baseThickness:i?45:50,layout:{width:800,height:400,gap:2,angle:0,origin:[-125.5,312.25]}};}
const manual=T.setEnabled(work,ep(work),ids,true),linked=T.alignFloor(manual,ep(manual),ids),seed=copy(linked.wallTiling);
assert(linked.wallTiling.surfaces.every(s=>s.followFloor));assert(!T.requiresV7(manual));assert(T.requiresV7(linked));
for(const angle of [0,90,180,270])for(const origin of [[0,0],[-145.25,871.3]]){
 const next=copy(linked);for(const a of Object.values(next.floorFinishes.areas))a.layout={width:600,height:300,gap:3,angle,origin};
 const derived=ep(next);for(const e of derived.wallTiling.surfaces){const f=T.faces(derived,next).find(f=>T.same(f,e.face)),expected=T.floorAlignment(derived,next,f);assert.deepEqual(e.layout,expected);assert.equal(e.layout.height,300);assert.equal(e.originZ,e.face.roomId===ids[0]?60:55);assert(T.cells(e).length);}
 assert.deepEqual(next.wallTiling,seed,'floor edits never rewrite stored wall seeds');
 assert.notDeepEqual(derived.wallTiling.surfaces.map(e=>e.layout),ep(linked).wallTiling.surfaces.map(e=>e.layout),'same elevation layout changes invalidate cache');
 const old=copy(manual);old.floorFinishes=next.floorFinishes;assert(old.wallTiling.surfaces.every((s,i)=>JSON.stringify(ep(old).wallTiling.surfaces[i].layout)===JSON.stringify(s.layout)),'legacy remains manual');
}
for(const bad of ['angle','disabled','unknown']){
 const next=copy(linked),a=next.floorFinishes.areas[ids[0]];if(bad==='angle')a.layout.angle=37;if(bad==='disabled')a.enabled=false;if(bad==='unknown')delete a.tileThickness;
 const pending=ep(next).wallTiling.surfaces.filter(e=>e.face.roomId===ids[0]);assert(pending.every(e=>e.alignmentPending&&e.originZ===undefined&&!T.cells(e).length));
 next.floorFinishes=copy(linked.floorFinishes);assert(ep(next).wallTiling.surfaces.every(e=>!e.alignmentPending&&Number.isFinite(e.originZ)),'link resumes without reapply');
}
const changed=copy(linked);changed.floorFinishes.areas[ids[0]].layout.width=640;const face=T.faces(ep(changed),changed).find(f=>f.roomId===ids[0]&&f.axis===0),effective=T.elevation(ep(changed),changed,face).layout,detached=T.edit(changed,ep(changed),face,{followFloor:false,layout:effective});assert(!T.record(detached,face).followFloor);detached.floorFinishes.areas[ids[0]].layout.width=900;assert.deepEqual(T.elevation(ep(detached),detached,face).layout,effective,'detach freezes effective layout');
assert.throws(()=>T.edit(linked,ep(linked),face,{followFloor:'yes'}));
const disabled=T.setEnabled(linked,ep(linked),ids,false);assert(disabled.wallTiling.surfaces.every(s=>s.followFloor));assert.deepEqual(T.setEnabled(disabled,ep(disabled),ids,true).wallTiling,seed);
const restore=W.create({makeId:()=> 'restored',colorFor:()=> '#ddd',materials:require('../src/data/catalog.js').materials}).restore;
let current=linked;for(let i=0;i<4;i++){const packed=P.pack({planId:plan.id,current,designs:[{name:'联动',work:linked}],catalog:[]});assert.equal(packed.version,9);current=restore(P.unpack(packed).current,plan);assert.deepEqual(current.wallTiling,seed);assert.deepEqual(copy(ep(current).wallTiling),copy(ep(linked).wallTiling));}
assert.equal(P.pack({current:manual,designs:[{work:linked}]}).version,9);assert.deepEqual(P.copyProject({planId:plan.id,current:linked,designs:[],catalog:[]},'custom_link_copy').current.wallTiling,seed);
const workspace={v:7,planId:plan.id,work:{[plan.id]:linked},designs:[],customPlans:[plan.customDraft],custom:[]};assert.equal(JSON.parse(R.text(workspace)).version,9);assert.deepEqual(R.parse(JSON.parse(R.text(workspace))),R.portable(workspace));
assert.equal(Cache.load({key:'huxing-design-v7',read:k=>k==='huxing-design-v6'?JSON.stringify({...workspace,v:6}):null,firstPlan:plan,restore}).v,6);assert.equal(Cache.load({key:'huxing-design-v7',read:k=>k==='huxing-design-v7'?JSON.stringify(workspace):null,firstPlan:plan,restore}).v,7);
assert.deepEqual(linked.furniture,work.furniture);assert.deepEqual(linked.floorFinishes,work.floorFinishes);
(async()=>{const THREE=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),M=require('../src/render/wall-tiling-model.js'),before=M.build(THREE,ep(linked)),after=M.build(THREE,ep(changed));assert.notDeepEqual(before.children.map(m=>[...m.geometry.attributes.uv.array]),after.children.map(m=>[...m.geometry.attributes.uv.array]),'production UVs update');console.log('PASS automatic floor-wall layout dimensions/directions/origins, derived cache and production UVs, pause/resume, legacy/manual detach, disable/re-enable, v7 current/named/copy/restore/cache and drift-free project roundtrips');})().catch(e=>{console.error(e);process.exitCode=1;});
