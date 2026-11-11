/* Visible G12 faceplate meshes, shared by Three and numeric production solids. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>products().family(f,'wall-panel')&&!f.obj;
function build(T,f){
 const P=products(),bundle=root.FurnishPanelBullG12Asset||(typeof require==='function'?require('../data/panel-bull-g12-blender-asset.js'):null);
 const key=P.value(f,'panelVariant'),xiaomi=P.panelSpec(f).series;
 const selected=xiaomi?(root.FurnishPanelXiaomiSwitch2Asset||(typeof require==='function'?require('../data/panel-xiaomi-switch2-blender-asset.js'):null)):bundle,asset=selected?.variants[key];
 if(!asset)throw Error('86面板离线资产缺失：'+key);
 return (root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,asset,{...f,h:P.height(f)},P.value(f,'mountHeight'));
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishPanelBullG12Model=api;
})(typeof globalThis!=='undefined'?globalThis:this);
