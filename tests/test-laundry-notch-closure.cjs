const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),R=require('../src/core/product-rules.js'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishKitchen:K,FurnishProducts:R,FurnishCabinet:C});
 for(const n of ['solid-cut','cabinet-model','sink-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+n+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 for(const side of ['left','right'])for(const flip of [false,true])for(const rot of [0,37,90]){
  let i=0;const f=K.createLaundryCabinet({id:'base',cx:2000,cy:2000,color:'#ffffff'},()=>`p${++i}`,'right')[0];
  f.flip=flip;f.rot=rot;f.kitchen.laundry.notch={side,width:121,depth:100};if(side==='right')f.kitchen.modules.reverse();
  // Isolate the base to test the cabinet and notch without the basin or upper units.
  delete f.kitchen.laundry.assembly;delete f.kitchen.laundry.appliance;K.validate(f);
  const boards=K.laundryNotchBoards(f);assert.equal(boards.length,2);assert(boards.every(b=>b.bottom===0));
  const model=ctx.FurnishKitchenModel.build(T,f,box);model.updateMatrixWorld(true);
  const meshes=[];model.traverse(o=>{if(o.userData.laundryNotchBoard)meshes.push(o);});assert.equal(meshes.length,2);
  for(const b of boards){const ray=new T.Raycaster(new T.Vector3(b.x/1000,2,b.y/1000),new T.Vector3(0,-1,0));assert(ray.intersectObjects(meshes).length>0,'actual return panel closes exposed face');}
  const x=(side==='left'?-1:1)*(f.w/2-60),ray=new T.Raycaster(new T.Vector3(x/1000,2,-f.d/2000+.05),new T.Vector3(0,-1,0));assert.equal(ray.intersectObject(model,true).length,0,'pipe void stays empty');
  const packed=P.unpack(P.pack({planId:'test',current:{furniture:[f]},designs:[],catalog:[]}));assert.deepEqual(K.laundryNotchBoards(packed.current.furniture[0]),boards);
 }
 console.log('Laundry notch closure: production panels, empty pipe void, sides, transforms and project roundtrip passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
