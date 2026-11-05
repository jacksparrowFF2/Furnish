/* Static Blender supplies. Input mm, asset metres; shared display and numeric solids. */
(function(root){
'use strict';
const P=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!P().definition(f).petSupply&&!f.obj;
function build(T,f){
 const kind=P().definition(f).petSupply,asset=kind==='bowl'?(root.FurnishPetBowlBlenderAsset||require('../data/pet-bowl-blender-asset.js')):(root.FurnishLitterBagBlenderAsset||require('../data/litter-bag-blender-asset.js'));
 return (root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,asset,{...f,h:P().height(f)},P().value(f,'mountHeight'));
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishPetSupplyModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
