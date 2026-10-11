/* Production model shared by the app, previews and geometry checks. Units: m. */
(function(root){
'use strict';
const specs={robot_p20max:[350,352,79.8],robot_p20max_tank:[450,450,450],robot_p20max_plumbed:[381,475,300]};
function build(THREE,f,RoundedBoxGeometry){
 const nominal=specs[f.type];if(!nominal)throw Error('Unknown robot vacuum model');
 const g=new THREE.Group(),white=new THREE.MeshStandardMaterial({color:f.color||'#f5f6f5',roughness:.24}),
 grey=new THREE.MeshStandardMaterial({color:'#cbd0d0',roughness:.42}),dark=new THREE.MeshStandardMaterial({color:'#20272b',roughness:.32}),
 lens=new THREE.MeshStandardMaterial({color:'#121b22',metalness:.3,roughness:.12});
 const add=(geo,mat,x,y,z)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const box=(w,h,d,mat,x,y,z,r=.006)=>add(new RoundedBoxGeometry(w,h,d,4,Math.min(r,w/2,h/2,d/2)*.99),mat,x,y+h/2,z);
 const disc=(rx,rz,h,mat,x,y,z)=>{const o=add(new THREE.CylinderGeometry(1,1,h,96),mat,x,y+h/2,z);o.scale.set(rx,1,rz);return o;};
 // Low-profile P20 Max: flush top sensor, bumper seam and front camera window.
 function robot(y,z){
  const bumper=(h,mat,base)=>{const o=disc(.175,.176,h,mat,0,base,z),a=o.geometry.attributes.position;
   for(let i=0;i<a.count;i++)if(a.getZ(i)*.176>.173)a.setZ(i,.173/.176);a.needsUpdate=true;o.geometry.computeVertexNormals();return o;};
  disc(.169,.170,.010,dark,0,y,z);
  bumper(.059,white,y+.010);
  bumper(.0015,grey,y+.0675);
  disc(.172,.173,.0108,white,0,y+.069,z);
  disc(.025,.024,.0008,grey,0,y+.079,z-.040);
  box(.029,.0006,.003,grey,0,y+.0792,z+.062,.001);
  box(.067,.032,.002,grey,0,y+.023,z+.174,.006);
  box(.054,.024,.001,lens,0,y+.027,z+.1752,.004);
  for(const x of [-.015,.015]){const o=disc(.004,.004,.001,grey,x,0,0);o.rotation.x=Math.PI/2;o.position.set(x,y+.039,z+.1755);}
  // Brush is tucked inside the supplied machine envelope; extension is unknown.
  for(const a of [-.7,0,.7]){const o=box(.030,.002,.004,grey,-.133,y+.005,z+.096,.001);o.rotation.y=a;}
 }
 if(f.type==='robot_p20max')robot(0,0);
 else{
  const tank=f.type==='robot_p20max_tank',w=nominal[0]/1000,d=nominal[1]/1000,h=nominal[2]/1000;
  const front=d/2,back=-d/2,opening=tank?.145:.130;
  // Tray, rear service body and real hollow entrance (no painted-on black hole).
  box(w,.012,d,white,0,0,0,.014);
  box(tank?w*.86:w,tank?opening-.014:h-.014,tank?.115:.105,white,0,.012,back+(tank?.115:.105)/2,tank?.025:.013);
  if(tank){
   // Continuous rounded hood and arched entrance, rather than separate posts.
   const outline=new THREE.Shape();outline.moveTo(-.220,.014);outline.lineTo(.220,.014);
   outline.quadraticCurveTo(.224,.23,.199,.365);outline.quadraticCurveTo(.186,.445,.116,.445);
   outline.lineTo(-.116,.445);outline.quadraticCurveTo(-.186,.445,-.199,.365);outline.quadraticCurveTo(-.224,.23,-.220,.014);
   const hole=new THREE.Path();hole.moveTo(-.185,.021);hole.lineTo(-.185,.082);hole.quadraticCurveTo(-.185,.143,-.130,.143);
   hole.lineTo(.130,.143);hole.quadraticCurveTo(.185,.143,.185,.082);hole.lineTo(.185,.021);hole.closePath();outline.holes.push(hole);
   const geo=new THREE.ExtrudeGeometry(outline,{depth:d-.010,bevelEnabled:true,bevelSize:.005,bevelThickness:.005,bevelSegments:4,steps:1,curveSegments:24});
   geo.computeBoundingBox();const b=geo.boundingBox,size=b.getSize(new THREE.Vector3());
   geo.translate(-(b.min.x+b.max.x)/2,-b.min.y,-b.min.z);geo.scale(w/size.x,(h-.012)/size.y,d/size.z);
   add(geo,white,0,.012,back);
   box(.250,.001,.270,white,0,h-.001,-.01,.020);
   box(.260,.001,.002,grey,0,h-.001,.126,.0004);
  }else{
   for(const s of [-1,1])box(.013,opening-.012,d-.025,white,s*(w-.013)/2,.012,.006,.006);
   box(w,h-opening,d,white,0,opening,0,.018);
   box(w*.91,.001,d*.72,white,0,h-.003,-d*.025,.009);
   box(w*.72,.001,.002,grey,0,h-.001,d*.26,.0004);
  }
  // Lid separation and small recessed front status bar.
  box(w*.87,.002,.001,grey,0,tank?.164:.139,front-.001,.0004);
  box(.041,.003,.001,grey,0,h*.78,front-.001,.0004);
  box(.090,.025,.004,dark,0,.085,back+.110,.003);
  for(const x of [-.034,.034])box(.012,.010,.006,grey,x,.029,back+.112,.002);
  for(const x of [-.091,.091])disc(.057,.057,.002,grey,x,.012,.015);
  for(const x of [-w*.31,w*.31])box(.004,.001,d*.35,grey,x,.012,front-d*.18,.001);
  robot(.014,tank?.028:.055);
 }
 // Size editing is a layout approximation; details scale with the envelope.
 g.scale.set(f.w/nominal[0],(f.h??nominal[2])/nominal[2],f.d/nominal[1]);
 const model=new THREE.Group();model.add(g);model.userData.model='Roborock P20 Max';return model;
}
const api={specs,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishRobotVacuumModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
