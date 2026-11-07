'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js'),M=require('../src/core/cabinet-motion.js'),Model=require('../src/render/cabinet-model.js'),Rules=require('../src/core/product-rules.js');
const near=(a,b,label)=>assert(Math.abs(a-b)<.001,`${label}: ${a} != ${b}`);
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 let cases=0,drawers=0;
 for(const [template] of C.templates)for(const thickness of [12,18,30])for(const back of [undefined,0,6,50])for(const extension of [0,.37,1]){
  let f={...C.preset(template),id:'assembly',type:C.templateType(template),cx:2000,cy:3000,rot:37,flip:true,mountHeight:120};
  if(!f.cabinet.columns.some(col=>col.drawers.length&&col.top!=='drawer'))continue;
  const before=structuredClone(f);f.cabinet.thickness=thickness;C.scaleStructure(before,f);
  if(back!==undefined)f.cabinet.backThickness=back;
  for(const col of f.cabinet.columns)for(const drawer of col.drawers)Object.assign(drawer,{open:extension>0,extension});
  C.validate(f);const saved=JSON.stringify(f),g=Model.build(T,f,box,{blenderAssets:false}),groups=new Set();g.updateMatrixWorld(true);
  g.traverse(o=>{if(o.userData.cabinetDrawerBoard==='back')groups.add(o.parent);});
  const records=M.boards(f,{includeStatic:true});
  for(const node of groups){
   const bounds=role=>node.children.filter(o=>o.userData.cabinetDrawerBoard===role).map(o=>new T.Box3().setFromObject(o));
   const [bottom]=bounds('bottom'),[rear]=bounds('back'),[front]=bounds('front'),sides=bounds('side').sort((a,b)=>a.min.x-b.min.x);
   assert.equal(sides.length,2);near(sides[0].max.x*1000,bottom.min.x*1000,'left side/bottom edge');near(sides[1].min.x*1000,bottom.max.x*1000,'right side/bottom edge');
   near(rear.min.x*1000,bottom.min.x*1000,'back width left');near(rear.max.x*1000,bottom.max.x*1000,'back width right');
   for(const side of sides){near(side.min.y*1000,bottom.max.y*1000,'side rests on bottom');near(side.min.z*1000,rear.max.z*1000,'side meets back');if(front)near(side.max.z*1000,front.min.z*1000,'side meets front');}
   near(bottom.min.z*1000,rear.max.z*1000,'bottom meets back');
   for(const o of node.children.filter(o=>o.userData.cabinetDrawerBoard&&o.userData.cabinetDrawerBoard!=='front')){
    const b=new T.Box3().setFromObject(o),record=records.find(r=>r.metadata?.furnishPartToken&&JSON.stringify(JSON.parse(o.userData.furnishPartToken).slice(-JSON.parse(r.metadata.furnishPartToken).length))===r.metadata.furnishPartToken);assert(record,'numeric production record');
    near(record.bottom,b.min.y*1000,'numeric lower face');near(record.top,b.max.y*1000,'numeric upper face');near(Math.min(...record.poly.map(p=>p[0])),b.min.x*1000,'numeric left face');near(Math.max(...record.poly.map(p=>p[1]))+(record.motion?.travel||0)*record.phase,b.max.z*1000,'numeric front face');
   }
   drawers++;
  }
  assert(groups.size>0);assert.equal(JSON.stringify(f),saved,'production read does not rewrite saved data');
  assert.equal(C.spatialConfig(f).drawerComponentRule,Rules.cabinetDrawerBox.componentVersion);
  const visual=structuredClone(f);visual.price=999;visual.cabinet.columns[0].doorColor='#123456';assert.deepEqual(C.spatialConfig(visual),C.spatialConfig(f));cases++;
 }
 const f={...C.preset('chest'),id:'plain',type:'chest',cx:1000,cy:1000,rot:0},c=f.cabinet;
 const args={width:400,x:100,bottom:20,height:150,depth:f.d},parts=C.drawerBoxParts(f,args);
 near(parts[1].x-parts[1].w/2,100-200+10,'10mm software side clearance');
 assert.deepEqual(C.drawerBoxParts(f,args,{...c,backPanel:false}),C.drawerBoxParts(f,args,{...c,backThickness:0}),'no historical no-back depth branch');
 assert.throws(()=>C.drawerBoxParts(f,{...args,width:2*c.thickness+20}),/抽盒/);assert.throws(()=>C.drawerBoxParts(f,{...args,height:30}),/抽盒/);
 const narrow=structuredClone(f);narrow.w=390;narrow.cabinet.thickness=30;narrow.cabinet.columns[0].drawerColumns=4;assert.throws(()=>C.validate(narrow),/抽盒/,'reject before rendering or saving a negative box');
 const short=structuredClone(f);short.cabinet.thickness=30;short.cabinet.doorOverlay='full';short.cabinet.columns[0].drawers=[{height:60,open:false}];assert.throws(()=>C.validate(short),/抽盒/,'reject zero-height side before save');
 const round=P.unpack(P.pack({planId:'demo',current:{furniture:[f]},designs:[{name:'drawer',work:{furniture:[f]}}],catalog:[]}));assert.deepEqual(round.current.furniture[0],f);assert.deepEqual(round.designs[0].work.furniture[0],f);
 assert.deepEqual(P.unpack(P.pack(round)).current.furniture[0],f);
 const plain={...C.preset('book'),type:'bookshelf'};assert.equal(C.spatialConfig(plain).drawerComponentRule,undefined);
 for(const type of ['counter','kitchenwall']){let host=K.configure({id:'host',type,w:1800,d:600,cx:1000,cy:1000,rot:0},K.defaults({type,w:1800,d:600}));host.kitchen.modules[0].role='drawer';host=K.configure(host,host.kitchen);assert.equal(K.spatialConfig(host).drawerComponentRule,Rules.cabinetDrawerBox.componentVersion,type+' ordinary module carries rule');const noDrawer=K.configure({...host,kitchen:undefined},K.defaults({type,w:1800,d:600}));assert.equal(K.spatialConfig(noDrawer).drawerComponentRule,undefined);}
 const wall=K.fromWall({...f,type:'kitchenwall',h:700});assert.equal(K.spatialConfig(wall).drawerComponentRule,Rules.cabinetDrawerBox.componentVersion,'retained kitchen structure carries rule');
 console.log(`PASS unified drawer assembly: ${cases} production cases, ${drawers} drawer boxes; flush joints, numeric records, no-back, confirmations and project round trips`);
})().catch(e=>{console.error(e);process.exitCode=1;});
