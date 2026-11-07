/* Closed storage inventories: the same offline meshes drive display and solids. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f).storageSupply&&!f.obj;
function build(T,f){
 const profile=products().definition(f).storageSupply;
 const globals={'cat-food-2kg':'FurnishCatFood2kgAsset','storage-toolbox':'FurnishStorageToolboxAsset','medicine-box':'FurnishMedicineBoxAsset','toilet-paper-pack':'FurnishToiletPaperPackAsset','tissue-pack':'FurnishTissuePackAsset',"heartlink-roll-layer":"FurnishHeartlinkRollLayerAsset","heartlink-tissue-layer":"FurnishHeartlinkTissueLayerAsset","wet-wipes-pack":"FurnishWetWipesPackAsset"};
 const asset=root[globals[profile]]||(typeof require==='function'?require('../data/'+profile+'-blender-asset.js'):null);
 if(!asset)throw Error('Storage inventory asset missing: '+profile);
 const group=(root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,asset,{...f,h:products().height(f)},products().value(f,'mountHeight'));
 // Bounded, offline RGBA label, only published by the pouch's scoped publisher.
 if(profile==='cat-food-2kg'&&T.DataTexture&&group.children[0]?.material){
  const maps=asset.textures.map(t=>{const map=new T.DataTexture(Uint8Array.from(atob(t.rgba),c=>c.charCodeAt(0)),t.width,t.height);map.colorSpace=T.SRGBColorSpace;map.flipY=false;map.needsUpdate=true;return map;});
  group.children.forEach((mesh,i)=>{const p=asset.parts[i];if(p.texture===undefined)return;mesh.geometry.setAttribute('uv',new T.Float32BufferAttribute(p.uvs,2));mesh.material.map=maps[p.texture];mesh.material.needsUpdate=true;});
 }
 return group;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishStorageSupplyModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
