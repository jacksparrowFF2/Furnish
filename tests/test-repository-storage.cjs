'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const C=require('../src/core/repository-core.js'),S=require('../scripts/repository-server.cjs'),Client=require('../src/io/repository-storage.js');
const plan=require('../src/data/plans.js')[0],clone=v=>JSON.parse(JSON.stringify(v));
let uid=0;const W=require('../src/core/work-state.js').create({makeId:()=> 'test'+ ++uid,colorFor:()=> '#aabbcc',materials:require('../src/data/catalog.js').materials});
const fixture=()=>({v:2,planId:plan.id,work:{[plan.id]:W.fresh(plan)},designs:[],customPlans:[],updatedAt:100});
const fingerprint=async w=>S.digest(C.text(w));
(async()=>{
 const tempRoot=path.resolve(__dirname,'../output/playwright');fs.mkdirSync(tempRoot,{recursive:true});const dir=fs.mkdtempSync(path.join(tempRoot,'repository-')),api=S.create(dir);
 const a=fixture();C.validate(a);assert.equal(C.text(a),C.text({...a,updatedAt:200,_repository:{revision:'ignored'}}));
 const originalDesign={id:'named',name:'原方案',planId:plan.id,work:a.work[plan.id]},reorderedDesign={...originalDesign,work:C.portable(a).work[plan.id]};assert.equal(require('../src/core/project-core.js').mergeDesigns([originalDesign],[reorderedDesign],plan.id).length,1);
 assert.throws(()=>C.parse({format:'furnish-workspace',version:999,workspace:a}));
 assert.throws(()=>C.validate({...a,planId:'missing'}));
 const bad=clone(a);bad.work[plan.id].furniture[0].w=-1;assert.throws(()=>C.validate(bad));
 const first=api.write(a,null),read=api.read();assert.equal(first.revision,read.revision);assert.deepEqual(read.workspace,C.portable(a));
 assert.throws(()=>api.write(a,null),e=>e.status===409);
 const b=clone(a);b.work[plan.id].furniture[0].cx+=123;
 const second=api.write(b,first.revision);assert.notEqual(second.revision,first.revision);
 assert.throws(()=>api.write(a,first.revision),e=>e.status===409);assert.equal(api.read().revision,second.revision);
 assert.deepEqual(api.write({...b,updatedAt:500},second.revision),second);
 const r=api.recover(a);assert.equal(api.recover(a).id,r.id);assert.equal(api.recoveries().length,1);assert.equal(api.read().revision,second.revision);
 const layered=clone(a);layered.v=15;layered.work[plan.id].objectLayers={layers:[],assignments:{}};
 const layeredCopy=api.recover(layered);assert.equal(api.recover(layered).id,layeredCopy.id);assert.deepEqual(api.recoveries().find(entry=>entry.id===layeredCopy.id).workspace,layered);assert.equal(api.read().revision,second.revision);
 // Unmerged Git edits cannot be overwritten, even with a previously valid revision.
 const file=path.join(dir,'projects/workspace.furnish.json'),valid=fs.readFileSync(file,'utf8');fs.writeFileSync(file,'<<<<<<< HEAD\n');assert.throws(()=>api.read());assert.throws(()=>api.write(a,second.revision));assert.match(fs.readFileSync(file,'utf8'),/HEAD/);fs.writeFileSync(file,valid);
 const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(url+'/api/furnish/workspace')).status,200);
  assert.equal((await fetch(url+'/api/furnish/workspace',{method:'PUT',headers:{Origin:'https://evil.example','Content-Type':'application/json','X-Furnish-Request':'workspace-v1'},body:JSON.stringify({workspace:a,baseRevision:second.revision})})).status,403);
  assert.equal((await fetch(url+'/api/furnish/workspace',{method:'PUT',headers:{'Content-Type':'text/plain'},body:'{}'})).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
 function setup(disk){let state=clone(disk),archives=[],writes=[],statuses=[],acks=[];const request=async(route,method,body)=>{
  if(route==='/recoveries'){archives.push(clone(body.workspace));return {id:'copy'};}
  if(method==='GET')return clone(state);
  if(body.baseRevision!==state.revision)throw Object.assign(Error('changed'),{status:409});
  C.validate(body.workspace);state={workspace:C.portable(body.workspace),revision:await fingerprint(body.workspace)};writes.push(clone(body.workspace));return {revision:state.revision};
 };const client=Client.create({request,fingerprint,onChange:s=>statuses.push(s),onAcknowledge:a=>acks.push(a),delay:100000});return {client,archives,writes,statuses,acks,get state(){return state;},set state(v){state=v;}};}
 const revA=await fingerprint(a),revB=await fingerprint(b);
 const emptyBrowser=setup({revision:revA,workspace:a});assert.equal((await emptyBrowser.client.initialize([]))._repository.revision,revA);assert.equal(emptyBrowser.writes.length,0);
 const migrate=setup({revision:null,workspace:null});const migrated=await migrate.client.initialize([a]);assert.equal(migrated._repository.revision,revA);assert.equal(migrate.archives.length,1);assert.equal(migrate.writes.length,1);
 const stale={...a,updatedAt:9999999999999,_repository:{revision:revA,clean:revA}};
 const pull=setup({revision:revB,workspace:b});const loaded=await pull.client.initialize([stale]);assert.deepEqual(C.portable(loaded),C.portable(b));assert.equal(pull.writes.length,0);
 const unknown=setup({revision:revB,workspace:b});await unknown.client.initialize([{...a,updatedAt:9999999999999}]);assert.equal(unknown.writes.length,0);assert.equal(unknown.archives.length,1);assert.match(unknown.client.status.message,/恢复副本/);
 const pending={...b,_repository:{revision:revA,clean:revA}};
 const resume=setup({revision:revA,workspace:a});const resumed=await resume.client.initialize([pending]);assert.equal(resumed._repository.revision,revB);assert.equal(resume.writes.length,1);
 const both=setup({revision:revB,workspace:b});const divergent=clone(pending);divergent.work[plan.id].furniture[0].cy+=456;await both.client.initialize([divergent]);assert.equal(both.writes.length,0);assert.equal(both.archives.length,1);
 // Both browser stores are kept before selecting the newer candidate.
 const two=setup({revision:null,workspace:null});await two.client.initialize([a,{...b,updatedAt:200}]);assert.equal(two.archives.length,2);assert.equal(two.state.revision,revB);
 const edits=setup({revision:revA,workspace:a});await edits.client.initialize([{...a,_repository:{revision:revA}}]);edits.client.schedule(b);await edits.client.flush();assert.equal(edits.state.revision,revB);assert.equal(edits.acks.length,1);
 edits.client.schedule(divergent);edits.state={workspace:a,revision:revA};await assert.rejects(edits.client.flush());assert.equal(edits.client.blocked,true);assert.equal(edits.state.revision,revA);assert.ok(edits.archives.length);edits.client.stop();
 // Idempotent load, without a timestamp-based choice or migration drift.
 for(let i=0;i<3;i++){const again=setup({revision:revB,workspace:b});const loaded=await again.client.initialize([{...b,_repository:{revision:revB,clean:revB}}]);assert.equal(again.writes.length,0);assert.deepEqual(C.portable(loaded),C.portable(b));}
 // A newer edit during an in-flight save stays pending until its own write is acknowledged.
 const gates=[],states=[],inflight=Client.create({fingerprint,delay:100000,onChange:s=>states.push(s),request:async(route,method,body)=>{
  if(method==='GET')return {workspace:a,revision:revA};
  if(route==='/recoveries')return {id:'backup'};
  await new Promise(resolve=>gates.push(resolve));return {revision:await fingerprint(body.workspace)};
 }});
 await inflight.initialize([]);inflight.schedule(b);const writing=inflight.flush();await new Promise(resolve=>setImmediate(resolve));inflight.schedule(divergent);gates[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(states.at(-1).mode,'pending');assert.equal(gates.length,2);gates[1]();await writing;assert.equal(states.at(-1).mode,'saved');inflight.stop();
 assert.ok(path.resolve(dir).startsWith(tempRoot+path.sep));fs.rmSync(dir,{recursive:true,force:true});
 console.log('PASS repository migration, two-cache recovery, pull precedence, pending edits, conflict refusal, stable roundtrip and same-origin API');
})().catch(e=>{console.error(e);process.exitCode=1;});
