const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),R=require('../src/core/product-rules.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),D=require('../src/core/design-core.js'),Motion=require('../src/core/cabinet-motion.js'),Z=require('../src/core/zone-geometry.js');
const base={id:'tall',name:'高柜验收',type:'counter',cx:5000,cy:5000,rot:0,color:'#eeeeee'};
const config={version:1,shape:'L',depth:600,baseHeight:830,thickness:20,modules:[{run:0,width:580,role:'door'},{run:0,width:786,role:'hob'},{run:0,width:600,role:'door'},{run:1,width:1104,role:'door'}]};
const plan={id:'p',rooms:[{id:'r',name:'厨房',mat:'tile',poly:[[0,0],[15000,0],[15000,15000],[0,15000]]}],walls:[],doors:[],wins:[],slides:[],beams:[],defaults:[],ceilingHeight:2800};
const near=(a,b)=>assert(Math.abs(a-b)<1e-4,`${a} != ${b}`),old=K.configure(base,config);
const tall=K.configure(old,{...old.kitchen,modules:old.kitchen.modules.map((m,i)=>i?m:{...m,role:'tall'})});
assert.equal(tall.kitchen.modules[0].height,undefined,'reading default never materializes it');
assert.equal(K.moduleHeight(tall,tall.kitchen.modules[0]),2200);assert.equal(R.vertical(tall).top,2200);
assert.equal(tall.w,2566);assert.equal(tall.d,1704);assert.equal(K.overallHeight(old),850);
near(K.area(old)-K.area(tall),.58*.6);assert(K.footprints(tall).some(p=>Z.inside(K.world(tall,...[K.layout(tall)[0].x,K.layout(tall)[0].y]),p)),'tall cabinet stays in placement footprint');
for(const h of [1200,2200,3200])for(const shape of ['straight','L','U'])for(const corner of ['left','right'])for(const flip of [false,true]){
 const cfg=structuredClone(config);Object.assign(cfg,{shape,corner});if(shape==='straight')cfg.modules=cfg.modules.filter(m=>m.run===0);if(shape==='U')cfg.modules.push({run:2,width:900,role:'door'});cfg.modules[0]={...cfg.modules[0],role:'tall',height:h};
 const f=K.configure({...base,rot:37,flip},cfg),m=K.cabinetLayout(f)[0],part=K.moduleFurniture(f,m);C.validate(part);assert.equal(part.h,h);assert.equal(K.moduleFurniture(f,K.cabinetLayout(f)[1]).h,830);
 const boards=Motion.boards(part,{includeStatic:true}),top=boards.find(b=>b.metadata.cabinetTop);near(top.top,h);near(top.bottom,h-18);assert.equal(part.cabinet.columns[0].shelves[0],Math.round((h-140)/2));
 const solids=Motion.solidParts(f),upper=solids.filter(b=>b.vertical.top>1000);assert(upper.length);assert(upper.some(b=>Motion.section(b,{bottom:h-1,top:h+1}).length));assert(upper.every(b=>!Motion.section(b,{bottom:h,top:h+100}).length),'face contact at tall top is separated');
 const zones=K.openingZones(f,{passage:0}).filter(z=>z.column===0);assert(zones.length);near(Math.max(...zones.flatMap(z=>z.ranges.flat())),h-1);
 assert(K.bodyParts(f).some(b=>b.vertical.top===h));
 for(const row of K.elevationRuns(f)){const i=row.indices.indexOf(0);if(i>=0)assert.equal(K.moduleHeight(row.furniture,row.furniture.kitchen.modules[i]),h);}
 const packed=P.pack({planId:'p',current:{furniture:[f]},designs:[{name:'高柜',work:{furniture:[f]}}],catalog:[]});assert.equal(packed.version,30);const restored=P.unpack(packed);assert.deepEqual(restored.current.furniture,[f]);assert.deepEqual(restored.designs[0].work.furniture,[f]);
 const work={furniture:[f]},restore=W.create({makeId:()=> 'x',colorFor:()=> '#eeeeee',materials:{tile:{}}});for(let i=0;i<3;i++)restore.restore(work,plan);assert.deepEqual(work.furniture,[f]);
}
for(const height of [1199.99,3200.01,null,'2200',NaN,Infinity])assert.throws(()=>K.validate({...tall,kitchen:{...tall.kitchen,modules:tall.kitchen.modules.map((m,i)=>i?m:{...m,height})}}),/高柜/);
const shortBase=K.configure(base,{...config,baseHeight:1200});assert.throws(()=>K.configure(shortBase,{...shortBase.kitchen,modules:shortBase.kitchen.modules.map((m,i)=>i?m:{...m,role:'tall',height:1200})}),/高于台面/);
const changed=K.configure(tall,{...tall.kitchen,modules:tall.kitchen.modules.map((m,i)=>i?m:{...m,height:2400,shelves:[500,1000,1500]})});assert.equal(K.moduleShelfClearances(changed,0,2).upper.height,2400-100-36-1500-18);
assert.equal(K.editModuleShelfClearance(changed,0,1,'upper',400).kitchen.modules[0].shelves.length,3);
const shrunk=K.configure(changed,{...changed.kitchen,modules:changed.kitchen.modules.map((m,i)=>i?m:{...m,role:'door'})});assert(shrunk.kitchen.modules[0].shelves.every(v=>v<694));assert.deepEqual(K.configure(shrunk,shrunk.kitchen),shrunk);
const cache=require('../src/io/workspace-cache.js'),repo=require('../src/core/repository-core.js');assert.equal(cache.load({read:key=>key==='huxing-design-v30'?JSON.stringify({v:30}):null,key:'huxing-design-v30'}).v,30);assert(repo.workspaceVersions.includes(30));
const back=K.configure(changed,{...changed.kitchen,modules:changed.kitchen.modules.map((m,i)=>i?m:{...m,role:'door',shelves:undefined})});assert.equal(back.kitchen.modules[0].height,undefined);assert.equal(K.moduleFurniture(back,K.layout(back)[0]).h,830);near(K.area(back),K.area(old));
assert.equal(D.pasteFurniture({items:[changed],cx:5000,cy:5000},{x:7000,y:7000},{x:0,y:0,w:15000,h:15000},()=> 'copy').items[0].kitchen.modules[0].height,2400);assert.equal(D.replaceFurniture(changed,{type:'chair',w:500,d:500,name:'椅',price:0,color:'#eeeeee'}).kitchen,undefined);
assert.equal(K.editModules(changed,'copy',0).furniture.kitchen.modules[1].height,2400);assert.throws(()=>K.configure({...tall,locked:true},tall.kitchen),/解锁/);
const fingerprint=f=>P.checkFingerprint({kind:'cabinetdoor',id:'tall'},plan,[f],800);assert.notEqual(fingerprint(changed),fingerprint(tall));assert.equal(fingerprint({...changed,color:'#123456',price:88}),fingerprint(changed));
const split=K.configure(base,{...config,shape:'straight',edgeStyle:'square',dropHeight:20,modules:[{run:0,width:600,role:'door'},{run:0,width:580,role:'tall'},{run:0,width:800,role:'door'}]});assert.equal(K.topGeometry(split).rings.length,2);assert.equal(K.frontEdges(split).filter(e=>e.normal[1]>0).length,2);
const all=K.configure(base,{...config,shape:'straight',modules:[{run:0,width:580,role:'tall'}]});assert.equal(K.area(all),0);assert.equal(K.frontEdges(all).length,0);assert(K.footprints(all).length);
const wall=K.configure({...base,type:'kitchenwall',mountHeight:1400},{...config,shape:'straight',baseHeight:700,thickness:0,modules:[{run:0,width:600,role:'door'}]});assert(!Object.hasOwn(K.moduleRoles(wall),'tall'));assert.throws(()=>K.configure(wall,{...wall.kitchen,modules:[{run:0,width:600,role:'tall'}]}));
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=require('./helpers/layer-context.cjs').createContext({FurnishPartIdentity:require('../src/core/part-identity.js'),FurnishKitchen:K,FurnishCabinet:C});
 for(const name of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+name+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{assert(w>0&&h>0&&d>0);const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 for(const f of [tall,changed,split,all]){const g=ctx.FurnishKitchenModel.build(T,f,box);g.updateMatrixWorld(true);near(new T.Box3().setFromObject(g).max.y*1000,K.overallHeight(f));
  const m=K.layout(f).find(m=>m.role==='tall'),ray=new T.Raycaster(new T.Vector3(m.x/1000,4,m.y/1000),new T.Vector3(0,-1,0)),hits=ray.intersectObject(g,true);assert(hits.length);near(hits[0].point.y*1000,K.moduleHeight(f,m));assert(!hits.some(hit=>hit.object.userData.kitchenSlab),'no stone through tall body');
  const low=K.layout(f).find(m=>m.role==='door'||m.role==='hob');if(low){const ray=new T.Raycaster(new T.Vector3(low.x/1000,4,low.y/1000),new T.Vector3(0,-1,0));const hit=ray.intersectObject(g,true)[0];near(hit.point.y*1000,850);assert(hit.object.userData.kitchenSlab);}
 }
 console.log('PASS kitchen tall modules: heights/limits, real boards/stone/rays/opening, split/all-tall tops, shapes/mirrors/elevations, shelves, copy/replacement, v30 current/named project and repeated recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
