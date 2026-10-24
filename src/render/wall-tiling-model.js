/* Surface-only patterns: physical thickness remains owned by wall-finish-model. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

function uv(THREE,geometry,layout,[u0,bottom,u1,height]){
 const F=root.FurnishFloorFinish||require('../core/floor-finish-core.js'),out=[];
 for(const point of [[u0,bottom],[u1,bottom],[u1,height],[u0,bottom],[u1,height],[u0,height]]){const q=F.transform(layout,point,true);out.push(q[0]/(layout.width+layout.gap),q[1]/(layout.height+layout.gap));}
 const current=geometry.getAttribute('uv');if(current?.array.length===out.length){current.array.set(out);current.needsUpdate=true;}else geometry.setAttribute('uv',new THREE.Float32BufferAttribute(out,2));return geometry;
}
function build(THREE,plan,{wx=v=>v/1000,wz=v=>v/1000,top=Infinity}={}){
 const group=new THREE.Group(),T=root.FurnishWallTiling||require('../core/wall-tiling-core.js'),materials=new Map(),owners=new Set();
 const sources=plan.wallTiling?.surfaces||[],entries=sources.flatMap(e=>[...T.patterns(e),...(e.bandJoints||[]).map(j=>({...e,sections:j.sections,bandJoint:true,partId:j.partId}))]);
 for(const e of syncIdentity.records("wall-tiling-model.js:generator-1",entries)){
  if(!Number.isFinite(e.originZ)||!Number.isFinite(e.position)||!Number.isFinite(e.floorZ))continue;
  const layout=T.grid(e),groutColor=(root.FurnishTileGrout||require('../core/tile-grout-core.js')).color(plan,e.face.roomId,'wall',e.face),key=JSON.stringify([e.face.roomId,layout.width,layout.height,layout.gap,groutColor,!!e.bandJoint]);
  for(const rect of syncIdentity.records("wall-tiling-model.js:generator-2",e.sections)){
   const [u0,bottom,u1,uncutTop]=rect,height=Math.min(top,uncutTop);if(height<=bottom)continue;
   if(!materials.has(key)){const M=root.FurnishFloorFinishModel||require('./floor-finish-model.js'),material=e.bandJoint?M.groutMaterial(THREE,{groutColor}):typeof document==='undefined'?new THREE.MeshStandardMaterial({color:'#e8e2d8'}):M.material(THREE,layout,{groutColor});material.polygonOffset=true;material.polygonOffsetFactor=-2;material.polygonOffsetUnits=-2;materials.set(key,material);}
   const local=[[u0,bottom],[u1,bottom],[u1,height],[u0,bottom],[u1,height],[u0,height]],positions=[];
   for(const [u,z] of local){const point=[0,0];point[e.axis]=e.zero+e.dir*u;point[e.normal]=e.position+e.face.side*.2;positions.push(wx(point[0]),z/1000,wz(point[1]));}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));uv(THREE,geometry,layout,[u0,bottom,u1,height]);geometry.computeVertexNormals();
   const material=materials.get(key),mesh=syncIdentity.produce("wall-tiling-model:site-1",()=>new THREE.Mesh(geometry,material));mesh.receiveShadow=true;if(!owners.has(material)){mesh.userData.wallTilingOwnMaterial=true;owners.add(material);}mesh.userData.wallTiling={...e.face,rect:[u0,bottom,u1,height],originZ:e.originZ,position:e.position,...(e.band?{band:e.band.id}:{}),...(e.bandJoint?{bandJoint:true}:{})};group.add(mesh);
  }
 }
 return group;
}
const api={build,uv};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWallTilingModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
