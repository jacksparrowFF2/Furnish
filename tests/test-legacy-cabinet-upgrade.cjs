const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../src/core/cabinet-core'),R=require('../src/core/product-rules'),M=require('../src/core/cabinet-motion'),S=require('../src/core/snapping'),G=require('../src/core/layout-geometry'),D=require('../src/core/design-core'),P=require('../src/core/project-core'),K=require('../src/core/kitchen-core');
const near=(a,b)=>assert(Math.abs(a-b)<.02,`${a} != ${b}`);
const counter={id:'old-counter',type:'counter',name:'旧组合橱柜',w:1200,d:600,cx:2000,cy:2000,rot:0,color:'#aaa'},vanity={id:'old-vanity',type:'vanity',name:'浴室柜',color:'#fff',w:800,d:500,cx:2000,cy:2000,rot:0};
const before=JSON.stringify([counter,vanity]);
for(const [host,x,z,h,bottom,expected,top,low]of [[counter,-295.5,0,379,118,{l:205,r:205,t:59.5,b:59.5},305,0],[vanity,0,-20,200,380,{l:300.5,r:300.5,t:162,b:162},182,32]]){
 for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
  const a=rot*Math.PI/180,xx=x*(flip?-1:1),f={id:'device',type:'water_purifier_mijia_1200g',w:163,d:host.type==='counter'?445:100,h,mountHeight:bottom,cx:2000+xx*Math.cos(a)-z*Math.sin(a),cy:2000+xx*Math.sin(a)+z*Math.cos(a),rot,flip},hostPose={...host,rot,flip},scene={furniture:[hostPose,f]},gaps=S.directional(f,{...scene,rotation:-rot}),interior=S.cabinetInterior(f,scene);
  for(const [dir,n]of Object.entries(expected)){near(gaps[dir].distance,n);assert(gaps[dir].cabinetInterior&&!gaps[dir].containedBoundary);}
  near(interior.top.distance,top);near(interior.bottom.distance,low);assert.equal(interior.collisions.length,0);assert(!G.volumeOverlap(hostPose,f));
  const penetrated={...f,mountHeight:bottom-low-.001};near(S.cabinetInterior(penetrated,{furniture:[hostPose,penetrated]}).bottom.distance,-.001);assert(G.volumeOverlap(hostPose,penetrated));
 }
}
near(R.vertical(counter).top,2180);assert(M.supportsSolids(counter));assert(M.supportsSolids(vanity));
for(const d of [50,76,77,100,500]){const f={...vanity,d,cx:0,cy:0};for(const part of M.solidParts(f))for(const p of part.p)assert(p[1]>=-d/2-.01&&p[1]<=d/2+.01,'shallow legacy vanity stays inside its nominal depth');}
assert.equal(C.legacyParts({...vanity,cabinet:C.preset('base').cabinet}),null);assert.equal(C.legacyParts(K.configure(counter,{version:1,shape:'straight',depth:600,baseHeight:820,thickness:20,modules:[{run:0,width:1200,role:'door'}]})),null);
let work={furniture:[counter,vanity]};for(let i=0;i<3;i++)work={...work,furniture:D.restoreFurniture(work.furniture,{makeId:()=> 'new',colorFor:()=> '#fff'})};assert.equal(JSON.stringify(work.furniture),before);
const payload=P.unpack(P.pack({planId:'legacy',current:work,designs:[{name:'旧方案',work}],catalog:[]}));assert.deepEqual(payload.current.furniture,[counter,vanity]);assert.deepEqual(payload.designs[0].work.furniture,[counter,vanity]);assert.equal(JSON.stringify([counter,vanity]),before);
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),Model=require('../src/render/cabinet-model');global.FurnishCabinet=C;global.FurnishKitchen=K;global.FurnishCabinetModel=Model;
 const Kitchen=require('../src/render/kitchen-model'),box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial());mesh.position.set(x,y+h/2,z);return mesh;};let checked=0;
 for(const source of [counter,vanity]){
  const f={...source,cx:0,cy:0},model=f.type==='counter'?Kitchen.legacy(T,f,box):Model.buildRaw(T,f,box);if(f.type==='vanity')model.position.y=.33;model.updateMatrixWorld(true);
  const solids=M.solidParts(f).filter(p=>p.actualBoard),meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);assert(!o.userData.cabinetPart&&!o.userData.motion,'legacy remains static without materializing a saved design');});
  for(const mesh of meshes){const bounds=new T.Box3().setFromObject(mesh),points=solids.flatMap(p=>p.vertices);for(const [axis,key]of [[0,'x'],[1,'y'],[2,'z']]){assert(bounds.min[key]*1000>=Math.min(...points.map(p=>p[axis]))-.02);assert(bounds.max[key]*1000<=Math.max(...points.map(p=>p[axis]))+.02);}checked++;}
  // Production ray intersections must match recorded solids through each cavity.
  for(const y of [380,500,700])for(const x of [-300,0,300]){const hits=new T.Raycaster(new T.Vector3(x/1000,y/1000,-2),new T.Vector3(0,0,1)).intersectObjects(meshes,true).map(h=>h.point.z*1000);const intervals=solids.filter(p=>p.vertical.bottom<y&&p.vertical.top>y&&Math.min(...p.p.map(q=>q[0]))<x&&Math.max(...p.p.map(q=>q[0]))>x).flatMap(p=>[Math.min(...p.p.map(q=>q[1])),Math.max(...p.p.map(q=>q[1]))]);for(const hit of hits)assert(intervals.some(z=>Math.abs(z-hit)<.02),'production cavity ray matches board faces');}
 }
 console.log(`PASS legacy upgrades: rotated/mirrored six-way clearances, contact/penetration, unchanged records, repeated restore, current/named roundtrip, ${checked} production meshes and cavity rays`);
})().catch(e=>{console.error(e);process.exitCode=1;});
