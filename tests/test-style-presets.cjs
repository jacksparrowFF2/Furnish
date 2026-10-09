const assert = require('node:assert/strict');
const styles = require('../src/core/style-core.js');
const presets = require('../src/data/style-presets.js');
const {materials} = require('../src/data/catalog.js');
const rooms = [{id:'room_0',name:'房间 1'},{id:'room_1',name:'房间 2'},
  {id:'room_2',name:'房间 3'},{id:'bay_0',name:'飘窗台',counted:false}];
const work = {rooms:{room_0:{name:'房间 1',mat:'wood'},room_1:{name:'主卧',mat:'wood'},
  room_2:{name:'卫生间',mat:'tile800'},bay_0:{name:'飘窗台',mat:'marble'}},furniture:[{type:'sofa'}]};
styles.apply(work,rooms,'industrial',true);
assert.equal(work.rooms.room_0.mat,'terrazzo');
assert.equal(work.rooms.room_1.mat,'walnut');
assert.equal(work.rooms.room_2.mat,'tile800');
assert.equal(work.rooms.bay_0.mat,'marble');
assert.equal(work.furniture[0].color,'#6b6b6e');
assert.equal(work.style,'industrial');
const builtInRooms = [{id:'living'},{id:'master'},{id:'bath'},{id:'unknown'}];
work.rooms = Object.fromEntries(builtInRooms.map(room=>[room.id,{mat:'tile800'}]));
styles.apply(work,builtInRooms,'chinese');
assert.equal(work.rooms.living.mat,'marble');
assert.equal(work.rooms.master.mat,'walnut');
assert.equal(work.rooms.bath.mat,'tile800');
assert.equal(work.rooms.unknown.mat,'tile800');

// Explicit use wins over a misleading name; styles preserve product data.
const customRooms = [{id:'a',name:'卧室'},{id:'b',name:'客厅'}];
const sofa = {id:'sofa',type:'sofa',cx:1200,cy:800,w:2000,d:900,rot:90,
  price:1234.56,purchaseStatus:'ordered',locked:true,color:'#123456'};
const furnitureBefore = {...sofa};
const custom = {rooms:{a:{use:'kitchen',mat:'tile600'},b:{use:'bedroom',mat:'wood'}},
  furniture:[sofa,{type:'fridge',color:'#abcdef'}]};
styles.apply(custom,customRooms,'industrial',true);
assert.equal(custom.rooms.a.mat,'tile600');
assert.equal(custom.rooms.b.mat,'walnut');
assert.deepEqual({...sofa,color:furnitureBefore.color},furnitureBefore);
assert.equal(custom.furniture[1].color,'#abcdef');
const before = JSON.stringify(custom);
assert.equal(styles.apply(custom,customRooms,'missing',true),null);
assert.equal(JSON.stringify(custom),before);
for (const preset of presets) for (const material of preset.floor) {
  assert(materials[material],`Unknown flooring material in ${preset.id}: ${material}`);
}
console.log('PASS direct style module: room semantics, retained furniture data and preset materials');
