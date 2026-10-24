const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),C=require('../src/core/cabinet-core.js'),S=require('../src/render/sink-model.js');
const sink={id:'sink',type:'sink_arrow_680',name:'箭牌水槽',w:680,d:450,h:240,cx:0,cy:0,rot:0,color:'#85898a',...R.initial({type:'sink_arrow_680'})};
const host=K.configure({id:'counter',type:'counter',name:'厨房',w:1000,d:600,cx:0,cy:0,rot:0,color:'#fff'},{version:1,shape:'straight',depth:600,baseHeight:820,thickness:40,modules:[{role:'sink',width:1000,run:0}]});
assert.equal(sink.model,'AE5568459G23-YNC');assert.deepEqual(K.cutout(sink),{w:660,d:430,r:15});assert.deepEqual(K.cutout({...sink,sinkInstall:'under'}),{w:640,d:411,r:20});assert.deepEqual(K.cutout({...sink,type:'sink_arrow_750',w:750,sinkInstall:'under'}),{w:710,d:411,r:20});
for(const mode of ['top','flush','under']){const f={...sink,sinkInstall:mode};R.validate(f);K.normalize([host,f]);assert.equal(f.counterElevation,mode==='top'?860.8:mode==='flush'?860:820);assert.equal(K.deviceOpenings(host,[host,f]).length,1);const old=JSON.stringify(f);for(let i=0;i<3;i++)K.normalize([host,f]);assert.equal(JSON.stringify(f),old);}
for(const sinkInstall of ['bad',null,3])assert.throws(()=>P.validateWork({furniture:[{...sink,sinkInstall}]}));assert.throws(()=>R.validate({...sink,type:'chair'}));
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){const h={...host,rot,flip,cx:1500,cy:1200},[cx,cy]=K.world(h,0,0),f={...sink,cx,cy,rot,flip};assert(K.onSurface(f,h));assert.equal(K.deviceOpenings(h,[h,f]).length,1);const ring=K.deviceOpenings(h,[h,f])[0].ring;assert(Math.abs(Math.max(...ring.map(p=>p[0]))-330)<1e-6);}
// Entire footprint must be on real material: exact edge accepted, 1 mm over rejected.
assert(K.onSurface({...sink,w:1000,d:600},host));assert(!K.onSurface({...sink,w:1001,d:600},host));assert(!K.onSurface({...sink,cx:5000},host));
const cutHost={...host,kitchen:{...host.kitchen,obstacleFit:{depths:[600],cuts:[[[0,-300],[100,-300],[100,300],[0,300]]]}}};assert(!K.onSurface(sink,cutHost));
assert.equal(K.deviceOpenings(host,[host,{...sink,cx:5000}]).length,0);assert.equal(K.deviceOpenings(host,[host,{...sink,obj:{}}]).length,0);
const items=K.normalize([structuredClone(host),{...sink,sinkInstall:'under'}]),payload={planId:'test',current:{furniture:items},designs:[{id:'saved',name:'水槽',work:{furniture:items}}],catalog:[]},round=P.unpack(P.pack(payload));assert.deepEqual(round.current.furniture,items);assert.deepEqual(round.designs[0].work.furniture,items);
let restored=items;for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#fff'});assert.deepEqual(restored,items);
const legacy={id:'legacy',type:'ksink',name:'旧水槽',w:800,d:450,cx:0,cy:0,rot:0,color:'#eee'};assert.deepEqual(D.restoreFurniture([legacy],{makeId:()=> 'new',colorFor:()=> '#fff'}),[legacy]);
assert.equal(D.replaceFurniture(sink,{type:'chair',name:'椅子',w:500,d:500,color:'#fff',price:0}).sinkInstall,undefined);
const next=D.replaceFurniture({...sink,sinkInstall:'under'},{...sink,price:0});assert.equal(next.sinkInstall,'under');const fromChair=D.replaceFurniture({...sink,type:'chair',sinkInstall:undefined},{...sink,price:0});assert.equal(fromChair.sinkInstall,'top');
let n=0;const copy=D.pasteFurniture({items,cx:0,cy:0},{x:2000,y:2000},{x:-5000,y:-5000,w:10000,h:10000},()=> 'copy'+ ++n).items;assert.equal(copy[1].sinkInstall,'under');
const plan={rooms:[],walls:[],doors:[],beams:[]},issue={kind:'test'};assert.notEqual(P.checkFingerprint(issue,plan,[sink],800),P.checkFingerprint(issue,plan,[{...sink,sinkInstall:'under'}],800));assert.equal(P.checkFingerprint(issue,plan,[sink],800),P.checkFingerprint(issue,plan,[{...sink,price:9,color:'#fff'}],800));
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),map=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(map.three),ctx=vm.createContext({FurnishKitchen:K,FurnishProducts:R,FurnishCabinet:C,FurnishSolidCut:require('../src/render/solid-cut.js')});
 for(const file of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));o.position.set(x,y+h/2,z);return o;},ray=(g,x,z)=>{g.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(x,2,z),new T.Vector3(0,-1,0)).intersectObject(g,true);},near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} / ${b}`);
 for(const mode of ['top','flush','under']){
  const f={...sink,sinkInstall:mode};K.normalize([host,f]);const model=S.build(T,f),kitchen=ctx.FurnishKitchenModel.build(T,host,box,{furniture:[host,f]});
  model.updateMatrixWorld(true);const parts=new Map();model.traverse(o=>{if(o.userData.sinkPart)parts.set(o.userData.sinkPart,o);});
  assert(![...parts.keys()].some(name=>name.startsWith('rack-')),'omitted accessory basket does not survive in production');
  const bounds=name=>new T.Box3().setFromObject(parts.get(name));assert(bounds('faucet-base').intersectsBox(bounds('faucet-arch')),'riser seated in base');assert(bounds('faucet-arch').intersectsBox(bounds('spray-head')),'pull-out head seated on neck');
  assert(bounds('faucet-base').intersectsBox(bounds('faucet-lever-pivot')),'cartridge joined to body');assert(bounds('faucet-lever-cap').intersectsBox(bounds('faucet-lever')),'paddle joined to cartridge');
  // Check the finished lower rim against the cartridge axle. Overlapping boxes
  // alone accepted the visibly offset freehand outline in the earlier model.
  const paddle=parts.get('faucet-lever'),cap=parts.get('faucet-lever-cap'),toAxle=parts.get('faucet-lever-assembly').matrixWorld.clone().invert(),positions=paddle.geometry.attributes.position,point=new T.Vector3(),radii=[];
  const center=cap.getWorldPosition(new T.Vector3()).applyMatrix4(toAxle);near(center.y,0);near(center.z,0);
  for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(paddle.matrixWorld).applyMatrix4(toAxle);if(point.y<-.002)radii.push(Math.hypot(point.y-center.y,point.z-center.z));}
  assert(radii.length>30);assert(Math.max(...radii)<.0171&&Math.min(...radii)>.0157,'paddle lower rim is concentric with cap within the 0.6 mm edge bevel');
  assert(parts.get('sprayer').quaternion.x<0,'sprayer tilts toward basin');assert(bounds('spray-button').intersectsBox(bounds('spray-head')),'sprayer button seated in head');
  assert(new T.Box3().setFromObject(model).max.y<=R.vertical(f).top/1000,'overhead envelope covers the finished faucet');
  assert(!ray(kitchen,0,0).some(v=>v.object.userData.kitchenSlab||v.object.userData.cabinetTop),'opening through actual slab and production top board');assert(ray(kitchen,.45,0).some(v=>v.object.userData.kitchenSlab),'material outside opening');
  near(ray(model,-.15,.08).find(v=>v.object.userData.sinkPart==='bowl-floor').point.y,f.counterElevation/1000-.2);
  const rim=ray(model,-.335,0).find(v=>v.object.userData.sinkPart==='rim');near(rim.point.y,f.counterElevation/1000);
  const ledge=ray(kitchen,-.335,0).find(v=>v.object.userData.kitchenSlab);near(ledge.point.y,mode==='flush'?.8592:.86);
  if(mode==='under')assert(!ray(kitchen,-.315,0).some(v=>v.object.userData.kitchenSlab));
  for(const g of [model,kitchen])g.traverse(o=>{if(o.isMesh)for(const key of ['position','normal'])if(o.geometry.attributes[key])assert(o.geometry.attributes[key].array.every(Number.isFinite));});
 }
 // Removing and moving the sink restores the countertop; holes use actual device position.
 for(const list of [[],[{...sink,cx:3000}]])assert(ray(ctx.FurnishKitchenModel.build(T,host,box,{furniture:[host,...list]}),0,0).some(v=>v.object.userData.kitchenSlab));
 for(const dims of [[750,450,240],[900,550,300],[50,50,50]]){const f={...sink,w:dims[0],d:dims[1],h:dims[2]},g=S.build(T,f),b=new T.Box3().setFromObject(g),size=b.getSize(new T.Vector3());near(size.x,f.w/1000);near(size.z,f.d/1000);near(b.min.y,(f.counterElevation-f.h)/1000);}
 // Production cache: changes to position, installation and dimensions rebuild the host.
 const signature=K.deviceSignature(host,[host,sink]);assert.notDeepEqual(signature,K.deviceSignature(host,[host,{...sink,cx:20}]));assert.notDeepEqual(signature,K.deviceSignature(host,[host,{...sink,sinkInstall:'under'}]));assert.deepEqual(signature,K.deviceSignature(host,[host,{...sink,price:7,color:'#fff'}]));
 const legacyHost={...host,kitchen:undefined};const slab=ctx.FurnishKitchenModel.countertop(T,legacyHost,new T.MeshStandardMaterial(),[legacyHost,sink]);assert.equal(ray(slab,0,0).length,0);
 // Exercise the actual scene cache as well as its input signature.
 Object.assign(ctx,{mat:(color,options={})=>new T.MeshStandardMaterial({color,...options}),THREE:T,FurnishSinkModel:S,FurnishDesign:D,FurnishProject:{effectivePlan:()=>({})},PLAN:{},M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5});
 Object.assign(ctx,{RoundedBoxGeometry:ctx.RoundedBoxGeometry,mat:ctx.mat,FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 Object.assign(ctx,{state:{furniture:K.normalize([structuredClone(host),structuredClone(sink)])},furnG:new T.Group(),clearGroup:g=>g.clear(),opt:{furn:true},applyGrow:()=>{},furnitureError:R.modelError,furnitureRenderErrors:new Map(),syncModelErrors:()=>{}});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),ctx);
 const refresh=()=>vm.runInContext('buildFurn()',ctx),mesh=id=>ctx.furnG.children.find(o=>o.userData.fid===id);
 refresh();const firstHost=mesh(host.id),firstSink=mesh(sink.id);refresh();assert.equal(mesh(host.id),firstHost);assert.equal(mesh(sink.id),firstSink);near(firstSink.position.y,.8608);
 ctx.state.furniture[1].sinkInstall='under';K.normalize(ctx.state.furniture);refresh();assert.notEqual(mesh(host.id),firstHost);assert.notEqual(mesh(sink.id),firstSink);near(mesh(sink.id).position.y,.82);
 const afterMode=mesh(host.id);ctx.state.furniture[1].color='#aaaaaa';ctx.state.furniture[1].price=99;refresh();assert.equal(mesh(host.id),afterMode);
 ctx.state.furniture[1].cx=4000;refresh();assert.notEqual(mesh(host.id),afterMode);assert(ray(mesh(host.id),0,0).some(v=>v.object.userData.kitchenSlab));
 // Beveled slabs also preserve a valid shallow recess near the 20 mm split.
 for(const thickness of [20,20.5,21,40]){const h={...host,kitchen:{...host.kitchen,thickness,edgeStyle:'bevel'}},f={...sink,sinkInstall:'flush'};K.normalize([h,f]);const model=ctx.FurnishKitchenModel.build(T,h,box,{furniture:[h,f]});near(ray(model,-.335,0).find(v=>v.object.userData.kitchenSlab).point.y,(820+thickness-.8)/1000);}
 console.log('PASS sink identity, dimensions, installation, automatic transformed holes, edge threshold, obstacle cuts, production basin/slab/cabinet geometry, copy/replacement, project/named roundtrip, no drift and cache inputs');
})().catch(e=>{console.error(e);process.exitCode=1;});

