'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const primitives=require('../src/render/model-primitives.js'),models=require('../src/render/appliance-model.js'),products=require('../src/core/product-rules.js');
// Compare real geometry and material values across Node and plain browser scripts.
// No DOM, application state, source extraction or repository storage is supplied.
function signature(group){
 group.updateMatrixWorld(true);const meshes=[];
 group.traverse(o=>{if(!o.isMesh)return;const attributes={};for(const [key,a] of Object.entries(o.geometry.attributes))attributes[key]=crypto.createHash('sha256').update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength)).digest('hex');
  const m=o.material;meshes.push({attributes,matrix:o.matrixWorld.toArray(),index:o.geometry.index?Array.from(o.geometry.index.array):null,color:m.color.getHex(),emissive:m.emissive.getHex(),roughness:m.roughness,metalness:m.metalness,emissiveIntensity:m.emissiveIntensity,side:m.side,castShadow:o.castShadow,receiveShadow:o.receiveShadow,waterOutlet:o.userData.waterOutlet});
 });return meshes;
}
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 const THREE=await import(imports.three),source=Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString().replace("from 'three'",`from '${imports.three}'`);
 const {RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const browser=vm.createContext({FurnishProducts:products});
 for(const file of ['model-primitives','appliance-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),browser);
 const nodeBuilder=models.create(THREE,RoundedBoxGeometry),browserBuilder=browser.FurnishApplianceModel.create(THREE,RoundedBoxGeometry);
 assert.equal(models.supported({type:'bed'}),false);assert.equal(models.supported(null),false);assert.throws(()=>nodeBuilder.build({type:'bed'}),/Unsupported/);
 let count=0;
 for(const type of ['fridge','fridge_french_drawer','waterheater_flat'])for(const [w,d,h] of [[700,320,undefined],[950,610,2000],[50,50,50]])for(const mountHeight of [undefined,0,1850]){
  const f={id:'model',type,w,d,cx:1234,cy:5678,rot:37,flip:true,color:'#c8d2dc',...(h===undefined?{}:{h}),...(mountHeight===undefined?{}:{mountHeight})},before=JSON.stringify(f);
  const a=nodeBuilder.build(f),b=browserBuilder.build(f);assert.deepEqual(signature(a),signature(b));assert.equal(JSON.stringify(f),before);
  assert.deepEqual(a.position.toArray(),[0,0,0]);assert.equal(a.rotation.y,0);assert.deepEqual(a.scale.toArray(),[1,1,1]);
  const bounds=new THREE.Box3().setFromObject(a),size=bounds.getSize(new THREE.Vector3()),near=(a,b)=>assert.ok(Math.abs(a-b)<2e-6,`${a} != ${b}`);
  near(size.x,w/1000);near(size.z,d/1000);near(size.y,products.height(f)/1000);near(bounds.min.y,type==='waterheater_flat'?(mountHeight??1650)/1000:0);count++;
 }
 // The application can inject its cached/environment-aware material factory.
 const cache=new Map(),mat=(color,o={})=>{const key=color+JSON.stringify(o);if(!cache.has(key))cache.set(key,new THREE.MeshStandardMaterial({color,roughness:.7,...o}));return cache.get(key);};
 const p=primitives.create(THREE,RoundedBoxGeometry,mat),builder=models.create(THREE,RoundedBoxGeometry,{primitives:p,products});
 const f={type:'fridge_french_drawer',w:833,d:595},a=builder.build(f),b=builder.build(f),first=signature(a);assert.deepEqual(first,signature(b));
 const materials=new Set();a.traverse(o=>{if(o.isMesh)materials.add(o.material);});assert.ok([...materials].every(m=>[...cache.values()].includes(m)));
 console.log(`PASS ${count} shared appliance builds: real browser/Node geometry and materials, legacy/zero mounting, local coordinates, immutable input and cached material injection`);
})().catch(e=>{console.error(e);process.exitCode=1;});
