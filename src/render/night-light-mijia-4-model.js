/* The magnetic-base pose drives rendering, layout solids and export. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!f.obj&&products().family(f,'night-light');

function build(T,f){
 const P=products(),spec=P.definition(f).mijiaNightLight;
 const asset=root.FurnishMijiaNightLight4Asset||require('../data/night-light-mijia-4-blender-asset.js');
 const h=P.height(f),base=P.value(f,'mountHeight');
 const g=(root.FurnishStaticAssetModel||require('./static-asset-model.js')).build(T,asset,{...f,h},base);
 const diffuser=g.children.find(mesh=>mesh.name==='rear-diffuser');
 if(!diffuser.material)return g; // Numeric solid recording does not create materials or lights.

 const lighting=root.FurnishLighting||require('../core/lighting-core.js');
 const [sx,sy,sz]=[f.w/asset.sizeMm[0],h/asset.sizeMm[1],f.d/asset.sizeMm[2]];
 const color=spec.color,flux=spec.lumens*P.value(f,'lightPreviewLevel')/100;
 const radiance=lighting.radiometric(flux/Math.PI)/(Math.PI*(45**2-30**2)*sx*sy/1e6);
 diffuser.material.emissive.set(color);
 diffuser.material.emissiveIntensity=radiance;
 Object.assign(diffuser.material.userData,{ceilingPanelEmitter:true,emissionOn:radiance});
 g.userData.lightingRects=[];
 for(let i=0;i<4;i++){
  const angle=i*Math.PI/2,x=Math.cos(angle),y=Math.sin(angle);
  const position=[.037*x*sx,base/1000+(.0467+.037*y)*sy,.01035*sz];
  const width=.026*(i%2?sx:sy),height=.012*(i%2?sy:sx);
  const sample=lighting.panel(flux/(4*Math.PI),width,height);
  g.userData.lightingRects.push({name:'rear-diffuser-'+i,position,width,height,
   u:[-y,x,0],v:[-x,-y,0],normal:[0,0,-1],radiance:sample,color,material:diffuser.material});
  if(!T.SpotLight)continue;
  const lamp=new T.SpotLight(color,lighting.radiometric(flux/(4*Math.PI)),0,Math.PI/2,1,2);
  const target=new T.Object3D();
  lamp.position.fromArray(position);
  target.position.set(position[0]+x*.3,position[1]+y*.3,position[2]-1);
  lamp.target=target;
  Object.assign(lamp.userData,{ceilingPanelLight:true,areaSurrogate:true,radiometricLight:true});
  g.add(lamp,target);
 }
 return g;
}

const api={supported,build};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.FurnishMijiaNightLight4Model=api;
})(typeof globalThis!=='undefined'?globalThis:this);
