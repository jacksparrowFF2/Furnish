/* Imported YESWOOD single lounge chair. Dimensions in mm, geometry in metres. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f)?.armchairProfile&&!f.obj;
function build(T,f){
 const P=products(),A=P.definition(f).armchairProfile==='s05118'?(root.FurnishS05118BlenderAsset||require('../data/chair-s05118-blender-asset.js')):P.definition(f).armchairProfile==='berlin'?(root.FurnishBerlinArmchairBlenderAsset||require('../data/armchair-berlin-blender-asset.js')):(root.FurnishArmchairBlenderAsset||require('../data/armchair-blender-asset.js')),M=root.FurnishStaticAssetModel||require('./static-asset-model.js');
 const g=M.build(T,A,{...f,h:P.height(f)},0);
 // Same small, offline procedural maps in the application and production preview.
 if(T.DataTexture&&g.children[0]?.material){
  function texture(size,pixel){const data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,v=pixel(x,y);data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.needsUpdate=true;return t;}
  const grain=texture(128,(x,y)=>Math.round(230+12*Math.sin(x*.38+2*Math.sin(y*.055))+5*Math.sin(x*1.5+Math.sin(y*.11))));grain.colorSpace=T.SRGBColorSpace;
  const weave=texture(64,(x,y)=>Math.round(127+38*Math.sin(x*Math.PI/2)*Math.sin(y*Math.PI/2)+15*Math.sin(x*13+y*19)));
  // S05118's continuous hoop needs grain along the bend. A longest-axis planar
  // map puts crosswise stripes on its rear rail and side arms.
  const hoop=P.definition(f).armchairProfile==='s05118'?new T.CatmullRomCurve3([[.282,.265],[.289,.225],[.296,.16],[.300,.04],[.293,-.11],[.260,-.215],[.16,-.272],[0,-.290],[-.16,-.272],[-.260,-.215],[-.293,-.11],[-.300,.04],[-.296,.16],[-.289,.225],[-.282,.265]].map(([x,z])=>new T.Vector3(x,0,z)),false,'catmullrom',.5).getPoints(224):null;
  const lengths=hoop?[0]:null;if(hoop)for(let i=1;i<hoop.length;i++)lengths[i]=lengths[i-1]+hoop[i].distanceTo(hoop[i-1]);
  function hoopUV(x,z){let distance=Infinity,result;for(let i=1;i<hoop.length;i++){const a=hoop[i-1],b=hoop[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(l*l))),px=x-a.x-t*dx,pz=z-a.z-t*dz,d=px*px+pz*pz;if(d<distance){distance=d;result=[(px*-dz+pz*dx)/l*18,(lengths[i-1]+t*l)*1.5];}}return result;}
  for(const m of g.children){const part=A.parts.find(p=>p.name===m.name),a=m.geometry.attributes.position.array,uv=[],back=m.name.startsWith('back-')||m.name.startsWith('waist-');
   const ranges=[0,1,2].map(k=>{const v=Array.from(a).filter((_,i)=>i%3===k);return Math.max(...v)-Math.min(...v);}),long=ranges.indexOf(Math.max(...ranges)),cross=long===0?2:0;
   for(let i=0;i<a.length;i+=3){if(hoop&&m.name==='wraparound-arm')uv.push(...hoopUV(a[i]*660/f.w,a[i+2]*660/f.d));else uv.push(part.recolor?a[i+cross]*4:a[i]*65,part.recolor?a[i+long]*1.5:a[i+(back?1:2)]*65);}
   m.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
   if(part.recolor)m.material.map=grain;else if(P.definition(f).armchairProfile!=='s05118'&&!m.name.includes('seam')){m.material.bumpMap=weave;m.material.bumpScale=.00045;}
  }
 }
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishArmchairModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
