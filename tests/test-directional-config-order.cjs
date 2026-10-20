const assert=require('node:assert/strict'),D=require('../src/core/design-core.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js'),S=require('../src/core/snapping.js');
const plan={id:'order',rooms:[{id:'r',poly:[[-20000,-20000],[20000,-20000],[20000,20000],[-20000,20000]]}],walls:[],wins:[],doors:[],beams:[]};
const ac={id:'ac',type:'aircon_midea_ultra_2hp',cx:0,cy:0,w:395,d:436,h:1856,rot:45},target={id:'target',type:'custom',cx:0,cy:800,w:1500,d:400,h:500,rot:0};
const kitchen=K.configure({id:'k',type:'counter',cx:3000,cy:3000,rot:0},{version:1,shape:'straight',depth:600,counterDepth:630,baseHeight:820,thickness:20,autoAvoid:true,modules:[{run:0,width:600,role:'door'},{run:0,width:600,role:'door'}]});
const flue={id:'flue',type:'cabinet',cx:2700,cy:2875,w:300,d:350,h:2800,rot:0};
const list=[ac,target,kitchen,flue];K.normalizeObstacles(list,plan);assert(list[2].kitchen.obstacleFit.cuts.length);
const reorder=v=>v&&typeof v==='object'?Array.isArray(v)?v.map(reorder):Object.fromEntries(Object.keys(v).sort().map(k=>[k,reorder(v[k])])):v;
const work={furniture:reorder(list)},snapshot=JSON.stringify(work),canonical=structuredClone(work.furniture);K.normalizeObstacles(canonical,plan);
assert.notEqual(JSON.stringify(canonical),JSON.stringify(work.furniture),'fixture reproduces property-order change');assert.deepEqual(canonical,work.furniture,'all configuration values remain equal');
for(const flip of [false,true])for(const rotation of [0,90,180,270]){
 const w=structuredClone(work);w.furniture[0].flip=flip;const dir=['b','l','t','r'][rotation/90],moved=D.placeSelectionAtDirectionalGap(plan,w,['ac'],dir,130,{rotation});
 assert(Math.abs(S.directional(moved,{rotation,rects:[],furniture:w.furniture})[dir].distance-130)<.01);
 assert(Math.abs(moved[0].cx-ac.cx)<1e-6);assert(moved[0].cy>ac.cy);assert.deepEqual(w.furniture[2],work.furniture[2]);
}
assert.throws(()=>D.placeSelectionAtDirectionalGap(plan,work,['flue'],'l',20),/改变厨房或设备配置/,'genuine auto-fit changes remain blocked');
const changed=structuredClone(work);changed.furniture[2].kitchen.obstacleFit.depths[0].depth+=1;
assert.throws(()=>D.placeSelectionAtDirectionalGap(plan,changed,['ac'],'b',130),/改变厨房或设备配置/,'numeric configuration drift remains blocked');
const moved=D.placeSelectionAtDirectionalGap(plan,work,['ac'],'b',130),saved={...work,furniture:work.furniture.map(f=>moved.find(m=>m.id===f.id)||f)},payload={planId:plan.id,current:saved,designs:[{name:'定位',work:saved}],catalog:[]};
assert.deepEqual(P.unpack(P.pack(payload)),payload);assert.equal(JSON.stringify(work),snapshot);
console.log('PASS key-order-independent directional placement, 130 mm gap, drawing rotations/mirrors, actual configuration-change rejection, immutable input and project roundtrip');
