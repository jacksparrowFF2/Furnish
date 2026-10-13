/* Production kitchen geometry; all input lengths are mm. */
(function(root){
'use strict';
function build(THREE,f,box,{furniture=[],plan}={}){
 const K=root.FurnishKitchen,C=root.FurnishCabinet,k=f.kitchen,g=new THREE.Group(),stone=new THREE.MeshStandardMaterial({color:'#dcd7cf',roughness:.25});stone.userData.kitchen=true;
 for(const m of K.layout(f)){
  if(m.role==='empty')continue;
  const spec=C.preset('base'),c=K.kitchenModuleConfig(spec.cabinet,m,k.baseHeight);
  if(k.doorOverlay!==undefined)c.doorOverlay=k.doorOverlay;
  const part={...f,type:'cabinet',w:m.width,d:k.depth,h:k.baseHeight,cabinet:c,kitchen:undefined,cx:0,cy:0,rot:0,flip:false};
  const model=root.FurnishCabinetModel.build(THREE,part,box,{furniture:[]});model.traverse(o=>{for(const key of ['cabinetPart','cabinetShelf','cabinetDivider','cabinetBay'])delete o.userData[key];});model.position.set(m.x/1000,0,m.y/1000);model.rotation.y=-m.rot*Math.PI/180;g.add(model);
 }
 // The corner is a reserved blind volume, not an overlapping second cabinet.
 if(k.shape==='L'){const b=K.cornerBlock(f);g.add(box(b.w/1000,k.baseHeight/1000,b.d/1000,f.color,b.x/1000,0,b.y/1000));}
 for(const slab of K.slabs(f)){
  const shape=new THREE.Shape(),x=(slab.x-slab.w/2)/1000,y=(slab.y-slab.d/2)/1000,w=slab.w/1000,d=slab.d/1000;
  shape.moveTo(x,y);shape.lineTo(x+w,y);shape.lineTo(x+w,y+d);shape.lineTo(x,y+d);shape.closePath();
  for(const device of furniture.filter(v=>v.counterLink?.hostId===f.id)){
   const m=K.layout(f)[device.counterLink.module];if(!m)continue;
   const opening=K.cutout(device),hw=(m.run===0?opening.w:opening.d)/2000,hd=(m.run===0?opening.d:opening.w)/2000,cx=m.x/1000,cy=m.y/1000;
   if(cx-hw<x||cx+hw>x+w||cy-hd<y||cy+hd>y+d)continue;
   const hole=new THREE.Path();hole.moveTo(cx-hw,cy-hd);hole.lineTo(cx-hw,cy+hd);hole.lineTo(cx+hw,cy+hd);hole.lineTo(cx+hw,cy-hd);hole.closePath();shape.holes.push(hole);
  }
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:k.thickness/1000,bevelEnabled:false});geometry.rotateX(Math.PI/2);geometry.translate(0,(k.baseHeight+k.thickness)/1000,0);
  // rotateX maps the shape's Y to world Z and extrusion downward.
  const mesh=new THREE.Mesh(geometry,stone);mesh.userData.kitchenSlab=true;mesh.userData.cabinetOwnMaterial=true;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 }
 if(plan)root.FurnishCabinetModel.cutServices(THREE,g,f,{plan});return g;
}
root.FurnishKitchenModel={build};if(typeof module==='object'&&module.exports)module.exports=root.FurnishKitchenModel;
})(typeof globalThis!=='undefined'?globalThis:this);
