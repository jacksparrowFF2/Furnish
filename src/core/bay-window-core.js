/* Shared window overrides and bay assemblies. Editing inputs use mm; plan heights use metres. */
(function(root){
 'use strict';
 function list(plan){
  return (plan.rooms||[]).filter(r=>r.counted===false&&r.bayId).map(platform=>{
   const windows=(plan.wins||[]).map((window,index)=>({window,index})).filter(v=>v.window.bayId===platform.bayId);
   const opening=plan.customDraft?.openings.find(o=>o.id===platform.bayId&&o.bay),points=[...platform.poly,...windows.flatMap(v=>[[v.window.rect[0],v.window.rect[1]],[v.window.rect[2],v.window.rect[3]]])];
   return {id:platform.bayId,platform,windows,opening,type:opening?.bay.type||platform.bayType||'three-sided',bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]};
  }).filter(b=>b.windows.length);
 }
 function selected(plan,selection){return list(plan).find(b=>selection?.kind==='room'?b.platform.id===selection.id:selection?.kind==='win'&&b.windows.some(w=>w.index===selection.id));}
 // Both the live canvas and independent project plans read the same overrides.
 // Generated bays take their vertical geometry from the architectural opening;
 // per-face overrides may change style but cannot split the shared sill height.
 function applyWindows(plan,overrides={}){
  overrides=overrides||{};
  for(const r of plan.rooms||[])if(r.counted===false&&r._height0!==undefined)r.height=r._height0;
  (plan.wins||[]).forEach((w,i)=>{
   const v=overrides[i];w.sill=w._sill0??w.sill;w.head=w._head0??w.head??2.4;w.panels=w._panels0??w.panels??0;w.stackSide=w._stackSide0??w.stackSide??'left';
   if(typeof v==='number')w.sill=v;else if(v){if(Number.isFinite(v.sill))w.sill=v.sill;if(Number.isFinite(v.head))w.head=v.head;if(v.panels!==undefined)w.panels=v.panels;if(v.stackSide!==undefined)w.stackSide=v.stackSide;}
  });
  for(const b of list(plan)){
   const source=b.opening?{sill:b.opening.bay.height/1000,head:b.opening.bay.head/1000}:(b.windows.findLast(v=>overrides[v.index]!==undefined)||b.windows[0]).window;
   const {sill,head}=source;for(const v of b.windows){v.window.sill=sill;v.window.head=head;}b.platform.height=sill;
  }
  return plan;
 }
 function geometryLocked(work,plan,id){
  const b=list(plan).find(v=>v.id===id);if(!b)return true;
  if((root.FurnishLayers||require('./layers-core.js')).locked(work,'floor:'+b.platform.id))return true;
  const a=work.architecture;if(a?.phase!=='design')return false;
  return b.windows.some(v=>{const o=a.draft.openings.find(o=>o.id===plan.winRefs?.[v.index]||o.id===b.id&&o.bay);return a.draft.walls.find(w=>w.id===o?.wall)?.kind!=='n';});
 }
 function setHeights(work,plan,id,sill,head){
  if(!Number.isFinite(sill)||!Number.isFinite(head)||sill<0||sill>2400||head-sill<100||head>2800)throw Error('台面高度须为 0–2400 mm，窗高至少 100 mm，窗顶不超过 2800 mm');
  const b=list(plan).find(v=>v.id===id);if(!b)throw Error('飘窗不存在');
  if(geometryLocked(work,plan,id))throw Error('飘窗结构或台面图层已锁定');
  if(b.opening)throw Error('建筑飘窗请通过洞口编辑');
  if(work.architecture){
   const D=root.FurnishDraft||require('./floorplan-core.js'),P=root.FurnishProject||require('./project-core.js'),ref=plan.winRefs[b.windows[0].index];
   const draft=D.editOpening(work.architecture.draft,ref,{sill,head}),open=P.remapOpenings(plan,D.build(draft),work.open||{});
   work.architecture={...work.architecture,draft};work.open=open;return;
  }
  work.open??={};work.open.w??={};for(const {window,index} of b.windows)work.open.w[index]={sill:sill/1000,head:head/1000,panels:window.panels??0,stackSide:window.stackSide||'left'};
 }
 const api={list,selected,applyWindows,geometryLocked,setHeights};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishBayWindows=api;
})(typeof globalThis!=='undefined'?globalThis:this);
