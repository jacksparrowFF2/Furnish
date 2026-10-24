/* YESWOOD folding table: production geometry shared by scene and preview.
 * All dimensions are mm until mesh construction; no external texture assets. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const products=()=>root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
const supported=f=>products().family(f,'folding-table')&&!f.obj;
function build(T,input){
 const P=products(),target=P.foldingTableGeometry(input),f={...input,w:target.diameter,d:target.diameter*target.ratio,h:760},s=P.foldingTableGeometry(f),g=new T.Group(),frame=new T.Group(),h=P.height(f),m=v=>v/1000;
 const sx=f.w/s.diameter,sz=s.fullDepth/s.diameter,sy=h/760,top=s.top*sy,stone=5*sy,leg=s.leg*sx,apron=s.apron*sy;
 const wood=new T.MeshStandardMaterial({color:f.color||'#bd925f',roughness:.64}),ivory=new T.MeshStandardMaterial({color:'#f4f3ee',roughness:.30}),metal=new T.MeshStandardMaterial({color:'#65645e',metalness:.65,roughness:.4});
 function add(geometry,material,part,parent=g){const mesh=syncIdentity.produce("folding-table-model:site-1",()=>new T.Mesh(geometry,material));mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.foldingTablePart=part;parent.add(mesh);return mesh;}
 function box(w,height,d,x,y,z,part,material=wood,parent=frame){const o=syncIdentity.produce("folding-table-model:site-2",()=>add(new T.BoxGeometry(m(w),m(height),m(d)),material,part,parent));o.position.set(m(x),m(y+height/2),m(z));return o;}
 // A shared polygon defines the exact same chord cuts in the SVG and each slab.
 function slab(region,folded,side){
  const pts=P.foldingTableOutline(f,region),shape=new T.Shape();pts.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
  const hinge=side>0?s.cut+s.offset:-s.backCut+s.offset;
  const group=new T.Group();group.userData.foldingTablePart=region+'-leaf';group.userData.folded=folded;g.add(group);
  for(const [start,depth,mat,label] of syncIdentity.items("folding-table-model.js:generator-1",[["item-a",[stone,top-stone,wood,'wood-edge']],["item-b",[0,stone,ivory,'ivory-top']]])){
   const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:12}),a=geo.attributes.position;
   for(let i=0;i<a.count;i++){
    const x=a.getX(i),t=a.getZ(i)+start;let z=a.getY(i);
    // Fine ivory joints expose the wood below, rather than coplanar dark decals.
    if(label==='ivory-top'&&!folded){for(const [edge,sign,down] of [[s.cut+s.offset,1,s.pose!=='round'],[-s.backCut+s.offset,-1,s.pose==='capsule']])if(!down&&Math.abs(z-edge)<.001)z+=(region==='center'?-sign:sign)*.45;}
    // Reference closed poses have the wings stored under the top, without
    // hanging semicircles. Approximate a 180-degree fold at the underside.
    a.setXYZ(i,m(x),m(folded?h-2*top+t:h-t),m(folded?2*hinge-z:z));
   }
   a.needsUpdate=true;geo.computeVertexNormals();syncIdentity.produce("folding-table-model:site-3",()=>add(geo,mat,region+'-'+label,group));
  }
 }
 syncIdentity.produce("folding-table-model:site-4",()=>slab('center',false,0));syncIdentity.produce("folding-table-model:site-5",()=>slab('front',s.pose!=='round',1));syncIdentity.produce("folding-table-model:site-6",()=>slab('back',s.pose==='capsule',-1));
 // Rounded solid legs and a rectangular apron are appearance estimates. The
 // 75 / 120 / 32 reference dimensions apply at nominal size, not hidden joinery.
 const zLeg=Math.min(s.cut,s.backCut)-top-leg/2-8*sz,xLeg=Math.min(f.w*.31,Math.sqrt(1-(2*zLeg/s.fullDepth)**2)*f.w/2-leg*.8),legH=h-2*top;
 g.add(frame);frame.position.z=m(s.offset);
 for(const x of syncIdentity.items("folding-table-model.js:generator-2",[["item-a",-xLeg],["item-b",xLeg]]))for(const z of syncIdentity.items("folding-table-model.js:generator-3",[["item-a",-zLeg],["item-b",zLeg]])){
  const radius=leg/2,shape=new T.Shape(),k=.5522848;
  shape.moveTo(-radius,0);shape.bezierCurveTo(-radius,k*radius,-k*radius,radius,0,radius);shape.bezierCurveTo(k*radius,radius,radius,k*radius,radius,0);shape.bezierCurveTo(radius,-k*radius,k*radius,-radius,0,-radius);shape.bezierCurveTo(-k*radius,-radius,-radius,-k*radius,-radius,0);
  const geo=new T.ExtrudeGeometry(shape,{depth:legH,bevelEnabled:false,curveSegments:10});geo.rotateX(-Math.PI/2);geo.scale(.001,.001,.001);
  const o=syncIdentity.produce("folding-table-model:site-7",()=>add(geo,wood,'leg',frame));o.position.set(m(x),0,m(z));
 }
 for(const z of syncIdentity.items("folding-table-model.js:generator-4",[["item-a",-zLeg],["item-b",zLeg]]))syncIdentity.produce("folding-table-model:site-8",()=>box(xLeg*2,apron,22*sx,0,legH-apron,z,'front-apron'));
 for(const x of syncIdentity.items("folding-table-model.js:generator-5",[["item-a",-xLeg],["item-b",xLeg]]))syncIdentity.produce("folding-table-model:site-9",()=>box(22*sx,apron,zLeg*2,x,legH-apron,0,'side-apron'));
 for(const z of syncIdentity.items("folding-table-model.js:generator-6",[["item-a",-s.fullDepth*.08],["item-b",s.fullDepth*.08]]))syncIdentity.produce("folding-table-model:site-10",()=>box(xLeg*2+22*sx,top,32*sz,0,legH,z,'central-batten'));
 // Recessed pull, hinge plates and sliding support arms give scale to the fold.
 for(const side of syncIdentity.items("folding-table-model.js:generator-7",[["item-a",-1],["item-b",1]])){
  syncIdentity.produce("folding-table-model:site-11",()=>box(95*sx,9*sy,2*sz,0,legH-18*sy,side*(zLeg+12*sz),'recessed-pull',metal));
  for(const x of syncIdentity.items("folding-table-model.js:generator-8",[["item-a",-xLeg*.65],["item-b",xLeg*.65]])){
   syncIdentity.produce("folding-table-model:site-12",()=>box(34*sx,4*sy,40*sz,x,h-top-4*sy,side*(side>0?s.cut:s.backCut)-side*23*sz,'hinge',metal));
   const open=side>0?s.pose==='round':s.pose!=='capsule',length=open?s.fullDepth*.22:s.fullDepth*.10;
   syncIdentity.produce("folding-table-model:site-13",()=>box(25*sx,16*sy,length,x,open?h-top-23*sy:legH-20*sy,side*(zLeg+(open?length*.25:-length*.5)),'support-arm',metal));
  }
 }
 // Deterministic subtle grain carved into the material shader; works offline
 // and follows local mm geometry. No canvas or generated texture dependency.
 wood.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 tableLocal;').replace('#include <begin_vertex>','#include <begin_vertex>\ntableLocal = position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 tableLocal;').replace('#include <color_fragment>','#include <color_fragment>\nfloat grain = sin(tableLocal.x * 1150.0 + sin(tableLocal.y * 19.0 + tableLocal.z * 38.0) * 5.0); diffuseColor.rgb *= 0.96 + 0.04 * grain;');
 };
 wood.customProgramCacheKey=()=> 'folding-table-grain-v1';
 g.scale.set(input.w/target.diameter,P.height(input)/760,target.fullDepth/target.diameter);const result=new T.Group();result.add(g);result.userData.foldingTable=true;return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFoldingTableModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
