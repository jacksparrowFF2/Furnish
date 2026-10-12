const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const make=template=>({id:'cab',type:'cabinet',cx:2500,cy:2500,rot:0,color:'#fff',...C.preset(template)});
const plan={rooms:[{id:'room',name:'Room',poly:[[0,0],[8000,0],[8000,8000],[0,8000]],ceilingHeight:4000}],walls:[],doors:[],ceilingHeight:4000};
const local=(f,x,y)=>{x*=f.flip?-1:1;const a=f.rot*Math.PI/180;return {cx:f.cx+x*Math.cos(a)-y*Math.sin(a),cy:f.cy+x*Math.sin(a)+y*Math.cos(a)};};
const obstacle=(f,x,y,bottom,h,type='washer')=>({id:'obstacle',name:'障碍',type,...local(f,x,y),w:80,d:80,rot:f.rot,mountHeight:bottom,h});
const physical=(f,b,p=plan)=>P.spaceCheck(p,[f,b],{scanPassages:false}).filter(v=>v.id===f.id&&['cabinetdoor','cabinetdrawer'].includes(v.kind));
const peg=make('entry-pegboard');
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const f={...peg,rot,flip},low=obstacle(f,-160,f.d/2+180,0,850),high={...low,mountHeight:1850,h:200};
 assert.equal(physical(f,low).filter(v=>v.kind==='cabinetdoor').length,0,'low body beneath upper door');
 assert(physical(f,high).some(v=>v.kind==='cabinetdoor'&&!v.pending),'high body blocks upper door');
}
const gap=make('entry-console'),middle=obstacle(gap,-420,gap.d/2+150,1000,200);
assert.equal(physical(gap,middle).filter(v=>v.kind==='cabinetdoor').length,0,'entry niche is not a full-height door');
assert(physical(gap,{...middle,mountHeight:1600}).some(v=>v.kind==='cabinetdoor'));
const side=make('sideboard-fridge'),bay=C.layout(side)[1],front=-side.d/2+side.cabinet.sideboard.lowerDepth;
const drawer=C.openingZones(side).find(v=>v.kind==='cabinetdrawer'),drawerTop=drawer.ranges[0][1];
assert.equal(physical(side,obstacle(side,bay.center,front+130,drawerTop,80)).filter(v=>v.kind==='cabinetdrawer').length,0,'vertical face contact does not collide');
assert(physical(side,obstacle(side,bay.center,front+130,drawerTop-1,80)).some(v=>v.kind==='cabinetdrawer'),'1 mm vertical penetration');
const zone=C.openingZones(side).find(v=>v.section==='display'),sw=zone.sweep,pivot=side.cabinet.sideboard.baseHeight+side.cabinet.sideboard.counterThickness+side.cabinet.sideboard.nicheHeight+side.cabinet.sideboard.displayHeight-1;
const x=(sw.left+sw.right)/2,frontGlass=-side.d/2+side.cabinet.sideboard.upperDepth;
const displayHits=(f,b,p=plan)=>physical(f,b,p).filter(v=>v.section==='display');
assert(displayHits(side,obstacle(side,x,frontGlass+100,pivot-200,40)).length>0,'mid-sweep hit');
assert.equal(displayHits(side,obstacle(side,x,frontGlass+270,pivot-270,20)).length,0,'empty corner of sweep AABB is not a collision');
const flipped=structuredClone(side);flipped.cabinet.doorMaxAngle=180;
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const f={...flipped,rot,flip},above=obstacle(f,x,frontGlass+100,pivot+160,40);
 assert(displayHits(f,above).length>0,'upward sweep above top hinge');
 assert.equal(displayHits({...f,cabinet:side.cabinet},above).length,0,'90° cannot reach same overhead obstacle');
}
const top=C.openingZones(flipped).find(v=>v.section==='display').ranges[0][1];
const ceilingAt=z=>({...plan,ceilingHeight:z,rooms:[{...plan.rooms[0],ceilingHeight:z}]});
const onlyCab=(p)=>P.spaceCheck(p,[flipped],{scanPassages:false}).filter(v=>v.section==='display');
assert.equal(onlyCab(ceilingAt(top)).length,0,'ceiling face contact');
assert(onlyCab(ceilingAt(top-1)).some(v=>/天花板/.test(v.message)),'ceiling 1 mm penetration');
// A larger, still valid glass band can reach the ceiling above the whole cabinet.
const tall=make('sideboard-wall');Object.assign(tall.cabinet.sideboard,{baseHeight:600,nicheHeight:300,displayHeight:1300});tall.cabinet.doorMaxAngle=180;C.validate(tall);
assert(P.spaceCheck({...plan,rooms:[{...plan.rooms[0],ceilingHeight:2800}],ceilingHeight:2800},[tall],{scanPassages:false}).some(v=>v.section==='display'&&/吊顶/.test(v.message)));
const split=tall.cy-tall.d/2+tall.cabinet.sideboard.upperDepth+600;
const splitCeilings=z=>({...plan,rooms:[{id:'back',poly:[[0,0],[8000,0],[8000,split],[0,split]],ceilingHeight:4000},{id:'front',poly:[[0,split],[8000,split],[8000,8000],[0,8000]],ceilingHeight:z}]});
assert.equal(P.spaceCheck(splitCeilings(3500),[tall],{scanPassages:false}).filter(v=>v.section==='display').length,0,'high corner of overall envelope is not in the front room');
assert(P.spaceCheck(splitCeilings(2800),[tall],{scanPassages:false}).some(v=>v.section==='display'&&/天花板/.test(v.message)),'sweep uses ceiling over actual projected travel, not just cabinet centre');
const upperObstacle={...obstacle(peg,-160,peg.d/2+180,0,300),type:'acwall'};delete upperObstacle.mountHeight;
assert(physical(peg,upperObstacle).some(v=>v.kind==='cabinetdoor'),'wall-mounted appliances previously excluded are checked');
const unknown={...upperObstacle,type:'unregistered'};delete unknown.h;
assert(physical(peg,unknown).some(v=>v.pending&&/高度未知/.test(v.message)),'unknown height is pending, not confirmed');
const lowWall={...plan,walls:[[peg.cx-200,peg.cy+300,peg.cx-100,peg.cy+400,'low']]};
assert.equal(P.spaceCheck(lowWall,[peg],{scanPassages:false}).filter(v=>v.kind==='cabinetdoor').length,0,'upper door clears a 1 m low wall');
assert(P.spaceCheck({...lowWall,walls:lowWall.walls.map(w=>[...w.slice(0,4),'n'])},[peg],{scanPassages:false}).some(v=>v.kind==='cabinetdoor'));
const passage=C.openingZones(side).find(v=>v.kind==='cabinetpassage'),point=passage.poly.reduce((a,p)=>[a[0]+p[0]/4,a[1]+p[1]/4],[0,0]);
const overhead={id:'operation',name:'上方设备',type:'washer',cx:point[0],cy:point[1],w:80,d:80,h:100,mountHeight:2100,rot:0};
assert.equal(P.spaceCheck(plan,[side,overhead],{scanPassages:false}).filter(v=>v.kind==='cabinetpassage').length,0,'operation space is ground-based, not infinite height');
assert(P.spaceCheck(plan,[side,{...overhead,mountHeight:0}],{scanPassages:false}).some(v=>v.kind==='cabinetpassage'));
const beamPlan={...plan,beams:[{id:'beam',name:'投影梁',poly:zone.poly,review:'beam-height'}]};
assert(P.spaceCheck(beamPlan,[side],{scanPassages:false}).some(v=>v.section==='display'&&v.pending&&/梁高未录入/.test(v.message)));
const legacy={...peg};delete legacy.cabinet;const before=JSON.stringify(legacy);assert(C.openingZones(legacy).every(v=>v.ranges?.length));assert.equal(JSON.stringify(legacy),before);
for(const f of [peg,gap,side,flipped,tall,legacy]){const payload={planId:'p1',current:{furniture:[f]},designs:[{name:'旧方案',work:{furniture:[f]}}],catalog:[]};const restored=P.unpack(P.pack(payload));assert.deepEqual(restored.current.furniture[0],f);assert.deepEqual(C.openingZones(restored.current.furniture[0]),C.openingZones(f));}
const issue=physical(peg,upperObstacle)[0],key=P.checkFingerprint(issue,plan,[peg,upperObstacle],800);
assert.notEqual(P.checkFingerprint(issue,ceilingAt(3000),[peg,upperObstacle],800),key);
assert.notEqual(P.checkFingerprint(issue,beamPlan,[peg,upperObstacle],800),key);
const record=JSON.parse(key);assert.equal(record.version,3);assert.equal(P.review(plan,{furniture:[peg,upperObstacle],spaceIgnored:[JSON.stringify({...record,version:2})]}).some(v=>v.ignored),false);
console.log('PASS 3D doors/drawers, split storage bands, upward sweep vs empty AABB corners, ceilings/low walls/mounted objects, unknown heights, rotation/mirror, operations, legacy roundtrip and v3 confirmations');
