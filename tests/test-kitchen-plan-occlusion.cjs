const assert=require('node:assert/strict'),D=require('../src/core/design-core.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js');
const order=(items,plan)=>D.planFurnitureOrder(items,plan).map(f=>f.id);
let cases=0;
for(const shape of ['straight','L','U'])for(const rot of [0,37,180,270])for(const flip of [false,true]){
 const host=K.configure({id:'top',type:'counter',cx:3000,cy:3000,w:1200,d:600,rot,flip},{version:1,shape,corner:'right',depth:600,baseHeight:830,thickness:20,modules:[{run:0,width:1200,role:'sink'},...(shape==='straight'?[]:[{run:1,width:1104,role:'sink'}]),...(shape==='U'?[{run:2,width:1200,role:'door'}]:[])]}),m=K.layout(host)[shape==='straight'?0:1],[cx,cy]=K.world(host,m.x,m.y);
 const sink=K.normalize([host,K.attach({id:'sink',type:'sink_arrow_750',cx:7000,cy:7000,w:750,d:450,h:240,rot:0},host,m.index)])[1],purifier={id:'inner',type:'water_purifier_mijia_1200g',cx,cy,w:163,d:445,h:379,mountHeight:118,rot:sink.rot,flip};
 for(const items of [[host,purifier,sink],[sink,host,purifier],[purifier,sink,host]]){const before=JSON.stringify(items);assert.deepEqual(order(items),['inner','top','sink']);assert.equal(JSON.stringify(items),before);cases++;}
 for(const top of [829.99,830,830.01]){const inner={...purifier,type:'block',h:top-118};assert.deepEqual(order([host,inner]),top<=830?['inner','top']:['top','inner'],'compare the actual slab underside, including exact contact');}
 const unknown={...purifier,type:'unfamiliar',h:undefined};assert.deepEqual(order([host,unknown]),['top','inner'],'unknown height preserves manual order');
 const away={...purifier,cx:10000};assert.deepEqual(order([host,away]),['top','inner']);
 const slabless={...host,kitchen:{...host.kitchen,laundry:{countertop:false}}};assert.deepEqual(order([slabless,purifier]),['top','inner'],'a disabled top cannot hide cabinet contents');
 const payload={planId:'test',current:{furniture:[sink,purifier,host]},designs:[],catalog:[]},round=P.unpack(P.pack(payload));assert.deepEqual(order(round.current.furniture),['inner','top','sink']);
}
// Match the reported 1601: water purifier under a right L sink, regardless of creation order.
const current=require('./fixtures/kitchen/sink-link-1601.json'),host=current.find(f=>f.id==='fmv9dos7j1'),sink=current.find(f=>f.id==='fmvgv70l41'),inner=current.find(f=>f.id==='fmvgn7dtt1');
assert.deepEqual(order([host,inner,sink]),[inner.id,host.id,sink.id]);
console.log(`PASS ${cases} kitchen top/device ordering cases; linked sink priority, slab underside contact, unknown heights, transforms, disabled tops, project roundtrip and current 1601 geometry`);
