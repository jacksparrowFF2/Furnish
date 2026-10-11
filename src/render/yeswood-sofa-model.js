/* YESWOOD cherry / pear-white sofa. Shared production and preview geometry, metres. */
(function(root){
'use strict';
const type='sofa_yeswood_cherry',spec=[2160,892,895];
function build(THREE,f,RoundedBoxGeometry,materials={}){
 const g=new THREE.Group();
 const wood=materials.wood?materials.wood('#b77749'):new THREE.MeshStandardMaterial({color:'#b77749',roughness:.48});
 const cloth=materials.fabric?materials.fabric(f.color||'#eee9df'):new THREE.MeshStandardMaterial({color:f.color||'#eee9df',roughness:.94});
 // Small local procedural maps keep the viewer and application fully offline.
 function texture(size,pixel){const data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,v=pixel(x,y);data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
 cloth.bumpMap=texture(64,(x,y)=>Math.round(120+40*Math.sin(x*Math.PI/2)*Math.sin(y*Math.PI/2)+12*Math.sin(x*17+y*23)));cloth.bumpMap.repeat.set(35,22);cloth.bumpScale=.0006;
 wood.map=texture(128,(x,y)=>Math.round(223+12*Math.sin(y*.32+3*Math.sin(x*.032))+7*Math.sin(y*1.7+Math.sin(x*.085))));wood.map.colorSpace=THREE.SRGBColorSpace;
 const seam=new THREE.MeshStandardMaterial({color:f.color||'#eee9df',roughness:1});
 function add(geo,material,x,y,z){const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;}
 function block(w,h,d,material,x,y,z,r=.012){return add(new RoundedBoxGeometry(w,h,d,4,Math.min(r,w/2,h/2,d/2)*.99),material,x,y+h/2,z);}
 function cushion(w,h,d,x,y,z,angle=0){
  const geo=new RoundedBoxGeometry(w,h,d,7,Math.min(.065,h*.28,d*.28));
  // Broad soft bulges and restrained edge gathers; deterministic, no random state.
  const p=geo.attributes.position,n=geo.attributes.normal;
  for(let i=0;i<p.count;i++){
   const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),u=px/(w/2),v=py/(h/2),t=pz/(d/2);
   const edge=Math.pow(Math.abs(u),8),gather=.0018*edge*Math.sin(py*90+pz*42);
   const puff=.017*Math.max(0,1-u**4)*Math.max(0,1-v**4)*Math.abs(n.getZ(i))+.013*Math.max(0,1-u**4)*Math.max(0,1-t**4)*Math.abs(n.getY(i))+gather;
   p.setXYZ(i,px+n.getX(i)*puff,py+n.getY(i)*puff,pz+n.getZ(i)*puff);
  }
  geo.computeVertexNormals();const mesh=add(geo,cloth,x,y+h/2,z);mesh.rotation.x=angle;return mesh;
 }
 // Lower frame is open underneath; six feet including two middle supports.
 block(2.06,.075,.83,wood,0,.155,0,.016);
 block(2.07,.060,.060,wood,0,.205,.397,.012);
 block(2.04,.065,.045,wood,0,.205,-.420,.010);
 for(const side of [-1,1]){
  for(const z of [-.390,.390]){
   const foot=add(new THREE.CylinderGeometry(.026,.017,.48,16),wood,side*1.043,.240,z);
   foot.rotation.z=-side*.035;
  }
  // Two separate horizontal side boards and a visible gap match the product photo.
  block(.042,.145,.755,wood,side*1.038,.220,-.005,.015);
  block(.042,.190,.755,wood,side*1.038,.385,-.005,.025);
  cushion(.170,.405,.800,side*.937,.270,.006);
 }
 for(const x of [-.305,.305])add(new THREE.CylinderGeometry(.023,.019,.175,16),wood,x,.0875,.285);
 // Rear wood support is approximate: the supplied photos do not expose the back.
 block(2.04,.115,.042,wood,0,.520,-.425,.012);
 for(const x of [-.975,0,.975])block(.035,.430,.035,wood,x,.245,-.418,.009);
 for(const side of [-1,1]){
  cushion(.846,.190,.722,side*.432,.265,.046);
  const back=cushion(.846,.470,.180,side*.432,.430,-.302,-.125);
  // Fine perimeter piping on the visible cushion face, in its local coordinates.
  const path=new THREE.Shape(),hw=.846/2-.024,hh=.470/2-.024,r=.035;
  path.moveTo(-hw+r,-hh);path.lineTo(hw-r,-hh);path.quadraticCurveTo(hw,-hh,hw,-hh+r);
  path.lineTo(hw,hh-r);path.quadraticCurveTo(hw,hh,hw-r,hh);path.lineTo(-hw+r,hh);
  path.quadraticCurveTo(-hw,hh,-hw,hh-r);path.lineTo(-hw,-hh+r);path.quadraticCurveTo(-hw,-hh,-hw+r,-hh);
  const points=path.getPoints(64).map(p=>new THREE.Vector3(p.x,p.y,.087));
  const piping=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),80,.0013,5,true),seam);
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
