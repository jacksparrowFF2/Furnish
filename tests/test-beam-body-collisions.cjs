const normalized=require('./helpers/current-furniture.cjs');
const assert=require('node:assert/strict'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),C=require('../src/core/cabinet-core.js');
const cabinet={id:'cab',name:'验收柜',type:'wardrobe',cx:4000,cy:4000,w:2000,d:600,h:2400,rot:0},poly=P.polygon(cabinet),beam={id:'beam',name:'顶梁',poly,bottomHeight:2300,topHeight:2700,review:'beam-height'};
const plan={id:'body-test',walls:[],doors:[],rooms:[{id:'r',name:'房间',poly:[[0,0],[10000,0],[10000,10000],[0,10000]]}],beams:[beam],ceilingHeight:4000};
const check=(f=cabinet,b=beam,options={})=>P.spaceCheck({...plan,beams:[b]},[f],{scanPassages:false,...options}).filter(v=>v.kind==='beam');
assert(check().some(v=>!v.pending&&v.id==='cab'&&v.beamId==='beam'&&/家具实体与房梁三维重叠/.test(v.message)));
for(const h of [2300,2299,1000])assert.equal(check({...cabinet,h}).length,0,'below/contact beam clears');
assert(check({...cabinet,h:2301}).some(v=>!v.pending),'1mm top penetration');
const withoutHeight={...cabinet};delete withoutHeight.h;
assert.equal(D.furnitureVerticalBounds(withoutHeight).top,C.height(withoutHeight));assert.equal(check(withoutHeight,{...beam,bottomHeight:C.height(withoutHeight),topHeight:3000}).length,0,'old cabinet default height');
assert(check(withoutHeight,{...beam,bottomHeight:C.height(withoutHeight)-1,topHeight:3000}).length);
const unknownBeam={...beam};delete unknownBeam.bottomHeight;delete unknownBeam.topHeight;
assert(check(cabinet,unknownBeam).every(v=>v.pending&&/梁高未录入/.test(v.message)),'unknown beam stays pending');
const unknownFurniture={...cabinet,type:'unknown'};delete unknownFurniture.h;
assert(check(unknownFurniture).some(v=>v.pending&&/家具高度未知/.test(v.message)));
assert(check(unknownFurniture,unknownBeam).some(v=>v.pending&&/梁高未录入、家具高度未知/.test(v.message)));
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const f={...cabinet,rot,flip};assert.equal(check(f,{...beam,poly:P.polygon(f)}).length,1,'rotated mirrored body');
 assert.equal(check(f,{...beam,poly:P.polygon({...f,cx:9000,cy:9000})}).length,0,'horizontal separation');
}
for(const dx of [2000,1995])assert.equal(check(cabinet,{...beam,poly:P.polygon({...cabinet,cx:cabinet.cx+dx})}).length,0,'horizontal face/5mm tolerance');
assert.equal(check(cabinet,{...beam,poly:P.polygon({...cabinet,cx:cabinet.cx+1994})}).length,1);
for(const type of ['acwall','pendant','tv','mirror']){
 const f={...cabinet,type};delete f.h;const v=D.furnitureVerticalBounds(f);
 assert(check(f,{...beam,bottomHeight:v.top-1,topHeight:v.top+100}).some(v=>!v.pending),'mounted objects are checked');
 assert.equal(check(f,{...beam,bottomHeight:0,topHeight:v.bottom}).length,0,'body above beam clears');
}
const washer={...cabinet,type:'washer',h:850,mountHeight:2700};assert.equal(check(washer).length,0,'body bottom touches beam top');assert.equal(check({...washer,mountHeight:2699}).length,1);
for(const type of ['rug','plant','curtain'])assert.equal(check({...cabinet,type},unknownBeam).length,0,'nonrigid/soft reference excluded');
assert.equal(P.spaceCheck({...plan,beams:undefined},[cabinet],{scanPassages:false}).filter(v=>v.kind==='beam').length,0,'old project without beams');
assert.equal(check(cabinet,beam,{focusId:'other'}).length,0);assert.equal(check(cabinet,beam,{focusIds:['cab'],maxIssues:1}).length,1);
const other={...cabinet,id:'other',cx:7000};assert.equal(P.spaceCheck(plan,[cabinet,other],{focusIds:['other'],scanPassages:false}).filter(v=>v.kind==='beam').length,0);
const issue=check()[0],key=P.checkFingerprint(issue,plan,[cabinet],800),work={furniture:[cabinet],spaceIgnored:[key]};
assert(P.review(plan,work).some(v=>v.kind==='beam'&&v.ignored));
assert(P.review({...plan,beams:[{...beam,bottomHeight:2290}]},work).some(v=>v.kind==='beam'&&!v.ignored),'beam edit invalidates confirmation');
assert(P.review(plan,{...work,furniture:[{...cabinet,h:2450}]}).some(v=>v.kind==='beam'&&!v.ignored),'height edit invalidates confirmation');
assert(P.review(plan,{...work,furniture:[{...cabinet,price:999,color:'#abc'}]}).some(v=>v.kind==='beam'&&v.ignored),'nongeometry edit keeps confirmation');
const payload={planId:'p1',current:work,designs:[{name:'旧柜方案',work}],catalog:[]};assert.deepEqual(P.unpack(P.pack(payload)).current,normalized.work(work));
const fs=require('node:fs'),F=require('../src/core/floorplan-core.js'),W=require('../src/core/work-state.js').create({makeId:()=> 'generated',colorFor:()=> '#eee',materials:{tile:{}}});
const saved=P.unpack(JSON.parse(fs.readFileSync('tests/fixtures/beam-body-project.json','utf8'))),old=structuredClone(saved.current),draft=F.editBeam(old.architecture.draft,'body-beam',2399,2700);
saved.current.architecture.draft=draft;
const base=F.build(draft),restored=W.restore(P.unpack(P.pack(saved)).current,base);
assert(P.spaceCheck(P.effectivePlan(base,restored),restored.furniture,{scanPassages:false}).some(v=>v.kind==='beam'&&!v.pending),'actual restored project retains body check');
assert.deepEqual(W.restore(structuredClone(restored),base),restored,'repeat restore no drift');assert.deepEqual(restored.architecture.baseline,old.architecture.baseline);
assert.deepEqual(restored.furniture[0],old.furniture[0],'restoration upgrades the old cabinet once');
const shared=W.prepareShared(restored,base);assert(P.spaceCheck(P.effectivePlan(base,shared),shared.furniture,{scanPassages:false}).some(v=>v.kind==='beam'&&!v.pending));
const twins=P.spaceCheck({...plan,beams:[beam,{...beam,id:'beam2'}]},[cabinet],{scanPassages:false}).filter(v=>v.kind==='beam');assert.equal(twins.length,2);assert.notEqual(P.checkFingerprint(twins[0],plan,[cabinet],800),P.checkFingerprint(twins[1],plan,[cabinet],800),'same-name beams have distinct identities');
console.log('PASS beam/body: cabinet top/contact/1mm, default old height, vertical separation, mounted objects, unknown heights, rotated/mirrored projection, tolerance, focus/limit, review invalidation and backup');
