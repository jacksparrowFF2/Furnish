const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),base={id:'shelves',name:'厨房',type:'counter',cx:5000,cy:5000,rot:0,color:'#eee'};
const cfg={version:1,shape:'U',corner:'right',depth:600,counterDepth:630,runDepths:[600,600,383.5],baseHeight:830,thickness:20,modules:[{run:0,width:902.34,role:'door'},{run:0,width:543.66,role:'door'},{run:1,width:800,role:'door'},{run:2,width:738,role:'door'}],endExtensions:[{run:0,length:550,depth:630,cabinetDepth:220}]};
const role=(f,index,role)=>K.configure(f,{...f.kitchen,modules:f.kitchen.modules.map((m,i)=>i===index?{...m,role}:m)});
for(const h of [400,830,1200])for(const r of Object.keys(K.roles)){
 const c=K.kitchenModuleConfig(C.preset('base').cabinet,{width:800,role:r},h);
 assert.deepEqual(c.columns[0].shelves,r==='door'?[Math.round((h-140)/2)]:[]);
 assert.equal(c.columns[0].drawers.length,r==='drawer'?3:0);
}
for(const shape of ['L','U'])for(const corner of ['left','right'])for(const rot of [0,37,90,180,270])for(const flip of [false,true]){
 const config={...cfg,shape,corner,modules:cfg.modules.filter(m=>shape==='U'||m.run<2)};if(shape!=='U')delete config.runDepths;
 const f=K.configure({...base,rot,flip},config),n=shape==='U'?2:1;
 assert.equal(K.cornerBoards(f).filter(b=>b.shelf).length,n);
 for(const b of K.cornerBoards(f).filter(b=>b.shelf)){
  const bounds=K.cornerLayout(f)[b.cornerIndex];near(b.bottom,463);near(b.top-b.bottom,18);
  assert(b.x-b.w/2>=bounds.x-bounds.w/2-1e-6&&b.x+b.w/2<=bounds.x+bounds.w/2+1e-6);
  assert(b.y-b.d/2>=bounds.y-bounds.d/2-1e-6&&b.y+b.d/2<=bounds.y+bounds.d/2+1e-6);
 }
 // A non-adjacent sink must not remove a corner's storage shelf.
 const far=role(f,corner==='right'?0:1,'sink');assert.equal(K.cornerBoards(far).filter(b=>b.shelf).length,n);
 for(const r of ['sink','hob']){
  const changed=role(f,2,r);assert.equal(K.cornerBoards(changed).filter(b=>b.shelf).length,n);
  assert.deepEqual(K.moduleFurniture(changed,K.cabinetLayout(changed)[2]).cabinet.columns[0].shelves,[]);
  const saved=P.unpack(P.pack({planId:'p',current:{furniture:[changed]},designs:[{name:'水槽柜',work:{furniture:[changed]}}],catalog:[]}));
  assert.deepEqual(saved.current.furniture,[changed]);assert.deepEqual(saved.designs[0].work.furniture,[changed]);
  let items=[changed];for(let i=0;i<3;i++)items=D.restoreFurniture(items,{makeId:()=> 'x',colorFor:()=> '#eee'});assert.deepEqual(items,[changed]);
  assert.equal(K.cornerBoards(role(changed,2,'door')).filter(b=>b.shelf).length,n);
 }
 // Shelf policy is temporary metadata in unfolded views, never a saved field.
 for(const row of K.elevationRuns(f))for(const blind of [row.blind].flat())assert.deepEqual(blind.shelves,[345]);
 for(const row of K.elevationRuns(role(f,2,'sink')))for(const blind of [row.blind].flat())assert.deepEqual(blind.shelves,[345]);
 assert(!JSON.stringify(f).includes('"shelves":'));
}
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three),ctx=vm.createContext({FurnishKitchen:K,FurnishCabinet:C});
 for(const file of ['cabinet-model','kitchen-model'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;},build=(f,options={})=>{const g=ctx.FurnishKitchenModel.build(T,f,box,options);g.updateMatrixWorld(true);return g;},collect=(g,tag)=>{const a=[];g.traverse(o=>{if(o.userData[tag])a.push(o);});return a;};
 for(const corner of ['left','right'])for(const flip of [false,true]){
  const f=K.configure({...base,flip},{...cfg,corner}),g=build(f),shelves=collect(g,'kitchenCornerShelf');assert.equal(shelves.length,2);
  const regular=collect(g,'kitchenShelf');assert.equal(regular.length,5);
  for(const [i,shelf] of shelves.entries()){
   const b=K.cornerLayout(f)[i],bounds=new T.Box3().setFromObject(shelf),existing=new T.Box3().setFromObject(regular[0]);near(bounds.min.y,existing.min.y);near(bounds.max.y,existing.max.y);
   const hit=new T.Raycaster(new T.Vector3(b.x/1000,.2,b.y/1000),new T.Vector3(0,1,0)).intersectObject(g,true)[0];assert(hit.object.userData.kitchenCornerShelf);near(hit.point.y,.463);
  }
  for(const r of ['sink','hob']){
   const sink=role(f,2,r),model=build(sink);assert.equal(collect(model,'kitchenCornerShelf').length,2);assert.equal(collect(model,'kitchenShelf').filter(o=>o.userData.kitchenShelf.module===2).length,0);
   assert.equal(collect(model,'kitchenShelf').filter(o=>o.userData.kitchenShelf.module!==2).length,4,'other modules and thin cabinet retain shelves');
   for(const row of K.elevationRuns(sink)){const preview=build(row.furniture,{previewBlind:row.blind,previewMirror:row.mirror});assert.equal(collect(preview,'kitchenCornerShelf').length,[row.blind].flat().length);}
  }
  for(const row of K.elevationRuns(f)){const preview=build(row.furniture,{previewBlind:row.blind,previewMirror:row.mirror});assert.equal(collect(preview,'kitchenCornerShelf').length,row.blind.length);}
  const fitted=structuredClone(f);fitted.kitchen.autoAvoid=true;fitted.kitchen.obstacleFit={depths:[{index:3,depth:364}],cuts:[],corners:[{index:1,width:150,depth:364}]};K.validate(fitted);
  const reduced=collect(build(fitted),'kitchenCornerShelf').find(o=>o.userData.kitchenCornerIndex===1),size=new T.Box3().setFromObject(reduced).getSize(new T.Vector3());near(size.x,.132);near(size.z,.346);
 }
 console.log('PASS actual L/U corner shelf boards, equal production shelf levels, left/right/rotations/mirrors, fitted depth/minimum width, role changes and independent sink/hob versus corner shelves, other/thin shelves, unfolded previews and legacy project restoration');
})().catch(e=>{console.error(e);process.exitCode=1;});
