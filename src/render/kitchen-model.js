/* Production kitchen geometry; all input lengths are mm. */
(function(root){
'use strict';
function slabShape(T,f,furniture,recess=false){
 const K=root.FurnishKitchen,geometry=K.slabGeometry(f,furniture,recess);
 const shapes=[];for(const ring of geometry.rings){if(K.ringArea(ring)<=0)continue;const shape=new T.Shape();ring.forEach(([x,y],i)=>i?shape.lineTo(x/1000,y/1000):shape.moveTo(x/1000,y/1000));shape.closePath();for(const holeRing of geometry.rings.filter(r=>K.ringArea(r)<0&&K.ringInside(r[0],ring))){const hole=new T.Path();holeRing.forEach(([x,y],i)=>i?hole.lineTo(x/1000,y/1000):hole.moveTo(x/1000,y/1000));hole.closePath();shape.holes.push(hole);}shapes.push(shape);}return shapes;
}
function countertop(T,f,material,furniture=[]){
 const K=root.FurnishKitchen,g=new T.Group(),top=f.kitchen?f.kitchen.baseHeight+f.kitchen.thickness:860,t=f.kitchen?.thickness??40,recess=K.deviceOpenings(f,furniture).some(({device})=>K.arrowSink(device)&&K.sinkMode(device)==='flush')?.8:0;
 const layer=(shapes,height,depth)=>{const geo=new T.ExtrudeGeometry(shapes,{depth:depth/1000,bevelEnabled:false});geo.rotateX(Math.PI/2);geo.translate(0,height/1000,0);const mesh=new T.Mesh(geo,material);mesh.userData.kitchenSlab=true;mesh.userData.cabinetOwnMaterial=true;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);};
 layer(slabShape(T,f,furniture),top-recess,t-recess);if(recess)layer(slabShape(T,f,furniture,true),top,recess);return g;
}
function cutSinkBodies(T,g,f,furniture){
 const K=root.FurnishKitchen,S=root.FurnishSolidCut||(typeof require==='function'?require('./solid-cut.js'):null);if(!S)return;
 g.updateMatrixWorld(true);
 for(const {device,ring} of K.deviceOpenings(f,furniture).filter(v=>K.arrowSink(v.device)||v.device.sinkNotch||v.device.id?.endsWith(':sink'))){const shape=new T.Shape();ring.forEach(([x,z],i)=>i?shape.lineTo(x/1000,z/1000):shape.moveTo(x/1000,z/1000));shape.closePath();const cutter=new T.ExtrudeGeometry(shape,{depth:((device.h??240)+60)/1000,bevelEnabled:false});cutter.rotateX(Math.PI/2);cutter.translate(0,((f.kitchen?.baseHeight??820)+40)/1000,0);const cutBox=new T.Box3().setFromBufferAttribute(cutter.attributes.position);g.traverse(o=>{if(!o.isMesh||!o.userData.cabinetTop&&!o.userData.legacyCounterBody)return;const bounds=new T.Box3().setFromBufferAttribute(o.geometry.attributes.position).applyMatrix4(o.matrixWorld);if(!bounds.intersectsBox(cutBox))return;const geometry=S.subtract(T,o.geometry,o.matrixWorld,cutter);o.geometry.dispose();o.geometry=geometry;o.userData.sinkBodyCut=true;});cutter.dispose();}
}
function cutLaundryNotch(T,g,f){
 const K=root.FurnishKitchen,cut=K.laundryCut(f);if(!cut.length)return;
 const S=root.FurnishSolidCut||(typeof require==='function'?require('./solid-cut.js'):null);if(!S)throw Error('缺少柜体切割模块');
 const n=f.kitchen.laundry.notch,cutter=new T.BoxGeometry(n.width/1000,(f.kitchen.baseHeight+200)/1000,n.depth/1000);
 cutter.translate((cut[0][0]+n.width/2)/1000,f.kitchen.baseHeight/2000,(cut[0][1]+n.depth/2)/1000);g.updateMatrixWorld(true);
 g.traverse(o=>{if(!o.isMesh||o.userData.kitchenSlab)return;const geometry=S.subtract(T,o.geometry,o.matrixWorld,cutter);o.geometry.dispose();o.geometry=geometry;});cutter.dispose();
}
function build(THREE,f,box,{furniture=[],plan,previewBlind=null,previewMirror=false}={}){
 const K=root.FurnishKitchen,C=root.FurnishCabinet,k=f.kitchen,previewBlinds=previewBlind?(Array.isArray(previewBlind)?previewBlind:[previewBlind]):[],g=new THREE.Group(),stone=new THREE.MeshStandardMaterial({color:'#dcd7cf',roughness:.25});stone.userData.kitchen=true;
 for(const m of K.cabinetLayout(f)){
  if(m.role==='empty')continue;
  const part={...K.moduleFurniture(f,m),cx:0,cy:0,rot:0,flip:false};
  // Cut each adjoining side independently: U's connector may touch both corners.
  const sideCuts=K.adjacentOpenings(f,m,previewBlinds.length?previewBlinds:K.cornerLayout(f),previewMirror).map(opening=>({...opening,bottom:K.plinth(f)+18,top:k.baseHeight-18}));
  const model=root.FurnishCabinetModel.build(THREE,part,box,{furniture:[],sideCuts,floorOpen:!!k.laundry?.floorOpen&&m.role==='sink'});model.traverse(o=>{if(o.userData.cabinetShelf)o.userData.kitchenShelf={module:m.index,shelf:o.userData.cabinetShelf.shelf};const pick=o.userData.cabinetShelf||o.userData.cabinetDivider||o.userData.cabinetBay;if(pick)o.userData.cabinetInspect={...pick,column:m.index,bay:pick.column,kind:pick.shelf!==undefined?'shelf':'bay'};if(o.userData.cabinetPart)o.userData.cabinetPart={...o.userData.cabinetPart,...(m.role==='custom'?{bay:o.userData.cabinetPart.column}:{}),column:m.index};for(const key of ['cabinetShelf','cabinetDivider','cabinetBay'])delete o.userData[key];});model.position.set(m.x/1000,0,m.y/1000);model.userData.kitchenModule=m.index;model.rotation.y=-m.rot*Math.PI/180;if(previewMirror)model.scale.x=-1;g.add(model);
 }
 // Production blind corners are board-built, with open storage cavities.
 const addBoards=(boards,plinth,preview=null)=>{const group=new THREE.Group();if(preview){group.userData.kitchenPreviewBlind=true;group.position.z=preview.y/1000;}for(const b of [...boards,...plinth]){const mesh=box(b.w/1000,(b.top-b.bottom)/1000,b.d/1000,C.palette.body,b.x/1000,b.bottom/1000,(b.y-(preview?.y??0))/1000);mesh.userData[plinth.includes(b)?'kitchenCornerPlinth':'kitchenCornerBoard']=true;mesh.userData.kitchenCornerIndex=b.cornerIndex;if(b.shelf)mesh.userData.kitchenCornerShelf=true;group.add(mesh);}g.add(group);};
 if(k.shape!=='straight'){
  // Keep plinths at the root for the existing picking and geometry contract.
  for(const b of K.cornerPlinth(f)){const mesh=box(b.w/1000,(b.top-b.bottom)/1000,b.d/1000,C.palette.body,b.x/1000,b.bottom/1000,b.y/1000);mesh.userData.kitchenCornerPlinth=true;mesh.userData.kitchenCornerIndex=b.cornerIndex;g.add(mesh);}addBoards(K.cornerBoards(f),[]);
 }else for(const blind of previewBlinds){const temp={...f,kitchen:{...k,shape:'L',corner:blind.x>0?'right':'left'}},blocks=[{x:blind.x,y:blind.y,w:blind.width,d:blind.depth??k.depth,shelves:blind.shelves??[]}];addBoards(K.cornerBoards(temp,blocks),K.cornerPlinth(temp,blocks),blind);}
 if(K.hasCountertop(f)){
  const shape=slabShape(THREE,f,furniture),recess=K.deviceOpenings(f,furniture).some(({device})=>K.arrowSink(device)&&K.sinkMode(device)==='flush')?.8:0;
  const bevel=K.edgeStyle(f)==='bevel',cut=bevel?Math.min(k.thickness,20):k.thickness;
  if(bevel&&k.thickness-cut>recess){const upper=new THREE.ExtrudeGeometry(shape,{depth:(k.thickness-cut-recess)/1000,bevelEnabled:false});upper.rotateX(Math.PI/2);upper.translate(0,(k.baseHeight+k.thickness-recess)/1000,0);const mesh=new THREE.Mesh(upper,stone);mesh.userData.kitchenSlab=true;mesh.userData.cabinetOwnMaterial=true;g.add(mesh);}
  const lowerRecess=bevel?Math.max(0,recess-(k.thickness-cut)):recess;
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:(cut-lowerRecess)/1000,bevelEnabled:false});geometry.rotateX(Math.PI/2);geometry.translate(0,(k.baseHeight+cut-lowerRecess)/1000,0);
  if(recess){const cap=new THREE.ExtrudeGeometry(slabShape(THREE,f,furniture,true),{depth:recess/1000,bevelEnabled:false});cap.rotateX(Math.PI/2);cap.translate(0,(k.baseHeight+k.thickness)/1000,0);const mesh=new THREE.Mesh(cap,stone);mesh.userData.kitchenSlab=true;mesh.userData.cabinetOwnMaterial=true;g.add(mesh);}
  if(K.edgeStyle(f)==='bevel'){
   const positions=geometry.attributes.position,edges=K.frontEdges(f),cut=Math.min(k.thickness,20)/1000;
   for(let i=0;i<positions.count;i++)if(Math.abs(positions.getY(i)-k.baseHeight/1000)<1e-6){const x=positions.getX(i),z=positions.getZ(i);let dx=0,dz=0;for(const e of edges){const a=e.a.map(v=>v/1000),b=e.b.map(v=>v/1000);if(x>=Math.min(a[0],b[0])-1e-6&&x<=Math.max(a[0],b[0])+1e-6&&z>=Math.min(a[1],b[1])-1e-6&&z<=Math.max(a[1],b[1])+1e-6&&Math.abs((x-a[0])*e.normal[0]+(z-a[1])*e.normal[1])<1e-6){dx-=e.normal[0]*cut;dz-=e.normal[1]*cut;}}positions.setXYZ(i,x+dx,k.baseHeight/1000,z+dz);}
   positions.needsUpdate=true;geometry.computeVertexNormals();
  }
  // rotateX maps the shape's Y to world Z and extrusion downward.
  const mesh=new THREE.Mesh(geometry,stone);mesh.userData.kitchenSlab=true;mesh.userData.cabinetOwnMaterial=true;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 }
 for(const edge of K.edgeParts(f)){const mesh=box(edge.w/1000,(edge.top-edge.bottom)/1000,edge.d/1000,'#dcd7cf',edge.x/1000,edge.bottom/1000,edge.y/1000);mesh.material=stone;mesh.userData.kitchenEdge=true;mesh.userData.cabinetOwnMaterial=true;g.add(mesh);}
 if(!K.isWall(f))cutSinkBodies(THREE,g,f,furniture);
 for(const b of K.laundrySideBoards(f)){const mesh=box(b.w/1000,(b.top-b.bottom)/1000,b.d/1000,f.color||C.palette.front,b.x/1000,b.bottom/1000,b.y/1000);mesh.userData.laundrySidePanel=b.side;g.add(mesh);}
 cutLaundryNotch(THREE,g,f);
 for(const b of K.laundryNotchBoards(f)){const mesh=box(b.w/1000,(b.top-b.bottom)/1000,b.d/1000,C.palette.body,b.x/1000,b.bottom/1000,b.y/1000);mesh.userData.laundryNotchBoard=true;g.add(mesh);}
 for(const {key,furniture:p} of K.laundryParts(f)){const [x,z]=K.local(f,p.cx,p.cy);let model;if(key==='sink'){model=(root.FurnishProducts.vesselSink(p)?root.FurnishSinkModel.buildVessel:root.FurnishSinkModel.buildNotched)(THREE,p);model.position.y=(p.counterElevation-862)/1000;}else{model=root.FurnishCabinetModel.build(THREE,{...p,cx:0,cy:0,rot:0,flip:false},box,{furniture:[]});model.position.y=p.mountHeight/1000;model.traverse(o=>{const pick=o.userData.cabinetShelf||o.userData.cabinetDivider||o.userData.cabinetBay||o.userData.cabinetPart;if(pick)o.userData.cabinetInspect={...pick,assembly:key,kind:pick.shelf!==undefined?'shelf':pick.drawer!==undefined||pick.lid?'drawer':o.userData.cabinetPart?'door':'bay'};if(o.userData.cabinetPart)o.userData.cabinetPart={...o.userData.cabinetPart,section:'laundry:'+key};if(o.userData.cabinetDoorSize)o.userData.cabinetDoorSize={...o.userData.cabinetDoorSize,assembly:key};if(o.userData.cabinetDrawerSize)o.userData.cabinetDrawerSize={...o.userData.cabinetDrawerSize,assembly:key};for(const k of ['cabinetShelf','cabinetDivider','cabinetBay'])delete o.userData[k];});}model.position.x=x/1000;model.position.z=z/1000;model.traverse(o=>{if(o.isMesh)o.userData.cabinetOwnMaterial=true;});g.add(model);}

 if(plan)root.FurnishCabinetModel.cutServices(THREE,g,f,{plan});return g;
}
function legacy(THREE,f,box,{furniture=[]}={}){
 const C=root.FurnishCabinet||require('../core/cabinet-core.js'),assembly=C.legacyParts(f),g=new THREE.Group();if(!assembly)throw Error('请选择旧组合柜体');
 for(const part of assembly.parts){const model=root.FurnishCabinetModel.build(THREE,{...part.furniture,cx:0,cy:0,rot:0,flip:false},box,{furniture:[]});model.position.set(0,part.bottom/1000,part.z/1000);model.traverse(o=>{delete o.userData.cabinetPart;delete o.userData.motion;});g.add(model);}
 for(const b of assembly.boards)if(b.key!=='countertop')g.add(box(b.w/1000,(b.top-b.bottom)/1000,b.d/1000,'#efece6',b.x/1000,b.bottom/1000,b.z/1000));
 // Existing production countertop keeps its sink openings and appearance.
 g.add(countertop(THREE,f,new THREE.MeshStandardMaterial({color:'#dcd7cf',roughness:.22}),furniture));cutSinkBodies(THREE,g,f,furniture);return g;
}
root.FurnishKitchenModel={legacy,build,countertop,cutSinkBodies};if(typeof module==='object'&&module.exports)module.exports=root.FurnishKitchenModel;
})(typeof globalThis!=='undefined'?globalThis:this);
