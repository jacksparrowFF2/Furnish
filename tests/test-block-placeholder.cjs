const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js');
const entry=require('../src/data/catalog.js').library.find(c=>c.cat==='占位体').items[0];
const f={id:'block',type:entry[0],name:entry[1],w:entry[2],d:entry[3],h:entry[6],color:entry[4],cx:0,cy:0,rot:0};
assert.equal(f.type,'block');assert.equal(f.h,1000);assert.equal(entry[5],undefined);
assert.deepEqual(R.initial(f),{mountHeight:0});
const resized=D.resizeFurniture(f,{w:1234,d:567,h:890});
assert.deepEqual(D.furnitureVerticalBounds(resized),{bottom:0,top:890,source:'recorded'});
const legacy={...f,id:'legacy'};delete legacy.h;
assert.deepEqual(D.furnitureVerticalBounds(legacy),{bottom:0,top:1000,source:'model'});
let restored=[legacy,resized];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#eee'});
assert.deepEqual(restored,[legacy,resized]);
for(const dims of [{w:50,d:50,h:10},{w:20000,d:20000,h:20000}])P.validateWork({furniture:[D.resizeFurniture(f,dims)]});
for(const [key,values] of [['w',[49,20001,NaN,Infinity]],['d',[49,20001]],['h',[9,20001]]])for(const value of values){
 assert.throws(()=>D.resizeFurniture(f,{[key]:value}));
}
for(const key of ['w','d','h'])for(const value of [0,-1,20001,NaN,Infinity])assert.throws(()=>P.validateWork({furniture:[{...f,[key]:value}]}));
assert.throws(()=>D.resizeFurniture({...f,locked:true},{h:500}));
const suspended={...resized,mountHeight:750};
assert.deepEqual(D.furnitureVerticalBounds(suspended),{bottom:750,top:1640,source:'recorded'});
assert.equal(D.resizeFurniture(suspended,{h:1000}).mountHeight,750);
for(const bad of [-1,20001,NaN,Infinity,null,'750'])assert.throws(()=>P.validateWork({furniture:[{...suspended,mountHeight:bad}]}));
for(const mountHeight of [0,20000])P.validateWork({furniture:[{...suspended,mountHeight}]});
let recovered=[suspended];for(let i=0;i<3;i++)recovered=D.restoreFurniture(recovered,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(recovered,[suspended]);
const work={furniture:[suspended]},packed=P.unpack(P.pack({planId:'test',current:work,designs:[{id:'named',name:'占位',work}],catalog:[]}));
assert.deepEqual(packed.current.furniture,[suspended]);assert.deepEqual(packed.designs[0].work.furniture,[suspended]);
const plan={rooms:[],walls:[],doors:[],wins:[],slides:[],markers:[],beams:[],bounds:{x:-3000,y:-3000,w:6000,h:6000}};
const copy=D.pasteFurniture({items:[suspended],cx:0,cy:0},{x:1000,y:1000},plan.bounds,()=> 'copy').items[0];
assert.deepEqual([copy.w,copy.d,copy.h],[1234,567,890]);assert.equal(copy.id,'copy');
assert.equal(copy.mountHeight,750);
const fromPipe=D.replaceFurniture({...f,type:'pipebox',mountHeight:750,pipeBoxThickness:18,pipeBoxShape:'three'},{...resized});
assert.equal(fromPipe.type,'block');assert.equal(fromPipe.mountHeight,0);for(const key of ['pipeBoxThickness','pipeBoxShape'])assert.equal(fromPipe[key],undefined);
assert.equal(D.replaceFurniture(suspended,resized).mountHeight,750);
assert.equal(D.replaceFurniture(suspended,{...resized,type:'chair'}).mountHeight,undefined);
const svg=require('../src/render/furniture-svg.js').render('block',1234,567,f.color,{ink:'#333'},resized);
assert.equal((svg.match(/<rect/g)||[]).length,1);assert(svg.includes('width="1234"'));assert(svg.includes('height="567"'));
const obstacle={...f,id:'obstacle',type:'washer',w:100,d:100,h:100,mountHeight:890};
assert(!G.volumeOverlap(resized,obstacle));assert(G.volumeOverlap(resized,{...obstacle,mountHeight:889}));
for(const rot of [0,37,90])for(const flip of [false,true])assert(G.volumeOverlap({...resized,rot,flip},{...obstacle,mountHeight:0}));
for(const rot of [0,37,90])for(const flip of [false,true]){
 const upper={...suspended,rot,flip};
 assert(!G.volumeOverlap(upper,{...obstacle,h:750,mountHeight:0}));
 assert(G.volumeOverlap(upper,{...obstacle,h:751,mountHeight:0}));
 assert(G.volumeOverlap(upper,{...obstacle,h:undefined,type:'unknown',mountHeight:undefined}));
}
const fingerprint=v=>P.checkFingerprint({kind:'overlap'},plan,[v],800);
assert.notEqual(fingerprint(resized),fingerprint({...resized,h:891}));
assert.notEqual(fingerprint(resized),fingerprint(suspended));
assert.equal(fingerprint(resized),fingerprint({...resized,color:'#123456',price:12,purchaseStatus:'ordered'}));
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const ctx=vm.createContext(Object.assign({FurnishDownlightModel:require("../src/render/downlight-model.js"),FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{THREE,FurnishProducts:R,FurnishCabinet:require('../src/core/cabinet-core.js'),FurnishDesign:D,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')}));
 ctx.RoundedBoxGeometry=undefined;ctx.mat=undefined;
 ctx.FurnishArmchairModel=require('../src/render/armchair-model.js');
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const dims of [[1234,567,890],[50,50,10],[20000,20000,20000]])for(const rot of [0,37,90])for(const flip of [false,true])for(const mountHeight of [0,750,20000]){
  ctx.f={...f,w:dims[0],d:dims[1],h:dims[2],rot,flip,mountHeight};const model=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),a=rot*Math.PI/180;
  near(size.x,(dims[0]*Math.abs(Math.cos(a))+dims[1]*Math.abs(Math.sin(a)))/1000);
  near(size.z,(dims[0]*Math.abs(Math.sin(a))+dims[1]*Math.abs(Math.cos(a)))/1000);near(size.y,dims[2]/1000);near(bounds.min.y,mountHeight/1000);
  assert.equal(model.children.length,1);for(const k of ['position','normal'])assert(model.children[0].geometry.attributes[k].array.every(Number.isFinite));
 }
 Object.assign(ctx,{state:{furniture:[{...suspended}]},furnG:new THREE.Group(),clearGroup:g=>g.clear(),opt:{furn:true},applyGrow:()=>{},furnitureError:R.modelError,furnitureRenderErrors:new Map(),syncModelErrors:()=>{},FurnishProject:{effectivePlan:()=>({})},PLAN:{}});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),ctx);
 vm.runInContext('buildFurn()',ctx);const first=ctx.furnG.children[0];near(new THREE.Box3().setFromObject(first).min.y,.75);
 vm.runInContext('buildFurn()',ctx);assert.equal(ctx.furnG.children[0],first);near(new THREE.Box3().setFromObject(first).min.y,.75);
 ctx.state.furniture[0].mountHeight=1200;vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],first);near(new THREE.Box3().setFromObject(ctx.furnG.children[0]).min.y,1.2);
 ctx.state.furniture[0].cx=100;vm.runInContext('buildFurn()',ctx);near(new THREE.Box3().setFromObject(ctx.furnG.children[0]).min.y,1.2);
 ctx.state.furniture[0].mountHeight=0;vm.runInContext('buildFurn()',ctx);near(new THREE.Box3().setFromObject(ctx.furnG.children[0]).min.y,0);
 assert.equal(ctx.furnitureRenderErrors.size,0);
 console.log('PASS block placeholder dimensions, production geometry, persistence and spatial bounds');
})().catch(e=>{console.error(e);process.exitCode=1;});
