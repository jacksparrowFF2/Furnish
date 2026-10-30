'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const ctx=require('../tests/helpers/layer-context.cjs').createContext({THREE,FurnishProducts:P,FurnishCabinet:require('../src/core/cabinet-core.js'),FurnishDesign:D,FurnishPartIdentity:require('../src/core/part-identity.js'),syncIdentity:require('../src/core/part-identity.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5});
 for(const [name,file]of Object.entries({FurnishSlidingOpeningModel:'sliding-opening',FurnishApplianceModel:'appliance',FurnishManifoldModel:'manifold',FurnishDownlightModel:'downlight',FurnishArmchairModel:'armchair',FurnishBasicFurnitureModel:'basic-furniture'}))ctx[name]=require('../src/render/'+file+'-model.js');
 ctx.RoundedBoxGeometry=undefined;ctx.mat=(color,options={})=>new THREE.MeshStandardMaterial({color,...options});
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 for(const curtainStyle of ['single','double'])for(const curtainOpen of [undefined,0,.5,1])for(const d of [20,180])for(const h of [600,2400])for(const rot of [0,37])for(const flip of [false,true]){
  ctx.f={id:'curtain',type:'curtain',name:'布帘',cx:0,cy:0,w:2400,d,h,rot,flip,curtainStyle,...(curtainOpen===undefined?{}:{curtainOpen})};const before=JSON.stringify(ctx.f),model=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(model),numeric=D.furnitureVerticalBounds(ctx.f);
  assert(bounds.min.y>=numeric.bottom/1000-1e-6);assert(Math.abs(bounds.max.y-numeric.top/1000)<1e-6,'rod finials must fit saved height');assert.equal(JSON.stringify(ctx.f),before);
 }
 console.log('PASS curtain production height includes rod and finials: legacy/open/closed, single/double, depths, heights, rotation and mirror');
})().catch(e=>{console.error(e);process.exitCode=1;});
