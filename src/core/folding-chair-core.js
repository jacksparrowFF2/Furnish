/* VIHALS rigid endpoint layout, mm. This is not a validated continuous linkage. */
(function(root){
'use strict';
const P=()=>root.FurnishProducts||require('./product-rules.js');
const asset=()=>root.FurnishVihalsBlenderAsset||require('../data/chair-vihals-blender-asset.js');
function role(name){return name==='rear-frame'?'rear':name.startsWith('seat-')||name.startsWith('hinge-')||name==='latch-right'?'seat':'main';}
function spec(){const r=P().definition('chair_ikea_vihals').foldingChairMotion;
 return {profile:'chair-vihals',motions:[{role:'main',axis:'x',pivot:r.mainPivot},{role:'rear',axis:'x',pivot:r.rearPivot},{role:'seat',axis:'x',pivot:r.seatPivot}],parts:['rear-frame','seat-pin-left','seat-underside','upper-pin-right','upper-pin-left','back-pin-right','back-pin-left','main-frame','seat-axle-left','seat-axle-right','latch-right','hinge-right','hinge-left','backrest','seat-top'].map(name=>({name,identity:'chair-vihals-v1:'+name,role:role(name)}))};}
function rotate(p,a,o=[0,0,0]){const c=Math.cos(a),s=Math.sin(a),y=p[1]-o[1],z=p[2]-o[2];return [p[0],o[1]+c*y-s*z,o[2]+s*y+c*z];}
function transforms(f){
 const r=P().definition(f).foldingChairMotion,s=[f.w/430,P().height(f)/800,f.d/470],scaled=p=>p.map((v,k)=>v*s[k]);
 if(!P().value(f,'foldingChairFolded'))return {s,frames:Object.fromEntries(['main','rear','seat'].map(role=>[role,{angle:0,pivot:[0,0,0],offset:[0,0,0]}]))};
 const a=r.mainAngle*Math.PI/180,pivot=scaled(r.mainPivot),rear=scaled(r.rearPivot),rearTarget=rotate(rear,a,pivot),rearFrame={angle:r.rearAngle*Math.PI/180,pivot:rear,offset:rearTarget.map((v,k)=>v-rear[k])},seat=scaled(r.seatPivot),seatTarget=rotate(seat,rearFrame.angle,rear).map((v,k)=>v+rearFrame.offset[k]-(k===1?r.seatDrop*s[1]:0));
 return {s,frames:{main:{angle:a,pivot,offset:[0,0,0]},rear:rearFrame,seat:{angle:r.seatAngle*Math.PI/180,pivot:seat,offset:seatTarget.map((v,k)=>v-seat[k])}}};
}
function point(p,frame){return rotate(p,frame.angle,frame.pivot).map((v,k)=>v+frame.offset[k]);}
const cache=new Map();
function layout(f){
 const folded=!!P().value(f,'foldingChairFolded'),key=JSON.stringify([f.w,f.d,P().height(f),folded,P().definition(f).foldingChairMotion,asset().sourceSha256]);if(cache.has(key))return cache.get(key);
 const t=transforms(f),low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
 for(const part of asset().parts){const frame=t.frames[part.role||role(part.name)];for(let i=0;i<part.positions.length;i+=3){const p=point(part.positions.slice(i,i+3).map((v,k)=>v*1000*t.s[k]),frame);for(let k=0;k<3;k++){low[k]=Math.min(low[k],p[k]);high[k]=Math.max(high[k],p[k]);}}}
 const shift=folded?[-(low[0]+high[0])/2,-low[1],-(low[2]+high[2])/2]:[0,0,0],size=high.map((v,k)=>v-low[k]),result={...t,folded,shift,size,bottom:folded?0:low[1],height:size[1],low:low.map((v,k)=>v+shift[k]),high:high.map((v,k)=>v+shift[k])};cache.set(key,result);if(cache.size>32)cache.delete(cache.keys().next().value);return result;
}
function outline(f){const l=layout(f);return [[l.low[0],l.low[2]],[l.high[0],l.low[2]],[l.high[0],l.high[2]],[l.low[0],l.high[2]]];}
const api={spec,role,rotate,point,transforms,layout,outline};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFoldingChair=api;
})(typeof globalThis!=='undefined'?globalThis:this);
