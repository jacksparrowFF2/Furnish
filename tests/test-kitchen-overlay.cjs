const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),Motion=require('../src/core/cabinet-motion.js');
(async()=>{
 const map=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(map.three),ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:C});
 for(const name of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+name+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 const base={id:'k',type:'counter',cx:0,cy:0,w:2000,d:600,rot:0,color:'#f3f1ec'},host=K.configure(base,{version:1,shape:'straight',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:400,role:'door'},{run:0,width:800,role:'sink'},{run:0,width:800,role:'drawer'}]}),before=JSON.stringify(host);
 for(const m of K.layout(host)){
  const f=K.moduleFurniture(host,m);C.validate(f);assert(C.fullOverlay(f));
  const model=ctx.FurnishCabinetModel.build(THREE,f,box);model.updateMatrixWorld(true);
  const faces=[];model.traverse(o=>{if(o.isMesh&&o.geometry.parameters?.depth===.018&&(o.parent.userData.motion?.kind==='cabinetdoor'||o.userData.cabinetDrawerBoard==='front'))faces.push(new THREE.Box3().setFromObject(o));});
  assert.equal(faces.length,m.role==='drawer'?3:m.width>650?2:1);
  assert(Math.abs(Math.min(...faces.map(b=>b.min.x))+m.width/2000-.001)<1e-6);
  assert(Math.abs(Math.max(...faces.map(b=>b.max.x))-m.width/2000+.001)<1e-6);
  assert(Math.abs(Math.min(...faces.map(b=>b.min.y))-.101)<1e-6);assert(Math.abs(Math.max(...faces.map(b=>b.max.y))-.819)<1e-6);
  for(const face of faces){assert(Math.abs(face.min.z-.282)<1e-6);assert(Math.abs(face.max.z-.3)<1e-6);}
  const recorded=Motion.boards(f),zones=C.openingZones(f,{passage:0});assert(recorded.length);assert(zones.every(z=>z.ranges.every(([lo,hi])=>lo>=100&&hi<=820)));
  // Production front rays hit the door at the old exposed side/top/bottom strips.
  for(const [x,y] of [[-m.width/2000+.005,.4],[m.width/2000-.005,.4],[.01,.105],[.01,.815]]){
   const hit=new THREE.Raycaster(new THREE.Vector3(x,y,1),new THREE.Vector3(0,0,-1)).intersectObject(model,true)[0];assert(hit);assert.equal(hit.object.material.color.getHexString(),'f3f1ec');assert(Math.abs(hit.point.z-.3)<1e-6);
  }
 }

 // Automatic fronts share the ordinary cabinet rule without subdividing device cavities.
 for(const width of [482,500,501,650,800,1000,1001,1164,1350,3000])for(const role of ['door','sink','hob']){
  const wide=K.configure(base,{...host.kitchen,modules:[{run:0,width,role}]}),saved=JSON.stringify(wide),f=K.moduleFurniture(wide,K.layout(wide)[0]);
  const count=C.autoDoorCount(width),model=ctx.FurnishCabinetModel.build(THREE,f,box),pivots=[];model.traverse(o=>{if(o.userData.motion?.kind==='cabinetdoor')pivots.push(o);});
  assert.equal(pivots.length,count);assert.equal(C.openingZones(f).length,count);assert.equal(f.cabinet.columns.length,1,'functional cavity remains undivided');
  assert.equal(JSON.stringify(wide),saved);assert.equal(JSON.stringify(K.configure(wide,JSON.parse(saved).kitchen)),saved,'repeated restore has no drift');
  const ordinary=C.autoDoors({...C.preset('storage'),type:'cabinet',w:width});assert.equal(ordinary.cabinet.columns.reduce((n,col)=>n+(col.door==='double'?2:1),0),count);
  for(const flip of [false,true]){const turned={...wide,flip,rot:90},zones=K.openingZones(turned),boards=Motion.boards(K.moduleFurniture(turned,K.layout(turned)[0]));assert.equal(zones.length,count);assert.deepEqual([...new Set(boards.filter(b=>b.motion.kind==='cabinetdoor').map(b=>b.motion.leaf))],[...Array(count).keys()]);}
  const opened=K.toggle(wide,0);const openModel=ctx.FurnishCabinetModel.build(THREE,K.moduleFurniture(opened,K.layout(opened)[0]),box),angles=[];openModel.traverse(o=>{if(o.userData.motion?.kind==='cabinetdoor')angles.push(o.rotation.y);});assert(angles.every(a=>Math.abs(a)>1));
 }
 const manual={...C.preset('base'),w:1164,type:'cabinet'};manual.cabinet.autoDoors=false;manual.cabinet.columns=[{door:'double',shelves:[],drawers:[]}];assert.equal(C.frontLeafCount(manual,0),2,'manual doors are preserved');
 assert.equal(JSON.stringify(host),before,'derived overlay never rewrites saved kitchen configuration');
 const wall={...C.preset('wall'),type:'kitchenwall',mountHeight:1480};assert(C.fullOverlay(wall));assert(C.openingZones(wall).every(z=>z.ranges.every(([lo,hi])=>lo>=1480&&hi<=2180)));
 const mixed=structuredClone(wall);mixed.cabinet.columns[0].drawers=[{height:150,open:false}];mixed.cabinet.columns[0].shelves=[];
 const mixedModel=ctx.FurnishCabinetModel.build(THREE,mixed,box),drawerFaces=[],doorFaces=[];mixedModel.updateMatrixWorld(true);mixedModel.traverse(o=>{if(!o.isMesh)return;if(o.userData.cabinetDrawerBoard==='front')drawerFaces.push(new THREE.Box3().setFromObject(o));else if(o.parent.userData.motion?.kind==='cabinetdoor'&&o.geometry.parameters?.depth===.018)doorFaces.push(new THREE.Box3().setFromObject(o));});
 assert(Math.max(...drawerFaces.map(b=>b.max.y))<Math.min(...doorFaces.map(b=>b.min.y)),'drawer faces below doors must not extend across the door band');
 const baseTemplate={...C.preset('base'),type:'cabinet'};assert(C.fullOverlay(baseTemplate),'the kitchen base cabinet library template also uses full overlay');
 const generic={...C.preset('book'),type:'cabinet'};assert(!C.fullOverlay(generic),'other cabinet templates retain their saved design');
 for(const corner of ['left','right'])for(const flip of [false,true]){
  const l=K.configure({...base,flip,rot:90},{...host.kitchen,shape:'L',corner,modules:[{run:0,width:800,role:'door'},{run:1,width:800,role:'hob'}]});
  const model=ctx.FurnishKitchenModel.build(THREE,l,box);model.updateMatrixWorld(true);assert(Math.abs(new THREE.Box3().setFromObject(model).max.y-.86)<1e-6);assert(K.openingZones(l).length);
 }
 console.log('PASS kitchen full overlay: actual door/drawer coverage, nominal depth, front rays, moving boards, wall elevation, legacy generic isolation and no saved-data mutation');
})().catch(e=>{console.error(e);process.exitCode=1;});
