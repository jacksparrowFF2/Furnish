const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),K=require('../src/core/kitchen-core.js'),R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`),values=gaps=>Object.fromEntries(Object.entries(gaps).map(([key,m])=>[key,m?.distance]));
const host={id:'top',type:'counter',name:'承托台面',cx:2000,cy:2000,w:1800,d:600,rot:0,color:'#ddd'},sink={id:'sink',type:'sink_arrow_750',name:'箭牌水槽',cx:2100,cy:2010,w:750,d:450,h:240,rot:0,color:'#85898a',...R.initial({type:'sink_arrow_750'})};
assert.equal(S.hobOpening,S.surfaceOpening,'gas-hob callers keep the shared implementation');
for(const type of ['sink_arrow_680','sink_arrow_750'])assert(R.definition(type).measureSurfaceBoundary);
for(const mode of ['top','flush','under']){
 const f={...sink,sinkInstall:mode},items=K.normalize([structuredClone(host),f]),before=JSON.stringify(items),panel=S.directional(f,{furniture:items}),opening=S.surfaceOpening(f,{furniture:items});
 assert.deepEqual(values(panel),{l:625,r:425,t:85,b:65});assert(Object.values(panel).every(m=>m.surfaceBoundary&&m.entity.id===host.id));
 assert.deepEqual(values(opening.gaps),mode==='under'?{l:645,r:445,t:104.5,b:84.5}:{l:635,r:435,t:95,b:75});
 assert.deepEqual(opening.size,K.cutout(f));assert.equal(JSON.stringify(items),before,'measurement is derived, without writes');
 for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
  const h={...host,rot,flip},[cx,cy]=K.world(h,100,10),device={...f,cx,cy,rot,flip},o=S.surfaceOpening(device,{furniture:[h,device]});
  for(const [key,v]of Object.entries(values(opening.gaps)))near(o.gaps[key].distance,v);
  for(const m of Object.values(o.gaps)){assert(m.surfaceBoundary);near(Math.hypot(m.a.x-m.b.x,m.a.y-m.b.y),m.distance);}
  const p=S.directional(device,{rotation:-rot,furniture:[h,device]}),expected=values(panel);if(flip)[expected.l,expected.r]=[expected.r,expected.l];for(const key of Object.keys(expected))near(p[key].distance,expected[key]);
 }
}
for(const gap of [0,.999,1,1.001]){const f={...sink,cx:host.cx+host.w/2-sink.w/2-gap},m=S.directional(f,{furniture:[host,f]}).r;near(m.distance,gap);assert(m.surfaceBoundary);}
const over={...sink,cx:host.cx+host.w/2-sink.w/2+.01};assert.equal(S.surfaceOpening(over,{furniture:[host,over]}),null);assert(!S.directional(over,{furniture:[host,over]}).r?.surfaceBoundary);
assert.equal(S.surfaceOpening(sink,{furniture:[sink]}),null);assert.equal(S.surfaceOpening({...sink,obj:{}},{furniture:[host,sink]}),null);assert.equal(S.surfaceOpening({...sink,type:'ksink'},{furniture:[host,sink]}),null,'legacy generic sink unchanged');
const unknown={...sink};delete unknown.h;delete unknown.counterElevation;const original=JSON.stringify(unknown);assert(S.surfaceOpening(unknown,{furniture:[host,unknown]}));assert.equal(JSON.stringify(unknown),original);
const blocker={id:'blocker',type:'cabinet',name:'同高障碍',w:100,d:100,h:950,cx:2625,cy:2010,rot:0};near(S.directional(sink,{furniture:[host,sink,blocker]}).r.distance,100);
for(const shape of ['straight','L','U'])for(const rot of [0,37,90])for(const flip of [false,true]){
 const h=K.configure({...host,rot,flip},{version:1,shape,depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'sink'},...(shape==='straight'?[]:[{run:1,width:1000,role:'door'}]),...(shape==='U'?[{run:2,width:1200,role:'door'}]:[])]}),f=K.attach({...sink,sinkInstall:'under'},h,0),items=K.normalize([h,f]);
 const o=S.surfaceOpening(f,{furniture:items}),ring=K.deviceOpenings(h,items)[0].ring.map(p=>K.world(h,...p));for(let i=0;i<ring.length;i++)for(let axis=0;axis<2;axis++)near(o.ring[i][axis],ring[i][axis]);
 const expected={l:245,r:245,t:94.5,b:94.5};for(const key of Object.keys(expected))near(o.gaps[key].distance,expected[key]);
 const payload={planId:'sink',current:{furniture:items},designs:[{name:'水槽台面',work:{furniture:items}}],catalog:[]},saved=P.unpack(P.pack(payload));assert.deepEqual(saved,payload);let restored=saved.current.furniture;
 for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#ddd'});assert.deepEqual(restored,items);assert.deepEqual(S.surfaceOpening(restored[1],{furniture:restored}),o);
}
const h=K.configure(host,{version:1,shape:'straight',depth:600,baseHeight:820,thickness:40,autoAvoid:true,modules:[{run:0,width:1200,role:'sink'}]}),f={...sink,cx:2000,cy:2000};
h.kitchen.obstacleFit={depths:[],cuts:[[[-600,-300],[-500,-300],[-500,300],[-600,300]]]};const notch=S.surfaceOpening(f,{furniture:[h,f]});near(notch.gaps.l.distance,135);
h.kitchen.obstacleFit.cuts=[[[-50,-50],[50,-50],[50,50],[-50,50]]];assert.equal(S.surfaceOpening(f,{furniture:[h,f]}),null,'existing material holes prevent complete support');
const l=K.configure(host,{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'sink'},{run:1,width:1000,role:'door'}]}),point=K.world(l,300,300),inVoid={...sink,w:100,d:100,cx:point[0],cy:point[1]};assert.equal(S.surfaceOpening(inVoid,{furniture:[l,inVoid]}),null);
const plan={walls:[],wins:[],rooms:[{id:'r',poly:[[0,0],[5000,0],[5000,5000],[0,5000]]}]},items=K.normalize([structuredClone(host),structuredClone(sink)]),moved=D.placeAtDirectionalGap(plan,{furniture:items},sink.id,'r',200);near(moved.cx,2325);near(S.directional(moved,{furniture:[items[0],moved]}).r.distance,200);
console.log('PASS sink worktop outer-edge and cutout margins, three mounting modes, contact thresholds, rotated/mirrored views, real straight/L/U surfaces, production holes, notches, blockers, precise placement, legacy/unknown records and project restoration');
