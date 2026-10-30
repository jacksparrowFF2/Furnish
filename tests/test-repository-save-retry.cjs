'use strict';
const assert=require('node:assert/strict'),C=require('../src/core/repository-core.js'),Client=require('../src/io/repository-storage.js'),{digest}=require('../scripts/workspace-files.cjs');
const plan=require('../src/data/plans.js')[0],work=require('../src/core/work-state.js').create({makeId:()=> 'retry-test',colorFor:()=> '#aabbcc',materials:require('../src/data/catalog.js').materials}).fresh(plan);
const a={v:Math.max(2,require('../src/core/project-core.js').formatVersion([work])),planId:plan.id,work:{[plan.id]:work},designs:[],customPlans:[]},clone=v=>JSON.parse(JSON.stringify(v)),b=clone(a),c=clone(a);
b.work[plan.id].furniture[0].cx+=10;c.work[plan.id].furniture[0].cx+=20;
const fingerprint=async w=>digest(C.text(w)),disk=async w=>({workspace:w,revision:await fingerprint(w)}),tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const original=await disk(a);let state=original,writes=0,acks=0;
 const lost=Client.create({fingerprint,delay:100000,retryDelays:[],onChange(){},onAcknowledge(){acks++;},request:async(route,method,body)=>{
  if(method==='GET')return state;if(route==='/recoveries')return {id:'copy'};
  writes++;assert.equal(body.baseRevision,state.revision);state=await disk(body.workspace);throw Error('response connection lost');
 }});
 await lost.initialize([]);lost.schedule(b);await lost.flush();assert.equal(lost.status.mode,'saved');assert.equal(lost.revision,state.revision);assert.equal(writes,1);assert.equal(acks,1);await lost.retry();assert.equal(lost.status.mode,'saved');assert.equal(writes,1);lost.stop();
 // Reconciliation may itself be offline. Later edits must resume from the
 // acknowledged attempt, rather than overwrite an unrelated file or lose c.
 state=original;let unavailable=false;const bases=[];
 const delayed=Client.create({fingerprint,delay:100000,retryDelays:[],onChange(){},request:async(route,method,body)=>{
  if(route==='/recoveries')return {id:'copy'};if(method==='GET'){if(unavailable)throw Error('offline');return state;}
  bases.push(body.baseRevision);assert.equal(body.baseRevision,state.revision);state=await disk(body.workspace);if(bases.length===1){unavailable=true;throw Error('timed out after commit');}return {revision:state.revision};
 }});
 await delayed.initialize([]);delayed.schedule(b);await assert.rejects(delayed.flush(),/timed out/);delayed.schedule(c);assert.match(delayed.status.message,/timed out after commit/);unavailable=false;await delayed.retry();assert.deepEqual(bases,[original.revision,await fingerprint(b)]);assert.equal(state.revision,await fingerprint(c));delayed.stop();
 // A real external edit must remain untouched, including on automatic retry.
 state=original;writes=0;const conflict=Client.create({fingerprint,delay:100000,retryDelays:[0],onChange(){},request:async(route,method)=>{
  if(route==='/recoveries')return {id:'copy'};if(method==='GET')return state;writes++;state=await disk(c);throw Error('connection lost');
 }});
 await conflict.initialize([]);conflict.schedule(b);await assert.rejects(conflict.flush(),e=>e.status===409);await tick();assert.equal(writes,1);assert.equal(state.revision,await fingerprint(c));await assert.rejects(conflict.retry(),/冲突/);conflict.stop();
 // A temporary failure recovers without user intervention, with bounded retries.
 state=original;writes=0;let signal;const recovered=new Promise(resolve=>signal=resolve);
 const automatic=Client.create({fingerprint,delay:100000,retryDelays:[0],onChange:s=>{if(s.mode==='saved'&&writes)signal();},request:async(route,method,body)=>{
  if(route==='/recoveries')return {id:'copy'};if(method==='GET')return state;writes++;if(writes===1)throw Error('temporary disk busy');state=await disk(body.workspace);return {revision:state.revision};
 }});
 await automatic.initialize([]);automatic.schedule(b);await assert.rejects(automatic.flush());await recovered;assert.equal(writes,2);assert.equal(state.revision,await fingerprint(b));automatic.stop();
 let exhausted;const exhaustedPromise=new Promise(resolve=>exhausted=resolve);writes=0;
 const bounded=Client.create({fingerprint,delay:100000,retryDelays:[0,0],onChange:s=>{if(s.mode==='error'&&writes===3)exhausted();},request:async(route,method)=>{if(route==='/recoveries')return {id:'copy'};if(method==='GET')return original;writes++;throw Error('disk unavailable');}});
 await bounded.initialize([]);bounded.schedule(b);await assert.rejects(bounded.flush());await exhaustedPromise;await tick();bounded.schedule(c);await tick();assert.equal(writes,3);assert.match(bounded.status.message,/disk unavailable/);bounded.stop();
 // Invalid content is not repeatedly submitted; retain the actual reason.
 writes=0;const invalid=Client.create({fingerprint,delay:100000,retryDelays:[0],onChange(){},request:async(route,method)=>{if(route==='/recoveries')return {id:'copy'};if(method==='GET')return original;writes++;throw Object.assign(Error('invalid cabinet dimensions'),{status:400});}});
 await invalid.initialize([]);invalid.schedule(b);await assert.rejects(invalid.flush());invalid.schedule(c);await tick();assert.equal(writes,1);assert.match(invalid.status.message,/invalid cabinet dimensions/);invalid.stop();
 console.log('PASS lost-response acknowledgement, uncertain commit plus newer edits, real-conflict refusal, bounded automatic retry, and persistent validation/failure diagnostics');
})().catch(e=>{console.error(e);process.exitCode=1;});
