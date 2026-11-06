/* Closed storage inventories: the same offline meshes drive display and solids. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f).storageSupply&&!f.obj;
function build(T,f){
 const profile=products().definition(f).storageSupply;
 const globals={'storage-toolbox':'FurnishStorageToolboxAsset','medicine-box':'FurnishMedicineBoxAsset','toilet-paper-pack':'FurnishToiletPaperPackAsset','tissue-pack':'FurnishTissuePackAsset',"heartlink-roll-layer":"FurnishHeartlinkRollLayerAsset","heartlink-tissue-layer":"FurnishHeartlinkTissueLayerAsset","wet-wipes-pack":"FurnishWetWipesPackAsset"};
 const asset=root[globals[profile]]||(typeof require==='function'?require('../data/'+profile+'-blender-asset.js'):null);
 if(!asset)throw Error('Storage inventory asset missing: '+profile);
 return (root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,asset,{...f,h:products().height(f)},products().value(f,'mountHeight'));
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishStorageSupplyModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
