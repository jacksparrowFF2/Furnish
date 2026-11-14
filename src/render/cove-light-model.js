/* Custom up-light channel around a proposed L2 strip, not a factory fixture replica. */
(function(root){'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f)?.coveLight&&!f.obj;
function build(T,f){
 const q=products().coveLightLayout(f),L=root.FurnishLighting||require('../core/lighting-core.js'),g=new T.Group(),m=v=>v/1000;
 const white=new T.MeshStandardMaterial({color:f.color||'#f0f0eb',roughness:.5,metalness:.2}),aluminum=new T.MeshStandardMaterial({color:'#b8bdba',roughness:.55,metalness:.6}),opal=new T.MeshStandardMaterial({color:'#f4f0e7',roughness:.65});
 function add(name,geometry,material,x,y,z){const o=new T.Mesh(geometry,material);o.name=name;o.position.set(m(x),m(q.base+y),m(z));o.userData.furnishPartSource='cove-light:'+name;o.userData.furnishStablePart='cove-light:'+name;o.castShadow=o.receiveShadow=true;g.add(o);return o;}
 const box=(n,w,h,d,x,y,z,mat)=>add(n,new T.BoxGeometry(m(w),m(h),m(d)),mat,x,y+h/2,z);
 box('base',q.w,q.t,q.d,0,0,0,white);
 box('back',q.innerWidth,q.h-q.t,q.t,0,q.t,-(q.d-q.t)/2,white);
 box('front-shield',q.innerWidth,q.h-q.t,q.t,0,q.t,(q.d-q.t)/2,white);
 for(const s of [-1,1])box('end-'+s,q.t,q.h-q.t,q.d,s*(q.w-q.t)/2,q.t,0,white);
 box('strip-support',q.innerWidth,q.emitterHeight-1-q.t,q.stripWidth+2,0,q.t,q.emitterZ,aluminum);
 box('diffuser',q.innerWidth,1,q.stripWidth,0,q.emitterHeight-1,q.emitterZ,opal);
 const width=m(q.innerWidth),depth=m(q.stripWidth),hw=width/2,hd=depth/2,plane=new T.BufferGeometry();
 plane.setAttribute('position',new T.Float32BufferAttribute([-hw,0,-hd,hw,0,hd,hw,0,-hd,-hw,0,-hd,-hw,0,hd,hw,0,hd],3));plane.computeVertexNormals();
 const radiance=L.panel(q.candela,width,depth),glow=new T.MeshStandardMaterial({color:'#fff9ee',emissive:q.color,emissiveIntensity:radiance,roughness:.65});
 Object.assign(glow.userData||=( {} ),{ceilingPanelEmitter:true,independentEmitter:true,emissionOn:radiance});add('emitting-face',plane,glow,0,q.emitterHeight+.01,q.emitterZ);
 g.userData.lightingRects=[{name:'upward-cob-strip',position:[0,m(q.base+q.emitterHeight+.02),m(q.emitterZ)],width,height:depth,u:[1,0,0],v:[0,0,1],normal:[0,1,0],radiance,color:q.color,material:glow}];
 if(T.SpotLight&&T.Object3D){const count=Math.max(1,Math.ceil(q.w/500));for(let i=0;i<count;i++){const lamp=new T.SpotLight(q.color,L.radiometric(q.candela/count),0,Math.PI/2,1,2),target=new T.Object3D();lamp.position.set(width*((i+.5)/count-.5),m(q.base+q.emitterHeight+.03),m(q.emitterZ));target.position.copy(lamp.position);target.position.y+=1;lamp.target=target;Object.assign(lamp.userData,{ceilingPanelLight:true,independentLight:true,areaSurrogate:true,radiometricLight:true});lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);lamp.shadow.camera.near=.001;lamp.shadow.bias=-.00002;lamp.shadow.normalBias=.0002;g.add(lamp,target);}}
 return g;
}
const api={supported,build};root.FurnishCoveLightModel=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
