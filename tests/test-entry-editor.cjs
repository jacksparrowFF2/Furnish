const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
(async()=>{
 let f={id:'entry',type:'cabinet',cx:0,cy:0,rot:0,...C.preset('entry-console')};
 const edited=C.editStructure(f,0,'addDrawer');assert.equal(edited.cabinet.columns[0].drawers.length,2);C.validate(edited);
 const noDrawers=C.editStructure(C.editStructure(edited,0,'deleteDrawer',1),0,'deleteDrawer',0);C.validate(noDrawers);assert.equal(noDrawers.cabinet.columns[0].drawers.length,0);
 const extra=C.editStructure(f,0,'addShelf');assert.equal(extra.cabinet.columns[0].shelves.length,3);C.validate(C.editStructure(extra,0,'equalShelves'));C.validate(C.editStructure(extra,0,'copyDrawers',undefined,1));
 const upper=C.shelfLimits(f,0,1),lower=C.shelfLimits(f,0,0);assert(upper.min>lower.max);assert(C.moveShelf(f,0,0,1600).cabinet.columns[0].shelves[0]<=lower.max);
 const bad=structuredClone(f);bad.cabinet.columns[0].shelves=[1000];assert.throws(()=>C.validate(bad),/层板/);
 const legacy=structuredClone(f);delete legacy.cabinet.entry.editable;legacy.cabinet.columns.forEach(col=>col.shelves=[]);const restored=C.config(legacy);assert.equal(restored.columns[0].shelves.length,0);assert.equal(legacy.cabinet.columns[0].shelves.length,0);
 const manual=structuredClone(f);manual.cabinet.entry.autoColumns=false;assert.equal(C.resize(manual,{...manual,w:1600}).cabinet.columns.length,2);
 assert.deepEqual(C.specification(f),C.specification(manual),'auto/manual preference does not change purchase geometry');
 assert.equal(C.moveDivider(f,0,20).cabinet.entry.autoColumns,undefined);assert.equal(C.setColumnWidth(f,0,400).cabinet.entry.autoColumns,undefined);
 // The retired template inspector is exercised through the current builder UI suites.
 assert.deepEqual(P.unpack(P.pack({planId:'demo',current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0].cabinet,JSON.parse(JSON.stringify(f.cabinet)));
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),modelCtx=require('./helpers/layer-context.cjs').createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishCabinet:C}));vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),modelCtx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 const mf=structuredClone(edited);mf.cabinet.plinth=60;mf.cabinet.columns[0].doorOpen=true;mf.cabinet.columns[0].finish='glass';mf.cabinet.columns[0].handle='knob';mf.cabinet.columns[0].drawers[1].open=true;mf.cabinet.columns[0].drawers[1].extension=.5;
 const model=modelCtx.FurnishCabinetModel.build(THREE,mf,box),drawers=new Set(),shelves=[];let glass=false,knob=false;model.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front'&&o.userData.cabinetPart.column===0)drawers.add(o.userData.cabinetPart.drawer);if(o.userData.cabinetShelf?.column===0)shelves.push(o);if(o.userData.cabinetSection&&o.material.transparent)glass=true;if(o.geometry?.type==='SphereGeometry')knob=true;if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});assert.equal(drawers.size,2);assert.equal(shelves.length,mf.cabinet.columns[0].shelves.length);assert(glass);assert(knob);assert(Math.abs(new THREE.Box3().setFromObject(model).max.y-2.4)<1e-7);assert.equal(C.sideOpenings(mf)[0].bottom,1040,'plinth shifts niche and connector height');
 console.log('PASS legacy entry structure, bands, actual production geometry and project roundtrip; current editor uses the builder UI suites');
})().catch(e=>{console.error(e);process.exit(1)});
