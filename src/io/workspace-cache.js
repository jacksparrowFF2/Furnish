/* Cache reads and v1 migration; access may throw on restricted browser origins. */
(function(root){
  'use strict';
  const versions=[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29];
  function candidates({read,key='huxing-design-v29'}){
    const version=Number(key.match(/^huxing-design-v(29|28|27|26|25|24|23|22|21|20|19|18|17|16|15|14|13|12|11|10|[2-9])$/)?.[1]),keys=version?Array.from({length:version-1},(_,i)=>'huxing-design-v'+(version-i)):[key],result=[];
    for(const k of keys)try{const value=JSON.parse(read(k));if(versions.includes(value?.v))result.push(value);}catch{/* Restricted or malformed caches remain untouched. */}
    return result;
  }
  function load({read, firstPlan, restore, key = 'huxing-design-v2'}){
    // v7 and v8 were used independently on two branches. A new v9 cache is
    // authoritative; before it exists choose the newest legacy edit, not the
    // larger version. The repository client archives every divergent candidate.
    let primary;try{primary=JSON.parse(read(key));}catch{}
    if(versions.includes(primary?.v))return primary;
    const previous=candidates({read,key});
    if(['huxing-design-v9','huxing-design-v10','huxing-design-v11','huxing-design-v12','huxing-design-v13','huxing-design-v14','huxing-design-v15','huxing-design-v16','huxing-design-v17','huxing-design-v18','huxing-design-v19','huxing-design-v20','huxing-design-v21','huxing-design-v22','huxing-design-v23','huxing-design-v24','huxing-design-v25','huxing-design-v26','huxing-design-v27','huxing-design-v28','huxing-design-v29'].includes(key))previous.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    if(previous.length)return previous[0];
    const workspace = {v:2, planId:firstPlan.id, work:{}, designs:[]};
    try {
      const legacy = JSON.parse(read('huxing-design-v1'));
      if(legacy && Array.isArray(legacy.furniture)) workspace.work[firstPlan.id] = restore(legacy,firstPlan);
    } catch(e) { /* Invalid legacy data must not prevent startup. */ }
    return workspace;
  }
  const api = {load,candidates};
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.FurnishWorkspaceCache = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
