/* Production Blender stool, repeated at the shared mm stacking pitch. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>products().family(f,'stack-stool')&&!f.obj;
function build(T,f){
 const P=products(),layout=P.stoolStack(f),A=root.FurnishStackStoolBlenderAsset||require('../data/stack-stool-blender-asset.js'),M=root.FurnishStaticAssetModel||require('./static-asset-model.js'),g=new T.Group();
 g.userData.furnishAsset=A.id+'@'+A.version;
 for(let i=0;i<layout.count;i++){
  const chair=M.build(T,A,{...f,h:layout.singleHeight},P.value(f,'mountHeight')+i*layout.pitch);
  for(const m of chair.children){m.userData.furnishStablePart+=':stack-'+i;m.name+=':stack-'+i;}
  g.add(chair);
 }
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishStackStoolModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
