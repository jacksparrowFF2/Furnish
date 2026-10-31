'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P=require('../src/core/project-core.js'),C=require('../src/core/ceiling-core.js'),T=require('../src/core/wall-tiling-core.js'),R=require('../src/core/repository-core.js'),Cache=require('../src/io/workspace-cache.js'),W=require('../src/core/work-state.js'),Server=require('../scripts/repository-server.cjs'),Client=require('../src/io/repository-storage.js');
const {fixture}=require('./helpers/wall-finish-fixture.cjs'),copy=v=>JSON.parse(JSON.stringify(v));
const {plan,work}=fixture(),room=plan.rooms[0],paths=C.boundaryPaths(room);
work.rooms[room.id].use='kitchen';work.rooms[room.id].mat='tile800';work.floorFinishes={version:1,areas:{[room.id]:{mode:'layers',rawZ:0,tileThickness:10,baseThickness:50,layout:{width:800,height:400,gap:2,angle:0,origin:[0,0]}}}};
const linked=T.alignFloor(T.setEnabled(work,P.effectivePlan(plan,work),[room.id],true),P.effectivePlan(plan,work),[room.id]);
const cove={id:'merged_cove',kind:'profile',name:'合并吊顶',roomId:room.id,height:2800,path:C.joinedPath(paths[0],paths[1]),section:C.lowCove(),ends:{start:{enabled:true,thickness:12,lightGap:5},end:{enabled:true,thickness:12,lightGap:5}}};cove.section.light.corner={mode:'arc',radius:8};
const ceiling=C.edit(work,cove),mixed=C.edit(linked,cove),payload=current=>({planId:plan.id,current,designs:[],catalog:[]}),workspace=(current,v=9)=>({v,planId:plan.id,work:{[plan.id]:current},designs:[],customPlans:[current.architecture.draft],custom:[]});
assert.equal(P.formatVersion([ceiling]),9);assert.equal(P.formatVersion([linked]),9);assert.equal(P.formatVersion([mixed]),9);
assert.equal(P.pack({...payload(work),designs:[{name:'吊顶',work:ceiling},{name:'铺贴',work:linked}]}).version,9);
const restore=W.create({makeId:()=> 'restored',colorFor:()=> '#ddd',materials:require('../src/data/catalog.js').materials}).restore;
for(const [oldVersion,current] of [[7,ceiling],[8,ceiling],[7,linked],[9,mixed]]){
 const old={...P.pack(payload(current)),version:oldVersion};let restored=P.unpack(old).current;const normalized=current,source=copy(current);
 for(let i=0;i<4;i++){restored=restore(P.unpack(P.pack(payload(restored))).current,plan);assert.deepEqual(restored.ceilings,normalized.ceilings);assert.deepEqual(restored.wallTiling,current.wallTiling);}
 const saved=workspace(current,oldVersion);assert.deepEqual(R.parse({...JSON.parse(R.text(saved)),version:oldVersion}),R.portable({...saved,v:P.formatVersion([normalized])>=16?Math.max(oldVersion,P.formatVersion([normalized])):oldVersion,work:{[plan.id]:normalized}}));assert.deepEqual(current,source,'restore never rewrites legacy input');assert.equal(JSON.parse(R.text(saved)).version,9);
}
assert.throws(()=>P.unpack({...P.pack(payload(mixed)),version:999}),/版本/);
assert.throws(()=>R.parse({...JSON.parse(R.text(workspace(mixed))),version:999}),/版本/);
const legacy7={...workspace(linked,7),updatedAt:200},legacy8={...workspace(ceiling,8),updatedAt:100},values={'huxing-design-v7':JSON.stringify(legacy7),'huxing-design-v8':JSON.stringify(legacy8)},original=copy(values),read=k=>values[k]||null;
assert.deepEqual(Cache.load({read,key:'huxing-design-v9',firstPlan:plan,restore}),legacy7,'newest divergent legacy cache wins even with a lower version');
const candidates=Cache.candidates({read,key:'huxing-design-v9'});assert.equal(candidates.length,2);assert.deepEqual(values,original,'reads retain both original keys');
values['huxing-design-v9']=JSON.stringify({...workspace(mixed),updatedAt:50});assert.equal(Cache.load({read,key:'huxing-design-v9',firstPlan:plan,restore}).v,9,'existing unified cache takes precedence');delete values['huxing-design-v9'];
const saveSource=fs.readFileSync(require.resolve('../src/app.js'),'utf8').match(/function save\(\)\{[\s\S]*?\n\}/)[0];
for(const current of [ceiling,linked,mixed])for(const v of [6,7,8,9]){
 const ctx=vm.createContext({FurnishDesign:require('../src/core/design-core.js'),FurnishProject:P,storageWiping:false,repositoryBooting:false,PLAN:plan,state:copy(current),store:workspace(copy(current),v),STORE:'huxing-design-v'+v,autosave:{save(w){values['huxing-design-v9']=JSON.stringify(w);}},repositoryClient:null});vm.runInContext(saveSource+'\nsave();',ctx);assert.equal(ctx.store.v,9);assert.equal(ctx.STORE,'huxing-design-v9');assert.equal(values['huxing-design-v7'],original['huxing-design-v7']);assert.equal(values['huxing-design-v8'],original['huxing-design-v8']);
}
(async()=>{
 const dir=path.resolve(__dirname,'../output/playwright');fs.mkdirSync(dir,{recursive:true});const root=fs.mkdtempSync(path.join(dir,'merged-format-')),api=Server.create(root);api.write(workspace(mixed),null);
 const client=Client.create({request:async(route,method='GET',body)=>route==='/workspace'?(method==='GET'?api.read():api.write(body.workspace,body.baseRevision)):api.recover(body.workspace),fingerprint:async w=>Server.digest(R.text(w)),onChange(){}});
 const restored=await client.initialize(candidates);assert.deepEqual(restored.work[plan.id].ceilings,mixed.ceilings);assert.deepEqual(restored.work[plan.id].wallTiling,mixed.wallTiling);
 assert.equal(api.recoveries().length,2,'both divergent legacy caches are archived before file arbitration');assert(api.recoveries().some(e=>JSON.stringify(e.workspace)===JSON.stringify(legacy7)));assert(api.recoveries().some(e=>JSON.stringify(e.workspace)===JSON.stringify(legacy8)));client.stop();
 console.log('PASS unified v9 ceiling/tiling current and named designs, legacy v7/v8 roundtrips, non-destructive cache upgrade, actual save and repository arbitration with both recovery copies');
})().catch(e=>{console.error(e);process.exitCode=1;});
