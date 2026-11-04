/* FA18-X231 static raised pose. Product dimensions in mm; geometry in metres. */
(function(root){
'use strict';
const P=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>f.type==='fan_airmate_fa18_x231'&&!f.obj;
function build(T,f){
 const A=root.FurnishX231BlenderAsset||require('../data/fan-x231-blender-asset.js'),M=root.FurnishStaticAssetModel||require('./static-asset-model.js');
 return M.build(T,A,{...f,h:P().height(f)},0);
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCirculatorModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
