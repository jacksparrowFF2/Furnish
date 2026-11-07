const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),M=require('../src/core/cabinet-motion.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js');
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),THREE=await import(JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 const ctx=vm.createContext({FurnishCabinet:C,FurnishPartIdentity:require('../src/core/part-identity.js')});vm.runInContext(fs.readFileSync(require.resolve('../src/render/cabinet-model.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 for(const backCase of [undefined,'legacy-off',0,6,9.5,36,50])for(const door of ['double','none'])for(const overlay of ['full','half','inset'])for(const construction of ['shared','independent']){
  const f={...C.preset('storage'),id:'depth',type:'cabinet',cx:2000,cy:3000,d:350,mountHeight:150,rot:0};
  Object.assign(f.cabinet,{doorOverlay:overlay,boxConstruction:construction});delete f.cabinet.backThickness;if(backCase==='legacy-off')f.cabinet.backPanel=false;else if(backCase!==undefined)f.cabinet.backThickness=backCase;
  f.cabinet.columns.forEach(col=>{col.door=door;col.shelves=[500];col.drawers=[];});C.validate(f);
  const original=JSON.stringify(f),depth=C.depthLayout(f);assert.equal(JSON.stringify(f),original);
  near(depth.backThickness,backCase==='legacy-off'?0:backCase??18);near(depth.clearDepth,350-depth.backThickness-(door==='none'?0:18));
  const model=ctx.FurnishCabinetModel.build(THREE,f,box);model.updateMatrixWorld(true);let shelves=0,backs=0;
  model.traverse(o=>{if(!o.isMesh)return;const bounds=new THREE.Box3().setFromObject(o);
   if(o.userData.cabinetShelf){shelves++;near(bounds.min.z*1000,depth.rear);near(bounds.max.z*1000,depth.rear+depth.shelfDepth);assert(bounds.max.z*1000<=depth.front+.001);}
   if(o.userData.cabinetBay&&!o.userData.cabinetShelf&&Math.abs(bounds.min.z*1000+175)<.001&&Math.abs(bounds.max.z*1000-depth.rear)<.001)backs++;
  });assert(shelves>0);assert.equal(backs>0,depth.backThickness>0,'zero back depth means no rear solid');
  for(const rot of [0,37,90])for(const flip of [false,true]){
   const placed={...f,rot,flip},boards=M.solidParts(placed,{furniture:[placed]});assert(boards.length);assert(boards.every(b=>b.vertices.flat().every(Number.isFinite)));
   const work={furniture:[placed]},round=P.unpack(P.pack({planId:'p',current:work,designs:[{name:'depth',work}],catalog:[]}));near(C.depthLayout(round.current.furniture[0]).clearDepth,depth.clearDepth);
   const restore=items=>D.restoreFurniture(items,{makeId:()=> 'new',colorFor:()=> '#fff'}),once=restore([placed]);assert.deepEqual(restore(once),once);
  }
  const context=C.spatialConfig(f);assert.equal(context.shelfDepthRule,'solid-rear-face-v1');assert.deepEqual(C.spatialConfig({...f,color:'#ff0000',price:20}),context);
  for(const delta of [-.001,0,.001]){
   const item={id:'item',type:'water_purifier_mijia_1200g',w:100,d:100,h:100,mountHeight:300,cx:f.cx+C.layout(f)[0].center,cy:f.cy+depth.rear+50-delta,rot:0};
   assert.equal(G.volumeOverlap(f,item),depth.backThickness>0&&delta>0,'rear solid contact vs penetration');
  }
 }
 for(const thickness of [0,6,36,50])for(const extension of [0,.5,1]){
  const f={...C.preset('base'),id:'drawer',type:'cabinet',cx:2000,cy:3000,rot:0,d:350};f.cabinet.backThickness=thickness;f.cabinet.columns.forEach(col=>{col.shelves=[];col.drawers=[{height:150,open:extension>0,extension}];});C.validate(f);
  const model=ctx.FurnishCabinetModel.build(THREE,f,box);model.updateMatrixWorld(true);let count=0;
  model.traverse(o=>{if(o.userData.cabinetDrawerBoard!=='back')return;const bounds=new THREE.Box3().setFromObject(o);near(bounds.min.z*1000,-175+thickness+350*.7*extension);count++;});assert(count>0,'drawer back respects cabinet back inner face');
 }
 for(const construction of ['independent']){
  let f={...C.preset('wardrobe'),id:'stack',type:'wardrobe',cx:2000,cy:3000,rot:0,d:350};f.cabinet.backThickness=36;f=C.setConstruction(f,construction,{left:0,right:0});f=C.setStackedBoxes(f,true);const model=ctx.FurnishCabinetModel.build(THREE,f,box);model.updateMatrixWorld(true);let backs=0;
  model.traverse(o=>{if(!o.isMesh||!o.userData.cabinetBay)return;const b=new THREE.Box3().setFromObject(o);if(Math.abs(b.min.z*1000+175)<.001&&Math.abs(b.max.z*1000+139)<.001)backs++;});assert.equal(backs,2*f.cabinet.columns.length,'36mm back is split into actual upper/lower boxes');
 }
 const base={...C.preset('storage'),id:'base',type:'cabinet',cx:2000,cy:3000,rot:0,d:350};
 assert.equal(C.backThickness(base.cabinet),18);base.cabinet.backThickness=6;
 const changed=structuredClone(base);changed.cabinet.thickness=25;C.scaleStructure(base,changed);C.validate(changed);assert.equal(changed.cabinet.backThickness,6);assert.equal(C.depthLayout(changed).clearDepth,319);
 const old=structuredClone(base);delete old.cabinet.backThickness;const resized=structuredClone(old);resized.cabinet.thickness=25;C.scaleStructure(old,resized);assert.equal(resized.cabinet.backThickness,18,'old missing back is frozen on board thickness edit');
 for(const value of [-1,50.001,'6',null,NaN]){const bad=structuredClone(base);bad.cabinet.backThickness=value;assert.throws(()=>C.validate(bad),/背板/);}
 const pasted=D.pasteFurniture({cx:2000,cy:3000,items:[base]},{x:3000,y:4000},{x:0,y:0,w:10000,h:10000},()=> 'back-copy').items[0];assert.equal(pasted.cabinet.backThickness,6);
 assert.equal(D.replaceFurniture(base,{type:'chair',name:'chair',w:500,d:500,color:'#fff'}).cabinet,undefined);assert.equal(D.applyCabinetTemplate(base,'book').cabinet.backThickness,undefined);
 const other=structuredClone(base);other.cabinet.backThickness=9;assert.notDeepEqual(C.spatialConfig(other),C.spatialConfig(base));
 const round=P.pack({planId:'p',current:{furniture:[base]},designs:[],catalog:[]});assert.equal(round.version,59);assert.equal(P.unpack(round).current.furniture[0].cabinet.backThickness,6);
 const planId=require('../src/data/plans.js')[0].id,state={v:59,planId,work:{[planId]:{furniture:[base]}},designs:[],custom:[]},R=require('../src/core/repository-core.js');assert.equal(R.parse(JSON.parse(R.text(state))).work[planId].furniture[0].cabinet.backThickness,6);
 const cacheCtx=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../src/io/workspace-cache.js'),'utf8'),cacheCtx);assert.equal(cacheCtx.FurnishWorkspaceCache.candidates({read:key=>key==='huxing-design-v59'?JSON.stringify(state):null})[0].v,59);
 console.log('PASS solid rear faces, 350mm depth chains, no-back/no-door, production shelf bounds, overlay/construction, rotation/mirror/elevation, project and repeated restore');
})().catch(e=>{console.error(e);process.exitCode=1;});
