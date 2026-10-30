'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const C=require('../src/core/repository-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/floorplan-core.js');
const plans=require('../src/data/plans.js'),clone=v=>JSON.parse(JSON.stringify(v));
let counter=0;const W=require('../src/core/work-state.js').create({makeId:()=> 'repo'+ ++counter,colorFor:()=> '#aabbcc',materials:require('../src/data/catalog.js').materials});
const fresh=()=>({v:2,planId:plans[0].id,work:{[plans[0].id]:W.fresh(plans[0])},designs:[],customPlans:[],updatedAt:100});
const sources={core:fs.readFileSync(require.resolve('../src/core/repository-core.js'),'utf8'),ui:fs.readFileSync(require.resolve('../src/ui/repository-workspace.js'),'utf8')};
// Production browsers append custom plans to FurnishPlans before repository startup.
// Use the existing DXF importer to construct a fully supported custom draft.
const DXF=require('../src/io/dxf-import.js');
const draft=DXF.draft(DXF.parse(fs.readFileSync(require('./helpers/paths.cjs').rootPath('examples/sample-centerlines.dxf'),'utf8')),{layers:['WALL_CENTER'],mmPerUnit:1,id:'custom_repository',name:'测试'});
const customPlan=D.build(draft),customWork=W.fresh(customPlan);customWork.plan=customPlan.id;customWork.architecture={draft:customPlan.customDraft,phase:'survey'};
const custom={v:2,planId:customPlan.id,work:{[customPlan.id]:customWork},designs:[],customPlans:[customPlan.customDraft]};
const coreScope=vm.createContext({FurnishProject:P,FurnishPlans:[...plans,customPlan]});vm.runInContext(sources.core,coreScope);assert.doesNotThrow(()=>coreScope.FurnishRepositoryCore.validate(custom));
async function boot({protocol='file:',disk=null,saved=null,failRequest=false,initial=fresh()}={}){
 const elements=[],events=[],cacheWrites=[];
 const node=()=>({style:{},append(){},after(){},remove(){this.removed=true;},setAttribute(){}});
 const scope={console,Promise,setTimeout,clearTimeout,AbortController,TextEncoder,crypto:require('node:crypto').webcrypto,
  FurnishRepositoryCore:C,FurnishRepositoryStorage:require('../src/io/repository-storage.js'),repositoryInitialCache:clone(initial),
  repositoryClient:null,repositoryBooting:true,repositoryResume:()=>events.push('ready'),store:clone(initial),PLAN:plans[0],PLANS:[...plans,customPlan],
  document:{hidden:false,createElement:()=>{const n=node();elements.push(n);return n;},body:{append(){}},addEventListener(){}},
  window:{FurnishStorage:{ready:Promise.resolve(saved),write:async value=>cacheWrites.push(clone(value))}},location:{protocol},
  addEventListener(){},$:()=>node(),syncSaved(){},toast:message=>events.push(message),autosave:{invalidate(){}},
  FurnishDraft:D,state:null,fixWork:W.restore,customArchDraft:null,customArchPlanId:'',ui:{sel:null},undoStack:[],redoStack:[],savedAt:0,
  localStorage:{setItem(){}},STORE:'test',
  fetch:async()=>{events.push('request');if(failRequest)throw Error('offline');return {ok:true,json:async()=>clone(disk)};},
 };
 for(const name of ['applyPlanData','buildDefs','buildCats','buildLib','renderOpenings','renderDims','renderAll','fitView','renderDesigns','buildPlanList'])scope[name]=()=>{};
 const context=vm.createContext(scope);vm.runInContext(sources.ui,context);await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));return {scope,events,elements,cacheWrites};
}
(async()=>{
 const a=fresh(),newer=clone(a);newer.updatedAt=200;newer.work[newer.planId].furniture[0].cx+=200;
 const file=await boot({initial:a,saved:newer});assert.equal(file.scope.repositoryBooting,false);assert.equal(file.scope.repositoryClient,null);assert.equal(file.scope.state.furniture[0].cx,newer.work[newer.planId].furniture[0].cx);assert.ok(!file.events.includes('request'));assert.ok(file.elements[0].removed);assert.equal(file.scope.PLANS.some(p=>p.id===customPlan.id),false);
 const empty=await boot();assert.ok(!empty.events.includes('request'));assert.equal(empty.scope.repositoryBooting,false);
 const latest=await boot({initial:a,saved:{...newer,v:38}});assert.equal(latest.scope.state.furniture[0].cx,newer.work[newer.planId].furniture[0].cx);assert.ok(!latest.events.includes('request'));
 const fail=await boot({protocol:'http:',initial:a,saved:newer,failRequest:true});assert.equal(fail.scope.state.furniture[0].cx,newer.work[newer.planId].furniture[0].cx);assert.equal(fail.scope.repositoryClient.status.mode,'error');assert.equal(fail.cacheWrites.length,0);
 console.log('PASS file-mode cache recovery without repository requests, stale custom plan removal, unavailable-service IndexedDB fallback and registered custom-plan validation');
})().catch(e=>{console.error(e);process.exitCode=1;});
