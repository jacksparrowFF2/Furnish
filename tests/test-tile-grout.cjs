'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),G=require('../src/core/tile-grout-core.js'),P=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),M=require('../src/render/floor-finish-model.js'),V=require('../src/render/tile-grout-preview.js'),O=require('../src/render/scene-observation.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),{work,plan}=fixture({partition:true}),[a,b]=plan.rooms.map(r=>r.id);for(const id of [a,b])work.rooms[id]={mat:'tile800',use:'kitchen',name:id};
const original=copy(work),wall=G.edit(work,plan,a,'wall','#AAbBcC'),floor=G.edit(wall,plan,a,'floor','#000000'),other=G.edit(floor,plan,b,'wall','#eeeeee');
assert.deepEqual(work,original);assert.equal(G.color(other,a,'wall'),'#aabbcc');assert.equal(G.color(other,a,'floor'),'#000000');assert.equal(G.color(other,b,'floor'),undefined);assert(G.onlyChange(work,other));
const vm=require('node:vm'),ctx=vm.createContext({FurnishDesign:require('../src/core/design-core.js'),FurnishTileGrout:G,state:copy(other),undoStack:[],redoStack:[],save(){},snapshot(){},before:JSON.stringify(work)});vm.runInContext(require('./helpers/production-source.cjs').betweenFunctions(fs.readFileSync(require.resolve('../src/app.js'),'utf8'),'normalizeFurnitureEdit','mutate')+'\ncommit(before);',ctx);assert.equal(ctx.undoStack.length,1);assert.deepEqual(ctx.state.furniture,work.furniture,'appearance commit bypasses furniture normalization');
assert.equal(G.autoColor('#ffffff'),'#f3f3f3');assert.equal(G.autoColor('#000000'),'#000000');assert.equal(G.autoColor('#e8e2d8'),'#ddd8ce');assert.equal(G.autoColor('#fff'),G.autoColor('#ffffff'));
for(const c of ['red','#123','#gggggg','',null,17,{}])assert.throws(()=>G.edit(work,plan,a,'wall',c));assert.throws(()=>G.edit(work,plan,'missing','wall','#abcdef'));assert.throws(()=>G.validate({version:1,rooms:{[a]:{wall:'#112233',unknown:'#112233'}}}));
let reset=G.edit(other,plan,a,'floor',undefined);assert.equal(G.color(reset,a,'wall'),'#aabbcc');reset=G.edit(reset,plan,a,'wall',undefined);reset=G.edit(reset,plan,b,'wall',undefined);assert(!Object.hasOwn(reset,'tileGrout'));assert.deepEqual(reset,original);
assert.equal(P.formatVersion([other]),11);let restored=other;for(let i=0;i<4;i++){restored=P.unpack(P.pack({planId:plan.id,current:restored,designs:[{name:'颜色',work:restored}],catalog:[]})).current;assert.deepEqual(restored,other);}
const issue={kind:'front',id:'example'},beforeFP=P.checkFingerprint(issue,P.effectivePlan(plan,work),work.furniture,800),afterFP=P.checkFingerprint(issue,P.effectivePlan(plan,other),other.furniture,800);assert.equal(beforeFP,afterFP,'appearance must not invalidate spatial confirmation');
const id=plan.id,p=plan,ws={v:11,planId:id,work:{[id]:G.edit(other,plan,a,'wall','#112233')},designs:[],custom:[],customPlans:[plan.customDraft]},round=R.parse(JSON.parse(R.text(ws)));assert.deepEqual(round,ws);
const {materials}=require('../src/data/catalog.js'),W=require('../src/core/work-state.js').create({materials,colorFor:()=> '#d9d2c5',makeId:()=> 'unused'});let recovered=W.restore(copy(ws.work[id]),p);for(let i=0;i<4;i++){const again=W.restore(P.unpack(P.pack({planId:id,current:recovered,designs:[{name:'美缝',work:recovered}],catalog:[]})).current,p);assert.deepEqual(again,recovered,'production restore has no repeated drift');recovered=again;}assert.deepEqual(recovered.tileGrout,ws.work[id].tileGrout);
assert.deepEqual(P.copyProject({planId:id,current:recovered,designs:[{name:'颜色',work:recovered}],catalog:[]},'custom_grout_copy').current.tileGrout,recovered.tileGrout);const noColor=copy(recovered);delete noColor.tileGrout;assert(!P.effectivePlan(p,noColor).tileGrout);
const cache=require('../src/io/workspace-cache.js'),values={'huxing-design-v11':JSON.stringify(ws),'huxing-design-v10':JSON.stringify({...ws,v:10})},read=k=>values[k]||null;assert.equal(cache.load({read,key:'huxing-design-v11',firstPlan:p,restore:W.restore}).v,ws.v);assert.deepEqual(cache.candidates({read}).map(w=>w.v),[ws.v,10]);
const path=require('node:path'),tempBase=path.resolve(__dirname,'../verification.noindex/playwright'),temp=fs.mkdtempSync(path.join(tempBase,'tile-grout-repository-'));assert(temp.startsWith(tempBase+path.sep));try{const api=require('../scripts/repository-server.cjs').create(temp),saved=api.write(ws,null);assert.equal(api.read().revision,saved.revision);assert.deepEqual(api.read().workspace.work[id].tileGrout,ws.work[id].tileGrout);api.recover(ws);assert.deepEqual(api.recoveries()[0].workspace.work[id].tileGrout,ws.work[id].tileGrout);}finally{fs.rmSync(temp,{recursive:true,force:true});}
(async()=>{
 const T=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),prior=global.document;
 try{
  global.document={createElement:()=>({getContext:()=>({fillStyle:'',fillRect(){},drawImage(){}})})};
  const shared=M.material(T,{width:800,height:400,gap:2}),geo=new T.BoxGeometry(),group=new T.Group(),floorGroup=new T.Group(),m1=new T.Mesh(geo,shared),m2=new T.Mesh(geo,shared),otherRoom=new T.Mesh(geo,shared);m1.userData.wallTiling={roomId:a};m2.userData.wallTiling={roomId:a};otherRoom.userData.wallTiling={roomId:b};group.add(m1,m2,otherRoom);
  const preview=V.create(T),args={wallGroup:group,floorGroup,roomId:a,kind:'wall',color:'#123456'},geometry=m1.geometry;assert.equal(preview.update(args).surfaces,2);assert(preview.active);assert.equal(m1.material,m2.material);assert.equal(otherRoom.material,shared);assert.notEqual(m1.material,shared);assert.equal(m1.geometry,geometry);
  const shader={uniforms:{},fragmentShader:'#include <map_fragment>'};m1.material.onBeforeCompile(shader);assert.equal(shader.uniforms.furnishGroutColor.value.getHexString(),'123456');
  let disposed=0;m1.material.addEventListener('dispose',()=>disposed++);preview.clear();assert.equal(disposed,1);assert.equal(m1.material,shared);assert.equal(m2.material,shared);assert(!preview.active);
  assert.throws(()=>preview.update({...args,roomId:'missing'}));assert.equal(m1.material,shared);
  const obs=O.create(T),camera=new T.PerspectiveCamera();camera.position.set(0,2,4);camera.lookAt(0,1,0);camera.updateMatrixWorld();obs.update(camera,new T.Box3(new T.Vector3(-1,0,-1),new T.Vector3(1,2,1)),group);assert.equal(m1.material.onBeforeCompile,shared.onBeforeCompile,'observation cutaways retain the grout shader');preview.update(args);preview.clear();obs.clear();assert.equal(m1.material,shared);
  const oldMap=new T.CanvasTexture({width:512,height:512});oldMap.repeat.set(1.25,1.25);const oldMaterial=new T.MeshStandardMaterial({map:oldMap,roughness:.3});oldMaterial.userData.tileFinish={legacy:true,color:'#ebe6dd',groutPixels:3};const oldMesh=new T.Mesh(geo,oldMaterial);oldMesh.userData={floor:true,room:a};floorGroup.add(oldMesh);const oldUV=geo.attributes.uv.array.slice();preview.update({floorGroup,roomId:a,kind:'floor',color:'#000000'});assert.equal(oldMesh.material.userData.tileFinish.groutColor,'#000000');assert.deepEqual(oldMesh.material.map.repeat.toArray(),[1.25,1.25]);assert.equal(oldMesh.material.roughness,.3);assert.deepEqual(geo.attributes.uv.array,oldUV);preview.clear();assert.equal(oldMesh.material,oldMaterial);oldMap.dispose();oldMaterial.dispose();
  const atlas=[],patterns=[];
  global.document={createElement:()=>{
   const canvas={getContext:()=>({
    fillRect(...rect){(canvas.fills??=[]).push([this.fillStyle,...rect]);},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},
    putImageData(image){canvas.pixels=image.data;},drawImage(face,x,y,w,h){
     atlas.push([x,y,w,h]);patterns.push(Array.from({length:16},(_,i)=>face.pixels[i*7919*4%face.pixels.length]));
    }
   })};return canvas;
  }};
  const layout={width:800,height:400,gap:2},porcelain=M.material(T,layout,{floorKind:'tile800',groutColor:'#000000'});
  assert(porcelain.isMeshPhysicalMaterial);assert(porcelain.clearcoat>0);
  assert.deepEqual(porcelain.map.repeat.toArray(),[.5,.5]);
  assert.deepEqual(atlas,[[0,0],[256,0],[0,256],[256,256]].map(([x,y])=>[x,y,256*800/802,256*400/402]));
  assert.equal(new Set(patterns.map(p=>p.join(','))).size,4);assert(patterns.every(p=>new Set(p).size>1));
  const tiledMesh=new T.Mesh(geo,porcelain);tiledMesh.userData={floor:true,room:b};floorGroup.add(tiledMesh);
  preview.update({floorGroup,roomId:b,kind:'floor',color:'#123456'});
  assert.equal(tiledMesh.material.userData.tileFinish.floorKind,'tile800');assert.equal(tiledMesh.material.roughness,porcelain.roughness);assert.equal(tiledMesh.material.clearcoat,porcelain.clearcoat);
  const tileShader={uniforms:{},fragmentShader:'#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <lights_physical_fragment>'};tiledMesh.material.onBeforeCompile(tileShader);
  assert.deepEqual(tileShader.uniforms.furnishJoint.value.toArray(),[2/802,2/402]);assert.match(tileShader.fragmentShader,/tileUV=vMapUv\*2\.0/);
  assert.match(tileShader.fragmentShader,/material.clearcoat\*=1\.0-tileJoint/);
  preview.clear();assert.equal(tiledMesh.material,porcelain);porcelain.map.dispose();porcelain.dispose();
  for(const floorKind of ['tile800','tile600']){
   const draws=atlas.length,color='#dfd4c2',gloss=M.material(T,layout,{floorKind,sheen:'gloss',color,groutColor:'#000000'});
   assert.equal(atlas.length,draws,'Gloss uses uniform fills without generated grain');
   assert.deepEqual(gloss.map.image.fills,[['#000000',0,0,512,512],...[0,256].flatMap(y=>[0,256].map(x=>[color,x,y,256*800/802,256*400/402]))]);
   assert.notEqual(gloss.customProgramCacheKey(),porcelain.customProgramCacheKey());
   gloss.map.dispose();gloss.dispose();
  }
  const coats=['gloss','satin','matte'].map(sheen=>M.material(T,layout,{floorKind:'tile800',sheen}));
  assert(coats[0].roughness<coats[1].roughness&&coats[1].roughness<coats[2].roughness);
  assert(coats[0].clearcoat>coats[1].clearcoat&&coats[1].clearcoat>coats[2].clearcoat);
  const aperture={rect:[1200,-100,3600,100],sill:.5,head:2.5};
  const space={wx:x=>x/1000,wz:z=>z/1000,inside:require('../src/core/layout-geometry.js').inPoly};
  const windows=M.roomWindows([aperture],{poly:[[500,100],[3900,100],[3900,2500],[500,2500]]},space);
  assert.deepEqual(windows,[{center:[2.4,1.5,.1],divisions:3,shape:[1.2,1,0,1]}]);
  assert.deepEqual(M.roomWindows([aperture],{poly:[[500,900],[3900,900],[3900,2500],[500,2500]]},space),[]);
  const sky={value:new T.Vector4(1,.9,.8,1)};
  M.tileReflection(T,coats[0],windows,sky,'tileJoint');
  const decorated=coats[0].clone();decorated.onBeforeCompile=(...args)=>coats[0].onBeforeCompile(...args);
  M.copyTileReflection(T,coats[0],decorated,{alreadyWrapped:true});tiledMesh.material=decorated;
  preview.update({floorGroup,roomId:b,kind:'floor',color:'#654321'});
  assert.equal(tiledMesh.material.roughness,coats[0].roughness);
  const glazedShader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <lights_physical_fragment>\n#include <lights_fragment_end>'};
  tiledMesh.material.onBeforeCompile(glazedShader);
  assert.equal(glazedShader.uniforms.furnishTileSky,sky);
  assert.deepEqual(glazedShader.uniforms.furnishTileWindowCenters.value[0].toArray(),[...windows[0].center,windows[0].divisions]);
  assert.match(glazedShader.fragmentShader,/sheen\*\(0.11\+0.34\*edge\*edge\)\*\(1.0-tileJoint\)/);
  assert.match(glazedShader.fragmentShader,/roughnessFactor=mix\(roughnessFactor,0\.82,tileJoint\)/);
  assert.doesNotMatch(glazedShader.fragmentShader,/float tone=|diffuseColor\.rgb\*=/);
  assert.equal(tiledMesh.material.map.image.fills[0][0],'#654321');
  preview.clear();decorated.dispose();for(const coat of coats){coat.map.dispose();coat.dispose();}
  shared.map.dispose();shared.dispose();geo.dispose();
 }finally{if(prior===undefined)delete global.document;else global.document=prior;}
 console.log('PASS room wall/floor grout, auto/custom/black, invalid input, independent scopes, v11 recovery, unchanged spatial confirmations and production preview isolation/cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
