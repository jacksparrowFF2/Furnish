/* Closed Y107H03; actual imported meshes also feed bodyParts/directional. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f)?.sofaBedProfile&&!f.obj;
function build(T,f){
 const A=root.FurnishSofaBedBlenderAsset||require('../data/sofa-bed-blender-asset.js'),M=root.FurnishStaticAssetModel||require('./static-asset-model.js');
 return M.build(T,A,{...f,h:products().height(f)},0);
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishSofaBedModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
