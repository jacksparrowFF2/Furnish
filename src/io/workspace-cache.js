/* Cache reads and v1 migration; access may throw on restricted browser origins. */
(function(root){
  'use strict';
  function load({read, firstPlan, restore, key = 'huxing-design-v2'}){
    try {
      const saved = JSON.parse(read(key));
      if(saved && [2,3].includes(saved.v)) return saved;
    } catch(e) { /* A missing or unreadable cache falls back to migration. */ }
    if(key === 'huxing-design-v3'){try{const previous=JSON.parse(read('huxing-design-v2'));if(previous?.v===2)return previous;}catch{}}
    const workspace = {v:2, planId:firstPlan.id, work:{}, designs:[]};
    try {
      const legacy = JSON.parse(read('huxing-design-v1'));
      if(legacy && Array.isArray(legacy.furniture)) workspace.work[firstPlan.id] = restore(legacy,firstPlan);
    } catch(e) { /* Invalid legacy data must not prevent startup. */ }
    return workspace;
  }
  const api = {load};
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.FurnishWorkspaceCache = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
