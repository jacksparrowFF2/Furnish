/* Production model shared by the app, previews and geometry checks. Units: m. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const specs={robot_p20max:[350,352,79.8],robot_p20max_tank:[450,450,450],robot_p20max_plumbed:[381,475,300]};
function build(THREE,f,RoundedBoxGeometry){
 const nominal=specs[f.type];if(!nominal)throw Error('Unknown robot vacuum model');
 const g=new THREE.Group(),white=new THREE.MeshStandardMaterial({color:f.color||'#f5f6f5',roughness:.24}),
 grey=new THREE.MeshStandardMaterial({color:'#cbd0d0',roughness:.42}),dark=new THREE.MeshStandardMaterial({color:'#20272b',roughness:.32}),
 lens=new THREE.MeshStandardMaterial({color:'#121b22',metalness:.3,roughness:.12});
 const add=(geo,mat,x,y,z)=>{const o=syncIdentity.produce("robot-vacuum-model:site-1",()=>new THREE.Mesh(geo,mat));o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const box=(w,h,d,mat,x,y,z,r=.006)=>syncIdentity.produce("robot-vacuum-model:site-2",()=>add(new RoundedBoxGeometry(w,h,d,4,Math.min(r,w/2,h/2,d/2)*.99),mat,x,y+h/2,z));
 const disc=(rx,rz,h,mat,x,y,z)=>{const o=syncIdentity.produce("robot-vacuum-model:site-3",()=>add(new THREE.CylinderGeometry(1,1,h,96),mat,x,y+h/2,z));o.scale.set(rx,1,rz);return o;};
 // Rounded rectangle rings, lofted vertically: both front and sides are curved.
 const sp=(v,p=.5)=>Math.sign(v)*Math.pow(Math.abs(v),p);
 function loft(profile,material,offset=-.010,exponent=.5,sampledRows){
  const curve=new THREE.CatmullRomCurve3(profile.map(([y,rx,rz])=>new THREE.Vector3(rx,y,rz)),false,'centripetal'),rows=sampledRows||curve.getPoints(100),n=sampledRows?256:128,pos=[],index=[];
  for(const row of rows)for(let j=0;j<n;j++){const a=j/n*Math.PI*2;pos.push(row.x*sp(Math.cos(a),exponent),row.y,offset+row.z*sp(Math.sin(a),exponent));}
  for(let i=0;i<rows.length-1;i++)for(let j=0;j<n;j++){const a=i*n+j,b=(i+1)*n+j,an=i*n+(j+1)%n,bn=(i+1)*n+(j+1)%n;index.push(a,b,an,b,bn,an);}
  for(const [row,top] of [[0,false],[rows.length-1,true]]){const center=pos.length/3;pos.push(0,rows[row].y,offset);for(let j=0;j<n;j++){const a=row*n+j,b=row*n+(j+1)%n;index.push(center,top?b:a,top?a:b);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(index);
  geo.computeBoundingBox();const b=geo.boundingBox,size=b.getSize(new THREE.Vector3()),minY=Math.min(...profile.map(r=>r[0])),maxY=Math.max(...profile.map(r=>r[0]));
  const sx=2*Math.max(...profile.map(r=>r[1]))/size.x,sz=2*Math.max(...profile.map(r=>r[2]))/size.z,sy=(maxY-minY)/size.y;
  if(!sampledRows){const originalMinY=b.min.y;geo.translate(0,-originalMinY,-offset);geo.scale(sx,sy,sz);geo.translate(0,minY,offset);
   rows.forEach(r=>{r.x*=sx;r.z*=sz;r.y=(r.y-originalMinY)*sy+minY;});}geo.computeVertexNormals();
  const o=syncIdentity.produce("robot-vacuum-model:site-4",()=>add(geo,material,0,0,0));o.userData.surfaceRows=rows;return o;
 }
 function tankDock(){
  const base=new THREE.MeshStandardMaterial({color:'#9ca7ad',roughness:.48}),trim=new THREE.MeshStandardMaterial({color:'#69757d',roughness:.48});
  const shell=new THREE.MeshPhysicalMaterial({color:f.color||'#f5f6f5',roughness:.19,clearcoat:.65,clearcoatRoughness:.22});
  // One continuous silhouette for both colours: shared radii AND tangents at the join.
  const join=.153,profile=[[.016,.215,.212],[.070,.219,.214],[join,.222,.216],[.228,.224,.219],[.305,.221,.217],[.363,.211,.204],[.390,.198,.192],[.402,.191,.184]];
  // Natural cubic spline keeps curvature continuous at every former profile knot.
  const second={};
  for(const axis of [1,2]){
   const size=profile.length,lo=[],diag=[],hi=[],rhs=[];
   diag[0]=diag[size-1]=1;hi[0]=lo[size-1]=rhs[0]=rhs[size-1]=0;
   for(let i=1;i<size-1;i++){const a=profile[i][0]-profile[i-1][0],b=profile[i+1][0]-profile[i][0];lo[i]=a;diag[i]=2*(a+b);hi[i]=b;rhs[i]=6*((profile[i+1][axis]-profile[i][axis])/b-(profile[i][axis]-profile[i-1][axis])/a);}
   for(let i=1;i<size;i++){const ratio=lo[i]/diag[i-1];diag[i]-=ratio*hi[i-1];rhs[i]-=ratio*rhs[i-1];}
   const solved=Array(size);solved[size-1]=rhs[size-1]/diag[size-1];for(let i=size-2;i>=0;i--)solved[i]=(rhs[i]-hi[i]*solved[i+1])/diag[i];second[axis]=solved;
  }
  function rawRadius(y,axis){
   let i=0;while(i<profile.length-2&&profile[i+1][0]<y)i++;
   const a=profile[i],b=profile[i+1],span=b[0]-a[0],t=Math.max(0,Math.min(1,(y-a[0])/span));
   const u=1-t;return u*a[axis]+t*b[axis]+((u**3-u)*second[axis][i]+(t**3-t)*second[axis][i+1])*span*span/6;
  }
  const radiusScale={};for(const axis of [1,2]){let max=0;for(let k=0;k<=2000;k++)max=Math.max(max,rawRadius(.016+(.402-.016)*k/2000,axis));radiusScale[axis]=(axis===1?.224:.219)/max;}
  const radius=(y,axis)=>rawRadius(y,axis)*radiusScale[axis];
  const envelope=(y,a)=>new THREE.Vector3(radius(y,1)*sp(Math.cos(a)),y,-.006+radius(y,2)*sp(Math.sin(a)));
  const joinNormal=a=>envelope(join+.00001,a).sub(envelope(join-.00001,a)).cross(envelope(join,a+.00001).sub(envelope(join,a-.00001))).normalize();
  // Full 450 mm footprint, with a curved nose rather than a square slab.
  syncIdentity.produce("robot-vacuum-model.js:generator-call-1",()=>loft([[0,.216,.216],[.006,.225,.225],[.013,.222,.222],[.016,.214,.214]],base,0,.55)).userData.part='tank-tray';
  // Grey lower housing remains open in front. The arch is a true void.
  const n=384,levels=20,positions=[],indices=[];
  for(let side=0;side<2;side++)for(let k=0;k<=levels;k++)for(let j=0;j<n;j++){
   const a=j/n*Math.PI*2,cx=sp(Math.cos(a)),cz=sp(Math.sin(a)),x=.220*cx,ax=Math.abs(x);
   // Upper corner turns into a flared lower return, continuously meeting the tray.
   let start=.016;
   if(cz>0&&ax<.214){
    if(ax<=.145)start=.136;
    else if(ax<=.193)start=.088+.048*Math.sqrt(Math.max(0,1-((ax-.145)/.048)**2));
    else start=.088-.072*Math.sqrt(Math.max(0,1-((.214-ax)/.021)**2));
   }
   const y=start+(join-start)*k/levels,rx=radius(y,1),rz=radius(y,2),inset=side?.007:0;
   positions.push((rx-inset)*cx,y,-.006+(rz-inset)*cz);
  }
  const count=(levels+1)*n;
  for(let side=0;side<2;side++)for(let k=0;k<levels;k++)for(let j=0;j<n;j++){
   const a=side*count+k*n+j,b=a+n,an=side*count+k*n+(j+1)%n,bn=an+n;
   indices.push(...(side?[a,an,b,b,an,bn]:[a,b,an,b,bn,an]));
  }
  for(const k of [0,levels])for(let j=0;j<n;j++){const a=k*n+j,b=k*n+(j+1)%n,c=a+count,e=b+count;indices.push(...(k?[a,c,b,b,c,e]:[a,b,c,b,e,c]));}
  const lower=new THREE.BufferGeometry();lower.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));lower.setIndex(indices);lower.computeVertexNormals();
  for(let j=0;j<n;j++){const normal=joinNormal(j/n*Math.PI*2);lower.attributes.normal.setXYZ(levels*n+j,normal.x,normal.y,normal.z);}
  syncIdentity.produce("robot-vacuum-model:site-5",()=>add(lower,base,0,0,0)).userData.part='tank-opening';
  // Subtle side service seam and small vent dimples, mapped to the curved skin.
  const recess=new THREE.MeshStandardMaterial({color:'#667279',roughness:.8});
  const sideX=(y,z)=>radius(y,1)*Math.pow(Math.max(0,1-((z+.006)/radius(y,2))**4),.25);
  for(const sign of syncIdentity.items("robot-vacuum-model.js:generator-1",[["item-a",1]])){
   const seamPoints=Array.from({length:30},(_,i)=>{const y=.022+i*(join-.024)/29,z=-.015;return new THREE.Vector3(sign*(sideX(y,z)+.00012),y,z);});
   syncIdentity.produce("robot-vacuum-model:site-6",()=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seamPoints),36,.00018,4,false),recess,0,0,0)).userData.part='tank-side-seam';
   for(let row of syncIdentity.range("robot-vacuum-model.js:generator-2",0,9,1,false))for(let col of syncIdentity.range("robot-vacuum-model.js:generator-3",0,6,1,false)){
    const y=.049+row*.008,z=-.062-col*.008+(row%2)*.002,x=sign*(sideX(y,z)+.00015);
    const vent=syncIdentity.produce("robot-vacuum-model:site-7",()=>add(new THREE.CircleGeometry(.00085,8),recess,x,y,z));
    const dz=.00001,slope=(sideX(y,z+dz)-sideX(y,z-dz))/(2*dz);
    vent.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(sign,0,-slope).normalize());vent.userData.part='tank-side-vent';
   }
  }
  syncIdentity.produce("robot-vacuum-model:site-8",()=>box(.375,.108,.095,base,0,.016,-.158,.016));
  const bodyRows=Array.from({length:201},(_,k)=>{const y=join+(.402-join)*k/200;return new THREE.Vector3(radius(y,1),y,radius(y,2));});
  const body=syncIdentity.produce("robot-vacuum-model.js:generator-call-2",()=>loft(profile.slice(2),shell,-.006,.5,bodyRows));
  for(let j=0;j<256;j++){const normal=joinNormal(j/256*Math.PI*2);body.geometry.attributes.normal.setXYZ(j,normal.x,normal.y,normal.z);}
  body.userData.part='tank-curved-hood';
  // Dark lid perimeter separates a broad, softly domed cover from the shell.
  syncIdentity.produce("robot-vacuum-model.js:generator-call-3",()=>loft([[.402,.191,.184],[.404,.191,.184]],trim)).userData.part='tank-lid-seam';
  syncIdentity.produce("robot-vacuum-model.js:generator-call-4",()=>loft([[.404,.191,.184],[.418,.181,.175],[.434,.153,.150],[.445,.103,.103],[.449,.047,.047],[.450,.0001,.0001]],shell)).userData.part='tank-lid';
  const led=new THREE.MeshStandardMaterial({color:'#dbf4ff',emissive:'#a7dfff',emissiveIntensity:.7,roughness:.25});
  syncIdentity.produce("robot-vacuum-model:site-9",()=>box(.070,.003,.001,led,0,.395,.183,.001)).userData.part='tank-status-light';
  // Two shallow inclined wheel tracks, with actual transverse ribs.
  const incline=.11;
  for(const x of syncIdentity.items("robot-vacuum-model.js:generator-4",[["item-a",-.132],["item-b",.132]])){
   const track=syncIdentity.produce("robot-vacuum-model:site-10",()=>box(.042,.004,.260,trim,x,.031,.069,.001));track.rotation.x=incline;
   for(let k of syncIdentity.range("robot-vacuum-model.js:generator-5",0,43,1,false)){const z=-.056+k*.006;const rib=syncIdentity.produce("robot-vacuum-model:site-11",()=>box(.040,.0015,.0018,base,x,.034-(z-.069)*.11,z,.0003));rib.rotation.x=incline;}
  }
  // Small vector wordmark follows the curved front, no font/network dependency.
  const rows=body.userData.surfaceRows,surface=(x,y)=>{let i=1;while(i<rows.length-1&&rows[i].y<y)i++;const a=rows[i-1],b=rows[i],t=(y-a.y)/(b.y-a.y),rx=a.x+(b.x-a.x)*t,rz=a.z+(b.z-a.z)*t;return -.006+rz*Math.pow(1-Math.pow(Math.abs(x)/rx,4),.25)+.0006;};
  const glyphs={r:[[[0,0],[0,.8],[.35,1],[.65,.8]]],o:[[[.35,0],[0,.25],[0,.75],[.35,1],[.7,.75],[.7,.25],[.35,0]]],b:[[[0,1.5],[0,0]],[[0,.8],[.35,1],[.7,.75],[.7,.25],[.35,0],[0,.2]]],c:[[[.7,.85],[.35,1],[0,.75],[0,.25],[.35,0],[.7,.15]]],k:[[[0,0],[0,1.5]],[[.7,1],[0,.4],[.7,0]]]};
  syncIdentity.each("robot-vacuum-model.js:generator-6",[...'roborock'],(letter,i)=>{for(const stroke of syncIdentity.records("robot-vacuum-model.js:generator-7",glyphs[letter])){const pts=syncIdentity.each("robot-vacuum-model.js:generator-8",stroke,([u,v])=>{const x=-.029+i*.0075+u*.006,y=.318+v*.005;return new THREE.Vector3(x,y,syncIdentity.produce("robot-vacuum-model:site-12",()=>surface(x,y)));});const o=syncIdentity.produce("robot-vacuum-model:site-13",()=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.00028,5,false),trim,0,0,0));o.userData.part='tank-wordmark';}});
  const first=g.children.length;syncIdentity.produce("robot-vacuum-model.js:generator-call-5",()=>robot(.040,.027));
  const parked=new THREE.Group();parked.userData.part='tank-parked-robot';
  g.children.slice(first).forEach(o=>parked.add(o));g.add(parked);
  const panel=syncIdentity.produce("robot-vacuum-model:site-14",()=>box(.036,.0007,.014,grey,0,.120,.090,.002));parked.add(panel);
  for(const x of syncIdentity.items("robot-vacuum-model.js:generator-9",[["item-a",-.009],["item-b",.009]])){const key=syncIdentity.produce("robot-vacuum-model:site-15",()=>disc(.003,.003,.0004,led,x,.1207,.090));parked.add(key);}
 }
 // Low-profile P20 Max: flush top sensor, bumper seam and front camera window.
 function robot(y,z){
  const bumper=(h,mat,base)=>{const o=syncIdentity.produce("robot-vacuum-model:site-16",()=>disc(.175,.176,h,mat,0,base,z)),a=o.geometry.attributes.position;
   for(let i=0;i<a.count;i++)if(a.getZ(i)*.176>.173)a.setZ(i,.173/.176);a.needsUpdate=true;o.geometry.computeVertexNormals();return o;};
  syncIdentity.produce("robot-vacuum-model:site-17",()=>disc(.169,.170,.010,dark,0,y,z));
  syncIdentity.produce("robot-vacuum-model.js:generator-call-6",()=>bumper(.059,white,y+.010));
  syncIdentity.produce("robot-vacuum-model.js:generator-call-7",()=>bumper(.0015,grey,y+.0675));
  syncIdentity.produce("robot-vacuum-model:site-18",()=>disc(.172,.173,.0108,white,0,y+.069,z));
  syncIdentity.produce("robot-vacuum-model:site-19",()=>disc(.025,.024,.0008,grey,0,y+.079,z-.040));
  syncIdentity.produce("robot-vacuum-model:site-20",()=>box(.029,.0006,.003,grey,0,y+.0792,z+.062,.001));
  syncIdentity.produce("robot-vacuum-model:site-21",()=>box(.067,.032,.002,grey,0,y+.023,z+.174,.006));
  syncIdentity.produce("robot-vacuum-model:site-22",()=>box(.054,.024,.001,lens,0,y+.027,z+.1752,.004));
  for(const x of syncIdentity.items("robot-vacuum-model.js:generator-10",[["item-a",-.015],["item-b",.015]])){const o=syncIdentity.produce("robot-vacuum-model:site-23",()=>disc(.004,.004,.001,grey,x,0,0));o.rotation.x=Math.PI/2;o.position.set(x,y+.039,z+.1755);}
  // Brush is tucked inside the supplied machine envelope; extension is unknown.
  for(const a of syncIdentity.items("robot-vacuum-model.js:generator-11",[["item-a",-.7],["item-b",0],["item-c",.7]])){const o=syncIdentity.produce("robot-vacuum-model:site-24",()=>box(.030,.002,.004,grey,-.133,y+.005,z+.096,.001));o.rotation.y=a;}
 }
 if(f.type==='robot_p20max')syncIdentity.produce("robot-vacuum-model.js:generator-call-8",()=>robot(0,0));
 else if(f.type==='robot_p20max_tank')syncIdentity.produce("robot-vacuum-model.js:generator-call-9",()=>tankDock());
 else{
  const w=nominal[0]/1000,d=nominal[1]/1000,h=nominal[2]/1000;
  const front=d/2,back=-d/2,opening=.130;
  // Tray, rear service body and real hollow entrance (no painted-on black hole).
  syncIdentity.produce("robot-vacuum-model:site-25",()=>box(w,.012,d,white,0,0,0,.014));
  syncIdentity.produce("robot-vacuum-model:site-26",()=>box(w,h-.014,.105,white,0,.012,back+.105/2,.013));
  {
   for(const s of syncIdentity.items("robot-vacuum-model.js:generator-12",[["item-a",-1],["item-b",1]]))syncIdentity.produce("robot-vacuum-model:site-27",()=>box(.013,opening-.012,d-.025,white,s*(w-.013)/2,.012,.006,.006));
   syncIdentity.produce("robot-vacuum-model:site-28",()=>box(w,h-opening,d,white,0,opening,0,.018));
   syncIdentity.produce("robot-vacuum-model:site-29",()=>box(w*.91,.001,d*.72,white,0,h-.003,-d*.025,.009));
   syncIdentity.produce("robot-vacuum-model:site-30",()=>box(w*.72,.001,.002,grey,0,h-.001,d*.26,.0004));
  }
  // Lid separation and small recessed front status bar.
  syncIdentity.produce("robot-vacuum-model:site-31",()=>box(w*.87,.002,.001,grey,0,.139,front-.001,.0004));
  syncIdentity.produce("robot-vacuum-model:site-32",()=>box(.041,.003,.001,grey,0,h*.78,front-.001,.0004));
  syncIdentity.produce("robot-vacuum-model:site-33",()=>box(.090,.025,.004,dark,0,.085,back+.110,.003));
  for(const x of syncIdentity.items("robot-vacuum-model.js:generator-13",[["item-a",-.034],["item-b",.034]]))syncIdentity.produce("robot-vacuum-model:site-34",()=>box(.012,.010,.006,grey,x,.029,back+.112,.002));
  for(const x of syncIdentity.items("robot-vacuum-model.js:generator-14",[["item-a",-.091],["item-b",.091]]))syncIdentity.produce("robot-vacuum-model:site-35",()=>disc(.057,.057,.002,grey,x,.012,.015));
  for(const x of syncIdentity.items("robot-vacuum-model.js:generator-15",[["item-a",-w*.31],["item-b",w*.31]]))syncIdentity.produce("robot-vacuum-model:site-36",()=>box(.004,.001,d*.35,grey,x,.012,front-d*.18,.001));
  syncIdentity.produce("robot-vacuum-model.js:generator-call-10",()=>robot(.014,.055));
 }
 // Size editing is a layout approximation; details scale with the envelope.
 g.scale.set(f.w/nominal[0],(f.h??nominal[2])/nominal[2],f.d/nominal[1]);
 const model=new THREE.Group();model.add(g);model.userData.model='Roborock P20 Max';return model;
}
const api={specs,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishRobotVacuumModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
