const assert=require('node:assert/strict'),K=require('../src/core/kitchen-core.js'),S=require('../src/core/snapping.js'),R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`),values=g=>Object.fromEntries(Object.entries(g).map(([key,m])=>[key,m?.distance]));
const base={id:'top',type:'counter',name:'厨房',cx:3000,cy:3000,w:2200,d:600,rot:0,color:'#ddd'},config={version:1,shape:'straight',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:600,role:'door'},{run:0,width:1000,role:'sink'},{run:0,width:600,role:'door'}]};
function fixture(type='sink_arrow_750',shape='straight',rot=0,flip=false){const k=structuredClone(config);k.shape=shape;k.modules[1].role=type.startsWith('sink')?'sink':'hob';if(shape!=='straight')k.modules.push({run:1,width:1000,role:'door'});if(shape==='U')k.modules.push({run:2,width:1000,role:'door'});const host=K.configure({...base,rot,flip},k),f=K.attach({id:'device',type,name:'设备',w:750,d:type==='stove_fotile_th36b'?440:450,rot:0,cx:0,cy:0,color:'#111',...R.initial({type})},host,1);K.normalize([host,f]);return {host,f};}
const wallRect=(f,x0,y0,x1,y1)=>{const pts=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(p=>K.world(f,...p));return [Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))];};
for(const type of ['sink_arrow_750','stove_fotile_th36b','stove']){
 for(const shape of ['straight','L','U'])for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
  const {host,f}=fixture(type,shape,rot,flip),items=[host,f],original=JSON.stringify(items),opening=S.surfaceOpening(f,{furniture:items}),size=K.cutout(f);
  const expected={l:(1000-size.w)/2,r:(1000-size.w)/2,t:(600-size.d)/2,b:(600-size.d)/2};for(const key of Object.keys(expected)){near(opening.gaps[key].distance,expected[key]);assert(opening.gaps[key].moduleBoundary);assert.equal(opening.gaps[key].entity.moduleKey,'module:1');}
  assert.equal(JSON.stringify(items),original);const saved=P.unpack(P.pack({planId:'modules',current:{furniture:items},designs:[{name:'边界',work:{furniture:items}}],catalog:[]}));assert.deepEqual(saved.current.furniture,items);let restored=saved.current.furniture;for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#ddd'});assert.deepEqual(restored,items);
  if(rot===37)continue;
  for(const gap of [0,4.999,5,5.001,300]){
   const wall=wallRect(f,-500,-420-gap,500,-300-gap),scene={furniture:items,rects:[wall],solidWallCount:1},o=S.surfaceOpening(f,scene),panel=S.directional(f,{...scene,rotation:-f.rot});
   if(gap<=R.definition(f).surfaceMeasurement.wallContactTolerance){near(o.gaps.t.distance,expected.t+gap);assert(o.gaps.t.wallPriority);assert.equal(o.gaps.t.entity.kind,'wall');assert(Object.values(panel).some(m=>m?.wallPriority));}
   else {near(o.gaps.t.distance,expected.t);assert(!o.gaps.t.wallPriority);assert(o.gaps.t.moduleBoundary);}
   near(o.gaps.l.distance,expected.l);near(o.gaps.r.distance,expected.r);
   const window=S.surfaceOpening(f,{...scene,solidWallCount:0});near(window.gaps.t.distance,expected.t);assert(!window.gaps.t.wallPriority,'window is not a solid wall');
  }
  // A wall touching the neighboring module or just a corner cannot override.
  for(const wall of [wallRect(f,-1100,-420,-500,-300),wallRect(f,-1000,-420,-700,-300)]){const o=S.surfaceOpening(f,{furniture:items,rects:[wall]});near(o.gaps.t.distance,expected.t);assert(!o.gaps.t.wallPriority);}
 }
}
// The declared link wins a seam tie; independent placement follows its actual module.
const {host,f}=fixture(),items=[host,f],m=K.layout(host)[2],at=K.world(host,m.x,m.y),free={...f,cx:at[0],cy:at[1],w:400};delete free.counterLink;
assert.equal(S.surfaceOpening(free,{furniture:[host,free]}).gaps.l.entity.moduleKey,'module:2');
const before=S.surfaceOpening(f,{furniture:items}),growing=K.configure(host,{...host.kitchen,modules:host.kitchen.modules.map((m,i)=>i===0?{...m,width:900}:m)}),next=K.normalize([growing,structuredClone(f)]);assert.deepEqual(values(S.surfaceOpening(next[1],{furniture:next}).gaps),values(before.gaps),'neighbor width does not become module clearance');
const seam=K.world(host,-500,0),tied={...f,cx:seam[0],cy:seam[1]};assert.equal(K.measurementSurface(tied,host).moduleKey,'module:1');delete tied.counterLink;assert.equal(K.measurementSurface(tied,host).moduleKey,'module:0');
// Each U run has its own module orientation; the return run must not inherit the connector.
for(const run of [0,1,2])for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const k={...config,shape:'U',modules:[0,1,2].flatMap(r=>[{run:r,width:600,role:'door'},{run:r,width:1000,role:'sink'},{run:r,width:600,role:'door'}])},h=K.configure({...base,rot,flip},k),device=K.attach({...f},h,run*3+1);K.normalize([h,device]);const g=S.surfaceOpening(device,{furniture:[h,device]}).gaps;
 for(const [key,n] of Object.entries({l:135,r:135,t:85,b:85})){near(g[key].distance,n);assert.equal(g[key].entity.moduleKey,'module:'+(run*3+1));}
}
// Countertop front overhang is included, and only an adjacent real wall wins.
const over=K.configure(host,{...host.kitchen,counterDepth:630}),of=K.normalize([over,structuredClone(f)])[1],wall=wallRect(of,-500,333,500,453),o=S.surfaceOpening(of,{furniture:[over,of],rects:[wall]});near(o.gaps.b.distance,118);assert(o.gaps.b.wallPriority);
// The original no-module counter has no invented seams.
const legacy={...base,kitchen:undefined},lf={...f,cx:3000,cy:3000};delete lf.counterLink;const old=S.surfaceOpening(lf,{furniture:[legacy,lf]});near(old.gaps.l.distance,(2200-730)/2);assert(!old.gaps.l.moduleBoundary);
// Exact placement must keep the original module as its reference.
const pf={...f};delete pf.counterLink;
const plan={walls:[],wins:[],rooms:[{id:'r',poly:[[0,0],[10000,0],[10000,10000],[0,10000]]}]},work={furniture:[host,pf]},moved=D.placeAtDirectionalGap(plan,work,f.id,'r',50);near(S.directional(moved,{furniture:[host,moved]}).r.distance,50);assert.equal(S.directional(moved,{furniture:[host,moved]}).r.entity.moduleKey,'module:1');
assert.throws(()=>D.placeAtDirectionalGap(plan,work,f.id,'r',1500));
console.log('PASS shared sink/hob local-module boundaries, adjoining real-wall priority and 5 mm threshold, window/distant/corner-wall exclusion, rotation/mirror, straight/L/U, overhangs, neighboring edits, legacy fallback, fixed-reference placement and project restoration');
