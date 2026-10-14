/* Net wall distances and atomic orthogonal edits, in mm at the public boundary. */
(function(root){
'use strict';
const D=()=>root.FurnishDraft||require('./floorplan-core.js'),G=()=>root.FurnishZoneGeometry||require('./zone-geometry.js');
const axis=w=>w.a[0]===w.b[0]?0:1,span=(w,s)=>[Math.min(w.a[1-axis(w)],w.b[1-axis(w)])*s,Math.max(w.a[1-axis(w)],w.b[1-axis(w)])*s];
function distances(d,id){
 const w=d.walls.find(w=>w.id===id);if(!w)return [];const n=axis(w),s=d.scale,r=span(w,s),rooms=D().build(d).rooms.filter(r=>r.counted!==false),result=[];
 for(const side of [-1,1]){
  const candidates=d.walls.filter(v=>v.id!==id&&axis(v)===n&&Math.sign(v.a[n]-w.a[n])===side).map(v=>{const vspan=span(v,s),lo=Math.max(r[0],vspan[0]),hi=Math.min(r[1],vspan[1]),distance=Math.abs(v.a[n]-w.a[n])*s-(w.thickness+v.thickness)/2,along=(lo+hi)/2,from=[],to=[];from[n]=w.a[n]*s+side*w.thickness/2;to[n]=v.a[n]*s-side*v.thickness/2;from[1-n]=to[1-n]=along;return {wallId:id,referenceId:v.id,distance,from,to,side,overlap:hi-lo};}).filter(v=>v.overlap>=100&&v.distance>=100&&rooms.some(r=>G().inside(v.from.map((a,i)=>(a+v.to[i])/2),r.poly))).sort((a,b)=>a.distance-b.distance);
  if(candidates[0])result.push(candidates[0]);
 }
 return result;
}
function edit(input,id,referenceId,distance,baseline){
 if(!Number.isFinite(distance)||distance<100||distance>50000)throw Error('净距须为 100–50000 mm');
 const ref=distances(input,id).find(v=>v.referenceId===referenceId);if(!ref)throw Error('参考墙间净距已改变，请重新选择');
 const before=D().build(input),next=JSON.parse(JSON.stringify(input)),w=next.walls.find(v=>v.id===id),fixed=next.walls.find(v=>v.id===referenceId),n=axis(w),s=next.scale,old=w.a[n],target=fixed.a[n]-ref.side*(distance+(w.thickness+fixed.thickness)/2)/s,range=span(w,s),changed=new Set([id]);
 if(baseline&&w.kind!=='n')throw Error('已确认的承重墙和外墙不能移动');
 for(const v of input.walls){if(v.id===id||axis(v)!==n)continue;const a=span(v,s);if(Math.min(range[1],a[1])-Math.max(range[0],a[0])>0&&v.a[n]>Math.min(old,target)&&v.a[n]<Math.max(old,target))throw Error('移动路径越过其他平行墙，请在户型编辑器调整');}
 for(const v of next.walls){if(v.id===id)continue;
  if(axis(v)===n&&Math.abs(v.a[n]-old)<1e-7&&v.a.some((x,i)=>Math.abs(x-w.a[i])<1e-7)&&[v.a,v.b].some(p=>[w.a,w.b].some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-7)))throw Error('相连的同向墙段请在户型编辑器一起调整');
  if(axis(v)!==n)for(const key of ['a','b']){const p=v[key];if(Math.abs(p[n]-old)<1e-7&&p[1-n]*s>=range[0]-1e-6&&p[1-n]*s<=range[1]+1e-6){p[n]=target;changed.add(v.id);}}
 }
 w.a[n]=w.b[n]=target;
 for(const o of next.openings){if(!changed.has(o.wall)||o.wall===id)continue;const previous=input.walls.find(v=>v.id===o.wall),current=next.walls.find(v=>v.id===o.wall),a=1-axis(previous),center=previous.a[a]+(previous.b[a]-previous.a[a])*o.t;o.t=(center-current.a[a])/(current.b[a]-current.a[a]);}
 for(const o of next.openings){if(!changed.has(o.wall))continue;const host=next.walls.find(v=>v.id===o.wall),length=Math.hypot(host.b[0]-host.a[0],host.b[1]-host.a[1])*s;if(o.t*length-o.length/2<-.01||o.t*length+o.length/2>length+.01)throw Error('连接墙缩短后门窗超出墙段，请先调整洞口');}
 const after=D().build(next);if(after.rooms.filter(r=>r.counted!==false).length!==before.rooms.filter(r=>r.counted!==false).length)throw Error('修改会改变房间连通关系，请在户型编辑器调整');
 if(baseline){const locked=d=>({...d,walls:d.walls.map(v=>({...v,kind:v.kind==='e'?'b':v.kind}))});D().assertBearingUnchanged(locked(baseline),locked(next));}
 return {draft:next,changed:[...changed],before,after};
}
const api={distances,edit};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWallDistance=api;
})(typeof globalThis!=='undefined'?globalThis:this);
