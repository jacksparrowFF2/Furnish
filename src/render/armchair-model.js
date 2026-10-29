/* Imported YESWOOD single lounge chair. Dimensions in mm, geometry in metres. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!products().definition(f)?.armchairProfile&&!f.obj;
function build(T,f){
 const P=products(),A=P.definition(f).armchairProfile==='berlin'?(root.FurnishBerlinArmchairBlenderAsset||require('../data/armchair-berlin-blender-asset.js')):(root.FurnishArmchairBlenderAsset||require('../data/armchair-blender-asset.js')),M=root.FurnishStaticAssetModel||require('./static-asset-model.js');
 const g=M.build(T,A,{...f,h:P.height(f)},0);
 // Same small, offline procedural maps in the application and production preview.
 if(T.DataTexture&&g.children[0]?.material){
  function texture(size,pixel){const data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,v=pixel(x,y);data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.needsUpdate=true;return t;}
  const grain=texture(128,(x,y)=>Math.round(230+12*Math.sin(x*.38+2*Math.sin(y*.055))+5*Math.sin(x*1.5+Math.sin(y*.11))));grain.colorSpace=T.SRGBColorSpace;
  const weave=texture(64,(x,y)=>Math.round(127+38*Math.sin(x*Math.PI/2)*Math.sin(y*Math.PI/2)+15*Math.sin(x*13+y*19)));
  for(const m of g.children){const part=A.parts.find(p=>p.name===m.name),a=m.geometry.attributes.position.array,uv=[],back=m.name.startsWith('back-')||m.name.startsWith('waist-');
   const ranges=[0,1,2].map(k=>{const v=Array.from(a).filter((_,i)=>i%3===k);return Math.max(...v)-Math.min(...v);}),long=ranges.indexOf(Math.max(...ranges)),cross=long===0?2:0;
   for(let i=0;i<a.length;i+=3)uv.push(part.recolor?a[i+cross]*4:a[i]*65,part.recolor?a[i+long]*1.5:a[i+(back?1:2)]*65);
   m.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
   if(part.recolor)m.material.map=grain;else if(!m.name.includes('seam')){m.material.bumpMap=weave;m.material.bumpScale=.00045;}
  }
 }
 return g;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishArmchairModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
