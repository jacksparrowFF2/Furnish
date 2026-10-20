const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js');
const f={id:'cab',type:'cabinet',cx:1500,cy:1000,rot:0,color:'#efe6d8',...C.preset('sideboard-open')},original=JSON.stringify(f);
const shifted=C.moveDivider(f,0,130),a=C.widths(f),b=C.widths(shifted);assert(Math.abs(shifted.w-f.w-130)<1e-8);assert.equal(b[0],a[0]+130);assert.equal(b[1],a[1]);assert.equal(b[2],a[2]);
assert(Math.abs(C.moveDivider(f,0,9999).w-6000)<1e-8);assert.equal(C.widths(C.moveDivider(f,0,9999))[1],a[1]);assert.equal(C.widths(C.moveDivider(f,0,-9999))[0],100);assert.throws(()=>C.moveDivider(f,2,30),/分隔板/);
const added=C.editStructure(f,0,'addShelf');assert.equal(added.cabinet.columns[0].shelves.length,3);C.validate(added);
const copied=C.editStructure(added,0,'copyShelf',1);assert.equal(copied.cabinet.columns[0].shelves.length,4);
const equal=C.editStructure(copied,0,'equalShelves'),gaps=C.spaces(equal,0);assert(Math.max(...gaps.map(g=>g.height))-Math.min(...gaps.map(g=>g.height))<=1);
assert.equal(C.editStructure(equal,0,'deleteShelf',2).cabinet.columns[0].shelves.length,3);
const drawer=C.editStructure(f,0,'addDrawer');assert.equal(drawer.cabinet.columns[0].drawers.length,2);const group=C.editStructure(drawer,0,'copyDrawers',undefined,1);assert.deepEqual(group.cabinet.columns[0].drawers,group.cabinet.columns[1].drawers);
assert.equal(C.editStructure(group,1,'deleteDrawer',1).cabinet.columns[1].drawers.length,1);assert.throws(()=>C.editStructure(f,0,'copyDrawers',undefined,0),/另一个/);
const limited=structuredClone(f);limited.cabinet.columns[0].shelves[0]=200;assert.throws(()=>C.editStructure(limited,0,'addDrawer'),/空间不足/);
assert.equal(C.snapShelf(f,0,0,479),475);assert.equal(C.snapShelf(f,0,0,461),460);assert.equal(C.snapShelf(f,0,0,99999),C.shelfLimits(f,0,0).max);
const styled=structuredClone(drawer);Object.assign(styled.cabinet.columns[0],{finish:'glass',handle:'knob',door:'double',doorColor:'#abc123',doorAngle:65,doorOpen:true});Object.assign(styled.cabinet.columns[0].drawers[0],{open:true,extension:.4});C.validate(styled);
const progress=structuredClone(styled);progress.cabinet.columns[0].doorAngle=110;progress.cabinet.columns[0].drawers[0].extension=.9;assert.deepEqual(C.specification(progress),C.specification(styled));
assert.deepEqual(P.unpack(P.pack({planId:'p',current:{furniture:[styled]},designs:[],catalog:[]})).current.furniture[0],styled);
for(const [key,value] of [['doorAngle',181],['finish','bad'],['handle','bad'],['doorColor','red']]){const bad=structuredClone(styled);bad.cabinet.columns[0][key]=value;assert.throws(()=>P.validateWork({furniture:[bad]}),/材质/);}
const bad=structuredClone(styled);bad.cabinet.columns[0].drawers[0].extension=1.1;assert.throws(()=>C.validate(bad),/拉出/);
const room={id:'room',poly:[[0,0],[4000,0],[4000,4000],[0,4000]]},plan={rooms:[room],walls:[],doors:[]};
const door={...f,...C.preset('pantry500')},closed=structuredClone(door);assert.equal(closed.cabinet.columns[0].doorOpen,false);
const wallPlan={...plan,walls:[[1300,1350,1700,1400]]};assert(P.spaceCheck(wallPlan,[door],{scanPassages:false}).some(i=>i.kind==='cabinetdoor'),'closed cabinets are checked for their full possible opening');
const blocker={id:'desk',name:'书桌',type:'desk',cx:1500,cy:1900,w:400,d:200,rot:0};assert(P.spaceCheck(plan,[f,blocker],{scanPassages:false}).some(i=>i.kind==='cabinetpassage'));
const zones=C.openingZones(door),turned=C.openingZones({...door,rot:90});for(let i=0;i<zones[0].poly.length;i++){const [x,y]=zones[0].poly[i],[xx,yy]=turned[0].poly[i];assert(Math.abs(xx-(door.cx-(y-door.cy)))<1e-8);assert(Math.abs(yy-(door.cy+(x-door.cx)))<1e-8);}
const flipped=C.openingZones({...door,flip:true});assert(Math.abs(flipped[0].poly[0][0]-(2*door.cx-zones[0].poly[0][0]))<1e-8);
assert.equal(JSON.stringify(f),original);console.log('PASS adjacent bay redistribution, shelf/drawer operations, net gaps, snapping, finishes, persistence and cabinet opening-space checks');
