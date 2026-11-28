'use strict';
const assert=require('node:assert/strict');
const Products=require('../src/core/product-rules.js');
const Electrical=require('../src/core/electrical-core.js');
const Project=require('../src/core/project-core.js');
const Repository=require('../src/core/repository-core.js');
const WorkspaceCache=require('../src/io/workspace-cache.js');
const Design=require('../src/core/design-core.js');
const plan=require('../src/data/plans.js')[0];
const Work=require('../src/core/work-state.js').create({
 makeId:()=> 'fixture',colorFor:()=> '#fff',materials:require('../src/data/catalog.js').materials
});

const panel={id:'switch',type:'panel_bull_g12',panelVariant:'xiaomi-2pro-2-white',name:'书房开关',w:86,d:5,h:86,cx:400,cy:500,rot:0,mountHeight:1057,color:'#fff'};
const lamp={id:'lamp',type:'surface_light',name:'顶灯',w:400,d:400,h:50,cx:500,cy:600,rot:0,mountHeight:2500,color:'#fff'};
const curtain={id:'curtain',type:'curtain_mijia_3_pro',name:'布帘',w:2400,d:100,h:2400,cx:600,cy:700,rot:0,mountHeight:0,color:'#ccc',curtainOpen:0};
assert.equal(Electrical.actionTargetLabel({type:'ceiling_light_mijia_d40',brand:'小米/米家',name:'主卧睡眠区 · 米家吸顶灯 D40'},['主卧']),'睡眠区吸顶灯');
assert.equal(Electrical.actionTargetLabel({type:'curtain_mijia_3_pro_sheer',brand:'米家',name:'主卧飘窗 · 米家智能窗帘 3 Pro · 暖白纱帘'},['主卧']),'飘窗纱帘');
assert.equal(Electrical.actionTargetLabel({...lamp,name:'镜前补光 · 规划占位'}),'镜前补光');
const bindings=[
 {key:0,gesture:'press',targetId:lamp.id,action:'toggle'},
 {key:0,gesture:'press',targetId:curtain.id,action:'open'},
 {key:1,gesture:'double',targetId:lamp.id,action:'off'},
 {key:1,gesture:'hold',targetId:curtain.id,action:'close'}
];
const configured={...panel,panelActions:Products.validateField(panel,'panelActions',bindings)};
assert.deepEqual(Products.panelKeys(panel).map(key=>key.label),['左键','右键']);
assert.equal(Products.panelKeys({...panel,panelVariant:'switch1-single'})[0].gestures.length,1);
assert(!Products.supports({...panel,panelVariant:'net6'},'panelActions'));
for(const entries of [[{...bindings[0],key:2}],[{...bindings[0],targetId:panel.id}],[bindings[0],bindings[0]]]){
 assert.throws(()=>Products.validateField(panel,'panelActions',entries));
}
assert.deepEqual(Products.editPanelVariant(configured,'xiaomi-2pro-2-grey').panelActions,bindings);
assert.deepEqual(Products.editPanelVariant(configured,'switch1-single').panelActions,bindings.slice(0,2));
assert.equal(Products.editPanelVariant(configured,'net6').panelActions,undefined);
assert.deepEqual(Products.editPanelVariant(panel,'xiaomi-2pro-2-grey').panelActions,undefined);

const work={...Work.fresh(plan),furniture:[configured,lamp,curtain]},before=structuredClone(work);
const simulated=new Map(),press=(key,gesture,furniture=work.furniture)=>Electrical.testPanelActions(configured,key,gesture,furniture,simulated);
assert.deepEqual(press(0,'press').map(r=>[r.status,r.value]),[['light',true],['covering',true]]);
assert.deepEqual(press(0,'press').map(r=>r.value),[false,true]);
assert.deepEqual(press(1,'hold').map(r=>r.value),[false]);
assert.equal(press(1,'double',[configured,curtain])[0].status,'unavailable');
assert.deepEqual(work,before);
{
 const cloth={...curtain,curtainOpen:1,curtainRightOpen:.5};
 const sheer={...curtain,id:'sheer',type:'curtain_mijia_3_pro_sheer',curtainOpen:1};
 const group=[cloth,sheer].map(target=>({key:1,gesture:'press',targetId:target.id,action:'toggle'}));
 const targets=[panel,cloth,sheer],states=new Map();
 const pressGroup=()=>Electrical.testPanelActions(panel,1,'press',targets,states,false,group).map(r=>r.value);
 assert.deepEqual(pressGroup(),[true,true]);
 assert.deepEqual(pressGroup(),[false,false]);
 states.set(sheer.id,true);
 assert.deepEqual(pressGroup(),[true,true]);
}
const payload={planId:plan.id,current:work,designs:[{name:'备选',work:structuredClone(work)}],catalog:[]};
const packed=Project.pack(payload);
assert.equal(packed.version,Products.panelActions.formatVersion);
assert.deepEqual(Project.unpack(packed),payload);
assert.deepEqual(Work.restore(Project.unpack(packed).current,plan).furniture[0].panelActions,bindings);
const cache={v:112,planId:plan.id,work:{[plan.id]:work},designs:[]};
assert.deepEqual(WorkspaceCache.load({read:key=>key==='huxing-design-v112'?JSON.stringify(cache):null,firstPlan:plan,key:'huxing-design-v112'}).work[plan.id].furniture[0].panelActions,bindings);
const stored=JSON.parse(Repository.text(Repository.validate(cache)));
assert.equal(stored.version,112);
assert.deepEqual(Repository.parse(stored).work[plan.id].furniture[0].panelActions,bindings);
{
 const cloth={...curtain,curtainRightOpen:.6};
 const sheer={...curtain,id:'sheer',type:'curtain_mijia_3_pro_sheer'};
 const cycle=[cloth,sheer].map(target=>({key:1,gesture:'press',targetId:target.id,action:'cycle'}));
 const legacy=cycle.map(entry=>({...entry,key:0,action:'toggle'}));
 const actions=Products.validateField(panel,'panelActions',[...cycle,...legacy]);
 const switchWithCycle={...panel,panelActions:actions};
 const targets=[switchWithCycle,cloth,sheer],states=new Map();
 const pressAt=(now,key=1)=>Electrical.testPanelActions(switchWithCycle,key,'press',targets,states,false,actions,now);
 const commands=now=>pressAt(now).map(r=>r.command);
 assert(!Products.panelTargetActions(lamp).includes('cycle'));
 assert.deepEqual(commands(0),['open','open']);
 assert.deepEqual(commands(1000),['stop','stop']);
 assert.deepEqual(states.get(cloth.id).levels,[.25,.85]);
 assert.deepEqual(states.get(sheer.id).levels,[.25,.25]);
 assert.deepEqual(commands(2000),['close','close']);
 assert.deepEqual(commands(2100),['stop','stop']);
 assert.deepEqual(commands(2200),['open','open']);
 assert.deepEqual(commands(7000),['close','close']);
 assert.deepEqual(pressAt(7100,0).map(r=>r.value),[true,true]);
 assert.deepEqual(commands(7200),['close','close']);
 const cycleWork={...work,furniture:targets},cyclePayload={...payload,current:cycleWork};
 const cycleProject=Project.pack(cyclePayload);
 assert.equal(cycleProject.version,Products.panelActions.cycleFormatVersion);
 assert.equal(Project.pack({...payload,designs:[{name:'循环',work:cycleWork}]}).version,cycleProject.version);
 assert.deepEqual(Work.restore(Project.unpack(cycleProject).current,plan).furniture[0].panelActions,actions);
 const cycleCache={...cache,v:113,work:{[plan.id]:cycleWork}};
 const cycleRecord=JSON.parse(Repository.text(Repository.validate(cycleCache)));
 assert.equal(cycleRecord.version,113);
 assert.deepEqual(Repository.parse(cycleRecord).work[plan.id].furniture[0].panelActions,actions);
 const read=key=>key==='huxing-design-v112'?JSON.stringify(cache):null;
 assert.deepEqual(WorkspaceCache.load({read,firstPlan:plan,key:'huxing-design-v113'}),cache);
 assert.deepEqual(WorkspaceCache.load({read:key=>key==='huxing-design-v113'?JSON.stringify(cycleCache):read(key),firstPlan:plan,key:'huxing-design-v113'}),cycleCache);
}
const swapped={...configured};
Products.applyPanelEdit(swapped,Products.editPanelVariant(swapped,'net6'));
assert(!Object.hasOwn(swapped,'panelActions'));
let copyId=0;
const copy=items=>Design.pasteFurniture({items,cx:400,cy:500},{x:1000,y:1500},{x:-3000,y:-3000,w:10000,h:10000},()=>`copy-${++copyId}`).items;
assert.equal(copy([configured])[0].panelActions[0].targetId,lamp.id);
const [switchCopy,lampCopy]=copy([configured,lamp]);
assert.equal(switchCopy.panelActions[0].targetId,lampCopy.id);
assert.equal(switchCopy.panelActions[1].targetId,curtain.id);
console.log('switch actions: variants, validation, shared preview, missing targets and saved project/cache round trips passed');
