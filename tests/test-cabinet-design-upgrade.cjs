const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const C=require('../src/core/cabinet-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const context=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishCabinet:C}));vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),context);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const geometry=f=>{const g=context.FurnishCabinetModel.build(T,f,box),hash=crypto.createHash('sha256');g.updateMatrixWorld(true);g.traverse(o=>{if(!o.geometry)return;hash.update(JSON.stringify(o.matrixWorld.elements));for(const key of ['position','normal','uv'])if(o.geometry.attributes[key])hash.update(Buffer.from(o.geometry.attributes[key].array.buffer));});return hash.digest('hex');};
 const pack=f=>P.unpack(P.pack({planId:'demo',current:{furniture:[f]},designs:[{name:'升级设计',work:{furniture:[f]}}],catalog:[]}));
 const fixtures=C.templates.map(([id])=>({id,type:C.templateType(id),cx:1000,cy:1000,rot:0,...C.preset(id)}));
 fixtures.push({id:'legacy',type:'wardrobe',name:'旧衣柜',cx:1000,cy:1000,w:2000,d:600,rot:37,flip:true,color:'#f3f1ec'});
 const entry=structuredClone(fixtures.find(f=>f.id==='entry-console'));entry.id='old-entry';delete entry.cabinet.entry.editable;entry.cabinet.columns.forEach(col=>col.shelves=[]);fixtures.push(entry);
 for(const f of fixtures){
  const before=JSON.stringify(f),up=C.upgradeDesign(f);assert.equal(JSON.stringify(f),before,'upgrade is immutable');
  assert.equal(geometry(up),geometry(f),f.id+' production geometry is unchanged');
  assert.deepEqual(C.openingZones(up),C.openingZones(f),f.id+' opening envelope is unchanged');
  assert.equal(up.cabinet.autoDoors,undefined);if(up.cabinet.entry)assert.equal(up.cabinet.entry.autoColumns,undefined);
  assert(up.cabinet.columns.every(col=>Number.isInteger(C.drawerCount(col))));if(f.cabinet)assert.deepEqual(C.specification(up),C.specification(f),'existing procurement specification stays stable');
  assert.deepEqual(C.upgradeDesign(up),up,'repeat upgrade has no drift');
  const restored=pack(up);assert.deepEqual(restored.current.furniture[0],up);assert.deepEqual(restored.designs[0].work.furniture[0],up);
  assert.deepEqual(D.restoreFurniture([up],{makeId:()=>'',colorFor:()=>''})[0],up);
 }
 console.log('PASS 19 templates and legacy designs upgrade without changing production geometry, openings, named/current project data or repeated restoration');
})().catch(e=>{console.error(e);process.exit(1);});
