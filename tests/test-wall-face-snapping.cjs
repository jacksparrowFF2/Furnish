const assert=require('node:assert/strict'),C=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
// Contact is between production rectangles, with mm end caps independent of tracing scale.
for(const caps of [undefined,[0,0],[20,70]])for(const turn of [0,1])for(const flip of [false,true])for(const mode of ['a','b'])for(const scale of [1,10,23.7]){
 const transform=p=>{const v=flip?p.map(x=>2000-x):p;return (turn?[v[1],v[0]]:v).map(x=>x/scale);},cap=caps?caps[flip?1:0]:30;
 const target={id:'target',a:transform([300,500]),b:transform([1300,500]),thickness:100,kind:'n',...(caps?{caps}:{} )};
 const w={id:'wall',a:transform([800,800]),b:transform([800,570+cap]),thickness:60,kind:'n',...(caps?{caps}:{} )};if(mode==='a')[w.a,w.b]=[w.b,w.a];
 const draft={scale,width:2500/scale,height:2500/scale,walls:[target,w]},original=JSON.stringify(draft),hit=C.snapWall(draft,w,{mode,radius:20/scale});
 assert(hit,'inclusive radius');assert.equal(hit.kind,'face');assert.equal(hit.target,'target');near(hit.distance,20);assert.equal(JSON.stringify(draft),original,'input remains unchanged');assert.deepEqual(hit.wall[mode==='a'?'b':'a'],w[mode==='a'?'b':'a'],'opposite endpoint stays fixed');assert.deepEqual(hit.wall.caps,w.caps,'preserve imported caps');
 const axis=turn?0:1,other=1-axis,after=[target,hit.wall],r=C.wallRect(hit.wall,scale,after),t=C.wallRect(target,scale,after);near(r[axis+(flip?2:0)],t[axis+(flip?0:2)]);near(hit.wall[mode][other],w[mode][other]);
 assert.equal(C.snapWall(draft,w,{mode,radius:19.99/scale}),null,'outside radius');assert.equal(C.snapWall(draft,w,{mode,radius:1000/scale,exclude:['target']}),null,'excluded face');
}
const target={id:'target',a:[300,500],b:[1300,500],thickness:100,kind:'n',caps:[0,0]},w={id:'wall',a:[800,700],b:[800,560],thickness:60,kind:'n',caps:[0,0]},d={scale:1,width:2000,height:2000,walls:[target,w]},snap=v=>C.snapWall(d,v,{mode:'b',radius:12});
for(const x of [250,290,1310,1350])assert.equal(snap({...w,a:[x,700],b:[x,560]}),null,'finite target face must cover full wall end');
assert.equal(snap({...w,a:[800,600],b:[800,560]}).wall.b[1],550,'can grow to exactly 50');
assert.equal(snap({...w,a:[800,599.99],b:[800,560]}),null,'reject contact shorter than 50');
assert.equal(snap({...w,a:[800,500],b:[800,560]}),null,'cannot cross the fixed end to catch another surface');
assert.equal(snap({...w,a:[800,700],b:[800,440]}),null,'cannot snap through a wall to its far face');
const overlap=snap({...w,b:[800,540]});assert(overlap);assert.deepEqual(overlap.wall.b,[800,550],'remove shallow overlap as well as gap');
const pointerContact=snap({...w,b:[800,550],caps:undefined});assert(pointerContact);assert.deepEqual(pointerContact.wall.b,[800,580],'drag handle directly onto face: account for the actual cap');
assert.equal(C.snapWall({...d,openings:[{id:'door',wall:'target',t:.5,length:200,kind:'door'}]},w,{mode:'b',radius:12}),null,'an opening is not a solid wall surface');
assert(C.snapWall({...d,openings:[{id:'door',wall:'target',t:.1,length:100,kind:'door'}]},w,{mode:'b',radius:12}),'opening elsewhere does not hide the solid surface');
// Production room area changes by precisely the additional footprint, then survives project restore.
const base=fixture(),draft=copy(base.draft);
// Use a self-contained box, preserving the fixture project/work defaults for pack/unpack.
Object.assign(draft,{width:2000,height:2000,scale:1,walls:[
 {id:'north',a:[100,100],b:[1900,100],thickness:100,kind:'n',caps:[0,0]},
 {id:'east',a:[1900,100],b:[1900,1900],thickness:100,kind:'n',caps:[0,0]},
 {id:'south',a:[1900,1900],b:[100,1900],thickness:100,kind:'n',caps:[0,0]},
 {id:'west',a:[100,1900],b:[100,100],thickness:100,kind:'n',caps:[0,0]},
 {id:'short',a:[800,1710],b:[800,1760],thickness:130,kind:'n'}
],openings:[]});delete draft.zones;delete draft.zoneSplits;delete draft.roomLayout;
const before=C.build(draft),attached=C.snapWall(draft,draft.walls.at(-1),{mode:'b',radius:25});assert(attached);draft.walls[draft.walls.length-1]=attached.wall;near(attached.wall.b[1]-attached.wall.a[1],75);const after=C.build(draft);assert.equal(after.rooms.length,1);near(P.quantities(before).net-P.quantities(after).net,130*25/1e6);assert.equal(after.rooms[0].rings?.length||1,1,'flush contact leaves no enclosed island');
let work={...base.work,architecture:{phase:'survey',draft}},restore=W.create({makeId:()=> 'face_roundtrip',colorFor:()=> '#ddd',materials:{wood:{}}});
for(let i=0;i<3;i++){const loaded=P.unpack(P.pack({planId:draft.id,current:work,designs:[{name:'墙面吸附',work}],catalog:[]}));work=restore.restore(loaded.current,C.build(loaded.current.architecture.draft));assert.deepEqual(work.architecture.draft.walls.at(-1),attached.wall);near(P.quantities(C.build(work.architecture.draft)).net,P.quantities(after).net);}
console.log('PASS finite wall-face contact, physical caps, both endpoints/axes/reflections/calibrations, radius/minimum boundaries, no far-face snap, production area and repeated project restoration');
