/* Read-only progress for the floor-level / wall-tile setup guide. */
(function(root){
'use strict';
const T=()=>root.FurnishWallTiling||require('./wall-tiling-core.js'),finite=Number.isFinite,EPS=1e-6;
const steps=['确定厨房、阳台地面','设置卫生间高差','统一墙砖起铺高度','查看结果与空间核对'];
function inspect(plan,work){
 const eligible=plan.rooms.filter(r=>T().eligible(r,work.rooms?.[r.id])),faces=T().faces(plan,work);
 const rows=eligible.map(r=>{
  const use=work.rooms?.[r.id]?.use||r.use,s=work.floorFinishes?.areas[r.id],a=plan.floorFinish?.areas[r.id],available=faces.filter(f=>f.roomId===r.id),enabled=available.map(f=>T().record(work,f)).filter(v=>v&&v.enabled!==false);
  const known=!!s&&s.enabled!==false&&finite(a?.finishedZ),heights=enabled.map(v=>v.layout.reference==='survey'?v.layout.startHeight:known?a.finishedZ+v.layout.startHeight:undefined);
  const common=heights.length&&heights.every(v=>finite(v)&&Math.abs(v-heights[0])<=EPS)?heights[0]:null;
  return {id:r.id,name:work.rooms?.[r.id]?.name||r.name,use,rawZ:s?.rawZ??null,finishedZ:known?a.finishedZ:null,floorKnown:known,floorPending:a?.pending||(!s||s.enabled===false?'未启用地面设置':'标高待核对'),mode:s?.mode??null,reference:s?.reference??null,drop:s?.drop??null,
   referenceReady:known&&s.mode==='reference'&&finite(s.drop)&&finite(plan.floorFinish?.areas[s.reference]?.finishedZ),faces:available.length,enabled:enabled.length,wallZ:common,absolute:enabled.length>0&&enabled.every(v=>v.layout.reference==='survey'),
   patternKeys:enabled.map(v=>JSON.stringify([v.layout.angle===90?v.layout.width:v.layout.height,v.layout.gap]))};
 });
 const ordinary=rows.filter(r=>r.use!=='bathroom'),bathrooms=rows.filter(r=>r.use==='bathroom'),active=rows.filter(r=>r.enabled>0);
 const allActive=rows.some(r=>r.faces>0)&&rows.every(r=>r.enabled===r.faces),allAbsolute=active.length>0&&active.every(r=>r.absolute&&finite(r.wallZ)),uniform=allAbsolute&&active.every(r=>Math.abs(r.wallZ-active[0].wallZ)<=EPS);
 const ready=[ordinary.every(r=>r.floorKnown),bathrooms.every(r=>r.referenceReady),!!uniform];
 return {rows,ordinary,bathrooms,ready,firstPending:ready.findIndex(v=>!v)<0?3:ready.findIndex(v=>!v),allActive,uniform,commonWallZ:uniform?active[0].wallZ:null,patternsMatch:new Set(rows.flatMap(r=>r.patternKeys)).size<=1,
  availableFaces:rows.reduce((n,r)=>n+r.faces,0),enabledFaces:rows.reduce((n,r)=>n+r.enabled,0),stepNames:steps.slice()};
}
const api={inspect,steps};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFinishGuide=api;
})(typeof globalThis!=='undefined'?globalThis:this);
