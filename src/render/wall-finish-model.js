/* Production finish solids; plan data is mm, generated meshes are metres. */
(function(root){
'use strict';
function build(THREE,plan,{wx=v=>v/1000,wz=v=>v/1000,top=Infinity}={}){
 const group=new THREE.Group();if(!plan.wallFinish?.solids.length)return group;
 const materials={},owners=new Set();
 for(const s of plan.wallFinish?.solids||[]){
  const height=Math.min(top,s.top)-s.bottom;if(height<=0)continue;
  for(const [layer,thickness] of [['bond',s.bondThickness],['tile',s.tileThickness]]){
   if(!thickness)continue;const r=[...s.rect],n=s.normal;
   if(layer==='bond'){if(s.side===1)r[n+2]=r[n]+thickness;else r[n]=r[n+2]-thickness;}
   else if(s.side===1)r[n]+=s.bondThickness;else r[n+2]-=s.bondThickness;
   materials[layer]||=new THREE.MeshStandardMaterial(layer==='tile'?{color:'#efd3a5',roughness:.35}:{color:'#7899ac',roughness:1});
   const mesh=new THREE.Mesh(new THREE.BoxGeometry((r[2]-r[0])/1000,height/1000,(r[3]-r[1])/1000),materials[layer]);
   mesh.position.set(wx((r[0]+r[2])/2),(s.bottom+height/2)/1000,wz((r[1]+r[3])/2));mesh.castShadow=mesh.receiveShadow=true;
   if(!owners.has(materials[layer])){mesh.userData.wallFinishOwnMaterial=true;owners.add(materials[layer]);}
   mesh.userData.wallFinish={wallId:s.wallId,index:s.index,layer,rect:r,bottom:s.bottom,top:s.bottom+height};group.add(mesh);
  }
 }
 return group;
}
const api={build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWallFinishModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
