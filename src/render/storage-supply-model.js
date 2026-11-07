/* Closed storage inventories: the same offline meshes drive display and solids. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f).storageSupply&&!f.obj;
const singles=new Map();
function arrayModel(T,asset,f){
 const l=products().paperArrayLayout(f),a=l.config;
 let single=singles.get(asset);
 if(!single){
  const parts=asset.parts.filter(p=>/^(roll|pack)-01(?:-|$)/.test(p.name)),bounds=[0,1,2].map(k=>{const v=parts.flatMap(p=>p.positions.filter((_,i)=>i%3===k));return [Math.min(...v),Math.max(...v)];});
  single={...asset,id:asset.id+':single',sizeMm:bounds.map(([lo,hi])=>(hi-lo)*1000),parts:parts.map(p=>({...p,positions:p.positions.map((v,i)=>v-(i%3===1?bounds[1][0]:(bounds[i%3][0]+bounds[i%3][1])/2))}))};singles.set(asset,single);
 }
 const group=new T.Group();group.userData.furnishAsset=asset.id+':array@1';
 for(const cell of l.cells){
  const unit=(root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,single,{...f,w:a.unitW,d:a.unitD,h:a.unitH},-a.unitH/2);
  if(a.orientation==='turn')unit.rotation.y=Math.PI/2;
  if(['side-x','edge-x'].includes(a.orientation))unit.rotation.z=-Math.PI/2;
  if(['side-z','edge-z'].includes(a.orientation))unit.rotation.x=Math.PI/2;
  unit.position.set(cell.center[0]/1000,(cell.center[1]+products().value(f,'mountHeight'))/1000,cell.center[2]/1000);
  unit.children.forEach(mesh=>{const identity=single.id+':unit-'+String(cell.index+1).padStart(3,'0')+':'+mesh.name;mesh.name='unit-'+String(cell.index+1).padStart(3,'0')+':'+mesh.name;mesh.userData.furnishPartSource=mesh.userData.furnishStablePart=identity;});
  group.add(unit);
 }
 return group;
}
function build(T,f){
 const profile=products().definition(f).storageSupply;
 const globals={'cat-food-2kg':'FurnishCatFood2kgAsset','storage-toolbox':'FurnishStorageToolboxAsset','medicine-box':'FurnishMedicineBoxAsset','toilet-paper-pack':'FurnishToiletPaperPackAsset','tissue-pack':'FurnishTissuePackAsset',"heartlink-roll-layer":"FurnishHeartlinkRollLayerAsset","heartlink-tissue-layer":"FurnishHeartlinkTissueLayerAsset","wet-wipes-pack":"FurnishWetWipesPackAsset"};
 const asset=root[globals[profile]]||(typeof require==='function'?require('../data/'+profile+'-blender-asset.js'):null);
 if(!asset)throw Error('Storage inventory asset missing: '+profile);
 if(f.paperArray&&products().supports(f,'paperArray'))return arrayModel(T,asset,f);
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
