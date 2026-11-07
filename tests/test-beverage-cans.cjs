'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),J=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),M=require('../src/render/storage-supply-model.js');
const near=(a,b)=>assert(Math.abs(a-b)<.03,`${a} != ${b}`);
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);let serial=0;const uid=()=> 'can-'+(++serial);
 for(const volume of [330,500]){
  const spec=require('../scripts/lib/storage-supply-specs.json')['beverage-can-'+volume],asset=require('../src/data/beverage-can-'+volume+'-blender-asset.js');
  const unit={id:'unit',type:spec.type,name:spec.name,w:spec.size[0],d:spec.size[2],h:spec.size[1],cx:1000,cy:2000,rot:0,mountHeight:0,color:spec.color};
  assert(P.supports(unit,'inventoryArray'));assert(P.supports(unit,'pose3D'));assert.equal(P.initial(unit).mountHeight,0);assert.equal(P.inventoryArrayConfig(unit).columns,1);assert(!unit.inventoryArray);
  assert.equal(asset.parts.length,7);assert.equal(J.pack({planId:'single',current:{furniture:[unit]},designs:[],catalog:[]}).version,57);
  for(const part of asset.parts){
   const v=part.positions,idx=Array.from({length:v.length/3},(_,i)=>i);
   for(let i=0;i<idx.length;i+=3){const a=new T.Vector3().fromArray(v,idx[i]*3),b=new T.Vector3().fromArray(v,idx[i+1]*3),c=new T.Vector3().fromArray(v,idx[i+2]*3);assert(b.sub(a).cross(c.sub(a)).length()>1e-14,part.name+' degenerate triangle');}
  }
  for(const bottom of [0,68,1200]){
   const model=M.build(T,{...unit,mountHeight:bottom});model.updateMatrixWorld(true);const b=new T.Box3().setFromObject(model);near(b.min.y*1000,bottom);near(b.max.y*1000,bottom+unit.h);near((b.max.x-b.min.x)*1000,unit.w);near((b.max.z-b.min.z)*1000,unit.d);
  }
  for(const rot of [0,37,90])for(const flip of [false,true]){
   const f={...unit,rot,flip,mountHeight:68};let work=D.applyInventoryArray({furniture:[f]},f.id,{memberIds:[f.id],arrayId:'cans'},uid);
   work=D.applyInventoryArray(work,f.id,{count:25,columns:4,rows:3,gapX:2,gapZ:3,gapY:5,pattern:'stagger',angle:90},uid);J.validateWork(work);assert.equal(work.furniture.length,25);assert.equal(new Set(work.furniture.map(f=>f.id)).size,25);near(P.bottomHeight(work.furniture[24]),68+2*(unit.h+5));
   assert.deepEqual(D.applyInventoryArray(work,f.id,{count:25},uid),work,'repeated array edits must not drift');
   const packed=J.pack({planId:'cans',current:work,designs:[{name:'stock',work}],catalog:[]});assert.equal(packed.version,66);assert.deepEqual(J.unpack(packed).current,work);
   let restored=work.furniture;for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:uid,colorFor:()=> '#fff'});assert.deepEqual(restored,work.furniture);
   const copied=D.pasteFurniture({items:work.furniture,cx:1000,cy:2000},{x:1500,y:2500},{x:0,y:0,w:20000,h:20000},uid).items;D.validateInventoryArrays(copied);assert.notEqual(copied[0].inventoryArray.id,'cans');
   const detached=D.applyInventoryArray(work,f.id,{detach:true},uid);assert(detached.furniture.every(x=>!x.inventoryArray));
   for(const invalid of [{count:201},{gapX:-1},{gapY:-1}])assert.throws(()=>D.applyInventoryArray(work,f.id,invalid,uid));
   const b=G.bbox(G.footprints(f).flat()),wall={id:'wall',type:'block',cx:b[2]+150,cy:f.cy,w:100,d:2000,h:1000,rot:0};near(S.directional(f,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(f,wall));assert(G.volumeOverlap(f,{...wall,cx:f.cx,w:1000}));assert(!G.volumeOverlap(f,{...wall,cx:f.cx,w:1000,mountHeight:1000}));
  }
 }
 const Repo=require('../src/core/repository-core.js'),Cache=require('../src/io/workspace-cache.js');assert(Repo.workspaceVersions.includes(66));const cached={v:66,updatedAt:2,work:{}};assert.deepEqual(Cache.candidates({read:k=>k==='huxing-design-v66'?JSON.stringify(cached):null}),[cached]);assert.equal(Cache.candidates({read:k=>k==='huxing-design-v65'?JSON.stringify({v:65,updatedAt:1}):null})[0].v,65);
 console.log('PASS both beverage cans: real geometry, nondegenerate triangles, elevation, linked arrays/counts/gaps/stagger/yaw, rotation/mirror, copy/detach, persistence/no drift and space');
})().catch(e=>{console.error(e);process.exitCode=1;});
