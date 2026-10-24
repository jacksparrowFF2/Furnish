/* Generic recessed boxes. Dimensions and placement in mm, never construction specifications. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('./product-rules.js');
const supported=f=>!f?.obj&&!!products().definition(f)?.wallRecess;
function cuts(plan,furniture){return furniture.filter(f=>supported(f)&&!products().modelError(f)&&[f.cx,f.cy,f.w,f.d,products().height(f)].every(Number.isFinite)).map(f=>{const v=products().vertical(f),base=products().floorBase(plan,f,furniture);return {cx:f.cx,cy:f.cy,w:f.w,d:f.d,bottom:v.bottom+base.z,top:v.top+base.z,rot:f.rot||0};});}
// Align the front (+local Z) with the closest wall face, retaining the user's height.
function embed(f,plan){
 if(f.locked)throw Error('家具已锁定，请先解锁');
 if(!supported(f))throw Error('此模型不支持墙内嵌入');
 const candidates=[];
 for(const r of plan.walls||[]){const [x,y,X,Y]=r;if(!(X>x&&Y>y))continue;
  for(const [axis,pos,lo,hi,sign,rot] of [[1,y,x,X,-1,180],[1,Y,x,X,1,0],[0,x,y,Y,-1,90],[0,X,y,Y,1,270]]){
   if(hi-lo<f.w)continue;
   const u=Math.max(lo+f.w/2,Math.min(hi-f.w/2,axis===1?f.cx:f.cy)),q=[0,0];const v=products().vertical(f),base=products().floorBase(plan,f,[f]);let face=pos;
   for(const solid of plan.wallFinish?.solids||[]){const r=solid.rect;if(solid.normal!==axis||solid.side!==sign||solid.bottom>v.bottom+base.z||solid.top<v.top+base.z||r[1-axis]>u-f.w/2+.01||r[3-axis]<u+f.w/2-.01)continue;
    const inner=sign===1?r[axis]:r[axis+2],outer=sign===1?r[axis+2]:r[axis];if(Math.abs(inner-pos)<.01)face=pos+sign*Math.max(Math.abs(face-pos),Math.abs(outer-pos));}
   if((axis===1?Y-y:X-x)+Math.abs(face-pos)<f.d)continue;
   q[axis]=face;q[1-axis]=u;
   candidates.push({distance:Math.hypot(q[0]-f.cx,q[1]-f.cy),cx:q[0]-(axis===0?sign*f.d/2:0),cy:q[1]-(axis===1?sign*f.d/2:0),rot});
  }
 }
 const best=candidates.sort((a,b)=>a.distance-b.distance)[0];if(!best)throw Error('没有宽度及厚度足够的墙面，请核对箱体尺寸与墙体');
 const {distance,...placement}=best;return {...f,...placement};
}
function contained(f,plan){
 if(!supported(f))return false;const G=root.FurnishGeometry||require('./layout-geometry.js'),Z=root.FurnishZoneGeometry||require('./zone-geometry.js'),F=root.FurnishWallFinish||require('./wall-finish-core.js'),p=G.corners(f),v=products().vertical(f),base=products().floorBase(plan,f,[f]);if(!base.known)return false;
 const bottom=v.bottom+base.z,top=v.top+base.z,solids=(plan.walls||[]).map(r=>({poly:[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]],...F.vertical(r,plan)}));
 for(const s of plan.wallFinish?.solids||[])solids.push({poly:s.poly||[[s.rect[0],s.rect[1]],[s.rect[2],s.rect[1]],[s.rect[2],s.rect[3]],[s.rect[0],s.rect[3]]],bottom:s.bottom,top:s.top});
 const levels=[...new Set([bottom,top,...solids.flatMap(s=>[s.bottom,s.top]).filter(z=>z>bottom&&z<top)])].sort((a,b)=>a-b);
 return levels.slice(1).every((z,i)=>{const mid=(z+levels[i])/2,polys=solids.filter(s=>s.bottom<=mid&&s.top>=mid).map(s=>s.poly);return Z.area(Z.decompose([p,...polys],q=>Z.inside(q,p)&&!polys.some(r=>Z.inside(q,r))))<1e-9;});
}
const api={supported,cuts,embed,contained};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishElectricalBox=api;
})(typeof globalThis!=='undefined'?globalThis:this);
