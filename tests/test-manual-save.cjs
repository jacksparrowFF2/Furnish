const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const file=require.resolve('../src/io/repository-storage.js');
function fixture(options={}){
 let now=0,next=0;const timers=new Map(),writes=[],statuses=[],module={exports:{}};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,require:createRequire(file),setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),Date,JSON,Promise});
 const client=module.exports.create({delay:60000,debounce:false,fingerprint:async v=>JSON.stringify(v),onChange:s=>statuses.push(s),request:async(route,method,body)=>{if(method==='GET')return {revision:'base',workspace:{v:2,updatedAt:1,work:{}}};if(method==='PUT'){writes.push(body.workspace);return {revision:'saved-'+writes.length};}return {};},...options});
 async function advance(ms){now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}await new Promise(resolve=>setImmediate(resolve));}
 return {client,writes,statuses,advance,timers};
}
(async()=>{
 const f=fixture();await f.client.initialize([]);assert.equal(f.writes.length,0);
 f.client.schedule({updatedAt:2,value:'first'});assert.equal(f.client.status.mode,'dirty');assert(f.client.pending);
 await f.advance(59000);assert.equal(f.writes.length,0);f.client.schedule({updatedAt:3,value:'latest'});
 await f.advance(1000);assert.equal(f.writes.length,1,'continuous editing must not postpone the one-minute deadline');assert.equal(f.writes[0].value,'latest');assert.equal(f.client.status.mode,'saved');assert(!f.client.pending);
 f.client.schedule({updatedAt:4,value:'manual'});await f.advance(20000);await f.client.flush();assert.equal(f.writes.length,2);assert.equal(f.client.status.mode,'saved');await f.advance(60000);assert.equal(f.writes.length,2,'Ctrl+S cancels its fallback timer');
 await f.client.flush();assert.equal(f.writes.length,2,'saving an unchanged workspace does not write a new file');
 f.client.schedule({updatedAt:5,value:'next deadline'});await f.advance(59999);assert.equal(f.writes.length,2);await f.advance(1);assert.equal(f.writes.length,3);f.client.stop();assert.equal(f.timers.size,0);
 const legacy=fixture({delay:650,debounce:true});await legacy.client.initialize([]);legacy.client.schedule({updatedAt:2});await legacy.advance(600);legacy.client.schedule({updatedAt:3});await legacy.advance(50);assert.equal(legacy.writes.length,0);await legacy.advance(600);assert.equal(legacy.writes.length,1,'existing debounce callers retain their timing');legacy.client.stop();
 console.log('PASS manual-first file saving: dirty vs writing, one-minute bounded deadline, latest edits, Ctrl+S flush, fresh deadline, no duplicate idle write and legacy debounce');
})().catch(e=>{console.error(e);process.exitCode=1;});
