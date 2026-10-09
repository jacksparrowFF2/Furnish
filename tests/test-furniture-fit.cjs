const assert=require('node:assert/strict'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const room=poly=>({id:'r',name:'房间',poly});
const box=(x0,y0,x1,y1)=>room([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
const f={id:'desk',type:'desk',name:'书桌',cx:2000,cy:900,w:3000,d:1400,rot:0};
const notch=room([[0,0],[4000,0],[4000,3000],[3000,3000],[3000,1000],[1000,1000],[1000,3000],[0,3000]]);
// All four corners and the centre lie inside, but the footprint bridges a notch.
const arms=[box(0,0,1000,3000),box(3000,0,4000,3000),box(0,0,4000,1000)];
assert.equal(P.fitsInRooms([notch],P.polygon(f)),false);
assert.equal(P.fitsInRooms(arms,P.polygon(f)),false);
assert.equal(P.fitsInRooms([...arms,box(1000,1000,3000,3000)],P.polygon(f)),true);
assert.equal(P.fitsInRooms([box(0,0,4000,3000)],P.polygon({...f,cy:1500,w:4000,d:3000})),true);
assert.equal(P.fitsInRooms([box(0,0,4000,3000)],P.polygon({...f,cy:1500,w:4000,d:3000,rot:1})),false);
const hole=[box(0,0,4000,1000),box(0,2000,4000,3000),box(0,0,1000,3000),box(3000,0,4000,3000)];
assert.equal(P.fitsInRooms(hole,P.polygon({...f,cy:1500,d:2400})),false);
assert.equal(P.fitsInRooms([box(0,0,2500,3000),box(1500,0,4000,3000)],P.polygon(f)),true);
const edges={left:0,right:2,top:1,bottom:3};
for(const rot of [0,30,90])for(const anchor of Object.keys(D.resizeAnchors)){
 const original={...f,w:600,d:400,rot,resizeAnchor:anchor},before=D.bounds(original);
 const next=D.resizeFurniture(original,{w:1000,d:750,h:900}),after=D.bounds(next);
 if(anchor==='center'){assert.equal(next.cx,original.cx);assert.equal(next.cy,original.cy);}
 else assert.ok(Math.abs(before[edges[anchor]]-after[edges[anchor]])<1e-8);
 assert.equal(original.w,600);assert.equal(original.d,400);assert.equal(next.h,900);
}
assert.throws(()=>D.resizeFurniture({...f,locked:true},{w:900}),/锁定/);
for(const values of [{w:0},{d:25000},{h:9},{w:NaN}])assert.throws(()=>D.resizeFurniture(f,values),/宽深/);
assert.throws(()=>D.resizeFurniture(f,{w:900},'bad'),/基准/);
const plan={rooms:[notch],walls:[],doors:[]};
assert.ok(P.spaceCheck(plan,[f],{scanPassages:false}).some(v=>v.kind==='outside'));
const a={...f,cx:500,cy:500,w:400,d:400},b={...a,id:'chair',name:'椅子'},unrelated={...a,id:'other',cx:6000};
const focused=P.spaceCheck(plan,[a,b,unrelated],{focusId:'chair',scanPassages:false});
assert.equal(focused.length,1);assert.equal(focused[0].kind,'overlap');assert.equal(focused[0].otherId,'desk');
assert.ok(!focused.some(v=>v.kind==='outside'||v.kind==='passage'));
const work={furniture:[{...a,resizeAnchor:'left'}],rooms:{},open:{}};
P.validateWork(work);assert.throws(()=>P.validateWork({...work,furniture:[{...a,resizeAnchor:'invalid'}]}),/基准/);
const data={planId:'p1',current:work,designs:[],catalog:[]};assert.deepEqual(P.unpack(P.pack(data)),data);
console.log('PASS concave notches, hidden holes, union coverage, rotated boundaries, anchored resizing, locks, focused checks and portable resize preferences');
