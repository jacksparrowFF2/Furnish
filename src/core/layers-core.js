/* Named object layers. Missing assignments and legacy work resolve to layer 0. */
(function(root){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),zero=()=>({id:'0',name:'0',visible:true,locked:false});
 const bad=m=>{throw Error(m);},record=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const safe=v=>typeof v==='string'&&v.length>0&&v.length<=500&&!['__proto__','constructor','prototype'].includes(v);
 function validate(data){
  if(data===undefined)return;
  if(!record(data)||data.version!==1||Object.keys(data).some(k=>!['version','layers','assignments'].includes(k))||!Array.isArray(data.layers)||!data.layers.length||data.layers.length>200||!record(data.assignments)||Object.keys(data.assignments).length>10000)bad('图层数据无效');
  const ids=new Set(),names=new Set();for(const l of data.layers){
   if(!record(l)||Object.keys(l).some(k=>!['id','name','visible','locked'].includes(k))||!safe(l.id)||l.id.length>100||ids.has(l.id)||typeof l.name!=='string'||!l.name.trim()||l.name!==l.name.trim()||l.name.length>80||names.has(l.name)||typeof l.visible!=='boolean'||typeof l.locked!=='boolean'||l.id==='0'&&l.name!=='0'||l.id!=='0'&&l.name==='0')bad('图层名称或编号无效（名称不可重复，0 图层必须保留）');
   ids.add(l.id);names.add(l.name);
  }
  if(!ids.has('0'))bad('必须保留 0 图层');
  for(const [key,id]of Object.entries(data.assignments)){
   if(!safe(key)||!/^(furniture|floor|wallTile|ceiling|roomCeiling):.+/.test(key)||typeof id!=='string'||!ids.has(id))bad('物体图层分配无效');
   if(key.startsWith('wallTile:')){let a;try{a=JSON.parse(key.slice(9));}catch{bad('墙砖图层绑定无效');}if(!Array.isArray(a)||a.length!==5||!safe(a[0])||![-1,1].includes(a[1])||typeof a[2]!=='boolean'||![a[3],a[4]].every(n=>typeof n==='number'&&Number.isFinite(n))||a[3]<0||a[4]>1||a[4]<=a[3])bad('墙砖图层绑定无效');}
  }
 }
 const list=work=>work.objectLayers?.layers||[zero()];
 const layerId=(work,key)=>work.objectLayers?.assignments[key]||'0';
 const layer=(work,key)=>list(work).find(l=>l.id===layerId(work,key))||zero();
 const visible=(work,key)=>layer(work,key).visible;
 const locked=(work,key)=>layer(work,key).locked;
 const furnitureKey=f=>'furniture:'+f.id;
 const faceKey=f=>'wallTile:'+JSON.stringify([f.wallId,f.side,!!f.cross,...f.range.map(n=>Number(n.toFixed(6)))]);
 function edit(work,fn){const next=clone(work);next.objectLayers??={version:1,layers:[zero()],assignments:{}};fn(next.objectLayers,next);validate(next.objectLayers);return next;}
 function create(work,id,name){return edit(work,d=>d.layers.push({id,name:name.trim(),visible:true,locked:false}));}
 function update(work,id,values){return edit(work,d=>{const l=d.layers.find(l=>l.id===id);if(!l)bad('图层不存在');if(id==='0'&&values.name!==undefined&&values.name!=='0')bad('0 图层不能重命名');Object.assign(l,values);});}
 function remove(work,id){if(id==='0')bad('0 图层不能删除');return edit(work,d=>{if(!d.layers.some(l=>l.id===id))bad('图层不存在');d.layers=d.layers.filter(l=>l.id!==id);for(const k of Object.keys(d.assignments))if(d.assignments[k]===id)delete d.assignments[k];});}
 function assign(work,keys,id){if(!list(work).some(l=>l.id===id))bad('图层不存在');if(list(work).find(l=>l.id===id).locked)bad('目标图层已锁定，请先解锁');for(const k of keys)if(locked(work,k))bad('原图层已锁定，请先解锁');return edit(work,d=>{for(const k of keys){if(id==='0')delete d.assignments[k];else d.assignments[k]=id;}});}
 function onlyChange(a,b){const strip=w=>{const v={...w};delete v.objectLayers;return JSON.stringify(v);};return strip(a)===strip(b);}
 function objectValue(work,key){
  const [kind,...parts]=key.split(':'),id=parts.join(':');
  if(kind==='furniture')return work.furniture?.find(f=>f.id===id);
  if(kind==='floor')return [work.floorFinishes?.areas?.[id],work.rooms?.[id]?.mat,work.tileGrout?.rooms?.[id]?.floor];
  if(kind==='wallTile'){const surfaces=work.wallTiling?.surfaces?.filter(s=>faceKey(s)===key),roomId=surfaces?.[0]?.roomId,override=work.tileGrout?.walls?.find(s=>faceKey(s)===key);return [surfaces,work.wallFinishes?.surfaces?.filter(s=>faceKey(s)===key),override||work.tileGrout?.rooms?.[roomId]?.wall];}
  if(kind==='ceiling')return work.ceilings?.items?.find(c=>c.id===id);
  if(kind==='roomCeiling')return [work.rooms?.[id]?.ceilingHeight,work.ceilingHeight];
 }
 function assertEditable(before,after){
  // Explicit layer management and whole-project restoration have separate semantics.
  if(onlyChange(before,after))return;
  const keys=new Set([...(before.furniture||[]).map(furnitureKey),...Object.keys(before.objectLayers?.assignments||{})]);
  if(list(before).find(l=>l.id==='0')?.locked){
   for(const id of Object.keys(before.rooms||{})){keys.add('floor:'+id);keys.add('roomCeiling:'+id);}
   for(const s of before.wallTiling?.surfaces||[])keys.add(faceKey(s));
   for(const c of before.ceilings?.items||[])keys.add('ceiling:'+c.id);
  }
  for(const k of keys)if(locked(before,k)&&JSON.stringify(objectValue(before,k))!==JSON.stringify(objectValue(after,k)))bad('物体所在图层已锁定，请先在图层管理中解锁');
 }
 function copyAssignments(work,sourceKeys,targetKeys,{layerIds}={}){
  const next=clone(work);if(!next.objectLayers)return next;
  sourceKeys.forEach((k,i)=>{const id=layerIds?.[i]??layerId(work,k);if(id!=='0'&&list(work).some(l=>l.id===id))next.objectLayers.assignments[targetKeys[i]]=id;else delete next.objectLayers.assignments[targetKeys[i]];});return next;
 }
 function remapBuiltin(work,before,after,shift){
  if(!work.objectLayers)return;const W=root.FurnishWallFinish||require('./wall-finish-core.js'),assignments={};
  for(const [key,id]of Object.entries(work.objectLayers.assignments)){
   if(!key.startsWith('wallTile:')){assignments[key]=id;continue;}
   const [wallId,side,cross,lo,hi]=JSON.parse(key.slice(9)),fake={wallFinishes:{version:1,surfaces:[{wallId,side,range:[lo,hi],...(cross?{cross:true}:{})}]}};
   W.remapBuiltin(fake,before,after,shift);for(const face of fake.wallFinishes.surfaces)assignments[faceKey(face)]=id;
  }
  work.objectLayers.assignments=assignments;validate(work.objectLayers);
 }
 const api={validate,list,layerId,layer,visible,locked,furnitureKey,faceKey,create,update,remove,assign,onlyChange,assertEditable,copyAssignments,remapBuiltin};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishLayers=api;
})(typeof globalThis!=='undefined'?globalThis:this);
