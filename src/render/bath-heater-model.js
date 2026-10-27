/* Shared ceiling-panel devices. Unmarked construction and light output are visual assumptions. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f)?.ceilingPanel&&!f.obj;
function build(T,f){
 const P=products(),spec=P.definition(f).ceilingPanel,g=new T.Group(),base=P.value(f,'mountHeight')/1000,w=f.w/1000,d=f.d/1000,h=P.height(f)/1000,rim=Math.min(spec.rim/1000,h);
 const white=new T.MeshStandardMaterial({color:f.color||'#f5f5f0',roughness:.48}),dark=new T.MeshStandardMaterial({color:'#454a4c',roughness:.8}),metal=new T.MeshStandardMaterial({color:'#a7acae',metalness:.4,roughness:.65});
 function box(name,width,height,depth,x,y,z,material){const m=new T.Mesh(new T.BoxGeometry(width,height,depth),material);m.position.set(x,base+y,z);m.name=name;m.userData.furnishPartSource='bath-heater:'+name;m.userData.furnishStablePart='bath-heater:'+name;m.userData.ceilingOwnMaterial=true;m.castShadow=m.receiveShadow=true;g.add(m);}
 const light=P.definition(f).panelLight;
 if(light){
  const edge=Math.min(light.frame/1000,w/4,d/4),glow=new T.MeshStandardMaterial({color:'#fafbf8',emissive:light.color,emissiveIntensity:1.5,roughness:.65});
  (glow.userData||={}).ceilingPanelEmitter=true;
  for(const side of [-1,1]){
   box('light-frame-x-'+side,edge,rim,d,side*(w-edge)/2,rim/2,0,white);
   box('light-frame-z-'+side,w-2*edge,rim,edge,0,rim/2,side*(d-edge)/2,white);
  }
  box('light-diffuser',w-2*edge,rim,d-2*edge,0,rim/2,0,glow);
  if(h>rim)box('light-housing',w,h-rim,d,0,rim+(h-rim)/2,0,white);
  // The numeric solid recorder intentionally omits non-geometric lights.
  if(T.SpotLight&&T.Object3D)for(const side of [-1,1]){
   const lamp=new T.SpotLight(light.color,light.previewCandela,12,Math.PI/3,.6,2),target=new T.Object3D();
   lamp.position.set(0,base-.001,side*d/4);target.position.set(0,base-1,side*d/4);lamp.target=target;
   lamp.userData.ceilingPanelLight=true;g.add(lamp,target);
  }
  return g;
 }
 box('face-back',w,rim,d*.69,0,rim/2,-d*.155,white);
 box('face-front',w,rim,d*.09,0,rim/2,d*.455,white);
 for(const side of [-1,1])box('face-side-'+side,w*.12,rim,d*.22,side*w*.44,rim/2,d*.3,white);
 if(h>rim)box('body',w*.86,h-rim,d*.9,0,rim+(h-rim)/2,0,metal);
 // Recessed-look grille below the panel face; kept within the recorded envelope.
 box('grille',w*.76,rim*.15,d*.22,0,rim*.15,d*.3,dark);
 for(let i=0;i<10;i++)box('louvre-'+i,w*.76,rim*.1,d*.009,0,rim*.08,d*(.2+i*.022),white);
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishBathHeaterModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
