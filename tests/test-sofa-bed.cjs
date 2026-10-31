'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const A=require('../src/data/sofa-bed-blender-asset.js'),M=require('../src/render/sofa-bed-model.js'),P=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),C=require('../src/core/sofa-bed-core.js'),D=require('../src/core/design-core.js');
const f={id:'sofa',name:'沙发床',type:'sofa_bed_yeswood_y107h03',w:1250,d:838,h:770,cx:0,cy:0,rot:0,color:'#c89d68'},near=(a,b)=>assert(Math.abs(a-b)<.004,`${a} != ${b}`);
assert.equal(A.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../assets/models/sofa-bed/v5/sofa-bed-v1.glb'))).digest('hex'));
assert.equal(A.parts.length,103);assert.equal(new Set(A.parts.map(p=>p.identity)).size,103);assert.deepEqual(A.parts.map(p=>p.name).sort(),C.spec().parts.map(p=>p.name).sort());assert.equal(A.motions.length,6);assert.equal(A.motions.find(m=>m.role==='front-pad').parent,'middle-pad');
assert.equal(P.height({...f,h:undefined}),770);assert.equal(P.value(f,'sofaBedOpen'),false);assert.equal(P.initial(f).sofaBedOpen,false);assert.throws(()=>P.validateField(f,'sofaBedOpen',1));assert.throws(()=>C.frames(f,.5));
assert.equal(D.replaceFurniture({...f,sofaBedOpen:true},{...f,type:'sofa'}).sofaBedOpen,undefined);
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const dimensions of [{},{w:1400,d:900,h:820}]){
  const item={...f,...dimensions},s=C.layout(item).s,models=[false,true].map(sofaBedOpen=>M.build(T,{...item,sofaBedOpen})),boxes=models.map(model=>{model.updateMatrixWorld(true);const all={};model.traverse(m=>{if(m.geometry)all[m.name]=new T.Box3().setFromObject(m);});assert.equal(Object.keys(all).length,103);assert.equal(model.userData.furnishAsset,'sofa-bed-yeswood-y107h03@3');return all;});
  for(let i=0;i<2;i++){const b=new T.Box3().setFromObject(models[i]);near(b.min.y,0);near((b.max.x-b.min.x)*1000,item.w);near((b.max.y-b.min.y)*1000,item.h);near(b.min.z*1000,-item.d/2);near((b.max.z-b.min.z)*1000,item.d+(i?1180*s[2]:0));}
  near(boxes[0]['seat-upper'].max.y*1000,400*s[1]);
  for(const name of ['seat-middle','seat-upper']){near(boxes[1][name].min.y*1000,250*s[1]);near(boxes[1][name].max.y*1000,300*s[1]);near((boxes[1][name].max.z-boxes[1][name].min.z)*1000,590*s[2]);}
  near(boxes[1]['seat-middle'].min.z*1000,410*s[2]);near(boxes[1]['seat-upper'].min.z*1000,1000*s[2]);
  for(const name of ['back-post-left','side-panel-right','back-cushion','seat-lower'])assert.deepEqual(boxes[1][name],boxes[0][name]);
  for(const name of ['front-post-left','front-rail','wheel-front-left'])near((boxes[1][name].min.z-boxes[0][name].min.z)*1000,1180*s[2]);
  near((boxes[1]['wheel-back-left'].min.z-boxes[0]['wheel-back-left'].min.z)*1000,590*s[2]);
  assert(boxes[0]['back-cushion'].min.z>=boxes[0]['back-top-rail'].max.z-.00001,'Back cushion must stay in front of the rear timber rail');
  for(const pose of [0,1])for(const side of ['left','right']){near(boxes[pose]['lumbar-'+side].min.y*1000,(pose?300:400)*s[1]);assert((boxes[pose]['lumbar-'+side].max.y-boxes[pose]['lumbar-'+side].min.y)*1000>200*s[1],'Lumbar pillow must remain leaning, not lie flat');near(boxes[pose]['wheel-fork-back-'+side].max.y*1000,240*s[1]);}
  near(boxes[1]['wheel-back-left'].getCenter(new T.Vector3()).z*1000,905*s[2]);
  for(const side of ['left','right']){const b=boxes[1],fixed=b['fixed-guide-'+side+'-top'],middle=b['middle-guide-'+side+'-top'],front=b['front-guide-'+side+'-top'];near((fixed.max.z-middle.min.z)*1000,119*s[2]);near((middle.max.z-front.min.z)*1000,150*s[2]);}
  const pad=models[0].getObjectByName('seat-lower'),ray=new T.Raycaster(new T.Vector3(0,.270*s[1],1),new T.Vector3(0,0,-1)),hit=ray.intersectObject(pad)[0];assert(hit&&hit.point.z<=.381*s[2]+.00001,'Lower pad must clear the front timber lip');
  for(const model of models)model.traverse(mesh=>{if(mesh.geometry){assert(mesh.geometry.index.count>0);assert.equal(mesh.userData.furnishStablePart,'sofa-bed-v1:'+mesh.name);}});
 }
 for(const sofaBedOpen of [false,true])for(const rot of [0,37,90])for(const flip of [false,true]){
  const item={...f,sofaBedOpen,rot,flip},b=G.bbox(G.footprints(item).flat()),wall={id:'wall',type:'block',cx:b[2]+150,cy:(b[1]+b[3])/2,w:100,d:5000,h:2000,rot:0};
  near(S.directional(item,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(item,wall));
  const enclosing={...wall,cx:(b[0]+b[2])/2,w:b[2]-b[0]+1000,d:b[3]-b[1]+1000};assert(G.volumeOverlap(item,enclosing));assert(S.directional(item,{furniture:[enclosing]}).r.containedBoundary);
  const a=rot*Math.PI/180,z=sofaBedOpen?1200:0,solid={id:'solid',type:'block',cx:-z*Math.sin(a),cy:z*Math.cos(a),w:100,d:100,h:20,mountHeight:sofaBedOpen?260:360,rot};assert(G.volumeOverlap(item,solid));assert(!G.volumeOverlap(item,{...solid,mountHeight:1800}));
  const snap={grid:1,scale:1,wallSnap:true,guides:false,rects:[[0,-5000,0,5000]],furniture:[]},half=-b[0];near(S.move(item,half+6,0,snap).position[0],half);
  assert.equal(G.bodyParts(item).length,103);
 }
 const copied=D.pasteFurniture({items:[{...f,sofaBedOpen:true}],cx:0,cy:0},{x:1000,y:1000},{x:-5000,y:-5000,w:10000,h:10000},()=> 'sofa-copy');assert.equal(copied.items[0].sofaBedOpen,true);assert.equal(copied.items[0].id,'sofa-copy');assert.equal(f.sofaBedOpen,undefined);
 const open={...f,sofaBedOpen:true},contact={id:'contact',type:'block',cx:0,cy:1640,w:100,d:100,h:20,mountHeight:260,rot:0};assert(!G.volumeOverlap(open,contact));assert(G.volumeOverlap(open,{...contact,cy:1639.9}));assert(!G.volumeOverlap(f,{...contact,cy:1200}));assert(G.volumeOverlap(open,{...contact,type:'unknown-device',h:undefined,cy:1200}));
 const plan={id:'p',walls:[],wins:[],doors:[],beams:[],rooms:[{id:'r',poly:[[-5000,-5000],[5000,-5000],[5000,5000],[-5000,5000]]}],ceilingHeight:3000};
 const operation={id:'fold-obstacle',name:'操作范围障碍',type:'block',cx:0,cy:800,w:50,d:50,h:50,mountHeight:1000,rot:0};assert(!G.volumeOverlap(f,operation));assert(!G.volumeOverlap(open,operation));assert(J.spaceCheck(plan,[f,operation],{scanPassages:false}).some(i=>i.section==='sofa-bed:operation'&&!i.pending));assert(!J.spaceCheck(plan,[f,{...operation,mountHeight:1800}],{scanPassages:false}).some(i=>i.section==='sofa-bed:operation'));
 const rangeTop=C.openingZones(f)[0].ranges[0][1];assert(!J.spaceCheck(plan,[f,{...operation,mountHeight:rangeTop}],{scanPassages:false}).some(i=>i.section==='sofa-bed:operation'));assert(J.spaceCheck(plan,[f,{...operation,mountHeight:rangeTop-.1,h:1}],{scanPassages:false}).some(i=>i.section==='sofa-bed:operation'));
 for(const rot of [37,90])for(const flip of [false,true]){const a=rot*Math.PI/180,x=flip?-200:200,z=800,block={...operation,cx:x*Math.cos(a)-z*Math.sin(a),cy:x*Math.sin(a)+z*Math.cos(a),rot},sofa={...f,rot,flip};assert(J.spaceCheck(plan,[sofa,block],{scanPassages:false}).some(i=>i.section==='sofa-bed:operation'&&!i.pending));assert(J.spaceCheck(plan,[sofa,{...block,type:'unknown-device',h:undefined,mountHeight:undefined}],{scanPassages:false}).some(i=>i.section==='sofa-bed:operation'&&i.pending));}
 const context=J.checkFingerprint({kind:'cabinetdrawer',id:f.id},plan,[f],600);assert.notDeepEqual(J.checkFingerprint({kind:'cabinetdrawer',id:f.id},plan,[open],600),context);assert.deepEqual(J.checkFingerprint({kind:'cabinetdrawer',id:f.id},plan,[{...f,color:'#fff',price:99}],600),context);
 for(const source of [f,open]){const packed=J.pack({planId:'p',current:{furniture:[source]},designs:[{name:'沙发床方案',work:{furniture:[source]}}],catalog:[]});assert.equal(packed.version,40);const restored=J.unpack(packed);assert.deepEqual(restored.current.furniture,[source]);assert.deepEqual(restored.designs[0].work.furniture,[source]);let work=restored.current;for(let i=0;i<3;i++){const next=J.validateWork(work);assert.deepEqual(next,work);work=next;}}
 console.log('PASS Y107H03 endpoints: 103 parts/6 rigs, 400/300mm tops, rigid nested flips, 590/1180mm slides, stationary frame, footprint, cache, distance/collision/contact/unknown/height, conservative operation zone and v40 roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
