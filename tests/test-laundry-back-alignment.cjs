const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),R=require('../src/core/product-rules.js'),C=require('../src/core/cabinet-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishKitchen:K,FurnishProducts:R,FurnishCabinet:C}));
 for(const n of ['solid-cut','cabinet-model','sink-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+n+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 for(const side of ['left','right'])for(const rot of [0,37,90,270]){
  let n=0;const f=K.createLaundryCabinet({id:'back',cx:2000,cy:2000,rot},()=>`p${++n}`,side)[0];
  for(const p of K.laundryParts(f).filter(p=>p.key!=='sink')){const y=K.local(f,p.furniture.cx,p.furniture.cy)[1];assert(Math.abs(y-p.furniture.d/2+f.d/2)<1e-6);}
  const old=structuredClone(f);for(const key of ['upper','open'])old.kitchen.laundry.assembly[key].y+=100;
  const restored=D.restoreFurniture([old],{makeId:()=> 'r',colorFor:()=> '#fff'})[0];assert.equal(restored.kitchen.laundry.assembly.upper.y,old.kitchen.laundry.assembly.upper.y,'old custom offsets survive restore');
  const aligned=K.alignLaundryBack(old);for(const key of ['upper','open'])assert(Math.abs(aligned.kitchen.laundry.assembly[key].y-f.kitchen.laundry.assembly[key].y)<1e-6);assert.deepEqual(K.alignLaundryBack(aligned),aligned);assert.throws(()=>K.alignLaundryBack({...old,locked:true}),/锁定/);
  const resized=K.resizeOuter(aligned,'top',-30);for(const key of ['upper','open'])assert.equal(resized.kitchen.laundry.assembly[key].y,(resized.kitchen.laundry.assembly[key].d-resized.d)/2);
  assert.deepEqual(P.unpack(P.pack({planId:'test',current:{furniture:[aligned]},designs:[],catalog:[]})).current.furniture[0],aligned);
  const model=ctx.FurnishKitchenModel.build(T,aligned,box);model.updateMatrixWorld(true);
  for(const key of ['upper','open']){const part=aligned.kitchen.laundry.assembly[key],group=model.children.find(o=>Math.abs(o.position.y-part.mountHeight/1000)<1e-8),bounds=new T.Box3().setFromObject(group);assert(Math.abs(bounds.min.z+aligned.d/2000)<1e-6,'actual production rear boards share base rear plane');}
 }
 console.log('Laundry rear alignment: templates, explicit old-data action, depth resizing, transforms, production boards and roundtrip passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
