'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),M=require('../src/core/cabinet-motion.js'),Products=require('../src/core/product-rules.js'),Identity=require('../src/core/part-identity.js'),Model=require('../src/render/cabinet-model.js'),Export=require('../src/io/blender-export.js');
const round=v=>Math.round(v*1e9)/1e9;
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 const build=(f,options={},source=Model)=>{const model=source.build(T,f,box,{blenderAssets:false,...options});model.userData.fid=f.id;model.updateMatrixWorld(true);return model;};
 // Optional migration audit against a pre-refactor production file. Do not keep
 // a second production builder in the repository or make normal tests need Git.
 let baseline;
 if(process.env.FURNISH_CABINET_BASELINE){const ctx=vm.createContext({FurnishCabinet:C,FurnishProducts:Products,FurnishPartIdentity:Identity});vm.runInContext(fs.readFileSync(process.env.FURNISH_CABINET_BASELINE,'utf8'),ctx);baseline=ctx.FurnishCabinetModel;}
 const signature=(model,allowLegacyDuplicates=false)=>{
  const rows=[];model.traverse(o=>{if(!o.isMesh)return;const key=o.userData.furnishPartToken;assert(key,'every production mesh has an authored identity');rows.push({key,vertices:Array.from(o.geometry.attributes.position.array,round),matrix:o.matrixWorld.elements.map(round),material:[o.material.color.getHex(),o.material.opacity,o.material.transparent,o.material.depthWrite,o.material.roughness],part:o.userData.cabinetPart,motion:o.parent.userData.motion});});
  if(!allowLegacyDuplicates)assert.equal(new Set(rows.map(r=>r.key)).size,rows.length,'production parts have distinct identities');return JSON.parse(JSON.stringify(rows));
 };
 const exported=model=>{const copy=Export.snapshot(T,{groups:[model],camera:new T.PerspectiveCamera()});try{return copy.scene.children.filter(o=>o.isMesh).map(o=>{assert(!o.userData.furnishPartAmbiguous);return o.userData.furnishPartKey;}).sort();}finally{copy.dispose();}};
 let count=0,baselineCount=0;
 for(const [template]of C.templates)for(const variant of ['legacy','thin','no-back','open','ghost']){
  const f={...C.preset(template),id:'cabinet',type:C.templateType(template),cx:2000,cy:3000,rot:37,flip:true,mountHeight:123};
  if(variant==='legacy')delete f.cabinet.backThickness;
  if(C.backThicknessAvailable(f.cabinet)&&['thin','no-back'].includes(variant))f.cabinet.backThickness=variant==='thin'?6:0;
  if(variant==='open')for(const col of f.cabinet.columns){col.doorOpen=true;col.doorAngle=37;for(const drawer of col.drawers)Object.assign(drawer,{open:true,extension:.45});}
  C.validate(f);const saved=JSON.stringify(f),options=variant==='ghost'?{doors:'ghost'}:{},model=build(f,options),actual=signature(model);
  if(baseline){const old=build(f,options,baseline);assert.deepEqual(actual,signature(old),template+'/'+variant+' preserves each vertex, transform, material, motion and authored identity');assert.deepEqual(exported(model),exported(old),template+'/'+variant+' preserves export identity');baselineCount++;}
  model.traverse(o=>{
   if(o.userData.motion?.kind==='cabinetdrawer'&&!o.userData.cabinetPart?.lid){const roles=o.children.map(c=>c.userData.cabinetDrawerBoard);assert(roles.includes('front')&&roles.includes('bottom')&&roles.includes('back')&&roles.filter(r=>r==='side').length===2,template+' shared drawer role contract');}
   if(o.userData.cabinetDoorSize){assert(o.parent.userData.motion?.kind==='cabinetdoor');if(variant==='ghost'){assert.equal(o.material.opacity,.15);assert(o.userData.cabinetIgnorePick);}}
  });
  const packed=P.pack({planId:'test',current:{furniture:[f]},designs:[{name:'retained',work:{furniture:[f]}}],catalog:[]}),restored=P.unpack(packed);
  assert.deepEqual(restored.current.furniture[0].cabinet,f.cabinet);assert.deepEqual(restored.designs[0].work.furniture[0].cabinet,f.cabinet);
  const once=D.restoreFurniture([f],{makeId:()=> 'copy',colorFor:()=> '#fff'});assert.deepEqual(D.restoreFurniture(once,{makeId:()=> 'copy',colorFor:()=> '#fff'}),once,'repeat restore has no drift');
  assert.equal(JSON.stringify(f),saved,'component assembly does not migrate persisted configuration');
  assert(M.solidParts(f,{furniture:[f]}).length>0);count++;
 }
 for(const template of ['chest','entry-console','sideboard-wall','sideboard-fridge']){
  const f={...C.preset(template),id:'knobs',type:'cabinet'};f.cabinet.columns.forEach(col=>col.handle='knob');const saved=JSON.stringify(f),model=build(f),knobs=[];
  model.traverse(o=>{if(o.geometry?.type==='SphereGeometry')knobs.push(o);});assert(knobs.length>0,template+' implements the selected knob style');for(const knob of knobs){assert.equal(knob.geometry.parameters.radius,.0125);assert(knob.userData.cabinetPart);}
  for(const node of knobs.map(o=>o.parent))assert(['cabinetdoor','cabinetdrawer'].includes(node.userData.motion?.kind),'handles move with their parent component');
  assert.equal(C.spatialConfig(f).hardwareComponentRule,template.startsWith('sideboard')?'round-knob-v1':undefined);
  assert.deepEqual(C.spatialConfig(f),C.spatialConfig({...f,color:'#123456',price:123}),'unrelated visual/price edits do not invalidate spatial confirmation');
  const none=structuredClone(f);none.cabinet.columns.forEach(col=>col.handle='none');build(none).traverse(o=>assert.notEqual(o.geometry?.type,'SphereGeometry'));
  const hidden=build(f,{doors:'hidden'});hidden.traverse(o=>assert(!o.userData.cabinetDoorSize));assert.equal(JSON.stringify(f),saved);
 }
 // Retained custom structures and laundry children use the same component
 // version as a direct cabinet. Ordinary bar cabinets remain unaffected.
 const custom={...C.preset('sideboard-wall'),id:'host',type:'kitchenwall',cx:0,cy:0,h:1100};Object.assign(custom.cabinet.sideboard,{baseHeight:400,counterThickness:20,nicheHeight:200,displayHeight:150,fridgeHeight:800});custom.cabinet.columns.forEach(col=>{col.handle='knob';col.shelves=[];});C.validate(custom);
 const host=K.fromWall(custom);assert.equal(K.spatialConfig(host).hardwareComponentRule,'round-knob-v1');
 const plain={...C.preset('storage'),type:'cabinet'};assert.equal(C.spatialConfig(plain).hardwareComponentRule,undefined);
 const compareRetained=f=>{
  const saved=JSON.stringify(f),model=build(f),old=build(f,{},baseline),actual=signature(model),previous=signature(old,true),stripKey=rows=>rows.map(({key,...rest})=>rest);
  assert.deepEqual(stripKey(actual),stripKey(previous),'retained '+f.id+' production geometry, material, selection and motion');
  const changed=actual.filter((row,i)=>row.key!==previous[i].key);for(const row of changed){const index=actual.indexOf(row);assert(row.key.includes('cabinet-stacked:upper')&&previous[index].key.includes('cabinet-stacked:lower'),'only duplicated upper-board identity is repaired');}
  if(changed.length){assert(new Set(previous.map(r=>r.key)).size<previous.length);assert.throws(()=>exported(old),/Duplicate named production part|Explicit part key required/,'old duplicate really prevented export');exported(model);}else assert.deepEqual(exported(model),exported(old),'retained '+f.id+' exported identity');
  assert.equal(JSON.stringify(f),saved);return changed.length;
 };
 const stacked=C.setStackedBoxes(C.setConstruction({...C.preset('wardrobe'),id:'stacked',type:'wardrobe'},'independent',{left:0,right:0}),true);signature(build(stacked));exported(build(stacked));
 if(baseline)assert(compareRetained(stacked)>0,'stacked fixture exercises the duplicate repair');
 let retained=0;
 if(baseline&&process.env.FURNISH_TEST_PROJECT){
  const document=JSON.parse(fs.readFileSync(process.env.FURNISH_TEST_PROJECT,'utf8')),seen=new Set(),fixtures=[];
  const visit=value=>{if(!value||typeof value!=='object')return;if(value.type&&[value.w,value.d].every(Number.isFinite)&&(value.cabinet||value.kitchen)){const key=JSON.stringify(value);if(!seen.has(key)){seen.add(key);if(value.kitchen){fixtures.push(...K.cabinetLayout(value).filter(m=>m.role!=='empty').map(m=>K.moduleFurniture(value,m)),...K.laundryParts(value).map(p=>p.furniture).filter(f=>f.cabinet));}else if(C.supported(value))fixtures.push(value);}}for(const item of Object.values(value))visit(item);};visit(document);
  for(const f of fixtures){compareRetained(f);retained++;}
  assert(retained>0,'read-only retained workspace audit is nonempty');
 }
 console.log(`PASS shared components: ${count} template/state cases, drawer roles, door modes, knob styles, immutable project/restore chains; ${baselineCount} pre-refactor geometry/export identity comparisons; ${retained} retained workspace cabinet configurations`);
})().catch(e=>{console.error(e);process.exitCode=1;});
