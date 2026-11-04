'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const A=require('../src/data/cat-tower-blender-asset.js'),M=require('../src/render/cat-tower-model.js'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js');
const f={id:'tower',type:'cat_tower_jd_10141711472484',name:'通天柱套餐二',w:800,d:470,h:2400,cx:0,cy:0,rot:0,color:'#dfc79d'},near=(a,b)=>assert(Math.abs(a-b)<.03,`${a} != ${b}`);
assert.equal(A.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../assets/models/cat-tower/v2/cat-tower-v1.glb'))).digest('hex'));
assert.equal(A.parts.length,60);assert.equal(new Set(A.parts.map(p=>p.identity)).size,60);assert.equal(P.height({...f,h:undefined}),2400);
assert.throws(()=>P.validate({...f,h:2099}));assert.throws(()=>P.validate({...f,h:2751}));
for(const p of A.parts){assert(p.positions.every(Number.isFinite));assert.equal(p.positions.length,p.normals.length);if(p.material.transparent)assert(['left-acrylic-bowl','right-acrylic-bowl','left-bowl-rim','right-bowl-rim'].includes(p.name));}
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const h of [2100,2400,2750]){
  const item={...f,h},model=M.build(T,item),b=new T.Box3().setFromObject(model);near(b.min.y,0);
  for(const [axis,size]of [['x',800],['y',h],['z',470]])near((b.max[axis]-b.min[axis])*1000,size);
  assert.equal(model.children.length,60);assert.equal(model.userData.furnishAsset,'cat-tower-jd-10141711472484@1');
  const shelf=new T.Box3().setFromObject(model.getObjectByName('upper-platform'));near(shelf.min.y*1000,1791);near(shelf.max.y*1000,1809);
  const glass=model.getObjectByName('left-acrylic-bowl');assert(glass.material.transparent);near(glass.material.opacity,.24);
  assert.equal(G.bodyParts(item).length,60);
 }
 for(const rot of [0,37,90])for(const flip of [false,true]){
  const item={...f,rot,flip},bounds=G.bbox(G.footprints(item).flat()),wall={id:'wall',type:'block',cx:bounds[2]+150,cy:0,w:100,d:2500,h:3000,rot:0};
  near(S.directional(item,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(item,wall));
  const enclosing={...wall,cx:0,w:2000,d:2000};assert(G.volumeOverlap(item,enclosing));assert(S.directional(item,{furniture:[enclosing]}).r.containedBoundary);
  const solid={id:'solid',type:'block',cx:0,cy:0,w:30,d:30,h:100,mountHeight:610,rot:0};assert(G.volumeOverlap(item,solid));assert(!G.volumeOverlap(item,{...solid,mountHeight:2800}));assert(G.volumeOverlap(item,{...solid,h:undefined}));
  const snap={grid:1,scale:1,wallSnap:true,guides:false,rects:[[0,-1500,0,1500]],furniture:[]},half=-bounds[0];near(S.move(item,half+6,0,snap).position[0],half);
 }
 const restored=J.unpack(J.pack({planId:'cat-plan',current:{furniture:[f]},designs:[{name:'猫架',work:{furniture:[f]}}],catalog:[]}));assert.deepEqual(restored.current.furniture,[f]);assert.deepEqual(restored.designs[0].work.furniture,[f]);
 const v=J.validateWork({furniture:[f]});assert.deepEqual(J.validateWork(v),v);
 assert.equal(P.height({type:'cat_tree'}),1430);
 console.log('PASS cat tower provenance, 60 production parts, telescopic endpoints, fixed tiers, shared solids/distance/collision/snapping, rotation/mirror and project roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
