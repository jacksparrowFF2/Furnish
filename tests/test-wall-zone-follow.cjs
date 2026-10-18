const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/zone-geometry.js');
const packed=JSON.parse(fs.readFileSync(require.resolve('./fixtures/browser/short-wall-zones.furnish.json'),'utf8')),work=P.unpack(packed).current,d=work.architecture.draft,copy=v=>JSON.parse(JSON.stringify(v));
const base=C.build(d),next=copy(d);assert.deepEqual(C.fitZonesToWalls(d),d,'unchanged valid drafts retain their saved structure');next.walls.push({id:'short_user',a:[3768/d.scale,6421/d.scale],b:[3768/d.scale,6471/d.scale],kind:'n',thickness:130});
assert.doesNotThrow(()=>C.build(next),'wall-covered authored boundaries derive usable intersections');
const invalid=copy(d);invalid.zones[0].poly=[[0,0],[100,0],[100,100],[0,100]];assert.throws(()=>P.unpack(P.pack({...P.unpack(packed),current:{...work,architecture:{draft:invalid,phase:'survey'}}})),/指定区域超出/,'outside space remains invalid');
const before=JSON.stringify(next),fitted=C.fitZonesToWalls(next),plan=C.build(fitted);assert.equal(JSON.stringify(next),before,'atomic copy');assert.deepEqual(fitted.walls,next.walls);assert.deepEqual(fitted.openings,d.openings);assert.deepEqual(fitted.beams,d.beams);
assert.deepEqual(fitted.zones.map(z=>[z.id,z.name,z.use,z.parent,z.mat,z.materialExplicit]),d.zones.map(z=>[z.id,z.name,z.use,z.parent,z.mat,z.materialExplicit]));
assert.deepEqual(fitted.zones,d.zones,'wall edits never permanently cut authored boundaries');
const changed=plan.rooms.filter(r=>r.areaId&&JSON.stringify(r.poly)!==JSON.stringify(base.rooms.find(b=>b.id===r.id).poly));assert.deepEqual(changed.map(r=>r.name).sort(),['主卧','走廊']);
assert(Math.abs(base.physicalRooms.reduce((n,r)=>n+P.area(r.poly),0)-plan.physicalRooms.reduce((n,r)=>n+P.area(r.poly),0)-.0169)<1e-8);
for(const r of plan.rooms.filter(r=>r.areaId)){const parent=plan.physicalRooms.find(p=>p.id===r.parentArea);assert(G.area(G.decompose([parent.poly,r.poly],p=>G.inside(p,r.poly)&&!G.inside(p,parent.poly)))<=.01);}
// Repeated property edits, including a temporarily detached short wall, must
// equal a single direct edit and create no unassigned remnants of old positions.
let moving=copy(fitted);for(const [x,y]of [[3803,6386],[3835,6350],[3768,6421]]){const w=moving.walls.at(-1);w.a=[x/d.scale,y/d.scale];w.b=[x/d.scale,(y+50)/d.scale];moving=C.fitZonesToWalls(moving);assert.deepEqual(moving.zones,d.zones);assert(!C.build(moving).rooms.some(r=>r.remainder));if(x===3835){const restored=P.unpack(P.pack({planId:d.id,current:{...work,architecture:{phase:'survey',draft:moving}},designs:[],catalog:[]})).current.architecture.draft;assert.deepEqual(C.build(restored).rooms,C.build(moving).rooms,'detached wall holes survive project roundtrip');}}
assert.deepEqual(C.build(moving).rooms,plan.rooms,'move away and return leaves no staircase');
let round=fitted;for(let i=0;i<3;i++){assert.deepEqual(C.fitZonesToWalls(round),fitted,'repeated fitting has no drift');round=P.unpack(P.pack({planId:d.id,current:{...work,architecture:{phase:'survey',draft:round}},designs:[{name:'短墙功能区',work:{...work,architecture:{phase:'survey',draft:round}}}],catalog:[]})).current.architecture.draft;assert.deepEqual(round,fitted);}
// A wall engulfing or splitting a designation must be rejected without silently deleting it.
const {fixture}=require('./helpers/wall-finish-fixture.cjs'),b=fixture().draft,z={id:'area_test',name:'保留名称',use:'study',parent:'room1',poly:[[100,20],[140,20],[140,60],[100,60]],mat:'tile800',materialExplicit:true},zoned=C.addZone(b,z);
const invaded=copy(zoned);invaded.walls.push({id:'plug',a:[105,20],b:[105,25],kind:'n',thickness:100,caps:[0,0]});const clipped=C.fitZonesToWalls(invaded);assert.equal(clipped.zones[0].mat,z.mat);assert.equal(clipped.zones[0].materialExplicit,true);assert.deepEqual(C.fitZonesToWalls(clipped),clipped);
const engulfed=copy(zoned);engulfed.walls.push({id:'engulf',a:[120,10],b:[120,70],kind:'n',thickness:600,caps:[0,0]});assert.throws(()=>C.fitZonesToWalls(engulfed),/已无可用面积|小于/);assert.deepEqual(zoned.zones,[z]);
const divided=copy(zoned);divided.walls.push({id:'divide',a:[120,10],b:[120,310],kind:'n',thickness:100,caps:[0,0]});assert.throws(()=>C.fitZonesToWalls(divided),/跨越多个独立空间/);
console.log('PASS reported floorplan, wall-occupied zone clipping, unchanged IDs/settings/other zones, exact net area, atomic refusal, strict import and repeated project roundtrip');
(async()=>{
 const THREE=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),M=require('../src/render/floor-finish-model.js');
 const island=copy(b);island.walls.push({id:'island',a:[150,100],b:[155,100],kind:'n',thickness:130});const r=C.build(island).rooms[0],mesh=M.surface(THREE,r,{finishedZ:0});mesh.updateMatrixWorld(true);
 const hit=(x,y)=>new THREE.Raycaster(new THREE.Vector3(x/1000,1,y/1000),new THREE.Vector3(0,-1,0)).intersectObject(mesh);
 assert.equal(r.rings.length,2);assert.equal(hit(1525,1000).length,0,'production floor has no triangles below detached wall');assert(hit(1525,1200).length>0,'usable adjacent floor remains');
 const perimeter=poly=>poly.reduce((sum,p,i)=>sum+Math.hypot(p[0]-poly[(i+1)%poly.length][0],p[1]-poly[(i+1)%poly.length][1]),0)/1000;
 const expectedWall=r.rings.reduce((sum,ring)=>sum+perimeter(ring),0)*2.8;assert(Math.abs(P.quantities(C.build(island)).wall-expectedWall)<1e-8,'wall quantities count real rings and exclude synthetic bridge edges');
 const geometry=mesh.geometry,positions=geometry.attributes.position,index=geometry.index;let area=0;for(let i=0;i<(index?.count??positions.count);i+=3){const points=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(positions,index?index.getX(i+k):i+k));area+=new THREE.Triangle(...points).getArea();}assert(Math.abs(area-P.area(r.poly))<1e-5,'actual production triangles preserve hole area');
 console.log('PASS production floor triangles and ray hits exclude real detached-wall holes');
})().catch(e=>{console.error(e);process.exitCode=1;});
