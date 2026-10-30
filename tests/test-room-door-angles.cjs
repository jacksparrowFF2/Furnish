const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),G=require('../src/core/layout-geometry.js'),D=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),clone=structuredClone;
const base={name:'room',rect:[0,0,1200,200],h:[0,200],c:[1,0],o:[0,1],len:1200,doorType:'double'},work={furniture:[],open:{d:{0:{h:base.h,c:base.c,o:base.o,doorType:'double',hingeAngles:[150,180]}}}};
for(const bad of [null,{},[],[0,90],[90,181],[90],[90,90,90],['90',90],[NaN,90],Array(2)])assert.throws(()=>D.validateDoorHinges({...base,hingeAngles:bad}));
for(const angles of [[1,180],[90,150],[150,180]]){D.validateDoorHinges({...base,hingeAngles:angles});P.validateWork({...work,open:{d:{0:{...work.open.d[0],hingeAngles:angles}}}});}
assert.throws(()=>P.validateWork({...work,open:{d:{0:{...work.open.d[0],hingeAngles:[180,181]}}}}));
assert.throws(()=>D.validateDoorHinges({kind:'window',hingeAngles:[90]}));
const plan={id:'p',bounds:{x:0,y:0,w:4000,h:4000},doors:[base],walls:[],rooms:[],wins:[],slides:[]},effective=P.effectivePlan(plan,work);assert.deepEqual(effective.doors[0].hingeAngles,[150,180]);assert(!base.hingeAngles);
const runtime={...base,hingeAngles:[150,180],_base:clone(base)};assert.equal(G.doorOverride(runtime).hingeAngles,undefined);assert.equal(G.doorHingeAngle(G.doorLeaves(G.doorOverride(runtime))[0]),90);
const pack=P.pack({planId:'p',current:work,designs:[{name:'angles',work:clone(work)}],catalog:[]});assert.equal(pack.version,38);let round=P.unpack(pack);for(let i=0;i<3;i++)round=P.unpack(P.pack(round));assert.deepEqual(round.current.open,work.open);assert.deepEqual(round.designs[0].work.open,work.open);assert(P.pack({planId:'p',current:{furniture:[]},designs:[],catalog:[]}).version<38);
const R=require('../src/core/repository-core.js'),Cache=require('../src/io/workspace-cache.js'),preset=require('../src/data/plans.js')[0],pd=preset.doors[0],saved={furniture:[],open:{d:{0:{h:pd.h,c:pd.c,o:pd.o,doorType:'double',hingeAngles:[150,180]}}}},workspace={v:38,planId:preset.id,work:{[preset.id]:saved},designs:[],custom:[]};
assert.deepEqual(R.parse(JSON.parse(R.text(workspace))).work[preset.id].open,saved.open);
assert.deepEqual(Cache.load({key:'huxing-design-v38',read:k=>k==='huxing-design-v38'?JSON.stringify(workspace):null}).work[preset.id].open,saved.open);
assert.equal(Cache.candidates({read:k=>k==='huxing-design-v37'?JSON.stringify({...workspace,v:37}):null})[0].v,37);
const draft={version:1,id:'custom_angles',name:'angles',source:'dxf',image:'',width:400,height:400,scale:10,walls:[{id:'a',a:[0,0],b:[400,0],thickness:200,kind:'n'},{id:'b',a:[400,0],b:[400,400],thickness:200,kind:'n'},{id:'c',a:[400,400],b:[0,400],thickness:200,kind:'n'},{id:'d',a:[0,400],b:[0,0],thickness:200,kind:'n'}],openings:[{id:'door',wall:'a',kind:'door',t:.5,length:1200,side:1,entry:true,doorType:'double',hingeAngles:[150,180]}]};
const built=D.build(draft);assert.deepEqual(built.doors[0].hingeAngles,[150,180]);assert.deepEqual(D.build(D.fromPlan(built,'custom_copy').draft).doors[0].hingeAngles,[150,180]);assert.deepEqual(D.build(D.editOpening(draft,'door',{doorType:'single'})).doors[0].hingeAngles,[150]);assert.equal(P.formatVersion([{architecture:{draft}}]),38);
const moved=D.build(D.editOpening(draft,'door',{t:.6})),remapped=P.remapOpenings(built,moved,work.open);assert.deepEqual(remapped.d[0].hingeAngles,[150,180]);
assert.notEqual(P.checkFingerprint({kind:'door',id:'x'},effective,[],800),P.checkFingerprint({kind:'door',id:'x'},P.effectivePlan(plan,{furniture:[]}),[],800));
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),T=await import(JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),start=html.indexOf('  syncIdentity.each("index.html:generator-50",DOORS,d => {'),builder=html.slice(start,html.indexOf('  syncIdentity.each("index.html:generator-52",SLIDES',start));
 for(const horizontal of [true,false])for(const reversed of [false,true])for(const outward of [false,true])for(const angles of [[1,180],[45,90],[150,180]]){
  const axis=horizontal?0:1,normal=1-axis,h=[0,0],c=[0,0],o=[0,0];h[axis]=reversed?1200:0;h[normal]=outward?0:200;c[axis]=reversed?-1:1;o[normal]=outward?-1:1;const d={...base,rect:horizontal?[0,0,1200,200]:[0,0,200,1200],h,c,o,hingeAngles:angles};
  const leaves=G.doorLeaves(d),polys=G.doorSwingPolygons(d);assert.deepEqual(leaves.map(G.doorHingeAngle),angles);
  const ctx=vm.createContext({syncIdentity:require('../src/core/part-identity.js'),DOORS:[d],FurnishGeometry:G,THREE:T,SWING_DOOR_HEIGHT:2.1,top:2.8,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,mat:()=>new T.MeshBasicMaterial(),metal:()=>new T.MeshBasicMaterial(),doors:[],archUp:new T.Group(),box:(w,h,t,m,x,y,z)=>{const q=new T.Mesh(new T.BoxGeometry(w,h,t),m);q.position.set(x,y+h/2,z);return q;}});vm.runInContext(builder,ctx);
  ctx.doors.forEach((door,i)=>{near(Math.abs(door.a1-door.a0)*180/Math.PI,angles[i]);const v=G.doorOpenVector(leaves[i]),tip=door.pivot.localToWorld(new T.Vector3(.6,0,0));near(tip.x*1000,leaves[i].h[0]+600*v[0]);near(tip.z*1000,leaves[i].h[1]+600*v[1]);const end=polys[i].at(-1);near(end[0],tip.x*1000);near(end[1],tip.z*1000);});
  ctx.doors[0].open=false;assert.equal(ctx.doors[1].open,false);
 }
 // Region beyond 90 degrees must participate in the expanded door swing check.
 const object={id:'beyond',type:'cabinet',cx:-300,cy:450,w:40,d:40,h:500,rot:0};assert(P.spaceCheck({...plan,doors:[{...base,hingeAngles:[180,90]}]},[object]).some(v=>v.kind==='door'));assert(!P.spaceCheck(plan,[object]).some(v=>v.kind==='door'));
 console.log('PASS room door limits: 1–180 degrees, independently configured double leaves, actual production axes/tips and 2D sweep ends, beyond-90 collisions, legacy reset, draft copy/edit/remap, v38 named/current repeated recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
