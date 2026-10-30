const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {library}=require('../src/data/catalog.js'),P=require('../src/core/project-core.js');
const svg=require('../src/render/furniture-svg.js');
const items=library.find(c=>c.cat==='电器').items;
const entry=items.find(i=>i[0]==='waterheater_flat');
assert.deepEqual(entry.slice(2,4),[700,320]);assert.equal(entry[6],565);
assert.equal(items.filter(i=>i[0]==='waterheater').length,1);
assert.deepEqual(items.find(i=>i[0]==='waterheater').slice(2,4),[800,450]);
const f={id:'flat',type:entry[0],name:entry[1],cx:0,cy:0,w:entry[2],d:entry[3],color:entry[4],h:entry[6],rot:0};
assert.deepEqual(P.unpack(P.pack({planId:'p1',current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0],f);
assert.match(svg.render(f.type,f.w,f.d,f.color,{ink:'#333'}),/#17191c/);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const design=require('../src/core/design-core.js');
const installed={...f,mountHeight:1850};
const backup=P.unpack(P.pack({planId:'p1',current:{furniture:[installed]},designs:[{name:'安装方案',work:{furniture:[{...installed,mountHeight:1900}]}}],catalog:[]}));
assert.equal(backup.current.furniture[0].mountHeight,1850);assert.equal(backup.designs[0].work.furniture[0].mountHeight,1900);
for(const value of [-1,20001,NaN,Infinity,'1800',null])assert.throws(()=>P.validateWork({furniture:[{...f,mountHeight:value}]}),/离地高度/);
for(const value of [0,1650,20000])P.validateWork({furniture:[{...f,mountHeight:value}]});
assert.equal(design.replaceFurniture(installed,{...f,type:'waterheater'}).mountHeight,undefined);
assert.equal(design.replaceFurniture(installed,f).mountHeight,1850);
assert.equal(design.resizeFurniture(installed,{w:800}).mountHeight,1850);
// Exercise the actual panel change handler, including rejection and lock rules.
const elements=Object.fromEntries(['#heater-ceiling-settings','#full-product-details','#fName','#fMountHeight','#fH','#fC','#heaterSocketMode','#heaterSocketX','#heaterSocketY','#heaterSocketZ'].map(id=>[id,{}]));
let current={...f},errors=[],history=[];
const panelCtx=require('./helpers/layer-context.cjs').createContext(Object.assign({FurnishDownlightModel:require("../src/render/downlight-model.js"),FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{window:{},FurnishCabinet:{supported:()=>false},FurnishDesign:design,$:id=>elements[id],document:{querySelector:()=>null,querySelectorAll:()=>[]},getF:()=>current,mutate:fn=>{const before=JSON.stringify(current);fn();history.push(before);},toast:e=>errors.push(e),renderPanel:()=>{}}));
vm.runInContext(fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8'),panelCtx);panelCtx.renderPanel=()=>{};panelCtx.f=current;vm.runInContext('bindFurnPanel(f)',panelCtx);
const change=value=>elements['#fMountHeight'].onchange({target:{value}});
change('1850');assert.equal(current.mountHeight,1850);current=JSON.parse(history.pop());assert.equal(current.mountHeight,undefined);
change('0');assert.equal(current.mountHeight,0);
for(const value of ['','-1','20001','bad']){change(value);assert.equal(current.mountHeight,0);}
current.locked=true;change('1800');assert.equal(current.mountHeight,0);assert.match(errors.at(-1),/锁定/);
current.locked=false;elements['#fH'].onchange({target:{value:'700'}});assert.equal(current.h,700);
elements['#heaterSocketMode'].onchange({target:{value:'set'}});elements['#heaterSocketX'].onchange({target:{value:'900'}});elements['#heaterSocketZ'].onchange({target:{value:'1800'}});assert.equal(current.heaterSocket.x,900);assert.equal(current.heaterSocket.z,1800);
const previous=JSON.stringify(current);elements['#heaterSocketZ'].onchange({target:{value:'-1'}});assert.equal(JSON.stringify(current),previous);current.locked=true;elements['#heaterSocketX'].onchange({target:{value:'800'}});assert.equal(current.heaterSocket.x,900);current.locked=false;elements['#heaterSocketMode'].onchange({target:{value:'unset'}});assert.equal(current.heaterSocket,undefined);
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 const THREE=await import(imports.three);
 const roundedSource=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString('utf8').replace("from 'three'",`from '${imports.three}'`);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(roundedSource).toString('base64'));
 const ctx=require('./helpers/layer-context.cjs').createContext(Object.assign({FurnishDownlightModel:require("../src/render/downlight-model.js"),FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{THREE,RoundedBoxGeometry,FurnishDesign:design,FurnishCabinet:require('../src/core/cabinet-core.js'),M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,mat:(color,o)=>new THREE.MeshStandardMaterial({color,...o})}));
 Object.assign(ctx,{FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 ctx.FurnishArmchairModel=require('../src/render/armchair-model.js');
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 for(const mountHeight of [undefined,0,1850,20000]){
  ctx.f={...f,...(mountHeight===undefined?{}:{mountHeight})};const model=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(model);
  near(bounds.min.y,(mountHeight??1650)/1000);near(bounds.max.y,(mountHeight??1650)/1000+.565);
 }
 // A changed installation height must invalidate the cached 3D mesh.
 ctx.state={furniture:[f]};ctx.furnG=new THREE.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};ctx.furnitureError=require('../src/core/product-rules.js').modelError;ctx.furnitureRenderErrors=new Map();ctx.syncModelErrors=()=>{};
 Object.assign(ctx,{FurnishProject:{effectivePlan:()=>({})},PLAN:{},FurnishProducts:require('../src/core/product-rules.js')});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildLabels(')),ctx);
 vm.runInContext('buildFurn()',ctx);const before=ctx.furnG.children[0];
 ctx.state.furniture=[{...f,mountHeight:1900}];vm.runInContext('buildFurn()',ctx);
 assert.notEqual(ctx.furnG.children[0],before);near(new THREE.Box3().setFromObject(ctx.furnG.children[0]).min.y,1.9);
 for(const dims of [[700,320,565],[890,350,600],[500,260,450]])for(const rot of [0,90,180])for(const flip of [false,true]){
  ctx.f={...f,w:dims[0],d:dims[1],h:dims[2],rot,flip};
  const model=vm.runInContext('buildFurniture(f)',ctx),size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  near(size.x,(rot===90?dims[1]:dims[0])/1000);near(size.y,dims[2]/1000);near(size.z,(rot===90?dims[0]:dims[1])/1000);
  assert.equal(model.userData.fid,'flat');
  model.traverse(o=>{if(o.isMesh){assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite));}});
  const hot=model.children.find(o=>o.userData.waterOutlet==='hot'),cold=model.children.find(o=>o.userData.waterOutlet==='cold');
  near(cold.position.x-hot.position.x,.1*dims[0]/700);assert.ok(hot.position.x<0&&cold.position.x>0);
 }
 console.log('PASS flat heater catalog, original heater retained, project round trip, production 3D bounds/material geometry, resize/rotate/flip and outlet spacing');
})().catch(e=>{console.error(e);process.exitCode=1;});
