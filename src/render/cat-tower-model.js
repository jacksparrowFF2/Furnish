/* JD package two: fixed lower tiers and a height-adjustable top pressure assembly. */
(function(root){
'use strict';
const P=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>f.type==='cat_tower_jd_10141711472484'&&!f.obj;
function build(T,f){
 const A=root.FurnishCatTowerBlenderAsset||require('../data/cat-tower-blender-asset.js'),M=root.FurnishStaticAssetModel||require('./static-asset-model.js'),rule=P().definition(f).catTower;
 P().validate(f);
 const h=P().height(f),top=new Set(rule.topParts),scale=(h-rule.topAssembly-rule.fixedHeight)/(rule.referenceHeight-rule.topAssembly-rule.fixedHeight);
 const parts=A.parts.map(p=>{
  if(!top.has(p.name)&&p.name!=='adjuster-rod')return p;
  const rod=p.name==='adjuster-rod',positions=p.positions.map((v,i)=>i%3!==1?v:rod?rule.fixedHeight/1000+(v-rule.fixedHeight/1000)*scale:v+(h-rule.referenceHeight)/1000);
  const normals=[];for(let i=0;i<p.normals.length;i+=3){const n=p.normals.slice(i,i+3);if(rod)n[1]/=scale;const l=Math.hypot(...n);normals.push(...n.map(v=>v/l));}
  return {...p,positions,normals};
 });
 return M.build(T,{...A,parts},{...f,h:rule.referenceHeight},0);
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCatTowerModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
