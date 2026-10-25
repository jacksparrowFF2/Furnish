'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),Project=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),Models=require('../src/render/sliding-opening-model.js');
const near=(a,b,t=.001)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const a={id:'a',name:'三联动',type:'tripleslidingdoor',cx:0,cy:0,w:2400,d:90,h:2400,rot:0,color:'#727571'},b={...a,id:'b',name:'双联动',type:'doubleslidingdoor',cx:1200,cy:900,w:1800,rot:90};
const joint=P.slidingCorner(a,[a,b]);assert.equal(joint.side,'right');assert.equal(P.slidingCorner(b,[a,b]).side,'left');
for(const change of [{cy:1100},{cx:0},{rot:0},{rot:85},{h:2410},{obj:{positions:[0,0,0]}}])assert.equal(P.slidingCorner(a,[a,{...b,...change}]),null);
assert.ok(P.slidingCorner(a,[a,{...b,cy:946}]));assert.equal(P.slidingCorner(a,[a,{...b,cy:946.01}]),null);
assert.ok(P.slidingCorner(a,[a,{...b,h:2401}]));assert.equal(P.slidingCorner(a,[a,{...b,h:2401.01}]),null);
assert.equal(P.slidingCorner(a,[a,b,{...b,id:'c'}]),null,'ambiguous partners preserve both posts');
assert.equal(P.slidingCorner({...a,type:'slidingdoor'},[a,b]),null,'ordinary two-panel door is unchanged');
assert.equal(P.value(b,'floorTrack'),false);assert.equal(P.height({...b,h:undefined}),2400);
const work={furniture:[a,b]},plans=require('../src/data/plans.js');
const payload={planId:plans[0].id,current:work,designs:[{name:'转角',work}],catalog:[]};
const round=Project.unpack(Project.pack(payload));assert.deepEqual(round.current,work);assert.deepEqual(round.designs[0].work,work);
assert.deepEqual(P.slidingCorner(round.current.furniture[0],round.current.furniture),joint);
assert.equal(D.replaceFurniture({...b,floorTrack:true},{...a}).floorTrack,true);
assert.equal(D.replaceFurniture({...b,floorTrack:true},{...b,type:'tv'}).floorTrack,undefined);
assert.throws(()=>Project.validateWork({furniture:[{...b,floorTrack:'true'}]}));
const plan={furnitureDatum:'finished-floor',rooms:[],floorFinish:{regions:[]}};
assert.equal(P.slidingCorner(a,[a,b],plan),null,'unknown actual floor elevations cannot establish a rail joint');
const Floors=require('../src/core/floor-finish-core.js'),fixture=require('./helpers/wall-finish-fixture.cjs').fixture({partition:true}),roomIds=fixture.plan.rooms.map(r=>r.id);
let floorWork=Floors.setLayers(fixture.work,fixture.plan,roomIds,{rawZ:0,tileThickness:10,baseThickness:50});
floorWork.rooms[roomIds[1]].use='bathroom';floorWork=Floors.setLayers(floorWork,fixture.plan,[roomIds[1]],{rawZ:0,tileThickness:10,baseThickness:45});floorWork.furnitureDatum='finished-floor';
const floorA={...a,cx:1000,cy:1500},floorB={...b,cx:2200,cy:2400},floorPlan=Project.effectivePlan(fixture.plan,floorWork);
assert.equal(P.slidingCorner(floorA,[floorA,floorB],floorPlan),null,'different finished floor heights disconnect nominally equal doors');
const raisedB={...floorB,h:2405};assert.ok(P.slidingCorner(floorA,[floorA,raisedB],floorPlan),'actual top elevations determine the joint');
const actualRails=[floorA,raisedB].map(f=>G.bodyParts(f,floorPlan,[floorA,raisedB]).find(p=>p.partRole==='top-track'));
near(actualRails[0].vertical.top,actualRails[1].vertical.top);
let restored=work.furniture;for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#ddd'});assert.deepEqual(restored,work.furniture,'restoration never writes derived join data');
const reviewPlan={rooms:[],walls:[],doors:[]},issue={kind:'overlap',id:'a',otherId:'b'},fingerprint=items=>Project.checkFingerprint(issue,reviewPlan,items,800),key=fingerprint([a,b]);
assert.equal(fingerprint([{...a,color:'#fff',price:999},b]),key);assert.notEqual(fingerprint([{...a,floorTrack:true},b]),key);assert.notEqual(fingerprint([a,{...b,cy:b.cy+200}]),key);
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 const models=Models.create(THREE);
 for(const first of ['doubleslidingdoor','tripleslidingdoor'])for(const second of ['doubleslidingdoor','tripleslidingdoor'])for(const rot of [0,37,90,180])for(const flip of [false,true])for(const otherFlip of [false,true])for(const sign of [-1,1]){
  const angle=rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),A={...a,type:first,rot,flip},B={...b,type:second,d:120,rot:rot+sign*90,flip:otherFlip,cx:1200*c-sign*900*s,cy:1200*s+sign*900*c},items=[A,B];
  const build=f=>{const model=models.build(f,{furniture:items});model.position.set(f.cx/1000,0,f.cy/1000);model.rotation.y=-f.rot*Math.PI/180;model.scale.x=f.flip?-1:1;model.updateWorldMatrix(true,true);return model;};
  const built=items.map(build),edges=[];
  for(let j=0;j<2;j++){
   const f=items[j],model=built[j],join=P.slidingCorner(f,items);assert.ok(join);assert.equal(join.side,f.flip?(j===0?'left':'right'):(j===0?'right':'left'));
   const track=model.getObjectByName('top-track'),positions=track.geometry.attributes.position;
   const vertices=Array.from({length:positions.count},(_,i)=>track.localToWorld(new THREE.Vector3().fromBufferAttribute(positions,i)));
   const I=new THREE.Vector3(1200*c/1000,2.4,1200*s/1000);
   edges.push(vertices.filter(p=>p.y>2.399&&p.distanceTo(I)<.2));
   let jambs=0;model.traverse(o=>{if(o.name==='side-jamb')jambs++;});assert.equal(jambs,1,'no fixed corner column');
   const door=model.userData.slidingDoor;assert.equal(door.leaves.length,P.definition(f).telescopic.panels);
   const closed=door.leaves.map(l=>l.node.position.x);door.leaves.forEach(l=>{l.node.position.x=l.opened;});model.updateWorldMatrix(true,true);
   for(const leaf of door.leaves){const bounds=new THREE.Box3().setFromObject(leaf.node);assert.ok(bounds.min.toArray().every(Number.isFinite));const center=bounds.getCenter(new THREE.Vector3());assert.ok(center.distanceTo(new THREE.Vector3(I.x,center.y,I.z))>.6,'leaves stack away from the corner');}
   door.leaves.forEach((l,i)=>l.node.position.x=closed[i]);
  }
  assert.equal(edges[0].length,2);assert.equal(edges[1].length,2);
  for(const p of edges[0])assert.ok(edges[1].some(q=>p.distanceTo(q)<1e-6),'top rails share the complete miter edge');
  assert.deepEqual(G.collisions(items),[],'meeting production meshes do not penetrate');
  assert.ok(!Project.spaceCheck({rooms:[],walls:[],doors:[]},items,{scanPassages:false}).some(v=>v.kind==='overlap'),'project review agrees with production solids');
  const parts=G.bodyParts(A,undefined,items);assert.ok(parts.length>5&&parts.every(p=>p.actualBoard));
  const separate=G.bodyParts(A,undefined,[A,{...B,cx:B.cx+1000,cy:B.cy+1000}]);assert.notDeepEqual(parts,separate,'neighbor movement invalidates solid geometry');
 }
 for(const type of ['doubleslidingdoor','tripleslidingdoor'])for(const floorTrack of [false,true]){
  const f={...a,type,floorTrack},model=models.build(f),size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());near(size.x,2.4);near(size.y,2.4);near(size.z,.09);
  assert.equal(!!model.getObjectByName('floor-track'),floorTrack);assert.equal(P.slidingCorner(f,[f]),null);
 }
 // Distance queries keep production height sections and the shared directional path.
 const S=require('../src/core/snapping.js'),obstacle={...a,id:'block',type:'block',cx:0,cy:-500,w:100,d:100,h:2400};
 assert.ok(G.bodyParts(a,undefined,[a,b]).some(p=>p.vertical.bottom>=2375));
 near(S.directional(obstacle,{furniture:[a,b,obstacle]}).b.distance,405);
 const low={...obstacle,h:100};assert.ok(S.directional(low,{furniture:[a,b,low]}).b.distance>405,'low measurement ignores the overhead rail');
 const overhang={...obstacle,cx:1230,cy:-25,w:10,d:10,h:20,mountHeight:2380};assert.ok(G.collisions([a,b,overhang]).some(pair=>pair.includes('a')&&pair.includes('block')),'actual miter overhang survives broad-phase filtering');
 assert.deepEqual(G.collisions([a,b,{...overhang,mountHeight:2400}]),[],'exact vertical separation remains clear');
 assert.deepEqual(G.collisions([a,{...b,h:2000}]),[['a','b']]);
 console.log('PASS telescopic 2/3 mixed corner miters, mirrored/rotated production geometry, no posts, independent stacks, solids/cache and project roundtrip');
})().catch(error=>{console.error(error);process.exitCode=1;});
