'use strict';
const assert=require('node:assert/strict'),G=require('../src/core/zone-geometry.js'),Core=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js');
const d={version:1,id:'custom_boundary_test',name:'联动区域',source:'dxf',image:'',width:2000,height:1500,scale:2,walls:[{id:'top',a:[0,50],b:[2000,50]},{id:'bottom',a:[0,1450],b:[2000,1450]},{id:'left',a:[50,100],b:[50,1400]},{id:'right',a:[1950,100],b:[1950,1400]}].map(w=>({...w,thickness:200,kind:'b',caps:[0,0]})),openings:[]};
const zone=(id,poly)=>({id:'area_'+id,parent:'room1',name:id,use:id==='living'?'living':'dining',poly});
const living=zone('living',[[200,200],[800,200],[800,1000],[200,1000]]),dining=zone('dining',[[800,200],[1400,200],[1400,1000],[800,1000]]);
const both=Core.addZone(Core.addZone(d,living),dining),before=structuredClone(both);
const union=ps=>G.area(G.decompose(ps,p=>ps.some(poly=>G.inside(p,poly))));
for(const x of [600,900,1200]){
 const next=Core.editZoneBoundary(both,living.id,[[200,200],[x,200],[x,1000],[200,1000]]);
 assert.equal(next.zones[1].poly[0][0],x);assert.equal(next.zones[1].poly[3][0],x);
 assert.equal(union(next.zones.map(z=>z.poly)),union(both.zones.map(z=>z.poly)));
 assert.deepEqual(next.zones.map(z=>[z.id,z.name,z.use]),both.zones.map(z=>[z.id,z.name,z.use]));
 assert.equal(P.quantities(Core.build(next)).net,P.quantities(Core.build(both)).net);
}
assert.deepEqual(both,before);assert.throws(()=>Core.editZoneBoundary(both,living.id,[[200,200],[1450,200],[1450,1000],[200,1000]]));
// Moving an outer edge can resize coverage; its shared corner still links.
const exterior=Core.editZoneBoundary(both,living.id,[[150,200],[800,200],[800,1000],[150,1000]],{edge:3});assert.equal(P.quantities(Core.build(exterior)).net,P.quantities(Core.build(both)).net);
// One long boundary shared with two neighbors, including a T junction.
const three=Core.addZone(Core.addZone(Core.addZone(d,living),zone('upper',[[800,200],[1400,200],[1400,600],[800,600]])),zone('lower',[[800,600],[1400,600],[1400,1000],[800,1000]]));
const moved=Core.editZoneBoundary(three,living.id,[[200,200],[950,200],[950,1000],[200,1000]]);
assert.equal(union(moved.zones.map(z=>z.poly)),union(three.zones.map(z=>z.poly)));
assert.ok(moved.zones.slice(1).every(z=>z.poly.filter(p=>p[0]===950).length===2));
// Neighbor's longer edge is noded at the ends of a partially shared edge.
const partial=Core.addZone(Core.addZone(d,zone('living',[[200,400],[800,400],[800,800],[200,800]])),dining);
const partialMoved=Core.editZoneBoundary(partial,'area_living',[[200,400],[900,400],[900,800],[200,800]]);
assert.equal(partialMoved.zones[1].poly.length,8);assert.equal(union(partialMoved.zones.map(z=>z.poly)),union(partial.zones.map(z=>z.poly)));
// Oblique shared edge, reversed neighbor winding, and exact project roundtrip.
const angled=Core.addZone(Core.addZone(d,zone('living',[[200,200],[800,200],[900,1000],[200,1000]])),zone('dining',[[800,200],[900,1000],[1400,1000],[1400,200]]));
const angleMoved=Core.editZoneBoundary(angled,'area_living',[[200,200],[850,200],[950,1000],[200,1000]]);
assert.equal(union(angleMoved.zones.map(z=>z.poly)),union(angled.zones.map(z=>z.poly)));
const plan=Core.build(moved),settings=Object.fromEntries(plan.rooms.map(r=>[r.id,{name:r.name,use:r.use||'other',mat:'wood'}]));settings.area_living.name='家庭客厅';settings.area_living.use='study';
const work={architecture:{draft:moved,phase:'survey'},rooms:settings,furniture:[],open:{},demolished:[],notes:[],measures:[]},loaded=P.unpack(P.pack({planId:d.id,current:work,designs:[],catalog:[]}));
assert.deepEqual(loaded.current.rooms,settings);assert.deepEqual(Core.build(loaded.current.architecture.draft).rooms,plan.rooms);
console.log('PASS atomic shared boundaries, T junctions, partial/sloped edges, no gaps/overlaps, stable metadata and roundtrip');
// Fractional DXF-to-canvas scales must not lose corners in microscopic slabs.
const pieces=[[[999.999997,5020.999886],[1000,5020.999886],[1000,8621],[999.999997,5020.99975]],[[1000,5020.999886],[3500,5020.999886],[3500,8621],[1000,8621]]],outlined=G.outline(pieces);
assert.ok(Math.abs(Math.abs(G.signed(outlined.poly))-G.area(pieces))<.01);
// Insert a shared node, bend it, then delete it on both sides of the boundary.
const noded=Core.insertZoneVertex(both,living.id,1,.35),newPoint=noded.zones[0].poly[2];
assert.equal(noded.zones[0].poly.length,5);assert.equal(noded.zones[1].poly.length,5);assert.ok(noded.zones[1].poly.some(p=>p[0]===newPoint[0]&&p[1]===newPoint[1]));
const bend=structuredClone(noded.zones[0].poly);bend[2][0]+=80;
const bent=Core.editZoneBoundary(noded,living.id,bend);assert.equal(union(bent.zones.map(z=>z.poly)),union(both.zones.map(z=>z.poly)));
const simplified=Core.deleteZoneVertex(bent,living.id,2);assert.equal(simplified.zones[0].poly.length,4);assert.equal(simplified.zones[1].poly.length,4);assert.deepEqual(simplified.zones,both.zones);
assert.deepEqual(Core.deleteZoneVertex(noded,living.id,2).zones,both.zones);
assert.throws(()=>Core.insertZoneVertex(both,living.id,1,0),/内部/);assert.throws(()=>Core.insertZoneVertex(both,living.id,1,1),/内部/);
assert.throws(()=>Core.deleteZoneVertex(both,living.id,99),/不存在/);
const triangle=Core.addZone(d,zone('triangle',[[200,200],[500,200],[300,500]]));assert.throws(()=>Core.deleteZoneVertex(triangle,'area_triangle',0),/三个/);
const outerCorner=Core.deleteZoneVertex(Core.addZone(d,living),living.id,0);assert.equal(outerCorner.zones[0].poly.length,3);assert.equal(P.quantities(Core.build(outerCorner)).net,P.quantities(Core.build(d)).net);
const partialNode=Core.insertZoneVertex(partial,'area_living',1,.4);assert.equal(partialNode.zones[1].poly.length,5);assert.equal(union(partialNode.zones.map(z=>z.poly)),union(partial.zones.map(z=>z.poly)));
const finalWork={...work,architecture:{draft:bent,phase:'survey'}},roundtrip=P.unpack(P.pack({planId:d.id,current:finalWork,designs:[],catalog:[]}));assert.deepEqual(roundtrip.current.architecture.draft.zones,bent.zones);assert.deepEqual(roundtrip.current.rooms,settings);
console.log('PASS shared vertex insertion, bending/deletion, minimum vertex count, partial adjacency and saved metadata');
const hundred=Core.addZone(d,zone('hundred',Array.from({length:100},(_,i)=>[600+200*Math.cos(i*Math.PI/50),600+200*Math.sin(i*Math.PI/50)])));assert.throws(()=>Core.insertZoneVertex(hundred,'area_hundred',0,.5),/100/);assert.equal(hundred.zones[0].poly.length,100);

