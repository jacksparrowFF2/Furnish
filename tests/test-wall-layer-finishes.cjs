const assert=require('node:assert/strict'),fs=require('node:fs'),L=require('../src/core/layers-core.js'),W=require('../src/core/wall-finish-core.js'),T=require('../src/core/wall-tiling-core.js'),P=require('../src/core/project-core.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
(async()=>{
 const THREE=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const options of [{partition:true},{partition:true,reverse:true},{openings:true}]){
  const {plan,work:base}=fixture(options);for(const r of plan.rooms)base.rooms[r.id].use='bathroom';
  let work=T.setEnabled(base,P.effectivePlan(plan,base),plan.rooms.map(r=>r.id),true);
  for(const f of T.faces(P.effectivePlan(plan,work),work))work=W.edit(work,f,{tileThickness:10,bondThickness:15});
  const derived=P.effectivePlan(plan,work),solids=derived.wallFinish.solids;assert(solids.length);
  for(const s of solids){
   const key=L.wallFinishKey(derived,s);assert(key,'each finish solid maps to its tiled face');
   const face=derived.wallTiling.surfaces.find(e=>L.faceKey(e.face)===key).face;
   assert.equal(face.roomId,s.roomId);assert.equal(derived.wallTiling.surfaces.find(e=>L.faceKey(e.face)===key).normal,s.normal);assert.equal(face.side,s.side);
   assert.equal(L.wallFinishKey({...derived,wallTiling:undefined},s),null,'untiled finish remains independent');
  }
  const middle=solids.filter(s=>s.wallId==='middle');if(options.partition)assert(new Set(middle.map(s=>L.wallFinishKey(derived,s))).size>=2,'opposite sides are independent');
  const model=require('../src/render/wall-finish-model.js').build(THREE,derived);
  for(const mesh of model.children){assert(mesh.userData.layerObject);assert(['tile','bond'].includes(mesh.userData.wallFinish.layer));}
  assert.equal(model.children.length,solids.length*2,'tagging does not change production geometry');
 }
 // Actual projects may name functional areas separately from physical rooms.
 const zoneBase=fixture(),zonePlan={...zoneBase.plan,physicalRooms:zoneBase.plan.rooms,rooms:zoneBase.plan.rooms.map(r=>({...r,id:'area_'+r.id}))};
 for(const r of zonePlan.rooms)zoneBase.work.rooms[r.id]={use:'bathroom'};
 let zoneWork=T.setEnabled(zoneBase.work,zonePlan,zonePlan.rooms.map(r=>r.id),true);
 for(const f of T.faces(zonePlan,zoneWork))zoneWork=W.edit(zoneWork,f,{tileThickness:10,bondThickness:20});
 const zoneDerived=T.derive(W.derive(zonePlan,zoneWork),zoneWork);
 assert(zoneDerived.wallFinish.solids.length);for(const s of zoneDerived.wallFinish.solids){const k=L.wallFinishKey(zoneDerived,s);assert(k);assert(zoneDerived.wallTiling.surfaces.some(e=>L.faceKey(e.face)===k&&e.face.roomId!==s.roomId));}
 // Same source and side may contain separate room ranges or perpendicular returns.
 const face={wallId:'shared',roomId:'bath',normal:1,side:1,lo:100,hi:200,range:[.1,.2]};
 const derived={walls:[[0,0,1000,50]],finishWallIds:['shared'],wallTiling:{surfaces:[{face,normal:1},{face:{...face,roomId:'kitchen',range:[.2,.3]},normal:1},{face:{...face,cross:true,range:[0,1]},normal:0}]}};
 const solid={wallId:'shared',roomId:'bath',normal:1,side:1,rawRect:[100,10,200,20],rect:[90,10,210,20]};
 assert.equal(L.wallFinishKey(derived,solid),L.faceKey(face),'raw extents survive miter expansion');
 assert.equal(L.wallFinishKey(derived,{...solid,side:-1}),null);assert.equal(L.wallFinishKey(derived,{...solid,roomId:'physical-room'}),L.faceKey(face),'functional area and physical room ids may differ');
 assert.equal(L.wallFinishKey(derived,{...solid,rawRect:[200,10,300,20]}),L.faceKey(derived.wallTiling.surfaces[1].face),'neighboring area range remains independent');
 console.log('PASS wall layer finishes: production tile/bond bindings, reverse walls, openings, opposite sides, shared ranges and miter extents');
})().catch(e=>{console.error(e);process.exitCode=1;});
