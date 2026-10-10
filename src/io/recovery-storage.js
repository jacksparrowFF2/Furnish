(function(root){
  'use strict';
  const project=typeof module==='object'&&module.exports?require('../core/project-core.js'):root.FurnishProject;
  function readCache(read){try{return project.historyEntries(JSON.parse(read())||[]);}catch(e){return [];}}
  function merge(entries,saved){
    const valid=(Array.isArray(saved)?saved:[]).filter(h=>{try{project.validateWork(h.data);return true;}catch(e){return false;}});
    return project.historyEntries([...entries,...valid]);
  }
  function create({writeCache,writeStore,isCurrent,onChange}){
    let generation=0;
    function invalidate(){generation++;}
    function persist(entries){
      const token=++generation;let cached=true;
      try{writeCache(JSON.stringify(entries));}catch(e){cached=false;}
      const current=()=>token===generation&&isCurrent(entries);
      if(current())onChange(!cached);
      let task;try{task=writeStore(entries);}catch(e){task=Promise.reject(e);}
      return Promise.resolve(task).then(()=>{if(current())onChange(false);},()=>{if(current())onChange(!cached);});
    }
    return {persist,invalidate};
  }
  const api={readCache,merge,create};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishRecoveryStorage=api;
})(typeof globalThis!=='undefined'?globalThis:this);
