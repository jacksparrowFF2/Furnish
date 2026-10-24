/* Mijia Water Purifier 2 1200G: white main unit only, local +Z front.
 * Overall dimensions from the supplied diagram; seams, feet and logo estimated. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const products=()=>root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
const supported=f=>f.type==='water_purifier_mijia_1200g'&&!f.obj;
function build(T,f,RoundedBoxGeometry){
 const result=new T.Group(),body=new T.Group();result.add(body);
 const white=new T.MeshStandardMaterial({color:f.color||'#f6f6f4',roughness:.31}),front=white.clone();front.roughness=.37;
 const foot=new T.MeshStandardMaterial({color:'#e5e5e1',roughness:.7}),logo=new T.MeshStandardMaterial({color:'#888b88',roughness:.7});
 function rounded(w,h,d,r,mat,x,y,z,part){const o=syncIdentity.produce("water-purifier-model:site-1",()=>new T.Mesh(new RoundedBoxGeometry(w/1000,h/1000,d/1000,6,r/1000),mat));o.position.set(x/1000,(y+h/2)/1000,z/1000);o.castShadow=o.receiveShadow=true;o.userData.waterPurifierPart=part;body.add(o);return o;}
 // Four inset feet establish y=0; shell and front cap stay inside 163×445×379.
 for(const x of syncIdentity.items("water-purifier-model.js:generator-1",[["item-a",-57],["item-b",57]]))for(const z of syncIdentity.items("water-purifier-model.js:generator-2",[["item-a",-184],["item-b",177]]))syncIdentity.produce("water-purifier-model:site-2",()=>rounded(24,6,32,2,foot,x,0,z,'foot'));
 syncIdentity.produce("water-purifier-model:site-3",()=>rounded(163,374,425,27,white,0,5,-10,'shell'));
 const shape=new T.Shape(),x=-74.5,y=0,w=149,h=360,r=28;
 shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);shape.closePath();
 const capGeometry=new T.ExtrudeGeometry(shape,{depth:18,bevelEnabled:true,bevelThickness:7,bevelSize:7,bevelSegments:5,steps:1,curveSegments:12});capGeometry.scale(.001,.001,.001);
 const cap=syncIdentity.produce("water-purifier-model:site-4",()=>new T.Mesh(capGeometry,front));cap.position.set(0,.012,.19725);cap.castShadow=cap.receiveShadow=true;cap.userData.waterPurifierPart='front-cover';body.add(cap);
 // Small geometric Mijia emblem on the narrow face; no remote texture/font.
 const points=[[-4,1],[-4,-2],[-2,-4],[1,-4],[4,-1],[4,2],[1,1],[0,3],[-2,1],[-4,3]];
 const curve=new T.CatmullRomCurve3(points.map(([x,y])=>new T.Vector3(x/1000,(110+y)/1000,.2221)),false,'centripetal');
 const mark=syncIdentity.produce("water-purifier-model:site-5",()=>new T.Mesh(new T.TubeGeometry(curve,40,.0004,8,false),logo));mark.userData.waterPurifierPart='logo';body.add(mark);
 body.scale.set(f.w/163,products().height(f)/379,f.d/445);
 result.position.y=products().value(f,'mountHeight')/1000;
 result.userData.waterPurifier=true;return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWaterPurifierModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
