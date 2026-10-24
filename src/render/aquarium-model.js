/* Production aquarium, browser/Node shared. Local +Z is the viewing front.
 * Only overall dimensions are measured; internal details are visual estimates. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncPart=(object,source)=>{if(object?.userData){object.userData.furnishPartSource=source;object.userData.furnishPartOrdinal??=object.id;}return object;};

const products=()=>root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
const supported=f=>f.type==='aquarium_mijia_2pro';
// One shared in-memory height map per Three.js instance; no canvas, file or fetch.
const barkMaps=new WeakMap();
const rockMaps=new WeakMap();
function rockBump(T){
 if(rockMaps.has(T))return rockMaps.get(T);
 const size=256,data=new Uint8Array(size*size*4),hash=(x,y)=>((Math.imul(x+83,374761393)^Math.imul(y+371,668265263))>>>0)%997/997;
 const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),sx),T.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy);};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let height=0;for(const [frequency,weight] of [[7,.32],[17,.26],[43,.22],[103,.20]])height+=noise(x/size*frequency,y/size*frequency)*weight;
  const pore=hash(x,y)<.12?.20:0,value=Math.round(T.MathUtils.clamp(height-pore,0,1)*255),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;rockMaps.set(T,texture);return texture;
}
function barkBump(T){
 if(barkMaps.has(T))return barkMaps.get(T);
 const w=512,h=256,data=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const angle=y/h*Math.PI*2+.055*Math.sin(x*.031)+.025*Math.sin(x*.097),grain=.15*Math.sin(angle*37+Math.sin(x*.13))+.085*Math.sin(angle*71+x*.11),split=Math.pow(Math.max(0,Math.sin(angle*17+Math.sin(x*.021))),18)*(.13+.11*Math.sin(x*.043)**2),hash=(Math.imul(x+713,374761393)^Math.imul(y+129,668265263))>>>0,pore=(hash%997)/997-.5,value=Math.round(T.MathUtils.clamp(.53+grain+pore*.17-split,0,1)*255),i=(y*w+x)*4;
  data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,w,h);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;barkMaps.set(T,texture);return texture;
}
function build(T,f){
 const g=new T.Group(),body=new T.Group();g.add(body);g.userData.aquarium=true;
 const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.6,...extra});
 const frame=material(f.color||'#191c20',{roughness:.32,metalness:.25}),black=material('#080c10',{roughness:.28}),edge=material('#8dbcc5',{metalness:.2,roughness:.18});
 const mesh=(geometry,mat,x=0,y=0,z=0,parent=body,part)=>{const m=syncPart(new T.Mesh(geometry,mat),"aquarium-model:site-1");m.position.set(x/1000,y/1000,z/1000);m.castShadow=!mat.transparent;m.receiveShadow=true;if(part)m.userData.aquariumPart=part;parent.add(m);return m;};
 const box=(w,h,d,mat,x,y,z,parent=body,part)=>syncPart(mesh(new T.BoxGeometry(w/1000,h/1000,d/1000),mat,x,y+h/2,z,parent,part),"aquarium-model:site-2");
 const tube=(points,r,mat,parent=body,part,segments=24)=>syncPart(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p.map(n=>n/1000)))),segments,r/1000,7,false),mat,0,0,0,parent,part),"aquarium-model:site-3");
 const oval=(r,scale,mat,x,y,z,parent=body,part)=>{const m=syncPart(mesh(new T.SphereGeometry(r/1000,12,8),mat,x,y,z,parent,part),"aquarium-model:site-4");m.scale.set(...scale);return m;};
 // The base and back hood determine the exact nominal outer envelope.
 syncPart(box(505,11,292,frame,0,0,0,body,'base'),"aquarium-model:site-5");syncPart(box(493,4,280,black,0,11,0),"aquarium-model:site-6");
 syncPart(box(505,290,6,frame,0,15,-143,body,'rear-wall'),"aquarium-model:site-7");
 syncPart(box(493,272,58,black,0,15,-111,body,'filter-chamber'),"aquarium-model:site-8");
 syncPart(box(505,29,83,frame,0,305,-104.5,body,'hood'),"aquarium-model:site-9");
 syncPart(box(493,3,76,black,0,331,-104.5),"aquarium-model:site-10"); // inset lid seam
 syncPart(box(491,1.5,73,frame,0,332.5,-104.5),"aquarium-model:site-11");
 syncPart(box(505,10,9,frame,0,296,141.5,body,'front-rim'),"aquarium-model:site-12");
 for(const x of [-248,248])syncPart(box(9,10,283,frame,x,296,0),"aquarium-model:site-13");
 syncPart(box(490,2,6,material('#bde8ff',{emissive:'#6bbdff',emissiveIntensity:1.5,roughness:.2}),0,296,-59,body,'led'),"aquarium-model:site-14");
 syncPart(box(65,2,17,black,-128,332,-111,body,'feeder-recess'),"aquarium-model:site-15");syncPart(box(32,1,9,material('#69717a'),-128,334-1,-111),"aquarium-model:site-16");
 for(let i=0;i<3;i++)syncPart(box(10,1,1,edge,60+i*23,333,-91),"aquarium-model:site-17");
 // Display is actual geometry, with no canvas/font/network dependency.
 const display=material('#e1f6fc',{emissive:'#8ec8da',emissiveIntensity:.6}),panel=syncPart(box(69,20,1,black,-7,307,-62.5,body,'control-panel'),"aquarium-model:site-18");
 const segments=[[0,6,4,1],[2,3,1,5],[2,-3,1,5],[0,-6,4,1],[-2,-3,1,5],[-2,3,1,5],[0,0,4,1]],digits={2:[0,1,6,4,3],5:[0,5,6,2,3],6:[0,5,6,4,2,3]};
 for(const [i,d] of [2,5,6].entries())for(const s of digits[d]){const [x,y,w,h]=segments[s];syncPart(box(w,h,.3,display,-24+i*8+x,316+y-h/2,-61.8),"aquarium-model:site-19");}
 syncPart(box(1,1,.3,display,-11,310,-61.8),"aquarium-model:site-20");panel.userData.reading='25.6 (decorative)';
 // Low intake/outlet grilles in the dark rear filter partition.
 const grille=material('#2d353a');for(const x of [-207,200]){syncPart(box(44,41,3,grille,x,29,-80),"aquarium-model:site-21");for(let i=0;i<7;i++)syncPart(box(2,29,1,black,x-17+i*5.5,35,-78),"aquarium-model:site-22");}
 syncPart(tube([[215,288,-82],[215,275,-65],[205,272,-55]],4,frame,body,'return-outlet'),"aquarium-model:site-23");
 const glass=material('#ccecf1',{transparent:true,opacity:.105,roughness:.12,metalness:.05,depthWrite:false,side:T.DoubleSide});
 const pane=(w,h,d,x,y,z,part)=>{const m=syncPart(box(w,h,d,glass,x,y,z,body,part),"aquarium-model:site-24");m.castShadow=false;m.renderOrder=20;return m;};
 pane(505,281,4,0,15,144,'front-glass');for(const x of [-250.5,250.5])pane(4,281,284,x,15,0,'side-glass');
 for(const x of [-250,250]){syncPart(box(1,281,1,edge,x,15,142),"aquarium-model:site-25");syncPart(box(1,281,1,edge,x,15,-80),"aquarium-model:site-26");}
 // Optional visibility is preview-only; the saved model is always this same static scene.
 const scape=new T.Group();scape.userData.aquariumPart='aquascape';body.add(scape);
 const sand=material('#c4b198'),stone=material('#ffffff',{vertexColors:true,roughness:1,bumpMap:rockBump(T),bumpScale:.0014});
 syncPart(box(493,15,219,sand,0,15,28.5,scape,'substrate'),"aquarium-model:site-27");
 let seed=2749;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const grains=syncPart(new T.InstancedMesh(new T.IcosahedronGeometry(.0016,0),material('#e3d2b5'),480),"aquarium-model:site-28"),dummy=new T.Object3D();
 for(let i=0;i<480;i++){dummy.position.set((rnd()-.5)*.484,.030+rnd()*.001,(rnd()*.205-.075));dummy.scale.setScalar(.5+rnd()*.7);dummy.updateMatrix();grains.setMatrixAt(i,dummy.matrix);}scape.add(grains);
 // Asymmetric broken slabs, built from uneven footprints/shoulders rather than spheres.
 function rock(x,z,w,h,d,seed){
  const positions=[],colors=[],uvs=[],outline=[[-.47,.31],[.08,.50],[.50,.16],[.44,-.39],[-.13,-.48],[-.52,-.22],[-.60,.06]],rings=[],center=new T.Vector3(0,h*.43,0),dark=new T.Color('#24292e'),light=new T.Color('#656d72');
  for(let level=0;level<3;level++){
   const ring=[];for(let j=0;j<outline.length;j++){
    const [px,pz]=outline[j],factor=level===0?.87:level===1?1:.53,skew=level===2?-.11:0,height=level===0?0:level===1?.45+.15*Math.sin(j*1.7+seed):.84+.14*Math.sin(j*2.3+seed*.7),jitter=1+.12*Math.sin(seed*3.1+j*2.7+level);
    ring.push(new T.Vector3((px*factor*jitter+skew)*w,height*h,(pz*factor*jitter+(level===2?-.06:0))*d));
   }rings.push(ring);
  }
  function surface(p){
   const nx=p.x/w,ny=p.y/h-.43,nz=p.z/d,a=nx*.78+ny*.36-nz*.33+.08*Math.sin(ny*8+seed),b=nx*.22-ny*.51+nz*.72+.09*Math.sin(nx*9+seed*2),c=nx*.35+ny*.47+nz*.16+.02+.02*Math.sin(ny*11);
   const cut=Math.max(Math.exp(-a*a/.00028),.8*Math.exp(-((b-.04)**2)/.00018),.95*Math.exp(-c*c/.00024)),pocket=Math.exp(-((nx+.18)**2/.012+(ny-.1)**2/.018+(nz-.30)**2/.02)),grain=Math.sin(nx*87+ny*61+seed)*Math.sin(nz*73-ny*113)+.5*Math.sin(nx*213+nz*149+ny*137),radial=p.clone().sub(center).normalize(),offset=grain*.32-cut*3.5-pocket*2.0,v=p.clone().addScaledVector(radial,offset);
   const stain=.10*Math.sin(nx*13+ny*9+nz*17+seed),tone=T.MathUtils.clamp(.34+stain+grain*.045-cut*.42-pocket*.18,.025,.80),color=dark.clone().lerp(light,tone);
   return {v,color};
  }
  function face(a,b,c){
   const normal=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a)),outside=a.clone().add(b).add(c).multiplyScalar(1/3).sub(center);if(normal.dot(outside)<0)[b,c]=[c,b];
   const steps=12,point=(i,j)=>a.clone().addScaledVector(new T.Vector3().subVectors(b,a),i/steps).addScaledVector(new T.Vector3().subVectors(c,a),j/steps);
   const triangle=tri=>{for(const p of tri){const {v,color}=syncPart(surface(p),"aquarium-model:site-29");positions.push(v.x/1000,v.y/1000,v.z/1000);colors.push(color.r,color.g,color.b);uvs.push(p.x/w+p.z/d*.37,p.y/h+p.z/d*.51);}};
   for(let i=0;i<steps;i++)for(let j=0;j<steps-i;j++){triangle([point(i,j),point(i+1,j),point(i,j+1)]);if(j<steps-i-1)triangle([point(i+1,j),point(i+1,j+1),point(i,j+1)]);}
  }
  for(let level=0;level<2;level++)for(let j=0;j<7;j++){const k=(j+1)%7;syncPart(face(rings[level][j],rings[level][k],rings[level+1][j]),"aquarium-model:site-30");syncPart(face(rings[level][k],rings[level+1][k],rings[level+1][j]),"aquarium-model:site-31");}
  for(const level of [0,2]){const cap=rings[level].reduce((p,q)=>p.add(q),new T.Vector3()).multiplyScalar(1/7);for(let j=0;j<7;j++)syncPart(face(cap,rings[level][j],rings[level][(j+1)%7]),"aquarium-model:site-32");}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();syncPart(mesh(geo,stone,x,30,z,scape,'rock'),"aquarium-model:site-33");
 }
 for(const args of [[100,22,88,88,62,1.3],[145,-25,52,68,45,3.1],[-154,49,43,29,31,4.7],[152,86,36,26,24,6.2]])rock(...args);
 // Blue illuminated backing belongs to the scape, not to the physical filter housing.
 const backing=new T.PlaneGeometry(.491,.243,20,12),bp=backing.attributes.position,bc=[],deep=new T.Color('#07172f'),blue=new T.Color('#145aa0');
 for(let i=0;i<bp.count;i++){const x=bp.getX(i)/.2455,y=bp.getY(i)/.1215,k=(.36+.64*(y+1)/2)*(1-.38*x*x),color=deep.clone().lerp(blue,k);bc.push(color.r,color.g,color.b);}
 backing.setAttribute('color',new T.Float32BufferAttribute(bc,3));syncPart(mesh(backing,material('#ffffff',{vertexColors:true,emissive:'#0d3565',emissiveIntensity:.28}),0,151.5,-81,scape,'scape-background'),"aquarium-model:site-34");
 // Closed, tapered root surfaces. Vary the cross-section, flatten it in depth,
 // twist longitudinal flutes and colour the grooves; no constant-radius pipes.
 const bark=material('#ffffff',{vertexColors:true,roughness:1,bumpMap:barkBump(T),bumpScale:.002}),barkDark=new T.Color('#170b07'),barkLight=new T.Color('#60402d');
 function rootWood(points,radii,phase,partIndex){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),n=140,sides=56,frames=curve.computeFrenetFrames(n,false),positions=[],colors=[],uvs=[],indices=[];
  // A separate deterministic seed leaves the existing plants/fish arrangement untouched.
  let woodSeed=3817+Math.round(phase*1000);const woodRandom=()=>{woodSeed=(Math.imul(woodSeed,1664525)+1013904223)>>>0;return woodSeed/4294967296;};
  const cracks=Array.from({length:13},(_,i)=>({start:.025+woodRandom()*.67,length:.13+woodRandom()*.35,angle:i*2.399+phase,tilt:(woodRandom()-.5)*1.4,width:.07+woodRandom()*.065,depth:.12+woodRandom()*.15}));
  cracks.push({start:.11,length:.52,angle:Math.PI+phase*.16,tilt:.35,width:.10,depth:.34},{start:.43,length:.44,angle:Math.PI-.55+phase*.12,tilt:-.38,width:.12,depth:.30},{start:.23,length:.24,angle:Math.PI+.58,tilt:.25,width:.11,depth:.28});
  const angleDistance=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  for(let i=0;i<=n;i++){
   const u=i/n,c=curve.getPointAt(u),r=u*(radii.length-1),j=Math.min(radii.length-2,Math.floor(r)),radius=T.MathUtils.lerp(radii[j],radii[j+1],r-j);
   for(let k=0;k<=sides;k++){
    const a=k/sides*Math.PI*2,twist=a+u*.85+phase,groove=Math.sin(twist*7+Math.sin(u*8+phase)*.22),ridge=Math.sin(twist*11+u*9);
    let split=0,scar=0;
    for(const crack of cracks){const t=(u-crack.start)/crack.length;if(t<=0||t>=1)continue;const middle=crack.angle+crack.tilt*t+.10*Math.sin(t*13+phase),delta=angleDistance(a,middle),mask=Math.pow(Math.sin(t*Math.PI),.45),cut=Math.exp(-delta*delta/(2*crack.width*crack.width))*mask;split=Math.max(split,cut*crack.depth);}
    // Local knot cavities and short cross-grain splits avoid repeating full rings.
    for(let q=0;q<3;q++){const du=u-(.19+q*.27+.025*Math.sin(phase+q)),da=angleDistance(a,phase+q*2.31+.8),knot=Math.exp(-du*du/.0007-da*da/.075),cross=Math.exp(-du*du/.00011-da*da/.65);scar=Math.max(scar,.19*knot+.10*cross);}
    const grit=(.37*Math.sin(u*331+Math.sin(a*17)*2+phase)+.22*Math.sin(u*157-a*19)+.13*Math.sin(u*843+a*23))*Math.min(1,radius/7),warp=1+.12*groove+.035*ridge+.04*Math.sin(u*47+a*3)-split-scar,relief=Math.max(radius*.36,radius*warp+grit),v=c.clone().addScaledVector(frames.normals[i],Math.cos(a)*relief).addScaledVector(frames.binormals[i],Math.sin(a)*relief*.66);
    positions.push(v.x/1000,v.y/1000,v.z/1000);uvs.push(u,k/sides);const grain=.075*Math.sin(u*197+a*21)+.035*Math.sin(u*571-a*13),tone=T.MathUtils.clamp(.33+.17*groove+.09*ridge+grain-split*1.65-scar*1.4,.015,.78),color=barkDark.clone().lerp(barkLight,tone);colors.push(color.r,color.g,color.b);
    if(i<n&&k<sides){const a0=i*(sides+1)+k,b0=a0+sides+1;indices.push(a0,a0+1,b0,a0+1,b0+1,b0);}
   }
  }
  // Irregular tapered tips have solid end grain, avoiding hollow saw-cut ends.
  for(const end of [0,n]){const c=curve.getPointAt(end/n),center=positions.length/3;positions.push(c.x/1000,c.y/1000,c.z/1000);uvs.push(end/n,.5);colors.push(barkDark.r,barkDark.g,barkDark.b);for(let k=0;k<sides;k++){const a=end*(sides+1)+k;if(end===0)indices.push(center,a+1,a);else indices.push(center,a,a+1);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();syncPart(mesh(geo,bark,0,0,0,scape,'driftwood'),"aquarium-model:site-35").userData.furnishStablePart=`scape/driftwood-${partIndex}`;
 }
 for(const [i,[partId,points,radii]] of [
  ["main-trunk",[[-181,38,39],[-145,76,27],[-94,111,12],[-38,139,1],[12,134,-6],[63,150,-12],[119,181,-22],[175,186,-33]],[1,17,27,22,20,30,28,1]],
  ["left-arch",[[-186,32,66],[-160,45,59],[-133,74,40],[-105,109,14]],[.7,6,12,21]],
  ["left-root",[[-210,32,11],[-176,41,14],[-142,70,20],[-123,93,20]],[.5,6,12,17]],
  ["low-root",[[-120,33,76],[-113,55,54],[-87,83,29],[-63,120,7]],[.7,7,11,17]],
  ["right-root",[[0,133,-5],[29,98,8],[62,62,27],[107,36,45]],[17,14,8,.6]],
  ["right-branch",[[64,151,-14],[111,140,5],[156,163,-9],[198,199,-38]],[22,19,10,.7]],
  ["upper-twig",[[111,177,-23],[140,203,-35],[165,218,-43],[192,217,-49]],[19,11,6,.5]],
  ["left-twig",[[-97,112,13],[-76,138,1],[-45,157,-10],[-22,148,-7]],[17,13,7,.6]],
  ["right-tail",[[157,173,-24],[183,126,-12],[195,72,11],[214,35,34]],[13,10,5,.5]]
 ].entries())rootWood(points,radii,i*.73,partId);
 // Foliage is batched by shade, with curved, ridged leaf surfaces and batched stems.
 const greens=['#315d2c','#557d32','#7b9b3d','#3e743e','#91ad48','#23563a'],leaves=greens.map(()=>[]),stemPositions=[];
 function leaf(base,tip,width,angle,bucket){
  const b=new T.Vector3(...base),t=new T.Vector3(...tip),axis=t.clone().sub(b).normalize(),side=new T.Vector3(Math.cos(angle),0,Math.sin(angle));side.addScaledVector(axis,-side.dot(axis)).normalize();
  const rows=[];for(let i=0;i<=6;i++){const u=i/6,c=b.clone().lerp(t,u);c.y+=Math.sin(u*Math.PI)*width*.6;const w=Math.max(.025,Math.pow(Math.sin(u*Math.PI),.8)*width);rows.push([c.clone().addScaledVector(side,-w),c.clone().add(new T.Vector3(0,w*.22,0)),c.clone().addScaledVector(side,w)]);}
  for(let i=0;i<6;i++)for(let j=0;j<2;j++)for(const tri of [[rows[i][j],rows[i+1][j],rows[i][j+1]],[rows[i][j+1],rows[i+1][j],rows[i+1][j+1]]])for(const p of tri)bucket.push(p.x/1000,p.y/1000,p.z/1000);
 }
 function stem(points){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p.map(v=>v/1000)))),geo=new T.TubeGeometry(curve,8,.00055,4,false),triangles=geo.toNonIndexed();for(const v of triangles.attributes.position.array)stemPositions.push(v);geo.dispose();triangles.dispose();}
 // Dense left background and right rear stems, leaving the central arch open.
 for(const [cx,cz,height,count,spread] of [[-207,-42,150,17,25],[-177,-47,172,19,36],[-141,-50,110,13,27],[199,-43,173,17,29],[212,5,112,16,22],[166,-43,181,19,29],[-207,46,75,16,26]]){
  for(let j=0;j<count;j++){
   const x=cx+(rnd()-.5)*spread,z=cz+(rnd()-.5)*16,h=height*(.64+rnd()*.36),bend=(rnd()-.5)*17;
   stem([[x,31,z],[x+bend*.4,31+h*.5,z-2],[x+bend,31+h,z]]);
   for(let k=1;k<=11;k++){const y=31+h*k/12,a=j*2.4+k*2.8,len=Math.min(22,h*.24)*(1-k*.035),b=[x+bend*k/12,y,z];for(const turn of [0,Math.PI])leaf(b,[b[0]+Math.cos(a+turn)*len,y+len*.48,z+Math.sin(a+turn)*len*.65],len*.18,a+turn+Math.PI/2,leaves[(j+k)%6]);}
  }
 }
 // Epiphytes and moss-like small leaves build the high right-hand planted mound.
 for(const [cx,cy,cz,count,spread] of [[74,171,-27,17,28],[111,197,-28,22,32],[148,209,-39,23,35],[179,201,-37,18,25],[157,175,-3,18,31]])for(let j=0;j<count;j++){
  const x=cx+(rnd()-.5)*spread,y=cy+(rnd()-.5)*11,z=cz+(rnd()-.5)*18,h=12+rnd()*27,bend=(rnd()-.5)*13;stem([[x,y,z],[x+bend*.4,y+h*.6,z],[x+bend,y+h,z-3]]);
  for(let k=0;k<7;k++){const a=k*2.4+j,b=[x+bend*k/7,y+h*k/8,z],l=7+rnd()*10;leaf(b,[b[0]+Math.cos(a)*l,b[1]+l*.7,b[2]+Math.sin(a)*l*.55],l*.32,a+Math.PI/2,leaves[(k+j+1)%5]);}
 }
 // Broad-leaved ferns at the rock foot and rooted plants on the lower left.
 for(const [cx,cy,cz,count] of [[178,35,29,24],[133,34,57,18],[-128,32,61,18],[-187,32,16,20],[68,36,-32,12]])for(let j=0;j<count;j++){
  const a=j*2.4,len=22+rnd()*48,b=[cx+(rnd()-.5)*24,cy,cz+(rnd()-.5)*17];leaf(b,[b[0]+Math.cos(a)*len*.48,b[1]+len,b[2]+Math.sin(a)*len*.4],len*.13,a+Math.PI/2,leaves[j%6]);
 }
 // Uneven foreground cushions, with a pale open sand path down the middle.
 for(const [cx,cz,rx,rz,count] of [[-212,94,27,22,80],[-166,75,30,20,85],[-105,49,21,18,55],[58,92,30,20,90],[120,69,23,18,65],[201,102,31,19,85],[-211,13,20,20,55]])for(let j=0;j<count;j++){
  const a=rnd()*Math.PI*2,r=Math.sqrt(rnd()),x=cx+Math.cos(a)*rx*r,z=cz+Math.sin(a)*rz*r,y=31+(1-r*r)*10;
  for(let k=0;k<6;k++){const a=j*2.4+k*1.05,l=3+rnd()*5;leaf([x,y,z],[x+Math.cos(a)*l,y+3+rnd()*7,z+Math.sin(a)*l],l*.48,a+Math.PI/2,leaves[(k+j)%5]);}
 }
 const stemGeo=new T.BufferGeometry();stemGeo.setAttribute('position',new T.Float32BufferAttribute(stemPositions,3));stemGeo.computeVertexNormals();syncPart(mesh(stemGeo,material('#496a32'),0,0,0,scape,'plant-stems'),"aquarium-model:site-36");
 for(let i=0;i<leaves.length;i++){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(leaves[i],3));geo.computeVertexNormals();syncPart(mesh(geo,material(greens[i],{side:T.DoubleSide,roughness:.85}),0,0,0,scape,'plants'),"aquarium-model:site-37").userData.furnishStablePart=`scape/plant-shade-${i}`;}
 // Small, static schooling fish; no invented aquarium controls or live simulation.
 const fishMat=material('#d6a575',{roughness:.45}),tailMat=material('#b78a61',{side:T.DoubleSide});
 for(const [x,y,z,s] of [[-124,168,43,1],[-82,185,54,.85],[-62,158,74,.85],[-27,179,28,.9],[3,210,-5,.8],[24,224,-14,.7],[-20,81,74,.8]]){
  const fish=new T.Group();fish.position.set(x/1000,y/1000,z/1000);fish.scale.setScalar(s);scape.add(fish);syncPart(oval(5,[1.7,.65,.38],fishMat,0,0,0,fish,'fish'),"aquarium-model:site-38");
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-.006,0,0,-.013,.004,0,-.013,-.004,0],3));geo.computeVertexNormals();syncPart(mesh(geo,tailMat,0,0,0,fish),"aquarium-model:site-39");syncPart(oval(.6,[1,1,1],black,5,1,1.7,fish),"aquarium-model:site-40");
 }
 const water=new T.Group();water.userData.aquariumPart='water';body.add(water);
 const waterMat=material('#5aabc4',{transparent:true,opacity:.065,depthWrite:false,side:T.DoubleSide,roughness:.18});
 const volume=syncPart(box(493,239,219,waterMat,0,31,28.5,water,'water-volume'),"aquarium-model:site-41");volume.renderOrder=10;volume.castShadow=false;
 const surface=syncPart(mesh(new T.PlaneGeometry(.493,.219),material('#81c6df',{transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide,roughness:.16}),0,270,28.5,water,'waterline'),"aquarium-model:site-42");surface.rotation.x=-Math.PI/2;surface.renderOrder=12;
 // Independent scaling describes a layout variant, never another certified product.
 body.scale.set(f.w/505,products().height(f)/334,f.d/292);body.position.y=products().value(f,'mountHeight')/1000;
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishAquariumModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
