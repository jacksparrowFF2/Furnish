const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../src/render/robot-vacuum-model.js'),catalog=require('../src/data/catalog.js'),P=require('../src/core/project-core.js'),svg=require('../src/render/furniture-svg.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 const THREE=await import(imports.three),source=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString().replace("from 'three'",`from '${imports.three}'`);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-6,`${a} != ${b}`);
 const ctx=vm.createContext({THREE,RoundedBoxGeometry,FurnishRobotVacuumModel:model,FurnishCabinet:require('../src/core/cabinet-core.js'),M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,mat:(color,o)=>new THREE.MeshStandardMaterial({color,...o})});
 vm.runInContext(html.slice(html.indexOf('const asMat ='),html.indexOf('/* ======================= 建筑')),ctx);
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
  ctx.state={furniture:[{...f,w:f.w*1.2}]};ctx.furnG=new THREE.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};
  vm.runInContext('buildFurn()',ctx);const before=ctx.furnG.children[0];
  vm.runInContext('buildFurn()',ctx);assert.equal(ctx.furnG.children[0],before);near(new THREE.Box3().setFromObject(before).getSize(new THREE.Vector3()).x,f.w*1.2/1000);
 }
 console.log('PASS P20 Max catalog, project round trip, production dimensions, rotation/mirror/resize, cached scale and finite geometry');
})().catch(e=>{console.error(e);process.exitCode=1;});
