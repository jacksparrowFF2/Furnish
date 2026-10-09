const assert = require('node:assert/strict');
const {create} = require('../src/io/autosave.js');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; };
function setup(options={}){
  const statuses=[], failures=[], snapshots=[], tasks=[];
  let active={updatedAt:1,work:{name:'first'}}, cacheWrites=0, drops=0;
  const saver=create({
    now:()=>42,
    writeCache:json=>{cacheWrites++; if(options.cacheFails)throw Error('quota'); snapshots.push(JSON.parse(json));},
    dropHistoryCache:()=>{drops++; if(options.dropFails)throw Error('blocked');},
    writeStore:value=>{
      snapshots.push(JSON.parse(JSON.stringify(value)));
      if(options.syncFailure)throw Error('unavailable');
      const task=deferred();tasks.push(task);return task.promise;
    },
    isCurrent:(value,version)=>value===active && version===active.updatedAt,
    onChange:status=>statuses.push(status), onFailure:error=>failures.push(error),
  });
  return {saver,statuses,failures,snapshots,tasks,get active(){return active;},set active(value){active=value;},get cacheWrites(){return cacheWrites;},get drops(){return drops;}};
}
(async()=>{
  const a=setup(); const first=a.saver.save(a.active);
  assert.deepEqual(a.statuses,[{error:false,pending:false,savedAt:42}]);
  a.active.work.name='second';a.active.updatedAt=2;const second=a.saver.save(a.active);
  assert.equal(a.snapshots[0].work.name,'first');
  a.tasks[1].resolve();assert.deepEqual(await second,{cached:true,durable:true});
  const count=a.statuses.length;a.tasks[0].reject(Error('old failure'));await first;
  assert.equal(a.statuses.length,count);assert.equal(a.failures.length,0);

  const obsolete=setup({cacheFails:true});const older=obsolete.saver.save(obsolete.active);
  obsolete.active.updatedAt=2;const newer=obsolete.saver.save(obsolete.active);
  obsolete.tasks[1].reject(Error('latest failure'));await newer;
  obsolete.tasks[0].resolve();await older;
  assert.equal(obsolete.statuses.at(-1).error,true);assert.equal(obsolete.failures.length,1);

  const b=setup({cacheFails:true});const pending=b.saver.save(b.active);
  assert.equal(b.cacheWrites,2);assert.equal(b.drops,1);
  assert.deepEqual(b.statuses[0],{error:true,pending:true,savedAt:42});
  b.tasks[0].resolve();await pending;assert.equal(b.statuses.at(-1).error,false);

  const c=setup({cacheFails:true,dropFails:true,syncFailure:true});
  assert.deepEqual(await c.saver.save(c.active),{cached:false,durable:false});
  assert.equal(c.cacheWrites,1);assert.equal(c.failures.length,1);
  assert.deepEqual(c.statuses.at(-1),{error:true,pending:false,savedAt:42});

  const d=setup({syncFailure:true});await d.saver.save(d.active);
  assert.equal(d.statuses.at(-1).error,false);assert.equal(d.failures.length,0);

  // A replaced workspace may have the same timestamp as a pending write.
  const e=setup({cacheFails:true});const replaced=e.saver.save(e.active);
  e.active={updatedAt:1,work:{name:'replacement'}};
  e.tasks[0].reject(Error('obsolete'));await replaced;
  assert.equal(e.statuses.length,1);assert.equal(e.failures.length,0);

  // Invalidation also suppresses callbacks after erase, even if erase fails.
  const f=setup({cacheFails:true});const erased=f.saver.save(f.active);
  f.saver.invalidate();f.tasks[0].reject(Error('obsolete'));await erased;
  assert.equal(f.statuses.length,1);assert.equal(f.failures.length,0);
  const retried=f.saver.save(f.active);f.tasks[1].resolve();await retried;
  assert.equal(f.statuses.at(-1).error,false);

  // Cache eviction retries once without warning when the cache succeeds.
  let writes=0,drops=0;const statuses=[];
  const retry=create({writeCache:()=>{if(++writes===1)throw Error('quota');},dropHistoryCache:()=>drops++,writeStore:()=>Promise.reject(Error('offline')),isCurrent:()=>true,onChange:s=>statuses.push(s),onFailure:()=>assert.fail('cached save should not warn'),now:()=>7});
  await retry.save({updatedAt:1});assert.equal(writes,2);assert.equal(drops,1);assert.equal(statuses.at(-1).error,false);
  console.log('PASS autosave fallback, snapshots, obsolete callbacks and invalidation');
})().catch(error=>{console.error(error);process.exitCode=1;});
