const normalized=require('./helpers/current-furniture.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),D=require('../src/core/design-core.js'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),R=require('../src/core/product-rules.js');
const old={id:'k',type:'counter',name:'厨房',cx:2000,cy:2000,w:1800,d:600,rot:0,color:'#e9e5de'};
const fixture=items=>({planId:'test',current:{furniture:items},designs:[{id:'saved',name:'命名厨房',work:{furniture:items}}],catalog:[]});
assert.deepEqual(P.unpack(P.pack(fixture([old]))).current.furniture[0],normalized.item(old));
assert.deepEqual(D.restoreFurniture([old],{makeId:()=> 'new',colorFor:()=> '#eee'}),normalized.items([old]));
let host=K.configure(old,{...K.defaults(old),shape:'L',modules:[{run:0,width:900,role:'sink'},{run:0,width:900,role:'drawer'},{run:1,width:900,role:'hob'},{run:1,width:600,role:'empty'}]});
assert.deepEqual([host.w,host.d],[2400,2100]);assert.equal(K.slabs(host).reduce((a,s)=>a+s.w*s.d,0),2400*600+1500*600);
const sink={id:'sink',type:'ksink',name:'水槽',cx:0,cy:0,w:760,d:450,rot:0,color:'#eee'},hob={id:'hob',type:'stove',name:'灶具',cx:0,cy:0,w:750,d:450,rot:0,color:'#eee'};
let items=[host,K.attach(sink,host,0),K.attach(hob,host,2)];K.normalize(items);K.validateList(items);
assert.equal(items[1].counterElevation,860);assert.equal(items[2].rot,270);
const saved=P.unpack(P.pack(fixture(items)));assert.deepEqual(saved.current.furniture,items);assert.deepEqual(saved.designs[0].work.furniture,items);
for(let i=0;i<3;i++)items=D.restoreFurniture(items,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(items,saved.current.furniture,'repeated restore has no drift');
for(const rot of [0,90,37,270])for(const flip of [false,true]){
 const list=structuredClone(items);list[0].rot=rot;list[0].flip=flip;list[0].cx+=200;list[0].kitchen.baseHeight=900;K.normalize(list,items);
 const m=K.layout(list[0])[2];assert.deepEqual([list[2].cx,list[2].cy],K.world(list[0],m.x,m.y));assert.equal(list[2].counterElevation,940);
 const empty=K.world(list[0],500,400),chair={id:'chair',type:'chair',cx:empty[0],cy:empty[1],w:100,d:100,rot};assert(!G.obbOverlap(list[0],chair),'L inner void remains free');
 const plan={rooms:[{id:'r',name:'房间',poly:[[-5000,-5000],[10000,-5000],[10000,10000],[-5000,10000]]}],walls:[],doors:[],windows:[],beams:[]};assert(!P.spaceCheck(plan,[list[0],chair],{scanPassages:false}).some(v=>v.kind==='overlap'));
 assert.equal(K.openingZones(list[0],{passage:0}).filter(z=>z.column===1&&z.kind==='cabinetdrawer').length,1);
}
assert.throws(()=>K.configure(host,{...host.kitchen,depth:49.99}));assert.throws(()=>K.attach({...sink,w:861},host,0));assert.doesNotThrow(()=>K.attach({...sink,w:860},host,0));
assert.throws(()=>P.validateWork({furniture:[host,{...sink,counterLink:{hostId:'missing',module:0}}]}));
assert.throws(()=>P.validateWork({furniture:[host,items[1],{...items[1],id:'second'}]}));
const resized=D.resizeFurniture(host,{w:3000,d:2400});assert.deepEqual([resized.w,resized.d],[3000,2400]);K.validate(resized);
const moved=structuredClone(items);moved[1].cx+=100;K.normalize(moved,items);assert.equal(moved[1].counterLink,undefined,'explicit device move detaches');
const removed=structuredClone(items).slice(1);K.normalize(removed,items);assert(removed.every(f=>!f.counterLink));
let n=0;const clipboard={items,cx:2000,cy:2000},copy=D.pasteFurniture(clipboard,{x:4000,y:4000},{x:0,y:0,w:10000,h:10000},()=> 'copy'+ ++n).items;assert.equal(copy[1].counterLink.hostId,copy[0].id);assert.notEqual(copy[0].id,host.id);
const single=D.pasteFurniture({items:[items[1]],cx:items[1].cx,cy:items[1].cy},{x:4000,y:4000},{x:0,y:0,w:10000,h:10000},()=> 'single').items[0];assert.equal(single.counterLink,undefined);
const replacement=D.replaceFurniture(host,{type:'chair',name:'椅子',w:500,d:500,color:'#eee',price:0});assert.equal(replacement.kitchen,undefined);assert(R.initial(old).kitchen);
const S=require('../src/core/service-core.js'),pipe={at:K.world(host,500,400),radius:60,vertical:{bottom:0,top:2800}};assert(!S.bodyHit(host,pipe),'L void pipe does not cut or report body occupancy');
const emptyModule=K.layout(host).find(m=>m.role==='empty'),[ex,ey]=K.world(host,emptyModule.x,emptyModule.y),dishwasher={id:'dishwasher',type:'dishwasher',cx:ex,cy:ey,w:500,d:500,h:800,rot:270};assert(!G.volumeOverlap(host,dishwasher),'equipment bay free below slab');assert(G.volumeOverlap(host,{...dishwasher,h:840}),'equipment penetrating slab is a collision');assert.equal(G.collisions([host,dishwasher]).length,0);
const emptyPlan={rooms:[{id:'r',name:'房间',poly:[[-5000,-5000],[10000,-5000],[10000,10000],[-5000,10000]]}],walls:[],doors:[],windows:[],beams:[]};assert(!P.spaceCheck(emptyPlan,[host,dishwasher],{scanPassages:false}).some(v=>v.kind==='overlap'));assert(P.spaceCheck(emptyPlan,[host,{...dishwasher,h:840}],{scanPassages:false}).some(v=>v.kind==='overlap'));
const wall={id:'wall',type:'kitchenwall',name:'吊柜',cx:0,cy:0,w:800,d:350,rot:0,...R.initial({type:'kitchenwall'})};assert.deepEqual(D.furnitureVerticalBounds(wall),{bottom:1480,top:2180,source:'model'});assert(C.openingZones(wall).every(z=>z.ranges.every(([a])=>a>=1480)));
assert.deepEqual(S.local(wall,{...pipe,at:[0,0]}).vertical,{bottom:-1480,top:1320});
for(const m of K.layout(host).filter(m=>m.role!=='empty'))C.validate(K.moduleFurniture(host,m));
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:C});
 for(const file of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 for(const shape of ['straight','L']){
  const f=shape==='L'?host:K.configure(old,K.defaults(old)),list=shape==='L'?items:[],model=ctx.FurnishKitchenModel.build(THREE,f,box,{furniture:list});model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model);assert(Math.abs(bounds.max.y-.86)<1e-6,'no automatic wall cabinets');
  const ray=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0)).intersectObject(model,true);
  if(shape==='L'){assert.equal(ray(.5,.4).length,0,'no geometry in L void');const m=K.layout(f)[0];assert(!ray(m.x/1000,m.y/1000).some(v=>v.object.userData.kitchenSlab),'true sink hole');assert(ray(-.9,-.75).some(v=>Math.abs(v.point.y-.86)<1e-6),'corner slab exists');}
  for(const child of model.children.filter(o=>o.userData.kitchenSlab)){for(const v of child.geometry.attributes.position.array)assert(Number.isFinite(v));}
 }
 console.log('PASS kitchen legacy and named-project roundtrip, no drift, functional modules, attachment transforms, copy/removal/replacement, L void and actual countertop holes');
})().catch(e=>{console.error(e);process.exitCode=1;});
