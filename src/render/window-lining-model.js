/* Custom window lining: shared production boards, dimensions in mm at the boundary. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>products().family(f,'window-lining')&&!f.obj;
function build(T,f,options={}){
 const P=products(),layout=P.windowLining(f),g=new T.Group(),stone=layout.kind==='stone';
 const material=(!stone&&options.wood?.clone?options.wood.clone():new T.MeshStandardMaterial({color:f.color||(stone?'#eeeae2':'#c49b70'),roughness:stone?.25:.55,metalness:0}));
 for(const b of layout.parts){
  const m=new T.Mesh(new T.BoxGeometry(b.w/1000,b.h/1000,b.d/1000),material);
  m.position.set(b.x/1000,(b.bottom+b.h/2)/1000,b.z/1000);
  m.name='window-lining-'+b.key;m.userData.windowLiningPart=b.key;
  m.userData.furnishStablePart=f.type+':'+b.key;m.userData.furnishPartSource=f.type+':'+b.key;
  m.castShadow=m.receiveShadow=true;g.add(m);
 }
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWindowLiningModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
