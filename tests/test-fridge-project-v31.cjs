'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),P=require('../src/core/project-core.js'),R=require('../src/core/repository-core.js'),S=require('../scripts/repository-server.cjs'),Cache=require('../src/io/workspace-cache.js'),Client=require('../src/io/repository-storage.js');
const plan=require('../src/data/plans.js')[0],W=require('../src/core/work-state.js').create({makeId:()=> 'fixture',colorFor:()=> '#fff',materials:require('../src/data/catalog.js').materials});
const f={id:'fridge',name:'冰箱',type:'fridge_french_drawer',color:'#fff',cx:2500,cy:2500,w:833,d:595,h:1910,rot:37,flip:true,fridgeLeftAngle:90,fridgeRightAngle:70,fridgeUpperExtension:1,fridgeLowerExtension:.4},work={...W.fresh(plan),furniture:[f]},store={v:31,planId:plan.id,work:{[plan.id]:work},designs:[{id:'named',planId:plan.id,name:'开合方案',work}],customPlans:[],custom:[],updatedAt:100};
assert.equal(P.pack({planId:plan.id,current:{furniture:[]},designs:[],catalog:[]}).version,1);
assert.equal(P.pack({planId:plan.id,current:{furniture:[]},designs:[{name:'开合',work}],catalog:[]}).version,31);
assert.equal(JSON.parse(R.text(store)).version,31);assert.deepEqual(R.parse(JSON.parse(R.text(store))).work[plan.id].furniture,[f]);
const read=key=>key==='huxing-design-v31'?JSON.stringify(store):null;assert.deepEqual(Cache.load({read,key:'huxing-design-v31',firstPlan:plan,restore:W.restore}),store);assert(Cache.candidates({read}).some(w=>w.v===31));
const old={...store,v:30,updatedAt:200,work:{[plan.id]:{...work,furniture:[{...f,fridgeLeftAngle:0}]}}};assert.equal(Cache.load({read:key=>key==='huxing-design-v30'?JSON.stringify(old):null,key:'huxing-design-v31',firstPlan:plan,restore:W.restore}).v,30);
let restored=work;for(let i=0;i<3;i++)restored=W.restore(restored,plan);assert.deepEqual(restored.furniture,[f]);
(async()=>{
 const root=path.resolve(__dirname,'../output/playwright');fs.mkdirSync(root,{recursive:true});const directory=fs.mkdtempSync(path.join(root,'fridge-v31-')),api=S.create(directory),methods=[];
 const client=Client.create({delay:100000,fingerprint:async w=>S.digest(R.text(w)),onChange:()=>{},request:async(route,method='GET',body)=>{methods.push([route,method]);if(route==='/workspace')return method==='GET'?api.read():api.write(body.workspace,body.baseRevision);if(route==='/recoveries')return api.recover(body.workspace);throw Error('Unexpected route');}});
 try{const loaded=await client.initialize([store]);assert.equal(loaded.v,31);assert.deepEqual(api.read().workspace.work[plan.id].furniture,[f]);assert(methods.some(([route,method])=>route==='/recoveries'&&method==='POST'));assert(methods.some(([route,method])=>route==='/workspace'&&method==='PUT'));assert.equal(api.recoveries().length,1);assert.deepEqual(api.read().workspace.designs[0].work.furniture,[f]);}finally{client.stop();}
 console.log('PASS v31 fridge: feature-gated project/workspace version, named designs, old cache fallback, three restores, browser-client archive and repository save/read');
})().catch(e=>{console.error(e);process.exitCode=1;});
