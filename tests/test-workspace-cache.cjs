const assert = require('node:assert/strict');
const {load} = require('../src/io/workspace-cache.js');
const {create} = require('../src/core/work-state.js');
const plan = require('../src/data/plans.js')[0];
const {materials} = require('../src/data/catalog.js');
let sequence=0;
const {restore}=create({makeId:()=>`migration${++sequence}`,colorFor:()=> '#abc',materials});
const readFrom=values=>key=>values[key]??null;
const fallback={v:2,planId:plan.id,work:{},designs:[]};
assert.deepEqual(load({read:()=>null,firstPlan:plan,restore}),fallback);
assert.deepEqual(load({read:()=>{throw Error('restricted');},firstPlan:plan,restore}),fallback);
const current={...fallback,updatedAt:7,custom:[{name:'saved'}]},keys=[];
assert.deepEqual(load({read:key=>{keys.push(key);return JSON.stringify(current);},firstPlan:plan,restore}),current);
assert.deepEqual(keys,['huxing-design-v2']);
const legacy={furniture:[{id:'old',cx:-50000,cy:100000,w:'500',d:'600',price:12.5}],rooms:{}};
for(const badCache of [null,'{','{"v":1}','false']){
  const migrated=load({read:readFrom({'huxing-design-v2':badCache,'huxing-design-v1':JSON.stringify(legacy)}),firstPlan:plan,restore});
  assert.equal(migrated.work[plan.id].furniture[0].cx,-50000);
  assert.equal(migrated.work[plan.id].furniture[0].w,500);
  assert.equal(migrated.work[plan.id].furniture[0].price,12.5);
  assert.equal(Object.keys(migrated.work[plan.id].rooms).length,plan.rooms.length);
}
for(const invalid of ['{','null','{"furniture":{}}'])assert.deepEqual(load({read:readFrom({'huxing-design-v1':invalid}),firstPlan:plan,restore}),fallback);
assert.deepEqual(load({read:()=>JSON.stringify(legacy),firstPlan:plan,restore:()=>{throw Error('invalid architecture');}}),fallback);
assert.deepEqual(load({read:readFrom({alternate:JSON.stringify(current)}),firstPlan:plan,restore,key:'alternate'}),current);
console.log('PASS workspace cache precedence, migration, malformed and restricted storage');
