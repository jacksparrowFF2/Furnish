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
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 const THREE=await import(imports.three);
 const roundedSource=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString('utf8').replace("from 'three'",`from '${imports.three}'`);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(roundedSource).toString('base64'));
 const ctx=vm.createContext({THREE,RoundedBoxGeometry,FurnishCabinet:require('../src/core/cabinet-core.js'),M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,mat:(color,o)=>new THREE.MeshStandardMaterial({color,...o})});
 vm.runInContext(html.slice(html.indexOf('const asMat ='),html.indexOf('/* ======================= 建筑')),ctx);
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
