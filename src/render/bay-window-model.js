/* Production architecture for the solid wall above a recessed bay reveal. */
(function(root){
'use strict';
function buildHeaders(T,plan,{wx=v=>v/1000,wz=v=>v/1000,top=Infinity,material}={}){
 const B=root.FurnishBayWindows||require('../core/bay-window-core.js'),g=new T.Group();
 for(const p of B.upperWalls(plan)){
  const height=Math.min(p.top,top)-p.bottom;if(height<=1e-6)continue;
  const [x,y,X,Y]=p.rect,m=new T.Mesh(new T.BoxGeometry((X-x)/1000,height/1000,(Y-y)/1000),material||new T.MeshStandardMaterial({color:'#e9e4da',roughness:.8}));
  m.position.set(wx((x+X)/2),(p.bottom+height/2)/1000,wz((y+Y)/2));m.name=p.id;
  m.userData.bayHeaderPart=p.id;m.userData.bayWindowIndex=p.windowIndex;m.userData.furnishStablePart=p.id;m.userData.furnishPartSource='architecture:bay-upper-wall';
  m.castShadow=m.receiveShadow=true;g.add(m);
 }
 return g;
}
const api={buildHeaders};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishBayWindowModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
