const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../src/render/shower-arrow-model.js'),catalog=require('../src/data/catalog.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),svg=require('../src/render/furniture-svg.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 const THREE=await import(imports.three),source=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString().replace("from 'three'",`from '${imports.three}'`);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-6,`${a} != ${b}`);
 const ctx=vm.createContext({THREE,RoundedBoxGeometry,FurnishYeswoodSofaModel:require('../src/render/yeswood-sofa-model.js'),FurnishArrowShowerModel:model,FurnishCabinet:require('../src/core/cabinet-core.js'),M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,mat:(color,o)=>new THREE.MeshStandardMaterial({color,...o})});
 Object.assign(ctx,{FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 Object.assign(ctx,{FurnishProject:{effectivePlan:()=>({})},PLAN:{},FurnishProducts:require('../src/core/product-rules.js')});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),ctx);
 const item=catalog.library.flatMap(c=>c.items).find(i=>i[0]===model.type);assert.deepEqual([item[2],item[3],item[6]],model.spec);assert.equal(item[5],0);
 const f={id:'shower',mountHeight:350,type:model.type,name:item[1],w:item[2],d:item[3],h:item[6],color:item[4],cx:700,cy:900,rot:0};
 assert.deepEqual(P.unpack(P.pack({planId:'p1',current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0],f);
 for(const mountHeight of [-1,20001,'350'])assert.throws(()=>P.validateWork({furniture:[{...f,mountHeight}]}),/离地高度/);
 assert.equal(D.replaceFurniture(f,{type:'toilet',name:'马桶',w:400,d:700,color:'#fff',price:0}).mountHeight,undefined);
 assert.ok(!/NaN|undefined/.test(svg.render(f.type,f.w,f.d,f.color,{ink:'#333'})));
 assert.equal(D.furnitureVerticalBounds({...f,h:undefined}).top,2099);
 for(const dims of [[420,515,1749],[500,600,1850],[100,50,50]])for(const rot of [0,90,180])for(const flip of [false,true]){
  ctx.f={...f,w:dims[0],d:dims[1],h:dims[2],rot,flip};const object=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3());
  near(size.x,(rot===90?dims[1]:dims[0])/1000);near(size.z,(rot===90?dims[0]:dims[1])/1000);near(size.y,dims[2]/1000);near(bounds.min.y,.350);
  object.traverse(o=>{if(o.isMesh)for(const key of ['position','normal'])assert.ok(o.geometry.attributes[key].array.every(Number.isFinite));});
 }
 ctx.state={furniture:[f]};ctx.furnG=new THREE.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};ctx.furnitureError=require('../src/core/product-rules.js').modelError;ctx.furnitureRenderErrors=new Map();ctx.syncModelErrors=()=>{};
 vm.runInContext('buildFurn()',ctx);const first=ctx.furnG.children[0];vm.runInContext('buildFurn()',ctx);assert.equal(ctx.furnG.children[0],first);
 ctx.state.furniture[0]={...f,h:1000};vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],first);near(new THREE.Box3().setFromObject(ctx.furnG.children[0]).getSize(new THREE.Vector3()).y,1);
 for(const mountHeight of [0,900]){const obj=model.build(THREE,{...f,mountHeight},RoundedBoxGeometry);near(new THREE.Box3().setFromObject(obj).min.y,mountHeight/1000);}
 near(D.replaceFurniture({...f,mountHeight:0},{type:model.type,name:item[1],w:420,d:515,h:1749,color:item[4],price:0}).showerMixerHeight,646.889539615265);
 const replaced=D.replaceFurniture({...f,type:'sofa'},{type:model.type,name:item[1],w:420,d:515,h:1749,color:item[4],price:0});assert.equal(replaced.type,model.type);assert.equal(replaced.h,1749);
 const poses=[100,400,500].map(showerRise=>model.build(THREE,{...f,showerRise},RoundedBoxGeometry));
 for(const [i,rise] of [100,400,500].entries()){
  const bounds=new THREE.Box3().setFromObject(poses[i]);near(bounds.min.y,.35);near(bounds.max.y,D.furnitureVerticalBounds({...f,showerRise:rise}).top/1000);
  const grip=poses[i].getObjectByName('shower-hand').getWorldPosition(new THREE.Vector3());const baseGrip=poses[1].getObjectByName('shower-hand').getWorldPosition(new THREE.Vector3());near(grip.y,baseGrip.y);
 }
 for(const showerHandAngle of [0,35]){const obj=model.build(THREE,{...f,showerHandAngle},RoundedBoxGeometry),hand=obj.getObjectByName('shower-hand');near(hand.rotation.x,-showerHandAngle*Math.PI/180);near(hand.getWorldPosition(new THREE.Vector3()).y,poses[1].getObjectByName('shower-hand').getWorldPosition(new THREE.Vector3()).y);}
 const configured={...f,showerRise:100,showerHandAngle:35};assert.deepEqual(P.unpack(P.pack({planId:'p1',current:{furniture:[configured]},designs:[],catalog:[]})).current.furniture[0],configured);
 for(const showerRise of [99,501,'400'])assert.throws(()=>P.validateWork({furniture:[{...f,showerRise}]}),/调节段/);
 for(const showerHandAngle of [-1,36,'20'])assert.throws(()=>P.validateWork({furniture:[{...f,showerHandAngle}]}),/角度/);
 assert.equal(D.replaceFurniture(configured,{type:model.type,name:item[1],w:420,d:515,h:1749,color:item[4],price:0}).showerRise,100);
 const other=D.replaceFurniture(configured,{type:'toilet',name:'马桶',w:400,d:700,color:'#fff',price:0});assert.equal(other.showerRise,undefined);assert.equal(other.showerHandAngle,undefined);
 ctx.state.furniture=[{...f,showerRise:400}];vm.runInContext('buildFurn()',ctx);const cached=ctx.furnG.children[0];ctx.state.furniture[0].showerRise=100;vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],cached);
 for(const mixerHeight of [0,900,1000,1100])for(const height of [1749,2000])for(const rise of [100,500]){
  const entry={...f,h:height,showerMixerHeight:mixerHeight,showerRise:rise},obj=model.build(THREE,entry,RoundedBoxGeometry);obj.updateMatrixWorld(true);
  near(obj.getObjectByName('shower-mixer').getWorldPosition(new THREE.Vector3()).y,mixerHeight/1000);
  const b=new THREE.Box3().setFromObject(obj),expected=D.showerInstallation(entry);near(b.min.y,expected.bottom/1000);near(b.max.y,expected.top/1000);
 }
 const oldObj=model.build(THREE,f,RoundedBoxGeometry),legacyOffset=oldObj.userData.mixerOffset;near(legacyOffset,646.889539615265);
 const restored=D.restoreFurniture([f],{makeId:()=> 'copy',colorFor:()=> '#fff'})[0];assert.equal(restored.mountHeight,undefined);near(restored.showerMixerHeight,350+legacyOffset);
 const newObj=model.build(THREE,restored,RoundedBoxGeometry);near(new THREE.Box3().setFromObject(oldObj).min.y,new THREE.Box3().setFromObject(newObj).min.y);
 assert.deepEqual(D.restoreFurniture([restored],{makeId:()=> 'copy',colorFor:()=> '#fff'})[0],restored);
 const resized=D.resizeFurniture({...restored,showerMixerHeight:1000},{h:2000});near(model.build(THREE,resized,RoundedBoxGeometry).getObjectByName('shower-mixer').getWorldPosition(new THREE.Vector3()).y,1);
 const newDefault={...f,showerMixerHeight:1000};delete newDefault.mountHeight;assert.deepEqual(P.unpack(P.pack({planId:'p1',current:{furniture:[newDefault]},designs:[],catalog:[]})).current.furniture[0],newDefault);
 const replacedMixer=D.replaceFurniture(newDefault,{type:model.type,name:item[1],w:420,d:515,h:2000,color:item[4],price:0});assert.equal(replacedMixer.showerMixerHeight,1000);
 assert.equal(D.replaceFurniture(newDefault,{type:'toilet',name:'马桶',w:400,d:700,color:'#fff',price:0}).showerMixerHeight,undefined);
 for(const showerMixerHeight of [-1,40001,'1000'])assert.throws(()=>P.validateWork({furniture:[{...newDefault,showerMixerHeight}]}),/混水器中心/);
 ctx.state.furniture=[newDefault];vm.runInContext('buildFurn()',ctx);const beforeMixer=ctx.furnG.children[0];ctx.state.furniture[0].showerMixerHeight=900;vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],beforeMixer);near(ctx.furnG.children[0].getObjectByName('shower-mixer').getWorldPosition(new THREE.Vector3()).y,.9);
 console.log('PASS ARROW shower production dimensions, resize/rotate/mirror, finite geometry, project round trip, replacement and cache invalidation');
})().catch(e=>{console.error(e);process.exitCode=1;});
