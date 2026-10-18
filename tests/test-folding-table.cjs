const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/layout-geometry.js'),Model=require('../src/render/folding-table-model.js'),SVG=require('../src/render/furniture-svg.js'),C=require('../src/core/cabinet-core.js');
const entries=require('../src/data/catalog.js').library.flatMap(c=>c.items).filter(i=>R.family({type:i[0]},'folding-table'));
assert.equal(entries.length,3);
const near=(a,b,t=2e-4)=>assert(Math.abs(a-b)<t,`${a} versus ${b}`),base=e=>({id:'fold',type:e[0],name:e[1],w:e[2],d:e[3],h:e[6],cx:100,cy:200,rot:0,color:e[4],...R.initial({type:e[0]})});
for(const e of entries){
 const f=base(e),s=R.definition(f).folding;assert.equal(e[5],0);assert.equal(f.foldingTablePose,'round');assert.equal(R.height(f),760);assert.equal(f.sourceUrl,'https://item.jd.com/10195288580856.html');
 for(const rot of [0,37,90,180])for(const flip of [false,true]){
  const original={...f,rot,flip},single=R.editFoldingTablePose(original,'single'),closed=R.editFoldingTablePose(single,'capsule'),round=R.editFoldingTablePose(closed,'round');
  near(single.d,s.singleDepth);near(closed.d,s.closedDepth);near(round.d,s.diameter);near(round.cx,original.cx);near(round.cy,original.cy);
  const center=x=>{const geom=R.foldingTableGeometry(x),a=rot*Math.PI/180;return [x.cx-Math.sin(a)*geom.offset,x.cy+Math.cos(a)*geom.offset];};
  for(const item of [single,closed,round]){center(item).forEach((v,i)=>near(v,center(original)[i]));assert.deepEqual(original,{...f,rot,flip});}
 }
 const folded=R.editFoldingTablePose(f,'capsule');
 assert.equal(D.pasteFurniture({items:[folded],cx:100,cy:200},{x:500,y:500},{x:-1000,y:-1000,w:5000,h:5000},()=> 'copy').items[0].foldingTablePose,'capsule');
 const copy=P.unpack(P.pack({planId:'p',current:{furniture:[folded]},designs:[{id:'saved',name:'fold',work:{furniture:[folded]}}],catalog:[]}));assert.deepEqual(copy.current.furniture,[folded]);assert.deepEqual(copy.designs[0].work.furniture,[folded]);
 let restored=[folded];for(let i=0;i<3;i++)restored=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#fff'});assert.deepEqual(restored,[folded]);
 const missing={...f};delete missing.foldingTablePose;assert.deepEqual(D.restoreFurniture([missing],{makeId:()=> 'new',colorFor:()=> '#fff'})[0],missing);assert.equal(R.value(missing,'foldingTablePose'),'round');
 const same=D.replaceFurniture(folded,{...f,price:0});assert.equal(same.foldingTablePose,'capsule');near(same.d,s.closedDepth);
 const generic=D.replaceFurniture(folded,{type:'table',name:'餐桌',w:1000,d:800,h:750,color:'#eee',price:0});assert.equal(generic.foldingTablePose,undefined);
 const fromGeneric=D.replaceFurniture(generic,{...f,price:0});assert.equal(fromGeneric.foldingTablePose,'round');
 assert.throws(()=>R.editFoldingTablePose({...f,locked:true},'capsule'));
 let cycled=f;for(const pose of ['single','capsule','round']){cycled=R.editFoldingTablePose(cycled);assert.equal(cycled.foldingTablePose,pose);}near(cycled.cx,f.cx);near(cycled.cy,f.cy);near(cycled.d,f.d);
 for(const pose of ['',null,true,{},'open'])assert.throws(()=>P.validateWork({furniture:[{...f,foldingTablePose:pose}]}));
 for(const pose of ['round','single','capsule']){const item=R.editFoldingTablePose(f,pose),svg=SVG.render(item.type,item.w,item.d,item.color,{ink:'#333'},item);assert(svg.includes(`data-folding-table="${pose}"`));assert(!/NaN|undefined/.test(svg));const points=R.foldingTableOutline(item);near(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])),item.w);near(Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1])),item.d);}
 assert(G.tuckedSeatUnder({type:'chair'},f));assert.equal(G.collisions([f,{...f,id:'chair',type:'chair',w:400,d:400}]).length,0);
 const plan={id:'p',bounds:{x:-3000,y:-3000,w:8000,h:8000},rooms:[],walls:[],wins:[],doors:[],beams:[],furniture:[f]};
 const issue={kind:'overlap',id:f.id,otherId:'other'},before=P.checkFingerprint(issue,plan,[f],800);assert.notEqual(P.checkFingerprint(issue,plan,[{...f,foldingTablePose:'capsule'}],800),before);assert.equal(P.checkFingerprint(issue,plan,[{...f,color:'#111',price:99}],800),before);
}
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),T=await import(JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three);
 for(const e of entries)for(const dims of [[e[2],e[3],760],[900,1500,620],[50,100,10]])for(const pose of ['round','single','capsule']){
  const f=R.editFoldingTablePose({...base(e),w:dims[0],d:dims[1],h:dims[2]},pose),o=Model.build(T,f),b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3());near(size.x*1000,f.w);near(size.z*1000,f.d);near(size.y*1000,f.h);near(b.min.y,0);near((b.min.z+b.max.z)*500,0);
  let legs=0,folds=0;const stored=[],aprons=[];o.traverse(v=>{if(v.userData.foldingTablePart==='leg')legs++;if(v.userData.folded){folds++;stored.push(new T.Box3().setFromObject(v));}if(v.userData.foldingTablePart==='front-apron'||v.userData.foldingTablePart==='side-apron')aprons.push(new T.Box3().setFromObject(v));if(v.isMesh)for(const key of ['position','normal'])assert(v.geometry.attributes[key].array.every(Number.isFinite));});assert.equal(legs,4);assert.equal(folds,pose==='capsule'?2:pose==='single'?1:0);for(const leaf of stored)for(const apron of aprons)assert(leaf.min.y>=apron.max.y-2e-6,'stored wing clears actual apron');
 }
 const f={...base(entries[0]),w:900,d:900,rot:37,flip:true},ctx=vm.createContext({THREE:T,FurnishFoldingTableModel:Model,FurnishCabinet:C,FurnishDesign:D,FurnishProducts:R,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,rng:()=>()=>.5});
 Object.assign(ctx,{RoundedBoxGeometry:ctx.RoundedBoxGeometry,mat:ctx.mat,FurnishSlidingOpeningModel:require('../src/render/sliding-opening-model.js'),FurnishModelPrimitives:require('../src/render/model-primitives.js'),FurnishApplianceModel:require('../src/render/appliance-model.js')});
 vm.runInContext(html.slice(html.indexOf('const primitives ='),html.indexOf('/* ======================= 建筑')),ctx);
 const legCenters=obj=>{obj.updateMatrixWorld(true);const p=new T.Vector3();let count=0;obj.traverse(v=>{if(v.userData.foldingTablePart==='leg'){p.add(v.getWorldPosition(new T.Vector3()));count++;}});return p.multiplyScalar(1/count);};
 for(const rot of [0,37,90,180])for(const flip of [false,true]){ctx.f={...f,rot,flip};const before=legCenters(vm.runInContext('buildFurniture(f)',ctx));for(const pose of ['single','capsule','round']){ctx.f=R.editFoldingTablePose(ctx.f,pose);const after=legCenters(vm.runInContext('buildFurniture(f)',ctx));near(after.distanceTo(before),0,2e-7);}}
 ctx.state={furniture:[f]};ctx.furnG=new T.Group();ctx.clearGroup=g=>g.clear();ctx.opt={furn:true};ctx.applyGrow=()=>{};ctx.furnitureError=R.modelError;ctx.furnitureRenderErrors=new Map();ctx.syncModelErrors=()=>{};
 Object.assign(ctx,{FurnishProject:{effectivePlan:()=>({})},PLAN:{},FurnishProducts:require('../src/core/product-rules.js'),M:v=>v/1000});
 vm.runInContext(html.slice(html.indexOf('function buildFurn(){'),html.indexOf('function buildHeaterClearances(){')),ctx);vm.runInContext('buildFurn()',ctx);const before=ctx.furnG.children[0],box=new T.Box3().setFromObject(before);assert(before.userData.foldingTable);vm.runInContext('buildFurn()',ctx);assert.equal(ctx.furnG.children[0],before);assert(new T.Box3().setFromObject(before).equals(box));
 ctx.state.furniture=[R.editFoldingTablePose(f,'capsule')];vm.runInContext('buildFurn()',ctx);assert.notEqual(ctx.furnG.children[0],before);assert.equal(ctx.furnitureRenderErrors.size,0);
 console.log('PASS folding table variants, fixed-frame poses, validation, restore, replacement, project roundtrip, production geometry, normals and cache');
})().catch(e=>{console.error(e);process.exitCode=1;});
