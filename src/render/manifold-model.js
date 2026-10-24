/* Generic photo-inspired manifold. All undocumented dimensions are layout estimates. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>f.type==='heating_manifold'&&!f.obj;
function build(T,f){
 const P=products(),m=P.manifoldLayout(f),g=new T.Group(),body=new T.Group();g.add(body);
 const brass=new T.MeshStandardMaterial({color:f.color||'#c6a258',metalness:.72,roughness:.32}),grey=new T.MeshStandardMaterial({color:'#aeb8b1',roughness:.65}),black=new T.MeshStandardMaterial({color:'#303635',roughness:.88}),red=new T.MeshStandardMaterial({color:'#bb3931',roughness:.48}),blue=new T.MeshStandardMaterial({color:'#254f9d',roughness:.43}),steel=new T.MeshStandardMaterial({color:'#a5aaa5',metalness:.7,roughness:.38}),white=new T.MeshStandardMaterial({color:'#eceee8',roughness:.5});
 const h=P.height(f),left=-f.w/2,right=f.w/2,z=-10;
 function mesh(geo,mat,x,y,z,part){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.userData.manifoldPart=part;o.castShadow=o.receiveShadow=true;body.add(o);return o;}
 function box(w,h,d,x,y,z,mat,part){return mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,part);}
 function pipe(a,b,r,mat,part,segments=16){const v=new T.Vector3(...b).sub(new T.Vector3(...a)),o=mesh(new T.CylinderGeometry(r,r,v.length(),segments),mat,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,part);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
 // A quarter-circle tube with tangent endpoints; the same production vertices feed solid checks.
 function elbow(x,y,z,r){
  const radial=16,steps=16,vertices=[],normals=[],indices=[],geo=new T.BufferGeometry();geo.solidPieces=[];
  for(let i=0;i<=steps;i++){const a=Math.PI-i*Math.PI/2/steps;for(let j=0;j<radial;j++){const b=j*2*Math.PI/radial,c=Math.cos(b),s=Math.sin(b);vertices.push(x+(r+18*c)*Math.cos(a),y+(r+18*c)*Math.sin(a),z+18*s);normals.push(c*Math.cos(a),c*Math.sin(a),s);}}
  for(let i=0;i<steps;i++){
   const faces=[];for(let j=0;j<radial;j++){const k=(j+1)%radial,a=i*radial+j,b=i*radial+k,c=(i+1)*radial+j,d=(i+1)*radial+k;indices.push(a,b,c,b,d,c);faces.push([j,k,radial+k,radial+j]);}
   faces.push(Array.from({length:radial},(_,j)=>j),Array.from({length:radial},(_,j)=>radial+j));geo.solidPieces.push({indices:Array.from({length:radial*2},(_,j)=>i*radial+j),faces});
  }
  geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setIndex(indices);return mesh(geo,grey,0,0,0,'main-elbow');
 }
 // Rear wall brackets carry both headers. No enclosing cabinet/box is added.
 for(const x of [m.inlet+28,right-28]){box(14,h*.47,8,x,h*.64,-66,steel,'bracket');for(const y of [h*.48,h*.82])box(34,12,56,x,y,-39.2,steel,'bracket-foot');}
 for(const [row,y,length] of [[0,h*.82,m.lengths.upper],[1,h*.48,m.lengths.lower]]){
  const start=m.inlet-length+18,r=Math.min(40,(length-18)/2);
  pipe([start,0,z],[start,y-r,z],18,grey,'main-riser');
  elbow(start+r,y-r,z,r);
  pipe([start+r,y,z],[m.inlet,y,z],18,grey,'main-horizontal');
  // Hexagonal unions and blue isolation lever.
  pipe([m.inlet-22,y,z],[m.inlet+20,y,z],24,brass,'union',6);
  pipe([m.inlet-8,y,z],[m.inlet-8,y,65],10,steel,'valve-stem');
  box(12,75,10,m.inlet-8,y+24,65,blue,'main-valve');
  pipe([m.inlet+20,y,z],[right-20,y,z],19,brass,'header');
  pipe([right-28,y,z],[right,y,z],23,brass,'end-cap',6);
  pipe([right-34,y,z],[right-34,y+52,z],9,brass,'vent');box(15,8,15,right-34,y+56,z,red,'vent-cap');
  for(let i=0;i<m.loops;i++){
   const x=m.inlet+65+i*m.pitch,branchZ=row===0?-42:25;
   pipe([x,y-4,z],[x,y-48,branchZ],11,brass,'branch-union',6);
   pipe([x,y-39,branchZ],[x,y-39,branchZ+24],7,steel,'branch-stem');
   box(29,7,11,x,y-39,branchZ+25,red,'branch-valve');
   pipe([x,y-54,branchZ],[x,0,branchZ],10,black,'loop-pipe');
   for(const end of [18,y-58])pipe([x,end-5,branchZ],[x,end+5,branchZ],12,steel,'pipe-collar');
  }
 }
 // Small generic control head, without a fictitious brand or display text.
 box(60,h*70/900,35,m.inlet-8,h*(1-35/900),-8,white,'control-head');
 pipe([m.inlet-8,h*.82+19,z],[m.inlet-8,h*(1-70/900),z],7,grey,'control-neck');
 // Side and bottom limits are physical pipe extents, not an invisible bounding box.
 body.scale.set(.001,.001,f.d/140*.001);body.position.y=P.value(f,'mountHeight')/1000;
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishManifoldModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
