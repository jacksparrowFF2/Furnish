/* Shared schematic riser geometry in mm; derived from existing service markers. */
(function(root){
 const F=()=>root.FurnishDraft||require('./floorplan-core.js'),P=()=>root.FurnishProject||require('./project-core.js');
 function pipes(plan){return (plan.markers||[]).map(marker=>{const radius=F().serviceDiameter(marker)/2,height=P().ceilingAt(plan,...marker.at).height??P().ceilingHeight(plan);return {id:marker.id,name:marker.name,kind:marker.kind,at:marker.at,radius,vertical:{bottom:0,top:height},poly:Array.from({length:64},(_,i)=>{const a=i*Math.PI/32,r=radius/Math.cos(Math.PI/64);return [marker.at[0]+Math.cos(a)*r,marker.at[1]+Math.sin(a)*r];})};});}
 function local(f,pipe){const a=(f.rot||0)*Math.PI/180,dx=pipe.at[0]-f.cx,dy=pipe.at[1]-f.cy,bottom=f.type==='kitchenwall'?(root.FurnishProducts||require('./product-rules.js')).value(f,'mountHeight'):0;return {...pipe,...(pipe.vertical?{vertical:{bottom:pipe.vertical.bottom-bottom,top:pipe.vertical.top-bottom}}:{}),at:[(dx*Math.cos(a)+dy*Math.sin(a))*(f.flip?-1:1),-dx*Math.sin(a)+dy*Math.cos(a)]};}
 function bodyHit(f,pipe,tolerance=5){const p=local(f,pipe).at;if(f.kitchen)return (root.FurnishKitchen||require('./kitchen-core.js')).slabs(f).some(s=>Math.hypot(Math.max(Math.abs(p[0]-s.x)-s.w/2,0),Math.max(Math.abs(p[1]-s.y)-s.d/2,0))<pipe.radius-tolerance);const dx=Math.max(Math.abs(p[0])-f.w/2,0),dy=Math.max(Math.abs(p[1])-f.d/2,0);return Math.hypot(dx,dy)<pipe.radius-tolerance;}
 function prepareOpening(f,pipes){
  if(f.obj)return null;
  const M=root.FurnishCabinetMotion||require('./cabinet-motion.js');
  try{return M.prepare(f,pipes.filter(p=>bodyHit(f,p,0)).map(p=>local(f,p)));}catch(e){return null;}
 }
 function openingResult(f,zone,pipe,intersects,parts){
  const C=root.FurnishCabinet||require('./cabinet-core.js');
  if(zone.kind==='cabinetpassage')return {hit:C.openingIntersects(zone,pipe.poly,pipe.vertical,intersects)};
  if(parts===undefined)parts=prepareOpening(f,[pipe]);
  if(parts===null)return {hit:false,pending:true,reason:'geometry-unavailable'};
  const B=root.FurnishBoardCollision||require('./board-motion-collision.js');
  return B.check(parts,zone,local(f,pipe));
 }
 function openingHit(f,zone,pipe,intersects){return openingResult(f,zone,pipe,intersects).hit;}
 const api={pipes,local,bodyHit,openingHit,openingResult,prepareOpening};root.FurnishServices=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
