'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),Cache=require('../src/io/workspace-cache.js'),Model=require('../src/render/window-lining-model.js');
const wood={id:'wood',name:'木制窗套',type:'window_surround',w:1800,d:600,h:1600,cx:0,cy:0,rot:0,color:'#c49b70',mountHeight:620,windowSurroundSides:'four',windowSurroundThickness:18};
const stone={...wood,id:'stone',type:'quartz_sill',name:'石英石窗台板',h:20,mountHeight:600};delete stone.windowSurroundSides;delete stone.windowSurroundThickness;
const near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
const svg=require('../src/render/furniture-svg.js');
for(const item of [stone,wood,{...wood,windowSurroundSides:'three'}])assert(svg.render(item.type,item.w,item.d,item.color,{ink:'#222'},item).includes('data-window-lining'));
assert.equal(P.initial(wood).windowSurroundSides,'four');assert.equal(P.initial(wood).windowSurroundThickness,18);assert.equal(P.initial(stone).mountHeight,600);
for(const t of [0,101,'18',NaN,Infinity])assert.throws(()=>P.validateField(wood,'windowSurroundThickness',t));
for(const side of ['two',3,null])assert.throws(()=>P.validateField(wood,'windowSurroundSides',side));
assert.throws(()=>P.validateField(stone,'windowSurroundThickness',18));
assert.throws(()=>P.validate({...wood,w:50,windowSurroundThickness:25}));
assert.throws(()=>D.resizeFurniture({...wood,windowSurroundThickness:100},{w:200}));
assert.throws(()=>D.resizeFurniture(wood,{h:35}));
assert.equal(D.resizeFurniture(wood,{w:2000}).windowSurroundThickness,18);
assert.equal(D.resizeFurniture(stone,{h:10,d:20}).d,20);
assert.equal(P.windowLining(wood).clearWidth,1764);assert.equal(P.windowLining(wood).clearHeight,1564);
assert.equal(P.windowLining({...wood,windowSurroundSides:'three'}).clearHeight,1582);
assert.equal(P.windowLining({...wood,windowSurroundSides:'three'}).parts.length,3);
assert.equal(P.windowLining(stone).parts.length,1);
const slab=P.windowLining(stone).parts[0];assert.equal(slab.bottom+slab.h,wood.mountHeight);
const fingerprint=J.checkFingerprint({kind:'overlap',id:wood.id},{rooms:[],walls:[]},[wood],800);
for(const delta of [{windowSurroundSides:'three'},{windowSurroundThickness:20},{mountHeight:621}])assert.notEqual(J.checkFingerprint({kind:'overlap',id:wood.id},{rooms:[],walls:[]},[{...wood,...delta}],800),fingerprint);
assert.equal(J.checkFingerprint({kind:'overlap',id:wood.id},{rooms:[],walls:[]},[{...wood,color:'#ffffff',price:500}],800),fingerprint);
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const f of [stone,wood,{...wood,windowSurroundSides:'three'},{...wood,w:2100,h:1300,d:350,windowSurroundThickness:26}]){
  const model=Model.build(T,f),b=new T.Box3().setFromObject(model),layout=P.windowLining(f),parts=G.bodyParts(f);
  near((b.max.x-b.min.x)*1000,f.w);near((b.max.z-b.min.z)*1000,f.d);near(b.min.y*1000,f.mountHeight);near(b.max.y*1000,f.mountHeight+f.h);
  assert.equal(parts.length,layout.parts.length);const keys=[];
  model.traverse(n=>{if(n.isMesh){keys.push(n.userData.furnishStablePart);assert(Array.from(n.geometry.attributes.normal.array).every(Number.isFinite));}});assert.equal(new Set(keys).size,layout.parts.length);
  for(const [i,p] of parts.entries()){const board=layout.parts[i];near(p.vertical.bottom,board.bottom);near(p.vertical.top,board.bottom+board.h);near(Math.max(...p.vertices.map(v=>v[0]))-Math.min(...p.vertices.map(v=>v[0])),board.w);}
 }
 for(const rot of [0,37,90])for(const flip of [false,true]){
  const f={...wood,rot,flip},local=(x,z)=>{x*=flip?-1:1;const a=rot*Math.PI/180;return {cx:x*Math.cos(a)-z*Math.sin(a),cy:x*Math.sin(a)+z*Math.cos(a)};};
  const inside={id:'device',type:'block',w:200,d:200,h:200,mountHeight:800,rot,...local(0,0)};
  assert(!G.volumeOverlap(f,inside),'real opening stays empty');
  assert(G.volumeOverlap(f,{...inside,...local(wood.w/2-18,0)}),'side penetration');
  assert(!G.volumeOverlap(f,{...inside,w:1764,h:1564,mountHeight:638}),'equal clear dimensions touch only');
  assert(G.volumeOverlap(f,{...inside,w:1764.2,h:1564,mountHeight:638}),'0.1mm side penetration');
  const floor={...stone,rot,flip};assert(!G.volumeOverlap(f,floor),'stone touches surround without overlap');assert(G.volumeOverlap(f,{...floor,mountHeight:600.1}));
  const bottomProbe={...inside,mountHeight:620,h:10};assert(G.volumeOverlap(f,bottomProbe));assert(!G.volumeOverlap({...f,windowSurroundSides:'three'},bottomProbe),'cache switches bottom board');
  assert(!G.volumeOverlap(f,{...inside,mountHeight:2220}));assert(G.volumeOverlap(f,{...inside,type:'unknown-device',h:undefined,mountHeight:undefined}),'unknown height conservative');
  const bbox=G.bbox(G.footprints(f).flat()),wall={...inside,cx:bbox[2]+150,cy:0,w:100,d:5000,h:3000,mountHeight:0,rot:0};near(S.directional(f,{furniture:[wall]}).r.distance,100);
  const container={...wall,cx:0,w:5000,d:5000};assert(S.directional(f,{furniture:[container]}).r.containedBoundary);assert(G.volumeOverlap(f,container));
  const clearance=S.cabinetInterior(inside,{furniture:[f]});near(clearance.bottom.distance,162);near(clearance.top.distance,1202);assert.equal(clearance.collisions.length,0);
 }
 const plan=require('../src/data/plans.js')[0],W=require('../src/core/work-state.js').create({makeId:()=> 'fixture',colorFor:()=> '#fff',materials:require('../src/data/catalog.js').materials}),work={...W.fresh(plan),furniture:[wood,stone]};
 const payload={planId:plan.id,current:work,designs:[{name:'包套方案',work:structuredClone(work)}],catalog:[]};assert.equal(J.pack(payload).version,42);assert.deepEqual(J.unpack(J.pack(payload)),payload);
 const workspace={v:42,planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[],custom:[],updatedAt:100};assert.deepEqual(R.parse(JSON.parse(R.text(workspace))).work[plan.id].furniture,[wood,stone]);assert.equal(JSON.parse(R.text(workspace)).version,42);
 assert.deepEqual(Cache.load({read:key=>key==='huxing-design-v42'?JSON.stringify(workspace):null,key:'huxing-design-v42',firstPlan:plan,restore:W.restore}).work[plan.id].furniture,[wood,stone]);
 assert.equal(Cache.load({read:key=>key==='huxing-design-v41'?JSON.stringify({...workspace,v:41}):null,key:'huxing-design-v42',firstPlan:plan,restore:W.restore}).v,41);
 let restored=work;for(let i=0;i<3;i++)restored=W.restore(structuredClone(restored),plan);assert.deepEqual(restored.furniture,[wood,stone]);
 const legacy={...wood};delete legacy.windowSurroundSides;delete legacy.windowSurroundThickness;assert.equal(J.validateWork({furniture:[legacy]}).furniture[0].windowSurroundThickness,undefined);assert.equal(P.windowLining(legacy).thickness,18);
 assert.throws(()=>J.unpack(J.pack({...payload,current:{furniture:[{...wood,windowSurroundSides:'two'}]}})));
 const copy=D.pasteFurniture({items:[wood,stone],cx:0,cy:0},{x:1000,y:1000},{x:0,y:0,w:5000,h:5000},(()=>{let n=0;return()=> 'copy'+(++n);})()).items;assert.equal(copy[0].windowSurroundThickness,18);assert.equal(copy[0].mountHeight,620);
 const changed=D.replaceFurniture(wood,stone);assert.equal(changed.windowSurroundThickness,undefined);assert.equal(changed.windowSurroundSides,undefined);assert.equal(changed.h,20);assert.equal(changed.mountHeight,600);
 const same=D.replaceFurniture(wood,{...wood,w:1900});assert.equal(same.windowSurroundThickness,18);assert.equal(same.mountHeight,620);
 const switched=D.replaceFurniture(stone,wood);assert.equal(switched.windowSurroundSides,'four');assert.equal(switched.windowSurroundThickness,18);
 assert.equal(switched.frontClearance,0);assert.equal(changed.frontClearance,0);
 console.log('PASS window lining: production boards/normals/bounds; 3/4 sides; real cavity/contact/penetration/rotation/mirror/unknown height; directional and internal spacing; cache and spatial confirmation; resize/replacement/paste; v42 project/workspace/cache and repeat restore');
})().catch(e=>{console.error(e);process.exitCode=1;});
