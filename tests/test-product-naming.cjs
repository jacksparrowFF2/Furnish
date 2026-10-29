'use strict';
const assert=require('node:assert/strict'),P=require('../src/core/product-rules.js'),C=require('../src/data/catalog.js'),K=require('../src/core/kitchen-core.js'),U=require('../src/core/furniture-upgrade.js'),Project=require('../src/core/project-core.js');
for(const group of C.library)for(const it of group.items)assert.notEqual(P.kind(it[0]),'未分类',it[0]);
assert.equal(P.kind('__proto__'),'未分类');assert.equal(P.kind('unknown'),'未分类');
const old={id:'old',type:'washer_littleswan_tg10k60w',name:'小天鹅 TG10K60W · 10kg',w:595,d:560,h:850,cx:2000,cy:2000,rot:0,color:'#fff',mountHeight:0,washerDoorAngle:38,brand:'小天鹅',model:'TG10K60W',price:1234};
const before=structuredClone(old),upgraded=U.upgradeList([old]).furniture[0];
assert.equal(upgraded.name,'小天鹅洗衣机 TG10K60W · 10kg');assert.deepEqual({...upgraded,name:old.name},old);assert.deepEqual(old,before);
assert.deepEqual(U.upgradeList([upgraded]).furniture,[upgraded]);
const plan=require('../src/data/plans.js')[0];assert.equal(Project.checkFingerprint({id:'fixture'},plan,[old],800),Project.checkFingerprint({id:'fixture'},plan,[upgraded],800),'naming upgrade preserves spatial confirmation');
for(const name of ['阳台洗衣机','小天鹅 TG10K60W','洗衣机'])assert.equal(U.upgradeList([{...old,name}]).furniture[0].name,name);
const work={furniture:[old]},payload={planId:'p1',current:work,designs:[{name:'旧方案',work}],catalog:[]},restored=Project.unpack(Project.pack(payload));
assert.equal(restored.current.furniture[0].name,upgraded.name);assert.equal(restored.designs[0].work.furniture[0].name,upgraded.name);
assert.deepEqual(Project.unpack(Project.pack(restored)),restored);
const washers=Object.keys(P.types).filter(type=>P.definition(type).laundryKind==='washer');assert(washers.length>=2);
for(const type of [...washers,'dryer']){
 assert(P.supportsAction({type},'alignLaundryBay'));assert(!P.supportsAction({type,obj:{}},'alignLaundryBay'));
 for(const rot of [0,37,90,270])for(const flip of [false,true]){
  const host=K.configure({id:'host',type:'counter',name:'洗衣柜',cx:2000,cy:2000,rot,flip,w:1340,d:630,color:'#fff'},K.laundryPreset());
  const bay=K.layout(host).find(m=>m.role==='empty'),device={...old,type,w:600,d:600,h:850,mountHeight:0},a=K.centerLaundryInBay(host,device,bay.index),b=K.centerLaundryInBay(host,a,bay.index);
  assert.deepEqual(a,b);assert.equal(a.rot,rot);assert.equal(a.flip,flip);assert.equal(a.mountHeight,0);
  assert.equal(a.w,device.w);assert.equal(a.washerDoorAngle,38);assert.deepEqual(device,{...old,type,w:600,d:600,h:850,mountHeight:0});
  const rad=rot*Math.PI/180,dx=a.cx-host.cx,dy=a.cy-host.cy,localX=(dx*Math.cos(rad)+dy*Math.sin(rad))*(flip?-1:1),localY=-dx*Math.sin(rad)+dy*Math.cos(rad);
  assert(Math.abs(localX-bay.x)<1e-6);assert(Math.abs(localY+device.d/2-(bay.y+host.d/2))<1e-6);
  assert.throws(()=>K.centerLaundryInBay(host,{...device,w:bay.width+.1},bay.index),/超出/);
  assert.doesNotThrow(()=>K.centerLaundryInBay(host,{...device,w:bay.width},bay.index));
 }
}
assert(!P.supportsAction({type:'dishwasher'},'alignLaundryBay'));
assert(!P.definition('washer').installation,'model installation requirements stay local');
assert(C.matches(C.library.flatMap(g=>g.items).find(it=>it[0]===old.type),{query:'洗衣机 TG10K60W'}));
assert(C.findItem(old.type,old.name),'old default retains exact reset/price lookup');
assert.equal(C.itemKey(C.findItem(old.type,old.name)),C.itemKey(C.findItem(old.type,upgraded.name)),'old device favorites survive catalog rename');
assert.equal(Project.procurement({rooms:[]},{furniture:[old]},()=>1234).items[0].kind,'洗衣机');
console.log('PASS product kinds, exact old-name migration, personal names, current/named round trips, washer capability inheritance, alignment rotation/mirror and limits');
