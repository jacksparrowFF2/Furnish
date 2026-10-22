const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../src/render/yeswood-sofa-model.js'),catalog=require('../src/data/catalog.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),svg=require('../src/render/furniture-svg.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 const THREE=await import(imports.three),source=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString().replace("from 'three'",`from '${imports.three}'`);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-6,`${a} != ${b}`);
 const ctx=vm.createContext({THREE,RoundedBoxGeometry,FurnishYeswoodSofaModel:model,FurnishCabinet:require('../src/core/cabinet-core.js'),M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,mat:(color,o)=>new THREE.MeshStandardMaterial({color,...o})});
 Object.assign(ctx,{FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 Object.assign(ctx,{FurnishProject:{effectivePlan:()=>({})},PLAN:{},FurnishProducts:require('../src/core/product-rules.js')});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),ctx);
 const item=catalog.library.flatMap(c=>c.items).find(i=>i[0]===model.type);assert.deepEqual([item[2],item[3],item[6]],model.spec);assert.equal(item[5],0);
 const f={id:'yeswood',type:model.type,name:item[1],w:item[2],d:item[3],h:item[6],color:item[4],cx:700,cy:900,rot:0};
 assert.deepEqual(P.unpack(P.pack({planId:'p1',current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0],f);
 assert.ok(!/NaN|undefined/.test(svg.render(f.type,f.w,f.d,f.color,{ink:'#333'})));
 assert.equal(D.furnitureVerticalBounds({...f,h:undefined}).top,895);
 for(const dims of [[2160,892,895],[2700,1100,1020],[100,50,50]])for(const rot of [0,90,180])for(const flip of [false,true]){
  ctx.f={...f,w:dims[0],d:dims[1],h:dims[2],rot,flip};const object=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3());
  near(size.x,(rot===90?dims[1]:dims[0])/1000);near(size.z,(rot===90?dims[0]:dims[1])/1000);near(size.y,dims[2]/1000);near(bounds.min.y,0);
  object.traverse(o=>{if(o.isMesh)for(const key of ['position','normal'])assert.ok(o.geometry.attributes[key].array.every(Number.isFinite));});
 }
 ctx.state={furniture:[f]};ctx.furnG=new THREE.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};ctx.furnitureError=require('../src/core/product-rules.js').modelError;ctx.furnitureRenderErrors=new Map();ctx.syncModelErrors=()=>{};
 vm.runInContext('buildFurn()',ctx);const first=ctx.furnG.children[0];vm.runInContext('buildFurn()',ctx);assert.equal(ctx.furnG.children[0],first);
 ctx.state.furniture[0]={...f,h:1000};vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],first);near(new THREE.Box3().setFromObject(ctx.furnG.children[0]).getSize(new THREE.Vector3()).y,1);
 const replaced=D.replaceFurniture({...f,type:'sofa'},{type:model.type,name:item[1],w:2160,d:892,h:895,color:item[4],price:0});assert.equal(replaced.type,model.type);assert.equal(replaced.h,895);
 console.log('PASS YESWOOD production dimensions, resize/rotate/mirror, finite geometry, project round trip, replacement and cache invalidation');
})().catch(e=>{console.error(e);process.exitCode=1;});
