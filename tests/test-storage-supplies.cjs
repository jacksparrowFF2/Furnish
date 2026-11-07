'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const specs=require('../scripts/lib/storage-supply-specs.json'),M=require('../src/render/storage-supply-model.js'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),C=require('../src/core/cabinet-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<.02,`${a} != ${b}`);
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const [profile,q]of Object.entries(specs)){
  const A=require('../src/data/'+profile+'-blender-asset.js');assert.deepEqual(A.sizeMm,q.size);assert.deepEqual(A.parts.map(p=>p.name).sort(),[...q.parts].sort());assert.equal(new Set(A.parts.map(p=>p.identity)).size,q.parts.length);
  const find=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?find(path.join(dir,e.name)):e.name===profile+'-v1.glb'?[path.join(dir,e.name)]:[]);
  assert(find(path.join(__dirname,'../assets/models/storage-supplies')).some(f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')===A.sourceSha256));
  const entry=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]===q.type);assert(entry);assert.equal(entry[5],undefined);
  const f={id:profile,type:q.type,name:q.name,w:q.size[0],d:q.size[2],h:q.size[1],cx:0,cy:0,rot:0,mountHeight:0,color:q.color};assert(M.supported(f));assert(P.supports(f,'mountHeight'));assert.equal(P.initial(f).mountHeight,0);
  if(q.unitSize){
   const units=Array.from({length:q.quantity},(_,i)=>A.parts.filter(p=>p.name.startsWith((q.shape==='roll-layer'?'roll-':'pack-')+String(i+1).padStart(2,'0'))));
   assert.equal(units.length,q.quantity);for(const group of units){assert(group.length);for(let axis=0;axis<3;axis++){const values=group.flatMap(p=>p.positions.filter((_,i)=>i%3===axis));near((Math.max(...values)-Math.min(...values))*1000,q.unitSize[axis]);}}
   const carton=new T.Group();for(let layer=0;layer<q.caseLayers;layer++)carton.add(M.build(T,{...f,mountHeight:layer*f.h}));carton.updateMatrixWorld(true);const cb=new T.Box3().setFromObject(carton);near((cb.max.y-cb.min.y)*1000,f.h*q.caseLayers);assert.equal(carton.children.reduce((n,g)=>n+g.children.filter(o=>o.name.endsWith('body')||o.name.startsWith('roll-')).length,0),q.caseQuantity);
  }
  for(const bottom of [0,68,1400])for(const edited of [{},{w:f.w*1.1,d:f.d*.9,h:f.h*1.2}]){
   const a={...f,...edited,mountHeight:bottom},model=M.build(T,a);model.updateMatrixWorld(true);const b=new T.Box3().setFromObject(model);near(b.min.y*1000,bottom);for(const [axis,k]of [['x','w'],['y','h'],['z','d']])near((b.max[axis]-b.min[axis])*1000,a[k]);assert.equal(G.bodyParts(a).length,q.parts.length);
  }
  for(const rot of [0,37,90])for(const flip of [false,true]){
   const a={...f,rot,flip,mountHeight:68},b=G.bbox(G.footprints(a).flat()),wall={id:'wall',type:'block',w:100,d:2000,h:1000,cx:b[2]+150,cy:0,rot:0};near(S.directional(a,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(a,wall));assert(G.volumeOverlap(a,{...wall,cx:0,w:1000,d:1000}));assert(!G.volumeOverlap(a,{...wall,cx:0,w:1000,d:1000,mountHeight:2000}));
   const packed=J.pack({planId:'p',current:{furniture:[a]},designs:[{name:'copy',work:{furniture:[a]}}],catalog:[]});assert.equal(packed.version,q.shape?57:56);assert.deepEqual(J.unpack(packed).current.furniture[0],a);let restored=[a];for(let n=0;n<3;n++)restored=D.restoreFurniture(restored,{makeId:()=> 'fresh',colorFor:()=> '#fff'});assert.deepEqual(restored,[a]);
  }
  const cab={...C.preset('storage'),id:'cab',type:'cabinet',cx:0,cy:0,rot:0,w:798.3333333333334,d:Math.max(350,f.d+50),h:2350};cab.cabinet.plinth=50;cab.cabinet.columns=[{door:'double',doorOpen:false,drawers:[],shelves:[450,850,1250,1700]}];C.validate(cab);
  assert(!G.volumeOverlap({...f,mountHeight:68},cab),'inventory clears real boards');assert(G.volumeOverlap({...f,mountHeight:500},cab),'inventory crossing first shelf is detected');
  const old={id:'old',type:'block',name:'old',cx:0,cy:0,w:100,d:100,h:100,rot:0};const replaced=D.replaceFurniture(old,f,{anchor:'center'});assert.equal(replaced.id,'old');assert.equal(replaced.type,q.type);
 }
 const previous=J.pack({planId:'p',current:{furniture:[]},designs:[],catalog:[]});assert(previous.version<56,'unaffected projects keep their prior format');
 console.log('PASS storage supplies: source identity/hash, production geometry/material groups, elevation and scaling, rotation/mirror, cabinet-board clearance/penetration, v56/v57, measured unit sizes and exact 27/24 counts, repeat recovery/replacement');
})().catch(e=>{console.error(e);process.exitCode=1;});
