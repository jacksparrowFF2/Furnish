'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),url=require('node:url');
const A=require('../src/data/chair-s05118-blender-asset.js'),M=require('../src/render/armchair-model.js'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js');
const f={id:'chair',name:'单人沙发',type:'chair_yeswood_s05118',w:660,d:660,h:840,cx:0,cy:0,rot:0,color:'#be9465'},near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`);
assert.equal(A.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../assets/models/chair-s05118/v2/chair-s05118-v1.glb'))).digest('hex'));
assert.equal(A.parts.length,17);assert.equal(new Set(A.parts.map(p=>p.identity)).size,17);assert.equal(P.height({...f,h:undefined}),840);
assert.equal(P.kind(f),'椅子');
const arm=A.parts.find(p=>p.name==='wraparound-arm');assert(arm,'Missing continuous wooden hoop');
const heights=arm.positions.filter((_,i)=>i%3===1);near(Math.min(...heights)*1000,570);near(Math.max(...heights)*1000,595);
const cushion=A.parts.find(p=>p.name==='seat-cushion');for(const axis of [0,2]){const v=cushion.positions.filter((_,i)=>i%3===axis);assert(Math.abs((Math.max(...v)-Math.min(...v))*1000-530)<2);}
const seatY=A.parts.find(p=>p.name==='seat-cushion').positions.filter((_,i)=>i%3===1);near(Math.max(...seatY)*1000,450);near((Math.max(...seatY)-Math.min(...seatY))*1000,70);
for(const p of A.parts){assert(p.positions.every(Number.isFinite));assert.equal(p.positions.length,p.normals.length);for(let i=0;i<p.normals.length;i+=3)near(Math.hypot(...p.normals.slice(i,i+3)),1);}
(async()=>{
const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
for(const dimensions of [{},{w:f.w*1.2,d:f.d*1.2,h:f.h*1.2}]){
 const item={...f,...dimensions},model=M.build(T,item),b=new T.Box3().setFromObject(model);near(b.min.y,0);for(const [axis,size]of [['x',item.w],['y',item.h],['z',item.d]])near((b.max[axis]-b.min[axis])*1000,size);
 assert.equal(model.userData.furnishAsset,'chair-yeswood-s05118@1');assert.equal(model.children.length,17);
 for(const mesh of model.children){assert(mesh.geometry.index.count>0);assert.equal(mesh.userData.furnishStablePart,('chair-s05118-v1:')+mesh.name);}
}
for(const rot of [0,37,90])for(const flip of [false,true]){
 const item={...f,rot,flip},bounds=G.bbox(G.footprints(item).flat()),wall={id:'wall',type:'block',cx:bounds[2]+150,cy:0,w:100,d:2500,h:1500,rot:0};
 near(S.directional(item,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(item,wall));
 const enclosing={...wall,cx:0,w:2000,d:2000};assert(G.volumeOverlap(item,enclosing));assert(S.directional(item,{furniture:[enclosing]}).r.containedBoundary);
 const solid={id:'solid',type:'block',cx:0,cy:0,w:100,d:100,h:100,mountHeight:380,rot:0};assert(G.volumeOverlap(item,solid));assert(!G.volumeOverlap(item,{...solid,mountHeight:1100}));
 const snap={grid:1,scale:1,wallSnap:true,guides:false,rects:[[0,-1500,0,1500]],furniture:[]},half=-bounds[0];near(S.move(item,half+6,0,snap).position[0],half);
}
const catalog=require('../src/data/catalog.js');assert(catalog.library.flatMap(c=>c.items).some(i=>i[0]===f.type));
const parts=G.bodyParts(f);assert.equal(parts.length,17);assert(parts.every(p=>p.vertices?.length&&p.faces?.length));
const seatZ=A.parts.filter(p=>['seat-cushion','seat-front-seam'].includes(p.name)).flatMap(p=>p.positions.filter((_,i)=>i%3===2)),front=Math.max(...seatZ)*1000,contact={id:'contact',type:'block',cx:0,cy:front+50,w:100,d:100,h:30,mountHeight:385,rot:0};
assert(!G.volumeOverlap(f,contact));assert(G.volumeOverlap(f,{...contact,cy:contact.cy-.1}));assert(G.volumeOverlap(f,{...contact,type:'unknown-device',h:undefined,cy:0}));
const noDrift=J.validateWork({furniture:[f]});assert.deepEqual(J.validateWork(noDrift),noDrift);
const packed=J.pack({planId:'chair-plan',current:{furniture:[f]},designs:[{name:'沙发方案',work:{furniture:[f]}}],catalog:[]}),restored=J.unpack(packed);assert.deepEqual(restored.current.furniture,[f]);assert.deepEqual(restored.designs[0].work.furniture,[f]);
console.log('PASS S05118 provenance, 17 production parts, seat/arm dimensions, bounds, resize, defaults, normals, rotation/mirror, spacing, containment, collision/height, snapping and project/named-design roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
