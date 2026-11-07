'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),vm=require('node:vm');
const C=require('../src/core/cabinet-core.js'),Model=require('../src/render/cabinet-model.js'),M=require('../src/core/cabinet-motion.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const near=(a,b,label='dimension')=>assert(Math.abs(a-b)<.001,`${label}: ${a} != ${b}`);
let baseline;
if(process.env.FURNISH_CABINET_TOPOLOGY_BASELINE){const filename=require.resolve('../src/core/cabinet-core.js'),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));m._compile(fs.readFileSync(process.env.FURNISH_CABINET_TOPOLOGY_BASELINE,'utf8'),filename);baseline=m.exports;}
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 let cases=0,audits=0;
 for(const n of [1,2,3,4,5,6])for(const thickness of [12,18,30])for(const panel of [0,18])for(let mask=0;mask<2**(n-1);mask++){
  let f={...C.preset('wardrobe'),id:'assembly',type:'wardrobe',w:n*500+2*panel,cx:2500,cy:3000,rot:37,flip:true,mountHeight:120};
  f.cabinet.columns=Array.from({length:n},()=>({door:'left',doorOpen:false,shelves:[500,1200],drawers:[]}));Object.assign(f.cabinet,{thickness,boxConstruction:'independent',endPanels:{left:panel,right:panel},boxJoints:Array.from({length:n-1},(_,i)=>mask&(1<<i)?'shared':'separate')});
  C.validate(f);const saved=JSON.stringify(f),a=C.assemblyLayout(f),top=C.boxTopology(f.cabinet),expected=n-f.cabinet.boxJoints.filter(j=>j==='shared').length;
  assert.equal(a.boxes.length,expected);assert.equal(a.compartments.length,n);near(a.structureWidth,(n+expected)*thickness+2*panel);
  near(a.boxes.reduce((s,b)=>s+b.width,0)+2*panel,f.w,'boxes close total');near(a.compartments.reduce((s,b)=>s+b.module.width,0)+2*panel,f.w,'compartments close total');
  for(const b of a.boxes){near(b.width,a.compartments.slice(b.start,b.end).reduce((s,p)=>s+p.clear.width,0)+(b.count+1)*thickness);for(let i=b.start;i<b.end;i++){const p=a.compartments[i];assert.equal(p.box,b.index);assert.equal(p.localIndex,i-b.start);assert.equal(p.startsBox,i===b.start);assert.equal(p.endsBox,i===b.end-1);near(p.module.width,p.clear.width+p.allowance);if(i)near(p.module.left,a.compartments[i-1].module.right);}}
  const g=Model.build(T,f,box);g.updateMatrixWorld(true);const sides=[],tops=[],tokens=[];g.traverse(o=>{if(o.userData.cabinetSide)sides.push(new T.Box3().setFromObject(o));if(o.userData.cabinetTop)tops.push(o);if(o.isMesh)tokens.push(o.userData.furnishPartToken);});assert.equal(sides.length,2*expected);assert.equal(tops.length,expected);assert.equal(new Set(tokens).size,tokens.length);
  for(const b of a.boxes){assert(sides.some(s=>Math.abs(s.min.x*1000-b.left)<.001));assert(sides.some(s=>Math.abs(s.max.x*1000-b.right)<.001));}
  assert.equal(M.boards(f,{includeStatic:true}).filter(b=>b.metadata.cabinetSide).length,2*expected);
  if(baseline){for(const key of ['widths','layout','moduleLayout','boxJoints','boxRanges','structureWidth'])assert.deepEqual(C[key](key.startsWith('box')||key==='structureWidth'?f.cabinet:f),baseline[key](key.startsWith('box')||key==='structureWidth'?f.cabinet:f),key+' baseline parity');audits++;}
  assert.equal(JSON.stringify(f),saved);cases++;
 }
 // Independent boxes retain their physical boundaries when their fronts are
 // re-paired, including the all-separate case missed by the old flag branch.
 let f=C.repartition({...C.preset('wardrobe'),id:'doors',type:'wardrobe',cx:1000,cy:1000,rot:0},3);f=C.setConstruction(f,'independent',{left:18,right:12});f=C.adjustModuleWidth(f,0,450);f=C.adjustModuleWidth(f,1,900);
 const prior=C.assemblyLayout(f),next=C.autoDoors(f),after=C.assemblyLayout(next);assert.equal(after.boxes.length,prior.boxes.length);after.boxes.forEach((b,i)=>{near(b.left,prior.boxes[i].left);near(b.width,prior.boxes[i].width);});assert.equal(next.cabinet.columns.length,3,'one front pair per physical box');
 if(baseline&&!baseline.assemblyLayout)assert.notDeepEqual(baseline.moduleWidths(baseline.autoDoors(f)),C.moduleWidths(next),'baseline reproduces cross-box re-pairing');
 const shared=C.setConstruction(f,'shared'),one=C.assemblyLayout(shared);assert.equal(one.boxes.length,1);assert.equal(C.boxParts(shared).length,1,'shared and independent boxes use the same projection');assert(C.boxParts(next).every(b=>b.furniture.cabinet.boxConstruction==='shared'));
 const grouped=C.setBoxJoints(next,['shared','separate']);for(const [op,index,args] of [['copy',0,{at:1}],['delete',1,{grow:false}],['move',0,{at:2}],['add',0,{at:1,width:250,grow:false}]]){const r=C.editModules(grouped,op,index,args),a=C.assemblyLayout(r.furniture);C.validate(r.furniture);assert.equal(a.compartments.length,r.furniture.cabinet.columns.length);for(const [old,newIndex]of r.remap)assert.deepEqual({...r.furniture.cabinet.columns[newIndex],width:0},{...grouped.cabinet.columns[old],width:0});}
 const round=P.unpack(P.pack({planId:'demo',current:{furniture:[grouped]},designs:[{name:'boxes',work:{furniture:[grouped]}}],catalog:[]}));assert.deepEqual(round.current.furniture[0],grouped);assert.deepEqual(round.designs[0].work.furniture[0],grouped);let restored=[grouped];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'id',colorFor:()=> '#fff'});assert.deepEqual(restored,[grouped]);
 assert.deepEqual(C.spatialConfig({...grouped,price:123,color:'#112233'}),C.spatialConfig(grouped));assert.notDeepEqual(C.spatialConfig(grouped),C.spatialConfig(next));
 let retained=0;
 if(baseline&&process.env.FURNISH_TEST_PROJECT&&process.env.FURNISH_CABINET_MODEL_BASELINE){
  const K=require('../src/core/kitchen-core.js'),ctx=vm.createContext({FurnishCabinet:baseline,FurnishProducts:require('../src/core/product-rules.js'),FurnishPartIdentity:require('../src/core/part-identity.js')});vm.runInContext(fs.readFileSync(process.env.FURNISH_CABINET_MODEL_BASELINE,'utf8'),ctx);
  const round=v=>Math.round(v*1e8)/1e8,signature=g=>{const rows=[];g.updateMatrixWorld(true);g.traverse(o=>{if(o.isMesh)rows.push([o.userData.furnishPartToken,Array.from(o.geometry.attributes.position.array,round),o.matrixWorld.elements.map(round)]);});return rows;},dispose=g=>g.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  const check=f=>{const before=JSON.stringify(f),current=Model.build(T,f,box,{blenderAssets:false}),old=ctx.FurnishCabinetModel.build(T,f,box,{blenderAssets:false});assert.deepEqual(signature(current),signature(old),'retained '+f.id+' production geometry and identities');assert.equal(JSON.stringify(f),before);dispose(current);dispose(old);retained++;};
  const walk=v=>{if(!v||typeof v!=='object')return;if(Array.isArray(v.furniture))for(const f of v.furniture){if(f.cabinet&&!f.kitchen)check(f);if(f.kitchen){for(const m of K.cabinetLayout(f).filter(m=>m.role!=='empty'))check(K.moduleFurniture(f,m));for(const part of K.laundryParts(f))if(part.furniture.cabinet)check(part.furniture);}}for(const value of Object.values(v))if(value&&typeof value==='object')walk(value);};
  walk(JSON.parse(fs.readFileSync(process.env.FURNISH_TEST_PROJECT,'utf8')));
 }
 console.log(`PASS cabinet composition: ${cases} topologies/production models, ${audits} baseline comparisons, ${retained} retained configurations; box-aware front pairing, editing, identities and project restore`);
})().catch(e=>{console.error(e);process.exitCode=1;});
