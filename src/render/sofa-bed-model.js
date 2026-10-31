/* Imported endpoint rig shared by the scene and numeric solid recorder. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f)?.sofaBedProfile&&!f.obj;
function build(T,f,{phase}={}){
 const C=root.FurnishSofaBed||require('../core/sofa-bed-core.js'),A=root.FurnishSofaBedBlenderAsset||require('../data/sofa-bed-blender-asset.js'),g=new T.Group(),parents=new Map(),spec=C.spec(),s=C.layout(f).s;
 for(const frame of C.frames(f,phase)){const p=new T.Group();p.name='motion:'+frame.role;p.position.set(...frame.position.map(v=>v/1000));p.rotation.x=frame.angle;(parents.get(frame.parent)||g).add(p);parents.set(frame.role,p);}
 for(const part of A.parts){const origin=spec.motions.find(m=>m.role===part.role)?.pivot||[0,0,0],positions=part.positions.map((v,i)=>(v-origin[i%3]/1000)*s[i%3]),normals=[];
  for(let i=0;i<part.normals.length;i+=3){const n=part.normals.slice(i,i+3).map((v,k)=>v/s[k]),len=Math.hypot(...n);normals.push(...n.map(v=>v/len));}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(Array.from({length:positions.length/3},(_,i)=>i));const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({...part.material,...(part.recolor&&f.color?{color:f.color}:{})}));mesh.name=part.name;mesh.userData.furnishStablePart=part.identity;mesh.userData.furnishPartSource=part.identity;mesh.userData.ceilingOwnMaterial=true;mesh.castShadow=mesh.receiveShadow=true;(parents.get(part.role)||g).add(mesh);
 }
 g.userData.furnishAsset=A.id+'@'+A.version;return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishSofaBedModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
