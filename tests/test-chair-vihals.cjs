'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const A=require('../src/data/chair-vihals-blender-asset.js'),M=require('../src/render/folding-chair-model.js'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js');
const f={id:'vihals',type:'chair_ikea_vihals',name:'VIHALS',w:430,d:470,h:800,cx:0,cy:0,rot:0,color:'#eeeee7'},near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`);
assert.equal(A.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../assets/models/chair-vihals/v1/chair-vihals-v1.glb'))).digest('hex'));
assert.equal(A.parts.length,15);assert.equal(new Set(A.parts.map(p=>p.identity)).size,15);assert.equal(P.height({...f,h:undefined}),800);assert.equal(P.kind(f),'椅子');
assert.deepEqual(P.vertical(f),{bottom:0,top:800,source:'recorded'});assert.deepEqual(P.vertical({...f,h:undefined}),{bottom:0,top:800,source:'model'});assert.equal(P.vertical({...f,h:880}).top,880);
for(const p of A.parts){assert(p.positions.every(Number.isFinite));assert.equal(p.normals.length,p.positions.length);assert.equal(p.uvs.length,p.positions.length/3*2);assert(p.uvs.every(Number.isFinite));assert(A.textures[p.texture]);assert(A.textures[p.ormTexture]);}
for(const t of A.textures)assert.equal(Buffer.from(t.rgba,'base64').length,t.width*t.height*4);
(async()=>{
const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
for(const dimensions of [{},{w:516,d:520,h:880}]){
 const item={...f,...dimensions},model=M.build(T,item),b=new T.Box3().setFromObject(model);near(b.min.y,0);for(const [axis,size]of [['x',item.w],['y',item.h],['z',item.d]])near((b.max[axis]-b.min[axis])*1000,size);
 assert.equal(model.userData.furnishAsset,'chair-ikea-vihals@1');assert.equal(model.children.length,15);
 for(const mesh of model.children){assert(mesh.material.map?.isDataTexture);assert(mesh.material.roughnessMap?.isDataTexture);assert.equal(mesh.material.map.colorSpace,T.SRGBColorSpace);assert.equal(mesh.geometry.attributes.uv.count,mesh.geometry.attributes.position.count);assert.equal(mesh.userData.furnishStablePart,'chair-vihals-v1:'+mesh.name);}
}
for(const rot of [0,37,90])for(const flip of [false,true]){
 const item={...f,rot,flip},bounds=G.bbox(G.footprints(item).flat()),wall={id:'wall',type:'block',cx:bounds[2]+150,cy:0,w:100,d:2500,h:1500,rot:0};
 near(S.directional(item,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(item,wall));
 const enclosing={...wall,cx:0,w:2000,d:2000};assert(G.volumeOverlap(item,enclosing));assert(S.directional(item,{furniture:[enclosing]}).r.containedBoundary);
 const solid={id:'solid',type:'block',cx:0,cy:0,w:100,d:100,h:80,mountHeight:400,rot:0};assert(G.volumeOverlap(item,solid));assert(!G.volumeOverlap(item,{...solid,mountHeight:1100}));
 const snap={grid:1,scale:1,wallSnap:true,guides:false,rects:[[0,-1500,0,1500]],furniture:[]},half=-bounds[0];near(S.move(item,half+6,0,snap).position[0],half);
}
assert.equal(G.bodyParts(f).length,15);assert(require('../src/data/catalog.js').library.flatMap(c=>c.items).some(i=>i[0]===f.type));
const noDrift=J.validateWork({furniture:[f]});assert.deepEqual(J.validateWork(noDrift),noDrift);
const packed=J.pack({planId:'vihals-plan',current:{furniture:[f]},designs:[{name:'椅子方案',work:{furniture:[f]}}],catalog:[]}),restored=J.unpack(packed);assert.deepEqual(restored.current.furniture,[f]);assert.deepEqual(restored.designs[0].work.furniture,[f]);
console.log('PASS VIHALS: official provenance, 15 production components, texture/UV, bounds/resize, rotation/mirror, spacing, containment, collision/height, snapping and project roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
