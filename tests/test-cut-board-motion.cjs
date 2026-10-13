const assert=require('node:assert/strict'),fs=require('fs'),C=require('../src/core/cabinet-core.js'),M=require('../src/core/cabinet-motion.js'),B=require('../src/core/board-motion-collision.js'),S=require('../src/core/service-core.js'),P=require('../src/core/project-core.js'),Z=require('../src/core/zone-geometry.js');
const cabinet=id=>({id:'cab',name:'柜',type:'cabinet',...C.preset(id),cx:0,cy:0,rot:0});
const plan=(at,diameter=100,height=2800)=>({rooms:[],walls:[],doors:[],ceilingHeight:height,markers:[{id:'pipe',name:'管道',kind:'drain',at,pipeDiameter:diameter,radius:50}]});
let f=cabinet('pantry500');f.cabinet.columns[0].handle='none';const door=M.boards(f).find(p=>p.motion.axis==='y'),hinge=[door.motion.pivot[0],door.motion.pivot[2]];
const findings=(f,p)=>P.spaceCheck(p,[f],{scanPassages:false}).filter(v=>v.markerIds?.includes('pipe')&&v.kind!=='cabinetpassage');
assert.equal(findings(f,plan(hinge)).length,0,'hinge-centered cut-out remains clear for the whole rotation');
assert.equal(findings(f,plan([0,300],2000)).length,0,'removed door boards produce no phantom sweep collision');
const at=[hinge[0]+400/Math.sqrt(2),hinge[1]+400/Math.sqrt(2)],p=plan(at,20),pipe=S.pipes(p)[0],parts=S.prepareOpening(f,[pipe]),zone=C.openingZones(f).find(z=>z.kind==='cabinetdoor');
const result=S.openingResult(f,zone,pipe,P.intersects,parts);assert(result.hit);assert(result.phase>.05&&result.phase<.95,'collision occurs between clear end poses');
for(const phase of [0,1])for(const part of parts){const a=-part.motion.angle*phase,co=Math.cos(a),si=Math.sin(a),pivot=part.motion.pivot,poly=part.poly.map(([x,z])=>[pivot[0]+(x-pivot[0])*co-(z-pivot[2])*si,pivot[2]+(x-pivot[0])*si+(z-pivot[2])*co]);assert(!B.planar({...part,poly,motion:{...part.motion,angle:0}},S.local(f,pipe)).hit);}
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){const angle=rot*Math.PI/180,x=hinge[0]*(flip?-1:1),world=[x*Math.cos(angle)-hinge[1]*Math.sin(angle),x*Math.sin(angle)+hinge[1]*Math.cos(angle)];assert.equal(findings({...f,rot,flip},plan(world)).length,0);}
const drawer=cabinet('sideboard-drawers');assert(findings(drawer,plan([0,0])).some(v=>v.kind==='cabinetdrawer'),'a cut hole moving across an internal pipe still collides');assert.equal(findings(drawer,plan([0,0],2000)).length,0,'removed drawer boards do not collide');
const lift=cabinet('sideboard-wall'),liftBoard=M.boards(lift).find(p=>p.motion.axis==='x'),pivot=liftBoard.motion.pivot,length=pivot[1]-liftBoard.bottom,lp={id:'pipe',name:'管',at:[(liftBoard.poly[0][0]+liftBoard.poly[1][0])/2,pivot[2]+length*.8/Math.sqrt(2)],radius:15,vertical:{bottom:0,top:pivot[1]-length*.8/Math.sqrt(2)+15}};
assert.equal(B.cylinderTest(B.vertices(liftBoard,0),lp),'clear');assert.equal(B.cylinderTest(B.vertices(liftBoard,1),lp),'clear');assert(B.lift(liftBoard,lp).hit,'lift-up board hits a short pipe between clear endpoints');
const oldKey=P.checkFingerprint({kind:'cabinetdoor',id:f.id},p,[f],800);assert(oldKey.includes('cut-board-motion-v1'));
(async()=>{
 const html=fs.readFileSync('index.html','utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three),Model=require('../src/render/cabinet-model.js');require('../src/render/solid-cut.js');global.FurnishServices=S;
 const box=(w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide}));mesh.position.set(x,y+h/2,z);return mesh;};
 const moving=g=>{const meshes=[];g.traverse(n=>{if(!n.isMesh||n.geometry.type==='SphereGeometry')return;for(let a=n.parent;a;a=a.parent)if(a.userData.motion){meshes.push(n);break;}});return meshes;};
 let checked=0;
 for(const [id]of C.templates){const f=cabinet(id),recorded=M.boards(f),model=Model.buildRaw(THREE,f,box);model.updateMatrixWorld(true);const meshes=moving(model);assert.equal(meshes.length,recorded.length,id+' moving mesh count');
  meshes.forEach((mesh,i)=>{const bounds=new THREE.Box3().setFromObject(mesh),r=recorded[i];for(const [actual,expected]of [[bounds.min.x*1000,Math.min(...r.poly.map(p=>p[0]))],[bounds.max.z*1000,Math.max(...r.poly.map(p=>p[1]))],[bounds.min.y*1000,r.bottom],[bounds.max.y*1000,r.top]])assert(Math.abs(actual-expected)<.01,id+' recorded geometry matches production');checked++;});
  for(const phase of [.137,.5,1]){
   model.traverse(n=>{const m=n.userData.motion;if(!m)return;if(m.axis==='z')n.position.z=m.closedZ+m.travel*phase;else n.rotation[m.axis]=m.angle*phase;});model.updateMatrixWorld(true);
   meshes.forEach((mesh,i)=>{const actual=new THREE.Box3().setFromObject(mesh),points=B.vertices(recorded[i],phase);for(const [axis,key]of [[0,'x'],[1,'y'],[2,'z']]){assert(Math.abs(actual.min[key]*1000-Math.min(...points.map(p=>p[axis])))<.01,id+' continuous minimum matches production');assert(Math.abs(actual.max[key]*1000-Math.max(...points.map(p=>p[axis])))<.01,id+' continuous maximum matches production');}});
  }
 }
 // Compare cut solids, not only dimensions: vertical rays into individual
 // production boards agree with the corresponding numeric remaining prisms.
 const testPlan=plan([hinge[0]+20,hinge[1]-10],160),model=Model.build(THREE,f,box,{plan:testPlan});model.updateMatrixWorld(true);const meshes=moving(model),remaining=S.prepareOpening(f,S.pipes(testPlan));let rays=0;
 M.boards(f).forEach((board,i)=>{for(const fraction of [.1,.4,.7,.9]){const x=Math.min(...board.poly.map(p=>p[0]))+(Math.max(...board.poly.map(p=>p[0]))-Math.min(...board.poly.map(p=>p[0])))*fraction,z=(board.poly[0][1]+board.poly[2][1])/2,expected=remaining.some(p=>p.boardIndex===i&&Z.inside([x,z],p.poly));const ray=new THREE.Raycaster(new THREE.Vector3(x/1000,3,z/1000),new THREE.Vector3(0,-1,0));assert.equal(ray.intersectObject(meshes[i]).length>0,expected);rays++;}});
 console.log('PASS continuous cut-board motion: no phantom notch/removed-board hits, intermediate-only door/lift hits, rotation/mirror, '+checked+' production board bounds and '+rays+' actual cut-solid rays');
})().catch(e=>{console.error(e);process.exitCode=1;});
