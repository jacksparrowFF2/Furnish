/* Imported rigid parts under independent hinges/slides; numeric and real Three share geometry. */
(function(root){
'use strict';
function build(T,f,options={}){
 const P=root.FurnishProducts||require('../core/product-rules.js'),C=root.FurnishFridge||require('../core/fridge-core.js'),asset=root.FurnishFridgeBlenderAsset||require('../data/fridge-blender-asset.js'),r=P.definition(f).fridgeMotion,scale=[f.w/r.size[0],P.height(f)/r.size[1],f.d/r.size[2]],group=new T.Group(),pivots=new Map();
 for(const m of C.motions(f)){const pivot=new T.Group();pivot.position.set(...m.pivot.map(v=>v/1000));if(m.axis==='y')pivot.rotation.y=m.angle;else pivot.position.z+=m.travel/1000;pivot.name='motion:'+m.role;pivot.userData.fridgeRole=m.role;pivot.userData.fridgeMotion={axis:m.axis,pivot:m.pivot,angle:m.angle,travel:m.travel};group.add(pivot);pivots.set(m.role,{pivot,m});}
 for(const part of asset.parts){const frame=pivots.get(part.role),origin=frame?.m.pivot||[0,0,0],positions=part.positions.map((v,i)=>v*scale[i%3]-origin[i%3]/1000),normals=[];
  for(let i=0;i<part.normals.length;i+=3){const n=part.normals.slice(i,i+3).map((v,k)=>v/scale[k]),length=Math.hypot(...n);normals.push(...n.map(v=>v/length));}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(Array.from({length:positions.length/3},(_,i)=>i));
  const props={...part.material,...(part.recolor?{color:f.color||'#f1f0ed'}:{})},material=options.mat?options.mat(props.color,props):new T.MeshStandardMaterial(props),mesh=new T.Mesh(geometry,material);mesh.name=part.name;mesh.userData.furnishStablePart=part.identity;mesh.userData.furnishPartSource=part.identity;mesh.castShadow=mesh.receiveShadow=true;(frame?.pivot||group).add(mesh);
 }
 group.userData.furnishAsset=asset.id+'@'+asset.version;return group;
}
const api={build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFridgeModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
