/* MJTD07YL: the published Blender mesh drives both display and numeric solids. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f)?.deskLight&&!f.obj;
function build(T,f){
 const P=products(),spec=P.definition(f).deskLight,L=root.FurnishLighting||require('../core/lighting-core.js'),asset=root.FurnishMijiaDeskLampAsset||(typeof require==='function'?require('../data/desk-lamp-mijia-pro-blender-asset.js'):null);
 const g=(root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,asset,{...f,h:P.height(f)},P.value(f,'mountHeight'));
 const candela=spec.previewCandela*P.value(f,'lightPreviewLevel')/100;
 const scale=[f.w/asset.sizeMm[0],P.height(f)/asset.sizeMm[1],f.d/asset.sizeMm[2]],base=P.value(f,'mountHeight')/1000;
 for(const face of spec.faces){
  const mesh=g.children.find(o=>o.name===face.part);if(!mesh)throw Error('台灯发光部件缺失：'+face.part);
  if(!mesh.material)continue; // Numeric solid recording deliberately has no materials/lights.
  const width=face.width*scale[0]/1000,height=face.depth*scale[2]/1000,radiance=L.panel(candela/spec.faces.length,width,height),position=face.center.map((v,k)=>v*scale[k]/1000);position[1]+=base-.0002;
  mesh.material.emissive.set(spec.color);mesh.material.emissiveIntensity=radiance;Object.assign(mesh.material.userData,{ceilingPanelEmitter:true,emissionOn:radiance});
  (g.userData.lightingRects||=[]).push({name:face.part,position,width,height,u:[1,0,0],v:[0,0,-1],normal:[0,-1,0],radiance,color:spec.color,material:mesh.material});
  if(T.SpotLight&&T.Object3D){
   const lamp=new T.SpotLight(spec.color,L.radiometric(candela/spec.faces.length),0,Math.PI/2,1,2),target=new T.Object3D();lamp.position.fromArray(position);target.position.copy(lamp.position);target.position.y-=1;lamp.target=target;
   Object.assign(lamp.userData,{ceilingPanelLight:true,areaSurrogate:true,radiometricLight:true});lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);lamp.shadow.camera.near=.005;lamp.shadow.bias=-.00002;lamp.shadow.normalBias=.002;g.add(lamp,target);
  }
 }
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishDeskLampModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
