'use strict';
const assert=require('node:assert/strict'),B=require('../src/core/bay-window-core.js'),D=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),W=require('../src/core/work-state.js'),plans=require('../src/data/plans.js'),catalog=require('../src/data/catalog.js');
const clone=structuredClone,base=plans[0],initial=clone(base),bays=B.list(base);
assert.equal(bays.length,2);assert.ok(bays.every(b=>b.windows.length===3));
for(const b of bays){assert.equal(B.selected(base,{kind:'room',id:b.platform.id}).id,b.id);for(const w of b.windows)assert.equal(B.selected(base,{kind:'win',id:w.index}).id,b.id);}
const work={furniture:[],rooms:{},open:{}};B.setHeights(work,base,bays[0].id,600,2500);
const effective=P.effectivePlan(base,work),updated=B.list(effective)[0];assert.equal(updated.platform.height,.6);assert.ok(updated.windows.every(w=>w.window.sill===.6&&w.window.head===2.5));assert.deepEqual(base,initial);
for(const [s,h] of [[0,100],[2400,2800]])assert.doesNotThrow(()=>B.setHeights(clone(work),base,bays[0].id,s,h));
for(const [s,h] of [[-1,2400],[2401,2800],[450,549],[450,2801],[NaN,2400]])assert.throws(()=>B.setHeights(clone(work),base,bays[0].id,s,h));
assert.equal(P.quantities(base).net,P.quantities(effective).net);
const {draft}=D.fromPlan(effective,'custom_bay_upgrade'),legacy=clone(draft);
for(const o of legacy.openings)if(o.bayId){o.bayGroup=o.bayId;delete o.bayId;}
for(const r of legacy.roomLayout.rooms)delete r.bayId;
const original=clone(legacy),upgrade=D.upgrade(legacy);assert.deepEqual(legacy,original);assert.deepEqual(D.upgrade(upgrade),upgrade);
const before=D.build(legacy),after=D.build(upgrade);assert.deepEqual(before,after);assert.deepEqual(P.quantities(before),P.quantities(after));assert.equal(B.list(before).length,2);
const floorLocked={...clone(work),objectLayers:{version:1,layers:[{id:'locked',name:'锁定台面',visible:true,locked:true}],assignments:{['floor:'+bays[0].platform.id]:'locked'}}};assert.throws(()=>B.setHeights(floorLocked,base,bays[0].id,600,2500),/锁定/);
assert.ok(upgrade.openings.filter(o=>o.bayId).length===6);assert.ok(!JSON.stringify(upgrade).includes('bayGroup'));
const arch={draft:legacy,baseline:clone(legacy),originalRevisions:[clone(legacy)],phase:'design'},legacyWork={plan:legacy.id,furniture:[],architecture:arch,rooms:Object.fromEntries(before.rooms.map(r=>[r.id,{name:r.name,mat:r.mat,use:r.counted===false?'bay':'unassigned'}])),open:{}};
const payload={planId:legacy.id,current:legacyWork,designs:[{planId:legacy.id,name:'旧方案',work:clone(legacyWork)}],catalog:[]},packed=P.pack(payload),checked=P.unpack(packed);
assert.ok(!JSON.stringify(P.unpack(legacyWork)).includes('bayGroup'));assert.ok(!JSON.stringify(packed).includes('bayGroup'));assert.ok(!JSON.stringify(checked).includes('bayGroup'));assert.deepEqual(P.unpack(P.pack(checked)),checked);assert.equal(P.pack(checked).version,16);assert.ok(JSON.stringify(payload).includes('bayGroup'));
assert.deepEqual(P.effectivePlan(before,checked.current).wins,P.effectivePlan(after,checked.designs[0].work).wins);
const factory=W.create({makeId:()=> 'x',colorFor:()=> '#eeeeee',materials:catalog.materials});const restored=factory.restore(clone(legacyWork),before);assert.ok(!JSON.stringify(restored).includes('bayGroup'));assert.deepEqual(factory.restore(clone(restored),before),restored);
const ws={v:15,planId:legacy.id,work:{[legacy.id]:legacyWork},designs:payload.designs,customPlans:[legacy],custom:[]},normalized=R.validate(ws);
assert.equal(normalized.v,16);assert.ok(!JSON.stringify(normalized).includes('bayGroup'));assert.deepEqual(R.parse(JSON.parse(R.text(normalized))),normalized);assert.deepEqual(R.validate(normalized),normalized);
const Cache=require('../src/io/workspace-cache.js'),readCache=key=>key==='huxing-design-v15'?JSON.stringify(ws):null;assert.equal(Cache.load({read:readCache,key:'huxing-design-v16',firstPlan:base,restore:factory.restore}).v,15);assert.equal(Cache.load({read:key=>key==='huxing-design-v16'?JSON.stringify(normalized):readCache(key),key:'huxing-design-v16',firstPlan:base,restore:factory.restore}).v,16);
const copy=P.copyProject(checked,'custom_bay_copy');assert.equal(B.list(P.previewPlan(copy,plans)).length,2);
const conflict=clone(legacy);conflict.openings.find(o=>o.bayGroup).bayId='different';assert.throws(()=>D.build(conflict),/Conflicting/);
// Reading must not make a normalized legacy file look already written.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),root=fs.mkdtempSync(path.join(os.tmpdir(),'furnish-bay-upgrade-')),api=require('../scripts/repository-server.cjs').create(root),projects=path.join(root,'projects');
fs.mkdirSync(projects);const file=path.join(projects,'workspace.furnish.json'),oldText=R.text(ws);fs.writeFileSync(file,oldText);
try{
 const loaded=api.read();assert.equal(loaded.workspace.v,16);const written=api.write(loaded.workspace,loaded.revision);assert.notEqual(written.revision,loaded.revision);assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).workspace.v,16);
 const backups=api.recoveries();assert.equal(backups.length,1);assert.deepEqual(backups[0].workspace,ws);assert.equal(api.read().revision,written.revision);api.write(api.read().workspace,written.revision);assert.equal(api.recoveries().length,1);
}finally{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));assert.ok(path.basename(root).startsWith('furnish-bay-upgrade-'));fs.rmSync(root,{recursive:true,force:true});}
console.log('PASS bay assembly parts, dimensions, boundaries, exact legacy geometry, current/design/baseline/revision/cache normalization, idempotence, v16 and copy roundtrip');
