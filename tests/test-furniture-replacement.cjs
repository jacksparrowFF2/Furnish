const assert=require('node:assert/strict');
const D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const candidate={type:'custom',name:'新家具',w:900,d:700,h:800,color:'#bbaacc',price:2000};
const back=f=>{const a=f.rot*Math.PI/180;return [f.cx+Math.sin(a)*f.d/2,f.cy-Math.cos(a)*f.d/2];};
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const f={id:'old',type:'custom',name:'原家具',cx:2000,cy:3000,w:1200,d:400,h:900,rot,flip,color:'#aaaaaa',resizeAnchor:'left',groupId:'g1',purchaseStatus:'ordered',price:1000};
 const before=JSON.stringify(f);
 const next=D.replaceFurniture(f,candidate,{anchor:'back'});
 back(next).forEach((v,i)=>assert.ok(Math.abs(v-back(f)[i])<1e-8));
 assert.equal(next.resizeAnchor,'left');assert.equal(next.groupId,'g1');assert.equal(next.flip,flip);assert.equal(next.rot,rot);assert.equal(next.purchaseStatus,'planned');
 assert.equal(next.price,undefined);assert.equal(next.referencePrice,2000);
 const centered=D.replaceFurniture(f,candidate,{anchor:'center'});
 assert.equal(centered.cx,f.cx);assert.equal(centered.cy,f.cy);
 const legacy=D.replaceFurniture(f,candidate);
 assert.ok(Math.abs(D.bounds(legacy)[0]-D.bounds(f)[0])<1e-8);
 const packed=P.pack({planId:'p1',current:{furniture:[next]},designs:[],catalog:[]});
 assert.deepEqual(P.unpack(packed).current.furniture[0],next);
 assert.equal(JSON.stringify(f),before);
}
const shower={id:'s',type:'shower_arrow_cream',name:'花洒',cx:0,cy:0,w:300,d:500,rot:37,color:'#eeeeee',showerMixerHeight:1100,showerRise:400};
const washer=D.replaceFurniture(shower,{...candidate,type:'washer',w:600,d:650,h:850},{anchor:'back'});
assert.equal(washer.showerMixerHeight,undefined);assert.equal(washer.showerRise,undefined);assert.equal(washer.resizeAnchor,undefined);
assert.throws(()=>D.replaceFurniture(shower,candidate,{anchor:'invalid'}));
assert.throws(()=>D.replaceFurniture({...shower,locked:true},candidate));
console.log('PASS replacement datums, rotated/mirrored rear midpoint, cleanup, immutability and project roundtrip');
