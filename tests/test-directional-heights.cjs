const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),K=require('../src/core/kitchen-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const hob={id:'hob',type:'stove_fotile_th36b',name:'燃气灶',cx:2100,cy:2010,w:750,d:440,rot:0,color:'#111'},host={id:'top',type:'counter',name:'台面',cx:2000,cy:2000,w:1800,d:600,rot:0,color:'#ddd'};
const wall={id:'upper',type:'kitchenwall',name:'吊柜',cx:2100,cy:2150,w:1200,d:400,rot:0,h:700,mountHeight:1480,color:'#ddd'};
const baseline=S.directional(hob,{furniture:[host,hob]});
// Adding either a legacy or a modular wall cabinet must preserve the worktop distances.
const modular=K.configure(wall,{version:1,shape:'straight',depth:400,baseHeight:700,thickness:0,plinth:0,modules:[{run:0,width:1200,role:'door'}]});
for(const upper of [wall,modular]){
 const items=[host,hob,upper],before=JSON.stringify(items);
 assert.deepEqual(S.directional(hob,{furniture:items}),baseline);
 assert.deepEqual(S.directional(upper,{furniture:[hob]}),{l:null,r:null,t:null,b:null});
 const work={furniture:items,measures:Object.values(baseline).map(({a,b})=>({a,b}))},payload={planId:'height-gap',current:work,designs:[{name:'吊柜边距',work}],catalog:[]};
 const restored=P.unpack(P.pack(payload));assert.deepEqual(restored,payload);
 let list=restored.current.furniture;for(let i=0;i<3;i++)list=D.restoreFurniture(list,{makeId:()=> 'new',colorFor:()=> '#ddd'});
 assert.deepEqual(list,items);assert.deepEqual(S.directional(list[1],{furniture:list}),baseline);assert.equal(JSON.stringify(items),before);
}
const top=D.furnitureVerticalBounds(hob).top;
for(const delta of [-.001,0,.001]){
 const upper={...wall,mountHeight:top+delta},actual=S.directional(hob,{furniture:[host,hob,upper]});
 if(delta<0){close(actual.b.distance,0);assert.equal(actual.b.entity.id,upper.id);}else assert.deepEqual(actual,baseline);
}
// Unknown height is retained. Actual same-height overlap and closer furniture still compete.
const unknown={...wall,type:'unknown-height'};delete unknown.h;delete unknown.mountHeight;
close(S.directional(hob,{furniture:[host,hob,unknown]}).b.distance,0);
const neighbor={...wall,id:'neighbor',type:'fridge',cx:2625,cy:2010,w:100,d:100,h:1800};
delete neighbor.mountHeight; // A floor fridge does not inherit a wall cabinet's unsupported mounting field.
const nearest=S.directional(hob,{furniture:[host,hob,wall,neighbor]});close(nearest.r.distance,100);assert.equal(nearest.r.entity.id,'neighbor');
// Rotation/mirror, linked production surfaces and drawing axes use the same height filter.
for(const shape of ['straight','L','U'])for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const h=K.configure({...host,rot,flip},{version:1,shape,depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'hob'},...(shape!=='straight'?[{run:1,width:1000,role:'door'}]:[]),...(shape==='U'?[{run:2,width:1200,role:'door'}]:[])]});
 const f=K.attach(hob,h,0),upper={...wall,cx:f.cx,cy:f.cy,rot,flip,w:1000,d:600};
 for(const rotation of [0,90,180,270])assert.deepEqual(S.directional(f,{rotation,furniture:[h,f,upper]}),S.directional(f,{rotation,furniture:[h,f]}));
}
// Each group member contributes only to targets at its own height, in either selection order.
const low={id:'low',type:'washer',cx:0,cy:0,w:100,d:100,rot:0,h:500,mountHeight:0},high={...low,id:'high',cx:200,mountHeight:1000},target={...low,id:'target',cx:400};
for(const members of [[low,high],[high,low]]){
 const gap=S.directional(members,{furniture:[...members,target]}).r;close(gap.distance,300);close(gap.a.x,50);
 const upperTarget={...target,mountHeight:1000},upperGap=S.directional(members,{furniture:[...members,upperTarget]}).r;close(upperGap.distance,100);close(upperGap.a.x,250);
}
// Wall references and manual measurement snapping keep their planar semantics.
close(S.directional(high,{rects:[[400,-100,420,100]]}).r.distance,150);
assert(S.measurePoint({x:wall.cx-wall.w/2+1,y:wall.cy},{scale:1,furniture:[wall]}).edge);
console.log('PASS height-aware directional gaps: legacy/modular wall cabinets, exact contact and threshold sides, unknown/overlapping heights, closer targets, linked straight/L/U rotation/mirror, group members, project roundtrip and repeated restore');
