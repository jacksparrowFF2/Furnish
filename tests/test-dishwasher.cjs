const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),Model=require('../src/render/dishwasher-model.js'),SVG=require('../src/render/furniture-svg.js');
const entry=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]==='dishwasher_mijia_countertop');
assert.deepEqual([entry[2],entry[3],entry[6]],[550,350,598]);assert.equal(entry[5],0);assert.equal(R.height({type:'dishwasher'}),840);
const f={id:'dishwasher',type:entry[0],name:entry[1],w:550,d:350,h:598,cx:0,cy:0,rot:0,color:entry[4],...R.initial({type:entry[0]})};
assert.equal(f.mountHeight,860);assert.equal(f.dishwasherDoorOpen,false);assert.equal(f.model,'智能洗碗机 台式 5套');
for(const mountHeight of [0,860,20000]){R.validate({...f,mountHeight});assert.equal(R.vertical({...f,mountHeight}).bottom,mountHeight);}
for(const mountHeight of [-1,20001,null,'860',NaN])assert.throws(()=>P.validateWork({furniture:[{...f,mountHeight}]}));
for(const dishwasherDoorOpen of [0,1,null,'true',{}])assert.throws(()=>P.validateWork({furniture:[{...f,dishwasherDoorOpen}]}));
const installed={...f,dishwasherDoorOpen:true,mountHeight:900,rot:37,flip:true};
const restored=P.unpack(P.pack({planId:'test',current:{furniture:[installed]},designs:[{id:'named',name:'台面洗碗机',work:{furniture:[installed]}}],catalog:[]}));
assert.deepEqual(restored.current.furniture,[installed]);assert.deepEqual(restored.designs[0].work.furniture,[installed]);
let list=[installed];for(let i=0;i<3;i++)list=D.restoreFurniture(list,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(list,[installed]);
const legacy={...f};delete legacy.h;delete legacy.mountHeight;delete legacy.dishwasherDoorOpen;assert.deepEqual(D.restoreFurniture([legacy],{makeId:()=> 'new',colorFor:()=> '#eee'})[0],legacy);assert.equal(R.vertical(legacy).bottom,860);
const candidate={...f,price:0},same=D.replaceFurniture(installed,candidate);assert.equal(same.mountHeight,900);assert.equal(same.dishwasherDoorOpen,true);
const generic={type:'dishwasher',name:'洗碗机',w:600,d:600,h:840,color:'#eee',price:0};assert.equal(D.replaceFurniture(installed,generic).dishwasherDoorOpen,undefined);assert.equal(D.replaceFurniture(installed,generic).mountHeight,undefined);
const fromHeater=D.replaceFurniture({...installed,type:'waterheater_flat',heaterSocket:{x:0,y:0,z:750},dishwasherDoorOpen:undefined},candidate);assert.equal(fromHeater.mountHeight,860);assert.equal(fromHeater.dishwasherDoorOpen,false);assert.equal(fromHeater.heaterSocket,undefined);
assert.equal(D.pasteFurniture({items:[installed],cx:0,cy:0},{x:500,y:500},{x:-1000,y:-1000,w:3000,h:3000},()=> 'copy').items[0].dishwasherDoorOpen,true);
const support={id:'support',type:'custom',name:'承托台',w:1000,d:700,h:860,cx:0,cy:0,rot:0};assert.equal(G.collisions([f,support]).length,0);assert.equal(G.collisions([{...f,mountHeight:859},support]).length,1);
const closed=SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},f),open=SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},installed);assert(!/NaN|undefined/.test(open));assert(!closed.includes('data-dishwasher-fold'));assert(open.includes('data-dishwasher-fold'));
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const ctx=vm.createContext(Object.assign({FurnishDownlightModel:require("../src/render/downlight-model.js"),FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{THREE:T,FurnishDishwasherModel:Model,FurnishCabinet:require('../src/core/cabinet-core.js'),FurnishDesign:D,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5}));
 Object.assign(ctx,{RoundedBoxGeometry:ctx.RoundedBoxGeometry,mat:ctx.mat,FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const dims of [[550,350,598],[700,420,750],[50,50,50]])for(const rot of [0,37,90,180])for(const flip of [false,true])for(const dishwasherDoorOpen of [false,true]){
  ctx.f={...installed,w:dims[0],d:dims[1],h:dims[2],rot,flip,dishwasherDoorOpen};const o=vm.runInContext('buildFurniture(f)',ctx),b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3()),a=rot*Math.PI/180,depth=dims[1]*(dishwasherDoorOpen?600/350:1);
  // Rotated bounds of an open pose can omit corners: verify every real vertex instead.
  near(size.y,dims[2]/1000);near(b.min.y,.9);assert.equal(o.userData.fid,f.id);
  if(rot===0||rot===90||rot===180){near(size.x,(Math.abs(Math.cos(a))*dims[0]+Math.abs(Math.sin(a))*depth)/1000);near(size.z,(Math.abs(Math.sin(a))*dims[0]+Math.abs(Math.cos(a))*depth)/1000);}
  o.traverse(v=>{if(v.isMesh)for(const key of ['position','normal'])if(v.geometry.attributes[key])assert(v.geometry.attributes[key].array.every(Number.isFinite));});
  o.updateMatrixWorld(true);const inverse=o.matrixWorld.clone().invert(),p=new T.Vector3();o.traverse(v=>{if(!v.isMesh)return;const attr=v.geometry.attributes.position;for(let i=0;i<attr.count;i++){p.fromBufferAttribute(attr,i).applyMatrix4(v.matrixWorld).applyMatrix4(inverse);assert(p.x>=-dims[0]/2000-2e-6&&p.x<=dims[0]/2000+2e-6);assert(p.z>=-dims[1]/2000-2e-6&&p.z<=(dims[1]/2+(dishwasherDoorOpen?dims[1]*250/350:0))/1000+2e-6);}});
 }
 const o=Model.build(T,installed),parts={};o.traverse(v=>{if(v.userData.dishwasherPart)parts[v.userData.dishwasherPart]=v;});assert(parts['lower-basket']&&parts['upper-basket']&&parts.plate&&parts['steam-outlet']);near(parts['lower-door'].rotation.x,Math.PI/2);near(parts['upper-door'].rotation.x,-Math.PI/2);
 const closedModel=Model.build(T,{...f,mountHeight:0});closedModel.updateMatrixWorld(true);const rays=new T.Raycaster(new T.Vector3(0,.235,1),new T.Vector3(0,0,-1)),hits=rays.intersectObject(closedModel,true);assert(hits[0].object.userData.dishwasherPart.startsWith('display'),'front display is visible, not buried in the door');
 // Production app cache must rebuild after a pose or elevation edit.
 ctx.state={furniture:[f]};ctx.furnG=new T.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};ctx.furnitureError=R.modelError;ctx.furnitureRenderErrors=new Map();ctx.syncModelErrors=()=>{};
 Object.assign(ctx,{FurnishProject:{effectivePlan:()=>({})},PLAN:{},FurnishProducts:require('../src/core/product-rules.js'),M:v=>v/1000});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),ctx);vm.runInContext('buildFurn()',ctx);const before=ctx.furnG.children[0];vm.runInContext('buildFurn()',ctx);assert.equal(ctx.furnG.children[0],before);ctx.state.furniture=[{...f,dishwasherDoorOpen:true,mountHeight:0}];vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],before);near(new T.Box3().setFromObject(ctx.furnG.children[0]).min.y,0);
 console.log('PASS countertop dishwasher defaults, validation, copy/replacement, restore, named project roundtrip, support contact, production poses, transforms and cache');
})().catch(e=>{console.error(e);process.exitCode=1;});
