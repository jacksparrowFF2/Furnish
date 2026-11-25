/* YESWOOD cherry / pear-white sofa. Shared production and preview geometry, metres. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const type='sofa_yeswood_cherry',spec=[2160,892,895];
const corduroyColor='#53634b',corduroyTileMetres=.036;
const modelTextures=new WeakMap();
function textures(THREE){
 if(modelTextures.has(THREE))return modelTextures.get(THREE);
 function texture(size,pixel){
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)data.set([...pixel(x,y),255],(y*size+x)*4);
  const map=new THREE.DataTexture(data,size,size);
  map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.magFilter=THREE.LinearFilter;
  map.minFilter=THREE.LinearMipmapLinearFilter;
  map.generateMipmaps=true;map.needsUpdate=true;
  return map;
 }
 function gray(v){return [v,v,v];}
 const weave=texture(64,(x,y)=>gray(Math.round(120+40*Math.sin(x*Math.PI/2)*Math.sin(y*Math.PI/2)+12*Math.sin(x*17+y*23))));
 weave.repeat.set(35,22);
 const grain=texture(128,(x,y)=>gray(Math.round(223+12*Math.sin(y*.32+3*Math.sin(x*.032))+7*Math.sin(y*1.7+Math.sin(x*.085)))));
 grain.colorSpace=THREE.SRGBColorSpace;
 // Six rounded wales per tile. A small periodic waviness breaks perfectly straight ridges.
 const ribPhase=(x,y)=>2*Math.PI*(6*(x+.5)/64+.055*Math.sin(2*Math.PI*y/64));
 const ribs=texture(64,(x,y)=>{
  const phase=ribPhase(x,y);
  const slope=(.78+.18*Math.cos(phase))*Math.sin(phase);
  const length=Math.hypot(1,slope);
  return [Math.round(127.5*(1+slope/length)),128,Math.round(127.5*(1+1/length))];
 });
 // The pile also changes diffuse reflectance, so the ribs read in shade.
 const pile=texture(64,(x,y)=>gray(Math.round(228+22*Math.cos(ribPhase(x,y))+3*Math.cos(2*Math.PI*y/64)+2*Math.sin(2*Math.PI*(x+3*y)/64))));
 pile.colorSpace=THREE.SRGBColorSpace;
 const maps={weave,grain,ribs,pile};
 modelTextures.set(THREE,maps);
 return maps;
}

function smoothCushionNormals(THREE,geometry){
 // RoundedBox is non-indexed with separate UVs on each panel. Accumulate the
 // deformed face normals across coincident vertices without welding UV seams.
 const position=geometry.attributes.position,normal=geometry.attributes.normal;
 const byPoint=new Map(),normals=[];
 for(let i=0;i<position.count;i++){
  const key=[position.getX(i),position.getY(i),position.getZ(i)].map(v=>Math.round(v*1e7)).join(',');
  let sum=byPoint.get(key);
  if(!sum){sum=new THREE.Vector3();byPoint.set(key,sum);}
  normals.push(sum);
 }
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<position.count;i+=3){
  a.fromBufferAttribute(position,i);
  b.fromBufferAttribute(position,i+1).sub(a);
  c.fromBufferAttribute(position,i+2).sub(a);
  b.cross(c).normalize();
  normals[i].add(b);normals[i+1].add(b);normals[i+2].add(b);
 }
 for(const sum of byPoint.values())sum.normalize();
 for(let i=0;i<position.count;i++){
  const sum=normals[i];
  if(sum.lengthSq()>0)normal.setXYZ(i,sum.x,sum.y,sum.z);
 }
}
function build(THREE,f,RoundedBoxGeometry,materials={}){
 const g=new THREE.Group();
 const color=f.color||'#eee9df',corduroy=typeof color==='string'&&color.toLowerCase()===corduroyColor;
 const maps=textures(THREE);
 const wood=materials.wood?materials.wood('#b77749').clone():new THREE.MeshStandardMaterial({color:'#b77749',roughness:.48});
 wood.map=maps.grain;
 let cloth;
 if(corduroy){
  // Calibrate the saved green swatch against the fabric photo in linear
  // light. The stored selection still identifies the same upholstery.
  const pileColor=new THREE.Color(color).lerp(new THREE.Color('#a0a792'),.24);
  cloth=new THREE.MeshPhysicalMaterial({color:pileColor,map:maps.pile,roughness:.91,normalMap:maps.ribs,normalScale:new THREE.Vector2(.6,.6),
   sheen:.52,sheenColor:'#919982',sheenRoughness:.72});
 }else{
  cloth=materials.fabric?materials.fabric(color).clone():new THREE.MeshStandardMaterial({color,roughness:.94});
  cloth.bumpMap=maps.weave;cloth.bumpScale=.0006;
 }
 const seam=new THREE.MeshStandardMaterial({color:f.color||'#eee9df',roughness:1});
 function add(geo,material,x,y,z){const mesh=syncIdentity.produce("yeswood-sofa-model:site-1",()=>new THREE.Mesh(geo,material));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;}
 function block(w,h,d,material,x,y,z,r=.012){return syncIdentity.produce("yeswood-sofa-model:site-2",()=>add(new RoundedBoxGeometry(w,h,d,4,Math.min(r,w/2,h/2,d/2)*.99),material,x,y+h/2,z));}
 function cushion(w,h,d,x,y,z,angle=0,role='arm'){
  // Broader curved shoulders keep the visible valleys between separate cushions.
  const radius=role==='back'?Math.min(.061,d*.34):role==='seat'?Math.min(.058,h*.31):Math.min(.065,h*.28,d*.28);
  const geo=new RoundedBoxGeometry(w,h,d,7,radius);
  // Broad soft bulges and restrained edge gathers; deterministic, no random state.
  const p=geo.attributes.position,n=geo.attributes.normal;
  for(let i=0;i<p.count;i++){
   const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),u=px/(w/2),v=py/(h/2),t=pz/(d/2);
   const edge=Math.pow(Math.abs(u),8),gather=.0018*edge*Math.sin(py*90+pz*42);
   const puff=.017*Math.max(0,1-u**4)*Math.max(0,1-v**4)*Math.abs(n.getZ(i))+.013*Math.max(0,1-u**4)*Math.max(0,1-t**4)*Math.abs(n.getY(i))+gather;
   p.setXYZ(i,px+n.getX(i)*puff,py+n.getY(i)*puff,pz+n.getZ(i)*puff);
  }
  if(corduroy&&geo.attributes.uv){
   smoothCushionNormals(THREE,geo);
   const uv=geo.attributes.uv,faceSize=uv.count/6;
   for(let i=0;i<uv.count;i++){
    const face=Math.floor(i/faceSize);
    uv.setXY(i,uv.getX(i)*(face<2?d:w)/corduroyTileMetres,uv.getY(i)*(face===2||face===3?d:h)/corduroyTileMetres);
   }
  }else geo.computeVertexNormals();
  const mesh=syncIdentity.produce("yeswood-sofa-model:site-3",()=>add(geo,cloth,x,y+h/2,z));
  mesh.rotation.x=angle;
  mesh.userData.yeswoodUpholstery=role;
  return mesh;
 }
 // Lower frame is open underneath; six feet including two middle supports.
 syncIdentity.produce("yeswood-sofa-model.js:generator-call-1",()=>block(2.06,.075,.83,wood,0,.155,0,.016));
 syncIdentity.produce("yeswood-sofa-model.js:generator-call-2",()=>block(2.07,.060,.060,wood,0,.205,.397,.012));
 syncIdentity.produce("yeswood-sofa-model.js:generator-call-3",()=>block(2.04,.065,.045,wood,0,.205,-.420,.010));
 for(const side of syncIdentity.items("yeswood-sofa-model.js:generator-1",[["item-a",-1],["item-b",1]])){
  for(const z of syncIdentity.items("yeswood-sofa-model.js:generator-2",[["item-a",-.390],["item-b",.390]])){
   const foot=syncIdentity.produce("yeswood-sofa-model:site-4",()=>add(new THREE.CylinderGeometry(.026,.017,.48,16),wood,side*1.043,.240,z));
   foot.rotation.z=-side*.035;
  }
  // Two separate horizontal side boards and a visible gap match the product photo.
  syncIdentity.produce("yeswood-sofa-model.js:generator-call-4",()=>block(.042,.145,.755,wood,side*1.038,.220,-.005,.015));
  syncIdentity.produce("yeswood-sofa-model.js:generator-call-5",()=>block(.042,.190,.755,wood,side*1.038,.385,-.005,.025));
  syncIdentity.produce("yeswood-sofa-model.js:generator-call-6",()=>cushion(.170,.405,.800,side*.937,.270,.006));
 }
 for(const x of syncIdentity.items("yeswood-sofa-model.js:generator-3",[["item-a",-.305],["item-b",.305]]))syncIdentity.produce("yeswood-sofa-model:site-5",()=>add(new THREE.CylinderGeometry(.023,.019,.175,16),wood,x,.0875,.285));
 // Rear wood support is approximate: the supplied photos do not expose the back.
 syncIdentity.produce("yeswood-sofa-model.js:generator-call-7",()=>block(2.04,.115,.042,wood,0,.520,-.425,.012));
 for(const x of syncIdentity.items("yeswood-sofa-model.js:generator-4",[["item-a",-.975],["item-b",0],["item-c",.975]]))syncIdentity.produce("yeswood-sofa-model.js:generator-call-8",()=>block(.035,.430,.035,wood,x,.245,-.418,.009));
 for(const side of syncIdentity.items("yeswood-sofa-model.js:generator-5",[["item-a",-1],["item-b",1]])){
  syncIdentity.produce("yeswood-sofa-model.js:generator-call-9",()=>cushion(.846,.190,.722,side*.432,.265,.046,0,'seat'));
  const back=syncIdentity.produce("yeswood-sofa-model.js:generator-call-10",()=>cushion(.846,.470,.180,side*.432,.430,-.302,-.125,'back'));
  // Fine perimeter piping on the visible cushion face, in its local coordinates.
  const path=new THREE.Shape(),hw=.846/2-.024,hh=.470/2-.024,r=.035;
  path.moveTo(-hw+r,-hh);path.lineTo(hw-r,-hh);path.quadraticCurveTo(hw,-hh,hw,-hh+r);
  path.lineTo(hw,hh-r);path.quadraticCurveTo(hw,hh,hw-r,hh);path.lineTo(-hw+r,hh);
  path.quadraticCurveTo(-hw,hh,-hw,hh-r);path.lineTo(-hw,-hh+r);path.quadraticCurveTo(-hw,-hh,-hw+r,-hh);
  const points=path.getPoints(64).map(p=>new THREE.Vector3(p.x,p.y,.087));
  const piping=syncIdentity.produce("yeswood-sofa-model:site-6",()=>new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),80,.0013,5,true),seam));
  piping.castShadow=true;back.add(piping);
 }
 // Fit the whole exterior, including feet and upholstery, to the stated envelope.
 g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(g),size=bounds.getSize(new THREE.Vector3());
 const offset=new THREE.Vector3(-(bounds.min.x+bounds.max.x)/2,-bounds.min.y,-(bounds.min.z+bounds.max.z)/2);
 for(const child of g.children)child.position.add(offset);
 g.scale.set((f.w??spec[0])/1000/size.x,(f.h??spec[2])/1000/size.y,(f.d??spec[1])/1000/size.z);
 return g;
}
const api={type,spec,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishYeswoodSofaModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
