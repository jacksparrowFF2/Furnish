const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),ctx=vm.createContext({FurnishCabinet:C});
 vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const work=W.create({makeId:()=> 'copy',colorFor:()=> '#f3f1ec',materials:require('../src/data/catalog.js').materials});
 for(const id of ['sideboard-wall','sideboard-fridge','entry-console']){
  const f={id,type:'cabinet',cx:1500,cy:1500,rot:90,flip:true,...C.preset(id)},i=f.cabinet.columns.findIndex(col=>!col.fridgeBay),before=JSON.stringify(f);
  let opened=C.toggle(f,i,undefined,false,undefined,'upper');
  assert.equal(C.doorAngle(opened.cabinet,opened.cabinet.columns[i],'lower'),0);assert.equal(C.doorAngle(opened.cabinet,opened.cabinet.columns[i],'upper'),90);assert.equal(JSON.stringify(f),before);
  const model=ctx.FurnishCabinetModel.build(THREE,opened,box);let count=0;model.traverse(o=>{if(o.userData.cabinetSection&&o.userData.cabinetPart?.column===i&&['lower','upper'].includes(o.userData.cabinetSection)){const parent=o.parent;assert(Math.abs(parent.rotation.y-(o.userData.cabinetSection==='lower'?0:parent.rotation.y))<1e-8);if(o.userData.cabinetSection==='upper')assert(Math.abs(parent.rotation.y)>1);assert.equal(o.userData.cabinetPart.section,o.userData.cabinetSection);count++;}});assert(count>=2);
  opened=C.toggle(opened,i,undefined,false,undefined,'lower');assert.equal(C.doorAngle(opened.cabinet,opened.cabinet.columns[i],'upper'),90);
  opened=C.toggle(opened,i,undefined,false,undefined,'upper');assert.equal(C.doorAngle(opened.cabinet,opened.cabinet.columns[i],'upper'),0);assert.equal(C.doorAngle(opened.cabinet,opened.cabinet.columns[i],'lower'),90);
  assert.deepEqual(C.specification(f),C.specification(opened));
  const restored=work.restoreFurniture(P.unpack(P.pack({planId:'test',current:{furniture:[opened]},designs:[],catalog:[]})).current.furniture)[0];assert.deepEqual(restored.cabinet,opened.cabinet);assert.deepEqual(work.restoreFurniture([restored])[0].cabinet,restored.cabinet);
  const resized=C.resize(opened,{...opened,w:opened.w+50});assert(resized.cabinet.columns.filter(col=>!col.fridgeBay).some(col=>col.doorSections?.lower.open));
  const legacy=structuredClone(f);legacy.cabinet.columns[i].doorOpen=true;legacy.cabinet.columns[i].doorAngle=45;assert.equal(C.doorAngle(legacy.cabinet,legacy.cabinet.columns[i],'upper'),45);assert.equal(C.doorAngle(legacy.cabinet,legacy.cabinet.columns[i],'lower'),45);
  const bad=structuredClone(opened);bad.cabinet.columns[i].doorSections.upper.open='yes';assert.throws(()=>P.validateWork({furniture:[bad]}),/独立开合/);
 }
 assert.equal(C.splitDoors(C.preset('wardrobe').cabinet,C.preset('wardrobe').cabinet.columns[0]),false);
 console.log('PASS independent upper/lower production doors, legacy fallback, actual restore, resize, immutable operations and purchase grouping');
})().catch(e=>{console.error(e.message);process.exit(1);});
