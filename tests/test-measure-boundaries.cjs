const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),K=require('../src/core/kitchen-core.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),f={id:'a',name:'A',type:'block',cx:0,cy:0,w:100,d:100,rot:0};
const base={scale:1,rects:[[100,-100,120,100]],furniture:[f]};
const before=JSON.stringify(base);
close(S.point({x:55,y:17},base).x,50);close(S.point({x:55,y:17},base).y,17);
assert.equal(S.measurePoint({x:62,y:17},base).edge!==null,true); // Exactly 12px included.
assert.equal(S.measurePoint({x:61.99,y:17},base).edge!==null,true);
assert.equal(S.measurePoint({x:62.01,y:17},base).edge,null);
assert.equal(S.measurePoint({x:62,y:17},{...base,scale:.5}).edge!==null,true);
assert.equal(S.measurePoint({x:102,y:500},base).edge,null); // No infinite wall extension.
for(const scale of [.1,.5,1,2])for(const kind of ['wall','furniture']){
 const options={scale,rects:kind==='wall'?[[100,-1000,120,1000]]:[],furniture:kind==='furniture'?[{...f,w:2000,d:2000}]:[]};
 const x=kind==='wall'?100:1000,sign=kind==='wall'?-1:1;
 for(const anchor of [undefined,{x:0,y:17}]){
  const hit=S.measurePoint({x:x+sign*12/scale,y:17},{...options,anchor});
  assert(hit.edge);close(hit.point.x,x);close(hit.point.y,17);
  assert.equal(S.measurePoint({x:x+sign*12.01/scale,y:17},{...options,anchor}).edge,null);
 }
}
for(const flip of [false,true]){
 const rotated={...f,rot:45,flip},q=S.point({x:38,y:38},{scale:1,rects:[],furniture:[rotated]});
 close(q.x+q.y,Math.SQRT2*50);
 const locked=S.point({x:38,y:38},{scale:1,rects:[],furniture:[rotated],anchor:{x:0,y:30}});
 close(locked.y,30);close(locked.x,Math.SQRT2*50-30); // Axis constraint and actual sloping boundary both hold.
}
const m=S.nearest(f,base);close(m.distance,50);assert(m.perpendicular);assert.equal(m.entity.kind,'wall');
const other={...f,id:'b',cx:170,cy:0};
close(S.nearest(f,{rects:[],furniture:[f,other]}).distance,70);
const short={...other,w:20,d:20,cy:17};const inner=S.nearest(f,{furniture:[short]});close(inner.distance,110);assert(inner.perpendicular); // Target endpoints project back onto source edge.
const corner=S.nearest(f,{furniture:[{...other,cy:170}]});close(corner.distance,Math.hypot(70,70));assert(!corner.perpendicular);
for(const cx of [100,99.999,0])close(S.nearest(f,{furniture:[{...other,cx}]}).distance,Math.max(0,cx-100));
const containing={...other,cx:0,w:500,d:500};close(S.nearest(f,{furniture:[containing]}).distance,0);
assert.equal(S.nearest(f,{furniture:[f]}),null);
for(const rot of [0,45,90,180])for(const flip of [false,true]){
 const a=rot*Math.PI/180,transform=g=>({...g,rot,flip,cx:g.cx*Math.cos(a)-g.cy*Math.sin(a),cy:g.cx*Math.sin(a)+g.cy*Math.cos(a)});
 const result=S.nearest(transform(f),{furniture:[transform(other)]});close(result.distance,70);assert(result.perpendicular);
}
const kitchen=K.configure({...f,type:'counter',id:'k'},{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'door'},{run:1,width:900,role:'door'}]});
const ring=K.topGeometry(kitchen).rings[0],point=K.world(kitchen,...ring[0]);
assert(S.measurePoint({x:point[0],y:point[1]},{scale:1,furniture:[kitchen]}).edge);
for(const rot of [0,45,180])for(const flip of [false,true]){
 const k={...kitchen,rot,flip},at=K.world(k,300,300),item={...f,id:'notch',cx:at[0],cy:at[1],rot};
 close(S.nearest(item,{furniture:[k]}).distance,400); // L courtyard is empty, not the outer bounding rectangle.
}
const P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js');
const surrounding={rects:[[-500,-500,500,-450],[-500,300,500,350],[300,-500,350,500]],furniture:[f,{...f,id:'left',cx:-200},{...f,id:'right',cx:170},{...f,id:'up',cy:-170}]};
const directions=S.directional(f,surrounding);
for(const [dir,value] of Object.entries({l:100,r:70,t:70,b:250})){close(directions[dir].distance,value);const {a,b}=directions[dir];close(dir==='l'||dir==='r'?a.y:a.x,dir==='l'||dir==='r'?b.y:b.x);}
assert.equal(directions.r.entity.id,'right');assert.equal(directions.b.entity.kind,'wall');
for(const rotation of [0,90,180,270]){
 const order=['r','b','l','t'],rotated=S.directional(f,{...surrounding,rotation});
 for(let i=0;i<4;i++)close(rotated[order[(i+rotation/90)%4]].distance,directions[order[i]].distance);
}
assert.deepEqual(S.directional(f,{furniture:[f,{...f,id:'diagonal',cx:170,cy:170}]}),{l:null,r:null,t:null,b:null});
assert.deepEqual(S.directional(f,{furniture:[{...f,id:'contained',w:20,d:20}]}),{l:null,r:null,t:null,b:null});
const offcenter=S.directional(f,{furniture:[{...f,id:'off-center',cx:170,cy:55,w:20,d:20}]}).r;close(offcenter.distance,110);assert(offcenter.a.y>=45&&offcenter.a.y<=50);
for(const gap of [0,.999,1,1.001])close(S.directional(f,{rects:[[50+gap,-100,70+gap,100]]}).r.distance,gap);
close(S.directional(f,{furniture:[{...f,id:'overlap',cx:75}]}).r.distance,0);
close(S.directional({...f,rot:45},{rects:[[100,-100,120,100]]}).r.distance,100-50*Math.SQRT2);
assert.equal(S.directional({...f,type:'washer',h:200,mountHeight:0},{furniture:[{...other,type:'dryer',h:200,mountHeight:3000}]}).r,null); // Known separated heights do not compete for planar clearance.
for(const flip of [false,true]){
 const k={...kitchen,flip},at=K.world(k,300,300),item={...f,id:'courtyard',cx:at[0],cy:at[1]},d=S.directional(k,{furniture:[item]});
 close(d[flip?'l':'r'].distance,550);close(d.b.distance,400);
}
const directionMeasures=Object.values(directions).map(({a,b})=>({a,b}));
assert.deepEqual(P.unpack(P.pack({planId:'measurement',current:{furniture:[],measures:directionMeasures},designs:[],catalog:[]})).current.measures,directionMeasures);
const work={furniture:[],rooms:{},measures:[{a:m.a,b:m.b}],open:{},notes:[],demolished:[]},payload={planId:'measurement',current:work,designs:[{name:'measure',work}],catalog:[]};
assert.deepEqual(P.unpack(P.pack(payload)),payload);
const restore=W.create({makeId:()=> 'id',colorFor:()=> '#fff',materials:{}}).restore,plan={id:'measurement',rooms:[],defaults:[]},first=restore(structuredClone(work),plan);
assert.deepEqual(restore(structuredClone(first),plan),first);assert.deepEqual(first.measures,work.measures);
assert.equal(JSON.stringify(base),before);
console.log('PASS finite-edge capture, tolerance thresholds, constrained oblique snapping, nearest perpendicular/corner/contact, transforms and project restoration');
