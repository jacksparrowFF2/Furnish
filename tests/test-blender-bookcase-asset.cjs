'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const C=require('../src/core/cabinet-core.js'),D=require('../src/core/design-core.js'),M=require('../src/core/cabinet-motion.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),P=require('../src/core/project-core.js'),Model=require('../src/render/cabinet-model.js'),A=require('../src/data/y52y09-blender-asset.js');
const f={...C.preset('book-y52y09-low'),type:'bookshelf_yeswood_y52y09',id:'bookcase',cx:0,cy:0,rot:0};
assert.equal(A.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../assets/models/y52y09/y52y09-v1.glb'))).digest('hex'));
assert.equal(A.parts.length,12);assert.equal(new Set(A.parts.map(p=>p.identity)).size,12);
const near=(a,b,tol=.001)=>assert(Math.abs(a-b)<tol,`${a} != ${b}`);
const plan={id:'bookcase',walls:[],doors:[],beams:[],rooms:[{id:'room',poly:[[-5000,-5000],[5000,-5000],[5000,5000],[-5000,5000]]}],ceilingHeight:3000};
const world=(host,x,z)=>{x*=host.flip?-1:1;const a=host.rot*Math.PI/180;return [host.cx+x*Math.cos(a)-z*Math.sin(a),host.cy+x*Math.sin(a)+z*Math.cos(a)];};
for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const host={...f,rot,flip},bay=C.layout(host)[0],at=world(host,bay.center,0),device={id:'inside',type:'washer',w:100,d:100,h:100,mountHeight:100,cx:at[0],cy:at[1],rot,flip};
 assert(!G.volumeOverlap(host,device));const gaps=S.directional(device,{furniture:[host,device],rotation:-rot});assert(Object.values(gaps).some(v=>v?.cabinetInterior));
 assert(!G.volumeOverlap(host,{...device,mountHeight:266}));assert(G.volumeOverlap(host,{...device,mountHeight:266.001}));
 const shelf={...device,mountHeight:300};assert(G.volumeOverlap(host,shelf));
 const backAt=world(host,bay.center,-100);assert(G.volumeOverlap(host,{...device,cx:backAt[0],cy:backAt[1]}));
 const sideAt=world(host,-f.w/2+9,0);assert(G.volumeOverlap(host,{...device,cx:sideAt[0],cy:sideAt[1]}));
 assert(!G.volumeOverlap(host,{...device,mountHeight:750}));
 assert(G.volumeOverlap(host,{...device,mountHeight:749.9,cx:sideAt[0],cy:sideAt[1]}));
 const b=G.bbox(G.footprints(host).flat()),outside={id:'outside',type:'block',cx:b[2]+150,cy:0,w:100,d:3000,h:1000,rot:0};near(S.directional(host,{furniture:[outside]}).r.distance,100);
 const round=P.unpack(P.pack({planId:'bookcase',current:{furniture:[host,device]},designs:[{name:'Blender书柜',work:{furniture:[host,device]}}],catalog:[]}));assert.deepEqual(S.directional(round.current.furniture[1],{furniture:round.current.furniture,rotation:-rot}),gaps);
}
const moves={grid:1,scale:1,wallSnap:true,guides:false,rects:[[0,-5000,0,5000]],furniture:[]};
for(const rot of [0,37,90])for(const flip of [false,true]){const item={...f,rot,flip},half=-G.bbox(G.footprints(item).flat())[0];near(S.move(item,half+6,0,moves).position[0],half);}
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),E=require('../src/io/blender-export.js');
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 const edited=structuredClone(f);edited.cabinet.columns[0].shelves=[200,500];const thick=structuredClone(f);thick.cabinet.thickness=24;
 for(const item of [f,D.resizeFurniture(f,{w:1500,d:300,h:900}),{...f,color:'#123456'},edited,thick]){
  const model=Model.buildRaw(T,item,box),legacy=Model.buildRaw(T,item,box,{blenderAssets:false});assert.equal(model.userData.furnishAsset,'bookcase-y52y09@1');assert.equal(model.children.length,legacy.children.length);assert.equal(model.userData.furnishAssetBoards,model.children.length);
  const solids=M.solidParts(item),reference=M.boards(item,{includeStatic:true,blenderAssets:false}),current=M.boards(item,{includeStatic:true});
  assert.deepEqual(current.map(b=>[b.poly,b.bottom,b.top]),reference.map(b=>[b.poly,b.bottom,b.top]));
  model.updateMatrixWorld(true);legacy.updateMatrixWorld(true);
  for(let i=0;i<model.children.length;i++){
   const mesh=model.children[i],a=new T.Box3().setFromObject(mesh),b=new T.Box3().setFromObject(legacy.children[i]),points=solids.filter(p=>p.boardKey==='board:'+i).flatMap(p=>p.vertices);assert(points.length);assert(mesh.userData.furnishBlenderSource);assert.equal(mesh.userData.furnishPartToken,legacy.children[i].userData.furnishPartToken);
   for(const [axis,k]of ['x','y','z'].map((v,i)=>[v,i])){near(a.min[axis]*1000,b.min[axis]*1000);near(a.max[axis]*1000,b.max[axis]*1000);near(a.min[axis]*1000,Math.min(...points.map(p=>p[k])));near(a.max[axis]*1000,Math.max(...points.map(p=>p[k])));}
   assert(mesh.geometry.attributes.normal.array.every(Number.isFinite));assert.equal(mesh.material.color.getHexString(),item.color.slice(1));
  }
  const snap=g=>{g.userData.fid='bookcase';const result=E.snapshot(T,{groups:[g],camera:new T.PerspectiveCamera()});try{return result.scene.children.filter(n=>n.isMesh).map(n=>n.userData.furnishPartKey).sort();}finally{result.dispose();}};
  assert.deepEqual(snap(model),snap(legacy));
 }
 const model=Model.buildRaw(T,f,box);model.updateMatrixWorld(true);
 for(const bay of C.layout(f))for(const y of [.18,.56]){const hits=new T.Raycaster(new T.Vector3(bay.center/1000,y,.5),new T.Vector3(0,0,-1)).intersectObject(model,true);assert(hits[0].point.z<-.09,'each cubby remains open to its real backboard');}
 console.log('PASS Blender bookcase: source provenance, all 12 imported boards, six cubbies, fixed thickness and editable shelves, production/numeric envelopes, stable identities, snapping, interior distances, board penetration, rotations/mirrors, height separation and project roundtrip');
})().catch(e=>{console.error(e);process.exitCode=1;});
