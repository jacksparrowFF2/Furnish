const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),R=require('../src/core/product-rules.js'),G=require('../src/core/layout-geometry.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),Motion=require('../src/core/cabinet-motion.js');
const plan={id:'p',name:'厨房测试',rooms:[{id:'r',name:'厨房',mat:'tile',poly:[[0,0],[10000,0],[10000,10000],[0,10000]]}],walls:[],doors:[],wins:[],slides:[],beams:[],defaults:[],ceilingHeight:2800};
const config={version:1,shape:'straight',depth:600,counterDepth:630,baseHeight:820,thickness:20,autoAvoid:true,modules:[{run:0,width:600,role:'door'},{run:0,width:600,role:'drawer'}]};
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function host(extra={}){return K.configure({id:'k',name:'厨房',type:'counter',cx:3000,cy:3000,rot:0,color:'#eee',...extra},config);}
function manifold(f,{y=-230,d=140,h=500,mountHeight=0}={}){const [cx,cy]=K.world(f,0,y);return {id:'m',type:'heating_manifold',name:'分水器',w:950,d,h,cx,cy,rot:f.rot,flip:f.flip,color:'#c6a258',...R.initial({type:'heating_manifold',w:950}),mountHeight};}
assert.equal(R.height({type:'heating_manifold'}),600);
assert.equal(R.height({type:'heating_manifold',h:900}),900,'explicit existing height survives');
for(const rot of [0,37,90,270])for(const flip of [false,true])for(const basket of [false,true]){
 const f=host({rot,flip});if(basket)f.kitchen.modules[1].drawerStyle='dish-basket';
 const m=manifold(f),result=K.adaptObstacles(f,plan,[f,m]),fit=result.furniture;
 assert.deepEqual(result.notes,[]);assert.equal(fit.kitchen.obstacleFit.cuts.length,0,'500 mm assembly leaves stone intact');
 assert(!G.volumeOverlap(fit,m),'actual production solids do not collide');
 for(const row of K.cabinetLayout(fit)){
  near(row.depth,445);const part=K.moduleFurniture(fit,row);C.validate(part);assert.equal(part.cabinet.backPanel,false,'rear access stays open');
  const nominal=K.layout(f)[row.index];near(row.x+K.runNormal(row)[0]*row.depth/2,nominal.x+K.runNormal(row)[0]*600/2);near(row.y+K.runNormal(row)[1]*row.depth/2,nominal.y+K.runNormal(row)[1]*600/2);
 }
 for(const unfolded of K.elevationRuns(fit))assert(unfolded.furniture.kitchen.obstacleFit.depths.every(v=>v.rearService===true),'unfolded production preview retains access');
 let opened=K.toggle(fit,0,undefined,true);
 for(let drawer=0;drawer<K.drawerHeights(fit,fit.kitchen.modules[1]).length;drawer++)opened=K.toggle(opened,1,drawer,true);
 assert(!G.volumeOverlap(opened,m),'open door and every extended drawer clear assembly');
 assert(!P.spaceCheck(plan,[fit,m],{scanPassages:false}).some(v=>['overlap','cabinetdoor','cabinetdrawer','drawerfront'].includes(v.kind)),'project collision/opening checks agree');
 assert.deepEqual(K.adaptObstacles(fit,plan,[fit,m]).furniture,fit,'no repeated shrink');
 const restored=K.adaptObstacles(fit,plan,[fit]).furniture;assert.equal(restored.kitchen.obstacleFit,undefined);assert.equal(K.moduleFurniture(restored,K.cabinetLayout(restored)[0]).cabinet.backPanel,undefined,'moving away restores original back panel');
 const payload={planId:'p',current:{furniture:[fit,m]},designs:[{name:'分水器',work:{furniture:[fit,m]}}],catalog:[]},round=P.unpack(P.pack(payload));assert.deepEqual(round.current.furniture,[fit,m]);assert.deepEqual(round.designs[0].work.furniture,[fit,m]);
 const work={furniture:[fit,m]},rules=W.create({makeId:()=> 'id',colorFor:()=> '#fff',materials:{tile:{}}});rules.restore(work,plan);const saved=JSON.stringify(work);rules.restore(work,plan);assert.equal(JSON.stringify(work),saved);
}
const f=host(),m=manifold(f),fit=K.adaptObstacles(f,plan,[f,m]).furniture;
for(const shape of ['L','U'])for(const corner of ['left','right'])for(const flip of [false,true]){
 const kitchen=K.configure(host({rot:37,flip}),{...config,shape,corner,modules:[{run:0,width:1200,role:'door'},{run:1,width:1200,role:'drawer'},...(shape==='U'?[{run:2,width:1200,role:'door'}]:[])]});
 for(const module of K.layout(kitchen)){
  const angle=module.rot*Math.PI/180,[cx,cy]=K.world(kitchen,module.x+230*Math.sin(angle),module.y-230*Math.cos(angle));
  const device={...manifold(kitchen),cx,cy,rot:((kitchen.rot+(flip?-module.rot:module.rot))%360+360)%360};
  const result=K.adaptObstacles(kitchen,plan,[kitchen,device]).furniture;assert(result.kitchen.obstacleFit.depths.some(v=>v.index===module.index&&v.rearService));assert(!G.volumeOverlap(result,device),'L/U return runs use their own front/back datum');
 }
}
for(const depth of [150,149.999]){const obstacle=manifold(f,{y:-315+(600-depth)/2,d:600-depth}),result=K.adaptObstacles(f,plan,[f,obstacle]);if(depth===150)assert(result.furniture.kitchen.obstacleFit.depths.every(v=>v.depth===150));else{assert(result.notes.some(v=>v.includes('不足')));assert(!result.furniture.kitchen.obstacleFit);}}
assert(!K.adaptObstacles(f,plan,[f,manifold(f,{y:-385})]).furniture.kitchen.obstacleFit,'rear face contact');
assert(!K.adaptObstacles(f,plan,[f,manifold(f,{mountHeight:900})]).furniture.kitchen.obstacleFit,'height separation');
const off=K.configure(f,{...config,autoAvoid:false});assert(!K.adaptObstacles(off,plan,[off,m]).furniture.kitchen.obstacleFit,'existing opt-out preserved');
const device=K.configure(f,{...config,modules:[{run:0,width:600,role:'sink'},{run:0,width:600,role:'hob'}]});const unoccupied=K.adaptObstacles(device,plan,[device,m]);assert(unoccupied.furniture.kitchen.obstacleFit.depths.length,'unoccupied functional cabinets also retreat from rear service');
const sink=K.attach({id:'real-sink',type:'ksink',name:'水槽',cx:0,cy:0,w:500,d:450,rot:0,color:'#ddd'},device,0);assert(K.adaptObstacles(device,plan,[device,m,sink]).notes.length,'installed devices stay protected');
const front=K.adaptObstacles(f,plan,[f,manifold(f,{y:100})]);assert(front.notes.length,'front obstruction cannot shorten a drawer as a rear service');
const bad=structuredClone(fit);bad.kitchen.obstacleFit.depths[0].rearService='yes';assert.throws(()=>K.validate(bad));
const unmarked=structuredClone(fit);delete unmarked.kitchen.obstacleFit.depths[1].rearService;assert.throws(()=>K.validate(unmarked),'ordinary obstacles cannot silently shorten drawers');
const issue={kind:'overlap',id:'k',otherId:'m'},key=P.checkFingerprint(issue,plan,[fit,m],800),priced=structuredClone([fit,m]);priced[1].color='#000';priced[1].price=123;K.normalizeObstacles(priced,plan);assert.equal(P.checkFingerprint(issue,plan,priced,800),key);
const moved=structuredClone([fit,m]);moved[1].d=150;K.normalizeObstacles(moved,plan);assert.notEqual(P.checkFingerprint(issue,plan,moved,800),key);
near(K.cabinetLayout(moved[0])[0].depth,440);assert(!G.volumeOverlap(moved[0],moved[1]),'dimension edits invalidate both board and device solids');
const D=require('../src/core/design-core.js');let serial=0;const copied=D.pasteFurniture({items:[fit,m],cx:3000,cy:3000},{x:5000,y:5000},{x:0,y:0,w:10000,h:10000},()=> 'copy'+ ++serial).items;
K.normalizeObstacles(copied,plan);assert(copied.find(v=>v.kitchen).kitchen.obstacleFit.depths.every(v=>v.rearService),'copy together preserves the relative installation');
assert.equal(D.replaceFurniture(fit,{type:'chair',name:'椅',w:400,d:400}).kitchen,undefined,'replacement clears the complete derived fit');
// Production Three.js, including shelf bounds, back-panel absence and drawer travel.
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishKitchen:K,FurnishCabinet:C}));
 for(const file of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));o.position.set(x,y+h/2,z);return o;};
 const model=ctx.FurnishKitchenModel.build(T,fit,box);model.updateMatrixWorld(true);const shelves=[],motions=[];
 model.traverse(o=>{if(o.userData.kitchenShelf)shelves.push(o);if(o.userData.motion)motions.push(o);if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});
 assert.equal(shelves.length,1);for(const shelf of shelves){near(shelf.geometry.parameters.depth,.409);const bounds=new T.Box3().setFromObject(shelf);assert(bounds.min.z>=-.160001,'production shelf ends ahead of manifold');}
 assert(motions.some(v=>v.userData.motion.kind==='cabinetdoor'));for(const drawer of motions.filter(v=>v.userData.motion.kind==='cabinetdrawer'))near(drawer.userData.motion.travel,.445*.7);
 for(const part of K.cabinetLayout(fit)){const boards=Motion.boards(K.moduleFurniture(fit,part),{includeStatic:true});assert(!boards.some(v=>v.metadata.cabinetBay),'numeric recorder sees the same absent backing');}
 console.log('PASS manifold 500 mm, rear service envelope, shelves/back panels, doors/drawers/baskets, limits, rotation/mirror, opt-out, project and repeated real restoration, production geometry');
})().catch(e=>{console.error(e);process.exitCode=1;});
