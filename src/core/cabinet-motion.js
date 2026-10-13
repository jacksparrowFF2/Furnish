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
 function boards(f){
  C();const Model=root.FurnishCabinetModel||require('../render/cabinet-model.js');
  const box=(w,h,d,color,x,y,z)=>{const geometry=new Geometry();geometry.box=[w,h,d];const n=new Node(geometry);n.position.set(x,y+h/2,z);return n;};
  const model=Model.buildRaw(recorder,f,box),result=[];
  model.traverse(node=>{
   if(!node.isMesh)return;
   let moving=null,offset=[0,0,0];
   for(let n=node;n;n=n.parent){const m=n.userData.motion;if(m)moving=n;offset=offset.map((v,i)=>v+[n.position.x,n.position.y,m?.axis==='z'?m.closedZ:n.position.z][i]);}
   if(!moving)return;
   let poly,bottom,top;const g=node.geometry;
   if(g.box){const [w,h,d]=g.box;if(Math.min(w,h,d)<=0)return;poly=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];bottom=-h/2;top=h/2;}
   else if(g.shape&&Math.abs(g.angle-Math.PI/2)<1e-8){poly=g.shape.points;bottom=-g.depth;top=0;}
   else return; // Round knobs are accessories, not boards.
   let pivot=[0,0,0];for(let n=moving;n;n=n.parent){const m=n.userData.motion;pivot=pivot.map((v,i)=>v+[n.position.x,n.position.y,m?.axis==='z'?m.closedZ:n.position.z][i]);}
   result.push({boardIndex:result.length,poly:poly.map(([x,z])=>[(x+offset[0])*1000,(z+offset[2])*1000]),bottom:(bottom+offset[1])*1000,top:(top+offset[1])*1000,motion:{...moving.userData.motion,pivot:pivot.map(v=>v*1000),travel:(moving.userData.motion.travel||0)*1000}});
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
 const api={boards,prepare};root.FurnishCabinetMotion=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
