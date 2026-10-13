const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),K=require('../src/core/kitchen-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),Model=require('../src/render/fotile-model.js');
const item=(type,w,d,h)=>{const f={id:type,type,name:type,cx:0,cy:0,w,d,h,rot:0,color:'#111214'};return {...f,...R.initial(f)};};
const hob=item('stove_fotile_th36b',750,440,138),hood=item('rangehood_fotile_jcd10ta',900,350,520);
assert.equal(hob.model,'TH36B-T');assert.equal(hood.model,'JCD10TA');assert.deepEqual(K.cutout(hob),{w:660,d:350});
assert.equal(hood.hoodPanelOpen,false);assert.throws(()=>R.validate({...hood,hoodPanelOpen:1}));assert.throws(()=>R.validate({...hob,hoodPanelOpen:true}));
const opened={...hood,hoodPanelOpen:true};assert.equal(P.unpack(P.pack({...fixtureForOpen()})).current.furniture[0].hoodPanelOpen,true);
function fixtureForOpen(){return {planId:'test',current:{furniture:[opened]},designs:[{id:'o',name:'开启',work:{furniture:[opened]}}],catalog:[]};}
assert.deepEqual(R.vertical(hob),{bottom:780,top:918,source:'model'});assert.equal(R.vertical({...hood,mountHeight:0}).bottom,0);
assert.throws(()=>R.validate({...hood,mountHeight:-1}));assert.throws(()=>R.validate({...hood,counterLink:{hostId:'k',module:0}}));
assert.deepEqual(R.vertical({type:'stove',w:750,d:450}),{bottom:862,top:2330,source:'model'});
const fixture={planId:'test',current:{furniture:[hob,hood]},designs:[{id:'named',name:'命名方案',work:{furniture:[hob,hood]}}],catalog:[]};
const restored=P.unpack(P.pack(fixture));assert.deepEqual(restored.current.furniture,[hob,hood]);assert.deepEqual(restored.designs[0].work.furniture,[hob,hood]);
let records=[hob,hood];for(let i=0;i<3;i++)records=D.restoreFurniture(records,{makeId:()=> 'new',colorFor:()=> '#111'});assert.deepEqual(records,[hob,hood]);
const replaced=D.replaceFurniture(hood,{type:'stove_fotile_th36b',name:'灶具',w:750,d:440,h:138,color:'#111',price:0});assert.equal(replaced.mountHeight,undefined);assert.equal(replaced.counterElevation,860);assert.equal(replaced.model,'TH36B-T');
const host=K.configure({id:'k',type:'counter',name:'厨房',w:900,d:600,cx:1000,cy:1000,rot:0,color:'#eee'},{version:1,shape:'straight',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:900,role:'hob'}]});
for(const rot of [0,37,90,270])for(const flip of [false,true]){
 const h={...host,rot,flip},f=K.attach(hob,h,0),list=[h,f];K.normalize(list);K.validateList(list);assert.deepEqual([f.cx,f.cy],K.world(h,0,0));assert.equal(f.counterElevation,860);assert.equal(G.collisions(list).length,0);
}
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:require('../src/core/cabinet-core.js')});
 for(const file of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const linked=K.attach(hob,host,0),list=[host,linked];K.normalize(list);const kitchenModel=ctx.FurnishKitchenModel.build(THREE,host,box,{furniture:list});kitchenModel.updateMatrixWorld(true);
 const slabAt=x=>new THREE.Raycaster(new THREE.Vector3(x,2,0),new THREE.Vector3(0,-1,0)).intersectObject(kitchenModel,true).some(v=>v.object.userData.kitchenSlab);
 assert(!slabAt(.320),'actual TH36B hole reaches 320 mm from centre');assert(slabAt(.340),'slab resumes beyond 330 mm half-opening');
 const closedModel=Model.build(THREE,hood),openModel=Model.build(THREE,opened);closedModel.updateMatrixWorld(true);openModel.updateMatrixWorld(true);
 const closedBox=new THREE.Box3().setFromObject(closedModel),openBox=new THREE.Box3().setFromObject(openModel);assert(openBox.max.z>closedBox.max.z+.04,'opening projects forward');
 const find=(model,part)=>{let found;model.traverse(o=>{if(o.userData.fotilePart===part)found=o;});return found;};
 assert.deepEqual(find(closedModel,'panel-hinge').position.toArray(),find(openModel,'panel-hinge').position.toArray(),'same top hinge');assert.equal(find(openModel,'panel-hinge').rotation.x,-.18);
 assert.equal(find(openModel,'control-ring').parent,find(openModel,'panel-hinge'),'controls move with glass');assert.equal(find(openModel,'fixed-lower-glass').parent,openModel.children[0],'lower panel remains fixed');
 for(const f of [hob,hood,{...hob,w:900,d:528,h:165.6,counterElevation:1000},{...hood,w:1080,d:420,h:624,mountHeight:0}]){
  const model=Model.build(THREE,f);model.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(model),size=b.getSize(new THREE.Vector3()),v=R.vertical(f);
  for(const [actual,expected] of [[size.x,f.w/1000],[size.y,f.h/1000],[size.z,f.d/1000],[b.min.y,v.bottom/1000],[b.max.y,v.top/1000]])assert(Math.abs(actual-expected)<1e-6,`${f.type}: ${actual} versus ${expected}`);
  model.traverse(o=>{if(o.isMesh)for(const a of [o.geometry.attributes.position,o.geometry.attributes.normal])if(a)for(const n of a.array)assert(Number.isFinite(n));});
  model.rotation.y=-Math.PI/2;model.scale.x=-1;model.updateMatrixWorld(true);const rotated=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());assert(Math.abs(rotated.x-f.d/1000)<1e-6);
 }
 console.log('PASS FOTILE geometry, elevation, rotation/mirror, attachment, replacement, legacy and named project roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
