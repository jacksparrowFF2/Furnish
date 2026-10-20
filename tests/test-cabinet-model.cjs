const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const context=vm.createContext({FurnishCabinet:C});vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),context);
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const build=f=>context.FurnishCabinetModel.build(THREE,f,box);
 for(const t of C.templates)for(const type of new Set(['cabinet',C.templateType(t[0])])){const f={type,color:'#efe6d8',...C.preset(t[0])},model=build(f),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());assert(Math.abs(size.y-f.h/1000)<1e-6);model.traverse(o=>{if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});}
 let f={type:'cabinet',color:'#efe6d8',...C.preset('sideboard-drawers')},closed=build(f);f=C.toggle(f,0,0);const opened=build(f);
 const part=(model,drawer)=>{let found;model.traverse(o=>{if(o.isMesh&&o.userData.cabinetPart?.column===0&&o.userData.cabinetPart.drawer===drawer&&!found)found=o;});return found;};
 const pos=o=>o.getWorldPosition(new THREE.Vector3());assert(Math.abs(pos(part(opened,0)).z-pos(part(closed,0)).z-f.d/1000*.7)<1e-6);
 const doorClosed=part(closed,undefined);f=C.toggle(f,0);const doorOpen=part(build(f),undefined);assert(Math.abs(doorOpen.parent.rotation.y)>1);assert.equal(doorClosed.parent.rotation.y,0);
 assert.deepEqual(C.specification(f),C.specification(C.toggle(f,0)),'opening does not change purchase specifications');
 const unequal=C.setColumnWidth(f,0,350),model=build(unequal),layout=C.layout(unequal);let shelfMesh;model.traverse(o=>{if(o.userData.cabinetShelf?.column===0)shelfMesh=o;});
 assert(Math.abs(shelfMesh.geometry.parameters.width-.35)<1e-8);assert(Math.abs(shelfMesh.position.x-layout[0].center/1000)<1e-8);
 const raised=build(C.moveShelf(unequal,0,0,600));let raisedMesh;raised.traverse(o=>{if(o.userData.cabinetShelf?.column===0)raisedMesh=o;});assert(Math.abs(raisedMesh.position.y-shelfMesh.position.y-(600-f.cabinet.columns[0].shelves[0])/1000)<1e-8);
 const styled=structuredClone(f);Object.assign(styled.cabinet.columns[0],{doorOpen:true,doorAngle:45,finish:'glass',handle:'none'});styled.cabinet.columns[0].drawers[0].extension=.5;styled.cabinet.columns[0].drawers[0].open=true;
 const glass=build(styled),glassDoor=part(glass,undefined);assert(Math.abs(Math.abs(glassDoor.parent.rotation.y)-Math.PI/4)<1e-8);assert.equal(glassDoor.material.transparent,true);assert.equal(glassDoor.material.opacity,.32);assert.equal(glassDoor.userData.cabinetOwnMaterial,true);
 assert(Math.abs(pos(part(glass,0)).z-pos(part(closed,0)).z-f.d/1000*.35)<1e-8);
 const hidden=context.FurnishCabinetModel.build(THREE,styled,box,{doors:'hidden'});assert.equal(part(hidden,undefined),undefined);
 const ghost=context.FurnishCabinetModel.build(THREE,styled,box,{doors:'ghost'});assert.equal(part(ghost,undefined).userData.cabinetIgnorePick,true);
 console.log('PASS all cabinet meshes have finite dimensions, correct heights, hinge rotations and drawer travel');
 for(const id of ['sideboard','entry-console']){
  const initial={type:'cabinet',...C.preset(id)},f=C.validate(C.autoDoors({...initial,w:1350})),model=build(f),dividers=[],shelves=[];
  model.traverse(o=>{if(o.userData.cabinetDivider)dividers.push(o);if(o.userData.cabinetShelf?.column===1)shelves.push(o);});
  assert.equal(dividers.length,id==='entry-console'?2:1,'only the boundary between single and paired bays has a divider');
  for(const shelf of shelves)assert(Math.abs(shelf.geometry.parameters.width-C.widths(f)[1]/1000)<1e-8,'shelves span both leaves');
  model.updateMatrixWorld(true);const bay=C.layout(f)[1],origin=new THREE.Vector3((bay.left+bay.width-30)/1000,id==='entry-console'?2.15:.7,0),hit=new THREE.Raycaster(origin,new THREE.Vector3(-1,0,0)).intersectObject(model,true)[0];
  assert(hit&&hit.distance>bay.width/2000,'ray crosses paired-door center without hitting a partition');
 }
 const entryStart={type:'cabinet',...C.preset('entry-console')},entry=C.validate(C.autoDoors({...entryStart,w:1350}));
 const drawerParts=model=>{const parts=[];model.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front')parts.push(o);});return parts;};
 const fronts=drawerParts(build(entry));assert.equal(fronts.length,3,'1350 mm retains three independent drawers');for(const front of fronts)assert(Math.abs(front.geometry.parameters.width-.448)<1e-8);
 const singleOpen=C.toggle(entry,1,0,false,1),openFronts=drawerParts(build(singleOpen));for(const front of openFronts){const active=front.userData.cabinetPart.column===1&&front.userData.cabinetPart.lane===1;assert(Math.abs(front.parent.position.z-(active?.245:0))<1e-8,'only clicked drawer moves');}
 for(const angle of [60,90,120,180]){const f={...entry,cabinet:{...entry.cabinet,doorMaxAngle:angle}},opened=C.toggle(f,1),mesh=build(opened);mesh.traverse(o=>{if(o.userData.cabinetSection&&o.userData.cabinetPart.column===1)assert(Math.abs(Math.abs(o.parent.rotation.y)-angle*Math.PI/180)<1e-8);});}
 const defaultOpen=C.toggle(entry,1);assert.equal(defaultOpen.cabinet.columns[1].doorAngle,90);
})().catch(e=>{console.error(e);process.exit(1)});

// Layered sideboard acceptance using actual production geometry.
{
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),ctx=vm.createContext({FurnishCabinet:C});
 vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const build=f=>{const g=ctx.FurnishCabinetModel.build(THREE,f,box);g.updateMatrixWorld(true);return g;};
 for(const id of ['sideboard-wall','sideboard-fridge']){
  const f={id,type:'cabinet',cx:1000,cy:1200,rot:90,flip:true,...C.preset(id)},s=f.cabinet.sideboard;C.validate(f);
  const g=build(f),size=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());for(const [axis,key] of [['x','w'],['y','h'],['z','d']])assert(Math.abs(size[axis]-f[key]/1000)<1e-6,'closed bounds match outer dimensions');
  const bay=C.layout(f)[id==='sideboard-fridge'?1:0],y=(s.baseHeight+s.counterThickness+s.nicheHeight/2)/1000;
  const hit=new THREE.Raycaster(new THREE.Vector3(bay.center/1000,y,1),new THREE.Vector3(0,0,-1)).intersectObject(g,true)[0];assert.equal(hit.object.userData.cabinetSection,'operationBack','working niche is open to the wood back');
  const glass=[];g.traverse(o=>{if(o.userData.cabinetSection==='display')glass.push(o);});assert(glass.length);assert(glass.every(o=>o.material.transparent&&o.material.opacity<.5));
  if(id==='sideboard-fridge'){
   const b=C.layout(f)[0],hit=new THREE.Raycaster(new THREE.Vector3(b.center/1000,.5,1),new THREE.Vector3(0,0,-1)).intersectObject(g,true);assert.equal(hit.length,0,'fridge cavity has no front, back or floor slab');
   assert.equal(C.widths(f)[0],800);assert.equal(s.fridgeHeight,1915);
  }
  for(const i of f.cabinet.columns.map((col,i)=>col.door==='double'&&!col.fridgeBay?i:-1).filter(i=>i>=0)){
   const b=C.layout(f)[i],x=b.center/1000;
   for(const y of [(s.baseHeight-140)/2000,(s.baseHeight+s.counterThickness+s.nicheHeight+s.displayHeight+f.h)/2000]){
    const hits=new THREE.Raycaster(new THREE.Vector3(x-.02,y,-f.d/2000+s.upperDepth/2000),new THREE.Vector3(1,0,0)).intersectObject(g,true);assert(hits[0].distance>.1,'paired storage has no center divider above or below');
   }
  }
  const opened=build(C.toggle(f,0));let rotated=false;opened.traverse(o=>{if(o.userData.cabinetPart?.column===0&&o.parent.rotation.y)rotated=true;});assert(rotated);
  const groups=C.sideboardDisplayGroups(f);assert.equal(glass.length,groups.length);assert(groups.every(group=>group.columns.length<=2));
  const storageIndex=id==='sideboard-fridge'?1:0,fronts=[];g.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front')fronts.push(o);});assert.equal(fronts.length,id==='sideboard-fridge'?3:4);
  for(const front of fronts){const bounds=new THREE.Box3().setFromObject(front);assert(Math.abs(bounds.min.y-(s.baseHeight-140+1)/1000)<1e-6);assert(Math.abs(bounds.max.y-(s.baseHeight-f.cabinet.thickness-1)/1000)<1e-6);}
  const drawerOpen=build(C.toggle(f,storageIndex,0)),openFronts=[];drawerOpen.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front')openFronts.push(o);});for(const front of openFronts)assert(Math.abs(front.parent.position.z-(front.userData.cabinetPart.column===storageIndex?s.lowerDepth/1000*.7:0))<1e-8);
  const resizedRow=C.setSideboardDrawerHeight(f,180),rowModel=build(resizedRow),rowFronts=[];rowModel.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front')rowFronts.push(o);});assert(rowFronts.every(o=>Math.abs(new THREE.Box3().setFromObject(o).min.y-(s.baseHeight-180+1)/1000)<1e-6));assert.equal(resizedRow.cabinet.sideboard.baseHeight,s.baseHeight);
  assert.throws(()=>C.setSideboardDrawerHeight(f,59),/60/);assert.throws(()=>C.setSideboardDrawerHeight(f,s.baseHeight),/160/);
  const group=groups[0],groupMid=(group.left+group.width/2)/1000,glassY=(s.baseHeight+s.counterThickness+s.nicheHeight+s.displayHeight/2)/1000;
  const centerHits=new THREE.Raycaster(new THREE.Vector3(groupMid-.02,glassY,-f.d/2000+s.upperDepth/2000),new THREE.Vector3(1,0,0)).intersectObject(g,true);assert(centerHits[0].distance>.02,'merged display has no center divider');
  const zones=C.openingZones(f,{passage:0});assert.equal(zones.filter(z=>z.kind==='cabinetdrawer').length,f.cabinet.columns.filter(col=>col.drawers.length).length);assert.equal(zones.filter(z=>z.section==='display').length,groups.length);
  assert.deepEqual(C.specification(f),C.specification(C.toggle(f,storageIndex,0)));
  const old=structuredClone(f);old.cabinet.columns.forEach(col=>col.drawers=[]);C.validate(old);C.validate(C.setSideboardDrawerHeight(old,140));
  const displayOpened=C.toggle(f,groups[0].column,undefined,false,undefined,'display'),displayModel=build(displayOpened),displayParts=[];displayModel.traverse(o=>{if(o.userData.cabinetSection==='display')displayParts.push(o);});
  assert.equal(displayOpened.cabinet.columns[groups[0].column].doorOpen,false,'display toggle does not open lower/upper storage');assert.equal(displayOpened.cabinet.columns[groups[0].column].drawers[0].open,false);
  assert(Math.abs(displayParts[0].parent.rotation.x+Math.PI/2)<1e-8);assert.equal(displayParts[0].parent.rotation.y,0);const raisedGlass=new THREE.Box3().setFromObject(displayParts[0]);assert(raisedGlass.max.z>f.d/-2000+s.upperDepth/1000+.25,'bottom of upward-opening glass moves forward');
  const storageOpened=build(C.toggle(f,groups[0].column));storageOpened.traverse(o=>{if(o.userData.cabinetSection==='display')assert.equal(o.parent.rotation.x,0,'storage door toggle leaves display closed');});
  assert.deepEqual(C.specification(displayOpened),C.specification(f),'independent display state does not affect procurement grouping');
  const packedDisplay=P.unpack(P.pack({planId:'test',current:{furniture:[displayOpened]},designs:[],catalog:[]})).current.furniture[0];assert.equal(packedDisplay.cabinet.columns[groups[0].column].displayOpen,true);
  if(id==='sideboard-fridge'){
   for(const depth of [380,700]){const changed=C.setSideboardFridgeDepth(f,depth),mesh=build(changed);assert.equal(changed.cabinet.sideboard.lowerDepth,s.lowerDepth);assert.equal(changed.cabinet.sideboard.upperDepth,s.upperDepth);assert.equal(changed.d,Math.max(depth,s.lowerDepth));assert.equal(C.widths(changed)[0],800);let ceiling;mesh.traverse(o=>{if(o.userData.cabinetSection==='fridgeCeiling')ceiling=o;});assert(Math.abs(ceiling.geometry.parameters.depth-depth/1000)<1e-8);const restored=P.unpack(P.pack({planId:'test',current:{furniture:[changed]},designs:[],catalog:[]})).current.furniture[0];assert.equal(restored.cabinet.sideboard.fridgeDepth,depth);}
   const legacyDepth=structuredClone(f);delete legacyDepth.cabinet.sideboard.fridgeDepth;C.validate(legacyDepth);C.validate(C.setSideboardFridgeDepth(legacyDepth,650));assert.throws(()=>C.setSideboardFridgeDepth(f,149),/150/);
   const fixed=C.setColumnWidth(f,0,835);for(const width of [2100,2400,2700]){const changed=D.resizeFurniture(fixed,{w:width});assert.equal(C.widths(changed)[0],835);C.validate(changed);assert(changed.cabinet.autoDoors);assert(changed.cabinet.columns.filter(col=>!col.fridgeBay).every(col=>col.door==='left'||col.door==='double'));}
   assert.throws(()=>D.resizeFurniture(fixed,{w:900}),/冰箱位净宽保持固定/);assert.equal(C.widths(fixed)[0],835);
   const mirrored={...fixed,flip:true,rot:180};assert.equal(C.widths(D.resizeFurniture(mirrored,{w:2500}))[0],835);
  }
  const taller=D.resizeFurniture(f,{w:f.w+100,h:f.h+100,d:f.d+50});C.validate(taller);assert(taller.cabinet.sideboard.nicheHeight>s.nicheHeight);
  const added=C.editStructure(f,0,'addShelf');C.validate(added);const limits=C.shelfLimits(added,0,0);C.validate(C.moveShelf(added,0,0,limits.max));
  const restored=P.unpack(P.pack({planId:'test',current:{furniture:[taller]},designs:[],catalog:[]})).current.furniture[0];assert.deepEqual(restored.cabinet,taller.cabinet);
  const bad=structuredClone(f);bad.cabinet.sideboard.nicheHeight=3000;assert.throws(()=>P.validateWork({furniture:[bad]}),/分层/);
  assert.throws(()=>C.editStructure(f,0,'addDrawer'),/冰箱位|一排浅抽屉/);C.validate(C.autoDoors(f));
  assert.deepEqual(C.specification(f),C.specification(C.toggle(f,0)));
 }
 console.log('PASS layered sideboard dimensions, open working/fridge cavities, glass, doors, resize, shelf boundaries and project round trip');
})().catch(e=>{console.error(e.message);process.exit(1);});

}
