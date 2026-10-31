'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const A=require('../src/data/sofa-bed-blender-asset.js'),M=require('../src/render/sofa-bed-model.js'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),C=require('../src/core/sofa-bed-core.js');
const f={id:'sofa',name:'沙发床',type:'sofa_bed_yeswood_y107h03',w:1250,d:838,h:770,cx:0,cy:0,rot:0,color:'#c89d68'},near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`);
assert.equal(A.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../assets/models/sofa-bed/v2/sofa-bed-v1.glb'))).digest('hex'));
assert.equal(A.parts.length,49);assert.equal(new Set(A.parts.map(p=>p.identity)).size,49);assert.deepEqual(A.parts.map(p=>p.name).sort(),C.spec().parts.map(p=>p.name).sort());
assert.equal(P.height({...f,h:undefined}),770);
const back=A.parts.find(p=>p.name==='back-cushion').positions.filter((_,i)=>i%3===1);near((Math.max(...back)-Math.min(...back))*1000,560);
for(const side of ['left','right']){const y=A.parts.find(p=>p.name==='metal-runner-'+side).positions.filter((_,i)=>i%3===1);near(Math.min(...y)*1000,85);}
for(const name of ['seat-upper','seat-lower']){
 const part=A.parts.find(p=>p.name===name),ranges=[0,1,2].map(k=>part.positions.filter((_,i)=>i%3===k));
 for(const [k,expected]of [[0,1180],[1,50],[2,760]])near((Math.max(...ranges[k])-Math.min(...ranges[k]))*1000,expected);
 if(name==='seat-upper')near(Math.max(...ranges[1])*1000,400);
}
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const item of [f,{...f,w:1400,d:900,h:820}]){
  const model=M.build(T,item),b=new T.Box3().setFromObject(model);near(b.min.y,0);
  for(const [axis,size]of [['x',item.w],['y',item.h],['z',item.d]])near((b.max[axis]-b.min[axis])*1000,size);
  assert.equal(model.children.length,49);assert.equal(model.userData.furnishAsset,'sofa-bed-yeswood-y107h03@1');
  for(const mesh of model.children){assert(mesh.geometry.index.count>0);assert.equal(mesh.userData.furnishStablePart,'sofa-bed-v1:'+mesh.name);}
 }
 for(const rot of [0,37,90])for(const flip of [false,true]){
  const item={...f,rot,flip},b=G.bbox(G.footprints(item).flat()),wall={id:'wall',type:'block',cx:b[2]+150,cy:0,w:100,d:3000,h:1500,rot:0};
  near(S.directional(item,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(item,wall));
  const enclosing={...wall,cx:0,w:2500,d:2500};assert(G.volumeOverlap(item,enclosing));assert(S.directional(item,{furniture:[enclosing]}).r.containedBoundary);
  const solid={id:'solid',type:'block',cx:0,cy:0,w:100,d:100,h:20,mountHeight:360,rot:0};assert(G.volumeOverlap(item,solid));assert(!G.volumeOverlap(item,{...solid,mountHeight:1000}));
  const snap={grid:1,scale:1,wallSnap:true,guides:false,rects:[[0,-2000,0,2000]],furniture:[]},half=-b[0];near(S.move(item,half+6,0,snap).position[0],half);
 }
 assert.equal(G.bodyParts(f).length,49);
 const contact={id:'contact',type:'block',cx:0,cy:460,w:100,d:100,h:20,mountHeight:360,rot:0};assert(!G.volumeOverlap(f,contact));assert(G.volumeOverlap(f,{...contact,cy:459.9}));
 assert(G.volumeOverlap(f,{...contact,type:'unknown-device',h:undefined,cy:0}));
 const packed=J.pack({planId:'sofa-plan',current:{furniture:[f]},designs:[{name:'沙发床方案',work:{furniture:[f]}}],catalog:[]}),restored=J.unpack(packed);assert.deepEqual(restored.current.furniture,[f]);assert.deepEqual(restored.designs[0].work.furniture,[f]);
 let work=restored.current;for(let i=0;i<3;i++){const next=J.validateWork(work);assert.deepEqual(next,work);work=next;}
 console.log('PASS Y107H03: provenance, 49 production parts, reference dimensions, 400mm seat, resize, rotation/mirror, distance/contact/containment/collision/height/unknown, snapping and project/named-design roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
