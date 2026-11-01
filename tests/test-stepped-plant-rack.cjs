'use strict';
const A=require('node:assert/strict'),P=require('../src/core/product-rules.js'),M=require('../src/render/balcony-garden-model.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js');
const f={id:'rack',name:'阶梯架',color:'#b89b74',type:'balcony_plant_rack_step',w:1160,d:550,h:1300,cx:0,cy:0,rot:0},parts=M.rackParts(f),lo=parts.filter(p=>p.name.startsWith('slat-lower')),hi=parts.filter(p=>p.name.startsWith('slat-upper'));
A.equal(P.modelError(f),null);A(P.modelError({...f,d:399}));A(P.modelError({...f,h:999}));A.equal(P.modelError({...f,w:600,d:400,h:1000}),null);
A(lo.length>1&&hi.length>1);A(lo.every(p=>p.center[1]+p.size[1]/2===800));A(hi.every(p=>p.center[1]+p.size[1]/2===1300));A.equal(Math.min(...hi.map(p=>p.center[2]-p.size[2]/2)),-245);A.equal(Math.max(...hi.map(p=>p.center[2]+p.size[2]/2)), -5);
for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const rack={...f,rot,flip},angle=rot*Math.PI/180,probe=(x,z,y,h=30)=>{x*=flip?-1:1;return {id:'probe',type:'block',cx:x*Math.cos(angle)-z*Math.sin(angle),cy:x*Math.sin(angle)+z*Math.cos(angle),w:40,d:40,mountHeight:y,h,rot};};
 A(!G.volumeOverlap(rack,probe(300,130,0,450)),'base bay open');
 A(!G.volumeOverlap(rack,probe(300,130,800,450)),'front plant clears set-back upper shelf');
 A(G.volumeOverlap(rack,probe(300,-200,1290)),'upper slat penetration');
 A(!G.volumeOverlap(rack,probe(300,-200,1300)),'upper top contact');
 A(G.volumeOverlap(rack,probe(0,10,850)),'upper front middle post is solid');
 const inner=S.cabinetInterior(probe(300,130,0,450),{furniture:[rack]});A(inner&&inner.collisions.length===0);A(inner.top.distance>=300&&inner.top.distance<=350);
}
console.log('PASS stepped rack: two set-back slatted tiers, limits, real upper/front/ground clearances, contact/penetration, rotations/mirrors');
const J=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),R=require('../src/core/repository-core.js');
const changed={...f,rackLowerHeight:700,rackUpperDepth:360,rackPost:35,rackBoard:25,rackSlatGap:12},layout=P.gardenLayout(changed);
A.deepEqual(layout,{lower:700,upperDepth:360,post:35,board:25,gap:12});
for(const patch of [{rackLowerHeight:1250},{rackUpperDepth:525},{rackPost:81},{rackBoard:9},{rackSlatGap:26}])A(P.modelError({...f,...patch}));
const original=G.bodyParts(f),modified=G.bodyParts(changed);A.notDeepEqual(modified,original,'parameters invalidate production world cache');A.deepEqual(G.bodyParts({...f}),original,'restore produces exact original parts');
const plan={id:'p',walls:[],wins:[],doors:[],rooms:[]},context=J.checkFingerprint({kind:'probe'},plan,[f],800);A.notDeepEqual(J.checkFingerprint({kind:'probe'},plan,[changed],800),context,'spatial confirmation reads structure');A.deepEqual(J.checkFingerprint({kind:'probe'},plan,[{...f,color:'#ffffff',referencePrice:1}],800),context,'nonspatial edits retain confirmation');
const packet=J.pack({planId:'p',current:{furniture:[changed]},designs:[{name:'阶梯',work:{furniture:[changed]}}],catalog:[{...changed,name:"阶梯",price:0}]});A.equal(packet.version,44);A.deepEqual(J.unpack(JSON.parse(JSON.stringify(packet))).current.furniture,[changed]);
let restored=[changed];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#ccc'});A.deepEqual(restored,[changed]);A(R.workspaceVersions.includes(44));
A.deepEqual(P.gardenLayout(f),{lower:800,upperDepth:300,post:30,board:20,gap:8});A.equal(f.rackLowerHeight,undefined,'missing configuration is not materialized on read');
A.equal(P.modelError({...f,rackLowerHeight:1200,rackUpperDepth:500}),null,'exact 100 height and 50 setback limits');A(P.modelError({...f,rackLowerHeight:1200.01}));A(P.modelError({...f,rackUpperDepth:500.01}));
const resized=D.resizeFurniture(changed,{w:1300,d:600,h:1400});for(const key of P.types.balcony_plant_rack_step.fields)A.equal(resized[key],changed[key],'outer resizing retains independent '+key);
const Cache=require('../src/io/workspace-cache.js'),workspace={v:44,planId:'p',work:{p:{furniture:[changed]}},designs:[],customPlans:[],custom:[]};A.equal(Cache.load({read:k=>k==='huxing-design-v44'?JSON.stringify(workspace):null,key:'huxing-design-v44',firstPlan:plan,restore:v=>v}).v,44);A.equal(Cache.load({read:k=>k==='huxing-design-v43'?JSON.stringify({...workspace,v:43}):null,key:'huxing-design-v44',firstPlan:plan,restore:v=>v}).v,43);
const next=P.replacement(changed,{...changed,type:'plant_spider',w:450,d:450,h:450},{type:'plant_spider',w:450,d:450,h:450});for(const key of P.types.balcony_plant_rack_step.fields)A.equal(next[key],undefined,'replacement clears incompatible '+key);
console.log('PASS five independent rack parameters: shape/cache/check invalidation, limits, v44 project/named/catalog roundtrip, replacement and repeated restore');
