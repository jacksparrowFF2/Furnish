const assert = require('node:assert/strict');
const G = require('../src/core/layout-geometry.js');
const rectangle = [[0,0],[4000,0],[4000,3000],[0,3000]];
assert.equal(G.area(rectangle),12);
assert.equal(G.area([...rectangle].reverse()),12);
assert.equal(G.perim(rectangle),14);
assert.deepEqual(G.bbox(rectangle),[0,0,4000,3000]);
const concave = [[0,0],[4000,0],[4000,4000],[3000,4000],[3000,1000],[1000,1000],[1000,4000],[0,4000]];
assert(G.inPoly(500,2000,concave));
assert(!G.inPoly(2000,2000,concave));
const item = (id,cx=0,rot=0,type='bed') => ({id,cx,cy:0,w:1000,d:600,rot,type});
const rotated = G.aabb(item('a',0,90));
assert(Math.abs(rotated.hw-300)<1e-9);
assert(Math.abs(rotated.hh-500)<1e-9);
assert.deepEqual(G.groupBox([item('a'),item('b',1500)]),[-500,-300,2000,300]);
const a=item('a');
assert(!G.obbOverlap(a,item('edge',1000)));
assert(!G.obbOverlap(a,item('tolerance',995)));
assert(G.obbOverlap(a,item('overlap',994)));
assert(G.obbOverlap(item('a',0,45),item('b',400,-45)));
assert(!G.obbOverlap(item('a',0,45),item('b',2000,-45)));
const furniture=[a,item('b',300,45,'sofa'),item('rug',0,0,'rug')];
const before=JSON.stringify(furniture);
assert.deepEqual(G.collisions(furniture),[['a','b']]);
assert.equal(JSON.stringify(furniture),before);
assert.deepEqual(G.collisions([item('seat',0,0,'chair'),item('table',0,0,'table')]),[]);
assert.deepEqual(G.collisions([]),[]);
const heater={id:'heater',type:'waterheater_flat',cx:0,cy:0,w:700,d:320,h:565,mountHeight:1650,rot:0},toilet={id:'toilet',type:'toilet',cx:0,cy:0,w:400,d:700,rot:0};
assert(G.obbOverlap(heater,toilet),'plan footprints still overlap');
assert.deepEqual(G.collisions([heater,toilet]),[],'default mounted heater is above the actual toilet model');
assert.deepEqual(G.collisions([{...heater,mountHeight:796},toilet]),[],'vertical face contact is not overlap');
assert.deepEqual(G.collisions([{...heater,mountHeight:795},toilet]),[['heater','toilet']],'positive vertical overlap remains a conflict');
assert.deepEqual(G.collisions([heater,{...toilet,h:1800}]),[['heater','toilet']],'recorded height takes priority');
assert.deepEqual(G.collisions([{...heater,h:100,mountHeight:0},{...toilet,h:100}]),[['heater','toilet']]);
assert.deepEqual(G.collisions([heater,{...toilet,type:'unmodeled'}]),[['heater','toilet']],'unknown height is not silently exempted');
assert.deepEqual(G.collisions([{...heater,rot:90},{...toilet,cx:2000}]),[],'horizontal separation still applies');
assert.deepEqual(G.collisions([heater,{...toilet,type:'cabinet',h:2400}]),[['heater','toilet']],'tall cabinets still conflict');
assert.deepEqual(G.collisions([heater,{...toilet,type:'custom',h:900}]),[],'other known-height low furniture is also separated');
assert.deepEqual(G.collisions([heater,{...toilet,type:'dryer',h:850,mountHeight:1700}]),[['heater','toilet']],'elevated furniture overlapping the heater remains a conflict');
console.log('PASS metric units, concave rooms, rotated bounds, 5 mm tolerance and collision exceptions');

{
 const P=require('../src/core/project-core.js'),plan={walls:[],rooms:[],doors:[]};
 const wash={id:'wash',type:'washer',name:'洗衣机',cx:0,cy:0,w:600,d:600,h:850,rot:0};
 const dry={...wash,id:'dry',type:'dryer',name:'干衣机',mountHeight:850};
 for(const items of [[wash,dry],[wash,{...dry,mountHeight:849}],[heater,toilet],[{...heater,mountHeight:795},toilet],[wash,{...wash,id:'dish',type:'dishwasher'}],[wash,{...wash,id:'unknown',type:'unknown',h:undefined}]]){
  const canvas=G.collisions(items),review=P.spaceCheck(plan,items,{scanPassages:false}).filter(v=>v.kind==='overlap').map(v=>[v.id,v.otherId]);
  assert.deepEqual(review,canvas,'project and canvas use the same vertical collision rule');
 }
 assert.equal(G.collisions([wash,{...wash,id:'dish',type:'dishwasher'}]).length,1,'floor-standing dishwasher occupies space');
}

{
 const C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js');
 const plan={walls:[],doors:[],rooms:[]};
 const cabinet={id:'fridge-host',type:'cabinet',cx:2500,cy:2500,rot:0,...C.preset('sideboard-fridge')};
 cabinet.cabinet.sideboard.fridgeHeight=1950;
 const bay=C.layout(cabinet)[0],fridge={id:'embedded-fridge',type:'fridge_french_drawer',name:'Fridge',cx:cabinet.cx+bay.center,cy:cabinet.cy-cabinet.d/2+595/2,w:790,d:595,h:1910,rot:0};
 const overlaps=items=>P.spaceCheck(plan,items,{scanPassages:false}).filter(v=>v.kind==='overlap');
 assert(G.obbOverlap(cabinet,fridge));assert(C.fridgeFitsBay(cabinet,fridge));assert.deepEqual(G.collisions([cabinet,fridge]),[]);assert.deepEqual(overlaps([cabinet,fridge]),[]);assert.deepEqual(overlaps([fridge,cabinet]),[]);
 assert.equal(P.spaceCheck(plan,[cabinet,fridge],{scanPassages:false}).filter(v=>v.kind==='cabinetdoor'&&v.column===0).length,0,'upper doors above a fitting fridge are not blocked by its 2D footprint');
 for(const rot of [0,90,180,270,37])for(const flip of [false,true]){
  const host={...cabinet,rot,flip},a=rot*Math.PI/180,lx=bay.center*(flip?-1:1),ly=-cabinet.d/2+595/2,guest={...fridge,cx:host.cx+lx*Math.cos(a)-ly*Math.sin(a),cy:host.cy+lx*Math.sin(a)+ly*Math.cos(a),rot};
  assert(C.fridgeFitsBay(host,guest),'rotation/mirroring preserve cavity containment');assert.deepEqual(G.collisions([guest,host]),[]);assert.deepEqual(overlaps([host,guest]),[]);
 }
 for(const invalid of [{...fridge,w:810},{...fridge,d:620},{...fridge,h:1951},{...fridge,cx:fridge.cx+12},{...fridge,type:'cabinet'},{...fridge,type:'sofa'}]){
  assert(!C.fridgeFitsBay(cabinet,invalid));assert.equal(G.collisions([cabinet,invalid]).length,1,'oversize, panel intersection or non-fridge retains overlap');assert.equal(overlaps([cabinet,invalid]).length,1);
 }
 const exact={...fridge,w:800,d:600,cy:cabinet.cy,h:1950};assert(C.fridgeFitsBay(cabinet,exact),'exact cavity boundary fit');
 assert(!C.fridgeFitsBay(cabinet,{...exact,cx:exact.cx+.1}),'no exemption for a fridge entering the side panel');
 const legacyHeight={...fridge};delete legacyHeight.h;assert(C.fridgeFitsBay(cabinet,legacyHeight),'known fridge model height supplies missing field');
 const low={...cabinet,cabinet:structuredClone(cabinet.cabinet)};low.cabinet.sideboard.fridgeHeight=1830;assert(!C.fridgeFitsBay(low,legacyHeight),'known model too tall for opening remains a clash');
 for(const rot of [0,90,180,270,37])for(const flip of [false,true]){
  const host={...cabinet,rot,flip},angle=rot*Math.PI/180,co=Math.cos(angle),si=Math.sin(angle),along=-220,front=17,guest={...fridge,cx:host.cx+along*co-front*si,cy:host.cy+along*si+front*co,rot:rot+15},original=JSON.stringify(guest),centered=C.centerFridgeInBay(host,guest),x=(centered.cx-host.cx)*co+(centered.cy-host.cy)*si,y=-(centered.cx-host.cx)*si+(centered.cy-host.cy)*co;
  assert(Math.abs(x-bay.center*(flip?-1:1))<1e-8);assert(Math.abs(y-front)<1e-8,'front/back offset is unchanged');assert.equal(centered.rot,guest.rot);assert.equal(JSON.stringify(guest),original,'alignment is immutable');assert.deepEqual(C.centerFridgeInBay(host,centered),centered,'already centered remains stable');
 }
 assert.throws(()=>C.centerFridgeInBay(cabinet,{...fridge,locked:true}),/锁定/);
 assert.equal(G.collisions([cabinet,fridge,{...fridge,id:'second-fridge'}]).length,1,'two fridges still collide with each other');
 const plain={...cabinet,...C.preset('sideboard-wall')};assert(!C.fridgeFitsBay(plain,fridge));
 const exported=P.unpack(P.pack({planId:'test',current:{furniture:[cabinet,fridge]},designs:[],catalog:[]}));assert.deepEqual(G.collisions(exported.current.furniture),[]);
 console.log('PASS embedded fridge collision exemption with rotation, mirroring, height, exact boundaries, panel intersections and project round trip');
}

{
 const C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js');
 let host={id:'835-host',name:'Host',type:'cabinet',cx:1000,cy:1000,rot:0,...C.preset('sideboard-fridge')};host=C.setColumnWidth(host,0,835);host.cabinet.sideboard.fridgeHeight=1830;
 const bay=C.layout(host)[0],fridge={id:'833-fridge',name:'Fridge',type:'fridge_french_drawer',cx:host.cx+bay.center,cy:host.cy,w:833,d:595,h:1910,rot:0};
 let result=C.fridgeBayFit(host,fridge);assert.equal(result.clearances.left,1);assert.equal(result.clearances.right,1);assert.equal(result.clearances.top,-80);assert.equal(result.reasons.length,1);assert.match(result.reasons[0],/高度 1910.*净高 1830.*80/);
 assert(P.spaceCheck({walls:[],doors:[],rooms:[]},[host,fridge],{scanPassages:false}).some(issue=>issue.kind==='overlap'&&issue.message.includes('超出 80 mm')));
 host.cabinet.sideboard.fridgeHeight=1910;assert(C.fridgeFitsBay(host,fridge));assert.deepEqual(G.collisions([host,fridge]),[]);
 const offset={...fridge,cx:fridge.cx+3};result=C.fridgeBayFit(host,offset);assert.equal(result.reasons.length,1);assert.match(result.reasons[0],/右侧 2 mm/);
 assert(C.fridgeBayFit(host,{...fridge,cy:fridge.cy+10}).reasons.some(reason=>reason.includes('前沿 7.5 mm')));
 console.log('PASS 833 mm fridge in 835 mm bay: width fits; height and positional conflict reasons are explicit');
}
