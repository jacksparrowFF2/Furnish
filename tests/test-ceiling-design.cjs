'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../src/core/ceiling-core.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),{plan,work}=fixture(),room=plan.rooms[0];let n=0;const id=()=> 'design_'+n++;
for(const preset of ['low','wide','wash'])for(const reverse of [false,true])for(const angle of [0,Math.PI/5]){
 const r=copy(room),transform=([x,y])=>[Math.cos(angle)*x-Math.sin(angle)*y+15000,Math.sin(angle)*x+Math.cos(angle)*y-8000];
 r.poly=r.poly.map(transform);if(reverse)r.poly.reverse();delete r.rings;delete r.polys;
 const sections=C.sectionPreset(preset),items=C.designRegion(r,{style:'ring',height:2500,sections},id);
 assert.equal(items.length,preset==='wash'?3:2);assert.equal(C.resolve({version:1,items}).pending.length,0);
 assert.equal(C.derive({rooms:[{...r,ceilingHeight:2800}]},{ceilings:{version:1,items}}).ceilings.pending.length,0);
 const flat=items.find(c=>c.kind==='flat');assert(flat.polygon.every(p=>C.inside(p,r.poly)));assert.equal(flat.height,2500);
 for(const c of items.filter(c=>c.kind==='profile'))assert.equal(c.height-Math.max(...sections.flatMap(s=>s.section.vertices.map(v=>v.d))),2500);
 assert.equal(C.designRegion(r,{style:'ring',height:2500,sections,center:false},id).filter(c=>c.kind==='flat').length,0);
}
assert.deepEqual(C.designRegion(room,{style:'none'},id),[]);
assert.equal(C.designRegion(room,{style:'flat',height:0,thickness:.1},id)[0].height,0);
assert.throws(()=>C.designRegion(room,{style:'flat',height:2500,thickness:0},id));
assert.throws(()=>C.designRegion(room,{style:'flat',height:NaN},id));
assert.throws(()=>C.designRegion({...room,poly:[[0,0],[200,0],[200,200],[0,200]],rings:undefined},{style:'ring',height:2500,sections:C.sectionPreset('wide')},id));
assert.equal(C.designRegion({...room,poly:[[0,0],[3000,0],[3000,3000],[1000,4000],[0,3000]],rings:undefined},{style:'ring',height:2500},id).length,2);
const housing=C.sectionPreset('wash')[1].section,us=housing.vertices.map(v=>v.u),ds=housing.vertices.map(v=>v.d);assert.equal(Math.max(...us)-Math.min(...us),43.5);assert.equal(Math.max(...ds)-Math.min(...ds),18.5);assert.deepEqual(C.lightIssues(housing),[]);
const original=copy(work);original.ceilings={version:1,items:C.designRegion(room,{style:'ring',height:2500,sections:C.sectionPreset('wash')},id)};
const restore=W.create({makeId:id,colorFor:()=> '#ddd',materials:require('../src/data/catalog.js').materials}).restore;
original.ceilings=C.upgrade(original.ceilings);let saved=copy(original);for(let i=0;i<4;i++){const payload={planId:plan.id,current:saved,designs:[{name:'回型',work:saved}],catalog:[]},loaded=P.unpack(P.pack(payload));saved=restore(loaded.current,plan);assert.deepEqual(saved.ceilings,original.ceilings);assert.deepEqual(loaded.designs[0].work.ceilings,original.ceilings);}
const unknown=C.derive({...plan,rooms:plan.rooms.map(r=>({...r,ceilingHeight:undefined}))},saved);assert(unknown.ceilings.pending.some(p=>p.message.includes('高度待核对')));
console.log('PASS region styles, rotated/reversed closed ring, separate wash housing, boundary guards and repeated project restoration');
(async()=>{
 const THREE=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),M=require('../src/render/ceiling-model.js');
 const items=original.ceilings.items,model=M.build(THREE,C.resolve(original.ceilings));
 assert.equal(model.children.filter(c=>c.userData.ceiling.part==='section').length,2);
 for(const mesh of model.children){assert(mesh.geometry.attributes.position.array.every(Number.isFinite));assert(mesh.geometry.attributes.normal.array.every(Number.isFinite));}
 // Check the closed production sweep volume against an independent section
 // centroid integral of the shrinking rectangular perimeter.
 const profiles=items.filter(c=>c.kind==='profile'&&c.name.includes('石膏'));
 let measured=0;for(const mesh of model.children.filter(c=>profiles.some(p=>p.id===c.userData.ceiling.id))){const a=mesh.geometry.attributes.position.array;for(let i=0;i<a.length;i+=9){const A=new THREE.Vector3(...a.slice(i,i+3)),B=new THREE.Vector3(...a.slice(i+3,i+6)),D=new THREE.Vector3(...a.slice(i+6,i+9));measured+=A.dot(B.cross(D))/6;}}
 const shape=profiles[0].section.vertices.map(v=>[v.u,v.d]),perimeter=C.boundaryPaths(room).reduce((s,p)=>s+Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1]),0);
 // Integral of shrinking rectangular perimeter: P(u) = perimeter - 8u.
 let twice=0,cxSum=0;for(let i=0;i<shape.length;i++){const a=shape[i],b=shape[(i+1)%shape.length],cross=a[0]*b[1]-b[0]*a[1];twice+=cross;cxSum+=(a[0]+b[0])*cross;}const A=Math.abs(twice/2),cx=cxSum/(3*twice),expected=A*(perimeter-8*cx)/1e9;
 assert(Math.abs(measured-expected)<1e-6,`${measured} != ${expected}`);
 const flat=model.children.find(m=>m.userData.ceiling.part==='flat'),box=new THREE.Box3().setFromObject(flat);assert(Math.abs(box.min.y-2.5)<1e-6);assert(Math.abs(box.max.y-2.512)<1e-6);
 console.log('PASS production closed-ring volume, finite geometry and central-board elevation/thickness');
})().catch(e=>{console.error(e);process.exitCode=1;});
