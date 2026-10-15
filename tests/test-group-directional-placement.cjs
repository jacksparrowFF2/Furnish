const assert=require('node:assert/strict'),D=require('../src/core/design-core.js'),S=require('../src/core/snapping.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),K=require('../src/core/kitchen-core.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),base={type:'custom',name:'组内物体',price:0,h:500,w:100,d:100,rot:0,color:'#ddd',groupId:'group'},a={...base,id:'a',cx:0,cy:-100},b={...base,id:'b',cx:200,cy:100},target={...base,id:'target',cx:450,cy:100};delete target.groupId;
const room={id:'r',poly:[[-900,-900],[900,-900],[900,900],[-900,900]],at:[0,0]},plan={id:'group',rooms:[room],walls:[[-1000,-1000,-900,1000],[900,-1000,1000,1000],[-900,-1000,900,-900],[-900,900,900,1000]],wins:[]},work={furniture:[a,b,target],rooms:{},measures:[],open:{},notes:[]},snapshot=JSON.stringify(work);
const measure=items=>S.directional(items,{rects:plan.walls,furniture:work.furniture});
close(measure([a,b]).r.distance,150);assert.equal(measure([a,b]).r.entity.id,'target');assert(!Object.values(measure([a,b])).some(m=>['a','b'].includes(m?.entity.id)));
for(const gap of [0,49.999,50,50.001,150,250]){
 const moved=D.placeSelectionAtDirectionalGap(plan,work,['a'],'r',gap);assert.equal(moved.length,2);for(const f of moved){const old=work.furniture.find(v=>v.id===f.id);close(f.cx-old.cx,150-gap);close(f.cy,old.cy);assert.equal(f.groupId,'group');}
 close(moved[1].cx-moved[0].cx,200);close(moved[1].cy-moved[0].cy,200);close(S.directional(moved,{rects:plan.walls,furniture:work.furniture}).r.distance,gap);
}
for(const rotation of [0,90,180,270])for(const flip of [false,true]){
 const members=[{...a,rot:37,flip},{...b,rot:71,flip}],w={...work,furniture:[...members,target]},dir=['r','b','l','t'][rotation/90],gap=S.directional(members,{rects:plan.walls,furniture:w.furniture,rotation})[dir].distance;
 const moved=D.placeSelectionAtDirectionalGap(plan,w,['b'],dir,gap-10,{rotation});for(let i=0;i<moved.length;i++){close(moved[i].cx-members[i].cx,10);close(moved[i].cy,members[i].cy);assert.equal(moved[i].rot,members[i].rot);assert.equal(moved[i].flip,flip);}
}
assert.throws(()=>D.placeSelectionAtDirectionalGap(plan,{...work,furniture:[a,{...b,locked:true},target]},['a'],'r',50),/锁定/);
assert.throws(()=>D.placeSelectionAtDirectionalGap(plan,work,['a'],'r',0,{visibleFurniture:false}),/路径.*家具/); // Only the non-primary member's sweep hits the obstacle.
assert.throws(()=>D.placeSelectionAtDirectionalGap(plan,work,['missing'],'r',20),/不存在/);
const gapMembers=[{...a,cy:-200},{...b,cx:0,cy:200}],gapObstacle={...target,cx:400,cy:0},gapWork={...work,furniture:[...gapMembers,gapObstacle]};
const throughGap=D.placeSelectionAtDirectionalGap(plan,gapWork,['a'],'r',0);throughGap.forEach(f=>close(f.cx,850)); // Empty space between members is not treated as a solid group rectangle.
const overlapping=[{...a,cy:0},{...b,cx:20,cy:0}],overlapWork={...work,furniture:[...overlapping,{...target,cy:0}]},overlapMoved=D.placeSelectionAtDirectionalGap(plan,overlapWork,['a'],'r',100);close(overlapMoved[1].cx-overlapMoved[0].cx,20);
const low={...a,type:'washer',cx:0,cy:0,h:850,mountHeight:0},upper={...b,type:'dryer',cx:0,cy:0,h:850,mountHeight:860,stackHeight:10},stackWork={...work,furniture:[low,upper,{...target,cy:0}]};
const stackMoved=D.placeSelectionAtDirectionalGap(plan,stackWork,['a'],'r',300);close(stackMoved[0].cx,50);close(stackMoved[1].cx,50);assert.equal(stackMoved[1].mountHeight,860);
assert.throws(()=>D.placeSelectionAtDirectionalGap(plan,{...stackWork,furniture:stackWork.furniture.map(f=>{const next={...f};delete next.groupId;return next;})},['a'],'r',300),/全部选中/);
const host=K.configure({...base,id:'host',type:'counter',cx:0,cy:0,w:1200,d:600},{version:1,shape:'straight',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'sink'}]}),sink=K.attach({...base,id:'sink',type:'ksink',cx:0,cy:0,w:400,d:400},host,0),kMembers=[host,sink];K.normalize(kMembers);
const large={...plan,rooms:[{...room,poly:[[-5000,-5000],[5000,-5000],[5000,5000],[-5000,5000]]}],walls:[[3500,-5000,3600,5000]]},kWork={...work,furniture:kMembers},kGap=S.directional(kMembers,{rects:large.walls,furniture:kMembers}).r.distance;
const kitchenMoved=D.placeSelectionAtDirectionalGap(large,kWork,['host'],'r',kGap-100);kitchenMoved.forEach(f=>close(f.cx-kMembers.find(v=>v.id===f.id).cx,100));assert.deepEqual(kitchenMoved[1].counterLink,sink.counterLink);
for(const rot of [37,90,180])for(const flip of [false,true]){
 const members=structuredClone(kMembers);members[0].rot=rot;members[0].flip=flip;K.normalize(members,kMembers);const w={...work,furniture:members},gap=S.directional(members,{rects:large.walls,furniture:members}).r.distance;
 const moved=D.placeSelectionAtDirectionalGap(large,w,['sink'],'r',gap-123.456);moved.forEach(f=>{const old=members.find(v=>v.id===f.id);close(f.cx-old.cx,123.456);close(f.cy,old.cy);});const normalized=structuredClone(moved);K.normalize(normalized,members);normalized.forEach(f=>{const expected=moved.find(v=>v.id===f.id);close(f.cx,expected.cx);close(f.cy,expected.cy);});
}
const moved=D.placeSelectionAtDirectionalGap(plan,work,['a'],'r',50),saved={...work,furniture:work.furniture.map(f=>moved.find(v=>v.id===f.id)||f)},payload={planId:'group',current:saved,designs:[{name:'整组定位',work:saved}],catalog:[]};assert.deepEqual(P.unpack(P.pack(payload)),payload);
const restore=W.create({makeId:()=> 'id',colorFor:()=> '#ddd',materials:{}}).restore,restorePlan={...plan,defaults:[],rooms:[]},first=restore(structuredClone(saved),restorePlan);assert.deepEqual(restore(structuredClone(first),restorePlan),first);close(first.furniture[1].cx-first.furniture[0].cx,200);
assert.equal(JSON.stringify(work),snapshot);assert.deepEqual(work.furniture[2],target);
console.log('PASS rigid group clearance, full group expansion, unchanged offsets/rotation/mirror, locks, per-member sweeps, empty group gaps, preserved internal overlaps, complete laundry/kitchen relationships and repeated project restore');
