const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),G=require('../src/core/layout-geometry.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js');
const near=(p,q)=>assert(Math.hypot(p.x-q.x,p.y-q.y)<1e-6,JSON.stringify({p,q}));
const f={id:'mid',name:'mid',type:'counter',cx:1000,cy:1000,w:2400,d:1800,rot:0};
for(const scale of [.1,.5,1,2])for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const item={...f,rot,flip},ring=G.corners(item);
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],q={x:(a[0]+b[0])/2,y:(a[1]+b[1])/2},options={scale,furniture:[item]};
  const hit=S.measurePoint({x:q.x+5/scale,y:q.y+4/scale},options);assert.equal(hit.kind,'midpoint');near(hit.point,q);
  assert.equal(S.measurePoint({x:q.x+12/scale,y:q.y},options).kind,'midpoint');
  assert.notEqual(S.measurePoint({x:q.x+12.01/scale,y:q.y},options).kind,'midpoint');
  for(const anchor of [{x:q.x-2000,y:q.y},{x:q.x,y:q.y-2000}]){
   const locked=S.measurePoint({x:q.x+5/scale,y:q.y+4/scale},{...options,anchor});assert.equal(locked.kind,'midpoint');near(locked.point,q);
  }
  const off=S.measurePoint({x:q.x+5,y:q.y+4},{...options,anchor:{x:q.x-2000,y:q.y+2}});near({x:0,y:off.point.y},{x:0,y:q.y+2});
 }
}
const wall=S.measurePoint({x:205,y:505},{scale:1,rects:[[0,0,200,1000]]});assert.equal(wall.kind,'midpoint');near(wall.point,{x:200,y:500});
assert.notEqual(S.measurePoint({x:205,y:505},{scale:1,rects:[[0,0,200,1000],[150,400,400,600]]}).kind,'midpoint','buried midpoint excluded');
const short={...f,w:20,d:200};
for(const [x,kind] of [[1000,'midpoint'],[990,'corner'],[995,'corner']])assert.equal(S.measurePoint({x,y:900},{scale:1,furniture:[short]}).kind,kind,'nearest feature wins, corner wins equal distance');
const kitchen=K.configure(f,{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:2400,role:'door'},{run:1,width:1200,role:'door'}]});
for(const rot of [0,37,90])for(const flip of [false,true]){
 const item={...kitchen,rot,flip};for(const ring of K.topGeometry(item).rings)for(let i=0;i<ring.length;i++){
  const a=K.world(item,...ring[i]),b=K.world(item,...ring[(i+1)%ring.length]),q={x:(a[0]+b[0])/2,y:(a[1]+b[1])/2};
  const hit=S.measurePoint(q,{scale:1,furniture:[item]});assert.equal(hit.kind,'midpoint');near(hit.point,q);
 }
}
const measures=[{a:wall.point,b:S.measurePoint({x:1005,y:104},{scale:1,furniture:[f]}).point}],payload={planId:'midpoints',current:{furniture:[],measures},designs:[],catalog:[]};
assert.deepEqual(P.unpack(P.pack(payload)).current.measures,measures);
console.log('PASS wall/furniture midpoints, thresholds, zoom, rotation/mirror, Shift, nearest feature/ties, hidden wall midpoint, production kitchen edges and project roundtrip');
