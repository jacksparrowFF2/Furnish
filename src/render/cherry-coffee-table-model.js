/* User reference: 1200 × 650 × 450 mm; white sintered-stone top.
 * Unmarked joinery and drawer details are visual estimates, static only. */
(function(root){
'use strict';
const supported=f=>f.type==='coffeetable_yeswood_cherry'&&!f.obj;
function build(T,f){
 const result=new T.Group(),body=new T.Group();result.add(body);
 const wood=new T.MeshStandardMaterial({color:f.color||'#bd7846',roughness:.32});
 // Deterministic, local grain texture; shared within this model, no external assets.
 const pixels=new Uint8Array(128*256*4);
 for(let y=0;y<256;y++)for(let x=0;x<128;x++){
  const wave=x+3*Math.sin(y*.029)+1.5*Math.sin(y*.073+x*.04);
  const grain=Math.sin(wave*.7+Math.sin(wave*.13)*2),fine=Math.sin(wave*2.9+y*.08);
  const v=Math.round(246+4*grain+2*fine),i=(y*128+x)*4;
  pixels[i]=v;pixels[i+1]=v;pixels[i+2]=v;pixels[i+3]=255;
 }
 const texture=new T.DataTexture(pixels,128,256);texture.needsUpdate=true;texture.colorSpace=T.SRGBColorSpace;
 texture.wrapS=texture.wrapT=T.RepeatWrapping;wood.map=texture;
 const stone=new T.MeshStandardMaterial({color:'#f5f5f1',roughness:.28});
 const dark=new T.MeshStandardMaterial({color:'#24221f',roughness:.55});
 const recess=wood.clone();recess.color.multiplyScalar(.72);
 function add(geometry,material,name,x,y,z){const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;o.userData.cherryCoffeePart=name;body.add(o);return o;}
 function box(w,h,d,x,y,z,m,name){return add(new T.BoxGeometry(w,h,d),m,name,x,y,z);}
 function rounded(w,d,r,h,x,y,z,m,name,edge=0){
  // Circular plan corners and a quarter-circle roll on both thickness edges.
  // Explicit tangent normals keep broad faces flat and the edge highlight continuous.
  const positions=[],normals=[],uv=[],indices=[],rings=[],segments=16,steps=8;
  const b=Math.min(edge,h/2,r-.01),count=4*(segments+1);
  const layers=[];
  for(let k=0;k<=steps;k++){const t=k/steps*Math.PI/2;layers.push({y:-h/2+b*(1-Math.cos(t)),inset:b*(1-Math.sin(t)),flat:Math.sin(t),ny:-Math.cos(t)});}
  for(let k=0;k<=steps;k++){const t=k/steps*Math.PI/2;layers.push({y:h/2-b+b*Math.sin(t),inset:b*(1-Math.cos(t)),flat:Math.cos(t),ny:Math.sin(t)});}
  for(const layer of layers){
   const ring=[];
   for(let corner=0;corner<4;corner++)for(let k=0;k<=segments;k++){
    const angle=(corner+k/segments)*Math.PI/2,nx=Math.cos(angle),nz=Math.sin(angle);
    const cx=(corner===0||corner===3?1:-1)*(w/2-r),cz=(corner<2?1:-1)*(d/2-r);
    const px=cx+(r-layer.inset)*nx,pz=cz+(r-layer.inset)*nz;
    ring.push(positions.length/3);positions.push(px,layer.y,pz);normals.push(nx*layer.flat,layer.ny,nz*layer.flat);uv.push(pz/d+.5,px/w+.5);
   }
   rings.push(ring);
  }
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<count;i++){
   const a=rings[j][i],b=rings[j+1][i],c=rings[j][(i+1)%count],d=rings[j+1][(i+1)%count];indices.push(a,b,c,b,d,c);
  }
  for(const [j,sign] of [[0,-1],[rings.length-1,1]]){
   const center=positions.length/3;positions.push(0,layers[j].y,0);normals.push(0,sign,0);uv.push(.5,.5);
   for(let i=0;i<count;i++){const a=rings[j][i],b=rings[j][(i+1)%count];if(sign<0)indices.push(center,a,b);else indices.push(center,b,a);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);
  g.userData.edgeRadius=b;
  return add(g,m,name,x,y,z);
 }
 // 31 mm total top: 20 mm cherry substrate + 11 mm white stone.
 rounded(1200,650,60,20,0,429,0,wood,'top-substrate',8);
 rounded(1200,650,60,11,0,444.5,0,stone,'white-stone',1.8);
 // Both ends bend inward as constant-thickness boards. Inner and outer faces
 // follow offsets of the same eased neutral curve; this is not a shaved face.
 // Bend angle/radius and unmarked joinery sizes remain visual estimates.
 function legWing(side,half,parent){
  const ys=[0,.3,.9,1.8,3,6,12,18,24,40,80,120,160,200,240,280,320,360,395,407,413,416,417.2,418.1,418.7,419];
  const nz=96,positions=[],uv=[],indices=[],rows=ys.length,cols=nz+1;
  const bendStart=175,bendAngle=.46,bendLength=270-bendStart-14*Math.sin(bendAngle);
  const bendReturn=bendLength*Math.tan(bendAngle)/2;
  for(let face=0;face<2;face++)for(const y of ys){
   const end=y<24?246+Math.sqrt(Math.max(0,24*24-(24-y)**2)):y>415?266+Math.sqrt(Math.max(0,16-(y-415)**2)):270;
   for(let j=0;j<=nz;j++){
    const along=18+(end-18)*j/nz,distance=Math.min(y,419-y,along-18,end-along);
    const r=3,roll=r-Math.sqrt(Math.max(0,r*r-Math.max(0,r-distance)**2));
    const u=Math.max(0,(along-bendStart)/(270-bendStart));
    // Zero initial curvature avoids a visible hinge at the straight-to-bent join.
    const angle=Math.atan(bendReturn*(6*u*u-4*u*u*u)/bendLength),offset=face===0?-14+roll:14-roll;
    const centerX=454-bendReturn*(2*u*u*u-u*u*u*u);
    const centerZ=along<=bendStart?along:bendStart+bendLength*u;
    const x=side*(centerX+offset*Math.cos(angle)),z=half*(centerZ+offset*Math.sin(angle));
    positions.push(x,y,z);uv.push((along-18)/252,y/419);
   }
  }
  // Build once, orient every triangle from the intended face toward the outside.
  function triangle(a,b,c,direction){
   const p=i=>new T.Vector3(...positions.slice(i*3,i*3+3));
   const normal=p(b).sub(p(a)).cross(p(c).sub(p(a)));
   if(normal.dot(direction)<0)indices.push(a,c,b);else indices.push(a,b,c);
  }
  function quad(a,b,c,d,direction){triangle(a,b,c,direction);triangle(b,d,c,direction);}
  for(let face=0;face<2;face++)for(let i=0;i<rows-1;i++)for(let j=0;j<nz;j++){
   const a=face*rows*cols+i*cols+j;quad(a,a+1,a+cols,a+cols+1,new T.Vector3(side*(face?1:-1),0,0));
  }
  const offset=rows*cols;
  for(let j=0;j<nz;j++)for(const row of [0,rows-1]){
   const a=row*cols+j;quad(a,a+1,a+offset,a+offset+1,new T.Vector3(0,row?1:-1,0));
  }
  for(let i=0;i<rows-1;i++)for(const col of [0,nz]){
   const a=i*cols+col;quad(a,a+cols,a+offset,a+offset+cols,new T.Vector3(0,0,half*(col?1:-1)));
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  g.userData.bentBoard={thickness:28,angle:bendAngle,start:bendStart,return:bendReturn,profile:'eased-bend',rows,cols};
  const o=new T.Mesh(g,wood);o.castShadow=o.receiveShadow=true;o.userData.cherryCoffeePart='leg-wing';parent.add(o);
 }
 for(const side of [-1,1]){
  const first=body.children.length;
  const leg=new T.Group();leg.userData.cherryCoffeePart='side-panel';body.add(leg);
  for(const half of [-1,1])legWing(side,half,leg);
  // Keep the reference 880 mm clear span at the inward-returning tips.
  const legBounds=new T.Box3().setFromObject(leg),shift=440-(side>0?legBounds.min.x:-legBounds.max.x);
  leg.position.x=side*shift;
  // The dark strip is the joining spine visible on both sides of the split panel.
  box(20,415,36,side*(453+shift),209.5,0,dark,'side-inlay');
  // Reference inner view: two horizontal cleats, two mounting blocks and fasteners.
  for(const y of [177,400]){
   const cleat=rounded(22,424,8,16,side*(432+shift),y,0,wood,'leg-inner-cleat',3);
   cleat.rotation.z=Math.PI/2;
  }
  for(const z of [-160,160])box(24,82,28,side*(428+shift),226,z,wood,'leg-mount-block');
  for(const y of [177,400])for(const z of [-184,-116,116,184]){
   const bolt=add(new T.CylinderGeometry(3.2,3.2,1.2,12),dark,'leg-fastener',side*(423.4+shift),y,z);bolt.rotation.z=Math.PI/2;
  }
  for(const z of [-160,160])for(const y of [210,244]){
   const bolt=add(new T.CylinderGeometry(4.5,4.5,1.2,12),dark,'leg-fastener',side*(415.4+shift),y,z);bolt.rotation.z=Math.PI/2;
  }
  for(const part of body.children.slice(first))part.userData.legSide=side;
 }
 // Low drawer unit: bottom 120, face height 155, shelf top 275 mm.
 rounded(880,540,14,18,0,266,0,wood,'shelf',7);
 const face=rounded(880,137,12,18,0,188.5,261,wood,'drawer-front',6);face.rotation.x=Math.PI/2;
 const back=rounded(880,137,12,18,0,188.5,-261,wood,'drawer-back',6);back.rotation.x=Math.PI/2;
 box(844,18,504,0,129,0,recess,'drawer-bottom');
 for(const x of [-431,431])box(18,119,504,x,197.5,0,wood,'drawer-side');
 // Shallow finger rebate and inset top panel seams, based on reference views.
 box(842,3,2,0,254.5,270.2,recess,'finger-rebate');
 for(const x of [-146.5,146.5])box(1,0.4,468,x,275.05,0,recess,'shelf-seam');
 body.scale.set((f.w??1200)/1200/1000,(f.h??450)/450/1000,(f.d??650)/650/1000);
 return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCherryCoffeeTableModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
