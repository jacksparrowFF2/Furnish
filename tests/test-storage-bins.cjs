'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),J=require('../src/core/project-core.js'),M=require('../src/render/storage-supply-model.js');
const near=(a,b)=>assert(Math.abs(a-b)<.03,`${a} != ${b}`);
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 const specs=Object.entries(require('../scripts/lib/storage-supply-specs.json')).filter(([,s])=>s.shape==='open-storage-bin');assert.equal(specs.length,7);let serial=0;const uid=()=> 'bin-'+(++serial);
 for(const [profile,s] of specs){
  const a=require('../src/data/'+profile+'-blender-asset.js'),f={id:'unit',type:s.type,name:s.name,w:s.size[0],d:s.size[2],h:150,mountHeight:0,cx:1000,cy:2000,rot:0,color:s.color};
  assert(P.supports(f,'inventoryArray'));assert(P.supports(f,'mountHeight'));assert(P.supports(f,'pose3D'));assert.equal(P.initial(f).mountHeight,0);assert(!f.inventoryArray);
  for(const part of a.parts)for(let i=0;i<part.positions.length;i+=9){const v=part.positions,A=new T.Vector3().fromArray(v,i),B=new T.Vector3().fromArray(v,i+3),C=new T.Vector3().fromArray(v,i+6);assert(B.sub(A).cross(C.sub(A)).length()>1e-14,profile+'/'+part.name+' degenerate triangle');}
  const model=M.build(T,f);model.updateMatrixWorld(true);
  // The visual cavity and the low front are real, never a solid rectangular slab.
  const ray=(origin,dir)=>new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...dir)).intersectObject(model,true);
  assert.equal(ray([0,.2,0],[0,-1,0])[0].object.name,'base');
  assert.equal(ray([0,.11,f.d/2000+.02],[0,0,-1])[0].object.name,'back-wall');
  assert.equal(ray([0,.03,f.d/2000+.02],[0,0,-1])[0].object.name,'front-u-wall');
  for(const rot of [0,37,90])for(const flip of [false,true]){
   const unit={...f,rot,flip,mountHeight:68};let work=D.applyInventoryArray({furniture:[unit]},unit.id,{memberIds:[unit.id],arrayId:'bins'},uid);
   work=D.applyInventoryArray(work,unit.id,{count:17,columns:3,rows:2,gapX:4,gapZ:8,gapY:12,pattern:'stagger',angle:90},uid);J.validateWork(work);assert.equal(work.furniture.length,17);near(P.bottomHeight(work.furniture[16]),68+2*162);
   assert.deepEqual(D.applyInventoryArray(work,unit.id,{count:17},uid),work);assert.equal(new Set(work.furniture.map(x=>x.id)).size,17);
   const packed=J.pack({planId:'bins',current:work,designs:[{name:'bins',work}],catalog:[]});assert.equal(packed.version,68);assert.deepEqual(J.unpack(packed).current,work);
   let restored=work.furniture;for(let n=0;n<3;n++)restored=D.restoreFurniture(restored,{makeId:uid,colorFor:()=> '#fff'});assert.deepEqual(restored,work.furniture);
   const copy=D.pasteFurniture({items:work.furniture,cx:1000,cy:2000},{x:1500,y:2500},{x:0,y:0,w:20000,h:20000},uid).items;D.validateInventoryArrays(copy);assert.notEqual(copy[0].inventoryArray.id,'bins');
   const detached=D.applyInventoryArray(work,unit.id,{detach:true},uid);assert(detached.furniture.every(x=>!x.inventoryArray));assert.deepEqual(detached.furniture.map(({inventoryArray,...r})=>r),work.furniture.map(({inventoryArray,...r})=>r));
   for(const invalid of [{count:201},{gapX:-1},{columns:0}])assert.throws(()=>D.applyInventoryArray(work,unit.id,invalid,uid));
  }
 }
 assert(require('../src/core/repository-core.js').workspaceVersions.includes(68));
 const Cache=require('../src/io/workspace-cache.js'),cached={v:68,updatedAt:2,work:{}};assert.deepEqual(Cache.candidates({read:k=>k==='huxing-design-v68'?JSON.stringify(cached):null}),[cached]);
 console.log('PASS 7 storage bins: real open top/U front, nondegenerate meshes, elevation, arrays, rotation/mirror, copy/detach, project/named designs and repeat recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
