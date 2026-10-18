const assert=require('node:assert/strict'),C=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const base=fixture(),short={id:'short',a:[150,20],b:[155,20],kind:'n',thickness:130,caps:[0,0]},d=copy(base.draft);d.walls.push(short);
assert.equal(C.minWallLength,50);C.validate(d);const plan=C.build(d);assert(plan.walls.some(r=>Math.abs(r[2]-r[0]-50)<1e-6&&Math.abs(r[3]-r[1]-130)<1e-6),'production short-wall rectangle');
for(const length of [49.99,0]){const invalid=copy(d);invalid.walls.at(-1).b[0]=150+length/d.scale;assert.throws(()=>C.validate(invalid),/Wall too short/);}
// Exercise all axis directions and reflection using explicit imported caps and ordinary traced caps.
for(const caps of [undefined,[0,0],[20,70]])for(const turn of [0,1])for(const flip of [false,true]){
 const transform=p=>{let [x,y]=turn?[p[1],p[0]]:p;return [flip?2000-x:x,y];};
 const target={id:'target',a:transform([500,500]),b:transform([1000,500]),thickness:100,kind:'n',...(caps?{caps}:{} )};
 const w={id:'move',a:transform([580,660]),b:transform([580,710]),thickness:60,kind:'n',...(caps?{caps}:{} )};
 for(const scale of [1,10,23.7]){
  const walls=[target,w].map(v=>({...copy(v),a:v.a.map(x=>x/scale),b:v.b.map(x=>x/scale)})),draft={scale,width:2000/scale,height:2000/scale,walls},before=JSON.stringify(draft);
  const hit=C.snapWall(draft,walls[1],{radius:200/scale});assert(hit);assert.equal(JSON.stringify(draft),before);near(Math.hypot(hit.wall.b[0]-hit.wall.a[0],hit.wall.b[1]-hit.wall.a[1])*scale,50);assert.equal(hit.wall.thickness,60);
  const scene=[walls[0],hit.wall],physical=hit.point.map(v=>v*scale);assert(C.wallCorners(hit.wall,scale,scene).some(p=>Math.hypot(p[0]-physical[0],p[1]-physical[1])<1e-6));assert(C.wallCorners(walls[0],scale,scene).some(p=>Math.hypot(p[0]-physical[0],p[1]-physical[1])<1e-6));
  assert(C.snapWall(draft,walls[1],{radius:hit.distance/scale}),'exact radius inclusive');assert.equal(C.snapWall(draft,walls[1],{radius:(hit.distance-.01)/scale}),null,'just outside radius');
  assert.equal(C.snapWall(draft,walls[1],{radius:1000/scale,exclude:['target']}),null);
 }
}
const target={id:'target',a:[500,500],b:[1000,500],thickness:100,kind:'n',caps:[0,0]},wall={id:'resize',a:[530,700],b:[530,560],thickness:60,kind:'n',caps:[0,0]},scene={scale:1,width:2000,height:2000,walls:[target,wall]};
const end=C.snapWall(scene,wall,{mode:'b',radius:12});assert(end);assert.equal(end.kind,'corner');assert.deepEqual(end.wall.a,wall.a);assert.deepEqual(end.wall.b,[530,550]);const face=C.snapWall(scene,{...wall,a:[540,700],b:[540,560]},{mode:'b',radius:12});assert.equal(face.kind,'face');assert.deepEqual(face.wall.a,[540,700]);assert.deepEqual(face.wall.b,[540,550],'face snap cannot shift off original axis');
const self={...scene,walls:[wall]};assert.equal(C.snapWall(self,wall,{radius:100}),null,'never snap to self');
// Full project + work restoration must retain 50 mm walls and explicit caps without drift.
let work={...base.work,architecture:{phase:'survey',draft:d}};const restore=W.create({makeId:()=> 'roundtrip',colorFor:()=> '#ddd',materials:{wood:{}}});
for(let i=0;i<3;i++){const packed=P.pack({planId:d.id,current:work,designs:[{name:'短墙',work}],catalog:[]}),loaded=P.unpack(packed);work=restore.restore(loaded.current,C.build(loaded.current.architecture.draft));assert.deepEqual(work.architecture.draft.walls.at(-1),short);C.build(work.architecture.draft);assert.deepEqual(loaded.designs[0].work.architecture.draft.walls.at(-1),short);}
const locked=copy(base.draft),next=copy(locked);next.walls[0].a[0]+=1;assert.throws(()=>P.assertStructure(locked,next),/locked/);
console.log('PASS 50 mm production geometry, rejection below threshold, actual corner snap, radius boundary, axes/reflection/caps/calibration, exclusions, endpoint constraints and repeated project restoration');
