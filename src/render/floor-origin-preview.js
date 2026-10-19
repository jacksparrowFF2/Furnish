/* Temporary UV edits on production surfaces; no project or history writes. */
(function(root){
'use strict';
function contains(room,point){
 const Z=root.FurnishZoneGeometry||require('../core/zone-geometry.js');
 const rings=room.rings||[room.poly];
 // Closed boundary, including hole edges; the ray-crossing test alone excludes
 // some right/bottom corners and is unstable at floating-point intersections.
 for(const poly of rings)for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],length2=dx*dx+dy*dy,t=length2?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/length2)):0;
  if(Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy)<=1e-5)return true;
 }
 return rings.reduce((inside,poly)=>Z.inside(point,poly)?!inside:inside,false);
}
function wallEdges(plan,id){
 const W=root.FurnishWallFinish||require('../core/wall-finish-core.js'),area=plan.floorFinish?.areas[id],edges=[];if(!area?.room||!Number.isFinite(area.finishedZ))return edges;
 const walls=W.spatial(plan).walls.filter(w=>{const v=W.vertical(w,plan);return v.bottom<=area.finishedZ+1e-5&&v.top>area.finishedZ+1e-5;});
 for(const ring of area.room.rings||[area.room.poly])for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],axis=Math.abs(a[1]-b[1])<1e-5?0:Math.abs(a[0]-b[0])<1e-5?1:null;if(axis===null)continue;const normal=1-axis;
  for(const wall of walls){if(Math.min(Math.abs(a[normal]-wall[normal]),Math.abs(a[normal]-wall[normal+2]))>1e-5)continue;
   const lo=Math.max(Math.min(a[axis],b[axis]),wall[axis]),hi=Math.min(Math.max(a[axis],b[axis]),wall[axis+2]);if(hi-lo<=1e-5)continue;
   const p=a.slice(),q=a.slice();p[axis]=lo;q[axis]=hi;edges.push([p,q]);
  }
 }
 return edges;
}
function snapHandle(room,point,project,tolerance=12,edges=[],corners=(room.rings||[room.poly]).flat()){
 const at=project(point);let best=null,distance=tolerance;
 if(at)for(const corner of corners){const pixel=project(corner);if(!pixel)continue;const d=Math.hypot(pixel[0]-at[0],pixel[1]-at[1]);if(d<=distance+1e-7&&(!best||d<distance)){best=corner;distance=d;}}
 // Snap before containment: allow approaching the exact corner from just
 // outside the polygon, without allowing arbitrary outside-room placement.
 if(best)return {point:best.slice(),snapped:true,kind:'corner'};
 let edgePoint=null;
 if(at)for(const [a,b] of edges){
  const A=project(a),B=project(b);if(!A||!B)continue;const dx=B[0]-A[0],dy=B[1]-A[1],length2=dx*dx+dy*dy;if(length2<1e-12)continue;
  const s=Math.max(0,Math.min(1,((at[0]-A[0])*dx+(at[1]-A[1])*dy)/length2)),d=Math.hypot(at[0]-A[0]-s*dx,at[1]-A[1]-s*dy);if(d>distance+1e-7||edgePoint&&d===distance)continue;
  // Screen interpolation is not world interpolation under perspective. Recover
  // its fractional linear parameter from the projected world midpoint.
  const middle=project(a.map((v,i)=>(v+b[i])/2));if(!middle)continue;const m=((middle[0]-A[0])*dx+(middle[1]-A[1])*dy)/length2,den=m*(1-s)+s*(1-m);if(!(den>0))continue;
  const t=Math.max(0,Math.min(1,s*(1-m)/den));edgePoint=a.map((v,i)=>v+(b[i]-v)*t);distance=d;
 }
 return edgePoint?{point:edgePoint,snapped:true,kind:'edge'}:contains(room,point)?{point:point.slice(),snapped:false}:null;
}
// Use an equivalent grid corner inside the room when the saved datum is outside.
// A small region without any grid corner gets an interior translation handle.
function anchor(room,layout,hint){
 if(hint?.length===2&&hint.every(Number.isFinite)&&contains(room,hint))return hint.slice();
 if(contains(room,layout.origin))return layout.origin.slice();
 const F=root.FurnishFloorFinish||require('../core/floor-finish-core.js'),polys=room.polys?.length?room.polys:[room.poly],points=polys.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),center=[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2],seeds=[center,room.at,...polys.map(poly=>[poly.reduce((n,p)=>n+p[0],0)/poly.length,poly.reduce((n,p)=>n+p[1],0)/poly.length]),...points].filter(Boolean),pitch=[layout.width+layout.gap,layout.height+layout.gap];
 let best=null,distance=Infinity;
 for(const seed of seeds){const uv=F.transform(layout,seed,true).map((v,i)=>Math.floor(v/pitch[i]));for(let x=-1;x<=2;x++)for(let y=-1;y<=2;y++){const p=F.transform(layout,[(uv[0]+x)*pitch[0],(uv[1]+y)*pitch[1]]),d=Math.hypot(p[0]-center[0],p[1]-center[1]);if(d<distance&&contains(room,p)){best=p;distance=d;}}}
 return best||seeds.find(p=>contains(room,p))?.slice()||null;
}
function create(THREE){
 const originals=new Map();let roomId=null,marker=null;
 function clear(){
  for(const [geometry,array] of originals){const uv=geometry.getAttribute('uv');if(uv?.array.length===array.length){uv.array.set(array);uv.needsUpdate=true;}}
  originals.clear();roomId=null;
  if(marker){marker.removeFromParent();marker.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});marker=null;}
 }
 function remember(mesh){if(!originals.has(mesh.geometry))originals.set(mesh.geometry,mesh.geometry.getAttribute('uv').array.slice());}
 function update(plan,id,{floorGroup,wallGroup,wx=v=>v/1000,wz=v=>v/1000,handlePoint}={}){
  const F=root.FurnishFloorFinishModel||require('./floor-finish-model.js'),W=root.FurnishWallTilingModel||require('./wall-tiling-model.js'),T=root.FurnishWallTiling||require('../core/wall-tiling-core.js'),area=plan.floorFinish?.areas[id];
  if(!area?.layout||!Number.isFinite(area.finishedZ)){clear();throw Error('请先启用本区域地砖并确定完成标高');}
  if(roomId!==id)clear();roomId=id;
  let floors=0,walls=0;
  try{
   floorGroup.traverse(mesh=>{if(mesh.userData.floor&&mesh.userData.room===id){remember(mesh);F.uv(THREE,mesh.geometry,area.layout,{wx,wz});floors++;}});
   wallGroup.traverse(mesh=>{const info=mesh.userData.wallTiling;if(!info||info.roomId!==id||info.bandJoint)return;const surface=plan.wallTiling?.surfaces.find(e=>T.same(e.face,info)),e=surface&&(info.band?T.patterns(surface).find(e=>e.band?.id===info.band):surface);if(!e?.followFloor||!Number.isFinite(e.originZ))return;remember(mesh);W.uv(THREE,mesh.geometry,T.grid(e),info.rect);walls++;});
   if(!floors)throw Error('当前场景没有此区域可预览的地砖表面');
   if(!marker){marker=new THREE.Group();const ring=new THREE.Mesh(new THREE.RingGeometry(.035,.05,32),new THREE.MeshBasicMaterial({color:'#e8590c',side:THREE.DoubleSide,depthTest:false}));ring.rotation.x=-Math.PI/2;ring.renderOrder=20;marker.add(ring);marker.traverse(o=>o.userData.floorOriginMarker=true);floorGroup.add(marker);}
   const point=anchor(area.room,area.layout,handlePoint);marker.visible=!!point;
   if(point)marker.position.set(wx(point[0]),area.finishedZ/1000+.003,wz(point[1]));
   return {floors,walls,origin:[...area.layout.origin]};
  }catch(e){clear();throw e;}
 }
 function resizeHandle(camera,height){if(!marker||!height)return;const size=2*marker.position.distanceTo(camera.position)*Math.tan(camera.fov*Math.PI/360)/height*18/.05;marker.scale.setScalar(Math.max(.01,size));}
 return {update,clear,resizeHandle,get handle(){return marker?.visible?{roomId,point:marker.position.clone()}:null;},get active(){return originals.size>0;}};
}
const api={create,anchor,contains,snapHandle,wallEdges};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFloorOriginPreview=api;
})(typeof globalThis!=='undefined'?globalThis:this);
