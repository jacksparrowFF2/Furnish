const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),Model=require('../src/render/water-purifier-model.js'),SVG=require('../src/render/furniture-svg.js');
const entry=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]==='water_purifier_mijia_1200g');
assert.deepEqual([entry[2],entry[3],entry[6]],[163,445,379]);assert.equal(entry[5],0);
const f={id:'water-purifier',type:entry[0],name:entry[1],w:163,d:445,h:379,cx:0,cy:0,rot:0,color:entry[4],...R.initial({type:entry[0]})};
assert.equal(f.mountHeight,0);assert.equal(f.model,'净水器 2 1200G');
const installed={...f,mountHeight:120,rot:37,flip:true};
for(const mountHeight of [0,120,20000]){R.validate({...f,mountHeight});assert.equal(R.vertical({...f,mountHeight}).bottom,mountHeight);}
for(const mountHeight of [-1,20001,null,'120',NaN])assert.throws(()=>P.validateWork({furniture:[{...f,mountHeight}]}));
const restored=P.unpack(P.pack({planId:'test',current:{furniture:[installed]},designs:[{id:'named',name:'净水器',work:{furniture:[installed]}}],catalog:[]}));
assert.deepEqual(restored.current.furniture,[installed]);assert.deepEqual(restored.designs[0].work.furniture,[installed]);
let list=[installed];for(let i=0;i<3;i++)list=D.restoreFurniture(list,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(list,[installed]);
assert.equal(D.pasteFurniture({items:[installed],cx:0,cy:0},{x:500,y:500},{x:-1000,y:-1000,w:3000,h:3000},()=> 'copy').items[0].mountHeight,120);
assert.equal(D.replaceFurniture(installed,{...f,price:0}).mountHeight,120);
const legacy={...f};delete legacy.h;delete legacy.mountHeight;assert.deepEqual(D.restoreFurniture([legacy],{makeId:()=> 'new',colorFor:()=> '#eee'})[0],legacy);assert.deepEqual(R.vertical(legacy),{bottom:0,top:379,source:'model'});
const fromWasher=D.replaceFurniture({...installed,type:'washer',mountHeight:850,stackHeight:20},{...f,price:0});assert.equal(fromWasher.mountHeight,0);assert.equal(fromWasher.stackHeight,undefined);assert.equal(fromWasher.model,'净水器 2 1200G');
assert.equal(D.replaceFurniture(installed,{type:'purifier',name:'空气净化器',w:400,d:300,color:'#eee',price:0}).mountHeight,undefined);
assert(!/NaN|undefined/.test(SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},f)));
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),{RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString().replace("from 'three'","from '"+imports.three+"'")).toString('base64'));
 const ctx=vm.createContext({THREE:T,RoundedBoxGeometry,mat:undefined,FurnishWaterPurifierModel:Model,FurnishProducts:R,FurnishCabinet:require('../src/core/cabinet-core.js'),FurnishDesign:D,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const dims of [[163,445,379],[220,500,430],[50,50,50]])for(const rot of [0,37,90,180])for(const flip of [false,true]){
  ctx.f={...installed,w:dims[0],d:dims[1],h:dims[2],rot,flip};const o=vm.runInContext('buildFurniture(f)',ctx),b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3());near(b.min.y,.12);near(size.y,dims[2]/1000);assert.equal(o.userData.fid,f.id);
  if(rot===0||rot===90||rot===180){const a=rot*Math.PI/180;near(size.x,(Math.abs(Math.cos(a))*dims[0]+Math.abs(Math.sin(a))*dims[1])/1000);near(size.z,(Math.abs(Math.sin(a))*dims[0]+Math.abs(Math.cos(a))*dims[1])/1000);}
  o.traverse(v=>{if(v.isMesh)for(const key of ['position','normal'])assert(v.geometry.attributes[key].array.every(Number.isFinite));});
 }
 const o=Model.build(T,{...f,mountHeight:0},RoundedBoxGeometry);o.updateMatrixWorld(true);
 const hits=new T.Raycaster(new T.Vector3(-.004,.111,1),new T.Vector3(0,0,-1)).intersectObject(o,true);assert.equal(hits[0].object.userData.waterPurifierPart,'logo');
 ctx.state={furniture:[installed]};ctx.furnG=new T.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};ctx.furnitureError=R.modelError;ctx.furnitureRenderErrors=new Map();ctx.syncModelErrors=()=>{};ctx.FurnishProject={effectivePlan:()=>({})};ctx.PLAN={};
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),ctx);vm.runInContext('buildFurn()',ctx);const before=ctx.furnG.children[0];vm.runInContext('buildFurn()',ctx);assert.equal(ctx.furnG.children[0],before);near(new T.Box3().setFromObject(before).min.y,.12);
 ctx.state.furniture=[{...installed,mountHeight:0}];vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],before);near(new T.Box3().setFromObject(ctx.furnG.children[0]).min.y,0);
 console.log('PASS water purifier: defaults, validation, copy, replacement, repeated restore, named project roundtrip, production bounds, transforms, normals and cache');
})().catch(e=>{console.error(e);process.exitCode=1;});
