const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const F=require('../src/core/floor-finish-core.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),R=require('../src/core/repository-core.js'),Z=require('../src/core/zone-geometry.js'),M=require('../src/render/floor-finish-model.js'),WF=require('../src/core/wall-finish-core.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
const {plan,work}=fixture(),id=plan.rooms[0].id,layout={width:600,height:300,gap:2,angle:0,origin:[-701,-302]};
work.rooms[id].mat='tile800';
const original=copy(work),setting={rawZ:0,tileThickness:10,baseThickness:40,mode:'layers',layout},next={...copy(work),floorFinishes:{version:1,areas:{[id]:setting}}};
let ep=P.effectivePlan(plan,next);near(ep.floorFinish.areas[id].finishedZ,50);assert.deepEqual(work,original);assert.deepEqual(ep.rooms,plan.rooms.map(r=>({...r,ceilingHeight:2800})));
assert.equal(P.effectivePlan(plan,work).floorFinish,undefined);assert(!('floorFinishes' in W.create({makeId:()=> 'i',colorFor:()=> '#ddd',materials:{}}).fresh(plan)));
assert.equal(F.defaults(plan.rooms[0],{use:'bathroom'}).drop,5);assert.equal(F.defaults(plan.rooms[0],{use:'bedroom'}).drop,undefined);
const bath={...copy(plan.rooms[0]),id:'bath',name:'卫生间',poly:[[5000,0],[7000,0],[7000,2000],[5000,2000]]},two={...ep,rooms:[...ep.rooms,bath]};
for(const drop of [5,0,12.5]){const w={...next,rooms:{...next.rooms,bath:{mat:'tile600'}},floorFinishes:{version:1,areas:{...next.floorFinishes.areas,bath:{rawZ:0,tileThickness:10,mode:'reference',reference:id,drop}}}},d=F.derive(two,w);near(d.floorFinish.areas.bath.finishedZ,50-drop);near(d.floorFinish.areas.bath.baseThickness,40-drop);assert.equal(w.floorFinishes.areas.bath.baseThickness,undefined);}
for(const s of [{mode:'layers',rawZ:0,tileThickness:10},{mode:'level',rawZ:0,tileThickness:10,targetZ:5},{mode:'level',rawZ:0,tileThickness:10,baseThickness:40,targetZ:45},{mode:'reference',reference:'missing',drop:5}])assert(P.effectivePlan(plan,{...next,floorFinishes:{version:1,areas:{[id]:s}}}).floorFinish.pending.length);
const cycle=F.derive(two,{...next,floorFinishes:{version:1,areas:{[id]:{mode:'reference',reference:'bath',drop:5},bath:{mode:'reference',reference:id,drop:5}}}});assert.equal(cycle.floorFinish.pending.length,2);
const orphan=P.effectivePlan(plan,{...next,floorFinishes:{version:1,areas:{deleted:setting}}});assert(orphan.floorFinish.pending.some(p=>p.id==='deleted'));
assert(P.effectivePlan(plan,{...next,floorFinishes:{version:1,areas:{toString:setting}}}).floorFinish.pending.some(p=>p.id==='toString'),'unknown area IDs cannot match inherited object properties');
for(const s of [{...setting,rawZ:null},{...setting,baseThickness:-1},{...setting,layout:{...layout,gap:-1}},{...setting,layout:{...layout,width:0}},{...setting,unexpected:1},{...setting,layout:{...layout,origin:[Infinity,0]}}])assert.throws(()=>F.validate({version:1,areas:{[id]:s}}));
for(const angle of [0,90,37,-90]){
 const l={...layout,angle},p=[-423,1757];const back=F.transform(l,F.transform(l,p),true);near(back[0],p[0]);near(back[1],p[1]);
 const cells=F.cells(plan.rooms[0],l);assert(cells.length>0);for(const cell of cells)for(const poly of cell.polys)assert(poly.every(p=>p.every(Number.isFinite)));
}
const outer=[[0,0],[2000,0],[2000,2000],[0,2000]],hole=[[500,500],[500,1500],[1500,1500],[1500,500]],region=Z.outline(Z.decompose([outer,hole],p=>Z.inside(p,outer)&&!Z.inside(p,hole))),zeroGap={...layout,width:400,height:400,gap:0,origin:[-300,-300],angle:37};
near(Z.area(F.cells(region,zeroGap).flatMap(c=>c.polys)),3000000);
const concave={poly:[[0,0],[1000,0],[1000,500],[500,500],[500,1000],[0,1000]]};near(Z.area(F.cells(concave,zeroGap).flatMap(c=>c.polys)),750000);
assert.throws(()=>F.cells({poly:[[0,0],[100000,0],[100000,100000],[0,100000]]},{...layout,width:20,height:20}),/上限/);
const wf=WF.edit(next,WF.faces(plan)[0],{tileThickness:10,bondThickness:15}),sp=P.effectivePlan(plan,wf);near(Z.area(F.cells(sp.floorFinish.areas[id].room,zeroGap).flatMap(c=>c.polys)),P.area(sp.floorFinish.areas[id].room.poly)*1e6);
for(const height of [50,49.999,51]){const appliance={...work.furniture[0],type:'washer',mountHeight:height};assert.equal(P.spaceCheck(ep,[appliance],{scanPassages:false}).some(i=>i.kind==='floorheight'),height<50);}
for(const rot of [0,37,90,180])for(const flip of [false,true])assert(P.spaceCheck(ep,[{...work.furniture[0],cx:1500,cy:1500,rot,flip}],{scanPassages:false}).some(i=>i.kind==='floorheight'));
assert(P.spaceCheck(ep,[{...work.furniture[0],type:'counter',kitchen:{version:109}}],{scanPassages:false}).some(i=>i.kind==='model'&&i.pending),'broken models remain reviewable with floor settings');
const issue={kind:'floorheight',id:'item'},finger=P.checkFingerprint(issue,ep,next.furniture,800),gridChange=copy(next);gridChange.floorFinishes.areas[id].layout.angle=37;
assert.equal(P.checkFingerprint(issue,P.effectivePlan(plan,gridChange),next.furniture,800),finger);gridChange.floorFinishes.areas[id].baseThickness=41;assert.notEqual(P.checkFingerprint(issue,P.effectivePlan(plan,gridChange),next.furniture,800),finger);
const payload={planId:plan.id,current:next,designs:[{name:'地面',work:next}],catalog:[]},pack=P.pack(payload);assert.equal(pack.version,3);let restored=copy(next);
const disabled=F.setEnabled(next,plan,[id],false);assert.equal(disabled.floorFinishes.areas[id].enabled,false);assert.equal(P.effectivePlan(plan,disabled).floorFinish.areas[id],undefined);assert.deepEqual(F.setEnabled(disabled,plan,[id],true).floorFinishes,next.floorFinishes);assert.deepEqual(disabled.furniture,next.furniture);assert.deepEqual(disabled.architecture,next.architecture);
const bulk=F.setEnabled(original,plan,[id],true);assert.equal(bulk.floorFinishes.areas[id].tileThickness,undefined);assert(P.effectivePlan(plan,bulk).floorFinish.pending.length);assert.equal(original.floorFinishes,undefined);assert.throws(()=>F.setEnabled(next,plan,['missing'],true));assert.throws(()=>F.validate({version:1,areas:{[id]:{...setting,enabled:1}}}));
assert.deepEqual(P.unpack(P.pack({...payload,current:disabled})).current.floorFinishes,disabled.floorFinishes);
const restore=W.create({makeId:()=> 'new',colorFor:()=> '#ddd',materials:{tile800:{},wood:{}}}).restore;
for(let i=0;i<4;i++){restored=restore(P.unpack(P.pack({...payload,current:restored})).current,plan);assert.deepEqual(restored.floorFinishes,next.floorFinishes);assert.deepEqual(restored.furniture,next.furniture);assert.deepEqual(restored.architecture.draft,next.architecture.draft);near(P.effectivePlan(plan,restored).floorFinish.areas[id].finishedZ,50);}
const workspace={v:3,planId:plan.id,work:{[plan.id]:next},designs:[],customPlans:[plan.customDraft],custom:[]};assert.equal(JSON.parse(R.text(workspace)).version,3);assert.deepEqual(R.parse(JSON.parse(R.text(workspace))),R.portable(workspace));assert.throws(()=>R.parse({...JSON.parse(R.text(workspace)),version:16}));
assert.deepEqual(P.copyProject(payload,'custom_floor_copy').current.floorFinishes,next.floorFinishes);
const ctx=vm.createContext({FurnishFloorFinish:F,state:next,undoStack:[],redoStack:[],save(){},snapshot(){},before:JSON.stringify(work)});vm.runInContext(fs.readFileSync(require.resolve('../src/app.js'),'utf8').match(/function commit\(before\)\{[^\n]+/)[0]+'\ncommit(before);',ctx);assert.deepEqual(next.furniture,work.furniture);assert.equal(ctx.undoStack.length,1);
const cache=require('../src/io/workspace-cache.js'),read=k=>k==='huxing-design-v2'?JSON.stringify({...workspace,v:2}):null;assert.equal(cache.load({read,key:'huxing-design-v3',firstPlan:plan,restore}).v,2);
const dxf=require('../src/io/dxf-export.js').drawing(ep,next);assert(dxf.includes('FLOOR_TILES'));assert(dxf.includes('完成地面 50 mm'));
console.log('PASS floor elevations, editable bathroom drop, unknown/conflicts/cycles, grids/holes/angles/origins, thresholds, confirmations, versions/copies/repeated recovery and unchanged furniture');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),THREE=await import(JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),a=ep.floorFinish.areas[id],model=M.layers(THREE,a.room,a);
 assert.equal(model.children.length,2);for(const mesh of model.children){const box=new THREE.Box3().setFromObject(mesh),v=mesh.userData.floorLayer;near(box.min.y*1000,v.bottom);near(box.max.y*1000,v.top);}
 const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);M.uv(THREE,g,layout);assert(g.attributes.uv.array.every(Number.isFinite));assert.equal(M.layers(THREE,a.room,{...a,finishedZ:undefined}),null);
 console.log('PASS production floor layer geometry and grid UV coordinates');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Diagnostics must distinguish incomplete reference inputs from saved results.
{
 const w=copy(next);w.rooms.bath={name:'卫生间',mat:'tile600'};
 const spec={mode:'reference',reference:id,rawZ:0,tileThickness:10,drop:5};
 const pending=(ref,patch={})=>{w.floorFinishes.areas={...(ref?{[id]:ref}:{}),bath:{...spec,...patch}};return F.derive(two,w).floorFinish.areas.bath;};
 assert.match(pending(undefined).pending,/未启用/);
 assert.match(pending({...setting,baseThickness:undefined}).pending,/参考区域标高未确定/);
 assert.match(pending(setting,{reference:undefined}).pending,/请选择参考区域/);
 assert.match(pending(setting,{reference:'removed'}).pending,/已移除/);
 assert.match(pending(setting,{drop:undefined}).pending,/同高可填 0/);
 assert.match(pending(setting,{baseThickness:50}).pending,/冲突/);
 assert.equal(pending(setting).finishedZ,45);
 assert.equal(pending(setting,{drop:0}).finishedZ,50);
 assert.match(cycle.floorFinish.areas.bath.pending,/循环/);
}
