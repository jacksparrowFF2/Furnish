'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http'),os=require('node:os');
const C=require('../src/core/repository-core.js'),Client=require('../src/io/repository-storage.js'),P=require('../src/core/project-core.js'),Files=require('../scripts/repository-server.cjs');
const plan=require('../src/data/plans.js')[0],clone=v=>JSON.parse(JSON.stringify(v)),digest=v=>Files.digest(C.text(v));
let uid=0;const W=require('../src/core/work-state.js').create({makeId:()=> 'fixture'+ ++uid,colorFor:()=> '#fff',materials:require('../src/data/catalog.js').materials});
(async()=>{
 // A future browser registry must be enough to enable its recovery version;
 // the persistence client must not carry a second, already outdated list.
 const future=Math.max(...C.workspaceVersions)+1,scope={FurnishRepositoryCore:{...C,workspaceVersions:[...C.workspaceVersions,future]},setTimeout,clearTimeout,Date,JSON};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/io/repository-storage.js'),'utf8'),scope);
 const cached={v:future,planId:'p',work:{p:{value:'unsaved'}},designs:[],updatedAt:2,_repository:{revision:'base'}},recovered=[];
 const browser=scope.FurnishRepositoryStorage.create({fingerprint:async()=> 'edited',onChange(){},request:async(route,method,body)=>{if(method==='GET')return {revision:'base',workspace:{v:2,planId:'p',work:{p:{}},designs:[]}};if(route==='/recoveries')return {id:'copy'};recovered.push(body.workspace);return {revision:'edited'};}});
 const loaded=await browser.initialize([cached]);assert.equal(loaded.v,future);assert.equal(recovered.length,1);browser.stop();
 assert.throws(()=>C.validate(cached),e=>e.code==='WORKSPACE_VERSION_UNSUPPORTED'&&e.status===422&&e.supportedWorkspaceVersions.includes(40),'future client test must not relax the actual production validator');
 assert.throws(()=>C.validate({v:40,planId:'p',work:[],designs:[]}),/工作区结构无效/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'version-compat-')),api=Files.create(dir),work=W.fresh(plan),seed={v:2,planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[]};api.write(seed,null);
 const edited=clone(seed);edited.v=40;edited.work[plan.id].furniture=[{id:'sofa',type:'sofa_bed_yeswood_y107h03',name:'fixture',cx:1500,cy:1500,w:1250,d:838,h:770,rot:0,color:'#eee',sofaBedOpen:false}];edited.designs=[{id:'named',name:'fixture',planId:plan.id,work:clone(edited.work[plan.id])}];assert.equal(P.formatVersion([edited.work[plan.id]]),40);
 let stale=true;const server=http.createServer(async(req,res)=>{if(stale&&req.method==='PUT'){for await(const _ of req){}res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:'工作区结构无效'}));return;}await api.handle(req,res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const request=async(route,method='GET',body)=>{const response=await fetch(url+'/api/furnish'+route,{method,headers:body?{'Content-Type':'application/json','X-Furnish-Request':'workspace-v1'}:{},...(body?{body:JSON.stringify(body)}:{})});const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error),{status:response.status,code:value.code});return value;};
 const client=Client.create({request,fingerprint:async v=>digest(v),onChange(){},delay:60000,debounce:false,retryDelays:[]});
 try{
  const info=await request('/workspace');assert.deepEqual(info.supportedWorkspaceVersions,C.workspaceVersions);await client.initialize([]);const original=api.read().revision;
  client.schedule(edited);await assert.rejects(client.flush(),/工作区结构无效/);assert(client.pending);assert.equal(api.read().revision,original);
  const latest=clone(edited);latest.work[plan.id].furniture[0].cx=1600;client.schedule(latest);stale=false;await client.retry();assert.equal(client.status.mode,'saved');assert(!client.pending);
  const disk=api.read().workspace;assert.equal(disk.v,40);assert.equal(disk.work[plan.id].furniture[0].cx,1600);assert.equal(disk.designs[0].work.furniture[0].sofaBedOpen,false);assert(api.backups().length>=1);
  const before=api.read().revision,response=await fetch(url+'/api/furnish/workspace',{method:'PUT',headers:{'Content-Type':'application/json','X-Furnish-Request':'workspace-v1'},body:JSON.stringify({workspace:{...latest,v:future},baseRevision:before})}),failure=await response.json();assert.equal(response.status,422);assert.equal(failure.code,'WORKSPACE_VERSION_UNSUPPORTED');assert.match(failure.error,/重新启动.*服务/);assert.deepEqual(failure.supportedWorkspaceVersions,C.workspaceVersions);assert.equal(api.read().revision,before);
  console.log('PASS canonical recovery versions, strict future-version refusal, explicit API diagnostics, stale service failure then same-window retry, latest v40 sofa/current/named data and history preservation');
 }finally{client.stop();await new Promise(r=>server.close(r));assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
