/* Temporary materials on the production surfaces; no work/history mutations. */
(function(root){
'use strict';
function create(THREE){
 const originals=new Map(),created=new Set();
 function clear(){for(const [mesh,m] of originals)mesh.material=m;originals.clear();for(const m of created){m.map?.dispose();m.dispose();}created.clear();}
 function update({floorGroup,wallGroup,roomId,kind,color,targets}){
  clear();const shared=new Map(),list=targets||[{roomId,kind}],M=root.FurnishFloorFinishModel||require('./floor-finish-model.js');let count=0;
  try{for(const kind of ['wall','floor']){const ids=new Set(list.filter(t=>t.kind===kind).map(t=>t.roomId)),group=kind==='wall'?wallGroup:floorGroup;group?.traverse(mesh=>{
   const matches=kind==='wall'?ids.has(mesh.userData.wallTiling?.roomId):mesh.userData.floor&&ids.has(mesh.userData.room);
   if(!matches||!mesh.material.userData.tileFinish)return;
   const original=mesh.material,meta=original.userData.tileFinish;originals.set(mesh,original);
   if(!shared.has(original)){
    const m=meta.groutOnly?M.groutMaterial(THREE,{color:meta.color,groutColor:color}):meta.legacy?M.legacyMaterial(THREE,original,{groutColor:color}):M.material(THREE,meta.layout,{color:meta.color,groutColor:color});
    for(const key of ['side','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','clippingPlanes','clipShadows'])m[key]=original[key];
    shared.set(original,m);created.add(m);
   }
   mesh.material=shared.get(original);count++;
  });}if(!count)throw Object.assign(Error('当前没有可预览的铺砖表面；可先保存颜色，启用铺贴后生效'),{code:'no-tile-surfaces'});return {surfaces:count};}catch(e){clear();throw e;}
 }
 return {clear,update,get active(){return originals.size>0;}};
}
const api={create};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishTileGroutPreview=api;
})(typeof globalThis!=='undefined'?globalThis:this);
