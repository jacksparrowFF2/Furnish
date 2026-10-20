/* Placed furniture browsing and atomic metadata edits; no DOM or app state. */
(function(root){
 'use strict';
 const get=(name,file)=>root[name]||require('./'+file+'.js');
 const layers=()=>get('FurnishLayers','layers-core'),project=()=>get('FurnishProject','project-core');
 const geometry=()=>get('FurnishGeometry','layout-geometry'),zones=()=>get('FurnishZoneGeometry','zone-geometry');
 const clone=v=>JSON.parse(JSON.stringify(v)),fail=m=>{throw Error(m);};
 function roomKey(f,plan){
  const G=geometry(),Z=zones();
  const room=(plan.rooms||[]).find(r=>(r.polys||(r.rings?[Z.ringPath(r.rings)]:[r.poly])).some(poly=>poly?.length&&G.inPoly(f.cx,f.cy,poly)));
  if(room)return 'room:'+room.id;
  const points=plan.walls?.length?plan.walls.flatMap(w=>[[w[0],w[1]],[w[2],w[3]]]):(plan.rooms||[]).flatMap(r=>r.polys?.flat()||r.rings?.flat()||r.poly||[]);
  if(points.length){const [x0,y0,x1,y1]=G.bbox(points);if(f.cx<x0||f.cx>x1||f.cy<y0||f.cy>y1)return 'outside';}
  return 'unassigned';
 }
 function rows(plan,work){
  const L=layers(),P=project();
  return (work.furniture||[]).map(f=>{
   const room=roomKey(f,plan),id=room.startsWith('room:')?room.slice(5):null,r=(plan.rooms||[]).find(r=>r.id===id),layer=L.layer(work,L.furnitureKey(f));
   return {id:f.id,furniture:f,room,roomName:id?(work.rooms?.[id]?.name||r.name):room==='outside'?'户型外':'未归属房间',layer,status:Object.hasOwn(P.purchaseStates,f.purchaseStatus)?f.purchaseStatus:'planned',locked:!!f.locked||layer.locked};
  });
 }
 function filter(rows,{room='all',query=''}={},localize=v=>v){
  const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean),P=project();
  return rows.filter(r=>{
   const f=r.furniture,text=[f.name,localize(f.name),f.brand,f.model,r.roomName,localize(r.roomName),r.layer.name,r.status,P.purchaseStates[r.status]].join(' ').toLowerCase();
   return (room==='all'||r.room===room)&&words.every(w=>text.includes(w));
  });
 }
 function apply(work,ids,operation){
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string')||!operation)fail('请勾选需要管理的家具');
  const selected=new Set(ids),items=work.furniture.filter(f=>selected.has(f.id)),L=layers();
  if(items.length!==ids.length)fail('勾选家具已变更，请重新选择');
  let next;
  if(operation.kind==='layer')next=L.assign(work,items.map(L.furnitureKey),operation.layerId);
  else if(operation.kind==='purchase'){
   if(!Object.hasOwn(project().purchaseStates,operation.status))fail('采购状态无效');
   next=project().updatePurchaseGroup(work,ids,{purchaseStatus:operation.status});
  }else if(operation.kind==='lock'){
   if(typeof operation.locked!=='boolean')fail('锁定状态无效');
   if(items.some(f=>L.locked(work,L.furnitureKey(f))))fail('物体所在图层已锁定，请先在图层管理中解锁');
   next=clone(work);for(const f of next.furniture)if(selected.has(f.id)){if(operation.locked)f.locked=true;else delete f.locked;}
  }else fail('不支持的家具管理操作');
  L.assertEditable(work,next);return next;
 }
 const api={roomKey,rows,filter,apply};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFurnitureManagement=api;
})(typeof globalThis!=='undefined'?globalThis:this);
