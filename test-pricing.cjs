const assert=require('node:assert/strict'),P=require('./project-core.js');
const plan={rooms:[{id:'r',mat:'wood',poly:[[0,0],[4000,0],[4000,3000],[0,3000]]}],walls:[],doors:[],wins:[]},mats={wood:{price:100}},work={furniture:[{id:'f',cx:1000,cy:1000,w:400,d:400,rot:0,price:199.5}],rooms:{},renovation:[{name:'人工',source:'net',quantity:1,price:20,unit:'m²'}]};
const before=JSON.stringify(work),b=P.estimate(plan,work,mats);assert(Math.abs(b.floor-1260)<1e-8);assert.equal(b.renovation,240);assert.equal(b.total,b.floor+b.paintCost+199.5+240);assert.equal(JSON.stringify(work),before);
const next={...work,pricing:{floorWaste:0,paintWaste:0,paintPrice:30,materials:{wood:130}}},v=P.estimate(plan,next,mats);assert.equal(v.floor,1560);assert.equal(v.paintCost,v.paintArea*30);assert.equal(v.mats[0].price,130);assert.equal(P.estimate(plan,{...next,pricing:{paintPrice:0,materials:{wood:0}}},mats).floor,0);
const payload={planId:'p',current:next,designs:[{name:'默认',work}],catalog:[]};assert.deepEqual(P.unpack(P.pack(payload)),payload);for(const pricing of [[],null,{floorWaste:-1},{paintWaste:101},{paintPrice:'30'},{materials:{wood:-1}},{materials:[]}])assert.throws(()=>P.validateWork({...work,pricing}),/无效|损耗/);
assert(Math.abs(P.estimate(plan,work,mats).floor-1260)<1e-8);assert.equal(P.estimate(plan,next,mats).floor,1560);
console.log('PASS shared estimate defaults, rates, zero prices, version isolation, roundtrip and invalid parameter rejection');

