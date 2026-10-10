const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../src/core/snapping.js'),P=require('../src/core/project-core.js'),D=require('../src/core/floorplan-core.js'),plans=require('../src/data/plans.js');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const design=require('../src/core/design-core.js');
const anchor=f=>{const a=f.rot*Math.PI/180;return {x:f.cx-f.w/2*Math.cos(a)+f.d/2*Math.sin(a),y:f.cy-f.w/2*Math.sin(a)-f.d/2*Math.cos(a)};};
for(const type of ['curtain','slidingdoor','tripleslidingdoor'])for(const rot of [0,90,180,270]){
 const f={id:'resize',type,cx:2000,cy:2000,w:2400,d:180,rot},a=anchor(f),angle=rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 const endpoint={x:a.x+3150*c-250*s,y:a.y+3150*s+250*c};
 const vertical=Math.abs(c)>.5;
 const rect=vertical?[endpoint.x+135*c,0,endpoint.x+135*c,5000]:[0,endpoint.y+135*s,5000,endpoint.y+135*s];
 const opts={scale:.16,wallSnap:true,rects:[rect]},result=S.resize(f,endpoint,opts);
 near(result.furniture.w,3285);near(result.furniture.d,250);
 near(anchor(result.furniture).x,a.x);near(anchor(result.furniture).y,a.y);assert.equal(result.guides.length,1);
 near(S.resize(f,endpoint,{...opts,wallSnap:false}).furniture.w,3150);
 const moved=S.move(f,vertical?rect[0]-Math.sign(c)*1200-135*c:2000,vertical?2000:rect[1]-Math.sign(s)*1200-135*s,{grid:10,...opts,guides:false,furniture:[]}).position;
 near(vertical?moved[0]:moved[1],(vertical?rect[0]:rect[1])-Math.sign(vertical?c:s)*1200);
}
const skew={id:'skew',type:'curtain',cx:2000,cy:2000,w:2400,d:180,rot:37};
const shrunk=S.resize(skew,anchor(skew),{scale:.16,wallSnap:true,rects:[[0,0,5000,240]]}).furniture;
near(shrunk.w,100);near(shrunk.d,100);near(anchor(shrunk).x,anchor(skew).x);near(anchor(shrunk).y,anchor(skew).y);
const curtain={id:'cloth',type:'curtain',name:'窗帘',cx:1000,cy:1000,w:2400,d:180,rot:0,color:'#ffffff',curtainStyle:'single'};
P.validateWork({furniture:[curtain]});assert.equal(P.unpack(P.pack({planId:plans[0].id,current:{furniture:[curtain]},designs:[],catalog:[]})).current.furniture[0].curtainStyle,'single');
assert.equal(design.replaceFurniture(curtain,{...curtain,curtainStyle:'double'}).curtainStyle,'double');
assert.equal(design.replaceFurniture(curtain,{...curtain,type:'tv'}).curtainStyle,undefined);
for(const style of ['bad',null,3])assert.throws(()=>P.validateWork({furniture:[{...curtain,curtainStyle:style}]}));
// The screenshot's 160 mm upper gap must snap just like the other three edges.
for(const rot of [0,90,180,270]){
 const f={id:'curtain',type:'curtain',w:3620,d:440,rot};
 const {hw,hh}=require('../src/core/layout-geometry.js').aabb(f);
 const options={grid:10,scale:.16,wallSnap:true,guides:false,rects:[[0,0,7000,240],[0,0,240,5000],[0,4760,7000,5000],[6760,0,7000,5000]],furniture:[]};
 for(const [x,y,expected] of [[3500,240+hh+160,[3500,240+hh]],[3500,4760-hh-160,[3500,4760-hh]],[240+hw+160,2500,[240+hw,2500]],[6760-hw-160,2500,[6760-hw,2500]]]){
  const actual=S.move(f,x,y,options).position;near(actual[0],Math.round(expected[0]));near(actual[1],Math.round(expected[1]));
 }
 assert.notEqual(S.move(f,3500,240+hh+300,options).position[1],Math.round(240+hh));
}
const base=plans.find(p=>p.slides.length),work={furniture:[],open:{s:{0:{panels:3}}}};
P.validatePlanWork(base,P.validateWork(work));
const effective=P.effectivePlan(base,work);assert.equal(effective.slides[0].panels,3);
assert.equal(P.openingSchedule(effective,work).find(o=>o.type==='三联动推拉门').parts,3);
const payload={planId:base.id,current:work,designs:[],catalog:[]};assert.deepEqual(P.unpack(P.pack(payload)).current.open,work.open);
const {draft}=D.fromPlan(effective,'custom_slide_copy'),copied=D.build(draft);
assert.equal(copied.slides[copied.slideRefs.indexOf('preset_slide0')].panels,3);
assert.equal(P.remapOpenings({slideRefs:['a','b']},{slideRefs:['b','a']},{s:{0:{panels:3}}}).s[1].panels,3);
assert.throws(()=>P.validatePlanWork(base,{furniture:[],open:{s:{999:{panels:3}}}}));
for(const value of [null,{}, {panels:4},{panels:'3'},{panels:3,extra:true}])assert.throws(()=>P.validateWork({furniture:[],open:{s:{0:value}}}));
(async()=>{
 // Exercise the production builders against the exact bundled Three.js version.
 const imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 const THREE=await import(imports.three);
 const ctx=vm.createContext({THREE,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,mat:(color,options)=>new THREE.MeshStandardMaterial({color,...options}),slidingDoors:[],furnG:new THREE.Group(),dirty:false,doors:[],colliders:[],clamp01:v=>Math.max(0,Math.min(1,v))});
 vm.runInContext(html.slice(html.indexOf('const asMat ='),html.indexOf('/* ======================= 建筑')),ctx);
 const loop=html.slice(html.indexOf('  for(const d of [...slidingDoors,...furnG.children'),html.indexOf('  updateSel();\n  if (!dirty)'));
 vm.runInContext(`function tick(dt){${loop}}`,ctx);
 vm.runInContext(html.slice(html.indexOf('function blocked('),html.indexOf('function stepWalk(')),ctx);
 for(const type of ['slidingdoor','tripleslidingdoor'])for(const rot of [0,90,180,270])for(const flip of [false,true]){
  ctx.f={id:'door',type,cx:3000,cy:4000,w:2400,d:180,h:2400,rot,flip,color:'#41474b'};
  const model=vm.runInContext('buildFurniture(f)',ctx),door=model.userData.slidingDoor;
  ctx.furnG.clear();ctx.furnG.add(model);
  model.updateWorldMatrix(true,true);
  const crossing=model.localToWorld(new THREE.Vector3(.5,0,0));
  assert.equal(ctx.blocked(crossing.x,crossing.z,.1),true,'closed leaf blocks passage');
  assert.equal(door.leaves.length,type==='slidingdoor'?2:3);
  door.leaves.forEach(l=>near(l.node.position.x,l.closed));
  door.open=true;for(let i=0;i<150;i++)ctx.tick(1/60);
  door.leaves.forEach(l=>near(l.node.position.x,l.opened));
  assert.equal(ctx.blocked(crossing.x,crossing.z,.1),false,'open leaves clear passage, including rotation/mirroring');
  const occupied=new THREE.Box3().setFromObject(door.leaves.at(-1).node);
  assert.ok(occupied.min.toArray().every(Number.isFinite));
  door.open=false;for(let i=0;i<150;i++)ctx.tick(1/60);
  door.leaves.forEach(l=>near(l.node.position.x,l.closed));
 }
 for(const rot of [0,90])for(const curtainStyle of ['single','double'])for(const flip of [false,true]){
  ctx.f={id:'curtain',type:'curtain',cx:0,cy:0,w:3620,d:440,h:2600,rot,color:'#c9d3da',curtainStyle,flip};
  const model=vm.runInContext('buildFurniture(f)',ctx),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  near(size.y,2.601);assert.ok((rot?size.z:size.x)<3.63,'rod stays within curtain width');
  assert.ok((rot?size.x:size.z)<.15,'cloth is thin, not separate columns or a giant disc');
  const cloth=model.children.find(o=>o.geometry?.type==='BufferGeometry');assert.ok(cloth.geometry.index.count>1000);
  for(const v of cloth.geometry.attributes.normal.array)assert.ok(Number.isFinite(v));
  assert.equal(cloth.material.side,THREE.DoubleSide);
  const curtain=model.userData.curtain;assert.equal(curtain.panels.length,curtainStyle==='single'?1:2);
  ctx.furnG.clear();ctx.furnG.add(model);curtain.open=true;for(let i=0;i<150;i++)ctx.tick(1/60);
  curtain.panels.forEach(p=>{near(p.node.position.x,p.opened);near(p.node.scale.x,p.packScale);assert.equal(p.node.userData.door,curtain);});
  curtain.open=false;for(let i=0;i<150;i++)ctx.tick(1/60);
  curtain.panels.forEach(p=>{near(p.node.position.x,p.closed);near(p.node.scale.x,1);});
 }
 console.log('PASS move/resize wall snapping with fixed corner, single/double curtain animation and persistence, real 3D cloth bounds, sliding leaf animation, copy and remapping');
})().catch(e=>{console.error(e);process.exitCode=1;});
