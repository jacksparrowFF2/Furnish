'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),F=require('../src/core/floor-finish-core.js'),P=require('../src/core/project-core.js'),R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),G=require('../src/core/layout-geometry.js'),C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js'),W=require('../src/core/work-state.js'),Repo=require('../src/core/repository-core.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
const {plan,work}=fixture({partition:true}),[a,b]=plan.rooms.map(r=>r.id);
let next=F.setLayers(work,plan,[a,b],{rawZ:0,tileThickness:10,baseThickness:50,bathroomBaseThickness:45});
next.rooms[b].use='bathroom';next=F.setLayers(next,plan,[b],{rawZ:0,tileThickness:10,baseThickness:45});next.furnitureDatum='finished-floor';
const make=(type,id,cx,patch={})=>({id,type,name:id,cx,cy:1500,w:500,d:400,rot:0,color:'#ddd',...patch});
const left=make('washer','left',1000,{mountHeight:0}),right=make('washer','right',3000,{mountHeight:0}),host=K.configure(make('counter','host',1000),{...K.defaults({type:'counter',w:600,d:600}),modules:[{run:0,width:600,role:'sink'}]}),sink=K.attach(make('ksink','sink',1000,{w:400,d:300}),host,0);
next.furniture=[left,right,host,sink];K.normalize(next.furniture);const p=P.effectivePlan(plan,next),before=copy(next);
assert.equal(R.floorBase(p,left).z,60);assert.equal(R.floorBase(p,right).z,55);assert.equal(R.floorBase(p,{...sink,cx:3000}).z,60,'linked item uses host datum once');
for(const rot of [0,37,90,180])for(const flip of [false,true]){
 const f={...left,rot,flip};near(D.furnitureVerticalBounds(f,p).bottom,60);near(G.bodyParts(f,p)[0].vertical.bottom,60);
 assert(!P.spaceCheck(p,[f],{scanPassages:false}).some(v=>v.kind==='floorheight'));
}
const legacy=P.effectivePlan(plan,{...next,furnitureDatum:undefined});assert.equal(D.furnitureVerticalBounds(left,legacy).bottom,0);assert(P.spaceCheck(legacy,[left],{scanPassages:false}).some(v=>v.kind==='floorheight'));
const missing=copy(next);delete missing.floorFinishes.areas[a].baseThickness;const unknown=P.effectivePlan(plan,missing);assert.equal(R.floorBase(unknown,left).known,false);assert.equal(D.furnitureVerticalBounds(left,unknown),null);assert(P.spaceCheck(unknown,[left],{scanPassages:false}).some(v=>v.kind==='floorheight'&&v.pending));
assert.equal(R.floorBase({...p,floorFinish:undefined},left).z,0);
const bay={id:'bay',counted:false,poly:[[500,0],[1000,0],[1000,200],[500,200]]};assert.equal(R.floorBase({...p,rooms:[...p.rooms,bay]},make('baycushion','bay-item',750,{cy:100})).z,60,'bay furniture shares adjacent room datum');
const cyclic=[{...sink,id:'x',counterLink:{hostId:'y'}},{...sink,id:'y',counterLink:{hostId:'x'}}];assert.equal(R.floorBase(p,cyclic[0],cyclic).known,false);
const cabinet={...C.preset('base'),id:'cab',name:'柜',cx:1000,cy:1500,rot:0};
const zones=C.openingZones(cabinet),shifted=zones.map(z=>C.shiftOpening(z,60));assert(shifted.length);for(let i=0;i<zones.length;i++){assert.deepEqual(C.shiftOpening(shifted[i],-60),zones[i]);near(shifted[i].ranges[0][0]-zones[i].ranges[0][0],60);}
const beamPoly=G.corners(left),height=D.furnitureVerticalBounds(left,p).top;
for(const bottom of [height,height-.001]){const q={...p,beams:[{id:'beam',name:'梁',poly:beamPoly,bottomHeight:bottom,topHeight:bottom+100}]};assert.equal(P.spaceCheck(q,[left],{scanPassages:false}).some(v=>v.kind==='beam'),bottom<height);}
assert.deepEqual(next,before,'derivation and spatial checks never rewrite recorded heights');
const payload={planId:plan.id,current:next,designs:[{name:'基准',work:next}],catalog:[]};assert.equal(P.pack(payload).version,10);assert.notEqual(P.checkFingerprint({kind:'beam',id:'left'},p,next.furniture,800),P.checkFingerprint({kind:'beam',id:'left'},legacy,next.furniture,800));
const restore=W.create({makeId:()=> 'generated',colorFor:()=> '#ddd',materials:{wood:{},tile800:{}}}).restore;
for(let i=0;i<4;i++){const loaded=restore(P.unpack(P.pack(payload)).current,plan);assert.equal(loaded.furnitureDatum,'finished-floor');assert.deepEqual(loaded.furniture,next.furniture);near(D.furnitureVerticalBounds(loaded.furniture[0],P.effectivePlan(plan,loaded)).bottom,60);}
assert.equal(P.copyProject(payload,'custom_floor_base').current.furnitureDatum,'finished-floor');assert.equal(W.create({makeId:()=> 'new',colorFor:()=> '#ddd',materials:{}}).fresh(plan).furnitureDatum,'finished-floor');
assert.throws(()=>P.validateWork({...next,furnitureDatum:'invalid'}));
const workspace={v:10,planId:plan.id,work:{[plan.id]:next},designs:[],customPlans:[plan.customDraft],custom:[]};assert.equal(Repo.parse(JSON.parse(Repo.text(workspace))).work[plan.id].furnitureDatum,'finished-floor');
const Cache=require('../src/io/workspace-cache.js');assert.equal(Cache.load({read:key=>key==='huxing-design-v9'?JSON.stringify({...workspace,v:9,updatedAt:4}):null,key:'huxing-design-v10',firstPlan:plan,restore}).v,9);
console.log('PASS explicit finished-floor datum, legacy/unknown, host links, rotation/mirror, beam contact, opening ranges, confirmations, v10 and repeated recovery');
(async()=>{
 const THREE=await import(JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),M=require('../src/render/wall-finish-model.js'),T=require('../src/core/wall-tiling-core.js');
 let w={...copy(next),rooms:Object.fromEntries(Object.entries(next.rooms).map(([id,r])=>[id,{...r,use:'kitchen'}]))};const faces=T.faces(p,w);assert(faces.filter(f=>f.roomId===a).every((f,i)=>f.number===i+1));
 const finish=require('../src/core/wall-finish-core.js');w=finish.edit(w,faces[0],{tileThickness:10,bondThickness:5});const ep=P.effectivePlan(plan,w),model=M.build(THREE,ep,{top:1200});model.updateMatrixWorld(true);
 const layers=model.children.filter(o=>o.userData.wallFinish);assert.equal(layers.length,2);assert.notEqual(layers[0].material.color.getHex(),layers[1].material.color.getHex());
 for(const mesh of layers){const info=mesh.userData.wallFinish,bounds=new THREE.Box3().setFromObject(mesh),n=ep.wallFinish.solids[0].normal;near((n?bounds.max.z-bounds.min.z:bounds.max.x-bounds.min.x)*1000,info.layer==='tile'?10:5);near(bounds.max.y*1000,1200);}
 console.log('PASS physical wall layer widths at actual thickness, contrasting cut colors and shared wall numbering');
})().catch(e=>{console.error(e);process.exitCode=1;});
