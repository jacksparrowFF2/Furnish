/* Shared ceiling-panel devices. Unmarked construction and light output are visual assumptions. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f)?.ceilingPanel&&!f.obj;
function build(T,f){
 if(products().definition(f).ceilingPanel.profile==='se2')return buildSE2(T,f);
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
// SE2: 110 mm box above a 2 mm visual face (face thickness is unconfirmed).
function buildSE2(T,f){
 const P=products(),spec=P.definition(f).ceilingPanel,g=new T.Group(),base=P.value(f,'mountHeight')/1000,w=f.w/1000,d=f.d/1000,h=P.height(f)/1000,r=Math.min(spec.rim/1000,h);
 const white=new T.MeshStandardMaterial({color:f.color||'#f5f5f3',roughness:.4}),metal=new T.MeshStandardMaterial({color:'#9da3a6',metalness:.55,roughness:.55}),dark=new T.MeshStandardMaterial({color:'#626b70',roughness:.65}),display=new T.MeshStandardMaterial({color:'#252e34',roughness:.28}),light=new T.MeshStandardMaterial({color:'#fffffa',emissive:'#fffff0',emissiveIntensity:.65,roughness:.65}),ink=new T.MeshStandardMaterial({color:'#d9e5e8'}),orange=new T.MeshStandardMaterial({color:'#ec7b28'});
 function mesh(name,geometry,x,y,z,mat){const m=new T.Mesh(geometry,mat);m.position.set(x,base+y,z);m.name=name;m.userData.furnishPartSource='bath-heater-se2:'+name;m.userData.furnishStablePart='bath-heater-se2:'+name;m.userData.ceilingOwnMaterial=true;m.castShadow=m.receiveShadow=true;g.add(m);return m;}
 function box(n,a,b,c,x,y,z,mat){return mesh(n,new T.BoxGeometry(a,b,c),x,y,z,mat);}
 box('face',w,r*.2,d,0,r*.9,0,white);
 for(const side of [-1,1]){box('rim-side-'+side,w*.025,r,d,side*w*.4875,r/2,0,white);box('rim-end-'+side,w*.95,r,d*.025,0,r/2,side*d*.4875,white);}
 // The broad luminous face and five full-length vent slots follow the supplied underside views.
 box('diffuser',w*.675,r*.35,d*.95,w*.1375,r*.475,0,light);
 for(let i=0;i<5;i++)box('vent-'+i,w*.018,r*.2,d*.91,w*(-.45+i*.032),r*.55,0,dark);
 const radius=w*.036;
 mesh('display',new T.CylinderGeometry(radius,radius,r*.2,32),-w*.235,r*.5,-d*.425,display);
 for(let i=0;i<3;i++)box('display-mark-'+i,w*.007,r*.1,d*.009,-w*.235+w*(i-1)*.015,r*.35,-d*.425,ink);
 for(let i=0;i<4;i++){box('indicator-'+i,w*.015,r*.1,d*.012,-w*.235,r*.4,d*(-.29+i*.12),metal);box('indicator-label-'+i,w*.008,r*.1,d*.024,-w*.235,r*.4,d*(-.26+i*.12),metal);}
 box('brand-accent',w*.012,r*.1,d*.025,-w*.235,r*.35,d*.325,orange);
 for(let i=0;i<4;i++)box('brand-mark-'+i,w*.02,r*.1,d*.004,-w*.235,r*.35,d*(.37+i*.016),dark);
 if(h>r)box('body',w*.86,h-r,d*.9,0,r+(h-r)/2,0,metal);
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishBathHeaterModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
