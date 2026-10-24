/* Reference dimensions in mm. Unmarked joinery/radii are visual estimates. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncPart=(object,source)=>{if(object?.userData){object.userData.furnishPartSource=source;object.userData.furnishPartOrdinal??=object.id;}return object;};

const supported=f=>f.type==='bench_yeswood_oak'&&!f.obj;
function build(T,f,RoundedBoxGeometry){
 const result=new T.Group(),body=new T.Group();result.add(body);
 function texture(fabric){
  const width=128,height=256,pixels=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const wave=x+2*Math.sin(y*.035)+Math.sin(y*.07+x*.05);
   const v=fabric?235+12*((x%3===0)!==(y%3===0)?1:0):244+5*Math.sin(wave*.65)+3*Math.sin(wave*2.8+y*.03);
   const i=(y*width+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;
  }
  const map=new T.DataTexture(pixels,width,height);map.needsUpdate=true;map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;return map;
 }
 const wood=new T.MeshStandardMaterial({color:f.color||'#bd925f',roughness:.43,map:texture(false)});
 const cloth=new T.MeshStandardMaterial({color:'#d7d1c5',roughness:.96,map:texture(true)});
 const seam=new T.MeshStandardMaterial({color:'#b9b1a3',roughness:1});
 function add(geometry,material,name,x,y,z){const o=syncPart(new T.Mesh(geometry,material),"shoe-bench-model:site-1");o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;o.userData.shoeBenchPart=name;body.add(o);return o;}
 function rounded(w,h,d,r,x,y,z,m,name){return syncPart(add(new RoundedBoxGeometry(w,h,d,5,r),m,name,x,y,z),"shoe-bench-model:site-2");}
 // 25 mm square legs, 740 / 240 mm clear spans; cushion sets the 300 mm depth.
 for(const x of [-382.5,382.5])for(const z of [-132.5,132.5])syncPart(rounded(25,410,25,5,x,205,z,wood,'leg'),"shoe-bench-model:site-3");
 for(const z of [-132.5,132.5])syncPart(rounded(765,40,25,5,0,390,z,wood,'seat-apron'),"shoe-bench-model:site-4");
 // Slightly projecting upper end rails bring the overall width to 800 mm.
 for(const x of [-385,385])syncPart(rounded(30,40,290,6,x,390,0,wood,'seat-end'),"shoe-bench-model:site-5");
 for(const [bottom,top,rodCenter] of [[60,95,79],[215,240,226]]){
  for(const x of [-382.5,382.5])syncPart(rounded(25,top-bottom,265,4,x,(top+bottom)/2,0,wood,'shelf-end'),"shoe-bench-model:site-6");
  for(const z of [-108,-54,0,54,108]){
   const rod=syncPart(add(new T.CylinderGeometry(9,9,765,20),wood,'shoe-rod',0,rodCenter,z),"shoe-bench-model:site-7");rod.rotation.z=Math.PI/2;
  }
 }
 // Subtle piping follows the same rounded cushion; no external texture files.
 syncPart(rounded(745,40,300,14,0,430,0,cloth,'cushion'),"shoe-bench-model:site-8");
 syncPart(rounded(744,1.6,299,13,0,419,0,seam,'piping'),"shoe-bench-model:site-9");
 for(const x of [-300,300]){
  for(const z of [-145.3,145.3])syncPart(rounded(32,39,2,0.8,x,390,z,cloth,'strap'),"shoe-bench-model:site-10");
  syncPart(rounded(32,2,289,0.8,x,409,0,cloth,'strap-top'),"shoe-bench-model:site-11");
 }
 body.scale.set((f.w??800)/800/1000,(f.h??450)/450/1000,(f.d??300)/300/1000);
 return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishShoeBenchModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
