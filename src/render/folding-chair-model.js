/* VIHALS deployed chair; shared imported production meshes, metre geometry. */
(function(root){
'use strict';
const P=()=>root.FurnishProducts||require('../core/product-rules.js');
function supported(f){return !!P().definition(f)?.foldingChairProfile&&!f.obj;}
function build(T,f){
 const A=root.FurnishVihalsBlenderAsset||require('../data/chair-vihals-blender-asset.js');
 const C=root.FurnishFoldingChair||require('../core/folding-chair-core.js'),l=C.layout(f),base=P().value(f,'mountHeight')||0;
 const g=(root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,A,{...f,h:P().height(f)},base);
 for(let i=0;i<g.children.length;i++){
  const mesh=g.children[i],part=A.parts[i],frame=l.frames[part.role||C.role(part.name)],positions=mesh.geometry.attributes.position.array,normals=mesh.geometry.attributes.normal.array;
  for(let j=0;j<positions.length;j+=3){const p=C.point(Array.from(positions.slice(j,j+3),v=>v*1000),frame);for(let k=0;k<3;k++)positions[j+k]=(p[k]+l.shift[k])/1000;const n=C.rotate(Array.from(normals.slice(j,j+3)),frame.angle);for(let k=0;k<3;k++)normals[j+k]=n[k];}
  mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.attributes.normal.needsUpdate=true;
 }
 if(T.DataTexture&&g.children[0]?.material){
  const textures=A.textures.map(t=>{const bytes=Uint8Array.from(atob(t.rgba),c=>c.charCodeAt(0)),map=new T.DataTexture(bytes,t.width,t.height);map.wrapS=map.wrapT=T.RepeatWrapping;map.flipY=false;map.needsUpdate=true;return map;});
  for(let i=0;i<g.children.length;i++){
   const mesh=g.children[i],part=A.parts[i],material=mesh.material;
   mesh.geometry.setAttribute('uv',new T.Float32BufferAttribute(part.uvs,2));
   material.map=textures[part.texture];material.map.colorSpace=T.SRGBColorSpace;
   material.roughnessMap=material.metalnessMap=material.aoMap=textures[part.ormTexture];material.needsUpdate=true;
   // Tint only paint/plastic; preserve the metal pins and axles. Normalizing to
   // the existing catalog white keeps every saved white chair visually stable.
   if(!/pin|axle/.test(part.name)){const tint=new T.Color(f.color||'#eeeee7'),white=new T.Color('#eeeee7');material.color.setRGB(Math.min(1,tint.r/white.r),Math.min(1,tint.g/white.g),Math.min(1,tint.b/white.b));}
  }
 }
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFoldingChairModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
