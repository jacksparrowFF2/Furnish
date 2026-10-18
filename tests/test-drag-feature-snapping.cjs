const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),G=require('../src/core/layout-geometry.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6,JSON.stringify({a,b}));
const f={id:'moving',type:'counter',cx:0,cy:0,w:120,d:80,rot:0},target={...f,id:'target',cx:3000,cy:2000,w:800,d:600};
const options={grid:10,scale:1,wallSnap:true,guides:true,rects:[],furniture:[f,target],skip:new Set([f.id])};
assert.deepEqual(S.move(f,2663.375,1744.125,{...options,disabled:true}),{position:[2663.375,1744.125],guides:[]},'temporary bypass includes magnets, guides and grid rounding');
const features=item=>{const ring=G.corners(item);return [{kind:'corner',point:ring[0]},{kind:'midpoint',point:[(ring[0][0]+ring[1][0])/2,(ring[0][1]+ring[1][1])/2]}];};
for(const rot of [0,37,90])for(const flip of [false,true])for(const source of features({...f,rot,flip}))for(const dest of features(target)){
 const item={...f,rot,flip},center=[dest.point[0]-source.point[0],dest.point[1]-source.point[1]],before=structuredClone(item);
 const result=S.move(item,center[0]+3,center[1]+4,{...options,furniture:[item,target]});near(result.position,center);assert.equal(result.guides[0].kind,dest.kind);assert.equal(result.guides[0].sourceKind,source.kind);assert.deepEqual(item,before);
}
for(const scale of [.2,.5,1,2]){
 const center=[2600+60,1700+40],o={...options,scale};
 near(S.move(f,center[0]+12/scale,center[1],o).position,center);
 assert(!S.move(f,center[0]+12.01/scale,center[1],o).guides.some(g=>g.point));
}
const wallOptions={...options,rects:[[2000,1000,2300,2000]],furniture:[f]};
for(const [dest,kind] of [[[2000,1000],'corner'],[[2000,1500],'midpoint']]){
 const center=[dest[0]-60,dest[1]],hit=S.move(f,center[0]+3,center[1]+4,wallOptions);near(hit.position,center);assert.equal(hit.guides[0].kind,kind);
 assert(!S.move(f,center[0]+3,center[1]+4,{...wallOptions,wallSnap:false}).guides.some(g=>g.point));
}
const center=[2660,1740];
assert(!S.move(f,center[0]+3,center[1]+4,{...options,guides:false}).guides.some(g=>g.point));
assert(!S.move(f,center[0]+3,center[1]+4,{...options,skip:new Set(['moving','target'])}).guides.some(g=>g.point));
const second={...f,id:'second',cx:800,cy:200},groupOptions={...options,moving:[f,second],skip:new Set(['moving','second']),furniture:[f,second,target]};
const group=S.move(f,center[0]-800+3,center[1]-200+4,groupOptions);near(group.position,[center[0]-800,center[1]-200]);near([second.cx+group.position[0],second.cy+group.position[1]],center);
const kitchen=K.configure({...f,w:2400,d:1800},{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:2400,role:'door'},{run:1,width:1200,role:'door'}]});
const ring=K.topGeometry(kitchen).rings[0],at=K.world(kitchen,...ring[2]),kcenter=[2600-at[0],1700-at[1]],hit=S.move(kitchen,kcenter[0]+3,kcenter[1]+4,{...options,furniture:[kitchen,target]});near(hit.position,kcenter);
const saved={...f,cx:hit.position[0],cy:hit.position[1]},payload={planId:'drag-features',current:{furniture:[saved],measures:[]},designs:[],catalog:[]};near([P.unpack(P.pack(payload)).current.furniture[0].cx,P.unpack(P.pack(payload)).current.furniture[0].cy],hit.position);
console.log('PASS drag corner/midpoint pairs, exact rotated coordinates, thresholds, switches, group member anchors, exclusions, production kitchen outline and project roundtrip');
