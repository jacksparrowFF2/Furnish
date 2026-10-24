const normalized=require('./helpers/current-furniture.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishCabinet:C}));vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 for(const template of ['wardrobe','entry-console','sideboard-wall']){
  const f={id:'full',type:template==='wardrobe'?'wardrobe':'cabinet',cx:1000,cy:1000,rot:90,flip:true,...C.preset(template)},index=f.cabinet.columns.findIndex(col=>col.door==='double'),before=JSON.stringify(f);
  assert(index>=0);const col=f.cabinet.columns[index];assert.equal(C.drawerCount(col),2);
  col.drawers[0].lanes=[{open:false,extension:1},{open:true,extension:.4}];const source=JSON.stringify(col);
  const next=structuredClone(f);next.cabinet.columns[index]=C.withDrawerColumns(col,1);next.cabinet.autoDoors=false;if(next.cabinet.entry)next.cabinet.entry.autoColumns=false;
  assert.equal(JSON.stringify(col),source,'core operation leaves input untouched');C.validate(next);
  const drawer=next.cabinet.columns[index].drawers[0];assert.equal(drawer.lanes,undefined);assert.equal(drawer.open,true);assert.equal(drawer.extension,.4);
  const model=ctx.FurnishCabinetModel.build(THREE,next,box),fronts=[],dividers=[];
  const bay=C.layout(next)[index];model.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front'&&o.userData.cabinetPart.column===index)fronts.push(o);if(o.userData.cabinetDrawerDivider&&o.position.x>bay.left/1000&&o.position.x<(bay.left+bay.width)/1000)dividers.push(o);});
  assert.equal(fronts.length,col.drawers.length,'one production front per tier');assert.equal(dividers.length,0,'no short drawer partition remains');
  assert(fronts[0].geometry.parameters.width>C.widths(next)[index]/1000-.01,'front spans the bay');
  assert(Math.abs(fronts[0].parent.position.z-(next.cabinet.sideboard?.lowerDepth??next.d)/1000*.7*.4)<1e-8,'merged drawer preserves open travel');
  const closed=C.toggle(next,index,0,false,0);assert.equal(closed.cabinet.columns[index].drawers[0].lanes[0].open,false);
  const resized=C.resize(next,{...next,w:next.w+100});assert.equal(C.drawerCount(resized.cabinet.columns[index]),1);
  const restored=P.unpack(P.pack({planId:'demo',current:{furniture:[next]},designs:[{id:'saved',name:'saved',work:{furniture:[next]}}],catalog:[]})).current.furniture[0];
  assert.deepEqual(restored.cabinet,normalized.item(next).cabinet);const options={makeId:()=> 'new',colorFor:()=> '#efe6d8'};
  assert.deepEqual(D.restoreFurniture(D.restoreFurniture([restored],options),options)[0].cabinet,normalized.item(next).cabinet);
  assert.notDeepEqual(C.specification(next),C.specification(JSON.parse(before)),'drawer structure changes procurement specification');
  const split=C.withDrawerColumns(next.cabinet.columns[index],2);assert.equal(split.drawers[0].lanes.length,2);assert(split.drawers[0].lanes.every(v=>v.open&&v.extension===.4));
 }
 for(const count of [0,13,1.5,NaN])assert.throws(()=>C.withDrawerColumns(C.preset('wardrobe').cabinet.columns[0],count),/整数/);
 console.log('PASS full-width drawer merge, production fronts/partitions, motion, resize and repeated project restoration');
})().catch(e=>{console.error(e);process.exit(1)});
