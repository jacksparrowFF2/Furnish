'use strict';
const assert=require('node:assert/strict'),G=require('../src/core/zone-geometry.js'),Core=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js');
const d={version:1,id:'custom_free_test',name:'自由区域',source:'dxf',image:'',width:2000,height:1500,scale:2,walls:[{id:'top',a:[0,50],b:[2000,50]},{id:'bottom',a:[0,1450],b:[2000,1450]},{id:'left',a:[50,100],b:[50,1400]},{id:'right',a:[1950,100],b:[1950,1400]}].map(w=>({...w,thickness:200,kind:'b',caps:[0,0]})),openings:[]};
const original=Core.build(d),zone={id:'area_living',parent:'room1',name:'客厅',use:'living',poly:[[200,200],[800,200],[800,800],[200,800]]},before=structuredClone(d);
const rect=Core.addZone(d,zone),rectPlan=Core.build(rect),remaining=rectPlan.rooms.find(r=>r.remainder),area=rectPlan.rooms.find(r=>r.id===zone.id);
assert.deepEqual(d,before);assert.equal(P.area(area.poly),1.44);assert.ok(Math.abs(P.area(remaining.poly)-7.92)<1e-8);assert.equal(remaining.rings.length,2);
assert.equal(G.inside([1000,1000],remaining.poly),false);assert.equal(G.inside([3000,2000],remaining.poly),true);
assert.deepEqual(rectPlan.walls,original.walls);assert.deepEqual({...P.quantities(rectPlan),rooms:1},P.quantities(original));
const triangle={id:'area_dining',parent:'room1',name:'餐厅',use:'dining',poly:[[1000,300],[1700,300],[1400,1100]]};
const both=Core.addZone(rect,triangle),bothPlan=Core.build(both);assert.equal(P.area(bothPlan.rooms.find(r=>r.id===triangle.id).poly),1.12);
const q=P.quantities(bothPlan);assert.ok(Math.abs(q.net-9.36)<1e-8);assert.equal(q.wall,P.quantities(original).wall);
const body={id:'cross',type:'table',name:'跨边界',cx:1600,cy:1000,w:800,d:500,rot:27,frontClearance:0};
assert.equal(P.fitsInRooms(bothPlan.rooms,P.polygon(body)),true);assert.deepEqual(P.spaceCheck(bothPlan,[body]),P.spaceCheck(original,[body]));
assert.equal(P.fitsInRooms([bothPlan.rooms.find(r=>r.id===triangle.id)],[[2100,700],[2200,700],[2200,800],[2100,800]]),true);
const changed=Core.editZone(both,zone.id,{poly:[[250,250],[850,250],[850,850],[250,850]]}),changedPlan=Core.build(changed);
assert.equal(changed.zones[0].id,zone.id);assert.equal(changed.zones[0].name,'客厅');assert.equal(changed.zones[0].use,'living');
const settings=Object.fromEntries(bothPlan.rooms.map(r=>[r.id,{name:r.name,use:r.use||'other',mat:'wood'}]));settings[zone.id]={name:'家庭客厅',use:'study',mat:'tile800'};
assert.deepEqual(P.remapRooms(bothPlan.rooms,changedPlan.rooms,settings)[zone.id],settings[zone.id]);
const work={furniture:[],rooms:settings,architecture:{draft:changed,phase:'design',baseline:d},open:{},demolished:[],notes:[],measures:[]};
const packed=P.pack({planId:d.id,current:work,designs:[{id:'scheme',name:'命名方案',work}],catalog:[]}),loaded=P.unpack(packed);
assert.deepEqual(loaded.current.architecture.draft.zones,changed.zones);assert.deepEqual(loaded.current.rooms,settings);assert.deepEqual(Core.build(loaded.current.architecture.draft).rooms,changedPlan.rooms);
assert.deepEqual(Core.build(Core.removeZone(Core.removeZone(both,zone.id),triangle.id)).rooms,original.rooms);
const invalids=[[[500,500],[1100,500],[1100,1000],[500,1000]],[[50,50],[300,50],[300,300],[50,300]],[[1000,200],[1800,1000],[1000,1000],[1800,200]],[[1000,200],[1000,200],[1800,500]],[[900,200],[900.01,200],[900,200.01]]];
for(const poly of invalids)assert.throws(()=>Core.addZone(rect,{...triangle,poly}));assert.throws(()=>Core.addZone(rect,zone));
assert.throws(()=>Core.editZone(both,zone.id,{poly:triangle.poly}),/重叠/);assert.deepEqual(both.zones[0],zone);
// Concavity, touch-only adjacency, reversed winding, disjoint remainder and full coverage.
const concave={...zone,poly:[[200,200],[900,200],[900,400],[400,400],[400,1100],[200,1100]]};assert.ok(Math.abs(P.quantities(Core.build(Core.addZone(d,concave))).net-9.36)<1e-8);
const touch=Core.addZone(rect,{...triangle,poly:[[800,200],[1400,200],[1400,800],[800,800]]});assert.ok(Math.abs(P.quantities(Core.build(touch)).net-9.36)<1e-8);
assert.doesNotThrow(()=>Core.addZone(d,{...zone,poly:[...zone.poly].reverse()}));
const divider=Core.addZone(d,{...zone,poly:[[900,100],[1100,100],[1100,1400],[900,1400]]});assert.equal(Core.build(divider).rooms.find(r=>r.remainder).rings.length,2);
const full=Core.addZone(d,{...zone,poly:[[100,100],[1900,100],[1900,1400],[100,1400]]});assert.equal(Core.build(full).rooms.length,1);assert.equal(P.quantities(Core.build(full)).net,9.36);
const split=Core.splitZone(d,{id:'zone_old',parent:'room1',axis:0,at:1000,parts:[{name:'起居',use:'living'},{name:'餐厅',use:'dining'}]}),withFree=Core.addZone(split,{...zone,parent:'zone_old_0'});
assert.ok(Math.abs(P.quantities(Core.build(withFree)).net-9.36)<1e-8);assert.equal(Core.removeZoneSplit(withFree,'zone_old').zones[0].parent,'room1');assert.equal(Core.removeZoneSplit(withFree,'zone_old').zones[0].id,zone.id);
const shifted=Core.editZoneSplit(split,'zone_old',1100);assert.equal(Core.build(shifted).rooms[0].id,'zone_old_0');assert.equal(Core.build(shifted).rooms[0].use,'living');
// Independent area formulas exercise oblique edge intersections and holes.
for(let n=1;n<=15;n++){const t=[[200,200],[1400+n*7,200],[500+n*11,1200]],res=Core.build(Core.addZone(d,{...zone,poly:t}));assert.ok(Math.abs(P.quantities(res).net-9.36)<1e-7);assert.ok(Math.abs(P.area(res.rooms.find(r=>r.areaId).poly)-Math.abs(G.signed(t))*4/1e6)<1e-8);}
console.log('PASS free rectangle/concave/sloped regions, holes, remainders, no overlap/area duplication, stable editing metadata, legacy splits, collision/budget invariance and portable projects');

const originalSettings={room1:{name:'开放客餐厅',use:'living',mat:'wood'}},hidden=P.remapRooms(original.rooms,Core.build(full).rooms,originalSettings);assert.deepEqual(hidden.room1,originalSettings.room1);const backToRemainder=P.remapRooms(Core.build(full).rooms,rectPlan.rooms,hidden);assert.deepEqual(backToRemainder.room1,originalSettings.room1);

const splitAfterDrawing=Core.splitZone(rect,{id:'zone_after',parent:'room1',axis:0,at:1000,parts:[{name:'起居',use:'living'},{name:'餐厅',use:'dining'}]});assert.equal(splitAfterDrawing.zones[0].parent,'zone_after_0');assert.equal(splitAfterDrawing.zones[0].id,zone.id);assert.throws(()=>Core.splitZone(rect,{id:'zone_cross',parent:'room1',axis:0,at:500,parts:[{name:'a',use:'living'},{name:'b',use:'dining'}]}),/穿过/);
