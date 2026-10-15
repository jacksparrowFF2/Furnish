const assert=require('node:assert/strict'),D=require('../src/core/design-core.js'),S=require('../src/core/snapping.js'),G=require('../src/core/layout-geometry.js'),P=require('../src/core/project-core.js'),K=require('../src/core/kitchen-core.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),f={id:'a',name:'A',type:'custom',h:500,price:0,cx:0,cy:0,w:100,d:100,rot:0};
const room={id:'r',poly:[[-900,-900],[900,-900],[900,900],[-900,900]],at:[0,0]},plan={id:'move',rooms:[room],walls:[[-1000,-1000,-900,1000],[900,-1000,1000,1000],[-900,-1000,900,-900],[-900,900,900,1000]],wins:[]};
const right={...f,id:'right',cx:170},left={...f,id:'left',cx:-200},work={furniture:[f,right,left],rooms:{},measures:[{a:{x:50,y:0},b:{x:120,y:0}}]},before=JSON.stringify(work);
for(const gap of [0,69.999,70,70.001,100]){
 const next=D.placeAtDirectionalGap(plan,work,'a','r',gap);close(next.cx,70-gap);close(next.cy,0);close(S.directional(next,{rects:plan.walls,furniture:work.furniture})['r'].distance,gap);
}
for(const rotation of [0,90,180,270])for(const flip of [false,true]){
 const source={...f,rot:37,flip},w={...work,furniture:[source,right]},directions=S.directional(source,{rects:plan.walls,furniture:w.furniture,rotation}),dir=['r','b','l','t'][rotation/90],current=directions[dir].distance;
 const next=D.placeAtDirectionalGap(plan,w,'a',dir,current-10,{rotation});close(next.cx,10);close(next.cy,0);assert.equal(next.flip,flip);close(next.rot,37);
}
const upward={...right,id:'upper',cx:0,cy:-170},verticalWork={...work,furniture:[f,upward]};close(D.placeAtDirectionalGap(plan,verticalWork,'a','t',30).cy,-40);
const down={...right,id:'down',cx:0,cy:170};close(D.placeAtDirectionalGap(plan,{...work,furniture:[f,down]},'a','b',30).cy,40);
const solo={...work,furniture:[f]};close(D.placeAtDirectionalGap(plan,solo,'a','l',0).cx,-850);
for(const value of [-1,20000.001,NaN,Infinity,'20'])assert.throws(()=>D.placeAtDirectionalGap(plan,work,'a','r',value),/0–20000/);
assert.throws(()=>D.placeAtDirectionalGap(plan,work,'a','wrong',5),/有效方向/);
assert.throws(()=>D.placeAtDirectionalGap(plan,{...work,furniture:[{...f,locked:true},right]},'a','r',30),/锁定/);
assert.throws(()=>D.placeAtDirectionalGap(plan,{...work,furniture:[{...f,groupId:'g'},right]},'a','r',30),/解组/);
assert.throws(()=>D.placeAtDirectionalGap(plan,{...work,furniture:[{...f,counterLink:{hostId:'host',module:0}},right]},'a','r',30),/关联/);
assert.throws(()=>D.placeAtDirectionalGap({...plan,walls:[]},solo,'a','r',30),/没有可用/);
assert.throws(()=>D.placeAtDirectionalGap(plan,work,'a','r',500),/重叠|阻挡|参考/);
assert.throws(()=>D.placeAtDirectionalGap(plan,solo,'a','r',20000),/房间|边界|参考/);
assert.throws(()=>D.placeAtDirectionalGap(plan,work,'a','r',0,{visibleFurniture:false}),/路径.*家具/); // Hidden furniture still blocks the swept path to the wall.
assert.throws(()=>D.placeAtDirectionalGap(plan,{...work,furniture:[f,{...right,h:undefined}]},'a','r',0,{visibleFurniture:false}),/路径.*家具/); // Unknown height remains conservative.
const low={...f,type:'table',h:500},high={...right,type:'kitchenwall',h:500,mountHeight:2000};
close(D.placeAtDirectionalGap(plan,{...work,furniture:[low,high]},'a','r',0,{visibleFurniture:false}).cx,850); // Known vertical separation allows passage underneath.
const edge=G.corners(f);assert(G.polygonOverlap(edge,G.corners({...f,cx:99}),1e-6));assert(!G.polygonOverlap(edge,G.corners({...f,cx:100}),1e-6));assert(!G.polygonOverlap(edge,G.corners({...f,cx:99}))); // Existing 5 mm collision tolerance is unchanged.
const kitchen=K.configure({...f,type:'counter',id:'k'},{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'door'},{run:1,width:900,role:'door'}]}),large={...plan,rooms:[{...room,poly:[[-5000,-5000],[5000,-5000],[5000,5000],[-5000,5000]]}],walls:[[3500,-5000,3600,5000]]},kw={...work,furniture:[kitchen]},gap=S.directional(kitchen,{rects:large.walls}).r.distance;
const movedKitchen=D.placeAtDirectionalGap(large,kw,'k','r',gap-100);close(movedKitchen.cx,kitchen.cx+100);assert.deepEqual(movedKitchen.kitchen,kitchen.kitchen);
assert.equal(JSON.stringify(work),before);assert.deepEqual(work.furniture[1],right);
const next=D.placeAtDirectionalGap(plan,work,'a','r',25),saved={...work,furniture:work.furniture.map(v=>v.id==='a'?next:v)},payload={planId:'move',current:saved,designs:[{name:'精确定位',work:saved}],catalog:[]};assert.deepEqual(P.unpack(P.pack(payload)),payload);assert.deepEqual(saved.measures,work.measures);
console.log('PASS directional target placement, exact contact, rotated axes, mirror, fixed references, input limits, locks/relationships, swept blockers, known/unknown heights, kitchen outlines and project roundtrip');
