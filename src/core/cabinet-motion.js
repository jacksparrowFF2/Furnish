/* Numeric recorder for the production cabinet builder. Dimensions and pivots
 * come from buildRaw, never from a second cabinet template implementation. */
(function(root){
 const C=()=>root.FurnishCabinet||require('./cabinet-core.js');
 const Z=()=>root.FurnishZoneGeometry||require('./zone-geometry.js');
 class Position{constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){Object.assign(this,{x,y,z});}}
 class Node{constructor(geometry=null){this.geometry=geometry;this.isMesh=!!geometry;this.isGroup=!geometry;this.children=[];this.userData={};this.position=new Position();this.rotation=new Position();this.material={clone:()=>({})};}add(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}traverse(fn){fn(this);for(const n of this.children)n.traverse(fn);}}
 class Shape{constructor(){this.points=[];this.holes=[];}moveTo(x,y){this.points.push([x,y]);}lineTo(x,y){this.points.push([x,y]);}closePath(){}absarc(){}}
 class Geometry{constructor(shape,options){this.shape=shape;this.depth=options?.depth;this.angle=0;}dispose(){}rotateX(angle){this.angle=angle;}}
 const recorder={Group:Node,Shape,Path:Shape,ExtrudeGeometry:Geometry,SphereGeometry:class{dispose(){}},Color:class{}};
 function boards(f,{includeStatic=false,...options}={}){
  C();const Model=root.FurnishCabinetModel||require('../render/cabinet-model.js');
  const box=(w,h,d,color,x,y,z)=>{const geometry=new Geometry();geometry.box=[w,h,d];const n=new Node(geometry);n.position.set(x,y+h/2,z);return n;};
  const model=Model.buildRaw(recorder,f,box,options),result=[];
  model.traverse(node=>{
   if(!node.isMesh)return;
   let moving=null,offset=[0,0,0];
   for(let n=node;n;n=n.parent){const m=n.userData.motion;if(m)moving=n;offset=offset.map((v,i)=>v+[n.position.x,n.position.y,m?.axis==='z'?m.closedZ:n.position.z][i]);}
   if(!moving&&!includeStatic)return;
   let poly,bottom,top;const g=node.geometry;
   if(g.box){const [w,h,d]=g.box;if(Math.min(w,h,d)<=0)return;poly=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];bottom=-h/2;top=h/2;}
   else if(g.shape&&Math.abs(g.angle-Math.PI/2)<1e-8){poly=g.shape.points;bottom=-g.depth;top=0;}
   else if((includeStatic||moving)&&g.shape&&!g.angle){const xs=g.shape.points.map(p=>p[0]),ys=g.shape.points.map(p=>p[1]);poly=[[Math.min(...xs),0],[Math.max(...xs),0],[Math.max(...xs),g.depth],[Math.min(...xs),g.depth]];bottom=Math.min(...ys);top=Math.max(...ys);}
   else return; // Round knobs are accessories, not boards.
   let pivot=[0,0,0];for(let n=moving;n;n=n.parent){const m=n.userData.motion;pivot=pivot.map((v,i)=>v+[n.position.x,n.position.y,m?.axis==='z'?m.closedZ:n.position.z][i]);}
   const motion=moving?.userData.motion;
   let pieces=[{poly,bottom,top}];
   if(node.userData.cabinetPegboard&&g.shape&&!g.angle)for(const hole of g.shape.holes||[]){
    if(hole.points.length!==4)continue;
    const xs=hole.points.map(p=>p[0]),ys=hole.points.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),low=Math.min(...ys),high=Math.max(...ys);
    if(!hole.points.every(([x,y])=>(x===left||x===right)&&(y===low||y===high)))continue;
    pieces=pieces.flatMap(piece=>{const x0=Math.min(...piece.poly.map(p=>p[0])),x1=Math.max(...piece.poly.map(p=>p[0])),l=Math.max(x0,left),r=Math.min(x1,right),b=Math.max(piece.bottom,low),t=Math.min(piece.top,high);
     if(r<=l||t<=b)return [piece];
     return [[x0,l,piece.bottom,piece.top],[r,x1,piece.bottom,piece.top],[l,r,piece.bottom,b],[l,r,t,piece.top]].filter(([l,r,b,t])=>r>l&&t>b).map(([l,r,b,t])=>({poly:[[l,0],[r,0],[r,g.depth],[l,g.depth]],bottom:b,top:t}));});
   }
   for(const {poly,bottom,top} of pieces)
result.push({boardIndex:result.length,poly:poly.map(([x,z])=>[(x+offset[0])*1000,(z+offset[2])*1000]),bottom:(bottom+offset[1])*1000,top:(top+offset[1])*1000,...(motion?{motion:{...motion,pivot:pivot.map(v=>v*1000),travel:(motion.travel||0)*1000}}:{}),...(includeStatic?{metadata:{...node.userData},phase:motion?(motion.axis==='z'?(moving.position.z-motion.closedZ)/(motion.travel||1):moving.rotation[motion.axis]/(motion.angle||1)):0}:{} )});
  });return result;
 }
 const cache=new Map();
 function prepare(f,pipes){
  const key=JSON.stringify([f.type,f.w,f.d,f.h,C().config(f),pipes.map(p=>[p.at,p.radius,p.vertical.top])]);if(cache.has(key))return cache.get(key);
  const z=Z(),parts=[];
  for(const board of boards(f)){
   const minX=Math.min(...board.poly.map(p=>p[0])),maxX=Math.max(...board.poly.map(p=>p[0])),minZ=Math.min(...board.poly.map(p=>p[1])),maxZ=Math.max(...board.poly.map(p=>p[1]));
   const cutters=pipes.filter(p=>p.at[0]+p.radius/Math.cos(Math.PI/64)>=minX&&p.at[0]-p.radius/Math.cos(Math.PI/64)<=maxX&&p.at[1]+p.radius/Math.cos(Math.PI/64)>=minZ&&p.at[1]-p.radius/Math.cos(Math.PI/64)<=maxZ&&p.vertical.top>board.bottom&&board.top>0).map(p=>({...p,poly:Array.from({length:64},(_,i)=>[p.at[0]+Math.cos(i*Math.PI/32)*p.radius/Math.cos(Math.PI/64),p.at[1]+Math.sin(i*Math.PI/32)*p.radius/Math.cos(Math.PI/64)])}));
   const levels=[...new Set([board.bottom,board.top,...cutters.map(p=>p.vertical.top).filter(h=>h>board.bottom&&h<board.top)])].sort((a,b)=>a-b);
   for(let i=1;i<levels.length;i++){
    const bottom=levels[i-1],top=levels[i],active=cutters.filter(p=>p.vertical.top>bottom&&top>0);
    const polys=active.length?z.decompose([board.poly,...active.map(p=>p.poly)],p=>z.inside(p,board.poly)&&!active.some(c=>z.inside(p,c.poly))):z.decompose([board.poly],p=>z.inside(p,board.poly));
    for(const poly of polys)parts.push({...board,poly,bottom,top});
   }
  }
  cache.set(key,parts);if(cache.size>64)cache.delete(cache.keys().next().value);return parts;
 }
 // Read static and current moving solids from the same builder used in 3D.
 // No device-type list: any device can query these board faces.
 const solidCache=new Map();
 const furnitureSolids=()=>root.FurnishFurnitureSolids||(typeof require==='function'?require('./furniture-solids.js'):null);
 const supportsSolids=f=>!!f&&!f.obj&&!!(furnitureSolids()?.supported(f)||f.kitchen||C().supported(f));
 const validModels=new WeakMap();
 function validModel(f,products){if(!f||typeof f!=='object')return !products.modelError(f);const key=JSON.stringify(f),old=validModels.get(f);if(old?.key===key)return old.valid;const valid=!products.modelError(f);validModels.set(f,{key,valid});return valid;}
 function solidParts(f,{furniture=[]}={}){
  if(!supportsSolids(f))return null;
  if(furnitureSolids()?.supported(f))return furnitureSolids().parts(f);
  const products=root.FurnishProducts||require('./product-rules.js');furniture=furniture.filter(v=>validModel(v,products));
  const kitchen=root.FurnishKitchen||require('./kitchen-core.js');
  // Record the actual scene inputs read by buildRaw/slabGeometry, rather than
  // invalidating every cabinet when any unrelated cabinet moves. Full device
  // records include notch/installation changes as well as their opening rings.
  const dependencies=f.kitchen?kitchen.deviceOpenings(f,furniture).map(({device,ring})=>[device,ring]):[C().sharedSides(f,furniture),C().sideOpenings(f,furniture),C().joinedSideFinishes(f,furniture)];
  const key=JSON.stringify([f,dependencies]);
  if(solidCache.has(key)){const hit=solidCache.get(key);solidCache.delete(key);solidCache.set(key,hit);return hit;}
  const K=root.FurnishKitchen||require('./kitchen-core.js'),P=root.FurnishProducts||require('./product-rules.js'),B=root.FurnishBoardCollision||require('./board-motion-collision.js'),z=Z(),records=[];
  const identity=p=>p;
  const subtract=(board,cutters)=>{
   if(!cutters.length)return [board];
   const levels=[board.bottom,board.top,...cutters.flatMap(c=>[c.bottom,c.top]).filter(y=>y>board.bottom&&y<board.top)].sort((a,b)=>a-b),out=[];
   for(let i=1;i<levels.length;i++){const bottom=levels[i-1],top=levels[i],active=cutters.filter(c=>c.top>bottom&&c.bottom<top);if(top-bottom<1e-7)continue;const polys=active.length?z.decompose([board.poly,...active.map(c=>c.poly)],p=>z.inside(p,board.poly)&&!active.some(c=>z.inside(p,c.poly))):[board.poly];for(const poly of polys)out.push({...board,poly,bottom,top});}return out;
  };
  const add=(board,transform=identity,base=0,prefix='')=>{
   if(!(board.top>board.bottom)||board.poly.length<3)return;
   const data=board.metadata||{},part=data.cabinetSection==='bottom'?'底板':data.cabinetSection==='plinth'?'踢脚底座':data.cabinetShelf?'层板':data.cabinetDivider?'隔板':data.cabinetSide==='left'?'左侧板':data.cabinetSide==='right'?'右侧板':data.cabinetTop?'顶板':data.cabinetDrawerBoard?'抽屉板':data.cabinetBasketPart?'抽屉篮架':data.cabinetPart?'柜门／抽屉':data.cabinetBay?'背板':'柜体板件';
   // Decomposition preserves notched lids instead of filling their concavities.
   for(const poly of z.decompose([board.poly],p=>z.inside(p,board.poly))){
    const piece={...board,poly},points=board.motion?B.vertices(piece,board.phase||0):[board.bottom,board.top].flatMap(y=>poly.map(([x,q])=>[x,y,q]));
    const vertices=points.map(([x,y,q])=>{const p=transform([x,q]);return [p[0],y+base,p[1]];});
    records.push({vertices,boardKey:prefix+'board:'+board.boardIndex,boardName:part,actualBoard:true});
   }
  };
  const primitive=(poly,bottom,top,name,prefix)=>add({poly,bottom,top,boardIndex:prefix,metadata:{},phase:0},identity,0,name+':');
  if(f.kitchen){
   const k=f.kitchen,base=K.baseElevation(f);
   for(const m of K.cabinetLayout(f)){
    if(m.role==='empty')continue;
    const part={...K.moduleFurniture(f,m),cx:0,cy:0,rot:0,flip:false},sideCuts=K.adjacentOpenings(f,m,K.cornerLayout(f),false).map(opening=>({...opening,bottom:K.plinth(f)+18,top:k.baseHeight-18})),angle=m.rot*Math.PI/180;
    const transform=([x,q])=>[m.x+x*Math.cos(angle)-q*Math.sin(angle),m.y+x*Math.sin(angle)+q*Math.cos(angle)];
    const local=([x,q])=>[(x-m.x)*Math.cos(angle)+(q-m.y)*Math.sin(angle),-(x-m.x)*Math.sin(angle)+(q-m.y)*Math.cos(angle)],notch=K.laundryCut(f);
    for(const b of boards(part,{includeStatic:true,sideCuts,floorOpen:!!k.laundry?.floorOpen&&m.role==='sink'})){
     const cutters=[];
     if(!b.motion&&notch.length)cutters.push({poly:notch.map(local),bottom:-100,top:k.baseHeight+100});
     if(b.metadata.cabinetTop)for(const {device,ring}of K.deviceOpenings(f,furniture).filter(v=>K.arrowSink(v.device)||v.device.sinkNotch||v.device.id?.endsWith(':sink')))cutters.push({poly:ring.map(local),bottom:k.baseHeight+40-(device.h??240)-60,top:k.baseHeight+40});
     for(const piece of subtract(b,cutters))add(piece,transform,base,'module:'+m.index+'/');
    }
   }
   for(const [i,b]of [...K.cornerBoards(f),...K.cornerPlinth(f),...K.edgeParts(f),...K.laundrySideBoards(f),...K.laundryNotchBoards(f)].entries())primitive([[b.x-b.w/2,b.y-b.d/2],[b.x+b.w/2,b.y-b.d/2],[b.x+b.w/2,b.y+b.d/2],[b.x-b.w/2,b.y+b.d/2]],b.bottom+base,b.top+base,'结构板',i);
   if(K.hasCountertop(f)){const rings=K.slabGeometry(f,furniture).rings;for(const [i,poly]of z.decompose(rings,p=>rings.reduce((inside,r)=>inside!==z.inside(p,r),false)).entries())primitive(poly,k.baseHeight+base,k.baseHeight+k.thickness+base,'台面',i);}
   for(const {key:section,furniture:part} of K.laundryParts(f).filter(p=>p.key!=='sink')){
    const [x,q]=K.local(f,part.cx,part.cy);for(const b of boards({...part,cx:0,cy:0,rot:0,flip:false},{includeStatic:true}))add(b,([a,b])=>[a+x,b+q],part.mountHeight,'laundry:'+section+'/');
   }
  }else{
   const base=f.type==='kitchenwall'?P.value(f,'mountHeight'):f.type==='vanity'?P.cabinetBase(f):0;
   for(const b of boards(f,{includeStatic:true,furniture}))add(b,identity,base);
   // A vanity's basin/mirror are separate production components, not its cavity.
   if(f.type==='vanity'){const v=P.vertical(f);if(v?.top>base+C().height(f))primitive([[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]],base+C().height(f),v.top,'浴室柜上部组件',0);}
  }
  const angle=(f.rot||0)*Math.PI/180;
  const result=records.map(record=>{const vertices=record.vertices.map(([x,y,q])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*Math.cos(angle)-q*Math.sin(angle),y,(f.cy||0)+x*Math.sin(angle)+q*Math.cos(angle)];});return {...record,vertices,p:hull(vertices.map(v=>[v[0],v[2]])),vertical:{bottom:Math.min(...vertices.map(v=>v[1])),top:Math.max(...vertices.map(v=>v[1])),source:'production-board'}};}).filter(p=>p.p.length>2);
  solidCache.set(key,result);if(solidCache.size>64)solidCache.delete(solidCache.keys().next().value);return result;
 }
 function hull(points){const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const half=p=>{const out=[];for(const v of p){while(out.length>1&&cross(out.at(-2),out.at(-1),v)<=1e-9)out.pop();out.push(v);}return out;};return half(sorted).slice(0,-1).concat(half(sorted.slice().reverse()).slice(0,-1));}
 // Clip a convex production prism to the device's height interval before 2D
 // measurement. This avoids phantom obstructions below an opened lift-up door.
 function section(part,range){
  if(!range)return part.p||hull(part.vertices.map(v=>[v[0],v[2]]));
  if(!part.vertices||!part.vertical)return part.p;
  const points=part.vertices,n=points.length/2,lo=range.bottom,hi=range.top;
  if(Math.min(hi,part.vertical.top)-Math.max(lo,part.vertical.bottom)<=1e-7)return [];
  const clipped=points.filter(p=>p[1]>=lo&&p[1]<=hi),cut=(a,b)=>{for(const y of [lo,hi])if((a[1]<y&&b[1]>y)||(b[1]<y&&a[1]>y)){const t=(y-a[1])/(b[1]-a[1]);clipped.push(a.map((v,i)=>v+t*(b[i]-v)));}};
  if(part.faces)for(const face of part.faces)for(let i=0;i<face.length;i++)cut(points[face[i]],points[face[(i+1)%face.length]]);
  else for(let i=0;i<n;i++){cut(points[i],points[(i+1)%n]);cut(points[i+n],points[(i+1)%n+n]);cut(points[i],points[i+n]);}
  return hull(clipped.map(p=>[p[0],p[2]]));
 }
 function verticalSection(part,poly){
  if(!part.vertices)return part.vertical;
  const points=part.vertices,n=points.length/2;
  let faces=part.faces?part.faces.map(face=>face.map(i=>points[i])):[points.slice(0,n),points.slice(n),...Array.from({length:n},(_,i)=>[points[i],points[(i+1)%n],points[(i+1)%n+n],points[i+n]])];
  const sign=poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-a[1]*b[0];},0)>=0?1:-1;
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],distance=p=>sign*((b[0]-a[0])*(p[2]-a[1])-(b[1]-a[1])*(p[0]-a[0])),next=[];
   // Clipping existing faces suffices for extrema; new cap vertices are exactly
   // their edge intersections, so explicit cap triangulation is unnecessary.
   for(const face of faces){const clipped=[];for(let j=0;j<face.length;j++){const p=face[j],q=face[(j+1)%face.length],d=distance(p),e=distance(q);if(d>=-1e-7)clipped.push(p);if(d*e<0){const t=d/(d-e);clipped.push(p.map((v,k)=>v+t*(q[k]-v)));}}if(clipped.length)next.push(clipped);}
   faces=next;if(!faces.length)return null;
  }
  const ys=faces.flat().map(p=>p[1]);return {bottom:Math.min(...ys),top:Math.max(...ys)};
 }
 const api={boards,prepare,supportsSolids,solidParts,section,verticalSection};root.FurnishCabinetMotion=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
