const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),K=require('../src/core/kitchen-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const kitchen=K.configure({id:'kitchen',type:'counter',name:'橱柜',w:1800,d:600,cx:0,cy:0,rot:0,color:'#ddd'},{version:1,shape:'straight',depth:600,baseHeight:800,thickness:20,modules:[{run:0,width:400,role:'door'},{run:0,width:1000,role:'empty'},{run:0,width:400,role:'door'}]});
const block={id:'block',type:'block',name:'方块占位体',w:800,d:150,h:540,cx:0,cy:0,rot:0,mountHeight:0,color:'#ddd'};
const rects=[[-1100,-1000,-1000,1000],[1000,-1000,1100,1000],[-1000,-1100,1000,-1000],[-1000,1000,1000,1100]];
const read=(f=block,extra=[])=>S.directional(f,{rects,furniture:[kitchen,f,...extra]});
let gaps=read();near(gaps.l.distance,100);near(gaps.r.distance,100);near(gaps.t.distance,925);near(gaps.b.distance,925);
for(const h of [799.999,800]){gaps=read({...block,h});near(gaps.l.distance,100);near(gaps.t.distance,925);}
for(const dir of ['l','r','t','b'])near(read({...block,h:800.001})[dir].distance,0);
for(const mountHeight of [820,820.001]){gaps=read({...block,mountHeight});near(gaps.l.distance,600);near(gaps.t.distance,925);}
near(read({...block,mountHeight:819.999}).l.distance,0);
for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const host={...kitchen,rot,flip},f={...block,rot,flip},out=S.directional(f,{rotation:-rot,furniture:[host,f]});
 near(out.l.distance,100);near(out.r.distance,100);assert.equal(out.t,null);assert.equal(out.b,null);
}
const unknown={...block,id:'unknown',type:'unknown-height',h:undefined,mountHeight:undefined};
for(const dir of ['l','r','t','b'])near(read(unknown)[dir].distance,0);
const high={...block,id:'high',mountHeight:900};
const group=S.directional([block,high],{rects,furniture:[kitchen,block,high]});near(group.l.distance,100);near(group.r.distance,100);
const low={...block,w:100,h:50,mountHeight:850,cx:700};
assert(!Object.values(S.directional(low,{furniture:[kitchen,low]})).some(Boolean));
const plan={id:'solids',rooms:[{id:'r',poly:[[-1000,-1000],[1000,-1000],[1000,1000],[-1000,1000]],at:[0,0]}],walls:rects,wins:[]},work={furniture:[kitchen,block]};
const moved=D.placeSelectionAtDirectionalGap(plan,work,[block.id],'r',50)[0];near(moved.cx,50);near(moved.cy,0);near(read(moved).r.distance,50);
const packed=P.unpack(P.pack({planId:plan.id,current:work,designs:[{id:'named',name:'设备空位',work}],catalog:[]}));
let restored=packed.current.furniture;for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#ddd'});
assert.deepEqual(restored,work.furniture);assert.deepEqual(S.directional(restored[1],{rects,furniture:restored}),read());
assert.deepEqual(packed.designs[0].work,work);
// Screenshot layout: U counter, shallow opposite arm, two empty hob-side bays.
const u=K.configure({...kitchen,w:2566,d:1704,cx:7333,cy:9298,rot:180},{version:1,shape:'U',corner:'right',depth:600,runDepths:[600,600,304],counterDepth:620,baseHeight:830,thickness:20,modules:[{run:0,width:580,role:'hob'},{run:1,width:800,role:'sink'},{run:2,width:737.5,role:'door'},{run:0,width:980,role:'empty'},{run:0,width:406,role:'empty'}]});
const actual={...block,cx:7501,cy:10075,mountHeight:undefined},actualGaps=S.directional(actual,{furniture:[u,actual]});
near(actualGaps.l.distance,451);near(actualGaps.r.distance,135);near(actualGaps.t.distance,1250);assert.equal(actualGaps.b,null);
console.log('PASS kitchen solid directional gaps: empty bay, slab height thresholds, rotation/mirror, unknown heights, groups, numeric positioning and repeated project restore');
