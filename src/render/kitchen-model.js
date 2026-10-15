/* Production kitchen geometry; all input lengths are mm. */
(function(root){
'use strict';
function build(THREE,f,box,{furniture=[],plan,previewBlind=null,previewMirror=false}={}){
 const K=root.FurnishKitchen,C=root.FurnishCabinet,k=f.kitchen,g=new THREE.Group(),stone=new THREE.MeshStandardMaterial({color:'#dcd7cf',roughness:.25});stone.userData.kitchen=true;
 for(const m of K.cabinetLayout(f)){
  if(m.role==='empty')continue;
  const spec=C.preset('base'),c=K.kitchenModuleConfig(spec.cabinet,m,k.baseHeight,K.dropHeight(f),k);
  if(k.doorOverlay!==undefined)c.doorOverlay=k.doorOverlay;
  const part={...f,type:'cabinet',w:m.width,d:m.depth??k.depth,h:k.baseHeight,cabinet:c,kitchen:undefined,cx:0,cy:0,rot:0,flip:false};
  const run=K.layout(f).filter(v=>v.run===m.run),right=K.cornerSide(f)==='right',previewAdjacent=previewBlind&&m.index<k.modules.length&&Math.abs(Math.abs(m.x-previewBlind.x)-(m.width+previewBlind.width)/2)<.01,adjacent=m.role!=='drawer'&&(previewAdjacent||k.shape==='L'&&m.index===(m.run===0&&right?run.at(-1):run[0])?.index),side=previewAdjacent?(m.x>previewBlind.x?'left':'right'):m.run===0?(right?'right':'left'):(right?'left':'right');
  // sideBoard offsets cut.back by the board thickness. Keep that rear strip
  // to close the inset back board's edge, while opening the storage cavity.
  const sideCuts=adjacent?[{side,bottom:118,top:k.baseHeight-18,back:-part.d/2,front:part.d/2}]:[];
  const model=root.FurnishCabinetModel.build(THREE,part,box,{furniture:[],sideCuts});model.traverse(o=>{if(o.userData.cabinetPart)o.userData.cabinetPart={...o.userData.cabinetPart,column:m.index};for(const key of ['cabinetShelf','cabinetDivider','cabinetBay'])delete o.userData[key];});model.position.set(m.x/1000,0,m.y/1000);model.userData.kitchenModule=m.index;model.rotation.y=-m.rot*Math.PI/180;if(previewMirror)model.scale.x=-1;g.add(model);
 }
 // Production blind corner is made of boards, with an empty interior.
 const blind=k.shape==='L'?K.cornerBoards(f):previewBlind?K.cornerBoards({...f,w:previewBlind.width,d:k.depth,kitchen:{...k,shape:'L',endExtensions:undefined,corner:previewBlind.x>0?'right':'left'}}).map(b=>({...b,x:b.x+previewBlind.x,y:b.y+previewBlind.y})):[];
 if(k.shape==='L')for(const b of K.cornerPlinth(f)){const mesh=box(b.w/1000,(b.top-b.bottom)/1000,b.d/1000,C.palette.body,b.x/1000,b.bottom/1000,b.y/1000);mesh.userData.kitchenCornerPlinth=true;g.add(mesh);}
 if(blind.length){const group=new THREE.Group();if(previewBlind){group.userData.kitchenPreviewBlind=true;group.position.set(0,0,previewBlind.y/1000);}const previewPlinth=previewBlind?K.cornerPlinth({...f,w:previewBlind.width,d:k.depth,kitchen:{...k,shape:'L',endExtensions:undefined,corner:previewBlind.x>0?'right':'left'}}).map(b=>({...b,x:b.x+previewBlind.x,y:b.y+previewBlind.y})):[];for(const b of [...blind,...previewPlinth]){const mesh=box(b.w/1000,(b.top-b.bottom)/1000,b.d/1000,C.palette.body,b.x/1000,b.bottom/1000,(b.y-(previewBlind?previewBlind.y:0))/1000);if(previewPlinth.includes(b))mesh.userData.kitchenCornerPlinth=true;else mesh.userData.kitchenCornerBoard=true;group.add(mesh);}g.add(group);}
 {
  const shape=new THREE.Shape(),surface=K.topGeometry(f),outline=surface.rings[0];outline.forEach(([x,y],i)=>i?shape.lineTo(x/1000,y/1000):shape.moveTo(x/1000,y/1000));shape.closePath();
  for(const ring of surface.rings.slice(1)){const hole=new THREE.Path();ring.forEach(([x,y],i)=>i?hole.lineTo(x/1000,y/1000):hole.moveTo(x/1000,y/1000));hole.closePath();shape.holes.push(hole);}
  for(const device of furniture.filter(v=>v.counterLink?.hostId===f.id)){
   const m=K.layout(f)[device.counterLink.module];if(!m)continue;
   const opening=K.cutout(device),hw=(m.run===0?opening.w:opening.d)/2000,hd=(m.run===0?opening.d:opening.w)/2000,cx=m.x/1000,cy=m.y/1000;
   const hole=new THREE.Path();hole.moveTo(cx-hw,cy-hd);hole.lineTo(cx-hw,cy+hd);hole.lineTo(cx+hw,cy+hd);hole.lineTo(cx+hw,cy-hd);hole.closePath();shape.holes.push(hole);
  }
  const bevel=K.edgeStyle(f)==='bevel',cut=bevel?Math.min(k.thickness,20):k.thickness;
  if(bevel&&k.thickness>cut){const upper=new THREE.ExtrudeGeometry(shape,{depth:(k.thickness-cut)/1000,bevelEnabled:false});upper.rotateX(Math.PI/2);upper.translate(0,(k.baseHeight+k.thickness)/1000,0);const mesh=new THREE.Mesh(upper,stone);mesh.userData.kitchenSlab=true;mesh.userData.cabinetOwnMaterial=true;g.add(mesh);}
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:cut/1000,bevelEnabled:false});geometry.rotateX(Math.PI/2);geometry.translate(0,(k.baseHeight+cut)/1000,0);
  if(K.edgeStyle(f)==='bevel'){
   const positions=geometry.attributes.position,edges=K.frontEdges(f),cut=Math.min(k.thickness,20)/1000;
   for(let i=0;i<positions.count;i++)if(Math.abs(positions.getY(i)-k.baseHeight/1000)<1e-6){const x=positions.getX(i),z=positions.getZ(i);let dx=0,dz=0;for(const e of edges){const a=e.a.map(v=>v/1000),b=e.b.map(v=>v/1000);if(x>=Math.min(a[0],b[0])-1e-6&&x<=Math.max(a[0],b[0])+1e-6&&z>=Math.min(a[1],b[1])-1e-6&&z<=Math.max(a[1],b[1])+1e-6&&Math.abs((x-a[0])*e.normal[0]+(z-a[1])*e.normal[1])<1e-6){dx-=e.normal[0]*cut;dz-=e.normal[1]*cut;}}positions.setXYZ(i,x+dx,k.baseHeight/1000,z+dz);}
   positions.needsUpdate=true;geometry.computeVertexNormals();
  }
  // rotateX maps the shape's Y to world Z and extrusion downward.
  const mesh=new THREE.Mesh(geometry,stone);mesh.userData.kitchenSlab=true;mesh.userData.cabinetOwnMaterial=true;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 }
 for(const edge of K.edgeParts(f)){const mesh=box(edge.w/1000,(edge.top-edge.bottom)/1000,edge.d/1000,'#dcd7cf',edge.x/1000,edge.bottom/1000,edge.y/1000);mesh.material=stone;mesh.userData.kitchenEdge=true;mesh.userData.cabinetOwnMaterial=true;g.add(mesh);}
 if(plan)root.FurnishCabinetModel.cutServices(THREE,g,f,{plan});return g;
}
root.FurnishKitchenModel={build};if(typeof module==='object'&&module.exports)module.exports=root.FurnishKitchenModel;
})(typeof globalThis!=='undefined'?globalThis:this);
