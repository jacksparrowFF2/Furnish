/* FA18-X231 static raised pose. Product dimensions in mm; geometry in metres. */
(function(root){
'use strict';
const P=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>f.type==='fan_airmate_fa18_x231'&&!f.obj;
function build(T,f){
 const A=root.FurnishX231BlenderAsset||require('../data/fan-x231-blender-asset.js'),M=root.FurnishStaticAssetModel||require('./static-asset-model.js');
 const layout=P().circulatorLayout(f),rule=P().definition(f).circulator;
 const baseParts=new Set(['rubber-base','round-base','base-collar']);
 const parts=A.parts.filter(p=>!p.name.startsWith('upright-')||layout.count===2||layout.count===1&&p.name==='upright-lower').map(p=>{
  const pole=p.name.startsWith('upright-'),start=p.name==='upright-upper'?312:38,ratio=pole?layout.segmentLength/rule.segment:1;
  return {...p,positions:p.positions.map((v,i)=>i%3!==1?v:((pole?(rule.baseHeight+(p.name==='upright-upper'?layout.segmentLength:0)+(v*1000-start)*ratio):v*1000+(baseParts.has(p.name)?0:layout.shift))*layout.legacyScale/1000)),normals:p.normals.flatMap((_,i,a)=>{
   if(i%3)return [];const n=[a[i],a[i+1]/(ratio*layout.legacyScale),a[i+2]],length=Math.hypot(...n);return n.map(v=>v/length);
  })};
 });
 return M.build(T,{...A,parts},{...f,h:rule.referenceHeight},P().value(f,'mountHeight'));
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCirculatorModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
