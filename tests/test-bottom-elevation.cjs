'use strict';
const assert=require('node:assert/strict'),P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),C=require('../src/data/catalog.js'),K=require('../src/core/kitchen-core.js'),Cab=require('../src/core/cabinet-core.js'),Cache=require('../src/io/workspace-cache.js'),R=require('../src/core/repository-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<.005,`${a} != ${b}`),copy=v=>JSON.parse(JSON.stringify(v));
const items=C.library.flatMap(c=>c.items),rows=[];
for(const item of items){
 const [type,name,w,d,color,,,]=item,f={id:'elevation-'+rows.length,type,name,w,d,color,cx:0,cy:0,rot:0,...(item[6]!==undefined?{h:item[6]}:{})},old=copy(f),bottom=P.bottomHeight(f),raised=P.editBottomHeight(f,bottom+250);
 assert(Number.isFinite(bottom),type+' finite bottom');near(P.bottomHeight(raised),bottom+250);assert.deepEqual(f,old,'read/edit must not mutate input');J.validateWork({furniture:[raised]});
 const normalized=D.restoreFurniture([raised],{makeId:()=>raised.id,colorFor:()=>color});const packed=J.pack({planId:'bottom-plan',current:{furniture:[raised]},designs:[{name:'离地测试',work:{furniture:[raised]}}],catalog:[]}),restored=J.unpack(packed);assert.deepEqual(restored.current.furniture,normalized);assert.deepEqual(restored.designs[0].work.furniture,normalized);
 const a=D.furnitureVerticalBounds(old),b=D.furnitureVerticalBounds(raised);if(a&&b&&P.bottomMode(f)!=='surface'){near(b.bottom-a.bottom,250);near(b.top-a.top,250);}
 for(const invalid of [-1,20001,NaN,Infinity,'1',null])assert.throws(()=>P.editBottomHeight(f,invalid));
 const fresh={...f,...P.initial(f)};J.validateWork({furniture:[fresh]});if(P.definition(f)?.productionEnvelope){near(P.initial({type}).mountHeight,0);near(P.initial(f).mountHeight,0);}
 const legacy=J.validateWork({furniture:[old]});assert(!('mountHeight'in old));assert(!('mountHeight'in legacy.furniture[0]));
 rows.push({type,mode:P.bottomMode(f),bottom});
}
// Repeated position/height edits must invalidate cached production solids.
for(const type of ['chair','bed','fridge_french_drawer','chair_yeswood_s05118','bookshelf_yeswood_y00y06','tea_bar_mijia_pro','cat_tower_jd_10141711472484','fan_airmate_fa18_x231']){
 const i=items.find(i=>i[0]===type),f={id:type,type,w:i[2],d:i[3],h:i[6]??P.height({type}),color:i[4],cx:0,cy:0,rot:0},original=G.bodyParts(f),bottom=P.bottomHeight(f);
 for(const rot of [0,37,90])for(const flip of [false,true])for(const delta of [0,700,150]){
  const moved={...P.editBottomHeight(f,bottom+delta),rot,flip},parts=G.bodyParts(moved);assert.equal(parts.length,original.length);near(Math.min(...parts.map(p=>p.vertical.bottom)),Math.min(...original.map(p=>p.vertical.bottom))+delta);near(Math.max(...parts.map(p=>p.vertical.top)),Math.max(...original.map(p=>p.vertical.top))+delta);
  if(delta===700){const below={id:'below',type:'block',cx:0,cy:0,w:100,d:100,h:100,mountHeight:0,rot:0};assert(!G.volumeOverlap(moved,below),type+' height separated');}
 }
 assert.deepEqual(G.bodyParts(f),original,type+' restore cached native geometry');
}
const cabinet={...Cab.preset('base'),id:'cab',type:'cabinet',cx:0,cy:0,rot:0},up=P.editBottomHeight(cabinet,600),a=G.bodyParts(cabinet),b=G.bodyParts(up);near(Math.min(...b.map(p=>p.vertical.bottom))-Math.min(...a.map(p=>p.vertical.bottom)),600);
const z0=Cab.openingZones(cabinet),z1=Cab.openingZones(up);for(let i=0;i<z0.length;i++)near(z1[i].ranges[0][0]-z0[i].ranges[0][0],600);
const shower={type:'shower_arrow_cream',w:250,d:500,h:1749},next=P.editBottomHeight(shower,500);assert(!('mountHeight'in next));near(P.showerInstallation(next).bottom,500);
const sink={id:'sink',type:'sink_arrow_680',w:680,d:450,h:240,counterElevation:860,counterLink:{hostId:'host',module:0}},free=P.editBottomHeight(sink,400);assert(!free.counterLink);near(P.bottomHeight(free),400);
const plan=require('../src/data/plans.js')[0],W=require('../src/core/work-state.js').create({makeId:()=> 'fixture',colorFor:()=> '#fff',materials:C.materials}),work={...W.fresh(plan),furniture:[up]},store={v:49,planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[],custom:[],updatedAt:100};
assert.equal(JSON.parse(R.text(store)).version,49);assert.deepEqual(R.parse(JSON.parse(R.text(store))).work[plan.id].furniture,[up]);assert.equal(Cache.load({read:key=>key==='huxing-design-v49'?JSON.stringify(store):null,key:'huxing-design-v49',firstPlan:plan,restore:W.restore}).v,49);
let restored=work;for(let i=0;i<3;i++)restored=W.restore(restored,plan);assert.deepEqual(restored.furniture,[up]);
const fingerprint=f=>J.checkFingerprint({kind:'cabinetdoor',id:f.id},plan,[f],800);assert.notEqual(fingerprint(cabinet),fingerprint(up));assert.equal(fingerprint(up),fingerprint({...up,color:'#123456',price:19,purchaseStatus:'ordered'}));
const curtain={id:'curtain',type:'curtain',w:2400,d:180,h:2400,mountHeight:0},atFloor=P.editBottomHeight(curtain,0);near(P.bottomHeight(curtain),20);assert.equal(atFloor.bottomPhysical,true);near(P.bottomHeight(atFloor),0);near(D.furnitureVerticalBounds(atFloor).top,2380);assert(!('bottomPhysical'in curtain));assert.throws(()=>J.validateWork({furniture:[{id:'bad',type:'chair',w:500,d:500,cx:0,cy:0,rot:0,bottomPhysical:true}]}));
const obj={id:'obj',type:'washer',w:400,d:300,h:600,cx:0,cy:0,rot:0,obj:{positions:[0,0,0,1,0,0,0,1,0,0,0,1,0,1,0,1,0,0]}};near(P.bottomHeight(P.editBottomHeight(obj,750)),750);near(D.furnitureVerticalBounds(P.editBottomHeight(obj,750)).top,1350);
// Tabletop attachment follows the raised host; an explicit bottom edit stays detached.
let host=K.configure({id:'host',type:'counter',w:1800,d:600,cx:0,cy:0,rot:0},{...K.defaults({w:1800,d:600}),modules:[{width:900,run:0,role:'sink'},{width:900,run:0,role:'hob'}]});
let linked=K.attach({id:'s',type:'sink_arrow_680',w:680,d:450,h:240,cx:0,cy:0,rot:0},host,0),pair=[host,linked];K.normalize(pair);const oldSinkBottom=P.bottomHeight(linked);host=P.editBottomHeight(host,300);pair=[host,{...linked}];K.normalize(pair);near(P.bottomHeight(pair[1]),oldSinkBottom+300);assert.equal(pair[1].counterLink.hostId,host.id);
const highPair=[P.editBottomHeight(host,20000),{...linked}];K.normalize(highPair);near(P.bottomHeight(highPair[1]),oldSinkBottom+20000);J.validateWork({furniture:highPair});assert.equal(J.pack({planId:'high',current:{furniture:highPair},designs:[],catalog:[]}).version,49);
const highSurface={...sink,counterElevation:2500};delete highSurface.counterLink;assert.equal(J.pack({planId:'surface',current:{furniture:[highSurface]},designs:[],catalog:[]}).version,49);assert.throws(()=>P.validateField(highSurface,'counterElevation',40001));
const detached=P.editBottomHeight(pair[1],400);pair=[host,detached];K.normalize(pair);near(P.bottomHeight(detached),400);assert(!detached.counterLink);assert.equal(detached.mountHeight,400);
let areaId=0;const area=K.createLaundryCabinet({id:'area',type:'counter',w:1400,d:650,cx:0,cy:0,rot:0},()=> 'area-'+(++areaId),'left')[0];if(area.kitchen.laundry.assembly){const oldParts=K.laundryParts(area),newParts=K.laundryParts(P.editBottomHeight(area,300));for(let i=0;i<oldParts.length;i++)near(P.bottomHeight(newParts[i].furniture)-P.bottomHeight(oldParts[i].furniture),300);}
for(const type of ['purifier','crib','sidetable','shower','bathtub','floorlamp','plant','piano','treadmill','dryingrack']){const item=items.find(i=>i[0]===type),f={type,w:item[2],d:item[3],cx:0,cy:0,rot:0},bottom=P.bottomHeight(f),parts=G.bodyParts(P.editBottomHeight(f,500));near(Math.min(...parts.map(p=>p.vertical.bottom)),500);assert.equal(P.vertical(f).source,'production-mesh');assert(!Object.hasOwn(f,'h'));assert(Number.isFinite(bottom));}

const curtainObj=P.editBottomHeight({...obj,type:'curtain',bottomPhysical:true},750);near(P.vertical(curtainObj).bottom,750);near(P.vertical(curtainObj).top,1350);
const sharedA={id:'share-a',type:'cabinet',cx:0,cy:0,rot:0,...Cab.preset('entry-pegboard')},sharedB={id:'share-b',type:'cabinet',cx:937,cy:0,rot:0,...Cab.preset('entry-console')};
const raisedA=P.editBottomHeight(sharedA,400),raisedB=P.editBottomHeight(sharedB,400);assert.equal(Cab.sharedSides(raisedA,[sharedB]).length,0);assert.equal(Cab.sharedSides(raisedA,[raisedB]).length,1);assert.equal(Cab.sharedSides(P.elevationSource(raisedA),[raisedB]).length,1);
console.log('PASS '+rows.length+' catalog bottom controls, native/surface/mixer conversion, legacy omission, atomic validation, v49 current/named/workspace/cache roundtrip, no-drift restore, production solid translation/cache, rotation/mirror, height separation, cabinet openings and scoped spatial confirmation');
