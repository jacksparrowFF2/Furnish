const assert=require('node:assert/strict'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),Products=require('../src/core/product-rules.js'),Catalog=require('../src/data/catalog.js'),Plans=require('../src/data/plans.js'),W=require('../src/core/work-state.js');
const work=W.create({makeId:()=>Math.random().toString(36),colorFor:()=>'#ddd',materials:Catalog.materials}),plan=Plans[0],current=work.fresh(plan);
assert.equal(D.sceneSettings().wallNumbers,true);assert.equal(D.sceneSettings().clearances,true);
current.scene3d=D.sceneSettings({wallNumbers:false,clearances:false});
const round=P.unpack(P.pack({planId:plan.id,current,designs:[{id:'scene-test',planId:plan.id,name:'显示设置',work:structuredClone(current)}],catalog:[]}));
for(const value of [round.current,round.designs[0].work]){
 assert.equal(value.scene3d.wallNumbers,false);assert.equal(value.scene3d.clearances,false);
 assert.deepEqual(work.restore(work.restore(structuredClone(value),plan),plan).scene3d,current.scene3d);
}
for(const key of ['wallNumbers','clearances'])assert.throws(()=>P.validateWork({...current,scene3d:{...current.scene3d,[key]:'false'}}),/三维/);
const old=structuredClone(current);delete old.scene3d.wallNumbers;delete old.scene3d.clearances;P.validateWork(old);assert.equal(work.restore(old,plan).scene3d.wallNumbers,true);assert.equal(old.scene3d.clearances,true);
for(const item of Catalog.library.find(c=>c.cat==='电器').items)assert.ok(Products.definition(item[0]).clearanceReview,`appliance coverage: ${item[0]}`);
assert.equal(Products.definition('chair')?.clearanceReview,undefined);
assert.equal(Products.definition('waterheater_flat').clearanceReview,'heater');assert.equal(Products.definition('dishwasher_mijia_countertop').clearanceReview,'dishwasher');assert.equal(Products.definition('fridge').clearanceReview,'missing');
const fingerprint=P.checkFingerprint({kind:'test'},plan,current.furniture,800);current.scene3d=D.sceneSettings();assert.equal(P.checkFingerprint({kind:'test'},plan,current.furniture,800),fingerprint,'view switches do not change spatial review inputs');
console.log('PASS scene switch defaults, validation, old restore, repeated restore, named/project roundtrip and appliance coverage');
