/* Cache reads and v1 migration; access may throw on restricted browser origins. */
(function(root){
  'use strict';
  function load({read, firstPlan, restore, key = 'huxing-design-v2'}){
    try {
      const saved = JSON.parse(read(key));
      if(saved && [2,3,4,5,6].includes(saved.v)) return saved;
    } catch(e) { /* A missing or unreadable cache falls back to migration. */ }
    const previousKeys=key==='huxing-design-v6'?['huxing-design-v5','huxing-design-v4','huxing-design-v3','huxing-design-v2']:key==='huxing-design-v5'?['huxing-design-v4','huxing-design-v3','huxing-design-v2']:key==='huxing-design-v4'?['huxing-design-v3','huxing-design-v2']:key==='huxing-design-v3'?['huxing-design-v2']:[];
    for(const previousKey of previousKeys)try{const previous=JSON.parse(read(previousKey));if([2,3,4,5].includes(previous?.v))return previous;}catch{}
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
