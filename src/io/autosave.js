/* Cache-first autosave coordination; storage and UI are supplied by the caller. */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory();
  else root.FurnishAutosave = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';
  function create({writeCache, dropHistoryCache, writeStore, isCurrent, onChange, onFailure, now = Date.now}){
    let generation = 0;
    function invalidate(){ generation++; }
    function save(value){
      const token = ++generation, version = value.updatedAt;
      const json = JSON.stringify(value), savedAt = now();
      let cached = false;
      try { writeCache(json); cached = true; }
      catch(e){
        try { dropHistoryCache(); writeCache(json); cached = true; }
        catch(retryError) { /* The durable store can still save this version. */ }
      }
      const current = () => token === generation && isCurrent(value, version);
      const publish = (error, pending) => {
        if(current()) onChange({error, pending, savedAt});
      };
      publish(!cached, !cached);
      // Invoke immediately: the storage adapter snapshots the mutable workspace.
      let task;
      try { task = writeStore(value); }
      catch(e) { task = Promise.reject(e); }
      return Promise.resolve(task).then(() => {
        publish(false, false);
        return {cached, durable:true};
      }, error => {
        publish(!cached, false);
        if(!cached && current()) onFailure(error);
        return {cached, durable:false};
      });
    }
    return {save, invalidate};
  }
  return {create};
});
