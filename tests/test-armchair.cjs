'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),url=require('node:url');
const A=require('../src/data/armchair-blender-asset.js'),M=require('../src/render/armchair-model.js'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js');
const f={id:'chair',name:'单人沙发',type:'armchair_yeswood_y09hs',w:725,d:900,h:905,cx:0,cy:0,rot:0,color:'#be9465'},near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`);
assert.equal(A.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../assets/models/armchair/v4/armchair-v1.glb'))).digest('hex'));
assert.equal(A.parts.length,28);assert.equal(new Set(A.parts.map(p=>p.identity)).size,28);assert.equal(P.height({...f,h:undefined}),905);
const seatY=A.parts.find(p=>p.name==='seat-cushion').positions.filter((_,i)=>i%3===1);near(Math.max(...seatY)*1000,460);near((Math.max(...seatY)-Math.min(...seatY))*1000,120);
for(const p of A.parts){assert(p.positions.every(Number.isFinite));assert.equal(p.positions.length,p.normals.length);for(let i=0;i<p.normals.length;i+=3)near(Math.hypot(...p.normals.slice(i,i+3)),1);}
(async()=>{
const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
for(const dimensions of [{},{w:870,d:1080,h:1086}]){
 const item={...f,...dimensions},model=M.build(T,item),b=new T.Box3().setFromObject(model);near(b.min.y,0);for(const [axis,size]of [['x',item.w],['y',item.h],['z',item.d]])near((b.max[axis]-b.min[axis])*1000,size);
 assert.equal(model.userData.furnishAsset,'armchair-yeswood-y09hs@1');assert.equal(model.children.length,28);
 for(const mesh of model.children){assert(mesh.geometry.index.count>0);assert.equal(mesh.userData.furnishStablePart,'armchair-v1:'+mesh.name);}
}
for(const rot of [0,37,90])for(const flip of [false,true]){
 const item={...f,rot,flip},bounds=G.bbox(G.footprints(item).flat()),wall={id:'wall',type:'block',cx:bounds[2]+150,cy:0,w:100,d:2500,h:1500,rot:0};
 near(S.directional(item,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(item,wall));
 const enclosing={...wall,cx:0,w:2000,d:2000};assert(G.volumeOverlap(item,enclosing));assert(S.directional(item,{furniture:[enclosing]}).r.containedBoundary);
 const solid={id:'solid',type:'block',cx:0,cy:0,w:100,d:100,h:100,mountHeight:380,rot:0};assert(G.volumeOverlap(item,solid));assert(!G.volumeOverlap(item,{...solid,mountHeight:1100}));
 const snap={grid:1,scale:1,wallSnap:true,guides:false,rects:[[0,-1500,0,1500]],furniture:[]},half=-bounds[0];near(S.move(item,half+6,0,snap).position[0],half);
}
const parts=G.bodyParts(f);assert.equal(parts.length,28);assert(parts.every(p=>p.vertices?.length&&p.faces?.length));
const seatZ=A.parts.filter(p=>['seat-cushion','seat-front-seam'].includes(p.name)).flatMap(p=>p.positions.filter((_,i)=>i%3===2)),front=Math.max(...seatZ)*1000,contact={id:'contact',type:'block',cx:0,cy:front+50,w:100,d:100,h:30,mountHeight:385,rot:0};
assert(!G.volumeOverlap(f,contact));assert(G.volumeOverlap(f,{...contact,cy:contact.cy-.1}));assert(G.volumeOverlap(f,{...contact,type:'unknown-device',h:undefined,cy:0}));
const noDrift=J.validateWork({furniture:[f]});assert.deepEqual(J.validateWork(noDrift),noDrift);
const packed=J.pack({planId:'chair-plan',current:{furniture:[f]},designs:[{name:'沙发方案',work:{furniture:[f]}}],catalog:[]}),restored=J.unpack(packed);assert.deepEqual(restored.current.furniture,[f]);assert.deepEqual(restored.designs[0].work.furniture,[f]);
console.log('PASS armchair provenance, 28 production parts, bounds, resize, defaults, normals, rotation/mirror, spacing, containment, collision/height, snapping and project/named-design roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
