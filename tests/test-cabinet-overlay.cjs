const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),Motion=require('../src/core/cabinet-motion.js');
(async()=>{
 const map=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(map.three),ctx=vm.createContext({FurnishCabinet:C});vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 for(const template of ['storage','wardrobe','base']){
  const old={id:template,type:template==='wardrobe'?'wardrobe':'cabinet',cx:2000,cy:3000,rot:0,...C.preset(template)},saved=JSON.stringify(old);assert.equal(C.doorOverlay(old),'full');assert.equal(JSON.stringify(old),saved,'reading old defaults does not rewrite data');
  const facesByMode=[];
  for(const [mode,edgeInset] of [['full',0],['half',9],['inset',18]]){
   const f=structuredClone(old);f.cabinet.doorOverlay=mode;f.cabinet.columns.forEach(c=>{c.shelves=[];c.drawers=[];});C.validate(f);
   const model=ctx.FurnishCabinetModel.build(THREE,f,box),faces=[];model.updateMatrixWorld(true);model.traverse(o=>{if(o.isMesh&&o.parent.userData.motion?.kind==='cabinetdoor'&&o.geometry.parameters?.depth===.018)faces.push(new THREE.Box3().setFromObject(o));});
   assert(faces.length);const min=Math.min(...faces.map(b=>b.min.x)),max=Math.max(...faces.map(b=>b.max.x));
   assert(Math.abs(min-(-f.w/2+edgeInset+1)/1000)<1e-6);assert(Math.abs(max-(f.w/2-edgeInset-1)/1000)<1e-6);facesByMode.push(max-min);
   assert(Math.abs(Math.min(...faces.map(b=>b.min.y))-(f.cabinet.plinth+edgeInset+1)/1000)<1e-6);assert(Math.abs(Math.max(...faces.map(b=>b.max.y))-(f.h-edgeInset-1)/1000)<1e-6);
   assert(faces.every(b=>Math.abs(b.max.z-f.d/2000)<1e-6));
   const parts=Motion.boards(f).filter(p=>p.motion.kind==='cabinetdoor');assert(parts.length);assert(parts.every(p=>p.top<=f.h&&p.bottom>=f.cabinet.plinth));
   for(const rot of [0,90,37])for(const flip of [false,true]){const placed={...f,rot,flip},zones=C.openingZones(placed,{passage:0});assert(zones.length);assert(zones.every(z=>z.ranges.every(([lo,hi])=>lo>=f.cabinet.plinth+edgeInset&&hi<=f.h-edgeInset)));const work={furniture:[placed]},payload={planId:'p',current:work,designs:[{name:'test',work}],catalog:[]};const restored=P.unpack(P.pack(payload));assert.equal(restored.current.furniture[0].cabinet.doorOverlay,mode);assert.equal(restored.designs[0].work.furniture[0].cabinet.doorOverlay,mode);const once=D.restoreFurniture([placed],{makeId:()=> 'new',colorFor:()=> '#fff'});assert.deepEqual(D.restoreFurniture(once,{makeId:()=> 'new',colorFor:()=> '#fff'}),once);}
  }
  assert(facesByMode[0]>facesByMode[1]&&facesByMode[1]>facesByMode[2],'actual production faces differ by overlay coverage');
  const bad=structuredClone(old);bad.cabinet.doorOverlay='bad';assert.throws(()=>C.validate(bad),/盖板/);
 }
 const base={id:'k',type:'counter',cx:0,cy:0,w:1600,d:600,rot:0},k=K.configure(base,K.defaults(base));
 for(const mode of ['full','half','inset']){const host=K.configure(k,{...k.kitchen,doorOverlay:mode});assert.equal(C.doorOverlay(K.moduleFurniture(host,K.layout(host)[0])),mode);assert.equal(K.configure(host,host.kitchen).kitchen.doorOverlay,mode);}
 assert.throws(()=>K.configure(k,{...k.kitchen,doorOverlay:'bad'}));
 // Layered cabinets keep fixed framed display doors, but storage fronts honor overlay.
 for(const template of ['entry-console','sideboard-fridge']){
  const widths=[];for(const mode of ['full','half','inset']){const f={id:'layer',type:'cabinet',...C.preset(template)};f.cabinet.doorOverlay=mode;const model=ctx.FurnishCabinetModel.build(THREE,f,box),faces=[];model.updateMatrixWorld(true);model.traverse(o=>{if(o.isMesh&&o.parent.userData.motion?.kind==='cabinetdoor'&&o.parent.userData.motion.axis==='y'&&o.parent.userData.motion.column===0&&o.geometry.parameters?.depth===.018)faces.push(new THREE.Box3().setFromObject(o));});assert(faces.length);widths.push(Math.max(...faces.map(b=>b.max.x))-Math.min(...faces.map(b=>b.min.x)));}
  assert(widths[0]>widths[1]&&widths[1]>widths[2]);
 }
 console.log('PASS cabinet overlay: storage/wardrobe defaults, full/half/inset production fronts and motion, transforms, layered storage, validation, kitchen propagation and drift-free named project restoration');
})().catch(e=>{console.error(e);process.exitCode=1;});
