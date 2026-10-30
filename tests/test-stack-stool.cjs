'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),C=require('../src/io/workspace-cache.js'),M=require('../src/render/stack-stool-model.js'),A=require('../src/data/stack-stool-blender-asset.js');
const f={id:'stool',name:'叠放方凳',type:'stool_citylong_370',w:370,d:370,h:467,cx:0,cy:0,rot:0,color:'#eee9dc'},near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`);
assert.equal(A.parts.length,5);assert.equal(A.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../assets/models/stack-stool/v4/stack-stool-v1.glb'))).digest('hex'));
assert.equal(P.initial(f).stoolCount,1);assert.equal(P.initial(f).stoolPitch,70);assert.equal(P.stoolStack(f).height,467);
for(const n of [0,1.1,13,NaN,'4'])assert.throws(()=>P.validateField(f,'stoolCount',n));
for(const n of [49,201,Infinity,'70'])assert.throws(()=>P.validateField(f,'stoolPitch',n));
for(const n of [1,12])assert.equal(P.validateField(f,'stoolCount',n),n);
for(const n of [50,200])assert.equal(P.validateField(f,'stoolPitch',n),n);
assert.throws(()=>P.validateField({...f,type:'chair'},'stoolCount',4));
const replaced=P.replacement(f,{...f,type:'chair',stoolCount:4,stoolPitch:80},{type:'chair'});assert.equal(replaced.stoolCount,undefined);assert.equal(replaced.stoolPitch,undefined);
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const [count,pitch] of [[1,70],[4,70],[6,85],[12,50]]){
  const item={...f,stoolCount:count,stoolPitch:pitch},height=467+(count-1)*pitch,model=M.build(T,item),b=new T.Box3().setFromObject(model);near(b.min.y,0);near((b.max.y-b.min.y)*1000,height);near((b.max.x-b.min.x)*1000,370);near((b.max.z-b.min.z)*1000,370);
  near(P.vertical(item).top,height);near(P.dimensions(item).h,height);assert.equal(G.bodyParts(item).length,count*5);
  const keys=[];model.traverse(n=>{if(n.isMesh){keys.push(n.userData.furnishStablePart);assert(Array.from(n.geometry.attributes.normal.array).every(Number.isFinite));}});assert.equal(new Set(keys).size,count*5);
 }
 for(const rot of [0,37,90])for(const flip of [false,true]){
  const item={...f,stoolCount:4,rot,flip},bbox=G.bbox(G.footprints(item).flat()),wall={id:'wall',type:'block',cx:bbox[2]+150,cy:0,w:100,d:2000,h:1200,rot:0};near(S.directional(item,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(item,wall));
  const enclosing={...wall,cx:0,w:2000,d:2000};assert(G.volumeOverlap(item,enclosing));assert(S.directional(item,{furniture:[enclosing]}).r.containedBoundary);
  const top={id:'top',type:'block',cx:0,cy:0,w:800,d:800,h:18,mountHeight:677,rot:0};assert(!G.volumeOverlap(item,top));assert(G.volumeOverlap(item,{...top,mountHeight:676.9}));assert(!G.volumeOverlap({...item,stoolCount:1},{...top,mountHeight:600}));assert(G.volumeOverlap({...item,stoolCount:5},{...top,mountHeight:600}));assert(G.volumeOverlap(item,{...top,type:'unknown-device',h:undefined,mountHeight:undefined}));
  const snap={grid:1,scale:1,wallSnap:true,guides:false,rects:[[0,-1500,0,1500]],furniture:[]};near(S.move(item,-bbox[0]+6,0,snap).position[0],-bbox[0]);
 }
 // Actual cabinet boards, not a container-envelope exemption. Stool rests on the floor board.
 const Cabinet=require('../src/core/cabinet-core.js'),host={id:'host',type:'cabinet',...Cabinet.preset('base'),cx:0,cy:0,rot:0};host.cabinet.plinth=80;host.cabinet.columns=[{door:'double',doorOpen:false,handle:'none',shelves:[],drawers:[]}];
 for(const rot of [0,37,90])for(const flip of [false,true]){
  const h={...host,rot,flip},item={...f,rot,flip,stoolCount:4,mountHeight:98},inside=S.cabinetInterior(item,{furniture:[h]});near(inside.bottom.distance,0);near(inside.top.distance,57);assert.equal(inside.collisions.length,0);assert(!G.volumeOverlap(item,h));near(S.directional(item,{furniture:[h],rotation:-rot}).l.distance,197);
  assert(G.volumeOverlap({...item,stoolCount:5},h));assert(G.volumeOverlap({...item,mountHeight:97.9},h));
 }
 const planShape={rooms:[],walls:[],doors:[]},issue={kind:'overlap',id:f.id},fingerprint=J.checkFingerprint(issue,planShape,[f],800);assert.notEqual(J.checkFingerprint(issue,planShape,[{...f,stoolCount:2}],800),fingerprint);assert.notEqual(J.checkFingerprint(issue,planShape,[{...f,stoolPitch:80}],800),fingerprint);assert.equal(J.checkFingerprint(issue,planShape,[{...f,color:'#111111',price:100}],800),fingerprint);
 const raised=M.build(T,{...f,stoolCount:4,mountHeight:98}),bounds=new T.Box3().setFromObject(raised);near(bounds.min.y*1000,98);near(bounds.max.y*1000,775);
 const stacked={...f,stoolCount:4,stoolPitch:80,mountHeight:98},work={furniture:[stacked]},packet=J.pack({planId:'stool-plan',current:work,designs:[{name:'凳子收纳',work}],catalog:[]});assert.equal(packet.version,39);const restored=J.unpack(packet);assert.deepEqual(restored.current.furniture,[stacked]);assert.deepEqual(restored.designs[0].work.furniture,[stacked]);
 let migrated=work;for(let i=0;i<3;i++)migrated=J.validateWork(migrated);assert.deepEqual(migrated,work);
 assert.equal(J.pack({planId:'stool-plan',current:{furniture:[]},catalog:[],designs:[]}).version,1);
 const plan=require('../src/data/plans.js')[0],W=require('../src/core/work-state.js').create({makeId:()=> 'fixture',colorFor:()=> '#fff',materials:require('../src/data/catalog.js').materials}),full={...W.fresh(plan),furniture:[stacked]},store={v:39,planId:plan.id,work:{[plan.id]:full},designs:[],customPlans:[],custom:[],updatedAt:100};
 assert.equal(JSON.parse(R.text(store)).version,39);assert.deepEqual(R.parse(JSON.parse(R.text(store))).work[plan.id].furniture,[stacked]);
 assert.deepEqual(C.load({key:'huxing-design-v39',read:key=>key==='huxing-design-v39'?JSON.stringify(store):null,firstPlan:plan,restore:W.restore}).work[plan.id].furniture,[stacked]);
 let recovered=structuredClone(full);for(let i=0;i<3;i++)recovered=W.restore(recovered,plan);assert.deepEqual(recovered.furniture,[stacked]);
 const D=require('../src/core/design-core.js'),copy=D.pasteFurniture({items:[stacked],cx:0,cy:0},{x:1000,y:1000},{x:0,y:0,w:5000,h:5000},()=> 'copy').items[0];assert.equal(copy.stoolCount,4);assert.equal(copy.stoolPitch,80);assert.equal(copy.mountHeight,98);assert.equal(copy.id,'copy');
 const same=D.replaceFurniture(stacked,{...f,name:'同型号',color:'#cccccc'});assert.equal(same.stoolCount,4);assert.equal(same.stoolPitch,80);assert.equal(same.mountHeight,98);
 assert.throws(()=>J.unpack(J.pack({planId:plan.id,current:{furniture:[{...stacked,stoolCount:1.5}]},designs:[],catalog:[]})));
 const legacy=J.validateWork({furniture:[f]});assert.equal(legacy.furniture[0].stoolCount,undefined);assert.equal(P.stoolStack(legacy.furniture[0]).height,467);
 console.log('PASS stacking production bounds, normals, count/pitch limits, cache invalidation, spacing, snapping, rotation/mirror, contact/penetration/unknown height, replacement, v39 project/workspace/cache and no-drift restore');
})().catch(e=>{console.error(e);process.exitCode=1;});
