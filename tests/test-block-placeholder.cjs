const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js');
const entry=require('../src/data/catalog.js').library.find(c=>c.cat==='占位体').items[0];
const f={id:'block',type:entry[0],name:entry[1],w:entry[2],d:entry[3],h:entry[6],color:entry[4],cx:0,cy:0,rot:0};
assert.equal(f.type,'block');assert.equal(f.h,1000);assert.equal(entry[5],undefined);
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
const work={furniture:[resized]},packed=P.unpack(P.pack({planId:'test',current:work,designs:[{id:'named',name:'占位',work}],catalog:[]}));
assert.deepEqual(packed.current.furniture,[resized]);assert.deepEqual(packed.designs[0].work.furniture,[resized]);
const plan={rooms:[],walls:[],doors:[],wins:[],slides:[],markers:[],beams:[],bounds:{x:-3000,y:-3000,w:6000,h:6000}};
const copy=D.pasteFurniture({items:[resized],cx:0,cy:0},{x:1000,y:1000},plan.bounds,()=> 'copy').items[0];
assert.deepEqual([copy.w,copy.d,copy.h],[1234,567,890]);assert.equal(copy.id,'copy');
const fromPipe=D.replaceFurniture({...f,type:'pipebox',mountHeight:750,pipeBoxThickness:18,pipeBoxShape:'three'},{...resized});
assert.equal(fromPipe.type,'block');for(const key of ['mountHeight','pipeBoxThickness','pipeBoxShape'])assert.equal(fromPipe[key],undefined);
const svg=require('../src/render/furniture-svg.js').render('block',1234,567,f.color,{ink:'#333'},resized);
assert.equal((svg.match(/<rect/g)||[]).length,1);assert(svg.includes('width="1234"'));assert(svg.includes('height="567"'));
const obstacle={...f,id:'obstacle',type:'washer',w:100,d:100,h:100,mountHeight:890};
assert(!G.volumeOverlap(resized,obstacle));assert(G.volumeOverlap(resized,{...obstacle,mountHeight:889}));
for(const rot of [0,37,90])for(const flip of [false,true])assert(G.volumeOverlap({...resized,rot,flip},{...obstacle,mountHeight:0}));
const fingerprint=v=>P.checkFingerprint({kind:'overlap'},plan,[v],800);
assert.notEqual(fingerprint(resized),fingerprint({...resized,h:891}));
assert.equal(fingerprint(resized),fingerprint({...resized,color:'#123456',price:12,purchaseStatus:'ordered'}));
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const ctx=vm.createContext({THREE,FurnishProducts:R,FurnishCabinet:require('../src/core/cabinet-core.js'),FurnishDesign:D,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 ctx.RoundedBoxGeometry=undefined;ctx.mat=undefined;
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const dims of [[1234,567,890],[50,50,10],[20000,20000,20000]])for(const rot of [0,37,90])for(const flip of [false,true]){
  ctx.f={...f,w:dims[0],d:dims[1],h:dims[2],rot,flip};const model=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),a=rot*Math.PI/180;
  near(size.x,(dims[0]*Math.abs(Math.cos(a))+dims[1]*Math.abs(Math.sin(a)))/1000);
  near(size.z,(dims[0]*Math.abs(Math.sin(a))+dims[1]*Math.abs(Math.cos(a)))/1000);near(size.y,dims[2]/1000);near(bounds.min.y,0);
  assert.equal(model.children.length,1);for(const k of ['position','normal'])assert(model.children[0].geometry.attributes[k].array.every(Number.isFinite));
 }
 console.log('PASS block placeholder dimensions, production geometry, persistence and spatial bounds');
})().catch(e=>{console.error(e);process.exitCode=1;});
