const assert=require('node:assert/strict'),P=require('../src/core/project-core.js');
const plan={rooms:[{id:'r',name:'房间',poly:[[0,0],[4000,0],[4000,3000],[0,3000]]}],walls:[[0,0,200,3000,'n']],doors:[]};
const f={id:'a',type:'chair',name:'椅',cx:2000,cy:1500,w:400,d:400,rot:0},work={furniture:[f,{...f,id:'b'}],spaceThreshold:800};
const original=P.spaceCheck(plan,work.furniture),key=P.checkFingerprint(original.find(v=>v.kind==='overlap'),plan,work.furniture,800);work.spaceIgnored=[key,'invalid legacy record','null','[]'];
for(const [p,w] of [[plan,work],[plan,{...work,spaceThreshold:900}],[plan,{...work,furniture:[{...f,cx:2100},work.furniture[1]]}],[{...plan,walls:[]},work],[plan,{...work,spaceIgnored:[]}]]){const expected=P.spaceCheck(p,w.furniture,{passage:w.spaceThreshold}).map(v=>({...v,ignored:w.spaceIgnored.includes(P.checkFingerprint(v,p,w.furniture,w.spaceThreshold))}));assert.deepEqual(P.review(p,w),expected);}
console.log('PASS optimized review matches legacy confirmations, geometry/threshold invalidation and malformed record handling');

// Same finding text can remain after a cavity or installation edit. It must
// require a new confirmation even when x/y and overall w/d have not changed.
const overlap=original.find(v=>v.kind==='overlap');
for(const patch of [{h:900},{flip:true},{mountHeight:0},{obj:{}},{showerMixerHeight:1000}]){
 const changed=[{...f,...patch},work.furniture[1]];
 assert.notEqual(P.checkFingerprint(overlap,plan,changed,800),key,JSON.stringify(patch));
}
const C=require('../src/core/cabinet-core.js'),cab={...f,type:'wardrobe',...C.preset('wardrobe')},cabChanged=structuredClone(cab);cabChanged.cabinet.thickness+=1;
assert.notEqual(P.checkFingerprint(overlap,plan,[cab,work.furniture[1]],800),P.checkFingerprint(overlap,plan,[cabChanged,work.furniture[1]],800),'effective cabinet board geometry invalidates confirmation');
assert.equal(P.checkFingerprint(overlap,plan,[{...f,cabinet:{version:1}},work.furniture[1]],800),key,'unsupported cabinet metadata does not change chair geometry');
const physical={...plan,physicalRooms:[{...plan.rooms[0],poly:[[0,0],[2000,0],[2000,3000],[0,3000]]}]};
assert.notEqual(P.checkFingerprint(overlap,physical,work.furniture,800),key);
assert.notEqual(P.checkFingerprint(overlap,{...plan,rooms:[{...plan.rooms[0],counted:false}]},work.furniture,800),key);
assert.equal(P.checkFingerprint(overlap,plan,[{...f,price:200,color:'#ffffff',purchaseStatus:'ordered'},work.furniture[1]],800),key,'procurement edits retain spatial confirmation');
const legacy=JSON.stringify([overlap,800,plan.rooms.map(r=>[r.id,r.poly]),plan.walls,plan.doors,work.furniture.map(f=>[f.id,f.type,f.cx,f.cy,f.w,f.d,f.rot,f.frontClearance])]);
assert.equal(P.review(plan,{...work,spaceIgnored:[legacy]}).some(v=>v.ignored),false,'old incomplete confirmations require review again');
assert.equal(P.review(plan,work).find(v=>v.kind==='overlap').ignored,true);
console.log('PASS versioned spatial confirmations, height/cavity/mirror/physical-room invalidation and non-spatial edit stability');
