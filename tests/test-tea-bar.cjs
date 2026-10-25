const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),Model=require('../src/render/tea-bar-model.js'),SVG=require('../src/render/furniture-svg.js');
const entries=require('../src/data/catalog.js').library.flatMap(c=>c.items).filter(i=>i[0]==='tea_bar_mijia_pro');assert.equal(entries.length,1);const e=entries[0];assert.deepEqual([e[2],e[3],e[6]],[315,310,1155]);assert.equal(e[5],0);
const f={id:'tea-bar',type:e[0],name:e[1],w:e[2],d:e[3],h:e[6],color:e[4],cx:0,cy:0,rot:0};
assert.deepEqual(R.vertical(f),{bottom:0,top:1155,source:'recorded'});assert.equal(R.height({type:f.type}),1155);
const saved={...f,rot:37,flip:true,teaBarUpperOpen:true,teaBarLowerOpen:true};const round=P.unpack(P.pack({planId:'test',current:{furniture:[saved]},designs:[{id:'named',name:'茶吧机',work:{furniture:[saved]}}],catalog:[]}));assert.deepEqual(round.current.furniture,[saved]);assert.deepEqual(round.designs[0].work.furniture,[saved]);
let restored=[saved];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(restored,[saved]);
assert.equal(D.pasteFurniture({items:[saved],cx:0,cy:0},{x:600,y:600},{x:-1000,y:-1000,w:3000,h:3000},()=> 'copy').items[0].type,'tea_bar_mijia_pro');
const replaced=D.replaceFurniture({...f,type:'water_purifier_mijia_1200g',mountHeight:800},{...f,price:0});assert.equal(replaced.mountHeight,undefined);assert.equal(R.vertical(replaced).bottom,0);
assert(!/NaN|undefined/.test(SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},f)));
for(const key of ['teaBarUpperOpen','teaBarLowerOpen']){
 assert.equal(R.value(f,key),false);assert.equal(R.initial(f)[key],false);
 assert.throws(()=>R.validateField(f,key,'true'));assert.throws(()=>R.validateField({...f,type:'washer'},key,true));
 assert.throws(()=>P.validateWork({furniture:[{...f,[key]:'true'}]}));
 assert.equal(D.replaceFurniture(saved,{...f,type:'washer'} )[key],undefined);
 assert.equal(D.replaceFurniture(saved,{...f,price:0})[key],true);
}
const legacy=D.restoreFurniture([f],{makeId:()=> 'legacy',colorFor:()=> '#eee'})[0];assert(!Object.hasOwn(legacy,'teaBarUpperOpen'));assert(!Object.hasOwn(legacy,'teaBarLowerOpen'));
const plan={id:'tea-bar-plan',defaults:[],rooms:[{id:'room',name:'Room',mat:'wood',poly:[[0,0],[8000,0],[8000,8000],[0,8000]],ceilingHeight:4000}],walls:[],doors:[],ceilingHeight:4000};
const W=require('../src/core/work-state.js').create({makeId:()=> 'new',colorFor:()=> '#eee',materials:{wood:{}}});let work={furniture:[saved]};for(let i=0;i<3;i++)work=W.restore(work,plan);assert.deepEqual(work.furniture,[saved]);
const at=(f,x,y)=>{x*=f.flip?-1:1;const a=f.rot*Math.PI/180;return {cx:f.cx+x*Math.cos(a)-y*Math.sin(a),cy:f.cy+x*Math.sin(a)+y*Math.cos(a)};};
for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const unit={...f,cx:2500,cy:2500,rot,flip},obstacle=(bottom,h)=>({id:'obstacle',type:'washer',name:'Obstacle',...at(unit,0,300),w:20,d:20,rot,mountHeight:bottom,h});
 const issues=b=>P.spaceCheck(plan,[unit,b],{scanPassages:false}).filter(v=>v.id===unit.id&&v.kind==='cabinetdoor');
 assert.equal(issues(obstacle(809,20)).length,0,'touching upper top is allowed');
 assert(issues(obstacle(808.9,20)).some(v=>v.section==='upper'&&!v.pending));
 assert.equal(issues(obstacle(600,1)).length,0,'touching lower top and staying in separator gap is allowed');
 assert(issues(obstacle(599.9,1)).some(v=>v.section==='lower'&&!v.pending));
 assert(issues({...obstacle(0,20),type:'unknown',mountHeight:undefined,h:undefined}).some(v=>v.pending));
}
const svgClosed=SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'}),svgOpen=SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},saved);assert(!/NaN|undefined/.test(svgClosed));assert.notEqual(svgClosed,svgOpen);
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),{RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString().replace("from 'three'","from '"+imports.three+"'")).toString('base64'));
 const ctx=vm.createContext(Object.assign({FurnishDownlightModel:require("../src/render/downlight-model.js"),FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{THREE:T,RoundedBoxGeometry,mat:undefined,FurnishTeaBarModel:Model,FurnishProducts:R,FurnishCabinet:require('../src/core/cabinet-core.js'),FurnishDesign:D,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')}));vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const clickFurniture={...f},clicks={mutations:0,selection:null};const clickContext=vm.createContext(Object.assign({FurnishDownlightModel:require("../src/render/downlight-model.js"),FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{getF:()=>clickFurniture,FurnishProducts:R,furnitureLocked:f=>!!f.locked,mutate:fn=>{clicks.mutations++;fn();},window:{selectIds:ids=>clicks.selection=ids}}));
 vm.runInContext(html.slice(html.indexOf('function toggleTeaBarDoor(id,key){'),html.indexOf('function cycleFoldingTable(id){')),clickContext);
 clickContext.toggleTeaBarDoor(f.id,'teaBarUpperOpen');assert.equal(clickFurniture.teaBarUpperOpen,true);assert.equal(clickFurniture.teaBarLowerOpen,undefined);assert.equal(clicks.mutations,1);
 clickFurniture.locked=true;clickContext.toggleTeaBarDoor(f.id,'teaBarUpperOpen');assert.equal(clickFurniture.teaBarUpperOpen,true);assert.equal(clicks.mutations,1);assert.equal(clickContext.toggleTeaBarDoor(f.id,'bad-key'),false);
 const copied=D.pasteFurniture({items:[saved],cx:0,cy:0},{x:600,y:600},{x:-1000,y:-1000,w:3000,h:3000},()=> 'copy').items[0];assert(copied.teaBarUpperOpen&&copied.teaBarLowerOpen);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const dims of [[315,310,1155],[620,710,550],[50,50,50]])for(const rot of [0,37,90,180])for(const flip of [false,true]){
  ctx.f={...f,w:dims[0],d:dims[1],h:dims[2],rot,flip};const o=vm.runInContext('buildFurniture(f)',ctx),box=new T.Box3().setFromObject(o),size=box.getSize(new T.Vector3());near(box.min.y,0);near(size.y,dims[2]/1000);assert.equal(o.userData.fid,f.id);
  if(rot%90===0){const a=rot*Math.PI/180;near(size.x,(Math.abs(Math.cos(a))*dims[0]+Math.abs(Math.sin(a))*dims[1])/1000);near(size.z,(Math.abs(Math.sin(a))*dims[0]+Math.abs(Math.cos(a))*dims[1])/1000);}
  o.traverse(v=>{if(v.isMesh)for(const key of ['position','normal'])assert(v.geometry.attributes[key].array.every(Number.isFinite));});
 }
 const o=Model.build(T,f,RoundedBoxGeometry);o.updateMatrixWorld(true);
 const bottleBounds=new T.Box3();o.traverse(v=>{if(['water-bottle','bottle-rib','bottle-cap'].includes(v.userData.teaBarPart))bottleBounds.union(new T.Box3().setFromObject(v));});const bottleSize=bottleBounds.getSize(new T.Vector3());near(bottleSize.x,.270);near(bottleSize.z,.270);near(bottleSize.y,.500);near(bottleBounds.min.y,.036);near(bottleBounds.max.y,.536);
 let cap;o.traverse(v=>{if(v.userData.teaBarPart==='bottle-cap')cap=v;});const capSize=new T.Box3().setFromObject(cap).getSize(new T.Vector3());near(capSize.x,.055);assert.equal(R.definition(f).teaBar.bottle.neckHeight,80);
 assert(bottleBounds.min.x>=-.1415&&bottleBounds.max.x<=.1415&&bottleBounds.min.z>=-.137&&bottleBounds.max.z<=.139,'reference bottle fits physical cabinet clear width/depth');
 const front=new T.Raycaster(new T.Vector3(0,1.118,1),new T.Vector3(0,0,-1)).intersectObject(o,true);assert.equal(front[0].object.userData.teaBarPart,'display');
 const recess=new T.Raycaster(new T.Vector3(-.04,.95,1),new T.Vector3(0,0,-1)).intersectObject(o,true);assert.equal(recess[0].object.userData.teaBarPart,'rear-spine','serving bay must stay open');
 for(const dims of [[315,310,1155],[620,710,550]])for(const rot of [0,37,90])for(const flip of [false,true]){
  const unit={...saved,w:dims[0],d:dims[1],h:dims[2],cx:2500,cy:2500,rot,flip};ctx.f=unit;const model=vm.runInContext('buildFurniture(f)',ctx);model.updateMatrixWorld(true);
  for(const door of R.teaBarDoors(unit)){
   let hinge;model.traverse(o=>{if(o.userData.teaBarHinge===door.section)hinge=o;});assert(hinge);near(hinge.rotation.y,-100*Math.PI/180);
   const center=hinge.localToWorld(new T.Vector3(147.5,(R.definition(unit).teaBar.doors.find(d=>d.section===door.section).bottom+R.definition(unit).teaBar.doors.find(d=>d.section===door.section).top)/2,0));
   const x=door.poly.reduce((n,p)=>n+p[0],0)/4,y=door.poly.reduce((n,p)=>n+p[1],0)/4,world=at(unit,x,y);near(center.x,world.cx/1000);near(center.z,world.cy/1000);near(center.y,(door.bottom+door.top)/2000);
  }
  model.traverse(v=>{if(v.isMesh)for(const key of ['position','normal'])assert(v.geometry.attributes[key].array.every(Number.isFinite));if(v.userData.teaBarPart==='upper-door'||v.userData.teaBarPart==='lower-door'){
   const zone=R.teaBarOpeningZones(unit).find(d=>d.section===v.userData.teaBarPart.split('-')[0]),a=v.geometry.attributes.position;
   for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(v.matrixWorld).multiplyScalar(1000),signs=zone.poly.map((q,j)=>{const r=zone.poly[(j+1)%zone.poly.length];return (r[0]-q[0])*(p.z-q[1])-(r[1]-q[1])*(p.x-q[0]);});assert(signs.every(n=>n>=-.1)||signs.every(n=>n<=.1),'production door vertices must stay in shared opening hull');assert(p.y>=zone.ranges[0][0]-.001&&p.y<=zone.ranges[0][1]+.001);}
  }});
 }
 for(const open of [false,true]){
  const model=Model.build(T,{...f,teaBarUpperOpen:open,teaBarLowerOpen:open});model.updateMatrixWorld(true);
  for(const [y,part] of [[.2,open?'water-bottle':'lower-door'],[.71,open?'stored-cup':'upper-door']]){const hit=new T.Raycaster(new T.Vector3(0,y,1),new T.Vector3(0,0,-1)).intersectObject(model,true)[0];assert.equal(hit.object.userData.teaBarPart,part);}
 }
 console.log('PASS tea bar: catalog, defaults, project/named roundtrip, copy, replacement, repeated restore, SVG, production geometry, transforms, normals, independent door pivots, lock/mutate, cups/bottle raycasts and 3D opening boundaries');
})().catch(e=>{console.error(e);process.exitCode=1;});
