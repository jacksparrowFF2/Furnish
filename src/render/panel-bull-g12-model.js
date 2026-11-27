/* Visible G12 faceplate meshes, shared by Three and numeric production solids. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>products().family(f,'wall-panel')&&!f.obj;
const wirelessGrey={
 'mounting-back':{color:'#222326',roughness:.48},
 housing:{color:'#292a2d',roughness:.39},
 'left-rocker':{color:'#414247',roughness:.40},
 'right-rocker':{color:'#414247',roughness:.40},
 'left-indicator':{color:'#a9adae'},
 'right-indicator':{color:'#a9adae'}
};
function build(T,f){
 const P=products(),key=P.value(f,'panelVariant'),{series,color}=P.panelSpec(f);
 let asset=series==='wireless'
  ?root.FurnishPanelXiaomiWirelessAsset||(typeof require==='function'?require('../data/panel-xiaomi-wireless-blender-asset.js'):null)
  :series
   ?(root.FurnishPanelXiaomiSwitch2Asset||(typeof require==='function'?require('../data/panel-xiaomi-switch2-blender-asset.js'):null))?.variants[key]
   :(root.FurnishPanelBullG12Asset||(typeof require==='function'?require('../data/panel-bull-g12-blender-asset.js'):null))?.variants[key];
 if(!asset)throw Error('86面板离线资产缺失：'+key);
 if(series==='wireless'&&color==='grey')asset={...asset,parts:asset.parts.map(part=>({
  ...part,material:{...part.material,...wirelessGrey[part.name]}
 }))};
 const g=(root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,asset,{...f,h:P.height(f)},P.value(f,'mountHeight')),light=P.definition(f).nightLight;
 if(light&&key===light.variant){
  g.traverse(o=>{if(o.name===light.part&&o.material?.emissive){o.material.emissive.set(light.color);o.material.emissiveIntensity=0;(o.material.userData||={}).pathLightEmitter=true;}});
  if(T.SpotLight&&T.Object3D){const lamp=new T.SpotLight(light.color,(root.FurnishLighting||require('../core/lighting-core.js')).radiometric(light.previewCandela),light.reach/1000,Math.PI*.44,1,2),target=new T.Object3D(),base=P.value(f,'mountHeight')/1000;lamp.position.set(0,base+f.h*.35/1000,f.d/2000+.003);target.position.set(0,0,.5);lamp.target=target;lamp.userData.pathLight=true;lamp.userData.radiometricLight=true;lamp.visible=false;lamp.castShadow=true;lamp.shadow.mapSize.set(256,256);lamp.shadow.camera.near=.01;lamp.shadow.bias=-.0001;g.add(lamp,target);}
 }
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishPanelBullG12Model=api;
})(typeof globalThis!=='undefined'?globalThis:this);
