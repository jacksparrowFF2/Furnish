const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),M=require('../src/core/cabinet-motion.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js');
const f={id:'wardrobe',type:'wardrobe',cx:3000,cy:3000,rot:0,...C.preset('wardrobe-hanging')};
const boards=value=>M.boards(value,{includeStatic:true});
const rods=value=>boards(value).filter(p=>p.metadata.cabinetHangingRod);
const fronts=value=>boards(value).filter(p=>p.metadata.cabinetDoorSize);
const G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js');
assert.equal(C.templateType(f.cabinet.template),'wardrobe');
assert.equal(C.boxParts(f).length,2);
assert.equal(rods(f).length,3);
const closed=fronts(f);assert.equal(closed.length,8,'four upper and four lower doors');
const drawers=boards(f).filter(p=>p.metadata.cabinetDrawerBoard==='front');
assert.equal(drawers.length,2);drawers.forEach(p=>assert(Math.abs(p.top-p.bottom-207)<1e-6,'actual production front, not drawer tier height'));
const opened=C.setPartOpening(f,{column:0,section:'upper'},60);
for(const b of fronts(opened))assert.equal(Math.abs(b.phase)>0,b.metadata.cabinetPart.column===0&&b.metadata.cabinetPart.section==='upper','upper/lower states independent');
assert.deepEqual(rods(opened),rods(f),'door motion does not move hanging rods');
const raised=C.moveShelf(f,1,0,900);assert.notDeepEqual(rods(raised),rods(f));
assert.equal(C.hangingLayout(f,1).rods[0].size,25);
for(const gap of [599,600]){const a=structuredClone(f);a.cabinet.columns[1].shelves[0]=gap;C.validate(a);assert.equal(C.hangingLayout(a,1).rods.length,gap===600?2:1,'rod threshold includes equality');}
const bad=structuredClone(f);bad.cabinet.columns[0].shelves=[];assert.throws(()=>C.validate(bad),/顶部储物/);
const resized=C.resize(f,{...f,w:1637.5,h:2400});assert.equal(C.boxParts(resized).length,2);assert.equal(rods(resized).length,3);assert.equal(fronts(resized).length,8);
// Rods are recorded actual solids, with the same world rotation/mirroring as the cabinet.
for(const rot of [0,37,180])for(const flip of [false,true]){
 const a={...f,rot,flip},parts=M.solidParts(a);assert(parts.length>0&&parts.every(p=>p.vertices.flat().every(Number.isFinite)));
 const rod=rods(a)[0];assert(Math.abs(rod.top-rod.bottom-25)<1e-6);
 assert(C.openingZones(a).filter(z=>z.kind==='cabinetdoor').every(z=>z.ranges.length===2));
 const local=C.hangingLayout(a,0).rods[0],angle=rot*Math.PI/180,x=local.x*(flip?-1:1),world=z=>({cx:a.cx+x*Math.cos(angle)-z*Math.sin(angle),cy:a.cy+x*Math.sin(angle)+z*Math.cos(angle)});
 const device=z=>({id:'device',type:'water_purifier_mijia_1200g',name:'probe',w:100,d:20,h:20,mountHeight:local.y-10,rot,...world(z)});
 assert(G.volumeOverlap(a,device(0)),'a device fully contained inside the rod is a collision');
 assert(G.volumeOverlap(a,device(20)),'partial rod overlap');assert(!G.volumeOverlap(a,device(22.5)),'touching is not penetration');
 assert(!G.volumeOverlap(a,{...device(0),mountHeight:local.y+12.5}),'height-separated probe is free');
 const probe=device(100),gaps=S.directional(probe,{furniture:[a,probe]});if(rot%90===0)assert(Object.values(gaps).some(v=>Math.abs(v.distance-77.5)<.01),'distance reaches actual rod face');
}
const plan={id:'p1',rooms:[],walls:[],doors:[],defaults:[],ceilingHeight:2700},rules=W.create({makeId:()=>'',colorFor:()=>'',materials:[]}),work=rules.fresh(plan);work.furniture=[opened];P.validateWork(work);
const store={planId:'p1',work:{p1:work},designs:[{id:'d',name:'saved',planId:'p1',ts:1,work:structuredClone(work)}],custom:[],customPlans:[]};
const round=P.unpack(P.pack({planId:'p1',current:work,designs:store.designs,catalog:[]}));
assert.deepEqual(round.current.furniture[0].cabinet,C.config(opened));assert.deepEqual(round.designs[0].work.furniture[0].cabinet,C.config(opened));
let restored=work;for(let i=0;i<3;i++)restored=rules.restore(restored,plan);assert.deepEqual(restored.furniture[0].cabinet,C.config(opened));
const recolored={...f,color:'#fff'};assert.deepEqual(C.spatialConfig(recolored),C.spatialConfig(f));assert.notDeepEqual(C.spatialConfig(raised),C.spatialConfig(f));
console.log('PASS hanging wardrobe: production rods/fronts, split doors, real 207 mm drawer faces, threshold, resize, rotated/mirrored solids, project/named round trip and repeated restore');
