'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const E=require('../src/io/blender-export.js');
const G=require('../src/core/layout-geometry.js');
const P=require('../src/core/project-core.js');
const R=require('../src/core/product-rules.js');
const C=require('../src/data/catalog.js');
const SVG=require('../src/render/furniture-svg.js');
const specs=require('../scripts/lib/kitchen-countertop-assets.json');
const M=require('../src/render/kitchen-countertop-appliance-model.js');
const sourceFiles=['kettle','air','griddle','rice','wok','pot','insert','micro-pm20m2'];
const balconyCategories={
 'mijia-xhqb10mj103':'appliances/laundry',
 'haier-ec8fa':'appliances/climate',
 'panasonic-ni-m150np-p':'appliances/laundry'
};
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);

(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const {imports}=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
 const T=await import(imports.three);
 const navigation=C.navigation().flatMap(group=>group.children);
 const catalog=navigation.flatMap(group=>group.items).filter(it=>R.definition(it[0])?.countertop);
 assert.equal(catalog.length,Object.keys(specs).length);
 for(const [index,[id,spec]] of Object.entries(specs).entries()){
  const asset=globalThis[spec.global]=require('../src/data/'+id+'-blender-asset.js');
  const source=spec.nativeAxes?`${id}/v1/${id}-v1.glb`:`kitchen-countertop-appliances/${sourceFiles[index]}-refined.glb`;
  const glb=fs.readFileSync(require.resolve('../assets/models/'+source));
  assert.equal(crypto.createHash('sha256').update(glb).digest('hex'),asset.sourceSha256);
  assert.deepEqual(asset.parts.map(p=>p.name).sort(),spec.parts);
  assert.equal(new Set(asset.parts.map(p=>p.identity)).size,spec.parts.length);
  const [w,h,d]=spec.size;
  const f={...spec.product,id:'kitchen-product',type:'custom',name:'厨房小家电',cx:0,cy:0,w,d,h,rot:0,mountHeight:310,
   color:'#ff0000',obj:{positions:[0,0,0,.1,.2,0,0,0,.1]}};
  const original=structuredClone(f);
  const body=structuredClone(G.bodyParts(f));
  assert.equal(M.asset(f),asset);
  assert.equal(M.asset({...f,sourceUrl:'https://example.com'}),null);
  assert.equal(M.asset({...f,type:'block'}),null);
  assert.equal(M.asset({...f,obj:undefined}),null);
  const model=M.build(T,f);
  assert.deepEqual(f,original);
  assert.deepEqual(G.bodyParts(f),body);
  const {min,max}=new T.Box3().setFromObject(model,true);
  near(min.y*1000,0);
  for(const [axis,mm] of [['x',w],['y',h],['z',d]])near((max[axis]-min[axis])*1000,mm);
  assert(model.children.every(o=>o.material.color.getHexString()!=='ff0000'));
  const lens=model.children.find(o=>o.name==='Smoked inspection window lens');
  const lid=model.children.find(o=>o.name==='Thin curved smoked glass lid');
  const deck=model.children.find(o=>o.name==='Gloss black lower deck and touch control arc');
  const door=model.children.find(o=>o.name==='Smoked glass across the door aperture');
  const toshibaGlass=model.getObjectByName('Smoked door glass');
  if(lens){near(lens.material.transmission,.24);assert(lens.material.isMeshPhysicalMaterial);assert(lens.geometry.attributes.position.array[2]<0);}
  if(lid){near(lid.material.transmission,.52);assert(lid.material.isMeshPhysicalMaterial);}
  if(deck){near(deck.material.specularIntensity,.48);assert(deck.material.isMeshPhysicalMaterial);}
  if(door){
   near(door.material.transmission,.82);
   assert(door.material.isMeshPhysicalMaterial);
   const screen=model.children.find(o=>o.name==='Perforated safety screen behind glass');
   assert(screen&&new T.Box3().setFromObject(screen).min.z>new T.Box3().setFromObject(door).max.z);
   const control=model.children.find(o=>o.name==='Right hand control panel');
   assert(control&&new T.Box3().setFromObject(control).max.x<0,'the right control panel faces the aisle without mirroring its labels');
  }
  if(toshibaGlass){
   near(toshibaGlass.material.transmission,.86);
   model.updateMatrixWorld(true);
   const ray=new T.Raycaster(new T.Vector3(0,.22,.5),new T.Vector3(0,0,-1));
   assert.equal(ray.intersectObject(model.getObjectByName('White front door fascia')).length,0,'white fascia has an actual window opening');
   assert.equal(ray.intersectObjects(model.children)[0].object,toshibaGlass);
   assert(new T.Box3().setFromObject(model.getObjectByName('Rotary dial face'),true).min.x>0,'dial is on the right facing +Z');
  }
  const physicalCount=lens||lid||deck||door||toshibaGlass?1:0;
  assert.equal(model.children.filter(o=>o.material.isMeshPhysicalMaterial).length,physicalCount);
  model.userData.fid=f.id;
  model.position.y=f.mountHeight/1000;
  const snapshot=E.snapshot(T,{groups:[model],camera:new T.PerspectiveCamera()});
  try{
   const meshes=snapshot.scene.children.filter(o=>o.isMesh);
   assert.equal(meshes.length,spec.parts.length);
   assert.equal(new Set(meshes.map(o=>o.userData.furnishPartKey)).size,spec.parts.length);
   assert(meshes.every(o=>o.userData.furnishId===f.id));
   assert.equal(meshes.filter(o=>o.material.isMeshPhysicalMaterial).length,physicalCount);
  }finally{snapshot.dispose();}
  const work={furniture:[f]};
  const project=P.pack({planId:'kitchen-test',current:work,designs:[],catalog:[]});
  assert.deepEqual(P.unpack(project).current.furniture,[original]);

  const item=catalog.find(it=>C.itemIdentity(it).model===spec.product.model);
  const [type,name,width,depth,color,price]=item,rule=R.definition(type);
  assert.deepEqual([width,C.itemHeight(item),depth],spec.size);
  assert.deepEqual(C.itemIdentity(item),spec.product);
  assert.equal(price,undefined);
  assert(C.matches(item,{query:spec.product.model,use:balconyCategories[id]?'laundry':'kitchen'}));
  const category=balconyCategories[id]||(rule.countertop.cookware?'other/cookware':'appliances/cooking');
  assert(navigation.find(g=>g.id===category).items.includes(item));
  assert(SVG.render(type,width,depth,color,{ink:'#333'}).includes('<rect'));
  const native={id:'catalog-product',type,name,cx:438,cy:752,w,d,h,rot:0,color,...R.initial({type,w,d,h})};
  assert.equal(native.mountHeight,0);
  assert.equal(M.asset({...native,brand:'自定义备注',model:'自定义备注'}),asset);
  assert.equal(M.asset({...native,obj:f.obj}),null);
  const raised=R.editBottomHeight({...native,rot:37,flip:true},310);
  const real=M.build(T,raised);
  real.updateMatrixWorld(true);
  const front=real.getObjectByName('Right hand control panel')||real.getObjectByName('Front SUPOR mark')||real.getObjectByName('Smoked inspection window lens')||real.getObjectByName('Center glass circular display');
  if(front)assert(new T.Box3().setFromObject(front,true).min.z>0,'the catalog controls face +Z');
  real.position.set(raised.cx/1000,0,raised.cy/1000);
  real.rotation.y=-raised.rot*Math.PI/180;
  real.scale.x=-1;
  const bounds=new T.Box3().setFromObject(real,true);
  assert.deepEqual(R.vertical(raised),{bottom:310,top:310+h,source:'recorded'});
  const bodyParts=G.bodyParts(raised);
  assert(bodyParts.length>1&&bodyParts.every(part=>part.vertices.length));
  for(const [axis,key] of ['x','y','z'].entries()){
   const lo=Math.min(...bodyParts.map(part=>Math.min(...part.vertices.map(v=>v[axis]))));
   const hi=Math.max(...bodyParts.map(part=>Math.max(...part.vertices.map(v=>v[axis]))));
   near(lo,bounds.min[key]*1000);
   near(hi,bounds.max[key]*1000);
  }
  const named={id:'countertop-design',name:'Catalog',work:{furniture:[raised]}};
  const catalogProject=P.pack({planId:'kitchen-test',current:named.work,designs:[named],catalog:[]});
  const recovered=P.unpack(catalogProject);
  assert.deepEqual(recovered.current.furniture,[raised]);
  assert.deepEqual(recovered.designs[0].work.furniture,[raised]);
 }
 console.log(`PASS ${Object.keys(specs).length} catalog models, OBJ lookup, default/elevated solids, material export and named project round-trip`);
})().catch(e=>{console.error(String(e.stack||e).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g,'three-r160'));process.exitCode=1;});
