'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),F=require('../src/core/floor-finish-core.js'),T=require('../src/core/wall-tiling-core.js'),P=require('../src/core/project-core.js'),C=require('../src/core/floorplan-core.js'),Z=require('../src/core/zone-geometry.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`),copy=v=>JSON.parse(JSON.stringify(v));
const base=fixture({partition:true});base.draft.openings=[{id:'door',wall:'middle',kind:'door',t:.5,length:900,side:1,entry:false}];const plan=C.build(base.draft),work=base.work,[a,b]=plan.rooms.map(r=>r.id);work.architecture.draft=plan.customDraft;
for(const id of [a,b])work.rooms[id]={...work.rooms[id],mat:'tile800',use:id===a?'kitchen':'bathroom'};
work.floorFinishes={version:1,areas:Object.fromEntries([a,b].map(id=>[id,{mode:'layers',rawZ:0,tileThickness:10,baseThickness:id===a?50:45,layout:{width:800,height:400,gap:2,angle:0,origin:[-125.5,312.25]}}]))};
const original=copy(work),ep=P.effectivePlan(plan,work),d=plan.doors[0],portal=ep.floorFinish.doorways;
near(Z.area(portal.flatMap(v=>v.room.polys)),(d.rect[2]-d.rect[0])*(d.rect[3]-d.rect[1]));assert.equal(new Set(portal.map(p=>p.finishedZ)).size,2);
for(const p of portal){assert.deepEqual(p.layout,work.floorFinishes.areas[p.roomId].layout);const q=p.room.polys[0].reduce((sum,v)=>sum.map((n,i)=>n+v[i]/p.room.polys[0].length),[0,0]);assert(F.at(ep,q).some(v=>v.finishedZ===p.finishedZ));}
assert.deepEqual(work,original);assert.equal(P.effectivePlan(plan,{...work,floorFinishes:undefined}).floorFinish,undefined);
const unknown=copy(work);delete unknown.floorFinishes.areas[a].tileThickness;assert(P.effectivePlan(plan,unknown).floorFinish.doorways.some(p=>p.roomId===a&&p.finishedZ===undefined));
const entryBase=fixture({openings:true}),entryWork=F.setLayers(entryBase.work,entryBase.plan,[entryBase.plan.rooms[0].id],{rawZ:0,tileThickness:10,baseThickness:50}),entry=P.effectivePlan(entryBase.plan,entryWork);near(Z.area(entry.floorFinish.doorways.flatMap(p=>p.room.polys)),900*200);
const sameLevel=copy(work);sameLevel.floorFinishes.areas[b].baseThickness=50;assert.equal(P.effectivePlan(plan,sameLevel).floorFinish.steps.length,0);assert.equal(P.effectivePlan(plan,unknown).floorFinish.steps.length,0);
const window=entryBase.plan.wins[0].rect;assert(!entry.floorFinish.doorways.some(p=>p.room.polys.some(poly=>Z.inside([(window[0]+window[2])/2,(window[1]+window[3])/2],poly))),'windows never receive doorway floors');
const slidePlan={...plan,slides:plan.doors,doors:[]};assert(F.derive(slidePlan,work).floorFinish.doorways.every(p=>p.kind==='slide'));
const tiled=T.setEnabled(work,ep,[a,b],true),faces=T.faces(ep,tiled),fraction=v=>((v%1)+1)%1;
for(const floorAngle of [0,90,180,270])for(const wallAngle of [0,90]){
 const w=copy(tiled);for(const s of Object.values(w.floorFinishes.areas))s.layout.angle=floorAngle;
 const p=P.effectivePlan(plan,w);
 for(const face of faces){
  const floor=w.floorFinishes.areas[face.roomId].layout,size=(face.axis===0)===(floorAngle%180===0)?floor.width:floor.height,old={...T.defaults(),[wallAngle===90?'height':'width']:size,angle:wallAngle,startHeight:17,reference:'survey'},l=T.floorAlignment(p,w,face,old),e=T.elevation(p,w,face,l);
  assert.equal(l.startHeight,17);assert.equal(l.reference,'survey');assert.equal(l[wallAngle===90?'width':'height'],old[wallAngle===90?'width':'height']);
  const at=[0,0];at[e.axis]=e.zero;at[e.normal]=e.position;const q0=F.transform(floor,at,true);at[e.axis]+=e.dir;const q1=F.transform(floor,at,true),da=q1.map((v,i)=>v-q0[i]),ka=Math.abs(da[0])>.5?0:1,sz=ka===0?floor.width:floor.height;
  const samples=[13.3,58.7,123.45,401.25,799.1,801.3,1204.7,...[-1,0,1].flatMap(k=>[sz+floor.gap/2,sz/2].map(t=>(t+k*(sz+floor.gap)-q0[ka])/da[ka]))];
  for(const u of samples){
   const point=[0,0];point[e.axis]=e.zero+e.dir*u;point[e.normal]=e.position;
   const f=F.transform(floor,point,true),n=[...point];n[e.axis]+=e.dir;const fn=F.transform(floor,n,true),axis=Math.abs(fn[0]-f[0])>.5?0:1,size=axis===0?floor.width:floor.height,q=F.transform(T.grid(e),[u,e.originZ],true),wallAxis=wallAngle===90?1:0;
   const floorGap=fraction(f[axis]/(size+floor.gap))>size/(size+floor.gap),wallGap=fraction(q[wallAxis]/(size+l.gap))>size/(size+l.gap);
   assert.equal(wallGap,floorGap,`joint phase ${floorAngle}/${wallAngle}/${e.dir}/${u}`);
  }
 }
}
const aligned=T.alignFloor(tiled,ep,[a,b]);assert.deepEqual(aligned.floorFinishes,tiled.floorFinishes);assert.deepEqual(aligned.furniture,tiled.furniture);assert(aligned.wallTiling.surfaces.every(s=>s.layout.reference==='floor'&&s.layout.startHeight===0));
const diagonal=copy(tiled);diagonal.floorFinishes.areas[b].layout.angle=37;const diagonalBefore=copy(diagonal);assert.throws(()=>T.alignFloor(diagonal,P.effectivePlan(plan,diagonal),[a,b]),/不平行/);assert.deepEqual(diagonal,diagonalBefore);
const noFloor=copy(tiled);noFloor.floorFinishes.areas[a].enabled=false;assert.throws(()=>T.alignFloor(noFloor,P.effectivePlan(plan,noFloor),[a]));
let restored=aligned;for(let i=0;i<3;i++){restored=P.unpack(P.pack({planId:plan.id,current:restored,designs:[{name:'对缝',work:restored}],catalog:[]})).current;assert.deepEqual(restored.wallTiling,aligned.wallTiling);assert.deepEqual(restored.floorFinishes,aligned.floorFinishes);}
(async()=>{
 const THREE=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),M=require('../src/render/floor-finish-model.js');
 const edges=M.stepEdges(THREE,ep.floorFinish.steps);assert(edges.children.length);for(const mesh of edges.children){const box=new THREE.Box3().setFromObject(mesh);near((box.max.y-box.min.y)*1000,5);}
 const scene=new THREE.Group();for(const area of F.surfaces(ep)){scene.add(M.surface(THREE,area.room,area));scene.add(M.layers(THREE,area.room,area));}scene.updateMatrixWorld(true);
 for(const p of portal){const poly=p.room.polys[0],q=poly.reduce((sum,v)=>sum.map((n,i)=>n+v[i]/poly.length),[0,0]),ray=new THREE.Raycaster(new THREE.Vector3(q[0]/1000,1,q[1]/1000),new THREE.Vector3(0,-1,0)),hits=ray.intersectObjects(scene.children,true);assert(hits.length);near(hits[0].point.y*1000,p.finishedZ);assert(hits[0].object.userData.floor,'textured surface must own the visible top, not an untextured layer cap');}
 for(const mesh of scene.children.filter(m=>m.userData.floor)){assert(mesh.geometry.attributes.uv.array.every(Number.isFinite));}
 console.log('PASS production doorway ray hits at 60/55 mm, exposed textured surface, complete opening coverage, legacy/unknown/sliding, wall-floor joint phases for 0/90/180/270 and both wall directions, atomic edits and project recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
