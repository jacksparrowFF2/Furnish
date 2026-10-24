/* Production finish solids; plan data is mm, generated meshes are metres. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

function build(THREE,plan,{wx=v=>v/1000,wz=v=>v/1000,top=Infinity}={}){
 const group=new THREE.Group();if(!plan.wallFinish?.solids.length)return group;
 const materials={},owners=new Set();
 for(const s of syncIdentity.records("wall-finish-model.js:generator-1",plan.wallFinish?.solids||[])){
  const layerKey=(root.FurnishLayers||(typeof require==='function'?require('../core/layers-core.js'):null))?.wallFinishKey(plan,s);
  const height=Math.min(top,s.top)-s.bottom;if(height<=0)continue;
  for(const [layer,thickness] of syncIdentity.items("wall-finish-model.js:generator-2",[["item-a",['bond',s.bondThickness]],["item-b",['tile',s.tileThickness]]])){
   if(!thickness)continue;const r=[...s.rect],n=s.normal;
   if(layer==='bond'){if(s.side===1)r[n+2]=r[n]+thickness;else r[n]=r[n+2]-thickness;}
   else if(s.side===1)r[n]+=s.bondThickness;else r[n+2]-=s.bondThickness;
   materials[layer]||=new THREE.MeshStandardMaterial(layer==='tile'?{color:'#efd3a5',roughness:.35}:{color:'#7899ac',roughness:1});
   let geometry;if(s.layers?.[layer]){const shape=new THREE.Shape(s.layers[layer].map(p=>new THREE.Vector2(wx(p[0]),-wz(p[1]))));geometry=new THREE.ExtrudeGeometry(shape,{depth:height/1000,bevelEnabled:false});geometry.rotateX(-Math.PI/2);geometry.translate(0,s.bottom/1000,0);}else geometry=new THREE.BoxGeometry((r[2]-r[0])/1000,height/1000,(r[3]-r[1])/1000);
   const mesh=syncIdentity.produce("wall-finish-model:site-1",()=>new THREE.Mesh(geometry,materials[layer]));
   if(!s.layers?.[layer])mesh.position.set(wx((r[0]+r[2])/2),(s.bottom+height/2)/1000,wz((r[1]+r[3])/2));mesh.castShadow=mesh.receiveShadow=true;
   if(!owners.has(materials[layer])){mesh.userData.wallFinishOwnMaterial=true;owners.add(materials[layer]);}
   if(layerKey)mesh.userData.layerObject=layerKey;
   const poly=s.layers?.[layer];if(poly){r[0]=Math.min(...poly.map(p=>p[0]));r[1]=Math.min(...poly.map(p=>p[1]));r[2]=Math.max(...poly.map(p=>p[0]));r[3]=Math.max(...poly.map(p=>p[1]));}
   mesh.userData.wallFinish={...(poly?{poly}:{}),wallId:s.wallId,index:s.index,layer,rect:r,bottom:s.bottom,top:s.bottom+height};group.add(mesh);
  }
 }
 return group;
}
const api={build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWallFinishModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
