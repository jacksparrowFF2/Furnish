'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const P=require('../src/core/product-rules.js'),C=require('../src/core/corner-bookcase-core.js'),M=require('../src/render/corner-bookcase-model.js'),A=require('../src/data/corner-bookcase-580-blender-asset.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const f={id:'corner',name:'转角书柜',type:'bookshelf_yeswood_y00y06058',w:580,d:580,h:1900,cx:0,cy:0,rot:0,color:'#c49b70'},near=(a,b)=>assert(Math.abs(a-b)<.005,`${a} != ${b}`);
assert.equal(A.parts.length,14);assert.equal(A.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../assets/models/corner-bookcase-580/v1/corner-bookcase-580-v1.glb'))).digest('hex'));
assert.equal(P.height({type:f.type}),1900);assert(P.modelError({...f,h:299}));assert.equal(P.modelError({...f,w:150,d:150,h:300}),null);
const boards=C.reference(f);for(let i=0;i<5;i++)near(boards[i+1].center[1]-10-(boards[i].center[1]+10),350);
assert.deepEqual(C.nominal(f),{type:f.type,w:580,d:580,h:1900});assert.equal(C.rules(f).profile,'580');assert.notEqual(A.sourceSha256,require('../src/data/corner-bookcase-blender-asset.js').sourceSha256);
const entries=require('../src/data/catalog.js').library.flatMap(g=>g.items).filter(i=>i[0]===f.type);assert.equal(entries.length,1);assert.deepEqual(entries[0].slice(2,4),[580,580]);
const round=J.unpack(JSON.parse(JSON.stringify(J.pack({planId:'corner',current:{furniture:[f]},designs:[{name:'转角',work:{furniture:[f]}}],catalog:[]}))));assert.deepEqual(round.current.furniture,[f]);assert.deepEqual(round.designs[0].work.furniture,[f]);let restored=[f];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#ccc'});assert.deepEqual(restored,[f]);
const point=(item,x,z)=>{x*=580/450;z*=580/450;x*=item.flip?-1:1;const a=item.rot*Math.PI/180;return {cx:x*Math.cos(a)-z*Math.sin(a),cy:x*Math.sin(a)+z*Math.cos(a)};};
for(const rot of [0,37,90])for(const flip of [false,true]){
 const item={...f,rot,flip},block=(x,z,y=100,h=100)=>({id:'probe',type:'block',name:'探针',w:60,d:60,h,mountHeight:y,rot,...point(item,x,z)});
 assert.equal(require('../src/core/cabinet-motion.js').solidParts(item).length,21);
 assert(!G.volumeOverlap(item,block(120,120)), 'open front notch');assert(!G.volumeOverlap(item,block(100,-80)), 'open cubby');
 assert(G.volumeOverlap(item,block(100,-215)), 'back board');assert(G.volumeOverlap(item,block(-150,215)), 'lower left end');assert(!G.volumeOverlap(item,block(215,-100)), 'lower right end open');
 assert(G.volumeOverlap(item,block(215,-100,500)), 'second right end');assert(G.volumeOverlap(item,block(100,-80,399.9,1)), 'shelf intersection');assert(!G.volumeOverlap(item,block(100,-80,420,50)), 'shelf exact top contact');
 assert(!G.volumeOverlap(item,block(0,0,1900,20)));assert(G.volumeOverlap(item,block(0,0,1899.9,20)));assert(G.volumeOverlap(item,{...block(0,0),type:'unknown-device',h:undefined,mountHeight:undefined}));
 const box=G.bbox(G.footprints(item).flat()),wall={id:'wall',type:'block',cx:box[2]+150,cy:0,w:100,d:2000,h:2100,rot:0};near(S.directional(item,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(item,wall));
 const snap={grid:1,scale:1,wallSnap:true,guides:false,rects:[[0,-1500,0,1500]],furniture:[]};near(S.move(item,-box[0]+6,0,snap).position[0],-box[0]);
 const enclosing={...wall,cx:0,w:2000,d:2000};assert(G.volumeOverlap(item,enclosing));assert(S.directional(item,{furniture:[enclosing]}).r.containedBoundary);
 const interior=S.cabinetInterior(block(100,-80),{furniture:[item]});assert.equal(interior.collisions.length,0);near(interior.bottom.distance,50);near(interior.top.distance,200);
}
(async()=>{const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const item of [f,D.resizeFurniture(f,{w:600,d:550,h:2100})]){const model=M.build(T,item),box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());near(size.x*1000,item.w);near(size.y*1000,item.h);near(size.z*1000,item.d);near(box.min.y,0);assert.equal(model.userData.furnishAsset,'corner-bookcase-y00y06058@1');assert.equal(model.children.length,14);for(const mesh of model.children){assert(Array.from(mesh.geometry.attributes.normal.array).every(Number.isFinite));if(mesh.name.startsWith('shelf-')){const b=new T.Box3().setFromObject(mesh);near((b.max.y-b.min.y)*1000,20);}}
 for(let i=0;i<5;i++){const ray=new T.Raycaster(new T.Vector3(.1,(225+i*370)/1000,.6),new T.Vector3(0,0,-1));const hits=ray.intersectObject(model,true);assert(hits.length);assert(hits[0].point.z<-.15,'right bays open to back');}}
 console.log('PASS 580 corner bookcase: Blender identity, production boards, resize thickness, open bays/notch, collision, six-way distance, transforms, threshold and project restoration');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
