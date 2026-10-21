/* Snapshot production geometry, without serializing live userData or modifying the scene. */
(function(root){
'use strict';
function snapshot(T,{groups,camera,sun,material=o=>o.material,includeCeilings=false,meta={}}){
 const scene=new T.Scene();scene.name='Furnish';scene.userData={furnish:{version:1,unit:'m',...meta}};
 const materials=new Map();let meshCount=0;
 function clean(m){if(materials.has(m))return materials.get(m);const c=m.clone();c.userData={};c.clippingPlanes=null;c.envMap=null;c.onBeforeCompile=()=>{};materials.set(m,c);return c;}
 function visit(o,owner='',shown=true){
  shown=shown&&o.visible;if(!shown||o.isCSS2DObject||o.isLine||o.isPoints||o.isHelper||o.userData.modelError||o.userData.wallOriginMarker)return;
  owner=o.userData.fid||owner;
  const key=o.userData.layerObject||'';
  if(!includeCeilings&&(key.startsWith('roomCeiling:')||o.userData.ceiling))return;
  if(o.isMesh&&!o.material?.wireframe){
   const m=material(o),geometry=o.geometry.clone(),mats=Array.isArray(m)?m.map(clean):clean(m),mesh=o.isInstancedMesh?new T.InstancedMesh(geometry,mats,o.count):new T.Mesh(geometry,mats);
   if(o.isInstancedMesh){mesh.instanceMatrix=o.instanceMatrix.clone();if(o.instanceColor)mesh.instanceColor=o.instanceColor.clone();}
   mesh.name=(owner?'Furniture_'+owner:'Architecture')+'_'+(++meshCount);mesh.matrix.copy(o.matrixWorld);mesh.matrixAutoUpdate=false;
   mesh.userData={...(owner?{furnishId:owner}:{}),...(key?{layerObject:key}:{})};scene.add(mesh);
  }else if(o.isPointLight&&o.intensity>0){const light=new T.PointLight(o.color,o.intensity,o.distance,2);light.position.setFromMatrixPosition(o.matrixWorld);light.name='FurnishLamp';scene.add(light);}
  for(const child of o.children)visit(child,owner,shown);
 }
 for(const group of groups){group.updateWorldMatrix(true,true);visit(group);}
 if(!meshCount)throw Error('没有可导出的实体 / No visible meshes');
 camera.updateWorldMatrix(true,false);const cam=camera.clone();cam.clear();cam.name='FurnishCamera';cam.userData={};cam.matrix.copy(camera.matrixWorld);cam.matrixAutoUpdate=false;scene.add(cam);
 if(sun){sun.updateWorldMatrix(true,false);sun.target.updateWorldMatrix(true,false);const light=new T.DirectionalLight(sun.color,sun.intensity);light.name='FurnishSun';light.position.setFromMatrixPosition(sun.matrixWorld);light.lookAt(new T.Vector3().setFromMatrixPosition(sun.target.matrixWorld));light.target.position.set(0,0,-1);light.add(light.target);scene.add(light);}
 return {scene,meshCount,aspect:cam.aspect,dispose(){scene.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const m of materials.values())m.dispose();}};
}
async function encode(T,input){const copy=snapshot(T,input);try{const Exporter=root.FurnishGLTFExporter(T),buffer=await new Exporter().parseAsync(copy.scene,{binary:true,onlyVisible:true,maxTextureSize:2048});return {buffer,meshCount:copy.meshCount,aspect:copy.aspect};}finally{copy.dispose();}}
function dimensions(aspect,quality){const edge=quality==='final'?1920:960;if(!Number.isFinite(aspect)||aspect<=0)throw Error('相机比例无效 / Invalid camera aspect');const size=aspect>=1?{width:edge,height:Math.round(edge/aspect)}:{width:Math.round(edge*aspect),height:edge};if(Math.min(size.width,size.height)<64)throw Error('请调整窗口，当前相机比例过于狭长 / Resize the window: camera aspect is too narrow');return size;}
const api={snapshot,encode,dimensions};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishBlenderExport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
