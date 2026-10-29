'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const A=require('../src/data/se2-blender-asset.js'),M=require('../src/render/bath-heater-model.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js');
const glb=fs.readFileSync(require.resolve('../assets/models/se2/se2-v1.glb'));
assert.equal(A.sourceSha256,crypto.createHash('sha256').update(glb).digest('hex'));
assert.deepEqual(A.sizeMm,[300,112,600]);assert.equal(new Set(A.parts.map(p=>p.identity)).size,A.parts.length);
for(const p of A.parts){assert(p.positions.length>0);assert.equal(p.positions.length,p.normals.length);assert.equal(p.positions.length%9,0);assert(p.positions.every(Number.isFinite));for(let i=0;i<p.normals.length;i+=3)assert(Math.abs(Math.hypot(...p.normals.slice(i,i+3))-1)<1e-6);}
const f={id:'asset',name:'SE2',type:'bath_heater_aopu_se2',w:300,d:600,h:112,mountHeight:2500,cx:0,cy:0,rot:0,color:'#badaee'};
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const dimensions of [{},{w:360,d:540,h:140},{mountHeight:0},{h:1}])for(const rot of [0,37,90,180])for(const flip of [false,true]){
  const item={...f,...dimensions,rot,flip},model=M.build(T,item),old=M.buildLegacySE2(T,item);
  assert.equal(model.userData.furnishAsset,'bath-heater-aopu-se2@1');assert.equal(model.children.length,old.children.length);
  for(const group of [model,old]){group.rotation.y=-rot*Math.PI/180;group.scale.x=flip?-1:1;group.updateMatrixWorld(true);}
  for(const mesh of model.children){const previous=old.children.find(m=>m.name===mesh.name);assert(previous);assert.equal(mesh.userData.furnishStablePart,previous.userData.furnishStablePart);const a=new T.Box3().setFromObject(mesh),b=new T.Box3().setFromObject(previous);for(const axis of ['x','y','z']){near(a.min[axis]*1000,b.min[axis]*1000);near(a.max[axis]*1000,b.max[axis]*1000);}assert(mesh.geometry.index.count>0);}
  assert.equal(model.children.find(m=>m.name==='face').material.color.getHexString(),'badaee');
 }
 for(const rot of [0,37,90,180])for(const flip of [false,true]){
  const device={...f,rot,flip},outline=G.bbox(G.footprints(device).flat()),wall={id:'obstacle',type:'block',cx:outline[2]+50+100,cy:0,w:100,d:2000,h:3000,rot:0};
  near(S.directional(device,{furniture:[wall]}).r.distance,100);
  assert(!G.volumeOverlap(device,wall));
  assert(G.volumeOverlap(device,{...wall,cx:outline[2]+50-.1}));
  assert(!G.volumeOverlap(device,{...wall,cx:outline[2]+50}));
  assert(!G.volumeOverlap(device,{...wall,cx:0,h:2500}));
  const enclosing={...wall,cx:0,w:2000,d:2000,h:3000};assert(S.directional(device,{furniture:[enclosing]}).r.containedBoundary);assert(G.volumeOverlap(device,enclosing));
 }
 const parts=G.bodyParts(f);assert(parts.length>10);assert(parts.every(p=>p.vertices?.length&&p.faces?.length));
 const snap={grid:1,scale:1,wallSnap:true,guides:false,rects:[[0,-1000,0,1000]],furniture:[]};
 for(const rot of [0,37,90])for(const flip of [false,true]){const item={...f,rot,flip},bounds=G.bbox(G.footprints(item).flat()),half=-bounds[0],proposed=half+6;near(S.move(item,proposed,0,snap).position[0],half);}
 console.log('PASS GLB provenance, shared mesh solids, legacy per-part dimensions/identity, resize/zero height, normals/recolor, directional gaps, touching/overlap, containment and vertical separation');
})().catch(e=>{console.error(e);process.exitCode=1;});
