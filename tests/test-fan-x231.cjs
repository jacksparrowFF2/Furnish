'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const A=require('../src/data/fan-x231-blender-asset.js'),M=require('../src/render/circulator-model.js'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js');
const f={id:'fan',type:'fan_airmate_fa18_x231',name:'循环扇',w:300,d:300,h:1100,cx:0,cy:0,rot:0,color:'#eeeee9'},near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`);
assert.equal(A.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../assets/models/fan-x231/v1/fan-x231-v1.glb'))).digest('hex'));
assert.equal(A.parts.length,28);assert.equal(new Set(A.parts.map(p=>p.identity)).size,28);assert.equal(P.height({...f,h:undefined}),1100);
assert.equal(A.parts.filter(p=>/^blade-\d$/.test(p.name)).length,3);
assert(A.parts.some(p=>p.name==='front-swirl-grille'));assert(A.parts.some(p=>p.name==='u-cradle'));
for(const p of A.parts){assert(p.positions.every(Number.isFinite));assert.equal(p.positions.length,p.normals.length);for(let i=0;i<p.normals.length;i+=3)near(Math.hypot(...p.normals.slice(i,i+3)),1);}
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const dimensions of [{},{w:360,d:330,h:1250}]){
  const item={...f,...dimensions},model=M.build(T,item),b=new T.Box3().setFromObject(model);near(b.min.y,0);
  for(const [axis,size]of [['x',item.w],['y',item.h],['z',item.d]])near((b.max[axis]-b.min[axis])*1000,size);
  assert.equal(model.children.length,28);assert.equal(model.userData.furnishAsset,'fan-airmate-fa18-x231@1');
 }
 assert.equal(G.bodyParts(f).length,28);
 for(const rot of [0,37,90])for(const flip of [false,true]){
  const item={...f,rot,flip},bounds=G.bbox(G.footprints(item).flat()),wall={id:'wall',type:'block',cx:bounds[2]+150,cy:0,w:100,d:2500,h:1500,rot:0};
  near(S.directional(item,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(item,wall));
  const enclosing={...wall,cx:0,w:2000,d:2000};assert(G.volumeOverlap(item,enclosing));assert(S.directional(item,{furniture:[enclosing]}).r.containedBoundary);
  const solid={id:'solid',type:'block',cx:0,cy:0,w:100,d:100,h:100,mountHeight:610,rot:0};assert(G.volumeOverlap(item,solid));assert(!G.volumeOverlap(item,{...solid,mountHeight:1200}));
  assert(G.volumeOverlap(item,{...solid,h:undefined}));
  const snap={grid:1,scale:1,wallSnap:true,guides:false,rects:[[0,-1500,0,1500]],furniture:[]},half=-bounds[0];near(S.move(item,half+6,0,snap).position[0],half);
 }
 const packed=J.pack({planId:'fan-plan',current:{furniture:[f]},designs:[{name:'循环扇方案',work:{furniture:[f]}}],catalog:[]}),restored=J.unpack(packed);assert.deepEqual(restored.current.furniture,[f]);assert.deepEqual(restored.designs[0].work.furniture,[f]);
 const validated=J.validateWork({furniture:[f]});assert.deepEqual(J.validateWork(validated),validated);
 assert(require('../src/data/catalog.js').library.flatMap(c=>c.items).some(i=>i[0]===f.type));
 console.log('PASS FA18-X231 provenance, 28 production parts, normals, dimensions/resize, shared solids, directional distances, containment, rotation/mirror, collision/height, snapping and project roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
