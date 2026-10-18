const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),G=require('../src/core/layout-geometry.js'),K=require('../src/core/kitchen-core.js');
const near=(p,q)=>assert(Math.hypot(p.x-q.x,p.y-q.y)<1e-6,JSON.stringify({p,q}));
const f={id:'corner',type:'counter',cx:1000,cy:1000,w:600,d:500,rot:0};
for(const scale of [.1,.5,1,2])for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const item={...f,rot,flip},[x,y]=G.corners(item)[0],options={scale,furniture:[item]};
 const hit=S.measurePoint({x:x+6/scale,y:y+5/scale},options);
 assert.equal(hit.kind,'corner');near(hit.point,{x,y});
 const threshold=S.measurePoint({x:x+12/scale,y},options);assert.equal(threshold.kind,'corner');near(threshold.point,{x,y});
 assert.notEqual(S.measurePoint({x:x+12.01/scale,y},options).kind,'corner');
 const locked=S.measurePoint({x:x+6/scale,y:y+5/scale},{...options,anchor:{x:x-1000,y}});assert.equal(locked.kind,'corner');near(locked.point,{x,y});
 const vertical=S.measurePoint({x:x+6/scale,y:y+5/scale},{...options,anchor:{x,y:y-1000}});assert.equal(vertical.kind,'corner');near(vertical.point,{x,y});
 const offAxis=S.measurePoint({x:x+6/scale,y:y+5/scale},{...options,anchor:{x:x-1000,y:y+2}});near({x:0,y:offAxis.point.y},{x:0,y:y+2});
}
const walls={scale:1,rects:[[0,0,200,1000],[-500,600,500,800]]};
const junction=S.measurePoint({x:205,y:605},walls);assert.equal(junction.kind,'corner');near(junction.point,{x:200,y:600});
const hidden=S.measurePoint({x:55,y:605},{scale:1,rects:[[0,0,200,1000],[50,600,500,800]]});assert.notEqual(hidden.kind,'corner','buried wall endpoints are not wall corners');
const competing=S.measurePoint({x:1304,y:1252},{scale:1,furniture:[f,{...f,id:'other',cx:1607,cy:1000}]});near(competing.point,{x:1307,y:1250});
assert.equal(S.measurePoint({x:1304,y:1252},{scale:1,furniture:[]}).kind,null);
const kitchen=K.configure({...f,w:2400,d:1800},{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:2400,role:'door'},{run:1,width:1200,role:'door'}]});
for(const rot of [0,37,90])for(const flip of [false,true]){
 const item={...kitchen,rot,flip};for(const ring of K.topGeometry(item).rings)for(const vertex of ring){
  const [x,y]=K.world(item,...vertex),hit=S.measurePoint({x:x+3,y:y+4},{scale:1,furniture:[item]});assert.equal(hit.kind,'corner');near(hit.point,{x,y});
 }
}
console.log('PASS corner priority, thresholds, zoom, rotation/mirror, Shift axes, visible wall junctions, nearest corner and production kitchen vertices');
