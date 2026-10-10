const assert=require('node:assert/strict'),R=require('../src/io/recovery-storage.js');
const P=require('../src/core/project-core.js');
const work={furniture:[{id:'f',cx:0,cy:0,w:400,d:400,rot:0}]};
const entries=P.recoveryEntry([],'p',work,'before',1);
assert.deepEqual(R.readCache(()=>JSON.stringify(entries)),entries);
for(const read of [()=>'{',()=>{throw Error('restricted');},()=>null])assert.deepEqual(R.readCache(read),[]);
assert.deepEqual(R.merge(entries,[...entries,{...entries[0],ts:2,data:{furniture:null}}]),entries);
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {resolve,reject,promise};};
(async()=>{
 const tasks=[],status=[];let cacheFails=true;
 const r=R.create({writeCache:()=>{if(cacheFails)throw Error('quota');},writeStore:()=>{const d=deferred();tasks.push(d);return d.promise;},isCurrent:()=>true,onChange:e=>status.push(e)});
 const first=r.persist(entries),second=r.persist(entries); // Same array can be edited in place.
 tasks[1].reject(Error('latest'));await second;tasks[0].resolve();await first;
 assert.deepEqual(status,[true,true,true]);
 const erased=r.persist(entries);r.invalidate();tasks[2].resolve();await erased;
 assert.equal(status.length,4);
 cacheFails=false;const cached=r.persist(entries);tasks[3].reject(Error('database'));await cached;
 assert.equal(status.at(-1),false);
 const sync=[];await R.create({writeCache:()=>{throw Error('quota');},writeStore:()=>{throw Error('unavailable');},isCurrent:()=>true,onChange:e=>sync.push(e)}).persist(entries);
 assert.deepEqual(sync,[true,true]);
 console.log('PASS recovery merge, cache fallback, same-array races and invalidation');
})().catch(e=>{console.error(e);process.exitCode=1;});
