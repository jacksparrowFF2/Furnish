/* Portable workspace validation and stable serialization, shared by browser/Node. */
(function(root,factory){
 'use strict';const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishRepositoryCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v));
 function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
 function portable(input){const w=clone(input);delete w._repository;delete w.updatedAt;return canonical(w);}
 const version=input=>[...Object.values(input.work||{}),...(input.designs||[]).map(d=>d.work)].some(w=>(root.FurnishWallFinish||require('./wall-finish-core.js')).has(w))?2:1;
 const text=input=>JSON.stringify({format:'furnish-workspace',version:version(input),workspace:portable(input)},null,2)+'\n';
 function validate(input){
  const w=clone(input),P=root.FurnishProject||require('./project-core.js'),plans=root.FurnishPlans||require('../data/plans.js');
  if(!w||w.v!==2||!w.work||typeof w.work!=='object'||Array.isArray(w.work)||typeof w.planId!=='string'||!Array.isArray(w.designs)||Object.keys(w.work).length>200||w.designs.length>20000)throw Error('工作区结构无效');
  const drafts=w.customPlans||[],ids=new Set();if(!Array.isArray(drafts)||drafts.length>200)throw Error('自定义户型列表无效');
  for(const d of drafts){if(!d||typeof d.id!=='string'||ids.has(d.id)||plans.some(p=>p.id===d.id&&!p.customDraft))throw Error('自定义户型编号无效或重复');ids.add(d.id);}
  for(const [id,work] of Object.entries(w.work)){
   if(!/^[a-zA-Z0-9_-]{1,200}$/.test(id))throw Error('工作区户型编号无效');
   const designs=w.designs.filter(d=>d.planId===id),payload={planId:id,current:work,designs,catalog:w.custom||[]};
   const checked=P.unpack(P.pack(payload));P.previewPlan(checked,plans);P.validatePlanWork(P.previewPlan(checked,plans),checked.current);
   for(const d of checked.designs)P.validatePlanWork(P.previewPlan({...checked,current:d.work},plans),d.work);
   if(work.architecture&&!ids.has(id))throw Error('自定义户型未登记');
  }
  if(!Object.hasOwn(w.work,w.planId)||w.designs.some(d=>!d||!Object.hasOwn(w.work,d.planId))||drafts.some(d=>!w.work[d.id]?.architecture))throw Error('工作区引用了缺失的户型');
  return w;
 }
 function parse(value){if(value?.format!=='furnish-workspace'||![1,2].includes(value.version))throw Error('不支持的工作区文件版本');return validate(value.workspace);}
 function decision(revision,cacheRevision,cacheFingerprint,cleanFingerprint=cacheRevision){
  if(!revision)return 'migrate';if(cacheFingerprint===revision)return 'file';
  if(cleanFingerprint&&cacheFingerprint===cleanFingerprint)return 'file';
  if(cacheRevision===revision)return 'resume';return 'conflict';
 }
 return {portable,text,validate,parse,decision};
});
