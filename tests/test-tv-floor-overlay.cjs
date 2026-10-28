const assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),Motion=require('../src/core/cabinet-motion.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),Model=require('../src/render/cabinet-model.js');
 const box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 const near=(a,b,label)=>assert(Math.abs(a-b)<1e-3,label+': '+a+' / '+b);
 assert.equal(C.preset('tv-floor').cabinet.doorOverlay,'full');
 for(const thickness of [12,18,30])for(const mode of ['full','half'])for(const opened of [false,true]){
  let f={id:'tv-overlay',type:'cabinet',cx:3000,cy:3000,rot:90,flip:true,...C.preset('tv-floor')};
  f.w=2505;f.d=350;f.h=350;f.cabinet.thickness=thickness;f.cabinet.doorOverlay=mode;
  for(const col of f.cabinet.columns){col.finish='solid';col.doorColor='#f3f1ec';col.topOpen=opened;for(const drawer of col.drawers){drawer.height=f.h-2*thickness;drawer.open=opened;}}
  C.validate(f);
  const model=Model.build(THREE,f,box),fronts=[];model.updateMatrixWorld(true);
  model.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front')fronts.push(o);});
  assert.equal(fronts.length,5);
  for(const face of fronts){
   const i=face.userData.cabinetPart.column,span=C.frontSpan(f,i),bounds=new THREE.Box3().setFromObject(face),size=bounds.getSize(new THREE.Vector3());
   assert.equal(face.material.color.getHexString(),'f3f1ec');
   near(size.x*1000,span.right-span.left-2,'front uses overlay width');
   near(bounds.min.y*1000,C.frontInset(f)+1,'all five fronts share bottom');
   near(bounds.max.y*1000,f.h-thickness-1,'all five fronts align beneath wood top');
   near(bounds.min.x*1000,span.left+1,'front covers side/divider edge');
   near(bounds.max.z*1000,f.d/2+(opened?f.d*.7:0),'front stays in nominal depth and translates');
   near(face.userData.cabinetDrawerSize.width,size.x*1000,'reported panel width matches mesh');
   near(face.userData.cabinetDrawerSize.height,size.y*1000,'reported panel height matches mesh');
  }
  const bounds=new THREE.Box3().setFromObject(model);near(bounds.max.y*1000,350,'opening does not lift top');
  if(!opened){near(bounds.min.z*1000,-175,'closed rear');near(bounds.max.z*1000,175,'closed front');near(bounds.getSize(new THREE.Vector3()).x*1000,2505,'closed total width');}
  const boards=Motion.boards(f,{includeStatic:true}).filter(b=>b.metadata.cabinetDrawerBoard==='front');
  assert.equal(boards.length,5);
  for(const board of boards){near(board.bottom,C.frontInset(f)+1,'solid front bottom');near(board.top,350-thickness-1,'solid front top');}
  const restored=P.unpack(P.pack({planId:'demo',current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0];assert.deepEqual(restored.cabinet,f.cabinet);
  for(const zone of C.openingZones(restored).filter(z=>z.kind==='cabinetdrawer')){near(zone.ranges[0][1],zone.column===2?350:350-thickness-1,'opening height covers actual moving panel');}
 }
 const legacy={type:'cabinet',...C.preset('tv-floor')};delete legacy.cabinet.doorOverlay;assert.equal(C.doorOverlay(legacy),'inset','old missing overlay keeps its stored structure');
 const plan={rooms:[{id:'room',poly:[[0,0],[8000,0],[8000,8000],[0,8000]],ceilingHeight:4000}],walls:[],doors:[],ceilingHeight:4000};
 const f={id:'threshold',type:'cabinet',cx:3000,cy:3000,rot:0,...C.preset('tv-floor')};f.w=2505;f.d=350;f.h=350;for(const col of f.cabinet.columns)for(const d of col.drawers)d.height=314;
 const key=P.checkFingerprint({},plan,[f],800),colored=structuredClone(f);colored.cabinet.columns[2].doorColor='#445566';
 assert(key.includes('cabinet-pullout-overlay-v1'),'old geometry confirmations expire');assert.equal(P.checkFingerprint({},plan,[colored],800),key,'color-only edit preserves spatial confirmation');
 for(const rot of [0,37,90])for(const flip of [false,true]){
  const placed={...f,rot,flip},x=C.layout(placed)[0].center*(flip?-1:1),z=265,a=rot*Math.PI/180;
  const obstacle={id:'obstacle',type:'washer',cx:3000+x*Math.cos(a)-z*Math.sin(a),cy:3000+x*Math.sin(a)+z*Math.cos(a),rot,w:10,d:10,h:10,mountHeight:331};
  const collisions=b=>P.spaceCheck(plan,[placed,b],{scanPassages:false}).filter(v=>v.id===placed.id&&v.kind==='cabinetdrawer');
  assert.equal(collisions(obstacle).length,0,'front upper edge contact is clear');assert(collisions({...obstacle,mountHeight:330}).length,'1mm panel penetration is detected after rotation/mirror');
 }
 console.log('PASS TV overlay: 12/18/30mm, full/half, five matching white fronts, production solids, opening heights, rotation/mirror input, bounds and project restoration; old inset preserved');
})().catch(e=>{console.error(e);process.exit(1);});
