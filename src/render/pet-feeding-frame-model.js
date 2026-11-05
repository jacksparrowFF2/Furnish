/* Parametric custom steel insert; appliance uses the existing Mijia production constructor. */
(function(root){
'use strict';
const P=()=>root.FurnishProducts||require('../core/product-rules.js'),C=()=>root.FurnishPetFeedingCore||require('../core/pet-feeding-core.js');
const supported=f=>!!P().definition(f)?.feedingFrame&&!f.obj;
function build(T,f){
 const l=C().layout(f),g=new T.Group(),materials={frame:new T.MeshStandardMaterial({color:f.color||'#71777b',metalness:.6,roughness:.38}),shelf:new T.MeshStandardMaterial({color:'#b4bbbf',metalness:.8,roughness:.4}),rail:new T.MeshStandardMaterial({color:'#8b9297',metalness:.8,roughness:.3}),rubber:new T.MeshStandardMaterial({color:'#444742',roughness:.8})};
 for(const part of C().parts(f)){
  const mesh=new T.Mesh(new T.BoxGeometry(part.w/1000,part.h/1000,part.d/1000),materials[part.material]);mesh.name=part.key;mesh.position.set(part.x/1000,(part.bottom+part.h/2+l.base)/1000,part.z/1000);mesh.rotation.z=part.rotation;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.petFeedingPart=part.key;mesh.userData.furnishStablePart='pet-feeding-insert:'+part.key;mesh.userData.ceilingOwnMaterial=true;mesh.userData.petTrayMoving=part.moving;g.add(mesh);
 }
 const feeder=(root.FurnishPetFeederModel||require('./pet-feeder-model.js')).build(T,{type:'pet_feeder_mijia_2',w:l.feeder.w,d:l.feeder.d,h:l.feeder.h,color:'#efeee8'});feeder.name='mounted-feeder';feeder.position.set(l.feeder.x/1000,(l.base+l.feeder.y)/1000,l.feeder.z/1000);feeder.userData.petTrayMoving=true;g.add(feeder);return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishPetFeedingFrameModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
