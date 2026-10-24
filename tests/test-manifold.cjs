const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),M=require('../src/render/manifold-model.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),V=require('../src/render/furniture-svg.js');
const f={id:'manifold',type:'heating_manifold',name:'分水器',w:950,d:140,h:900,cx:2000,cy:2000,rot:0,color:'#c6a258',...R.initial({type:'heating_manifold',w:950})};
assert.deepEqual(R.initial(f),{mountHeight:0,manifoldLoops:5,manifoldLengths:{upper:600,lower:330}});assert.equal(R.manifoldLayout(f).leftLength,600);
const lowerLong=R.editManifold(f,{lower:900});assert.deepEqual(lowerLong.manifoldLengths,{upper:600,lower:900});assert.equal(lowerLong.w,1250);
const upperShort=R.editManifold(lowerLong,{upper:250});assert.deepEqual(upperShort.manifoldLengths,{upper:250,lower:900});assert.equal(upperShort.w,lowerLong.w);
assert.deepEqual(R.editManifold(upperShort,{loops:8}).manifoldLengths,upperShort.manifoldLengths);
const resized=D.resizeFurniture(lowerLong,{w:1550});assert.deepEqual(resized.manifoldLengths,{upper:800,lower:1200});
for(const lengths of [null,[],{upper:600},{upper:600,lower:0},{upper:600,lower:NaN},{upper:600,lower:'330'},{upper:600,lower:330,extra:1}])assert.throws(()=>R.validate({...f,manifoldLengths:lengths}));
assert.throws(()=>R.validate({...f,manifoldLengths:{upper:600,lower:900}}));
const larger=R.editManifold(f,{loops:8});assert.equal(larger.w,1100);assert.equal(R.manifoldLayout(larger).leftLength,600);assert.equal(R.editManifold(larger,{leftLength:900}).w,1400);
for(const loops of [0,13,2.5,NaN,'5'])assert.throws(()=>R.editManifold(f,{loops}));
for(const leftLength of [54,10001,NaN])assert.throws(()=>R.editManifold(f,{leftLength}));
for(const leftLength of [100,10000])assert.equal(R.manifoldLayout(R.editManifold(f,{leftLength})).lengths.upper,leftLength);
for(const values of [{w:449},{d:79},{h:399}])assert.throws(()=>D.resizeFurniture(f,values));
assert.throws(()=>R.editManifold({...f,locked:true},{loops:6}));assert.equal(R.vertical({...f,mountHeight:200}).bottom,200);
const legacy={...f};delete legacy.manifoldLengths;delete legacy.manifoldLoops;delete legacy.mountHeight;let restored=[legacy];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'x',colorFor:()=> '#eee'});assert.deepEqual(restored,[legacy]);
assert.equal(R.value(restored[0],'manifoldLoops'),5);
assert.deepEqual(R.manifoldLayout(restored[0]).lengths,{upper:600,lower:330});
const smallLegacy={...legacy,w:450};assert(Math.abs(R.editManifold(smallLegacy,{loops:6}).manifoldLengths.lower-55)<1e-9);
const round=P.unpack(P.pack({planId:'test',current:{furniture:[larger]},designs:[{name:'分水器',work:{furniture:[f]}}],catalog:[]}));assert.deepEqual(round.current.furniture,[larger]);assert.deepEqual(round.designs[0].work.furniture,[f]);
assert.throws(()=>P.unpack(P.pack({planId:'test',current:{furniture:[{...f,manifoldLoops:2.5}]},designs:[],catalog:[]})));
const copy=D.pasteFurniture({items:[larger],cx:2000,cy:2000},{x:3000,y:3000},{x:0,y:0,w:10000,h:10000},()=> 'copy').items[0];assert.equal(copy.manifoldLoops,8);
assert.equal(D.replaceFurniture(f,{type:'chair',name:'椅',w:400,d:400}).manifoldLoops,undefined);
const replaced=D.replaceFurniture({id:'chair',type:'chair',name:'椅',w:400,d:400,cx:2000,cy:2000,rot:0},{type:f.type,name:f.name,w:950,d:140,h:900});assert.equal(replaced.manifoldLoops,5);assert.equal(replaced.mountHeight,0);
const entry=require('../src/data/catalog.js').library.flatMap(c=>c.items).find(i=>i[0]===f.type);assert(entry);assert.equal(entry[5],undefined);
assert(V.render(f.type,f.w,f.d,f.color,{ink:'#222'},f).includes('rect'));
const plan={id:'test',walls:[],doors:[],wins:[],rooms:[{id:'room',poly:[[0,0],[10000,0],[10000,10000],[0,10000]]}]},issue={kind:'test',id:f.id};
const stamp=x=>P.checkFingerprint(issue,plan,[x],800);assert.notEqual(stamp(f),stamp({...f,manifoldLoops:6}));assert.equal(stamp(f),stamp({...f,color:'#fff',price:200}));
assert.notEqual(stamp(f),stamp(R.editManifold(f,{lower:400})));
const independentRound=P.unpack(P.pack({planId:'test',current:{furniture:[upperShort]},designs:[{name:'上下独立',work:{furniture:[lowerLong]}}],catalog:[]}));assert.deepEqual(independentRound.current.furniture[0].manifoldLengths,upperShort.manifoldLengths);assert.deepEqual(independentRound.designs[0].work.furniture[0].manifoldLengths,lowerLong.manifoldLengths);
for(const rot of [0,37,90])for(const flip of [false,true]){
 const a={...f,rot,flip},enclosing={id:'box',type:'block',w:3000,d:3000,h:2000,cx:2000,cy:2000,rot:0};
 assert(G.bodyParts(a,plan,[a]).length>10);assert(Object.values(S.directional(a,{furniture:[enclosing]})).some(v=>v?.containedBoundary));
 const angle=rot*Math.PI/180,x=(-a.w/2+18)*(flip?-1:1),z=-10;assert(G.volumeOverlap(a,{...enclosing,w:100,d:100,cx:a.cx+x*Math.cos(angle)-z*Math.sin(angle),cy:a.cy+x*Math.sin(angle)+z*Math.cos(angle)}));
 assert(!G.volumeOverlap(a,{...a,id:'high',mountHeight:900}));
 const external={...enclosing,cx:5000,w:500,d:500};assert(S.directional(a,{furniture:[external]}).r?.distance>0);
}
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),near=(a,b)=>assert(Math.abs(a-b)<3e-6,`${a} != ${b}`);
 for(const loops of [1,5,12])for(const leftLength of [100,600,10000])for(const [d,h] of [[80,400],[140,900],[220,1200]]){
  const item={...R.editManifold(f,{loops,leftLength}),d,h,mountHeight:123},model=M.build(T,item),b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3());near(size.x,item.w/1000);near(size.y,h/1000);near(size.z,d/1000);near(b.min.y,.123);
  const roles={};model.traverse(o=>{if(o.geometry){assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.geometry.attributes.normal.array.every(Number.isFinite));roles[o.userData.manifoldPart]=(roles[o.userData.manifoldPart]||0)+1;}});assert.equal(roles['loop-pipe'],loops*2);assert.equal(roles['branch-valve'],loops*2);
  assert.equal(roles['main-elbow'],2);
 }
 for(const item of [f,lowerLong,upperShort]){
  const model=M.build(T,item),elbows=[],risers=[],runs=[];model.traverse(o=>{if(o.userData.manifoldPart==='main-elbow')elbows.push(o);if(o.userData.manifoldPart==='main-riser')risers.push(o);if(o.userData.manifoldPart==='main-horizontal')runs.push(o);});
  for(let i=0;i<2;i++){
   const e=elbows[i],a=e.geometry.attributes.position.array,n=a.length/3,centre=offset=>[0,1,2].map(axis=>Array.from({length:16},(_,j)=>a[(offset+j)*3+axis]).reduce((s,v)=>s+v,0)/16),start=centre(0),end=centre(n-16),r=risers[i],run=runs[i];
   near(start[0],r.position.x);near(start[1],r.position.y+r.geometry.parameters.height/2);near(end[0],run.position.x-run.geometry.parameters.height/2);near(end[1],run.position.y);assert.equal(e.geometry.solidPieces.length,16);
  }
 }
 const sameWidth=R.editManifold(f,{lower:400});assert.equal(sameWidth.w,f.w);assert.notDeepEqual(require('../src/core/furniture-solids.js').parts(f),require('../src/core/furniture-solids.js').parts(sameWidth));
 const bendCentre={x:f.cx-f.w/2+18+40,y:f.h*.82-40},probe={id:'bend-probe',type:'block',w:4,d:4,h:4,cx:bendCentre.x,cy:f.cy-10,mountHeight:bendCentre.y-2,rot:0};
 assert(!G.volumeOverlap(f,probe),'the inner bend stays clear');assert(G.volumeOverlap(f,{...probe,cx:bendCentre.x-40/Math.sqrt(2),mountHeight:bendCentre.y+40/Math.sqrt(2)-2}),'the real curved tube is solid');
 // Cache dependency: same outer size with different circuit count and mounting height.
 const minY=x=>Math.min(...require('../src/core/furniture-solids.js').parts(x).map(p=>p.vertical.bottom));near(minY({...f,mountHeight:200}),200);near(minY({...f,mountHeight:300}),300);
 const n=x=>require('../src/core/furniture-solids.js').parts(x).length;assert(n({...f,manifoldLoops:4,manifoldLengths:{upper:650,lower:330}})!==n(f));
 const state={furniture:[{...f,manifoldLengths:{...f.manifoldLengths},mountHeight:200}],rooms:{},furnitureDatum:'survey'},furnG=new T.Group(),errors=new Map(),context=vm.createContext({FurnishDownlightModel:{supported:()=>false,setLights(){}},state,furnG,PLAN:plan,THREE:T,wx:v=>v/1000,wz:v=>v/1000,M:v=>v/1000,FurnishProducts:R,FurnishProject:P,FurnishDesign:D,FurnishCabinet:require('../src/core/cabinet-core.js'),furnitureError:()=>null,furnitureRenderErrors:errors,buildFurniture:f=>{const g=M.build(T,f);g.position.set(f.cx/1000,0,f.cy/1000);g.userData.fid=f.id;return g;},clearGroup:()=>{},applyGrow:()=>{},syncModelErrors:()=>{},opt:{furn:true}});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(')),context);const refresh=()=>vm.runInContext('buildFurn()',context);refresh();const original=furnG.children[0];state.furniture[0].cx+=100;refresh();assert.equal(furnG.children[0],original);near(new T.Box3().setFromObject(original).min.y,.2);
 state.furniture[0].manifoldLengths.lower=400;refresh();assert.notEqual(furnG.children[0],original,'independent length invalidates the actual scene cache at unchanged width');
 state.furniture[0].manifoldLoops=4;state.furniture[0].manifoldLengths.upper=650;refresh();assert.notEqual(furnG.children[0],original);const count=furnG.children[0].children[0].children.filter(o=>o.userData.manifoldPart==='loop-pipe').length;assert.equal(count,8);state.furniture[0].mountHeight=300;refresh();near(new T.Box3().setFromObject(furnG.children[0]).min.y,.3);assert.equal(errors.size,0);
 const classic=[];for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(/importmap|type="module"/.test(m[1]))continue;const src=m[1].match(/src="([^"]+)"/);classic.push(src?fs.readFileSync(require('node:path').resolve(__dirname,'..',src[1]),'utf8'):m[2]);}new vm.Script(classic.join('\n;\n'));
 console.log('PASS manifold: parameter boundaries, restoration, copy/replacement, project/named roundtrip, fingerprints, directional/body parts, real production geometry and entry declarations');
})().catch(e=>{console.error(e);process.exitCode=1;});
