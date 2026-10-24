const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../src/render/robot-vacuum-model.js'),catalog=require('../src/data/catalog.js'),P=require('../src/core/project-core.js'),svg=require('../src/render/furniture-svg.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 const THREE=await import(imports.three),source=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString().replace("from 'three'",`from '${imports.three}'`);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-6,`${a} != ${b}`);
 const ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{THREE,RoundedBoxGeometry,FurnishRobotVacuumModel:model,FurnishCabinet:require('../src/core/cabinet-core.js'),M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,mat:(color,o)=>new THREE.MeshStandardMaterial({color,...o})}));
 Object.assign(ctx,{FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 Object.assign(ctx,{FurnishProject:{effectivePlan:()=>({})},PLAN:{},FurnishProducts:require('../src/core/product-rules.js')});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),ctx);
 for(const [type,dims] of Object.entries(model.specs)){
  const item=catalog.library.flatMap(c=>c.items).find(i=>i[0]===type);assert.deepEqual([item[2],item[3],item[6]],dims);
  const f={id:type,type,name:item[1],w:item[2],d:item[3],h:item[6],color:item[4],cx:700,cy:900,rot:0};
  assert.deepEqual(P.unpack(P.pack({planId:'p1',current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0],f);
  assert.ok(!/NaN|undefined/.test(svg.render(type,f.w,f.d,f.color,{ink:'#333'})));
  for(const scale of [1,1.35])for(const rot of [0,90,180])for(const flip of [false,true]){
   ctx.f={...f,w:f.w*scale,d:f.d*scale,h:f.h*scale,rot,flip};
   const object=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3());
   near(size.x,(rot===90?f.d:f.w)*scale/1000);near(size.z,(rot===90?f.w:f.d)*scale/1000);near(size.y,f.h*scale/1000);near(bounds.min.y,0);
   object.traverse(o=>{if(o.isMesh)for(const key of ['position','normal'])assert.ok(o.geometry.attributes[key].array.every(Number.isFinite));});
  }
  ctx.state={furniture:[{...f,w:f.w*1.2}]};ctx.furnG=new THREE.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};ctx.furnitureError=require('../src/core/product-rules.js').modelError;ctx.furnitureRenderErrors=new Map();ctx.syncModelErrors=()=>{};
  vm.runInContext('buildFurn()',ctx);const before=ctx.furnG.children[0];
  vm.runInContext('buildFurn()',ctx);assert.equal(ctx.furnG.children[0],before);near(new THREE.Box3().setFromObject(before).getSize(new THREE.Vector3()).x,f.w*1.2/1000);
 }
 // Real rays verify that the rebuilt dock has an open entrance and solid hood.
 const tank=model.build(THREE,{type:'robot_p20max_tank',w:450,d:450,h:450},RoundedBoxGeometry);
 tank.traverse(o=>{if(o.userData.part==='tank-parked-robot')o.visible=false;});tank.updateMatrixWorld(true);
 const visible=[];tank.traverseVisible(o=>{if(o.isMesh)visible.push(o);});
 const firstHit=(x,y)=>new THREE.Raycaster(new THREE.Vector3(x,y,.6),new THREE.Vector3(0,0,-1)).intersectObjects(visible,false)[0];
 assert.ok(firstHit(0,.1).point.z<0,'entrance opens through to the rear service wall');
 assert.ok(firstHit(0,.14).point.z>.15,'grey entrance arch has a solid upper rim');
 assert.ok(firstHit(0,.27).point.z>.19,'white front hood is solid and bulges forward');
 assert.ok(firstHit(.20,.27).point.z<firstHit(0,.27).point.z-.015,'front wraps continuously around the sides');
 // Scan both sides of the material boundary: no inset or overlapping shells.
 for(const x of [0,.10,.18]){
  const below=firstHit(x,.1529),above=firstHit(x,.1531);
  assert.ok(Math.abs(above.point.z-below.point.z)<.0001,'base and hood share their contour');
  assert.ok(above.face.normal.dot(below.face.normal)>.995,'join tangents remain smooth');
 }
 console.log('PASS P20 Max catalog, project round trip, production dimensions, rotation/mirror/resize, cached scale and finite geometry');
})().catch(e=>{console.error(e);process.exitCode=1;});
