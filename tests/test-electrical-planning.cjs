'use strict';
const assert=require('node:assert/strict'),E=require('../src/core/electrical-core.js'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),B=require('../src/core/cabinet-builder-core.js'),J=require('../src/core/project-core.js');
const panel={id:'p',name:'插座',color:'#fff',type:'panel_bull_g12',w:86,d:10,h:86,cx:0,cy:0,rot:0,mountHeight:500,panelVariant:'socket5-diagonal'};
const cabinet={id:'c',name:'柜体',color:'#fff',type:'cabinet',w:1000,d:600,h:1000,cx:2000,cy:2000,rot:0,mountHeight:0,cabinet:{version:2,boxes:[{id:'box1',w:1000,d:600,h:1000,thickness:18,backThickness:18,bottom:true,components:[]}]}};
const clone=v=>structuredClone(v),work={furniture:[cabinet,panel],rooms:{},measures:[],notes:[]},edit=fn=>{const next=clone(work);fn(next);return next;};
assert(E.panel(panel));assert(!E.panel(cabinet));E.assertEditable(work,{...work,scene3d:{night:true,hour:18}});
E.assertEditable(work,edit(w=>Object.assign(w.furniture[1],{cx:42,mountHeight:1300,panelVariant:'switch1-single'})));
for(const fn of [w=>w.furniture[0].cx++,w=>w.furniture[0].w++,w=>w.furniture[0].rot=90,w=>w.furniture[0].mountHeight=50,w=>w.furniture[0].cabinet.boxes[0].thickness=20,w=>w.furniture.shift(),w=>w.furniture.push({...cabinet,id:'new'}),w=>w.rooms.a={},w=>w.measures.push({a:{x:0,y:0},b:{x:1,y:1}}),w=>w.furniture[1].groupId='mixed'])assert.throws(()=>E.assertEditable(work,edit(fn)));
const door=B.add(cabinet,'multiDoor',{boxId:'box1'}).furniture;
const opened=B.setOpening(door,true);E.assertEditable({...work,furniture:[door,panel]},{...work,furniture:[opened,panel]});
assert.throws(()=>E.assertEditable({...work,furniture:[door,panel]},{...work,furniture:[{...opened,cx:2001},panel]}));
for(const rot of [0,37,90])for(const flip of [false,true]){
 const c={...cabinet,rot,flip},w={...work,furniture:[c,panel]},faces=E.surfaces({walls:[]},w,panel).filter(s=>s.label.includes('侧板'));assert.equal(faces.length,4);
 for(const s of faces){const p=E.place(panel,s,s.length/2),hit=E.nearest(p,[s],.001);assert(hit);assert(Math.abs(hit.offset-s.length/2)<1e-6);assert(!G.volumeOverlap(p,c,null,w.furniture),'touching the side face must not penetrate a production board');assert.throws(()=>E.place(panel,s,42.9));}
 assert.equal(E.surfaces({walls:[]},w,{...panel,mountHeight:1001}).length,0,'no cabinet face above its production height');
 assert.equal(E.surfaces({walls:[]},w,{...panel,mountHeight:950}).length,0,'full panel height must fit');
}
const floors={walls:[],furnitureDatum:'finished-floor',rooms:[{id:'low',poly:[[0,0],[1000,0],[1000,3000],[0,3000]]},{id:'high',poly:[[1000,0],[3000,0],[3000,3000],[1000,3000]]}],floorFinish:{areas:{low:{id:'low',finishedZ:0},high:{id:'high',finishedZ:600}}}};
const low={...panel,cx:500,cy:2000,mountHeight:100},high={...low,cx:2000};assert.equal(E.surfaces(floors,work,low).length,0);assert(E.surfaces(floors,work,high).length>0,'moving across floor datums invalidates the face cache');
const unknown=clone(floors);delete unknown.floorFinish.areas.high.finishedZ;assert.equal(E.surfaces(unknown,work,high).length,0,'unknown floor height must not invent a cabinet mounting face');
const faces=E.surfaces({walls:[[0,0,1000,200]]},work,panel);assert.equal(faces.filter(s=>s.kind==='wall').length,4);
assert.equal(E.points(work)[0].number,'E01');assert.equal(E.points(work)[0].center,543);
assert.equal(E.pointName(' E35 · N3：玄关入户三键 · N3 · 与通道端 E15 双控 '),'玄关入户三键 · 与通道端 E15 双控');
assert.equal(E.pointName('E35入户三键 · 公牛 G12 / 客厅 L90'),'入户三键 · 公牛 G12 / 客厅 L90');
assert.equal(E.pointName('E27灯头 / 16A'),'灯头 / 16A');
assert.equal(E.pointName('E27A 型号'),'E27A 型号');
assert.equal(E.displayName({...panel,name:'E35 · 玄关插座'}),'玄关插座');
assert.equal(E.displayName({...cabinet,name:'E35 · 玄关柜体'}),'E35 · 玄关柜体');
assert.equal(E.renamePoint('插座','E60 · 玄关充电'),'玄关充电');
assert.equal(E.renamePoint('N3 · 地脚灯','N4 · 夜间地脚灯'),'夜间地脚灯');
assert.equal(E.renamePoint('E35入户三键','入户三键'),'E35入户三键');
assert.equal(E.renamePoint('E35入户三键','E32 · Entry switches'),'E35 · Entry switches');
assert.throws(()=>E.renamePoint('插座','E60 · N3'),/请输入用途／名称/);
assert.equal(E.purpose('E25 · 主卧普通床头柜电源 · 台灯及充电',['主卧']),'普通床头柜电源 · 台灯及充电');
assert.equal(E.purpose('N3 · 次卧下床落脚灯 · N3 · 独立感应',['次卧']),'下床落脚灯 · 独立感应');
assert.equal(E.purpose('E18 · 原独立进线 E1 · 次卧备用',['厨房']),'原独立进线 E1 · 次卧备用');
const switchPoint=(id,name,panelVariant='switch1-double')=>({...panel,id,name,panelVariant});
const wired=switchPoint('wired','E29 · 主卧阅读区灯 · 与门口 E67 有线双控');
const wiredPeer=switchPoint('outside','E67 · 走廊开关');
const smart=switchPoint('smart','E27 · 床头窗帘 · 与门口 E28 米家场景联动','xiaomi-2pro-3-white');
const smartPeer=switchPoint('door','E28 · 门口窗帘','xiaomi-2pro-2-white');
const switches=[panel,wired,smartPeer,smart,wiredPeer];
for(const order of [switches,[...switches].reverse()]){
 const pairs=E.controlPairs(order);
 assert.deepEqual(pairs.links.get(wired.id),new Map([[wiredPeer.id,new Set(['wired'])]]));
 assert.deepEqual(pairs.links.get(wiredPeer.id),new Map([[wired.id,new Set(['wired'])]]));
 assert.deepEqual(pairs.links.get(smart.id),new Map([[smartPeer.id,new Set(['mijia'])]]));
 assert.equal(pairs.references.get(smart.id).get('E28'),smartPeer.id);
}
{
 const at=(f,cx)=>({...f,cx,cy:2000});
 const outsideA=at({...panel,id:'outside-a'},4000),outsideB=at({...panel,id:'outside-b'},5000);
 const fixtures=[at(wired,500),at(wiredPeer,2000),outsideA,at(smart,600),outsideB,at(smartPeer,2200)];
 const summarize=furniture=>E.points({furniture},floors).map(({id,room,number})=>[id,room?.id,number]);
 assert.deepEqual(summarize(fixtures),[
  [smart.id,'low','A01'],[wired.id,'low','A02'],[smartPeer.id,'high','B01'],
  [wiredPeer.id,'high','B02'],[outsideA.id,undefined,'C01'],[outsideB.id,undefined,'C02']
 ]);
 assert.deepEqual(summarize([...fixtures].reverse()),summarize(fixtures));
 const pairs=E.controlPairs(fixtures,floors.rooms);
 const targetId=pairs.references.get(wired.id).get('E67');
 assert.equal(targetId,wiredPeer.id);
 assert.deepEqual(pairs.locations.get(targetId),{room:floors.rooms[1],number:'B02'});
 const moved=[at(wired,2500),...fixtures.slice(1)];
 assert.deepEqual(summarize(moved).slice(0,4),[
  [smart.id,'low','A01'],[wired.id,'high','B01'],[smartPeer.id,'high','B02'],[wiredPeer.id,'high','B03']
 ]);
 assert.equal(E.controlPairs(moved,floors.rooms).references.get(wired.id).get('E67'),targetId);
 const emptyRooms=Array.from({length:25},(_,i)=>({id:'empty'+i,poly:[]}));
 const locations=E.pointLocations(fixtures,[...emptyRooms,...floors.rooms]);
 assert.deepEqual([wired.id,wiredPeer.id,outsideA.id].map(id=>locations.get(id).number),['Z02','AA02','AB01']);
}
{
 const room=floors.rooms[0];
 const at=(id,cx,mountHeight=500)=>({...panel,id,cx,cy:5,mountHeight});
 const entries=[at('far',910),at('right',195),at('upper',140,1200),at('left',100)];
 const sorted=['left','right','upper','far'];
 for(const poly of [room.poly,[...room.poly].reverse(),[...room.poly.slice(1),room.poly[0]]]){
  const plan={...floors,rooms:[{...room,poly}]};
  assert.deepEqual(E.points({furniture:entries},plan).map(row=>row.id),sorted);
  assert.deepEqual(E.points({furniture:entries.slice().reverse()},plan).map(row=>row.number),['A01','A02','A03','A04']);
 }
}
assert(!E.controlPairs([...switches,switchPoint('duplicate','E67 · 另一开关')]).links.has(wired.id));
assert(!E.controlPairs([wired,{...wiredPeer,name:'门口开关'}]).links.size);
const renamedPeer={...wiredPeer,name:E.renamePoint(wiredPeer.name,'E02 · 过道开关')};
assert.equal(E.pointName(renamedPeer.name),'过道开关');
assert.deepEqual(E.controlPairs([renamedPeer,wired]).links.get(wired.id),new Map([[wiredPeer.id,new Set(['wired'])]]));
assert(!E.controlPairs([wired,{...wiredPeer,panelVariant:'socket5-diagonal'}]).links.size);
assert(!E.controlPairs([{...wired,name:'E29 · 不与 E67 双控'},wiredPeer]).links.size);
assert.deepEqual(E.controlPairs([smart,{...smartPeer,name:'E28 · 与 E27 两地控制'}]).links.get(smartPeer.id).get(smart.id),new Set(['mijia']));
assert.deepEqual(E.controlPairs([smart,{...smartPeer,name:'E28 · 与 E27 有线双控'}]).links.get(smartPeer.id).get(smart.id),new Set(['mijia','wired']));
const plan=require('../src/data/plans.js')[0],W=require('../src/core/work-state.js').create({makeId:()=> 'fixture',colorFor:()=> '#fff',materials:require('../src/data/catalog.js').materials}),full={...W.fresh(plan),furniture:[cabinet,panel]},payload={planId:plan.id,current:full,designs:[{name:'插座布置',work:clone(full)}],catalog:[]};
assert.deepEqual(J.unpack(J.pack(payload)),payload);let restored=clone(full);for(let i=0;i<3;i++)restored=W.restore(clone(restored),plan);assert.deepEqual(restored.furniture,full.furniture);P.validate(panel);
console.log('electrical planning: protected layout, opening exception, actual inner/outer board faces, rotated/mirrored contact, height limits and project round trip passed');
