const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),Model=require('../src/render/cat-tree-model.js'),SVG=require('../src/render/furniture-svg.js');
const entries=require('../src/data/catalog.js').library.flatMap(c=>c.items).filter(i=>i[0]==='cat_tree');assert.equal(entries.length,1);const e=entries[0];assert.deepEqual([e[2],e[3],e[6]],[500,500,1430]);assert.equal(e[5],0);
const f={id:'cat-tree',type:e[0],name:e[1],w:e[2],d:e[3],h:e[6],color:e[4],cx:0,cy:0,rot:0};
assert.deepEqual(R.vertical(f),{bottom:0,top:1430,source:'recorded'});assert.equal(R.height({type:f.type}),1430);
const saved={...f,rot:37,flip:true};const round=P.unpack(P.pack({planId:'test',current:{furniture:[saved]},designs:[{id:'named',name:'猫爬架',work:{furniture:[saved]}}],catalog:[]}));assert.deepEqual(round.current.furniture,[saved]);assert.deepEqual(round.designs[0].work.furniture,[saved]);
let restored=[saved];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#eee'});assert.deepEqual(restored,[saved]);
assert.equal(D.pasteFurniture({items:[saved],cx:0,cy:0},{x:600,y:600},{x:-1000,y:-1000,w:3000,h:3000},()=> 'copy').items[0].type,'cat_tree');
const replaced=D.replaceFurniture({...f,type:'water_purifier_mijia_1200g',mountHeight:800},{...f,price:0});assert.equal(replaced.mountHeight,undefined);assert.equal(R.vertical(replaced).bottom,0);
assert(!/NaN|undefined/.test(SVG.render(f.type,f.w,f.d,f.color,{ink:'#333'},f)));
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),{RoundedBoxGeometry}=await import('data:text/javascript;base64,'+Buffer.from(Buffer.from(imports['three/addons/geometries/RoundedBoxGeometry.js'].split(',')[1],'base64').toString().replace("from 'three'","from '"+imports.three+"'")).toString('base64'));
 const ctx=vm.createContext(Object.assign({FurnishDownlightModel:require("../src/render/downlight-model.js"),FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{THREE:T,RoundedBoxGeometry,mat:undefined,FurnishCatTreeModel:Model,FurnishProducts:R,FurnishCabinet:require('../src/core/cabinet-core.js'),FurnishDesign:D,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5,FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishManifoldModel:require('../src/render/manifold-model.js'),FurnishBasicFurnitureModel:require('../src/render/basic-furniture-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')}));vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const near=(a,b)=>assert(Math.abs(a-b)<2e-6,`${a} versus ${b}`);
 for(const dims of [[500,500,1430],[620,710,1550],[50,50,50]])for(const rot of [0,37,90,180])for(const flip of [false,true]){
  ctx.f={...f,w:dims[0],d:dims[1],h:dims[2],rot,flip};const o=vm.runInContext('buildFurniture(f)',ctx),box=new T.Box3().setFromObject(o),size=box.getSize(new T.Vector3());near(box.min.y,0);near(size.y,dims[2]/1000);assert.equal(o.userData.fid,f.id);
  if(rot%90===0){const a=rot*Math.PI/180;near(size.x,(Math.abs(Math.cos(a))*dims[0]+Math.abs(Math.sin(a))*dims[1])/1000);near(size.z,(Math.abs(Math.sin(a))*dims[0]+Math.abs(Math.cos(a))*dims[1])/1000);}
  o.traverse(v=>{if(v.isMesh)for(const key of ['position','normal'])assert(v.geometry.attributes[key].array.every(Number.isFinite));});
 }
 const o=Model.build(T,f,RoundedBoxGeometry);o.updateMatrixWorld(true);
 const hits=new T.Raycaster(new T.Vector3(1,.15,-.04),new T.Vector3(-1,0,0)).intersectObject(o,true);assert(!hits.some(h=>h.object.userData.catTreePart==='house-door-wall'),'house doorway is open');
 const bowl=o.children[0].children.find(v=>v.userData.catTreePart==='space-bowl');assert(bowl.material.transparent);
 const openTop=new T.Raycaster(new T.Vector3(.065,1.2,-.130),new T.Vector3(0,-1,0)).intersectObject(o,true);assert(!openTop.some(h=>h.object.userData.catTreePart==='bowl-platform'),'bowl platform has a real opening');
 console.log('PASS cat tree: catalog, default height, project/named roundtrip, copy, replacement, repeated restore, SVG, production dimensions, transforms, normals, hollow door and bowl');
})().catch(e=>{console.error(e);process.exitCode=1;});
