'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),M=require('../src/core/cabinet-motion.js'),Products=require('../src/core/product-rules.js'),Model=require('../src/render/cabinet-model.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),box=(w,h,d,color,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));o.position.set(x,y+h/2,z);return o;},build=f=>Model.build(T,f,box,{blenderAssets:false}),all=model=>{const a=[];model.traverse(o=>{if(o.isMesh)a.push(o);});return a;},near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
 for(const template of ['sideboard-wall','sideboard-fridge']){
  const f={...C.preset(template),type:'cabinet',color:'#aabbcc'};f.cabinet.columns.forEach(col=>delete col.handle);
  const inherited=all(build(f)).filter(o=>['cabinet-model:site-9','cabinet-model:site-23'].includes(o.userData.furnishPartSource));assert(inherited.length>0,'inherited bar setting has actual sideboard handles');assert(C.spatialConfig(f).hardwareComponentRule.includes('default-bar-v1'));
  f.cabinet.columns.forEach(col=>col.handle='none');assert.equal(all(build(f)).filter(o=>['cabinet-model:site-9','cabinet-model:site-23'].includes(o.userData.furnishPartSource)).length,0);
 }
 for(const template of ['chest','wardrobe','entry-console','sideboard-wall'])for(const overlay of ['full','half','inset']){
  const f={...C.preset(template),type:'cabinet',color:'#aabbcc'};f.cabinet.doorOverlay=overlay;f.cabinet.columns.forEach(col=>col.doorColor='#224466');
  const fronts=all(build(f)).filter(o=>o.userData.cabinetDrawerBoard==='front');assert(fronts.length);assert(fronts.every(o=>o.material.color.getHexString()==='224466'),template+'/'+overlay+' drawer front uses the selected color');
 }
 for(const type of ['counter','kitchenwall'])for(const style of ['standard',...(type==='counter'?['dish-basket']:[])]){
  let f=K.configure({id:'host',type,cx:1000,cy:2000,rot:37,flip:true,w:1800,d:600,mountHeight:120},K.defaults({type,w:1800,d:600}));f.kitchen.modules[0].role='drawer';f=K.configure(f,f.kitchen);if(style==='dish-basket')f=K.setDrawerStyle(f,0,style);
  const original=JSON.stringify(f);for(const percent of [0,37,100]){
   const next=K.setDrawerExtension(f,0,0,percent),m=K.cabinetLayout(next).find(m=>m.index===0),part=K.moduleFurniture(next,m),col=part.cabinet.columns[0];assert.deepEqual(K.specification(next),K.specification(f),'extension is not a purchase structure edit');near(K.drawerExtension(next.kitchen.modules[0],0),percent/100);near(C.drawerState(col.drawers[0],0).open?col.drawers[0].extension:0,percent/100);
   const nodes=[];build(part).traverse(o=>{if(o.userData.motion?.kind==='cabinetdrawer'&&o.userData.cabinetPart.drawer===0)nodes.push(o);});assert.equal(nodes.length,1);near(nodes[0].position.z,part.d/1000*.7*percent/100);
   assert(M.boards(part,{includeStatic:true}).filter(b=>b.motion?.kind==='cabinetdrawer'&&b.metadata?.cabinetPart?.drawer===0).every(b=>Math.abs(b.phase-percent/100)<1e-8));
   const packed=P.pack({planId:'p',current:{furniture:[next]},designs:[{name:'same',work:{furniture:[next]}}],catalog:[{...next,name:"参数柜",h:K.overallHeight(next),price:0}]});assert.equal(packed.version,61);const restored=P.unpack(packed);assert.deepEqual(restored.current.furniture[0].kitchen,next.kitchen);assert.deepEqual(restored.designs[0].work.furniture[0].kitchen,next.kitchen);
   const once=D.restoreFurniture([next],{makeId:()=> 'copy',colorFor:()=> '#fff'});assert.deepEqual(D.restoreFurniture(once,{makeId:()=> 'copy',colorFor:()=> '#fff'}),once);
  }assert.equal(JSON.stringify(f),original);for(const bad of [-1,100.1,NaN])assert.throws(()=>K.setDrawerExtension(f,0,0,bad));assert.throws(()=>K.setDrawerExtension({...f,locked:true},0,0,30));
  let next=K.setDrawerExtension(f,0,0,37);next=K.toggle(next,0,0,false);next=K.toggle(next,0,0,true);near(K.drawerExtension(next.kitchen.modules[0],0),.37);
  if(style==='standard'){next=K.setDrawerCount(next,0,2);assert.equal(next.kitchen.modules[0].drawerExtensions.length,2);}
  const k=structuredClone(f.kitchen);k.modules[0].role='door';next=K.configure(f,k);assert.equal(next.kitchen.modules[0].drawerExtensions,undefined);
 }
 const scope=vm.createContext({window:{},structuredClone,FurnishCabinet:C,FurnishKitchen:K,FurnishProducts:Products,esc:s=>String(s),furnitureLocked:()=>false});vm.runInContext(fs.readFileSync(require.resolve('../src/ui/cabinet-form-controls.js'),'utf8'),scope);vm.runInContext(fs.readFileSync(require.resolve('../src/ui/kitchen-editor.js'),'utf8'),scope);
 let f=K.configure({id:'appearance',type:'counter',w:1800,d:600,cx:0,cy:0,color:'#aabbcc'},K.defaults({type:'counter',w:1800,d:600}));f.kitchen.modules[1].role='drawer';f=K.configure(f,f.kitchen);
 for(const [index,role]of [[0,'door'],[1,'drawer']])for(const handle of ['none','bar','knob']){
  const k=structuredClone(f.kitchen);Object.assign(k.modules[index],{handle,finish:'wood',doorColor:'#224466'});const next=K.configure(f,k),m=K.cabinetLayout(next).find(m=>m.index===index),part=K.moduleFurniture(next,m);assert.equal(part.cabinet.columns[0].handle,handle);assert.equal(part.cabinet.columns[0].finish,'wood');
  const faces=all(build(part)).filter(o=>role==='door'?o.userData.cabinetDoorSize:o.userData.cabinetDrawerBoard==='front');assert(faces.length);assert(faces.every(o=>o.material.color.getHexString()==='224466'));
  const html=role==='door'?scope.kitchenDoorForm(next,next.kitchen.modules[index],index,''):scope.kitchenDrawerForm(next,next.kitchen.modules[index],'');assert(html.includes('data-k-front-handle'));assert(html.includes('data-k-front-door-color'));assert(html.includes('data-setting-action="inherit"'));
  const colored=structuredClone(next);colored.kitchen.modules[index].doorColor='#445566';colored.kitchen.modules[index].finish='solid';assert.deepEqual(K.spatialConfig(colored),K.spatialConfig(next),'finish/color do not invalidate spatial confirmation');assert.equal(P.pack({planId:'p',current:{furniture:[next]},designs:[],catalog:[]}).version,61);
 }
 for(const invalid of [null,'bad',22]){const k=structuredClone(f.kitchen);k.modules[0].handle=invalid;assert.throws(()=>K.configure(f,k));}
 const Cache=require('../src/io/workspace-cache.js'),cached={v:61,updatedAt:2,work:{},designs:[]};assert.deepEqual(Cache.candidates({read:key=>key==='huxing-design-v61'?JSON.stringify(cached):null}),[cached]);
 console.log('PASS cabinet parameter parity: inherited handles, inset front colors, shared appearance controls, kitchen door/drawer styles and 0/37/100% real travel, role/count/basket constraints, immutable edits and v61 current/named/catalog recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
