/* Conservative, explicit relocation proposals. Never mutate the source work. */
(function(root){
'use strict';
function suggest(plan,work,id){
 plan=(root.FurnishWallFinish||require('./wall-finish-core.js')).spatial(plan);
 const P=root.FurnishProject||require('./project-core.js'),D=root.FurnishDesign||require('./design-core.js'),f=work.furniture.find(v=>v.id===id);
 if(!f||f.locked||(root.FurnishLayers||require('./layers-core.js')).locked(work,'furniture:'+f.id)||f.groupId||f.kitchen||f.counterLink||work.furniture.some(v=>v.counterLink?.hostId===id)||D.laundryStack(f,work.furniture)||work.furniture.some(v=>D.laundryStack(v,work.furniture)?.lowerId===id)) return null;
 const poly=P.polygon(f),dx=Math.max(...poly.map(p=>Math.abs(p[0]-f.cx))),dy=Math.max(...poly.map(p=>Math.abs(p[1]-f.cy))),candidates=[];
 for(const r of plan.rooms.filter(r=>r.counted!==false)){const xs=r.poly.map(p=>p[0]),ys=r.poly.map(p=>p[1]),x0=Math.min(...xs)+dx+10,x1=Math.max(...xs)-dx-10,y0=Math.min(...ys)+dy+10,y1=Math.max(...ys)-dy-10;if(x1<x0||y1<y0)continue;
  const near=[Math.max(x0,Math.min(x1,f.cx)),Math.max(y0,Math.min(y1,f.cy))];
  for(const [cx,cy] of [near,[(x0+x1)/2,(y0+y1)/2],[x0,y0],[x1,y0],[x0,y1],[x1,y1]]){const next={...f,cx,cy};if(Math.hypot(cx-f.cx,cy-f.cy)<.1||!P.fitsInRooms([r],P.polygon(next)))continue;candidates.push({cx,cy,room:r.name,distance:Math.hypot(cx-f.cx,cy-f.cy)});}
 }
 candidates.sort((a,b)=>a.distance-b.distance);
 const baseline=new Set(P.spaceCheck(plan,work.furniture,{passage:work.spaceThreshold||800}).map(v=>JSON.stringify(v)));
 for(const candidate of candidates){const furniture=work.furniture.map(v=>v.id===id?{...v,cx:candidate.cx,cy:candidate.cy}:v),issues=P.spaceCheck(plan,furniture,{focusId:id,scanPassages:false});if(issues.length)continue;
  const all=P.spaceCheck(plan,furniture,{passage:work.spaceThreshold||800});if(all.some(v=>!baseline.has(JSON.stringify(v))))continue;
  return {id,from:{cx:f.cx,cy:f.cy},...candidate};
 }
 return null;
}
const api={suggest};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishPlacementSuggestions=api;
})(typeof globalThis!=='undefined'?globalThis:this);
