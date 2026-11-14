/* Runtime light contract. Values are RGB radiometric equivalents, not LED efficacy. */
(function(root){
'use strict';
const PHOTOMETRIC=683,VERSION=1;
const radiometric=cd=>cd/PHOTOMETRIC,photometric=value=>value*PHOTOMETRIC;
function panel(candela,width,height){if(!(width>0&&height>0&&candela>=0))throw Error('Invalid luminous face');return radiometric(candela)/(width*height);}
function environment(night,hour=12){
 const daylight=Math.max(0,Math.sin(Math.PI*(hour-6)/12));
 return night?{exposure:10,ambient:.015,reflection:.015,sun:radiometric(.05),background:'#1c2130',world:[.015,.015,.015]}:
  {exposure:1.05,ambient:1.1,reflection:1,sun:1.4+daylight*1.6,background:'#f5f2ea',world:[.35,.38,.44]};
}
const isPreviewLight=o=>!!(o.userData.downlightLight||o.userData.ceilingPanelLight||o.userData.pathLight||o.userData.ceilingStripLight);
const contourColors=new WeakMap();
// Unlit construction lines need the ambient attenuation that lit boards receive.
// Apply only to the main scene; editor previews keep their original structure lines.
function cabinetContours(group,lighting){
 const scale=Math.min(1,Math.max(0,lighting.ambient/environment(false).ambient));
 group.traverse(o=>{
  if(!o.userData.cabinetOutline)return;
  const m=o.material;if(!m?.color)return;
  if(!contourColors.has(m))contourColors.set(m,m.color.clone());
  m.color.copy(contourColors.get(m)).multiplyScalar(scale);
 });
}
const isFill=o=>!!(o.userData.ceilingPanelBounce||o.userData.ceilingStripLight==='bounce');
function requested(o){if(o.userData.previewLightEnabled===false)return false;for(let p=o.parent;p;p=p.parent)if(!p.visible)return false;return true;}
// One primary sample per fixture, then its remaining direct samples, then virtual fill.
function prioritize(candidates){
 const ordered=[];
 for(const fill of [false,true]){
  const owners=new Map();for(const c of candidates.filter(c=>isFill(c.o)===fill).sort((a,b)=>a.distance-b.distance)){const list=owners.get(c.owner)||[];list.push(c);owners.set(c.owner,list);}
  const max=Math.max(0,...[...owners.values()].map(a=>a.length));for(let i=0;i<max;i++)for(const list of owners.values())if(list[i])ordered.push(list[i]);
 }
 return ordered;
}
// Local emitting rectangles are authored by the production model, then transformed
// at the same mm→m boundary as the model (including floor datum, rotation and mirror).
function collect(T,groups){
 const rects=[],spots=[];
 for(const group of groups){group.updateWorldMatrix(true,true);group.traverse(o=>{
  let shown=true;for(let p=o;p;p=p.parent)if(!p.visible)shown=false;
  if(shown)for(const r of o.userData.lightingRects||[]){
   if(r.enabled===false||r.material?.emissiveIntensity===0)continue;
   const center=new T.Vector3().fromArray(r.position).applyMatrix4(o.matrixWorld),u=new T.Vector3().fromArray(r.u).transformDirection(o.matrixWorld),n=new T.Vector3().fromArray(r.normal).applyMatrix3(new T.Matrix3().getNormalMatrix(o.matrixWorld)).normalize(),v=new T.Vector3().crossVectors(n.clone().negate(),u).normalize();
   const size=axis=>new T.Vector3().fromArray(axis).applyMatrix3(new T.Matrix3().setFromMatrix4(o.matrixWorld)).length();
   const color=new T.Color(r.color),owner=(()=>{for(let p=o;p;p=p.parent)if(p.userData.fid)return p.userData.fid;return null;})();
   rects.push({name:r.name||'Luminous face',owner,layer:o.userData.ceiling?'ceiling:'+o.userData.ceiling.id:null,position:center.toArray(),u:u.toArray(),v:v.toArray(),normal:n.toArray(),width:r.width*size(r.u),height:r.height*size(r.v),radiance:r.radiance,color:color.toArray()});
  }
  if(o.isSpotLight&&isPreviewLight(o)&&!isFill(o)&&!o.userData.areaSurrogate&&o.intensity>0&&requested(o)){
   o.target.updateWorldMatrix(true,false);spots.push({position:o.getWorldPosition(new T.Vector3()).toArray(),target:o.target.getWorldPosition(new T.Vector3()).toArray(),color:o.color.toArray(),intensity:o.intensity,angle:o.angle,penumbra:o.penumbra,distance:o.distance});
  }
 });}
 return {version:VERSION,unit:'RGB radiometric equivalent; photometric / 683',rects,spots};
}
const api={VERSION,PHOTOMETRIC,radiometric,photometric,panel,environment,cabinetContours,isPreviewLight,isFill,requested,prioritize,collect};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishLighting=api;
})(typeof globalThis!=='undefined'?globalThis:this);
