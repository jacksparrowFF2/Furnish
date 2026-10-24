const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),Model=require('../src/render/aquarium-model.js');
const entry=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]==='aquarium_mijia_2pro');
assert.deepEqual([entry[2],entry[3],entry[6]],[505,292,334]);
const f={id:'aquarium',type:entry[0],name:entry[1],w:505,d:292,h:334,cx:0,cy:0,rot:0,color:entry[4],...R.initial({type:entry[0]})};
assert.equal(f.mountHeight,0);assert.equal(f.model,'智能鱼缸 2 Pro');
for(const mountHeight of [0,750,20000]){const item={...f,mountHeight};R.validate(item);assert.deepEqual(R.vertical(item),{bottom:mountHeight,top:mountHeight+334,source:'recorded'});}
for(const mountHeight of [-1,20001,null,'750',NaN])assert.throws(()=>P.validateWork({furniture:[{...f,mountHeight}]}));
const installed={...f,mountHeight:750,rot:37,flip:true};
const restored=P.unpack(P.pack({planId:'test',current:{furniture:[installed]},designs:[{id:'named',name:'柜上鱼缸',work:{furniture:[installed]}}],catalog:[]}));
assert.deepEqual(restored.current.furniture,[installed]);assert.deepEqual(restored.designs[0].work.furniture,[installed]);
let list=[installed];for(let i=0;i<3;i++)list=D.restoreFurniture(list,{makeId:()=> 'new',colorFor:()=> '#111111'});assert.deepEqual(list,[installed]);
const legacy={...f};delete legacy.h;delete legacy.mountHeight;const old=D.restoreFurniture([legacy],{makeId:()=> 'new',colorFor:()=> '#111111'})[0];assert.deepEqual(old,legacy);assert.deepEqual(R.vertical(old),{bottom:0,top:334,source:'model'});
const candidate={type:'washer',name:'洗衣机',w:600,d:600,h:850,color:'#eeeeee',price:0};
assert.equal(D.replaceFurniture(installed,candidate).mountHeight,undefined);
assert.equal(D.replaceFurniture(installed,{...f,price:0}).mountHeight,750);
assert.equal(D.replaceFurniture(installed,{...f,sourceUrl:'',price:0}).sourceUrl,f.sourceUrl);
const fromHeater=D.replaceFurniture({...installed,type:'waterheater_flat',heaterSocket:{x:0,y:0,z:750}}, {...f,price:0});assert.equal(fromHeater.mountHeight,0);assert.equal(fromHeater.heaterSocket,undefined);
const copy=D.pasteFurniture({items:[installed],cx:0,cy:0},{x:500,y:500},{x:-1000,y:-1000,w:3000,h:3000},()=> 'copy').items[0];assert.equal(copy.mountHeight,750);
const support={id:'support',type:'custom',name:'承托台',w:1000,d:700,h:750,cx:0,cy:0,rot:0};
assert.equal(G.collisions([installed,support]).length,0);assert.equal(G.collisions([{...installed,mountHeight:700},support]).length,1);
const svg=require('../src/render/furniture-svg.js').render(f.type,f.w,f.d,f.color,{ink:'#333'});assert(!/NaN|undefined/.test(svg));assert.match(svg,/#b8d8dc/);
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const ctx=vm.createContext({THREE,FurnishAquariumModel:Model,FurnishCabinet:require('../src/core/cabinet-core.js'),FurnishDesign:D,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5});
 Object.assign(ctx,{RoundedBoxGeometry:ctx.RoundedBoxGeometry,mat:ctx.mat,FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const dims of [[505,292,334],[700,400,500],[50,50,50]])for(const rot of [0,37,90,180])for(const flip of [false,true]){
  ctx.f={...installed,w:dims[0],d:dims[1],h:dims[2],rot,flip};const o=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(o),size=bounds.getSize(new THREE.Vector3()),a=rot*Math.PI/180;
  near(size.x,(Math.abs(Math.cos(a))*dims[0]+Math.abs(Math.sin(a))*dims[1])/1000);near(size.z,(Math.abs(Math.sin(a))*dims[0]+Math.abs(Math.cos(a))*dims[1])/1000);near(size.y,dims[2]/1000);near(bounds.min.y,.75);assert.equal(o.userData.fid,f.id);
  o.traverse(v=>{if(v.isMesh)for(const key of ['position','normal'])if(v.geometry.attributes[key])assert(v.geometry.attributes[key].array.every(Number.isFinite));});
 }
 // Check actual glass/water/front/back production placement, not only an outer box.
 const o=Model.build(THREE,f),parts={};o.traverse(v=>{if(v.userData.aquariumPart)parts[v.userData.aquariumPart]=v;});
 assert(parts['front-glass'].position.z>0);assert(parts['filter-chamber'].position.z<0);assert(parts['front-glass'].material.transparent);assert.equal(parts['front-glass'].material.depthWrite,false);assert(parts.waterline.position.y<.296);assert(parts.plants&&parts.driftwood&&parts.fish);
 ctx.state={furniture:[installed]};ctx.furnG=new THREE.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};ctx.furnitureError=R.modelError;ctx.furnitureRenderErrors=new Map();ctx.syncModelErrors=()=>{};
 // buildFurn now derives the furniture datum from the effective plan. Supply the
 // production project/product cores so this test exercises the same scene path.
 Object.assign(ctx,{FurnishProject:P,FurnishProducts:R,PLAN:{id:'aquarium_scene',walls:[],rooms:[{id:'aquarium_room',name:'鱼缸房间',poly:[[-1000,-1000],[1000,-1000],[1000,1000],[-1000,1000]],at:[0,0],mat:'wood'}]}});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),ctx);
 vm.runInContext('buildFurn()',ctx);const before=ctx.furnG.children[0];vm.runInContext('buildFurn()',ctx);assert.equal(ctx.furnG.children[0],before);near(new THREE.Box3().setFromObject(before).min.y,.75);
 ctx.state.furniture=[{...installed,mountHeight:900}];vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],before);near(new THREE.Box3().setFromObject(ctx.furnG.children[0]).min.y,.9);
 const floors=require('../src/core/floor-finish-core.js');ctx.state=floors.setLayers(ctx.state,ctx.PLAN,['aquarium_room'],{rawZ:0,tileThickness:10,baseThickness:50});ctx.state.furnitureDatum='finished-floor';
 vm.runInContext('buildFurn()',ctx);const finished=ctx.furnG.children[0];assert.equal(ctx.furnitureRenderErrors.size,0);assert(!finished.userData.modelError);near(new THREE.Box3().setFromObject(finished).min.y,.96);
 vm.runInContext('buildFurn()',ctx);assert.equal(ctx.furnG.children[0],finished,'unchanged finished-floor datum reuses the production model');
 ctx.state=floors.setLayers(ctx.state,ctx.PLAN,['aquarium_room'],{rawZ:0,tileThickness:10,baseThickness:70});vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],finished,'changed floor datum invalidates the model cache');near(new THREE.Box3().setFromObject(ctx.furnG.children[0]).min.y,.98);
 console.log('PASS aquarium defaults, validation, project/named roundtrip, repeated restore, copy/replacement, support elevation, production geometry and cache');
})().catch(e=>{console.error(e);process.exitCode=1;});
