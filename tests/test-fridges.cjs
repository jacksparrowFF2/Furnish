const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),C=require('../src/core/cabinet-core.js');
const item=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]==='fridge_french_drawer');
assert.deepEqual(item.slice(2,4),[833,595]);assert.equal(item[6],1910);
const base={id:'fridge',type:'fridge',name:'冰箱',w:700,d:700,cx:0,cy:0,rot:0,color:'#f1f0ed'};
for(const type of ['fridge','fridge_french_drawer']){
 let current={...base,type};const els=Object.fromEntries(['#full-product-details','#fName','#fW','#fD','#fH','#fC'].map(id=>[id,{}])),history=[];
 const ctx=require('./helpers/layer-context.cjs').createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{window:{},FurnishCabinet:C,FurnishDesign:D,$:id=>els[id],document:{querySelectorAll:()=>[]},getF:()=>current,mutate:fn=>{history.push({...current});fn();},toast:()=>{},renderPanel:()=>{}}));
 vm.runInContext(fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8'),ctx);ctx.renderPanel=()=>{};ctx.f=current;vm.runInContext('bindFurnPanel(f)',ctx);
 for(const [key,value] of [['W',950],['D',610],['H',2000]])els['#f'+key].onchange({target:{value:String(value)}});
 assert.deepEqual([current.w,current.d,current.h],[950,610,2000]);assert.equal(history[2].h,undefined);
 for(const value of ['','bad','-1','20001'])els['#fH'].onchange({target:{value}});assert.equal(current.h,2000);
 current.locked=true;els['#fH'].onchange({target:{value:'1900'}});assert.equal(current.h,2000);current.locked=false;
 const restored=P.unpack(P.pack({planId:'p1',current:{furniture:[current]},designs:[{name:'冰箱',work:{furniture:[current]}}],catalog:[]}));
 assert.deepEqual(restored.current.furniture[0],current);assert.equal(restored.designs[0].work.furniture[0].h,2000);
 assert.equal(D.pasteFurniture({cx:0,cy:0,items:[current]},{x:1000,y:1000},{x:0,y:0,w:5000,h:5000},()=> 'copy').items[0].h,2000);
 assert.equal(D.furnitureVerticalBounds({...base,type}).top,type==='fridge'?1800:1910);
}
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const roundedSource=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString('utf8').replace("from 'three'",`from '${imports.three}'`);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(roundedSource).toString('base64'));
 const ctx=require('./helpers/layer-context.cjs').createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{THREE,RoundedBoxGeometry,FurnishDesign:D,FurnishCabinet:C,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,mat:(color,o)=>new THREE.MeshStandardMaterial({color,...o})}));
 Object.assign(ctx,{FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
 for(const type of ['fridge','fridge_french_drawer'])for(const [w,d,h] of [[700,700,undefined],[833,595,1910],[1000,800,2100],[50,50,50]])for(const rot of [0,90])for(const flip of [false,true]){
  ctx.f={...base,type,w,d,h,rot,flip};const model=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  near(size.x,(rot===0?w:d)/1000);near(size.z,(rot===0?d:w)/1000);near(size.y,(h??(type==='fridge'?1800:1910))/1000);near(bounds.min.y,0);
  model.traverse(o=>{if(o.isMesh){assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite));}});
 }
 ctx.state={furniture:[{...base}]};ctx.furnG=new THREE.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};ctx.furnitureError=f=>D.products().modelError(f);ctx.furnitureRenderErrors=new Map();ctx.syncModelErrors=()=>{};
 Object.assign(ctx,{FurnishProject:{effectivePlan:()=>({})},PLAN:{},FurnishProducts:require('../src/core/product-rules.js'),M:v=>v/1000});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildLabels(')),ctx);vm.runInContext('buildFurn()',ctx);const old=ctx.furnG.children[0];
 ctx.state.furniture[0].h=2100;vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],old);near(new THREE.Box3().setFromObject(ctx.furnG.children[0]).max.y,2.1);
 console.log('PASS fridge editing, lock, persistence, copy, default heights, 3D envelopes, rotation/mirroring and cache');
})().catch(e=>{console.error(e);process.exitCode=1;});
