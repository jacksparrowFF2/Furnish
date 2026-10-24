const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const F=require('../src/core/wall-finish-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),S=require('../src/core/snapping.js'),G=require('../src/core/layout-geometry.js'),C=require('../src/core/floorplan-core.js'),K=require('../src/core/kitchen-core.js'),W=require('../src/core/work-state.js'),R=require('../src/core/repository-core.js'),DC=require('../src/core/drawing-core.js'),M=require('../src/render/wall-finish-model.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert(Math.abs(a-b)<2e-4,`${a} != ${b}`),add=(p,w,id,tile=10,bond=15,side)=>F.edit(w,F.faces(p).find(f=>f.wallId===id&&(side===undefined||f.side===side)),{...(tile===undefined?{}:{tileThickness:tile}),...(bond===undefined?{}:{bondThickness:bond})});
const {plan,work,draft}=fixture(),saved=JSON.stringify({plan,work});
assert.equal(F.faces(plan).length,4);
let finished=add(plan,work,'north'),effective=P.effectivePlan(plan,finished),spatial=F.spatial(effective);
assert.equal(JSON.stringify({plan,work}),saved);assert.deepEqual(effective.walls,plan.walls);assert.deepEqual(effective.rooms.map(r=>r.poly),plan.rooms.map(r=>r.poly));
assert.equal(F.spatial(spatial),spatial);near(DC.netSpans(spatial.rooms[0],[1500,1500]).vertical.value,2775);near(P.area(spatial.rooms[0].poly),3.8*2.775);
near(D.wallGaps(effective,work.furniture[0]).top.gap,25);
const opts={scale:1,rects:spatial.walls.map(w=>w.slice(0,4)),furniture:[],solidWallCount:spatial.walls.length};
near(S.directional(work.furniture[0],opts).t.distance,25);near(S.measurePoint({x:1000,y:228},opts).point.y,225);
const move=S.move(work.furniture[0],500,477,{...opts,grid:10,wallSnap:true,guides:false});near(move.position[1],475);
const resized=S.resize({...work.furniture[0],cx:1000,cy:1000}, {x:1250,y:3000},{...opts,wallSnap:true});assert(Number.isFinite(resized.furniture.d));
near(D.placeAtGap(effective,work.furniture[0],'top',0).cy,475);
near(D.placeSelectionAtDirectionalGap(effective,finished,['item'],'t',0)[0].cy,475);
assert.deepEqual(finished.furniture,work.furniture);assert.deepEqual(finished.measures,work.measures);
for(const [rotation,dir] of [[0,'t'],[90,'r'],[180,'b'],[270,'l']])near(D.placeSelectionAtDirectionalGap(effective,finished,['item'],dir,0,{rotation})[0].cy,475);
for(const rot of [0,37,90,180])for(const flip of [false,true]){const item={...work.furniture[0],rot,flip,cx:1200,cy:1200},moved=D.placeSelectionAtDirectionalGap(effective,{...finished,furniture:[item]},['item'],'t',0)[0];near(Math.min(...G.corners(moved).map(p=>p[1])),225);assert.equal(moved.rot,rot);assert.equal(moved.flip,flip);}
const grouped={...finished,furniture:[{...work.furniture[0],groupId:'g'},{...work.furniture[0],id:'other',cx:1100,groupId:'g'}]};const moved=D.placeSelectionAtDirectionalGap(effective,grouped,['item'],'t',0);near(moved[0].cy,475);near(moved[1].cx-moved[0].cx,600);assert.throws(()=>D.placeSelectionAtDirectionalGap(effective,{...grouped,furniture:grouped.furniture.map(f=>({...f,locked:true}))},['item'],'t',0),/锁定/);
for(const penetration of [0,.001,1,5,6,20]){const item={...work.furniture[0],cy:475-penetration},issues=P.spaceCheck(effective,[item],{scanPassages:false});assert.equal(issues.some(v=>v.kind==='wall'),penetration>5,'existing SAT wall tolerance is preserved');}
// Add asymmetric faces; raw structure and installation allowances stay separate.
finished=add(plan,finished,'west',10,20);finished=add(plan,finished,'east',15,20);finished=add(plan,finished,'south',20,20);effective=P.effectivePlan(plan,finished);spatial=F.spatial(effective);
const section=DC.netSpans(spatial.rooms[0],[1500,1500]);near(section.horizontal.value,3735);near(section.vertical.value,2735);near(P.area(spatial.rooms[0].poly),3.735*2.735);
assert.deepEqual(add(plan,finished,'north'),finished,'unchanged values preserve order, history and confirmation inputs');
for(const shape of ['L','U'])for(const flip of [false,true]){
 const modules=[{run:0,width:600,role:'door'},{run:0,width:600,role:'door'},{run:0,width:600,role:'door'},{run:1,width:800,role:'door'},...(shape==='U'?[{run:2,width:800,role:'door'}]:[])];
 const k=K.configure({id:'k',type:'counter',name:'拉伸厨房',w:2400,d:1800,cx:2000,cy:1700,rot:0,flip,color:'#ddd'},{version:1,shape,corner:'right',depth:600,baseHeight:820,thickness:40,modules});k.cy=225+k.d/2+73.25;
 const options={start:{x:0,y:0},grid:10,scale:.2,wallSnap:true,rects:spatial.walls.map(w=>w.slice(0,4)),furniture:[],guides:false};
 if(shape==='U'){
  const resized=S.resizeKitchenOuter(k,'top',{x:0,y:-55},options);assert.equal(resized.guides.length,1);near(resized.furniture.cy-resized.furniture.d/2,225);assert.deepEqual(resized.furniture.kitchen.modules,k.kitchen.modules);
 }else{
  near(S.directional(k,{...options,rects:options.rects}).t.distance,73.25);
  const next=D.placeSelectionAtDirectionalGap(effective,{...finished,furniture:[k]},['k'],'t',0)[0];near(next.cy-next.d/2,225);assert.deepEqual(next.kitchen,k.kitchen);
 }
}
const cabinet=require('../src/core/cabinet-core.js'),cab={id:'opening',type:'cabinet',name:'门板验证',cx:1800,cy:1800,rot:180,color:'#ddd',...cabinet.preset('entry-pegboard')};
cab.cy+=210-Math.min(...cabinet.openingZones(cab).filter(z=>z.kind==='cabinetdoor').flatMap(z=>z.poly.map(p=>p[1])));
assert(!P.spaceCheck(P.effectivePlan(plan,work),[cab],{scanPassages:false}).some(v=>v.kind==='cabinetdoor'));
assert(P.spaceCheck(effective,[cab],{scanPassages:false}).some(v=>v.kind==='cabinetdoor'),'production opening sweep includes finish thickness');
const passageBody={id:'passage',type:'bed',name:'通道阈值',cx:1700,cy:1600,w:3000,d:2800,h:800,rot:0};
assert(!P.spaceCheck(P.effectivePlan(plan,work),[passageBody],{passage:800}).some(v=>v.kind==='passage'));
assert(P.spaceCheck(P.effectivePlan(plan,add(plan,work,'east')),[passageBody],{passage:800}).some(v=>v.kind==='passage'&&/775/.test(v.message)));
const dxf=require('../src/io/dxf-export.js').drawing(effective,finished);assert(dxf.includes('WALL_FINISHES'));assert(!/NaN|Infinity|undefined/.test(dxf));
const unknown=add(plan,work,'north',10,undefined);delete unknown.wallFinishes.surfaces[0].bondThickness;const pending=P.effectivePlan(plan,unknown);assert.equal(pending.wallFinish.solids.length,0);assert(P.spaceCheck(pending,work.furniture).some(v=>v.kind==='wallfinish'&&v.pending));
const zero=add(plan,work,'north',0,0);assert.equal(P.effectivePlan(plan,zero).wallFinish.solids.length,0);
for(const value of [-1,201,NaN,Infinity,'10',null])assert.throws(()=>add(plan,work,'north',value));
const face=F.faces(plan)[0];for(const value of [{...face,range:[.9,.1]},{...face,side:0}])assert.throws(()=>F.edit(work,value,{tileThickness:1}));
assert.throws(()=>F.validate({version:1,surfaces:[...finished.wallFinishes.surfaces,finished.wallFinishes.surfaces[0]]}));
const reverse=fixture({reverse:true}),rw=add(reverse.plan,reverse.work,'north');assert.deepEqual(P.effectivePlan(reverse.plan,rw).wallFinish.solids.map(s=>s.rect),P.effectivePlan(plan,add(plan,work,'north')).wallFinish.solids.map(s=>s.rect));
const shared=fixture({partition:true}),faces=F.faces(shared.plan).filter(f=>f.wallId==='middle');assert.equal(faces.length,2);assert.deepEqual(faces.map(f=>f.side),[-1,1]);let both=add(shared.plan,shared.work,'middle',10,15,-1);both=add(shared.plan,both,'middle',10,25,1);const b=P.effectivePlan(shared.plan,both);assert.deepEqual(b.wallFinish.solids.map(s=>s.rect).sort(),[[2025,200,2050,3000],[2150,200,2185,3000]].sort());
const open=fixture({openings:true});let ow=add(open.plan,open.work,'north');ow=add(open.plan,ow,'east');const op=P.effectivePlan(open.plan,ow),north=op.wallFinish.solids.filter(s=>s.wallId==='north'),east=op.wallFinish.solids.filter(s=>s.wallId==='east');assert(north.some(s=>s.bottom===2100));assert(!north.some(s=>s.bottom===0&&s.rect[0]<2100&&s.rect[2]>2100));assert(east.some(s=>s.bottom===0&&s.top===900));assert(east.some(s=>s.bottom===2400));assert(!east.some(s=>s.bottom<=1000&&s.top>=2000&&s.rect[1]<1600&&s.rect[3]>1600));
const issue={kind:'wall',id:'item'},finger=P.checkFingerprint(issue,effective,finished.furniture,800);assert.notEqual(P.checkFingerprint(issue,P.effectivePlan(plan,work),work.furniture,800),finger);assert.equal(P.checkFingerprint(issue,effective,finished.furniture.map(f=>({...f,color:'#000',price:88,purchaseStatus:'ordered'})),800),finger);
// DXF imports can encode a complete window / door host without any plain wall.
const fullDraft=copy(open.draft);fullDraft.walls=fullDraft.walls.flatMap(w=>{
 if(!['north','east'].includes(w.id))return [w];
 const a=w.id==='north'?[110,10]:[410,110],b=w.id==='north'?[310,10]:[410,210];
 return [{...w,id:w.id+'-start',b:a,caps:[0,0]},{...w,a,b,caps:[0,0]},{...w,id:w.id+'-end',a:b,caps:[0,0]}];
});fullDraft.openings.find(o=>o.id==='window').length=1000;fullDraft.openings.find(o=>o.id==='door').length=2000;
const fullPlan=C.build(fullDraft),fullWork={...copy(open.work),architecture:{...copy(open.work.architecture),draft:fullDraft}};
assert(!fullPlan.wallRefs.includes('east'));assert(!fullPlan.wallRefs.includes('north'));
let fullFinish=add(fullPlan,fullWork,'east');fullFinish=add(fullPlan,fullFinish,'north');
const fullEffective=P.effectivePlan(fullPlan,fullFinish);assert.equal(fullEffective.wallFinish.pending.length,0);
assert(fullEffective.wallFinish.solids.some(s=>s.wallId==='east'&&s.bottom===0&&s.top===900));assert(fullEffective.wallFinish.solids.some(s=>s.wallId==='east'&&s.bottom===2400));assert(fullEffective.wallFinish.solids.some(s=>s.wallId==='north'&&s.bottom===2100));
const noOpening={...fullPlan,wins:[],doors:[]};assert(!F.faces(noOpening).some(f=>f.wallId==='east'||f.wallId==='north'));
const returnDraft=copy(draft);returnDraft.walls.push({id:'return',a:[210,10],b:[210,110],kind:'n',thickness:300,caps:[0,0]});
const returnPlan=C.build(returnDraft),returnWork={...copy(work),architecture:{...copy(work.architecture),draft:returnDraft}},endFace=F.faces(returnPlan).find(f=>f.wallId==='return'&&f.cross&&f.side===1);
assert(endFace);const returnFinish=F.edit(returnWork,endFace,{tileThickness:10,bondThickness:15}),returnEffective=P.effectivePlan(returnPlan,returnFinish);
assert.equal(returnEffective.wallFinish.pending.length,0);assert.deepEqual(returnEffective.wallFinish.solids.map(s=>s.rect),[[1950,1100,2250,1125]]);
assert(P.unpack(P.pack({planId:returnPlan.id,current:returnFinish,designs:[],catalog:[]})).current.wallFinishes.surfaces[0].cross);
const longFace=F.faces(returnPlan).find(f=>f.wallId==='return'&&!f.cross&&f.side===1),returnBoth=F.edit(returnFinish,longFace,{tileThickness:8,bondThickness:12});assert.equal(returnBoth.wallFinishes.surfaces.length,2);assert.equal(F.edit(returnBoth,endFace,null).wallFinishes.surfaces.length,1);
for(let i=0;i<3;i++){const payload={planId:plan.id,current:finished,designs:[{name:'饰面方案',work:finished}],catalog:[]},pack=P.pack(payload);assert.equal(pack.version,2);const loaded=P.unpack(pack);finished=W.create({makeId:()=> 'new',colorFor:()=> '#ddd',materials:{wood:{}}}).restore(loaded.current,plan);assert.deepEqual(loaded.designs[0].work.wallFinishes,finished.wallFinishes);near(DC.netSpans(F.spatial(P.effectivePlan(plan,finished)).rooms[0],[1500,1500]).horizontal.value,3735);assert.deepEqual(finished.furniture,work.furniture);assert.deepEqual(finished.architecture.draft,draft);}
assert.equal(P.pack({planId:plan.id,current:work,designs:[],catalog:[]}).version,1);assert.equal(P.effectivePlan(plan,work).wallFinish,undefined);
const workspace={v:2,planId:plan.id,work:{[plan.id]:finished},designs:[],custom:[],customPlans:[draft]};assert.equal(JSON.parse(R.text(workspace)).version,2);assert.deepEqual(R.parse(JSON.parse(R.text(workspace))),R.portable(workspace));assert.throws(()=>R.parse({format:'furnish-workspace',version:999,workspace}));
const orphan=copy(finished);orphan.wallFinishes.surfaces[0].wallId='deleted';assert(P.effectivePlan(plan,orphan).wallFinish.pending.some(p=>p.wallId==='deleted'));
const deleted=copy(shared.work);deleted.architecture.draft.walls=deleted.architecture.draft.walls.filter(w=>w.id!=='middle');deleted.wallFinishes=both.wallFinishes;assert.equal(P.effectivePlan(shared.plan,deleted).wallFinish.pending.length,2);
const calibrated=copy(finished);calibrated.architecture.draft.scale=20;assert(P.effectivePlan(plan,calibrated).wallFinish.solids.every(s=>Math.min(s.rect[2]-s.rect[0],s.rect[3]-s.rect[1])<=40));
const shifted=P.copyProject({planId:plan.id,current:finished,designs:[{name:'copy',work:finished}],catalog:[]},'custom_finish_copy');assert.deepEqual(shifted.current.wallFinishes,finished.wallFinishes);
const builtin=require('../src/data/plans.js')[0],bf=F.faces(builtin)[0],bw=F.edit({furniture:[]},bf,{tileThickness:10,bondThickness:15}),conversion=C.fromPlan(builtin,'custom_finish_preset'),converted=C.build(conversion.draft);F.remapBuiltin(bw,builtin,converted,conversion.shift);assert(bw.wallFinishes.surfaces.every(s=>!s.wallId.startsWith('builtin_')));assert(P.effectivePlan(converted,bw).wallFinish.solids.length>0);
// Actual commit and restoration must preserve even an existing unsynchronised auto-avoid configuration.
const kitchen=K.configure({id:'k',type:'counter',name:'厨房',w:1200,d:600,cx:1800,cy:500,rot:0,color:'#ddd'},K.defaults({w:1200,d:600}));kitchen.kitchen.autoAvoid=true;
const original={...copy(work),furniture:[kitchen]},next=add(plan,original,'north'),app=fs.readFileSync(require.resolve('../src/app.js'),'utf8'),ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishWallFinish:F,FurnishKitchen:K,FurnishDesign:D,FurnishProject:P,PLAN:plan,state:next,undoStack:[],redoStack:[],save(){},snapshot(){},before:JSON.stringify(original)}));
vm.runInContext(app.match(/function commit\(before\)\{[^\n]+/)[0]+'\ncommit(before);',ctx);assert.deepEqual(next.furniture,original.furniture);assert.equal(ctx.undoStack.length,1);
const restored=W.create({makeId:()=> 'new',colorFor:()=> '#ddd',materials:{wood:{}}}).restore(copy(next),plan);assert.deepEqual(restored.furniture,next.furniture);
console.log('PASS finish boundaries, snapping, numeric placement, rooms, thresholds, mirrored/rotated groups, openings, side binding, versions, calibration, copies, repeated recovery and unchanged cabinets');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),THREE=await import(JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),model=M.build(THREE,op);
 assert(model.children.length>0);for(const mesh of model.children){const s=mesh.userData.wallFinish,box=new THREE.Box3().setFromObject(mesh);near(box.min.y*1000,s.bottom);near(box.max.y*1000,s.top);near(box.min.x*1000,s.rect[0]);near(box.max.x*1000,s.rect[2]);near(box.min.z*1000,s.rect[1]);near(box.max.z*1000,s.rect[3]);assert(mesh.geometry.attributes.position.array.every(Number.isFinite));}
 const cut=M.build(THREE,op,{top:1200});assert(cut.children.every(m=>m.userData.wallFinish.top<=1200));
 const doorSection=new THREE.Vector3(2.1,1,.2125);assert(!model.children.some(mesh=>new THREE.Box3().setFromObject(mesh).containsPoint(doorSection)),'real production door opening stays clear');
 console.log('PASS real Three.js tile / bond solids, millimetre boundaries, cut heights and door openings');
})().catch(e=>{console.error(e);process.exitCode=1;});
