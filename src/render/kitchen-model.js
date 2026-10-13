/* Production kitchen geometry; all input lengths are mm. */
(function(root){
'use strict';
function build(THREE,f,box,{furniture=[],plan}={}){
 const K=root.FurnishKitchen,C=root.FurnishCabinet,k=f.kitchen,g=new THREE.Group(),stone=new THREE.MeshStandardMaterial({color:'#dcd7cf',roughness:.25});stone.userData.kitchen=true;
 for(const m of K.layout(f)){
  if(m.role==='empty')continue;
  const spec=C.preset('base'),c=K.kitchenModuleConfig(spec.cabinet,m,k.baseHeight,K.dropHeight(f));
  if(k.doorOverlay!==undefined)c.doorOverlay=k.doorOverlay;
  const part={...f,type:'cabinet',w:m.width,d:k.depth,h:k.baseHeight,cabinet:c,kitchen:undefined,cx:0,cy:0,rot:0,flip:false};
  const model=root.FurnishCabinetModel.build(THREE,part,box,{furniture:[]});model.traverse(o=>{if(o.userData.cabinetPart)o.userData.cabinetPart={...o.userData.cabinetPart,column:m.index};for(const key of ['cabinetShelf','cabinetDivider','cabinetBay'])delete o.userData[key];});model.position.set(m.x/1000,0,m.y/1000);model.rotation.y=-m.rot*Math.PI/180;g.add(model);
 }
 // The corner is a reserved blind volume, not an overlapping second cabinet.
 if(k.shape==='L'){const b=K.cornerBlock(f);g.add(box(b.w/1000,k.baseHeight/1000,b.d/1000,f.color,b.x/1000,0,b.y/1000));}
 {
  const shape=new THREE.Shape(),outline=K.outline(f);outline.forEach(([x,y],i)=>i?shape.lineTo(x/1000,y/1000):shape.moveTo(x/1000,y/1000));shape.closePath();
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
