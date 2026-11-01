'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../src/core/product-rules.js'),M=require('../src/render/balcony-garden-model.js'),G=require('../src/core/layout-geometry.js'),C=require('../src/core/cabinet-motion.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const rack={id:'rack',name:'开放架',type:'balcony_plant_rack',w:1880,d:500,h:1600,cx:0,cy:0,rot:0},near=(a,b)=>assert(Math.abs(a-b)<.025,`${a} != ${b}`);
for(const changed of [{w:599},{d:199},{h:799}])assert(P.modelError({...rack,...changed}));
assert.equal(P.modelError({...rack,w:600,d:200,h:800}),null);
for(const rot of [0,37,90])for(const flip of [false,true]){
 const r={...rack,rot,flip},a=rot*Math.PI/180,point=(x,y)=>({cx:x*Math.cos(a)-y*Math.sin(a),cy:x*Math.sin(a)+y*Math.cos(a)}),probe=(x,y,mountHeight=0,h=400)=>({id:'probe',type:'block',w:440,d:350,h,mountHeight,rot,...point(x,y)});
 assert.equal(C.solidParts(r).length,12);
 assert(!G.volumeOverlap(r,probe(500,0)),'litter lower bay stays open');
 assert(G.volumeOverlap(r,probe(500,0,779,10)),'shelf penetration');
 assert(!G.volumeOverlap(r,probe(500,0,800,100)),'exact shelf-top contact');
 assert(G.volumeOverlap(r,probe(900,100)),'side post penetration');
 const inner=S.cabinetInterior(probe(500,0),{furniture:[r]});assert.equal(inner.collisions.length,0);near(inner.top.distance,380);
}
(async()=>{const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const [type,w,d,h]of [['balcony_plant_rack',1880,500,1600],['balcony_plant_rack_step',1160,550,1300],['plant_clivia',600,450,650],['plant_spider',450,450,450],['plant_peperomia',400,400,500]]){
  const f={id:type,name:type,type,w,d,h,color:'#477643',cx:0,cy:0,rot:0,...(!type.startsWith('balcony_plant_rack')?{mountHeight:800}:{})},model=M.build(T,f),box=new T.Box3().setFromObject(model,true),size=box.getSize(new T.Vector3()),parts=C.solidParts(f);
  for(const [k,n]of [['x',w],['y',h],['z',d]])near(size[k]*1000,n);near(box.min.y*1000,f.mountHeight||0);
  near(Math.min(...parts.map(p=>p.vertical.bottom)),f.mountHeight||0);near(Math.max(...parts.map(p=>p.vertical.top)),h+(f.mountHeight||0));
  const real=[],ids=[];model.traverse(m=>{if(m.geometry){ids.push(m.userData.furnishStablePart);assert([...m.geometry.attributes.position.array,...m.geometry.attributes.normal.array].every(Number.isFinite));const b=new T.Box3().setFromObject(m,true);real.push([b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z]);}});assert.equal(new Set(ids).size,ids.length);assert.equal(real.length,parts.length);
  if(P.definition(f).garden.kind!=='rack'){const pot=model.children.find(m=>m.name==='pot'),b=new T.Box3().setFromObject(pot,true);near((b.max.x-b.min.x)*1000,P.definition(f).garden.potDiameter);near((b.max.z-b.min.z)*1000,P.definition(f).garden.potDiameter);model.traverse(m=>{if(m.geometry)assert(m.geometry.index?.array instanceof Uint16Array||m.geometry.index?.array instanceof Uint32Array);});}
  for(let i=0;i<parts.length;i++){const vs=parts[i].vertices,b=[0,1,2].map(k=>Math.min(...vs.map(v=>v[k]))).concat([0,1,2].map(k=>Math.max(...vs.map(v=>v[k]))));b.forEach((n,k)=>near(n,real[i][k]*1000));}
  const packet=J.pack({planId:'garden',current:{furniture:[f]},designs:[{name:'分层',work:{furniture:[f]}}],catalog:[]}),restored=J.unpack(JSON.parse(JSON.stringify(packet)));assert.deepEqual(restored.current.furniture,[f]);let items=[f];for(let i=0;i<3;i++)items=D.restoreFurniture(items,{makeId:()=> 'new',colorFor:()=> '#ccc'});assert.deepEqual(items,[f]);
 }
 console.log('PASS balcony garden: production bounds/identities/numeric parity, open lower bay, actual posts/shelves, contact/penetration, rotation/mirror, interior clearance, project and no-drift restoration');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
