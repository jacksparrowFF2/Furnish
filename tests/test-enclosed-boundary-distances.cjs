const assert=require('node:assert/strict'),S=require('../src/core/snapping.js'),G=require('../src/core/layout-geometry.js'),R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const device={id:'device',type:'water_purifier_mijia_1200g',name:'净水器',cx:6320,cy:9429,w:163,d:445,h:379,mountHeight:0,rot:270,color:'#fff'},host={id:'host',type:'block',name:'橱柜台面',cx:6325,cy:8998,w:1164,d:600,rot:270,color:'#ddd'};
const gaps=S.directional(device,{furniture:[device,host]});
for(const [dir,n] of Object.entries({l:72.5,r:82.5,t:931.5,b:69.5})){near(gaps[dir].distance,n);assert(gaps[dir].containedBoundary);assert.equal(gaps[dir].entity.id,host.id);}
assert(G.volumeOverlap(device,host),'boundary measurements must not exempt solid collisions');
const plan={walls:[],wins:[],rooms:[{id:'room',poly:[[0,0],[20000,0],[20000,20000],[0,20000]]}]};
assert.throws(()=>D.placeAtDirectionalGap(plan,{furniture:[device,host]},device.id,'l',20),/包络内边距/);
const restored=P.unpack(P.pack({planId:'boundary',current:{furniture:[host,device]},designs:[{name:'边界',work:{furniture:[host,device]}}],catalog:[]}));
assert.deepEqual(S.directional(restored.current.furniture[1],{furniture:restored.current.furniture}),gaps);
// Every catalog type inherits containment handling; no appliance whitelist.
const entries=require('../src/data/catalog.js').library.flatMap(c=>c.items),types=new Set();
for(const entry of entries)for(const rot of [0,37,90,270])for(const flip of [false,true]){
 const f={id:'catalog',type:entry[0],name:entry[1],cx:0,cy:0,w:entry[2],d:entry[3],rot,flip,color:entry[4],...R.initial({type:entry[0],w:entry[2],d:entry[3]})};if(entry[6])f.h=entry[6];
 const [x0,y0,x1,y1]=G.bbox(G.footprints(f).flat()),w=Math.max(Math.abs(x0),Math.abs(x1))*2+1000,d=Math.max(Math.abs(y0),Math.abs(y1))*2+1000;
 const box={id:'enclosing',type:'block',name:'通用外框',cx:0,cy:0,w,d,h:20000,rot:0},before=JSON.stringify([f,box]);
 const result=S.directional(f,{furniture:[f,box]});
 for(const [dir,n] of Object.entries({l:x0+w/2,r:w/2-x1,t:y0+d/2,b:d/2-y1})){assert(result[dir]?.containedBoundary,`${f.type}/${rot}/${flip}/${dir}`);near(result[dir].distance,n);}
 assert.equal(JSON.stringify([f,box]),before);types.add(f.type);
}
// Partial penetration remains zero; contact is zero; separated heights are excluded.
const small={id:'small',type:'washer',cx:0,cy:0,w:100,d:100,h:200,mountHeight:0,rot:0};
const enclosing={id:'box',type:'block',cx:0,cy:0,w:500,d:500,h:800,rot:0};
for(const x of [199.999,200]){const f={...small,cx:x},m=S.directional(f,{furniture:[enclosing]}).r;near(m.distance,Math.max(0,200-x));assert.equal(!!m.containedBoundary,x<=200);}
assert.equal(S.directional({...small,cx:200.001},{furniture:[enclosing]}).l.distance,0);
assert.equal(S.directional({...small,mountHeight:801},{furniture:[enclosing]}).r,null);
assert(S.directional({...small,h:undefined,type:'unknown'},{furniture:[enclosing]}).r.containedBoundary);
const group=[{...small,cx:-100},{...small,id:'second',cx:100}];near(S.directional(group,{furniture:[enclosing]}).l.distance,100);near(S.directional(group,{furniture:[enclosing]}).r.distance,100);
for(const rotation of [0,90,180,270]){const order=['r','b','l','t'],m=S.directional(device,{rotation,furniture:[host]});for(let i=0;i<4;i++)near(m[order[(i+rotation/90)%4]].distance,gaps[order[i]].distance);}
// A hollow pipe enclosure uses its real panels, not its filled outer rectangle.
const pipe={...enclosing,type:'pipebox',pipeBoxShape:'three',pipeBoxThickness:18};
assert(!Object.values(S.directional(small,{furniture:[pipe]})).some(m=>m?.containedBoundary));
console.log(`PASS enclosed boundaries: screenshot fixture, ${types.size} catalog types × 8 transforms, partial overlap/contact, height separation/unknowns, groups, drawing rotation, real panels, preserved collision checks and project roundtrip`);
