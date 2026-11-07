'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),J=require('../src/core/project-core.js'),M=require('../src/render/storage-supply-model.js'),R=require('../src/core/product-pose.js'),Repo=require('../src/core/repository-core.js'),Cache=require('../src/io/workspace-cache.js');
const near=(a,b)=>assert(Math.abs(a-b)<.025,`${a} != ${b}`),copy=v=>JSON.parse(JSON.stringify(v));
const base=type=>({id:'paper',type,name:'纸品',w:type.startsWith('toilet')?300:420,d:type.startsWith('toilet')?300:200,h:type.startsWith('toilet')?140:50,cx:1000,cy:1000,rot:0,mountHeight:68,color:'#46745a'});
(async()=>{
 const limits={maxCount:200,maxAxis:50},q={rows:2,columns:3};assert.deepEqual(P.arrayQuantityEdit(7,q,'layers',2,limits),{});assert.deepEqual(P.arrayQuantityEdit(7,q,'layers',3,limits),{count:18});assert.deepEqual(P.arrayQuantityEdit(7,q,'rows',4,limits),{rows:4});for(const [key,v]of [['layers',0],['layers',34],['rows',51],['count',201],['columns',1.5]])assert.throws(()=>P.arrayQuantityEdit(7,q,key,v,limits));
 const T=await import(JSON.parse(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const type of ['toilet_roll_heartlink_layer9','tissue_heartlink_layer6']){
  const old=base(type),snapshot=copy(old),rule=P.definition(old).paperArray;
  assert.equal(P.initial(old).paperArray,undefined);assert(!D.restoreFurniture([old],{makeId:()=> 'fresh',colorFor:()=> '#fff'})[0].paperArray);
  for(const orientation of rule.orientations)for(const pattern of rule.patterns){
   const f=P.editPaperArray(old,{count:13,columns:3,rows:2,gapX:7,gapZ:11,gapY:5,orientation,pattern}),l=P.paperArrayLayout(f);P.validate(f);
   assert.equal(l.layers,3);assert.equal(l.cells.length,13);assert.equal(l.cells.at(-1).layer,2);assert.equal(l.cells.at(-1).col,0);assert.equal(l.cells.at(-1).row,0);
   const g=M.build(T,f);g.updateMatrixWorld(true);const b=new T.Box3().setFromObject(g);near(b.min.y*1000,68);near((b.max.x-b.min.x)*1000,l.w);near((b.max.y-b.min.y)*1000,l.h);near((b.max.z-b.min.z)*1000,l.d);
   assert.equal(g.children.length,13);const ids=[];g.traverse(n=>{if(n.geometry)ids.push(n.userData.furnishStablePart);});assert.equal(new Set(ids).size,ids.length);
   const parts=G.bodyParts(f);assert.equal(parts.length,ids.length);near(Math.min(...parts.map(p=>p.vertical.bottom)),68);near(Math.max(...parts.map(p=>p.vertical.top)),68+l.h);
   // Every unit retains its own oriented dimensions and target location.
   for(let i=0;i<13;i++){const bb=new T.Box3().setFromObject(g.children[i]);for(const [axis,k]of [['x',0],['y',1],['z',2]]){near((bb.max[axis]-bb.min[axis])*1000,l.size[k]);near((bb.max[axis]+bb.min[axis])*500,l.cells[i].center[k]+(k===1?68:0));}}
   const packed=J.pack({planId:'paper',current:{furniture:[f]},designs:[{name:'阵列',work:{furniture:[f]}}],catalog:[{...f,price:0}]});assert.equal(packed.version,62);const unpacked=J.unpack(packed);assert.deepEqual(unpacked.current.furniture[0],f);assert.deepEqual(unpacked.designs[0].work.furniture[0],f);assert.deepEqual(unpacked.catalog[0].paperArray,f.paperArray);
   let restored=[f];for(let n=0;n<4;n++)restored=D.restoreFurniture(restored,{makeId:()=> 'fresh',colorFor:()=> '#fff'});assert.deepEqual(restored,[f]);
   const pasted=D.pasteFurniture({items:[f],cx:f.cx,cy:f.cy},{x:f.cx+500,y:f.cy+500},{x:-10000,y:-10000,w:50000,h:50000},()=> 'paper-copy').items[0];assert.deepEqual(pasted.paperArray,f.paperArray);
   const replaced=D.replaceFurniture(f,old,{anchor:'center'});assert.deepEqual(replaced.paperArray,f.paperArray);near(replaced.w,l.w);P.validate(replaced);
   const other=D.replaceFurniture(f,{...old,type:'wet_wipes_pack_170',w:170,d:110,h:70},{anchor:'center'});assert(!other.paperArray);P.validate(other);
   const turned=D.transformFurniture([f],{rotationAxis:'x',angle:30})[0];P.validate(turned);const pp=G.bodyParts(turned);near(P.vertical(turned).bottom,Math.min(...pp.map(p=>p.vertical.bottom)));near(P.vertical(turned).top,Math.max(...pp.map(p=>p.vertical.top)));
  }
  const activated=P.editPaperArray(old,{}),plain={...old,type:'block',w:100,d:100,h:100},fromLibrary=D.replaceFurniture(plain,activated,{anchor:'center'});assert.deepEqual(fromLibrary.paperArray,activated.paperArray);P.validate(fromLibrary);
  const oldBoxes=M.build(T,old).children.map(m=>{m.updateMatrixWorld(true);const b=new T.Box3().setFromObject(m);return [...b.min.toArray(),...b.max.toArray()];}),newGroup=M.build(T,activated);newGroup.updateMatrixWorld(true);const newBoxes=[];newGroup.traverse(m=>{if(m.geometry){const b=new T.Box3().setFromObject(m);newBoxes.push([...b.min.toArray(),...b.max.toArray()]);}});assert.equal(oldBoxes.length,newBoxes.length);for(let i=0;i<oldBoxes.length;i++)oldBoxes[i].forEach((v,k)=>near(v*1000,newBoxes[i][k]*1000));
  assert.deepEqual(old,snapshot);
  const f=P.editPaperArray(old,{count:3,columns:2,rows:2,gapX:100,gapZ:80}),full=P.editPaperArray(f,{count:4});assert.equal(f.w,full.w);assert.equal(f.d,full.d);assert.notEqual(G.bodyParts(f).length,G.bodyParts(full).length);
  const posed={...f,pose3D:[0,0,0,1]},posedFull={...full,pose3D:[0,0,0,1]};assert.notEqual(R.frame(posed).canonical.points.length,R.frame(posedFull).canonical.points.length);
  const plan=require('../src/data/plans.js')[0],fingerprint=x=>J.checkFingerprint({kind:'collision',id:x.id},plan,[x],800);assert.notEqual(fingerprint(f),fingerprint(full));assert.equal(fingerprint(f),fingerprint({...f,color:'#fff',price:99,purchaseStatus:'ordered'}));
  for(const rot of [0,37,90])for(const flip of [false,true]){
   const a={...f,rot,flip},box=G.bbox(G.footprints(a).flat()),wall={id:'wall',type:'block',cx:box[2]+150,cy:1000,w:100,d:4000,h:1000,rot:0};near(S.directional(a,{furniture:[wall]}).r.distance,100);assert(!G.volumeOverlap(a,wall));assert(G.volumeOverlap(a,{...wall,cx:1000,w:3000,d:3000}));assert(!G.volumeOverlap(a,{...wall,cx:1000,w:3000,d:3000,mountHeight:2000}));
  }
  const separated=P.editPaperArray(old,{count:2,columns:2,rows:1,gapX:100}),hole={id:'gap',type:'block',cx:1000,cy:1000,w:50,d:50,h:20,rot:0,mountHeight:80};assert(!G.volumeOverlap(separated,hole),'empty array gap is not a solid');assert(G.volumeOverlap(separated,{...hole,cx:1000-separated.w/2+separated.paperArray.unitW/2}));
  for(const patch of [{count:0},{count:201},{count:1.5},{columns:0},{rows:51},{gapX:-1},{gapZ:1001},{gapY:NaN},{orientation:'guess'},{pattern:'guess'},{unknown:1},{unitH:0},{unitW:20000,columns:50,count:50}])assert.throws(()=>P.editPaperArray(old,patch),JSON.stringify(patch));
  assert.throws(()=>P.validate({...f,paperArray:null}));assert.throws(()=>P.validate({...f,w:f.w+5}));assert.throws(()=>D.resizeFurniture(f,{w:f.w+20}));assert.throws(()=>P.validate({...f,type:'wet_wipes_pack_170'}));assert.throws(()=>P.validateField({...f,obj:{}},'paperArray',f.paperArray));
  const reset=P.clearPaperArray(f);assert(!reset.paperArray);assert.equal(reset.w,old.w/3*rule.columns);assert.equal(reset.mountHeight,68);P.validate(reset);
 }
 const dense=P.editPaperArray(base('toilet_roll_heartlink_layer9'),{count:200,columns:10,rows:10}),frame=R.frame(dense);near(frame.top-frame.bottom,280);const denseTilt=D.transformFurniture([dense],{rotationAxis:'x',angle:30})[0];assert(Number.isFinite(P.vertical(denseTilt).top),'maximum count tilt does not exceed argument stack');
 assert(Repo.workspaceVersions.includes(62));assert.equal(Cache.candidates({read:k=>k==='huxing-design-v61'?JSON.stringify({v:61,updatedAt:10}):null})[0].v,61);
 console.log('PASS paper arrays: real production units, all orientations/patterns, partial layers, rigid dimensions, identities, empty gaps, rotation/mirror/elevation, scoped validation, cache/pose/review invalidation, copy/replacement, v62 current/named/catalog and repeated restore');
})().catch(e=>{console.error(e);process.exitCode=1;});
