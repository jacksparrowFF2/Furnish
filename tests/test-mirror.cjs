const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),C=require('../src/core/cabinet-core.js');
const item=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]==='mirror');
assert.equal(item[6],1650);
const base={id:'mirror',type:'mirror',name:'穿衣镜',w:500,d:60,cx:0,cy:0,rot:0,color:'#dfe6ea'};
let current={...base};const els=Object.fromEntries(['#full-product-details','#fName','#fW','#fD','#fH','#fC'].map(id=>[id,{}])),history=[];
const ui=require('./helpers/layer-context.cjs').createContext({window:{},FurnishCabinet:C,FurnishDesign:D,$:id=>els[id],document:{querySelectorAll:()=>[]},getF:()=>current,mutate:fn=>{history.push({...current});fn();},toast:()=>{},renderPanel:()=>{}});
vm.runInContext(fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8'),ui);ui.renderPanel=()=>{};ui.f=current;vm.runInContext('bindFurnPanel(f)',ui);
els['#fH'].onchange({target:{value:'1900'}});assert.equal(current.h,1900);assert.equal(history[0].h,undefined);
for(const value of ['','bad','-1','0','49','20001'])els['#fH'].onchange({target:{value}});assert.equal(current.h,1900);
current.locked=true;els['#fH'].onchange({target:{value:'1800'}});assert.equal(current.h,1900);delete current.locked;
const restored=P.unpack(P.pack({planId:'p1',current:{furniture:[current]},designs:[{name:'镜子',work:{furniture:[current]}}],catalog:[]}));
assert.equal(restored.current.furniture[0].h,1900);assert.equal(restored.designs[0].work.furniture[0].h,1900);
assert.equal(D.pasteFurniture({cx:0,cy:0,items:[current]},{x:1000,y:1000},{x:0,y:0,w:5000,h:5000},()=> 'copy').items[0].h,1900);
assert.equal(D.furnitureVerticalBounds(base).top,1700);assert.equal(D.furnitureVerticalBounds(current).top,1950);
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const source=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString('utf8').replace("from 'three'",`from '${imports.three}'`);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const ctx=require('./helpers/layer-context.cjs').createContext({THREE,RoundedBoxGeometry,FurnishDesign:D,FurnishCabinet:C,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,mat:(color,o)=>new THREE.MeshStandardMaterial({color,...o})});
 Object.assign(ctx,{FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
 for(const h of [undefined,50,1200,1900,2400])for(const rot of [0,90])for(const flip of [false,true]){
  ctx.f={...base,h,rot,flip};const model=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(model);
  near(bounds.min.y,.05);near(bounds.max.y,.05+(h??1650)/1000);
  model.traverse(o=>{if(o.isMesh){assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite));if(o.geometry.type==='PlaneGeometry')assert.ok(o.geometry.parameters.height>0);}});
 }
 ctx.state={furniture:[{...base}]};ctx.furnG=new THREE.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};ctx.furnitureError=f=>D.products().modelError(f);ctx.furnitureRenderErrors=new Map();ctx.syncModelErrors=()=>{};
 Object.assign(ctx,{FurnishProject:{effectivePlan:()=>({})},PLAN:{},FurnishProducts:require('../src/core/product-rules.js'),M:v=>v/1000});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildLabels(')),ctx);vm.runInContext('buildFurn()',ctx);const old=ctx.furnG.children[0];
 ctx.state.furniture[0].h=1900;vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],old);near(new THREE.Box3().setFromObject(ctx.furnG.children[0]).max.y,1.95);
 console.log('PASS mirror height editing, validation, lock, history, persistence, copy, legacy defaults, production geometry and cache refresh');
})().catch(e=>{console.error(e);process.exitCode=1;});
