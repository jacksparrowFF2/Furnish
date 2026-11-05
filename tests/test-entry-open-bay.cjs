'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),R=require('../src/core/repository-core.js'),Motion=require('../src/core/cabinet-motion.js'),Cache=require('../src/io/workspace-cache.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),Model=require('../src/render/cabinet-model.js');
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const original={id:'pet',type:'cabinet',cx:3000,cy:3000,rot:0,...C.preset('entry-console')};
 Object.assign(original,{w:600,d:350,h:2350});Object.assign(original.cabinet,{plinth:0,doorOverlay:'full',topClosure:{height:50,doorGap:10}});
 Object.assign(original.cabinet.entry,{shoeHeight:600,lowerHeight:300,nicheHeight:450});original.cabinet.columns=[{width:564,door:'double',doorOpen:false,shelves:[1650,1950],drawers:[],handle:'none'}];C.validate(original);
 const open=structuredClone(original);open.cabinet.entry.shoeShelf=false;C.validate(open);
 const meshes=f=>{const g=Model.build(THREE,f,box);g.updateMatrixWorld(true);const result=[];g.traverse(o=>{if(o.isMesh){const b=new THREE.Box3().setFromObject(o);result.push({key:o.userData.furnishPartToken,bottom:b.min.y*1000,top:b.max.y*1000,left:b.min.x*1000,right:b.max.x*1000});}});return result;};
 const old=meshes(original),now=meshes(open);assert.equal(old.length,now.length+1);
 const removed=old.filter(b=>!now.some(a=>a.key===b.key));assert.equal(removed.length,1);assert(Math.abs(removed[0].top-300)<.001);
 assert(now.every(b=>!(b.right-b.left>500&&b.bottom>0&&b.top<580)),'no internal horizontal board in the floor opening');
 for(const b of now)assert.deepEqual(b,old.find(a=>a.key===b.key),'all remaining production identities and boundaries stay fixed');
 assert.equal(Motion.boards(original,{includeStatic:true}).length,Motion.boards(open,{includeStatic:true}).length+1);
 for(const rot of [0,37,90,270])for(const flip of [false,true]){
  const f={...structuredClone(open),rot,flip,mountHeight:75};C.validate(f);
  const packed=P.pack({planId:'p',current:{furniture:[f]},designs:[{name:'named',planId:'p',work:{furniture:[f]}}],catalog:[{...f,price:0}]});assert.equal(packed.version,52);
  const restored=P.unpack(packed);assert.deepEqual(restored.current.furniture[0],f);assert.deepEqual(restored.designs[0].work.furniture[0],f);assert.deepEqual(restored.catalog[0].cabinet,f.cabinet);
  let list=[f];for(let i=0;i<3;i++)list=D.restoreFurniture(list,{makeId:()=> 'new',colorFor:()=> '#fff'});assert.deepEqual(list[0],f);
 }
 const planId=require('../src/data/plans.js')[0].id,workspace={v:52,planId,work:{[planId]:{furniture:[open]}},designs:[]};assert.equal(JSON.parse(R.text(workspace)).version,52);assert.equal(R.parse(JSON.parse(R.text(workspace))).work[planId].furniture[0].cabinet.entry.shoeShelf,false);
 assert.equal(Cache.candidates({read:key=>key==='huxing-design-v52'?JSON.stringify(workspace):null})[0].v,52);
 assert.equal(C.entryShoeShelf(original.cabinet),true);assert.equal(original.cabinet.entry.shoeShelf,undefined);assert.equal(C.entryShoeShelf(C.resize(open,{...open,h:2450}).cabinet),false);
 assert.equal(D.replaceFurniture(open,{type:'cabinet',...C.preset('storage')}).cabinet.entry,undefined,'replacement clears incompatible layered structure');
 const plan={rooms:[],walls:[],doors:[]},finger=f=>P.checkFingerprint({},plan,[f],800);assert.notEqual(finger(original),finger(open));const color=structuredClone(open);color.color='#222222';assert.equal(finger(open),finger(color));
 for(const value of [0,'false',null]){const bad=structuredClone(open);bad.cabinet.entry.shoeShelf=value;assert.throws(()=>C.validate(bad),/布尔值/);}
 console.log('entry floor opening: production geometry/identities, solids, legacy default, validation, spatial confirmation, rotation/mirror, resize, v52 project/catalog/workspace/cache and repeated restore passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
