'use strict';
const A=require('node:assert/strict'),P=require('../src/core/project-core.js'),F=require('../src/core/floor-finish-core.js'),G=require('../src/core/layout-geometry.js'),D=require('../src/core/floorplan-core.js'),Design=require('../src/core/design-core.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),{plan,work,draft}=fixture({openings:true});
work.architecture={phase:'survey',draft:copy(draft)};work.architecture.draft.sourceDXF='raw DXF '+('0\nLINE\n'.repeat(20000));
const room=plan.rooms[0].id;work.rooms[room].mat='tile800';work.furnitureDatum='finished-floor';work.floorFinishes={version:1,areas:{[room]:{rawZ:0,tileThickness:10,baseThickness:40,mode:'layers',layout:{width:600,height:300,gap:2,angle:0,origin:[0,0]}}}};
const initial=JSON.stringify(work),first=P.effectivePlan(plan,work);A.equal(first.customDraft.sourceDXF,work.architecture.draft.sourceDXF);
first.customDraft.walls[0].a[0]=-12345;first.floorFinish.areas[room].finishedZ=-1;
let next=P.effectivePlan(plan,work);A.notEqual(next.customDraft.walls[0].a[0],-12345);A.equal(next.floorFinish.areas[room].finishedZ,50,'caller cannot poison draft or floor cache');
work.architecture.draft.sourceDXF+='changed';A.equal(P.effectivePlan(plan,work).customDraft.sourceDXF,work.architecture.draft.sourceDXF,'raw source invalidates despite compact JSON key');
const before=copy(D.build(work.architecture.draft).walls);work.architecture.draft.scale*=1.1;next=P.effectivePlan(plan,work);A.notDeepEqual(next.walls,before,'in-place draft scale invalidates topology');
work.architecture.draft.scale/=1.1;
const host={id:'host',type:'coffeetable_yeswood_cherry',w:1200,d:650,h:450,cx:2000,cy:2000,rot:0},values=[];work.furniture=[host];
for(const z of [40,41,0,undefined,40]){const area=work.floorFinishes.areas[room];if(z===undefined)delete area.baseThickness;else area.baseThickness=z;const effective=P.effectivePlan(plan,work),parts=G.bodyParts(host,effective,work.furniture);values.push(copy(parts));if(z===undefined)A(parts.every(p=>p.vertical===null),'unknown floor must not reuse a known vertical range');else A(Math.abs(Math.min(...parts.map(p=>p.vertical.bottom))-(z+10))<.001,'world parts follow the current floor');}
A.deepEqual(values[0],values.at(-1),'restoring floor values restores exact world records');
const oldFloor=P.effectivePlan(plan,work);for(let i=0;i<6;i++){const changed=copy(work);changed.floorFinishes.areas[room].baseThickness=i;P.effectivePlan(plan,changed);}A.equal(P.effectivePlan(plan,work).floorFinish.areas[room].finishedZ,50,'bounded cache eviction retains correct results');
const newRooms=copy(oldFloor);newRooms.rooms[0].poly[0][0]+=100;A.notDeepEqual(F.derive(newRooms,work).floorFinish.areas[room].room.poly,oldFloor.floorFinish.areas[room].room.poly,'room geometry invalidates');
const restored=JSON.parse(initial);for(let i=0;i<3;i++){const round=P.unpack(P.pack({planId:plan.id,current:restored,designs:[],catalog:[]}));A.deepEqual(P.effectivePlan(plan,round.current).walls,P.effectivePlan(plan,restored).walls);}
const stepped={furnitureDatum:'finished-floor',rooms:[{id:'low',poly:[[0,0],[1000,0],[1000,1000],[0,1000]]},{id:'high',poly:[[1000,0],[2000,0],[2000,1000],[1000,1000]]}],floorFinish:{areas:{low:{finishedZ:0},high:{finishedZ:100}},doorways:[]}};
const support={id:'support',type:'block',cx:500,cy:500,w:100,d:100,h:10,rot:0},device={id:'device',type:'block',cx:1500,cy:500,w:100,d:100,h:20,rot:0,counterLink:{hostId:'support'}},obstacle={id:'obstacle',type:'block',cx:1500,cy:500,w:100,d:100,h:10,rot:0},list=[obstacle,device,support],order=()=>Design.planFurnitureOrder(list,stepped).map(f=>f.id);
A(order().indexOf('device')<order().indexOf('obstacle'));support.cx=1500;A(order().indexOf('obstacle')<order().indexOf('device'),'moving only a linked host invalidates device ordering height');support.cx=500;A(order().indexOf('device')<order().indexOf('obstacle'),'host restoration restores order');
console.log('PASS drag derived caches: raw DXF/topology changes, returned-object isolation, floor thresholds/unknowns, cache eviction and repeated restore');
