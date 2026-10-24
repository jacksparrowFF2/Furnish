/* Snapshot production geometry, without serializing live userData or modifying the scene. */
(function(root){
'use strict';
function snapshot(T,{groups,camera,sun,material=o=>o.material,includeCeilings=false,expandInstances=false,includeHidden=false,meta={}}){
 const scene=new T.Scene();scene.name='Furnish';scene.userData={furnish:{version:1,syncSchema:1,partIdentity:3,unit:'m',...meta}};
 const materials=new Map(),counts=new Map(),geometries=new Set(),semantic=new Map(),explicit=new Map(),explicitFamilies=new Map(),named=new Map();let meshCount=0,legacyCount=0;
 function dispose(){for(const geometry of geometries)geometry.dispose();for(const m of materials.values())m.dispose();}
 function clean(m){if(materials.has(m))return materials.get(m);const c=m.clone();c.userData={};c.clippingPlanes=null;c.envMap=null;c.onBeforeCompile=()=>{};materials.set(m,c);return c;}
 // Blender/glTF instance transforms decompose into translation/rotation/scale.
 // Bake only the residual shear into a private geometry, keeping the mirrored
 // TRS on the object so rotated parts under nonuniform parents stay exact.
 function shearTRS(matrix){
  const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();matrix.decompose(p,q,s);
  const trs=new T.Matrix4().compose(p,q.normalize(),s);
  return Math.abs(trs.determinant())>1e-12&&matrix.elements.some((v,i)=>Math.abs(v-trs.elements[i])>1e-7)?trs:null;
 }
 const partFields=new Set(['cabinetSection','cabinetSide','cabinetShelf','cabinetDivider','cabinetBay','cabinetDrawerBoard','kitchenModule','kitchenSlab','kitchenCornerBoard','kitchenCornerIndex','laundrySidePanel']);
 const identityValue=v=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,identityValue(v[k])])):v;
 function visit(o,owner='',shown=true,part='',layer='',ownerNode=null,roles=[],sources=[]){
  shown=shown&&o.visible;if(!shown&&!includeHidden||o.isCSS2DObject||o.isLine||o.isPoints||o.isHelper||o.userData.modelError||o.userData.wallOriginMarker)return;
  if(o.userData.fid&&o.userData.fid!==owner){owner=o.userData.fid;part='';ownerNode=o;roles=[];sources=[];}
  const architectureRoles={};for(const [field,keys] of Object.entries({wallTiling:['wallId','index','side','roomId','band','bandJoint'],wallFinish:['wallId','index','layer'],floorLayer:['roomId','layer'],ceiling:['id','part']})){if(o.userData[field])architectureRoles[field]=Object.fromEntries(keys.filter(k=>o.userData[field][k]!==undefined).map(k=>[k,o.userData[field][k]]));}
  const role=Object.entries({...o.userData,...architectureRoles}).filter(([k,v])=>v!==null&&(/Part$|Accessory$|Hinge$/.test(k)||k==='furnishPartKey'||partFields.has(k)||Object.hasOwn(architectureRoles,k))&&['string','number','boolean','object'].includes(typeof v)).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+':'+(typeof v==='object'?JSON.stringify(identityValue(v)):v)).join('|');
  if(role&&roles.at(-1)!==role)roles=[...roles,role];
  if(o.userData.furnishPartSource&&sources.at(-1)!==o.userData.furnishPartSource)sources=[...sources,o.userData.furnishPartSource];
  const key=o.userData.layerObject||layer;
  if(!includeCeilings&&(key.startsWith('roomCeiling:')||o.userData.ceiling)){if(!includeHidden)return;shown=false;}
  if(o.isMesh&&!o.material?.wireframe){
   const m=material(o),geometry=o.geometry.clone(),mats=Array.isArray(m)?m.map(clean):clean(m),prefix=owner?'furniture:'+owner+':'+part:'architecture:'+key;geometries.add(geometry);
   const ordinal=counts.get(prefix)||0;counts.set(prefix,ordinal+1);const id=owner?prefix:prefix+':'+ordinal;
   const kind=String(o.userData.cherryCoffeePart||o.userData.partKind||o.geometry.type||'Mesh');
   const legacyName=(owner?'Furniture_'+owner:'Architecture')+'_'+(++legacyCount);
   const add=(mesh,matrix,suffix='')=>{const trs=!mesh.isInstancedMesh&&shearTRS(matrix);if(trs){mesh.geometry=geometry.clone().applyMatrix4(trs.clone().invert().multiply(matrix));geometries.add(mesh.geometry);}meshCount++;mesh.name=legacyName+suffix.replace('/instance:','_instance_');mesh.matrix.copy(trs||matrix);mesh.matrixAutoUpdate=false;mesh.userData={furnishObjectId:id+suffix,furnishPartKind:kind,furnishLegacyName:legacyName,furnishVisible:shown,...(owner?{furnishId:owner}:{}),...(key?{layerObject:key}:{})};scene.add(mesh);if(o.userData.furnishPartToken&&!o.userData.furnishStablePart){const instance= suffix?'/instance:'+String(o.userData.furnishInstanceKeys?.[Number(suffix.split(':').at(-1))]??Number(suffix.split(':').at(-1))):'';named.set(mesh,{token:o.userData.furnishPartToken,instance});}
    const scope=owner?'furniture:'+owner:'architecture:'+key,local=ownerNode?new T.Matrix4().multiplyMatrices(ownerNode.matrixWorld.clone().invert(),matrix):matrix,source=sources.join('/');
    if(o.userData.furnishStablePart){const label='explicit:'+o.userData.furnishStablePart+suffix,k=scope+'|'+label;if(explicit.has(k))throw Error('重复生产部件标识 / Duplicate production part: '+k);mesh.userData.furnishPartKey=label;mesh.userData.furnishPartCount=1;mesh.userData.furnishPartVersion=2;explicit.set(k,mesh);const family=scope+'|'+(o.userData.furnishPartFamily||label),list=explicitFamilies.get(family)||[];list.push(mesh);explicitFamilies.set(family,list);}
    else if(roles.length||source){const label=source?'source:'+source+'|'+roles.join('/'):roles.join('/'),group=semantic.get(scope+'|'+label)||[];group.push({mesh,label,scope,source,anchor:local.elements.slice(12,15),created:[o.userData.furnishPartOrdinal??o.id,Number(suffix.split(':').at(-1))||0,0]});semantic.set(scope+'|'+label,group);}};
   let expand=expandInstances;
   if(o.isInstancedMesh&&!expand){for(let i=0;i<o.count;i++){const transform=new T.Matrix4();o.getMatrixAt(i,transform);if(shearTRS(new T.Matrix4().multiplyMatrices(o.matrixWorld,transform))){expand=true;break;}}}
   if(o.isInstancedMesh&&expand){
    for(let i=0;i<o.count;i++){const transform=new T.Matrix4();o.getMatrixAt(i,transform);let instanceMats=mats;
     if(o.instanceColor){const color=new T.Color();o.getColorAt(i,color);const tint=c=>{const n=c.clone();n.color.multiply(color);materials.set(n,n);return n;};instanceMats=Array.isArray(mats)?mats.map(tint):tint(mats);}
     add(new T.Mesh(geometry,instanceMats),new T.Matrix4().multiplyMatrices(o.matrixWorld,transform),'/instance:'+i);
    }
   }else{const mesh=o.isInstancedMesh?new T.InstancedMesh(geometry,mats,o.count):new T.Mesh(geometry,mats);if(o.isInstancedMesh){mesh.instanceMatrix=o.instanceMatrix.clone();if(o.instanceColor)mesh.instanceColor=o.instanceColor.clone();}add(mesh,o.matrixWorld);}
  }else if(o.isPointLight&&o.intensity>0){const light=new T.PointLight(o.color,o.intensity,o.distance,2);light.position.setFromMatrixPosition(o.matrixWorld);light.name='FurnishLamp';scene.add(light);}
  o.children.forEach((child,i)=>visit(child,owner,shown,part+'/'+i,key,ownerNode,roles,sources));
 }
 try{
 for(const group of groups){group.updateWorldMatrix(true,true);visit(group);}
 function ranked(entries,label,anchor,strict){
  entries.sort((a,b)=>a[anchor][0]-b[anchor][0]||a[anchor][1]-b[anchor][1]||a[anchor][2]-b[anchor][2]);
  for(let i=0;i<entries.length;i++){const e=entries[i],same=entries.some((v,j)=>i!==j&&v[anchor].every((x,k)=>Math.abs(x-e[anchor][k])<1e-7));if(same){if(strict)throw Error('生产部件需要明确编号 / Explicit part key required: '+e.scope+'|'+label);e.mesh.userData.furnishPartAmbiguous=true;}else{e.mesh.userData.furnishPartKey=label+'#'+i;e.mesh.userData.furnishPartCount=entries.length;e.mesh.userData.furnishPartVersion=2;}}
 }
 // Compute frozen v2 aliases for one-time guarded adoption. Production v3 keys
 // below use authored scopes/items, never this legacy creation-order rank.
 for(const entries of explicitFamilies.values())for(const mesh of entries)mesh.userData.furnishPartCount=entries.length;
 for(const entries of semantic.values())ranked(entries,entries[0].label,entries[0].source?'created':'anchor',entries.every(e=>e.source));
 for(const mesh of scene.children.filter(o=>o.isMesh)){const next=named.get(mesh);if(next){mesh.userData.furnishPreviousPartKey=mesh.userData.furnishPartKey;mesh.userData.furnishPreviousPartCount=mesh.userData.furnishPartCount;mesh.userData.furnishPartKey="named:"+next.token+next.instance;mesh.userData.furnishPartVersion=3;}else if(mesh.userData.furnishPartKey?.startsWith('explicit:'))mesh.userData.furnishPartVersion=3;}
 const namedKeys=new Set();for(const mesh of scene.children.filter(o=>o.isMesh&&o.userData.furnishPartVersion===3)){const e=mesh.userData,k=JSON.stringify([e.furnishId||e.layerObject||'',e.furnishPartKey]);if(namedKeys.has(k))throw Error('重复具名生产部件 / Duplicate named production part: '+k);namedKeys.add(k);}
 if(!meshCount)throw Error('没有可导出的实体 / No visible meshes');
 camera.updateWorldMatrix(true,false);const cam=camera.clone();cam.clear();cam.name='FurnishCamera';cam.userData={};cam.matrix.copy(camera.matrixWorld);cam.matrixAutoUpdate=false;scene.add(cam);
 if(sun){sun.updateWorldMatrix(true,false);sun.target.updateWorldMatrix(true,false);const light=new T.DirectionalLight(sun.color,sun.intensity);light.name='FurnishSun';light.position.setFromMatrixPosition(sun.matrixWorld);light.lookAt(new T.Vector3().setFromMatrixPosition(sun.target.matrixWorld));light.target.position.set(0,0,-1);light.add(light.target);scene.add(light);}
 return {scene,meshCount,aspect:cam.aspect,dispose};
 }catch(error){dispose();throw error;}
}
async function encode(T,input){const copy=snapshot(T,input);try{const Exporter=root.FurnishGLTFExporter(T),buffer=await new Exporter().parseAsync(copy.scene,{binary:true,onlyVisible:true,maxTextureSize:2048});return {buffer,meshCount:copy.meshCount,aspect:copy.aspect};}finally{copy.dispose();}}
function dimensions(aspect,quality){const edge=quality==='final'?1920:960;if(!Number.isFinite(aspect)||aspect<=0)throw Error('相机比例无效 / Invalid camera aspect');const size=aspect>=1?{width:edge,height:Math.round(edge/aspect)}:{width:Math.round(edge*aspect),height:edge};if(Math.min(size.width,size.height)<64)throw Error('请调整窗口，当前相机比例过于狭长 / Resize the window: camera aspect is too narrow');return size;}
const api={snapshot,encode,dimensions};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishBlenderExport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
