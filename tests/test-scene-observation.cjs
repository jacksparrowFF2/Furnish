const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const O=require('../src/render/scene-observation.js'),K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/product-rules.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:C,FurnishProducts:P});for(const file of ['solid-cut','cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 for(const rot of [0,37,90,180,270])for(const side of ['left','right'])for(const open of [false,true]){
  let n=0;let items=K.createLaundryArea({id:'base',cx:0,cy:0,rot,color:'#eee'},()=> 'f'+ ++n,'group',side);if(open)items=K.setLaundryDoors(items,'base',true);
  const group=new T.Group();for(const f of items.filter(f=>f.kitchen||f.cabinet)){
   const model=(f.kitchen?ctx.FurnishKitchenModel:ctx.FurnishCabinetModel).build(T,f,box,{furniture:items});model.position.set(f.cx/1000,(f.mountHeight||0)/1000,f.cy/1000);model.rotation.y=-rot*Math.PI/180;model.scale.x=f.flip?-1:1;group.add(model);
  }
  const bounds=new T.Box3().setFromObject(group,true);assert(bounds.max.y>=2.4-1e-6,'includes production upper cabinet');
  for(const [width,height] of [[1480,1050],[390,844],[844,390]]){
   const camera=new T.PerspectiveCamera(45,width/height,.05,300),marginX=24,marginY=height*.22,dir=new T.Vector3(-Math.sin(rot*Math.PI/180),.22,Math.cos(rot*Math.PI/180)),pose=O.fit(T,camera,bounds,dir,{width,height,marginX,marginY});camera.position.copy(pose.p);camera.lookAt(pose.t);camera.updateMatrixWorld();
   for(const p of O.corners(T,bounds)){const q=p.project(camera);assert(Math.abs(q.x)<1-2*marginX/width+1e-6);assert(Math.abs(q.y)<1-2*marginY/height+1e-6);assert(q.z>-1&&q.z<1);}
  }
 }
 const camera=new T.PerspectiveCamera(45,1,.05,300);camera.position.set(0,1.2,5);camera.lookAt(0,1.2,0);camera.updateMatrixWorld();
 const bounds=new T.Box3(new T.Vector3(-.67,0,-.32),new T.Vector3(.67,2.4,.32)),arch=new T.Group(),shared=new T.MeshStandardMaterial(),wall=new T.Mesh(new T.BoxGeometry(4,3,.2),shared),back=wall.clone();wall.position.set(0,1.5,2);back.position.set(0,1.5,-1);arch.add(wall,back);
 const observation=O.create(T);assert(observation.update(camera,bounds,arch));const copy=wall.material;assert.notEqual(copy,shared);assert.equal(shared.clippingPlanes,null);assert(copy.clipShadows);
 assert(observation.clipped({object:wall,point:new T.Vector3(0,1,2)}));assert(!observation.clipped({object:back,point:new T.Vector3(0,1,-1)}));assert(!observation.update(camera,bounds,arch),'stationary view reuses shadow cache');
 camera.position.set(5,1.2,0);camera.lookAt(0,1.2,0);camera.updateMatrixWorld();assert(observation.update(camera,bounds,arch));assert.equal(wall.material,copy,'camera orbit reuses material');
 assert(observation.clear());assert.equal(wall.material,shared);assert.equal(back.material,shared);assert(!observation.clipped({object:wall,point:new T.Vector3(0,1,2)}));assert(!observation.clear());
 console.log('PASS production laundry framing: group height, open doors, rotation, mirror and narrow/landscape viewports; temporary clip planes, shared materials, shadows and restoration');
})().catch(e=>{console.error(e);process.exitCode=1;});
