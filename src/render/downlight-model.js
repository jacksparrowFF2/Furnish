/* DL269: reference envelope; unmarked reflector and spring details are visual estimates. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f)?.downlight&&!f.obj;
function build(T,f){
 const result=new T.Group(),body=new T.Group();result.add(body);
 const spec=products().downlightSpec(f);
 body.position.y=products().value(f,'mountHeight')/1000;
 const white=new T.MeshStandardMaterial({color:f.color||'#f4f4f0',roughness:.38,metalness:.2,side:T.DoubleSide});
 const black=new T.MeshStandardMaterial({color:'#303237',roughness:.7}),silver=new T.MeshStandardMaterial({color:'#b8bcc0',metalness:.8,roughness:.3});
 const glow=new T.MeshStandardMaterial({color:spec.color,emissive:spec.color,emissiveIntensity:1.5,roughness:.55});
 glow.userData.downlightEmitter=true;
 const add=(geometry,material,name,y=0)=>{const m=new T.Mesh(geometry,material);m.position.y=y;m.name=name;m.userData.furnishPartSource='downlight:'+name;m.castShadow=m.receiveShadow=true;m.userData.ceilingOwnMaterial=true;body.add(m);return m;};
 // All authored dimensions are mm before the boundary scale below.
 const profile=[[35,45],[35,15],[35,2],[42.5,2],[42.5,0],[35,0],[27.5,34]];
 add(new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),64),white,'housing-and-reflector');
 add(new T.CylinderGeometry(35,35,1,64),white,'rear-cap',44.5);
 add(new T.CylinderGeometry(27.5,27.5,.6,64),glow,'recessed-diffuser',34);
 for(const side of [-1,1]){
  const clip=add(new T.BoxGeometry(3,23,10),black,'spring-cover-'+side,18);clip.position.x=side*36.2;
  const spring=add(new T.TorusGeometry(3,.6,6,16),silver,'spring-'+side,35);spring.position.x=side*36;
 }
 body.scale.set(f.w/85/1000,products().height(f)/45/1000,f.d/85/1000);
 // Photometric approximation: uniform cone, variant flux over the documented 100° beam.
 const angle=spec.beam*Math.PI/360,intensity=spec.lumens/(2*Math.PI*(1-Math.cos(angle)));
 const lamp=new T.SpotLight(spec.color,intensity,12,angle,.3,2),target=new T.Object3D();
 const lightGroup=new T.Group();lightGroup.position.y=products().value(f,'mountHeight')/1000;
 lamp.position.y=-.001;target.position.y=-1;lamp.target=target;lamp.userData.downlightLight=true;lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);lamp.shadow.bias=-.0001;lightGroup.add(lamp,target);result.add(lightGroup);
 return result;
}
function setLights(group,on){group?.traverse(o=>{if(o.userData.downlightLight)o.visible=on;if(o.material?.userData?.downlightEmitter)o.material.emissiveIntensity=on?1.5:0;});}
const api={supported,build,setLights};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishDownlightModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
