/* Custom insert dimensions and linear motion, mm. Hardware sizes are layout assumptions. */
(function(root){
'use strict';
const P=()=>root.FurnishProducts||require('./product-rules.js');
function layout(f){
 const r=P().definition(f)?.feedingFrame;if(!r||f.obj)return null;
 const w=f.w,d=f.d,h=P().height(f),base=P().value(f,'mountHeight');
 if(![w,d,h,base].every(Number.isFinite)||w<r.minWidth||w>r.maxWidth||d<r.minDepth||d>r.maxDepth||h<r.minHeight||h>r.maxHeight)throw Error('喂食金属架软件范围：宽550–1200、深330–800、高450–1000mm；非额定承重规格');
 if(f.petTrayOpen!==undefined&&typeof f.petTrayOpen!=='boolean')throw Error('喂食器抽拉状态须为布尔值');
 const travel=d+20,shift=P().value(f,'petTrayOpen')?travel:0,x=-w/4+r.tube/4;
 return {...r,w,d,h,base,travel,shift,tray:{x,w:r.trayWidth,d,top:r.trayTop,shift},feeder:{...r.feeder,x,y:r.trayTop,z:(d-r.feeder.d)/2-3+shift}};
}
function parts(f){
 const l=layout(f);if(!l)return [];
 const out=[],t=l.tube,wall=l.wall,add=(key,w,h,d,x,bottom,z,material='frame',moving=false,rotation=0)=>out.push({key,w,h,d,x,bottom,z,material,moving,rotation});
 function tube(key,axis,length,x,y,z){
  if(axis==='y'){for(const side of [-1,1]){add(key+'-x'+side,wall,length,t,x+side*(t-wall)/2,y,z);add(key+'-z'+side,t-2*wall,length,wall,x,y,z+side*(t-wall)/2);}}
  else if(axis==='x'){for(const side of [-1,1]){add(key+'-y'+side,length,wall,t,x,y+(side+1)*(t-wall)/2,z);add(key+'-z'+side,length,t-2*wall,wall,x,y+wall,z+side*(t-wall)/2);}}
  else{for(const side of [-1,1]){add(key+'-y'+side,t,wall,length,x,y+(side+1)*(t-wall)/2,z);add(key+'-x'+side,wall,t-2*wall,length,x+side*(t-wall)/2,y+wall,z);}}
 }
 for(const [side,x]of [['left',-(l.w-t)/2],['middle',0],['right',(l.w-t)/2]])for(const [face,z]of [['back',-(l.d-t)/2],['front',(l.d-t)/2]]){
  add('foot-'+side+'-'+face,t,3,t,x,0,z,'rubber');tube('post-'+side+'-'+face,'y',l.h-l.plate-t-3,x,3,z);
 }
 for(const [face,z]of [['back',-(l.d-t)/2],['front',(l.d-t)/2]])tube('beam-'+face,'x',l.w,0,l.h-l.plate-t,z);
 for(const [side,x]of [['left',-(l.w-t)/2],['middle',0],['right',(l.w-t)/2]])tube('beam-'+side,'z',l.d-2*t,x,l.h-l.plate-t,0);
 add('top-shelf',l.w,l.plate,l.d,0,l.h-l.plate,0,'shelf');
 for(const [side,cx]of [['left',-l.w/4],['right',l.w/4]])for(const sign of [-1,1]){const dx=l.w/2-t,dy=l.h-110,length=Math.hypot(dx,dy),angle=-sign*Math.atan2(dx,dy);add('brace-'+side+'-'+sign,12,length,2,cx,70-(length-dy)/2,-l.d/2+1,'frame',false,angle);}
 for(const [side,x]of [['left',l.tray.x-l.tray.w/2-3.5],['right',l.tray.x+l.tray.w/2+3.5]]){
  const post=side==='left'?-(l.w-t)/2:0,bridge=Math.abs(x-post);
  for(const [end,z]of [['back',-(l.d-t)/2],['front',(l.d-t)/2]])add('rail-bracket-'+side+'-'+end,bridge,12,20,(x+post)/2,18,z,'rail');
  for(const [stage,width,height,bottom,shift]of [['outer',6,12,18,0],['middle',4,8,20,l.shift/2]]){
   const moving=stage==='middle';add('rail-'+side+'-'+stage+'-web',width,1,l.d-20,x,bottom,shift,'rail',moving);
   for(const sign of [-1,1])add('rail-'+side+'-'+stage+'-side'+sign,1,height-1,l.d-20,x+sign*(width-1)/2,bottom+1,shift,'rail',moving);
  }
  add('rail-'+side+'-inner',2,4,l.d-20,x,22,l.shift,'rail',true);
  for(const [end,z]of [['back',-l.d/2+15],['front',l.d/2-15]])add('tray-mount-'+side+'-'+end,2,4,20,x,26,z+l.shift,'rail',true);
 }
 add('tray-floor',l.tray.w,2,l.d,l.tray.x,l.tray.top-2,l.shift,'shelf',true);
 for(const side of [-1,1])add('tray-side-'+side,2,6,l.d,l.tray.x+side*(l.tray.w/2-1),l.tray.top,l.shift,'shelf',true);
 add('tray-back',l.tray.w-4,8,2,l.tray.x,l.tray.top,-l.d/2+1+l.shift,'shelf',true);
 return out;
}
function outline(f){const l=layout(f),half=l.tray.w/2+6.5;return l.shift?[[-l.w/2,-l.d/2],[l.w/2,-l.d/2],[l.w/2,l.d/2],[l.tray.x+half,l.d/2],[l.tray.x+half,l.d/2+l.shift],[l.tray.x-half,l.d/2+l.shift],[l.tray.x-half,l.d/2],[-l.w/2,l.d/2]]:[[-l.w/2,-l.d/2],[l.w/2,-l.d/2],[l.w/2,l.d/2],[-l.w/2,l.d/2]];}
function openingZones(f,{passage=800}={}){
 const l=layout(f);if(!l)return [];
 const a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),transform=([x,y])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*c-y*s,(f.cy||0)+x*s+y*c];};
 const half=l.tray.w/2+6.5,rect=(back,front)=>[[l.tray.x-half,back],[l.tray.x+half,back],[l.tray.x+half,front],[l.tray.x-half,front]].map(transform),front=l.d/2+l.travel;
 return [{kind:'cabinetdrawer',column:0,section:'feeding-tray',poly:rect(-l.d/2,front),ranges:[[l.base+18,l.base+l.trayTop+l.feeder.h]]},{kind:'cabinetpassage',column:0,section:'feeding-tray',poly:rect(front,front+passage),ranges:[[l.base,l.base+2000]]}];
}
const api={layout,parts,outline,openingZones};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishPetFeedingCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
