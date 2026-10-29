/* Imported double folding leaves, fitted before rigid X rotation; production + numeric. */
(function(root){'use strict';
function build(T,f,{phase}={}){
 const P=root.FurnishProducts||require('../core/product-rules.js'),C=root.FurnishDishwasherFold||require('../core/dishwasher-fold-core.js'),A=root.FurnishDishwasherBlenderAsset||require('../data/dishwasher-blender-asset.js'),group=new T.Group(),body=new T.Group(),parents=new Map(),spec=C.spec();group.add(body);body.position.y=P.value(f,'mountHeight')/1000;
 for(const frame of C.frames(f,phase)){const pivot=new T.Group();pivot.position.set(...frame.position.map(v=>v/1000));if(frame.role!=='basket')pivot.rotation.x=frame.angle;pivot.name='motion:'+frame.role;pivot.userData.dishwasherPart=frame.role==='basket'?'basket-slide':frame.role+'-door';(parents.get(frame.parent)||body).add(pivot);parents.set(frame.role,pivot);}
 for(const part of A.parts){const partScale=C.partScale(f,part),origin=spec.motions.find(m=>m.role===part.role)?.pivot||[0,0,0],positions=part.positions.map((v,i)=>(v-origin[i%3]/1000)*partScale[i%3]),normals=[];
  for(let i=0;i<part.normals.length;i+=3){const n=part.normals.slice(i,i+3).map((v,k)=>v/partScale[k]),l=Math.hypot(...n);normals.push(...n.map(v=>v/l));}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(Array.from({length:positions.length/3},(_,i)=>i));const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({...part.material,...(part.recolor?{color:f.color||'#f4f3ef'}:{})}));mesh.name=part.name;mesh.userData.dishwasherPart=part.label;mesh.userData.furnishStablePart=part.identity;mesh.castShadow=mesh.receiveShadow=true;(parents.get(part.role)||body).add(mesh);
 }
 group.userData.countertopDishwasher=true;group.userData.furnishAsset=A.id+'@'+A.version;return group;
}
const api={build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishDishwasherAssetModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
