/* VIHALS deployed chair; shared imported production meshes, metre geometry. */
(function(root){
'use strict';
const P=()=>root.FurnishProducts||require('../core/product-rules.js');
function supported(f){return !!P().definition(f)?.foldingChairProfile&&!f.obj;}
function build(T,f){
 const A=root.FurnishVihalsBlenderAsset||require('../data/chair-vihals-blender-asset.js');
 const g=(root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,A,{...f,h:P().height(f)},0);
 if(T.DataTexture&&g.children[0]?.material){
  const textures=A.textures.map(t=>{const bytes=Uint8Array.from(atob(t.rgba),c=>c.charCodeAt(0)),map=new T.DataTexture(bytes,t.width,t.height);map.wrapS=map.wrapT=T.RepeatWrapping;map.flipY=false;map.needsUpdate=true;return map;});
  for(let i=0;i<g.children.length;i++){
   const mesh=g.children[i],part=A.parts[i],material=mesh.material;
   mesh.geometry.setAttribute('uv',new T.Float32BufferAttribute(part.uvs,2));
   material.map=textures[part.texture];material.map.colorSpace=T.SRGBColorSpace;
   material.roughnessMap=material.metalnessMap=material.aoMap=textures[part.ormTexture];material.needsUpdate=true;
  }
 }
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFoldingChairModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
