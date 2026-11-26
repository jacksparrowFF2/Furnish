/* Surface-linked product selections are carried by the existing project attachments. */
(function(root){
'use strict';
const assetName='furnish-material-selections.json';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?
 Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const key=target=>JSON.stringify(canonical(target));
function appearance(work,t){
 const S=root.FurnishStyles||require('./style-core.js'),look=work.styleAppearance||{},f=work.furniture?.find(item=>item.id===t.id);
 if(t.kind==='floor')return [work.rooms?.[t.id]?.mat,look.floorSamples?.[t.id],S.surfaceColor(work,'floor',t.id),S.floorTileSheen(work,t.id)];
 if(t.kind==='wall')return look.wallPaint?.[S.wallKey(t.id,t.side)]??null;
 if(t.kind==='wallTile')return S.wallTileMaterial(work,t.face)??null;
 if(t.kind==='door')return look.doorFinishes?.[t.id]??null;
 if(t.kind==='frame'||t.kind==='bay')return S.surfaceColor(work,t.kind,t.id);
 const box=f?.cabinet?.boxes?.find(item=>item.id===t.boxId),part=t.componentId?box?.components.find(item=>item.id===t.componentId):box;
 return [f?.color,f?.cabinet?.appearance??f?.kitchen?.appearance,part?.surface,part?.color,f?.cabinet?.columns?.[t.column]?.doorColor];
}
const fromAsset=asset=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0))));
function data(work){
 const asset=work.assets?.find(value=>value.name===assetName);
 if(!asset)return [];
 const value=fromAsset(asset);
 if(value?.version!==1||!Array.isArray(value.items)||value.items.length>300)throw Error('材料选型附件格式无效');
 for(const row of value.items)if(!row?.target?.kind||!row.target.id||!row.product?.name||!row.product.sku)throw Error('材料选型附件缺少表面或商品身份');
 return value.items;
}
function apply(work,selections){
 const rows=new Map(data(work).map(row=>[key(row.target),row])),seen=new Set();
 for(const {target,product} of selections){
  const id=key(target);
  if(seen.has(id))throw Error('材料选型表面重复');
  seen.add(id);
  if(product===null){rows.delete(id);continue;}
  const {sourceUrl,width,length,pack}=product;
  if(sourceUrl){const url=new URL(sourceUrl);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('材料来源须为无账号密码的 HTTP(S) 地址');}
  if((width===undefined)!==(length===undefined)||pack!==undefined&&(!Number.isInteger(pack)||!width))throw Error('材料规格长宽须成对，每箱片数须配套尺寸且为整数');
  rows.set(id,{target,product,appearance:JSON.stringify(canonical(appearance(work,target)))??'null'});
 }
 if(rows.size>300)throw Error('每份方案最多记录 300 处材料选型');
 const assets=(work.assets||[]).filter(asset=>asset.name!==assetName);
 if(rows.size){
  if(assets.length>=5)throw Error('项目附件已达上限，无法写入材料选型');
  const bytes=new TextEncoder().encode(JSON.stringify({version:1,items:[...rows.values()]})),chunks=[];
  for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
  assets.push({name:assetName,data:btoa(chunks.join(''))});
 }
 if(assets.length)work.assets=assets;else delete work.assets;
}
function report(plan,work){
 const entries=data(work),limit='按完成面净面积估算及按采购规格分组取整。已发订单和正式报价沿原台账。出图时核对裁切、余料和实际包装。';
 if(!entries.length)return {items:[],totals:[],limit};
 const G=root.FurnishGeometry||require('./layout-geometry.js'),W=root.FurnishWallFinish||require('./wall-finish-core.js'),
  T=root.FurnishWallTiling||require('./wall-tiling-core.js'),P=root.FurnishProject||require('./project-core.js');
 const faces=entries.some(row=>row.target.kind==='wall'||row.target.kind==='wallTile')?W.faces(plan):[],spatial=W.spatial(plan),
  waste=P.pricing(work.pricing).floorWaste,quantity=(area,product)=>P.materialQuantity(area,{
   floorWaste:product.waste??waste,
   ...(product.width?{materialSpecs:{item:{length:product.length,width:product.width,pack:product.pack}}}:{})
  },'item');
 const items=entries.map(row=>{
  const {target:t,product}=row;
  let area=null,finish=null,status='needs-measurement';
  if(t.kind==='floor'){
   const room=spatial.rooms.find(room=>room.id===t.id);
   status=room?'estimated':'surface-missing';
   if(room){
    area=G.area(room.poly);
    finish=work.rooms?.[t.id]?.mat??room.mat;
   }
  }else if(t.kind==='wallTile'||t.kind==='wall'){
   const available=faces.filter(face=>t.kind==='wallTile'?T.same(face,t.face):face.wallId===t.id&&face.side===t.side&&!face.cross);
   status=available.length?'estimated':'surface-missing';
   if(available.length)area=available.reduce((sum,face)=>sum+T.elevation(plan,work,face).sections.reduce((n,[x,z,X,Z])=>n+(X-x)*(Z-z),0)/1e6,0);
   if(t.kind==='wallTile'&&!plan.wallTiling?.surfaces.some(surface=>T.same(surface.face,t.face)))status='surface-missing';
  }
  if(status!=='surface-missing'&&row.appearance!==undefined&&row.appearance!==(JSON.stringify(canonical(appearance(work,t)))??'null'))status='appearance-changed';
  return {...row,area,status,finish,...(status==='estimated'&&area!==null?{estimate:quantity(area,product)}:{})};
 });
 const groups=new Map();
 for(const row of items){
  if(row.status!=='estimated'||row.area===null)continue;
  const {sku,name,length,width,pack,waste,sourceUrl}=row.product,
   id=JSON.stringify([sku,length,width,pack,waste,sourceUrl]),group=groups.get(id)||{sku,name,sourceUrl,area:0,length,width,pack,waste};
  group.area+=row.area;groups.set(id,group);
 }
 const totals=[...groups.values()].map(row=>({...row,estimate:quantity(row.area,row)}));
 return {items,totals,limit};
}
const api={canonical,fromAsset,apply,report};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishMaterialSchedule=api;
})(typeof globalThis!=='undefined'?globalThis:this);
