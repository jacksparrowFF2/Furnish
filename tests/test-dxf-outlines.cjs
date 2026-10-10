'use strict';
const assert=require('node:assert/strict'),DXF=require('../src/io/dxf-import.js'),Outline=require('../src/io/dxf-outline.js'),Core=require('../src/core/floorplan-core.js'),Project=require('../src/core/project-core.js');
const poly=(layer,points)=>`0\nLWPOLYLINE\n8\n${layer}\n70\n1\n${points.map(p=>`10\n${p[0]}\n20\n${p[1]}\n`).join('')}`;
const rect=(layer,r)=>poly(layer,[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]]);
const source=(factor=1)=>`0\nSECTION\n2\nENTITIES\n${[['承重墙',[0,0,200,4000]],['房屋',[5800,0,6000,4000]],['房屋',[200,0,5800,200]],['房屋',[200,3800,1500,4000]],['房屋',[2700,3800,5800,4000]],['窗户',[1500,3800,2700,4000]]].map(([l,r])=>rect(l,r.map(v=>v/factor))).join('')}0\nCIRCLE\n5\nA1\n8\n下水\n10\n${1000/factor}\n20\n${1200/factor}\n40\n${75/factor}\n0\nCIRCLE\n5\nA2\n8\n燃气\n10\n${2000/factor}\n20\n${900/factor}\n40\n${60/factor}\n0\nENDSEC\n0\nEOF\n`;
const opts={layers:['房屋','承重墙'],layerKinds:{房屋:'n',承重墙:'b'},mmPerUnit:1,name:'轮廓回归',id:'custom_outline_test'};
const parsed=DXF.parse(source()),before=structuredClone(parsed),result=Outline.convert(parsed,opts),draft=result.draft,plan=Core.build(draft);
assert.equal(plan.rooms.length,1);assert.equal(Project.area(plan.rooms[0].poly),20.16);
assert.equal(draft.walls.filter(w=>w.kind==='b').length,1);
assert.equal(plan.wins.length,1);assert.equal(draft.openings[0].length,1200);
assert.equal(draft.openings[0].review,'window-height');
assert.equal(plan.markers.length,2);assert.equal(plan.markers[0].radius,75);
assert.deepEqual(plan.markers.map(m=>m.kind),['drain','gas']);
const t=draft.sourceTransform,back=m=>[m.at[0]*draft.scale+t.x0-t.pad,t.y1+t.pad-m.at[1]*draft.scale];
assert.deepEqual(draft.markers.map(back),[[1000,1200],[2000,900]]);
assert.deepEqual(parsed,before);
const cm=Outline.convert(DXF.parse(source(10)),{...opts,mmPerUnit:10});
assert.equal(Core.build(cm.draft).rooms.length,1);assert.equal(Project.area(Core.build(cm.draft).rooms[0].poly),20.16);
assert.deepEqual(cm.draft.markers,draft.markers);
const packed=Project.pack({planId:draft.id,current:{furniture:[],architecture:{draft,phase:'survey'}},designs:[],catalog:[]});
const restored=Project.unpack(packed).current.architecture.draft;
assert.deepEqual(restored.markers,draft.markers);assert.deepEqual(restored.sourceGeometry,draft.sourceGeometry);assert.deepEqual(Core.build(restored).wins,plan.wins);
assert.ok(Project.readiness(plan,{furniture:[],architecture:{draft,phase:'survey'}}).items.some(i=>i.message.includes('未提供高度')));
const reviewed=Core.editOpening(draft,draft.openings[0].id,{sill:900,head:2400});assert.equal(reviewed.openings[0].review,undefined);
assert.equal(Core.editOpening(draft,draft.openings[0].id,{side:-1}).openings[0].review,'window-height');
const bad=structuredClone(draft);bad.markers[0].at=[-1,0];assert.throws(()=>Core.build(bad),/service point/);
bad.markers=draft.markers.map(m=>({...m,id:'dup'}));assert.throws(()=>Core.build(bad),/service point/);
assert.throws(()=>Outline.convert(parsed,{...opts,layerKinds:{房屋:'n'}}),/Assign/);
assert.throws(()=>Core.build(Outline.convert(parsed,{...opts,windowHead:800}).draft),/窗台高/);
// Orthogonal L and T profiles must reproduce the filled region, including corners.
const regions=[[[0,0],[2000,0],[2000,200],[200,200],[200,2400],[0,2400]],[[0,0],[2000,0],[2000,200],[1100,200],[1100,1500],[900,1500],[900,200],[0,200]]];
const inside=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
for(const poly of regions){const bands=Outline.bands(poly);for(let y=-50;y<2500;y+=37)for(let x=-50;x<2100;x+=41)assert.equal(bands.some(r=>x>r[0]&&x<r[2]&&y>r[1]&&y<r[3]),inside([x,y],poly));}
assert.throws(()=>Outline.bands([[0,0],[50,0],[50,2000],[0,2000]]),/sliver/);
const doorSource=source().replace(rect('房屋',[200,0,5800,200]),rect('房屋',[200,0,2000,200])+rect('房屋',[3000,0,5800,200]));
const doorResult=Outline.convert(DXF.parse(doorSource),opts),doorPlan=Core.build(doorResult.draft);
assert.equal(doorResult.stats.doors,1);assert.equal(doorPlan.doors[0].len,1000);assert.equal(doorPlan.doors[0].entry,true);assert.equal(doorPlan.rooms.length,1);
const inferredDoor=doorResult.draft.openings.find(o=>o.kind==='door');assert.equal(inferredDoor.review,'door-gap');
assert.equal(Core.editOpening(doorResult.draft,inferredDoor.id,{t:.5,length:1000}).openings.find(o=>o.kind==='door').review,undefined);
assert.throws(()=>Core.build(Outline.convert(DXF.parse(doorSource),{...opts,closeDoorGaps:false}).draft),/No enclosed room/);
const missingWindow=source().replace(rect('窗户',[1500,3800,2700,4000]),rect('窗户',[1600,3800,2700,4000]));
assert.throws(()=>Outline.convert(DXF.parse(missingWindow),opts),/both ends/);
console.log('PASS exact outline regions, window holes, local bearing type, marker coordinates/radius, cm conversion, project roundtrip, review state and invalid geometry rejection');

// A beam crosses the entire room and a window: it must neither divide the
// ground space nor block its window; its projection survives project reload.
const beamSource=source().replace('0\nENDSEC',rect('房梁',[0,1800,6000,2000])+rect('房梁',[1400,3700,2800,4000])+'0\nENDSEC');
const beamResult=Outline.convert(DXF.parse(beamSource),opts),beamPlan=Core.build(beamResult.draft);
assert.equal(DXF.layerRole('房梁').role,'beam');assert.equal(DXF.layerRole('A_BEAM').role,'beam');
assert.equal(beamResult.stats.beams,2);assert.equal(beamPlan.beams.length,2);
assert.deepEqual(beamPlan.rooms,plan.rooms);assert.deepEqual(beamPlan.walls,plan.walls);assert.deepEqual(beamPlan.wins,plan.wins);
const beamProject=Project.pack({planId:beamResult.draft.id,current:{furniture:[],architecture:{draft:beamResult.draft,phase:'survey'}},designs:[],catalog:[]});
assert.deepEqual(Project.unpack(beamProject).current.architecture.draft.beams,beamResult.draft.beams);
assert.throws(()=>Outline.convert(DXF.parse(beamSource),{...opts,beamLayers:['房屋']}),/separate/);
const invalidBeam=structuredClone(beamResult.draft);invalidBeam.beams[0].poly[0]=[-1,0];assert.throws(()=>Core.build(invalidBeam),/overhead beam/);
console.log('PASS overhead beam preservation, no room/ground area/window interference and project roundtrip');
