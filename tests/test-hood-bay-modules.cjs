const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),S=require('../src/core/snapping.js'),R=require('../src/core/product-rules.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),empty={l:null,r:null,t:null,b:null};
const wall=K.configure({id:'wall',type:'kitchenwall',name:'烟机吊柜',cx:7043,cy:10005,rot:180,mountHeight:1660,color:'#e9e5de'},{version:1,shape:'straight',depth:350,baseHeight:700,thickness:0,modules:[{run:0,width:970,role:'door'},{run:0,width:1076,role:'door'}]});
const original=C.configureHoodBay(K.moduleFurniture(wall,K.cabinetLayout(wall)[0]));
assert.equal(original.cabinet.autoFrontWidth,970,'fixture reproduces the persisted automatic front width from a converted kitchen module');
wall.kitchen.modules[0]={run:0,width:970,role:'custom',structure:{w:970,d:350,h:700,cabinet:original.cabinet}};
const hood={id:'hood',name:'油烟机',type:'rangehood_fotile_jcd10ta',cx:7584,cy:9920,w:900,d:350,h:520,mountHeight:1315,rot:180,color:'#111214'};
const plan={id:'p',walls:[],wins:[],doors:[],slides:[],beams:[],rooms:[{id:'r',name:'厨房',poly:[[0,0],[20000,0],[20000,20000],[0,20000]]}],ceilingHeight:2800};
const cases=[];
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const f={...structuredClone(wall),rot,flip},before=JSON.stringify(f),part=K.hoodHosts(f)[0];
 assert.deepEqual([0,1,2].map(i=>C.frontLeafCount(part,i)),[1,0,1]);assert.equal(C.openingZones(part,{passage:0}).length,2);assert.equal(K.openingZones(f,{passage:0}).filter(z=>z.column===0).length,2);
 const centered=C.centerHoodInBay(f,hood),center=K.local(part,centered.cx,centered.cy),old=K.local(part,hood.cx,hood.cy);close(center[0],C.hoodBay(part).center);close(center[1],old[1]);assert.equal(centered.mountHeight,hood.mountHeight);
 const aligned=C.centerHoodInBay(f,hood,true);assert(C.hoodBayFit(f,aligned).fits);close(aligned.mountHeight,1315);assert.deepEqual(G.collisions([f,aligned]),[]);
 const parts=G.bodyParts(aligned);assert.equal(parts.length,27);close(Math.min(...parts.map(p=>p.vertical.bottom)),1315);close(Math.max(...parts.filter(p=>p.partRole!=='chimney-cover').map(p=>p.vertical.top)),1660);close(parts.find(p=>p.partRole==='chimney-cover').vertical.bottom,1660);close(parts.find(p=>p.partRole==='chimney-cover').vertical.top,1835);
 const at=K.world(aligned,400,0),probe={id:'probe',type:'washer',cx:at[0],cy:at[1],rot:aligned.rot,w:20,d:20,h:20,mountHeight:1700};assert(!G.volumeOverlap(aligned,probe),'upper chimney must not inherit the main body width');const lowerAt=K.world(aligned,400,-aligned.d*163/350);assert(G.volumeOverlap(aligned,{...probe,cx:lowerAt[0],cy:lowerAt[1],mountHeight:1400}),'actual rear housing still blocks other objects');
 const issues=P.spaceCheck(plan,[f,aligned],{scanPassages:false});assert(!issues.some(v=>v.kind==='overlap'));assert(!issues.some(v=>v.kind==='cabinetdoor'&&v.message.includes('油烟机')));
 assert.deepEqual(S.directional(aligned,{furniture:[f,aligned]}),empty);assert.deepEqual(S.directional(f,{furniture:[f,aligned]}),empty);
 for(const delta of [-.001,0,.001]){const changed=structuredClone(f);changed.kitchen.modules[0].structure.cabinet.hoodBayHeight=175+delta;const fit=C.hoodBayFit(changed,aligned);assert.equal(fit.fits,delta>=0);if(delta<0)assert(Object.values(S.directional(aligned,{furniture:[changed,aligned]})).some(Boolean));}
 const invalid={...aligned,mountHeight:aligned.mountHeight+.01};assert(!C.hoodBayFit(f,invalid).fits);assert(Object.values(S.directional(invalid,{furniture:[f,invalid]})).some(Boolean));
 assert.equal(JSON.stringify(f),before,'reading/building/alignment does not rewrite recorded structures');
 const payload={planId:'p',current:{furniture:[f,aligned]},designs:[{name:'嵌合',work:{furniture:[f,aligned]}}],catalog:[]},saved=P.unpack(P.pack(payload));assert.deepEqual(saved,payload);
 let list=saved.current.furniture;for(let i=0;i<3;i++)list=D.restoreFurniture(list,{makeId:()=> 'new',colorFor:()=> '#ddd'});assert.deepEqual(list,[f,aligned]);assert(C.hoodBayFit(list[0],list[1]).fits);
 cases.push({f,aligned});
}
(async()=>{
 const map=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(map.three),ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js"),FurnishHoodMotion:require("../src/core/hood-motion-core.js"),FurnishHoodBlenderAsset:require("../src/data/hood-blender-asset.js")},{FurnishKitchen:K,FurnishCabinet:C,FurnishProducts:R}));for(const name of ['cabinet-model','kitchen-model','hood-asset-model','fotile-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+name+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{assert(w>0&&h>0&&d>0);const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));o.position.set(x,y+h/2,z);return o;};
 for(const {f,aligned} of cases){
  const model=ctx.FurnishKitchenModel.build(T,f,box),module=model.children.find(o=>o.userData.kitchenModule===0),leaves=[];module.traverse(o=>{if(o.userData.motion?.kind==='cabinetdoor')leaves.push(o);});assert.equal(leaves.length,2);assert.deepEqual(leaves.map(o=>o.userData.motion.column),[0,2]);close(leaves[0].position.x,-.485);close(leaves[1].position.x,.485);
  for(const leaf of leaves){const face=leaf.children.find(o=>o.isMesh&&o.geometry.parameters?.depth===.018);close(face.geometry.parameters.width,.483);}
  model.position.set(f.cx/1000,f.mountHeight/1000,f.cy/1000);model.rotation.y=-f.rot*Math.PI/180;if(f.flip)model.scale.x=-1;model.updateMatrixWorld(true);
  const appliance=ctx.FurnishFotileModel.build(T,aligned);appliance.position.set(aligned.cx/1000,0,aligned.cy/1000);appliance.rotation.y=-aligned.rot*Math.PI/180;if(aligned.flip)appliance.scale.x=-1;appliance.updateMatrixWorld(true);let cover;appliance.traverse(o=>{if(o.userData.fotilePart==='chimney-cover')cover=new T.Box3().setFromObject(o);});assert(cover);
  // Compare production parts in cabinet-local coordinates, avoiding rotated AABB false positives.
  const part=K.hoodHosts(f)[0],raw=ctx.FurnishCabinetModel.buildRaw(T,{...part,cx:0,cy:0,rot:0,flip:false},box),localHood=ctx.FurnishFotileModel.build(T,{...aligned,cx:0,cy:0,rot:0,flip:false});raw.position.y=f.mountHeight/1000;raw.updateMatrixWorld(true);localHood.updateMatrixWorld(true);let localCover;localHood.traverse(o=>{if(o.userData.fotilePart==='chimney-cover')localCover=new T.Box3().setFromObject(o);});raw.traverse(o=>{if(!o.isMesh)return;const overlap=new T.Box3().setFromObject(o).intersect(localCover).getSize(new T.Vector3());assert(overlap.x<1e-6||overlap.y<1e-6||overlap.z<1e-6,'real boards must leave the chimney cavity empty');});
  const opened=K.toggle(K.toggle(f,0,undefined,true),1,undefined,false),openModel=ctx.FurnishKitchenModel.build(T,opened,box),motions=[];openModel.children.find(o=>o.userData.kitchenModule===0).traverse(o=>{if(o.userData.motion?.kind==='cabinetdoor')motions.push(o);});assert.equal(motions.length,2);close(motions[0].rotation.y,-Math.PI/2);close(motions[1].rotation.y,Math.PI/2);
 }
 console.log('PASS converted modular hood cabinets: two actual outer-hinged fronts, cavities and swept zones, horizontal/flush placement, known fit vs invalid contact thresholds, transforms, project/restore and production boards');
})().catch(e=>{console.error(e);process.exitCode=1;});
