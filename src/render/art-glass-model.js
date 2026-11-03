/* Made-to-measure patterned glass. Embedded tangent normals survive offline GLB export.
 * One patterned face, flat back and polished edges. Optical relief is an appearance
 * approximation, not measured physical displacement or a fabrication profile. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>products().family(f,'art-glass')&&!f.obj;
const tau=2*Math.PI,fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
function noise(x,y,n=8){
 x*=n;y*=n;const ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y),sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),h=(a,b)=>hash((a%n+n)%n,(b%n+n)%n);
 return mix(mix(h(ix,iy),h(ix+1,iy),sx),mix(h(ix,iy+1),h(ix+1,iy+1),sx),sy);
}
function relief(kind,u,v){
 if(kind==='reeded'||kind==='fluted')return .5+.5*Math.cos(tau*u);
 if(kind==='ingot')return Math.pow(Math.max(0,Math.sin(Math.PI*u)*Math.sin(Math.PI*v)),.55);
 if(kind==='cube')return noise(u,v,3)*.8+noise(u,v,6)*.2;
 if(kind==='silver-wave')return noise(u+Math.sin(tau*v)*.10,v,4)*.95+noise(u,v,24)*.05;
 if(kind==='water-wave')return noise(u,v,3)*.92+noise(u,v,32)*.08;
 if(kind==='pear')return noise(u,v,24)*.65+noise(u,v,48)*.35;
 if(kind==='mist')return noise(u,v,12)*.7+noise(u,v,32)*.3;
 return Math.pow(noise(u,v,16),1.8)*.8+noise(u,v,40)*.2;
}
function normalPixels(kind,size=256){
 const r=products().artGlassPatterns[kind];if(!r)throw Error('未知艺术玻璃花纹');
 const data=new Uint8Array(size*size*4),e=1/size;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,dx=(relief(kind,fract(u+e),v)-relief(kind,fract(u-e),v))*r.relief/(2*e*r.pitch),dy=(relief(kind,u,fract(v+e))-relief(kind,u,fract(v-e)))*r.relief/(2*e*r.pitch),len=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  data[i]=Math.round((1-dx/len)*127.5);data[i+1]=Math.round((1-dy/len)*127.5);data[i+2]=Math.round((1+1/len)*127.5);data[i+3]=255;
 }
 return data;
}
function build(T,f){
 const P=products(),l=P.artGlass(f),r=P.artGlassPatterns[l.pattern],g=new T.Group(),Physical=T.MeshPhysicalMaterial||T.MeshStandardMaterial;
 const options={color:f.color||'#ffffff',roughness:r.roughness,metalness:0};
 if(T.MeshPhysicalMaterial)Object.assign(options,{transmission:1,ior:1.5,thickness:f.d/1000,attenuationColor:'#e5f6f0',attenuationDistance:3});
 const clear=new Physical(options),pattern=clear.clone?clear.clone():new Physical(options);
 if(T.DataTexture&&pattern.normalScale){
  // A private texture per instance: changing dimensions never mutates another pane.
  const tex=new T.DataTexture(normalPixels(l.pattern),256,256,T.RGBAFormat);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(f.w/r.pitch,l.h/r.pitch);tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;
  pattern.normalMap=tex;pattern.normalScale.set(1,1);
 }
 clear.name='art-glass-polished-edge';pattern.name='art-glass-'+l.pattern;
 const mesh=new T.Mesh(new T.BoxGeometry(f.w/1000,l.h/1000,f.d/1000),[clear,clear,clear,clear,pattern,clear]);
 mesh.position.y=(l.bottom+l.h/2)/1000;mesh.name='art-glass-pane';mesh.userData.artGlassOwnMaterial=true;mesh.userData.artGlassPart='pane';mesh.userData.furnishStablePart='art-glass:pane';mesh.userData.furnishPartSource='art-glass:pane';
 mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return g;
}
const api={supported,build,normalPixels,relief};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishArtGlassModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
