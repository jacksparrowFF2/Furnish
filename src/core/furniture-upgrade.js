/* One input boundary for old furniture. Runtime geometry uses current structures. */
(function(root){
 'use strict';
 const copy=v=>JSON.parse(JSON.stringify(v));
 function upgradeList(input){
  const C=root.FurnishCabinet||require('./cabinet-core.js'),K=root.FurnishKitchen||require('./kitchen-core.js'),P=root.FurnishProducts||require('./product-rules.js');
  const list=copy(input),ids=new Set(list.map(f=>f.id)),added=[];
  const allocate=(id,part)=>{const base=id.slice(0,150)+'_upgraded_'+part;let next=base,n=1;while(ids.has(next))next=base+'_'+n++;ids.add(next);return next;};
  for(let i=0;i<list.length;i++){
   let f=list[i];if(f.obj)continue;f=list[i]=P.upgradeIdentity(f);
   const original=copy(f),addedBefore=added.length;
   try{
   if(f.type==='counter'&&!f.kitchen){
    if(f.w<150||f.d<50){list[i]={...f,type:'block',h:f.h??2180,mountHeight:0};continue;}
    // Former combined kitchen: preserve the two physical rows and backsplash,
    // then use the normal kitchen/cabinet editors, groups and collision rules.
    const n=Math.max(1,Math.round(f.w/600)),groupId=f.groupId||('upgraded_'+f.id).slice(0,200),count=Math.min(n,Math.max(1,Math.floor(f.w/150)));
    const modules=Array.from({length:count},()=>({run:0,width:f.w/count,role:f.w<150?'empty':'door',door:'left',handle:'none'}));
    const host={...f,groupId,kitchen:{version:1,shape:'straight',depth:f.d,baseHeight:820,thickness:40,plinth:100,modules}};K.validate(host);
    const upper={id:allocate(f.id,'upper'),type:'kitchenwall',name:(f.name||'厨房组合')+' · 吊柜',cx:f.cx,cy:f.cy,w:f.w,d:330,h:700,mountHeight:1480,rot:f.rot,...(f.flip!==undefined?{flip:f.flip}:{}),color:f.color,groupId,...(f.locked!==undefined?{locked:f.locked}:{}),price:0};
    const a=(f.rot||0)*Math.PI/180,z=-f.d/2+165;upper.cx-=z*Math.sin(a);upper.cy+=z*Math.cos(a);
    upper.kitchen={version:1,shape:'straight',depth:330,baseHeight:700,thickness:0,modules:modules.map(m=>({...m,role:m.role==='empty'?'empty':'door'}))};
    const back={id:allocate(f.id,'back'),type:'block',name:(f.name||'厨房组合')+' · 挡水背板',cx:f.cx-(-f.d/2+5)*Math.sin(a),cy:f.cy+(-f.d/2+5)*Math.cos(a),w:f.w,d:10,h:620,mountHeight:860,rot:f.rot,...(f.flip!==undefined?{flip:f.flip}:{}),color:'#efece6',groupId,...(f.locked!==undefined?{locked:f.locked}:{}),price:0};
    for(const part of [upper,back])for(const key of ['purchaseStatus','purchaseNote','priceDate'])if(f[key]!==undefined)part[key]=copy(f[key]);
    list[i]=host;added.push({sourceId:f.id,items:[upper,back]});f=host;
   }
   if(f.kitchen){
    for(const m of f.kitchen.modules)if(m.structure)m.structure.cabinet=C.upgradeDesign({type:'kitchenwall',...m.structure}).cabinet;
    for(const part of K.laundryParts(f).filter(p=>p.key!=='sink'))f.kitchen.laundry.assembly[part.key].cabinet=C.upgradeDesign(part.furniture).cabinet;
   }else if(C.supported(f))list[i]=C.upgradeDesign(f);
   }catch(error){
    // Invalid saved structures belong to the existing recovery UI. Upgrade
    // healthy siblings, retain the complete broken record, and keep strict
    // project/import validation responsible for rejecting it on normal saves.
    if(!P.modelError(original))throw error;
    list[i]=original;added.splice(addedBefore);
   }
  }
  return {furniture:list.concat(added.flatMap(a=>a.items)),added};
 }
 function upgradeWork(work){
  const next=copy(work),result=upgradeList(next.furniture);next.furniture=result.furniture;inheritLayers(next,result.added);return next;
 }
 function inheritLayers(next,added){
  for(const {sourceId,items} of added)if(next.objectLayers?.assignments?.['furniture:'+sourceId])for(const f of items)next.objectLayers.assignments['furniture:'+f.id]=next.objectLayers.assignments['furniture:'+sourceId];
 }
 const api={upgradeList,upgradeWork,inheritLayers};root.FurnishFurnitureUpgrade=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
