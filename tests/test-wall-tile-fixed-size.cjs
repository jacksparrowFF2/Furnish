'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),T=require('../src/core/wall-tiling-core.js'),F=require('../src/core/floor-finish-core.js'),P=require('../src/core/project-core.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`),{plan,work}=fixture({partition:true}),ids=plan.rooms.map(r=>r.id),ep=w=>P.effectivePlan(plan,w);
for(const [i,id] of ids.entries())work.rooms[id]={...work.rooms[id],use:i?'bathroom':'balcony',mat:'tile800'};
work.floorFinishes={version:1,areas:Object.fromEntries(ids.map(id=>[id,{mode:'layers',rawZ:0,baseThickness:45,tileThickness:10,layout:{width:800,height:400,gap:2,angle:0,origin:[-125.5,312.25]}}]))};
const original=T.setEnabled(work,ep(work),ids,true),legacy=copy(original);
for(const s of legacy.wallTiling.surfaces)s.layout={...s.layout,width:400,height:300,angle:90,startHeight:17};
legacy.wallTiling.surfaces[0].enabled=false;
const resized=T.setSize(legacy,ep(legacy),ids,{width:800,height:400});
for(const [i,s] of resized.wallTiling.surfaces.entries())assert.deepEqual(s,{...legacy.wallTiling.surfaces[i],layout:{...legacy.wallTiling.surfaces[i].layout,width:800,height:400,angle:0}});
assert.equal(legacy.wallTiling.surfaces[0].layout.width,400,'no implicit migration');
for(const width of [19,6001,NaN])assert.throws(()=>T.setSize(legacy,ep(legacy),ids,{width,height:400}));
assert.throws(()=>T.setSize(legacy,ep(legacy),[ids[0],'missing'],{width:800,height:400}));
assert.deepEqual(T.setSize(original,ep(original),ids,{width:800,height:400}),original);
const linked=T.alignFloor(original,ep(original),ids),fixed=copy(linked.wallTiling);
for(const angle of [0,90,180,270])for(const wallAngle of [0,90]){
 const next=copy(linked);for(const a of Object.values(next.floorFinishes.areas))a.layout={width:600,height:300,gap:3,angle,origin:[-357.25,111.5]};
 for(const s of next.wallTiling.surfaces)s.layout.angle=wallAngle;
 const p=ep(next);
 for(const e of p.wallTiling.surfaces){
  assert.equal(e.layout.width,800);assert.equal(e.layout.height,400);assert.equal(e.layout.gap,2);assert(e.alignmentNote.includes('不能连续对齐'));assert(!e.alignmentPending);assert(T.cells(e).length);
  // The first forward floor tile edge anchors a wall tile edge even on reversed faces.
  const floor=p.floorFinish.areas[e.face.roomId].layout,point=[0,0];point[e.axis]=e.zero;point[e.normal]=e.position;
  const q=F.transform(floor,point,true);point[e.axis]+=e.dir;const dq=F.transform(floor,point,true).map((v,i)=>v-q[i]),k=Math.abs(dq[0])>.5?0:1,size=k?floor.height:floor.width,pitch=size+floor.gap,left=dq[k]>0?-q[k]:q[k]-size,anchor=((left%pitch)+pitch)%pitch;
  const wallSize=wallAngle===90?400:800,wallQ=F.transform(T.grid(e),[anchor,e.originZ],true)[wallAngle===90?1:0],mod=((wallQ%(wallSize+2))+(wallSize+2))%(wallSize+2);
  near(Math.min(mod,Math.abs(mod-wallSize),Math.abs(mod-wallSize-2)),0);
 }
}
let restored=linked;for(let i=0;i<4;i++){restored=P.unpack(P.pack({planId:plan.id,current:restored,designs:[{name:'fixed',work:restored}],catalog:[]})).current;assert.deepEqual(restored.wallTiling,fixed);assert(ep(restored).wallTiling.surfaces.every(e=>e.layout.width===800&&e.layout.height===400));}
(async()=>{
 const THREE=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),M=require('../src/render/wall-tiling-model.js'),p=ep(linked),model=M.build(THREE,p);
 assert(model.children.length);
 for(const mesh of model.children){const pos=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,r=mesh.userData.wallTiling.rect;near(Math.abs(uv.getX(1)-uv.getX(0)),(r[2]-r[0])/802);near(Math.abs(uv.getY(2)-uv.getY(1)),(r[3]-r[1])/402);near((pos.getY(2)-pos.getY(1))*1000,r[3]-r[1]);}
 console.log('PASS fixed 800x400 wall tile specification through bulk edits, mismatched floor axes/gaps, rotated and reversed faces, first-joint phase, project roundtrips and production 802x402 UV pitch');
})().catch(e=>{console.error(e);process.exitCode=1;});
