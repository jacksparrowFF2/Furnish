/* Static Blender mesh assets, shared by real Three and the numeric solid recorder.
 * All runtime positions are metres; product inputs and asset reference sizes are mm. */
(function(root){
'use strict';
function build(T,asset,f,base){
 if(asset.format!==1)throw Error('Unsupported Furnish static asset');
 const fixed=asset.fixedBaseMm||0,baseHeight=Math.min(fixed,f.h),g=new T.Group();
 g.userData.furnishAsset=asset.id+'@'+asset.version;
 for(const part of asset.parts){
  if(part.heightBand==='upper'&&f.h<=fixed)continue;
  const upper=part.heightBand==='upper',scale=[f.w/asset.sizeMm[0],fixed?(upper?(f.h-baseHeight)/(asset.sizeMm[1]-fixed):baseHeight/fixed):f.h/asset.sizeMm[1],f.d/asset.sizeMm[2]];
  const depthScale=scale[2];if(part.depthScaleFromWidth)scale[2]=scale[0];
  const geometry=new T.BufferGeometry(),positions=part.positions.map((v,i)=>i%3===1&&upper?baseHeight/1000+(v-fixed/1000)*scale[1]:i%3===2&&part.depthScaleFromWidth?part.originZ*depthScale+(v-part.originZ)*scale[2]:v*scale[i%3]);
  // Normal inverse scale is needed when an existing layout uses nonstandard dimensions.
  const normals=[];for(let i=0;i<part.normals.length;i+=3){const n=part.normals.slice(i,i+3).map((v,k)=>v/scale[k]),l=Math.hypot(...n);normals.push(...n.map(v=>v/l));}
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setIndex(Array.from({length:positions.length/3},(_,i)=>i));
  const material=new T.MeshStandardMaterial({...part.material,...(part.recolor&&f.color?{color:f.color}:{})});
  const mesh=new T.Mesh(geometry,material);mesh.name=part.name;mesh.position.y=base/1000;
  mesh.userData.furnishPartSource=part.identity;mesh.userData.furnishStablePart=part.identity;mesh.userData.ceilingOwnMaterial=true;
  mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
 }
 return g;
}
const api={build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishStaticAssetModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
