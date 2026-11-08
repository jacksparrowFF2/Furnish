'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),B=require('../src/core/cabinet-builder-core.js'),Model=require('../src/render/cabinet-model.js'),M=require('../src/core/cabinet-motion.js'),{cases,pose}=require('./helpers/cabinet-component-parity-fixtures.cjs');
(async()=>{
 const imports=JSON.parse(fs.readFileSync('index.html','utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),{box}=require('../src/render/model-primitives.js').create(T);
 global.FurnishServices=require('../src/core/service-core.js');require('../src/render/solid-cut.js');
 const round=n=>Math.round(n*1e7)/1e7;
 const rows=g=>{g.updateMatrixWorld(true);const out=[];g.traverse(o=>{if(!o.isMesh)return;out.push({key:o.userData.furnishPartToken,vertices:Array.from(o.geometry.attributes.position.array,round),matrix:o.matrixWorld.elements.map(round),color:o.material.color.getHexString(),opacity:o.material.opacity,transparent:o.material.transparent,depthWrite:o.material.depthWrite,cuts:o.userData.serviceCuts??[]});});return out;};
 let meshes=0,contours=0,cuts=0;
 for(const {kind,f:source}of cases)for(const phase of [0,.37,1]){
  const f=pose(source,phase),input=JSON.stringify(f),physical=M.boards(f,{includeStatic:true});
  const normal=Model.build(T,f,box),preview=Model.build(T,f,box,{doors:'normal',outlines:true});assert.deepEqual(rows(normal),rows(preview),'physical geometry/material/pose parity '+kind+' '+phase);
  normal.traverse(o=>{if(!o.isMesh)return;meshes++;const d=o.userData,accessory=d.cabinetPart&&!d.cabinetDoorSize&&!d.cabinetDrawerBoard&&!d.cabinetPart.lid,expected=!accessory&&d.cabinetSection!=='light',edges=o.children.filter(n=>n.isLineSegments);assert.equal(edges.length,expected?1:0,'consistent structural contour '+kind+' '+JSON.stringify(d.cabinetBuilder));if(expected){contours++;assert.equal(edges[0].material.opacity,.65);assert(edges[0].userData.cabinetOwnMaterial);assert.equal(edges[0].material.depthTest,true);}});
  const ghost=Model.build(T,f,box,{doors:'ghost',outlines:true});ghost.traverse(o=>{if(!o.isMesh||!o.userData.cabinetDoorSize)return;assert.equal(o.material.opacity,.15);assert(o.userData.cabinetIgnorePick);assert.equal(o.children.find(n=>n.isLineSegments).material.opacity,.15);});
  const plan={rooms:[],walls:[],doors:[],ceilingHeight:2800,markers:[{id:'pipe',kind:'drain',name:'管道',at:[0,-f.d/2+25],pipeDiameter:100}]};
  const cut=Model.build(T,f,box,{plan,furniture:[f]}),cutPreview=Model.build(T,f,box,{plan,furniture:[f],outlines:true,doors:'normal'});assert.deepEqual(rows(cut),rows(cutPreview),'contextual service cuts parity '+kind);cut.traverse(o=>{if(o.isMesh&&o.userData.serviceCuts?.length)cuts++;});
  assert.deepEqual(M.boards(f,{includeStatic:true}),physical);assert.equal(JSON.stringify(f),input);for(const g of [normal,preview,ghost,cut,cutPreview])g.traverse(o=>{o.geometry?.dispose();if(o.userData.cabinetOwnMaterial)o.material?.dispose();});
 }
 // The small box lid must be cut in its own closed pose, then translated as a
 // rigid solid. Using the whole assembly depth instead loses/offsets this hole.
 const source=cases.find(v=>v.kind==='mixed').f,row=B.layout(source).find(v=>v.box.d===300),plan={rooms:[],walls:[],doors:[],ceilingHeight:2800,markers:[{id:'lid-pipe',kind:'drain',at:[row.x,row.z+80],pipeDiameter:60}]};
 const lid=(f)=>{const g=Model.build(T,f,box,{plan,furniture:[f]});g.updateMatrixWorld(true);let mesh;g.traverse(o=>{if(o.isMesh&&o.userData.cabinetPart?.lid&&!o.userData.cabinetDrawerBoard)mesh=o;});return {g,mesh};},closed=lid(source),opened=lid(pose(source,1));assert(closed.mesh.userData.serviceCuts?.includes('lid-pipe'));assert.deepEqual(Array.from(opened.mesh.geometry.attributes.position.array),Array.from(closed.mesh.geometry.attributes.position.array),'cut lid local solid is pose independent with mixed depths');const a=new T.Box3().setFromObject(closed.mesh),b=new T.Box3().setFromObject(opened.mesh);assert(Math.abs((b.min.z-a.min.z)*1000-300*.7)<.001,'lid rigid travel follows its own depth');
 for(const [value,travel]of [[closed,0],[opened,210]]){const ray=new T.Raycaster(new T.Vector3(row.x/1000,3,(row.z+80+travel)/1000),new T.Vector3(0,-1,0));assert.equal(ray.intersectObject(value.mesh).length,0,'real lid opening stays aligned with pipe and then travels rigidly');ray.ray.origin.x+=.08;assert(ray.intersectObject(value.mesh).length>0,'nearby lid surface remains solid');}
 console.log(`PASS component parity: ${cases.length} fixtures, 3 poses, ${meshes} production meshes, ${contours} structural contours, ${cuts} cut meshes; materials, ghost mode, physical records and mixed-depth lid cuts`);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
