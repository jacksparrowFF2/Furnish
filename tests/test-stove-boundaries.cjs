const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),values=m=>Object.fromEntries(Object.entries(m).map(([d,m])=>[d,m?.distance]));
const host={id:'top',type:'counter',name:'实体台面',cx:2000,cy:2000,w:1800,d:600,rot:0,color:'#ddd'},stove={id:'hob',type:'stove_fotile_th36b',name:'燃气灶',cx:2100,cy:2010,w:750,d:440,rot:0,color:'#111'};
const expected={l:625,r:425,t:90,b:70},scene={furniture:[host,stove]},before=JSON.stringify(scene);
for(const type of ['stove_fotile_th36b','stove']){
 const f={...stove,type},single=S.directional(f,scene);assert.deepEqual(values(single),expected);assert.deepEqual(S.directional([f],scene),single);
 for(const m of Object.values(single)){assert(m.surfaceBoundary);assert.equal(m.entity.id,host.id);close(Math.hypot(m.b.x-m.a.x,m.b.y-m.a.y),m.distance);}
}
// Exact contact and either side of the save threshold retain physical edge endpoints.
for(const gap of [0,.999,1,1.001]){
 const f={...stove,cx:host.cx+host.w/2-stove.w/2-gap},m=S.directional(f,{furniture:[host,f]}).r;close(m.distance,gap);assert(m.surfaceBoundary);close(m.b.x,2900);
}
// A different appliance or an overhanging hob still has ordinary overlap semantics.
assert(Object.values(S.directional({...stove,type:'custom'},scene)).every(m=>m.distance===0&&!m.surfaceBoundary));
assert(!S.directional({...stove,cx:2900-stove.w/2+1},scene).r?.surfaceBoundary);
assert(Object.values(S.directional(stove,{furniture:[stove]})).every(m=>m===null));
const neighbor={...host,id:'neighbor',type:'cabinet',cx:2625,cy:2010,w:100,d:100};
const competing=S.directional(stove,{furniture:[host,stove,neighbor]});close(competing.r.distance,100);assert.equal(competing.r.entity.id,'neighbor');close(competing.l.distance,625);
// Arbitrarily rotated panels use the panel silhouette, rather than its unrotated size.
for(const flip of [false,true]){
 const f={...stove,rot:37,flip},h={...host,d:1400},r=37*Math.PI/180,hx=(750*Math.cos(r)+440*Math.sin(r))/2,hy=(750*Math.sin(r)+440*Math.cos(r))/2;
 const m=S.directional(f,{furniture:[h,f]});for(const [dir,v] of Object.entries({l:1000-hx,r:800-hx,t:710-hy,b:690-hy}))close(m[dir].distance,v);
}
// Linked devices use the production surface, ignoring module seams and device cutouts.
for(const shape of ['straight','L','U'])for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const h=K.configure({...host,rot,flip},{version:1,shape,depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'hob'},...(shape!=='straight'?[{run:1,width:1000,role:'door'}]:[]),...(shape==='U'?[{run:2,width:1200,role:'door'}]:[])]});
 const f=K.attach({...stove,cx:0,cy:0},h,0),list=[h,f];K.normalize(list);assert(K.onSurface(f,h));
 const m=S.directional(f,{furniture:list,rotation:-rot}),sides={l:225,r:225,t:80,b:80};
 if(flip)[sides.l,sides.r]=[sides.r,sides.l];for(const dir of Object.keys(sides)){close(m[dir].distance,sides[dir]);assert(m[dir].surfaceBoundary);}
 // Drawing rotation changes direction names, while endpoints stay in world mm.
 const order=['r','b','l','t'];for(const rotation of [0,90,180,270]){const rotated=S.directional(f,{furniture:list,rotation:-rot+rotation});for(let i=0;i<4;i++)close(rotated[order[(i+rotation/90)%4]].distance,m[order[i]].distance);}
 const work={furniture:list,measures:Object.values(m).map(({a,b})=>({a,b}))},project={planId:'stove-boundary',current:work,designs:[{name:'灶具定位',work}],catalog:[]};
 const restored=P.unpack(P.pack(project));assert.deepEqual(restored,project);let items=restored.current.furniture;for(let i=0;i<3;i++)items=D.restoreFurniture(items,{makeId:()=> 'new',colorFor:()=> '#ddd'});
 assert.deepEqual(items,list);assert.deepEqual(S.directional(items[1],{furniture:items,rotation:-rot}),m);
}
// A hob in an L-shaped void must not measure to the host's enclosing rectangle.
const lhost=K.configure(host,{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'door'},{run:1,width:1000,role:'door'}]}),at=K.world(lhost,300,300),inVoid={...stove,cx:at[0],cy:at[1],w:100,d:100};
assert(!K.onSurface(inVoid,lhost));assert(Object.values(S.directional(inVoid,{furniture:[lhost,inVoid]})).every(m=>!m?.surfaceBoundary));
// Front overhangs, narrowed ends and actual obstacle cuts change the surface perimeter.
const config={version:1,shape:'straight',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'hob'}]};
for(const [extra,expected] of [
 [{counterDepth:630,endExtensions:[{run:0,length:500,depth:250,cabinetDepth:220}]},{l:225,r:225,t:80,b:110}],
 [{autoAvoid:true,obstacleFit:{depths:[],cuts:[[[-600,-300],[-500,-300],[-500,300],[-600,300]]]}},{l:125,r:225,t:80,b:80}]
]){
 const h=K.configure(host,{...config,...extra});if(extra.obstacleFit)h.kitchen.obstacleFit=structuredClone(extra.obstacleFit);K.validate(h);const f=K.attach(stove,h,0),list=[h,f];K.normalize(list);assert(K.onSurface(f,h));assert.deepEqual(values(S.directional(f,{furniture:list})),expected);
}
const holed=K.configure(host,{...config,autoAvoid:true}),overHole={...stove,cx:host.cx,cy:host.cy};holed.kitchen.obstacleFit={depths:[],cuts:[[[-50,-50],[50,-50],[50,50],[-50,50]]]};K.validate(holed);
assert(!K.onSurface(overHole,holed));assert(Object.values(S.directional(overHole,{furniture:[holed,overHole]})).every(m=>!m?.surfaceBoundary));
// Existing precise placement still solves the newly displayed inner boundary.
const plan={walls:[],wins:[],rooms:[{id:'r',poly:[[0,0],[5000,0],[5000,5000],[0,5000]]}]},work={furniture:[host,stove]};
const placed=D.placeAtDirectionalGap(plan,work,stove.id,'r',200);close(placed.cx,2325);close(S.directional(placed,{furniture:[host,placed]}).r.distance,200);
assert.equal(JSON.stringify(scene),before);
console.log('PASS stove surface boundary distances, contact/save thresholds, ordinary overlap, target competition, rotated/mirrored panels, production straight/L/U linked surfaces, drawing rotation, precise placement and project/repeated restore');
