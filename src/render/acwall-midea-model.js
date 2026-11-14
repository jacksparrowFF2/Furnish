/* MXC3P static Blender mesh; display and numeric solid recording share vertices. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>products().definition(f)?.wallAirconProfile==='mxc3p'&&!f.obj;
function build(T,f){
 const P=products(),asset=root.FurnishMXC3PAsset||(typeof require==='function'?require('../data/acwall-midea-mxc3p-blender-asset.js'):null);
 return (root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,asset,{...f,h:P.height(f)},P.value(f,'mountHeight'));
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishMideaWallAirconModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
