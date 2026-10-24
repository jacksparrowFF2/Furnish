const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const G=require('../src/core/layout-geometry.js'),P=require('../src/core/project-core.js'),Draft=require('../src/core/floorplan-core.js');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const start=html.indexOf('  syncIdentity.each("index.html:generator-50",DOORS,d => {'),builder=html.slice(start,html.indexOf('  syncIdentity.each("index.html:generator-52",SLIDES',start));
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const clone=v=>JSON.parse(JSON.stringify(v));
const base={name:'双门',rect:[0,0,1200,200],h:[0,200],c:[1,0],o:[0,1],len:1200,entry:true};
const plan={id:'p',bounds:{x:0,y:0,w:4000,h:4000},walls:[],rooms:[],wins:[],slides:[],doors:[base]};
const work={furniture:[],open:{d:{0:{h:[0,0],c:[1,0],o:[0,-1],doorType:'double'}}}};
const restored=P.unpack(P.pack({planId:'p',current:work,designs:[{id:'named',name:'双门',work:clone(work)}],catalog:[]}));
assert.deepEqual(restored.current.open,work.open);assert.deepEqual(restored.designs[0].work.open,work.open);
const W=require('../src/core/work-state.js').create({makeId:()=> 'new',colorFor:()=> '#ddd',materials:{}});
let recovered=clone(work);for(let i=0;i<3;i++){recovered=W.restore(recovered,{...plan,defaults:[]});assert.deepEqual(recovered.open,work.open);assert.deepEqual(P.effectivePlan(plan,recovered).doors[0].h,[0,0]);}
const effective=P.effectivePlan(plan,work);assert.equal(effective.doors[0].doorType,'double');assert.deepEqual(effective.doors[0].h,[0,0]);
assert.equal(P.openingSchedule(effective,work)[0].parts,2);assert.equal(P.openingSchedule(effective,work)[0].type,'对开门');
for(const doorType of [0,null,'triple',{},true])assert.throws(()=>P.validateWork({...work,open:{d:{0:{...work.open.d[0],doorType}}}}));
const runtime={...base,_base:clone(base),doorType:'double'};assert.equal(G.doorOverride(runtime).doorType,undefined);
const legacy=G.doorOverride(runtime,{h:[0,200],c:[1,0],o:[0,-1]});assert.deepEqual(legacy.h,[0,0]);assert.equal(legacy.doorType,undefined);
assert.notEqual(P.checkFingerprint({kind:'door',id:'f'},effective,[],800),P.checkFingerprint({kind:'door',id:'f'},P.effectivePlan(plan,{...work,open:{}}),[],800));
const furniture=[{id:'f',type:'cabinet',cx:1100,cy:500,w:80,d:80,h:500,rot:0}];
assert(P.spaceCheck({...plan,doors:[{...base,doorType:'double'}]},furniture).some(v=>v.kind==='door'&&v.id==='f'),'right leaf sweep participates');
assert(!P.spaceCheck({...plan,doors:[{...base,doorType:'double'}]},[{...furniture[0],cx:600,cy:1000}]).some(v=>v.kind==='door'),'half-width leaves do not sweep the single leaf radius');
assert(!P.spaceCheck({...plan,doors:[{...base,doorType:'double'}]},[]).some(v=>v.kind==='swings'),'paired leaves do not report conflict with themselves');
// Real building draft, copy conversion, opening edits and repeated restoration.
const draft={version:1,id:'custom_double',name:'双门',source:'dxf',image:'',width:400,height:400,scale:10,walls:[
 {id:'a',a:[0,0],b:[400,0],thickness:200,kind:'n'},{id:'b',a:[400,0],b:[400,400],thickness:200,kind:'n'},
 {id:'c',a:[400,400],b:[0,400],thickness:200,kind:'n'},{id:'d',a:[0,400],b:[0,0],thickness:200,kind:'n'}],openings:[{id:'o',wall:'a',kind:'door',t:.5,length:1200,side:1,entry:true,doorType:'double'}]};
const built=Draft.build(draft);assert.equal(built.doors[0].doorType,'double');
const copied=Draft.fromPlan(built,'custom_copied');assert.equal(Draft.build(copied.draft).doors[0].doorType,'double');
assert.equal(Draft.build(Draft.editOpening(draft,'o',{length:1400})).doors[0].len,1400);
const moved=Draft.build(Draft.editOpening(draft,'o',{t:.6,length:1400})),override={d:{0:{h:[...built.doors[0].h],c:[...built.doors[0].c],o:built.doors[0].o.map(v=>-v),doorType:'double'}}};
const remapped=P.remapOpenings(built,moved,override);assert.equal(remapped.d[0].doorType,'double');assert.equal(P.effectivePlan(moved,{furniture:[],open:remapped}).doors[0].len,1400);
for(let i=0;i<3;i++)assert.deepEqual(Draft.build(clone(built.customDraft)).doors,built.doors);
assert.throws(()=>Draft.build({...draft,openings:[{...draft.openings[0],doorType:'triple'}]}));
(async()=>{
 const T=await import(JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const horizontal of [true,false])for(const reversed of [false,true])for(const outward of [false,true])for(const thickness of [100,240]){
  const axis=horizontal?0:1,normal=1-axis,h=[0,0],c=[0,0],o=[0,0];h[axis]=reversed?1200:0;h[normal]=outward?0:thickness;c[axis]=reversed?-1:1;o[normal]=outward?-1:1;
  const d={rect:horizontal?[0,0,1200,thickness]:[0,0,thickness,1200],h,c,o,len:1200,doorType:'double'};
  const leaves=G.doorLeaves(d);assert.equal(leaves.length,2);leaves.forEach(leaf=>near(leaf.len,600));
  const ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{DOORS:[d],FurnishGeometry:G,THREE:T,SWING_DOOR_HEIGHT:2.1,top:2.8,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,mat:()=>new T.MeshBasicMaterial(),metal:()=>new T.MeshBasicMaterial(),doors:[],archUp:new T.Group(),box:(w,h,t,m,x,y,z)=>{const leaf=new T.Mesh(new T.BoxGeometry(w,h,t),m);leaf.position.set(x,y+h/2,z);return leaf;}}));
  vm.runInContext(builder,ctx);assert.equal(ctx.doors.length,2);
  ctx.doors[0].open=false;assert.equal(ctx.doors[1].open,false);ctx.doors[1].open=true;assert.equal(ctx.doors[0].open,true);
  const closed=new T.Box3();for(const door of ctx.doors){near(door.length,.6);door.pivot.rotation.y=door.a0;door.pivot.updateWorldMatrix(true,true);closed.union(new T.Box3().setFromObject(door.pivot.children[0]));}
  near(closed.min[horizontal?'x':'z'],0);near(closed.max[horizontal?'x':'z'],1.2);
  near(closed.max.y,2.1);assert(closed.min[horizontal?'z':'x']>=-1e-6);assert(closed.max[horizontal?'z':'x']<=thickness/1000+1e-6);
  for(const door of ctx.doors){door.pivot.rotation.y=door.a1;const tip=door.pivot.localToWorld(new T.Vector3(.6,0,0)),pivot=door.pivot.position;near((horizontal?tip.z-pivot.z:tip.x-pivot.x)*o[normal],.6);}
  Object.assign(ctx,{colliders:[],slidingDoors:[],furnG:{visible:false},clamp01:v=>Math.max(0,Math.min(1,v))});
  vm.runInContext(html.slice(html.indexOf('function blocked('),html.indexOf('function floorEye(')),ctx);
  const pivot=ctx.doors[0].pivot,body=pivot.localToWorld(new T.Vector3(.3,0,0)),beyond=pivot.localToWorld(new T.Vector3(.75,0,0));
  assert(ctx.blocked(body.x,body.z,.02),'actual half leaf blocks walking');assert(!ctx.blocked(beyond.x,beyond.z,.02),'walking does not collide with the old fixed 900 mm phantom leaf');
 }
 console.log('PASS double door production meshes, linked motion, both axes/jambs/swing directions, actual sweep rules, old reset, draft copying and project roundtrip');
})().catch(error=>{console.error(error);process.exitCode=1;});
