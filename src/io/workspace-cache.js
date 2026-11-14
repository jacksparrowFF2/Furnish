/* Cache reads and v1 migration; access may throw on restricted browser origins. */
(function(root){
  'use strict';
  const versions=[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90];
  function candidates({read,key='huxing-design-v90'}){
    const version=Number(key.match(/^huxing-design-v(90|89|88|87|86|85|84|83|82|81|80|79|78|77|76|75|74|73|70|69|68|67|66|65|64|63|62|61|60|59|58|57|56|55|54|53|52|51|50|49|48|47|46|45|44|43|42|41|40|39|38|37|36|35|34|33|32|31|30|29|28|27|26|25|24|23|22|21|20|19|18|17|16|15|14|13|12|11|10|[2-9])$/)?.[1]),keys=version?Array.from({length:version-1},(_,i)=>'huxing-design-v'+(version-i)):[key],result=[];
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
    if(['huxing-design-v9','huxing-design-v10','huxing-design-v11','huxing-design-v12','huxing-design-v13','huxing-design-v14','huxing-design-v15','huxing-design-v16','huxing-design-v17','huxing-design-v18','huxing-design-v19','huxing-design-v20','huxing-design-v21','huxing-design-v22','huxing-design-v23','huxing-design-v24','huxing-design-v25','huxing-design-v26','huxing-design-v27','huxing-design-v28','huxing-design-v29','huxing-design-v30','huxing-design-v31','huxing-design-v32','huxing-design-v33','huxing-design-v34','huxing-design-v35','huxing-design-v36','huxing-design-v37','huxing-design-v38','huxing-design-v39','huxing-design-v40','huxing-design-v41','huxing-design-v42','huxing-design-v43','huxing-design-v44','huxing-design-v45','huxing-design-v46','huxing-design-v47','huxing-design-v48','huxing-design-v49','huxing-design-v50','huxing-design-v51','huxing-design-v52','huxing-design-v53','huxing-design-v54','huxing-design-v55','huxing-design-v56','huxing-design-v57','huxing-design-v58','huxing-design-v59','huxing-design-v60','huxing-design-v61','huxing-design-v62','huxing-design-v63','huxing-design-v64','huxing-design-v65','huxing-design-v66','huxing-design-v67','huxing-design-v68','huxing-design-v69','huxing-design-v70','huxing-design-v71','huxing-design-v72','huxing-design-v73','huxing-design-v74','huxing-design-v75','huxing-design-v76','huxing-design-v77','huxing-design-v78','huxing-design-v79','huxing-design-v80','huxing-design-v81','huxing-design-v82','huxing-design-v83','huxing-design-v84','huxing-design-v85','huxing-design-v86','huxing-design-v87','huxing-design-v88','huxing-design-v89','huxing-design-v90'].includes(key))previous.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
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
