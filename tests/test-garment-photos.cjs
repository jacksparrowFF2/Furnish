'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const specs=require('../scripts/lib/garment-photo-specs.json'),P=require('../src/core/product-rules.js'),M=require('../src/render/storage-supply-model.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<.03,`${a} != ${b}`);
(async()=>{
const T=await import(JSON.parse(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
for(const [id,s]of Object.entries(specs)){
 const A=require('../src/data/'+id+'-blender-asset.js'),source=path.join(__dirname,'..',require('../scripts/lib/model-profiles.cjs').sourceFiles(id).glb);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),A.sourceSha256);
 assert.equal(A.parts.length,2);assert.equal(new Set(A.parts.map(p=>p.identity)).size,2);assert.deepEqual(A.sizeMm,s.size);
 const body=A.parts.find(p=>p.name==='body');
 for(const side of [-1,1]){const u=[],v=[];for(let i=0;i<body.positions.length/3;i++)if(body.normals[i*3+2]*side>.99){u.push(body.uvs[i*2]);v.push(body.uvs[i*2+1]);}assert(Math.max(...u)-Math.min(...u)>.3&&Math.max(...v)-Math.min(...v)>.5,'both broad faces must show the reference photo');}
 const item=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]===s.type);assert(item);assert.equal(item[5],undefined,'no invented price');
 const f={id,type:s.type,name:s.name,color:s.color,w:s.size[0],d:s.size[2],h:s.size[1],cx:0,cy:0,rot:0,mountHeight:680};assert(P.supports(f,'mountHeight'));assert(P.supports(f,'pose3D'));assert.equal(P.initial({type:s.type,w:f.w,d:f.d}).mountHeight,0);
 for(const depth of [20,f.d,f.d*1.5])for(const bottom of [0,680]){
  const q={...f,d:depth,mountHeight:bottom},g=M.build(T,q),b=new T.Box3().setFromObject(g);near(b.min.y*1000,bottom);near(b.max.y*1000,bottom+f.h);near((b.max.z-b.min.z)*1000,depth);near((b.max.x-b.min.x)*1000,f.w);
  const solids=G.bodyParts(q);assert.equal(solids.length,2);for(const mesh of g.children){assert(mesh.userData.furnishStablePart.startsWith(id+'-v1:'));if(mesh.name==='hanger-hook'){assert.equal(mesh.material.map,null);assert.equal(mesh.material.emissiveMap,null);}else {assert(mesh.material.map);assert.equal(mesh.material.emissiveMap,mesh.material.map);assert.equal(mesh.material.emissiveIntensity,1);assert.equal(mesh.geometry.attributes.uv.count,mesh.geometry.attributes.position.count);assert.equal(mesh.material.map.colorSpace,T.SRGBColorSpace);}}
 }
 assert.notDeepEqual(G.bodyParts(f),G.bodyParts({...f,d:f.d+30}),'thickness must invalidate spatial cache');
 for(const rot of [0,37,90])for(const flip of [false,true]){
  const q={...f,rot,flip},bounds=G.bbox(G.footprints(q).flat()),other={id:'obstacle',type:'block',cx:bounds[2]+150,cy:0,w:100,d:3000,h:2000,rot:0};near(S.directional(q,{furniture:[other]}).r.distance,100);assert(!G.volumeOverlap(q,other));assert(G.volumeOverlap(q,{...other,cx:0,w:2000,d:2000}));assert(!G.volumeOverlap(q,{...other,cx:0,w:2000,d:2000,mountHeight:4000}));
  const packed=J.pack({planId:'p',current:{furniture:[q]},designs:[{name:'copy',work:{furniture:[q]}}],catalog:[]});assert.equal(packed.version,57);assert.deepEqual(J.unpack(packed).current.furniture,[q]);let restored=[q];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'unexpected',colorFor:()=> '#fff'});assert.deepEqual(restored,[q]);
 }
 const old={id:'replace',type:'block',name:'old',cx:0,cy:0,w:100,d:100,h:100,rot:0};const replaced=D.replaceFurniture(old,f,{anchor:'center'});assert.equal(replaced.id,'replace');assert.equal(replaced.type,s.type);
}
console.log('PASS garment photos: source hashes, closed production groups, UVs/material scope, editable thickness/elevation, rotation/mirror, spacing/collision, v57 roundtrip and repeated restore.');
})().catch(e=>{console.error(e);process.exitCode=1;});
