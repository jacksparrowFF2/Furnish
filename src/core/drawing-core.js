/* Derived drawing annotations in mm. Display transforms never modify geometry. */
(function(root){
'use strict';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function settings(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['rotation','northAngle','dimensions','openings'].includes(k)))throw Error('图纸设置格式无效');
 const rotation=input.rotation??0,northAngle=input.northAngle??null,dimensions=input.dimensions??'auto',openings=input.openings??false;
 if(![0,90,180,270].includes(rotation)||northAngle!==null&&(!finite(northAngle)||northAngle<0||northAngle>=360)||!['auto','overall','original'].includes(dimensions)||typeof openings!=='boolean')throw Error('图纸旋转须为 90° 的倍数，北向须为 0–359.99°');
 return {rotation,northAngle,dimensions,openings};
}
function rotate(p,angle){const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [p[0]*c-p[1]*s,p[0]*s+p[1]*c];}
function bounds(box,angle=0){const corners=[[box.x,box.y],[box.x+box.w,box.y],[box.x+box.w,box.y+box.h],[box.x,box.y+box.h]].map(p=>rotate(p,angle)),xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
function dimensions(plan,input={}){
 const config=settings(input),walls=plan.walls||[],out=[],unique=values=>[...new Set(values.map(v=>Number(v.toFixed(4))))].sort((a,b)=>a-b);
 if(!walls.length)return out;
 const x0=Math.min(...walls.map(w=>w[0])),x1=Math.max(...walls.map(w=>w[2])),y0=Math.min(...walls.map(w=>w[1])),y1=Math.max(...walls.map(w=>w[3]));
 const add=(h,at,points,anchor,kind)=>{for(let i=1;i<points.length;i++){const lo=points[i-1],hi=points[i];if(hi-lo<.01)continue;out.push({a:h?[lo,at]:[at,lo],b:h?[hi,at]:[at,hi],refs:h?[[lo,anchor],[hi,anchor]]:[[anchor,lo],[anchor,hi]],value:hi-lo,h,kind});}};
 if(config.dimensions==='original')for(const d of plan.dims||[]){const points=[d.start];for(const v of d.segs)points.push(points.at(-1)+v);add(d.h,d.at,points,d.at,'original');}
 else{
  if(config.dimensions==='auto'){
   // These are projected structural-face chains, not bounding-box room net sizes.
   const xs=unique([x0,x1,...walls.filter(w=>w[2]-w[0]<=w[3]-w[1]).flatMap(w=>[w[0],w[2]])]),ys=unique([y0,y1,...walls.filter(w=>w[3]-w[1]<=w[2]-w[0]).flatMap(w=>[w[1],w[3]])]);
   add(true,y0-550,xs,y0,'chain');add(true,y1+550,xs,y1,'chain');add(false,x0-550,ys,x0,'chain');add(false,x1+550,ys,x1,'chain');
  }
  const gap=config.dimensions==='auto'?1050:550;add(true,y0-gap,[x0,x1],y0,'overall');add(true,y1+gap,[x0,x1],y1,'overall');add(false,x0-gap,[y0,y1],x0,'overall');add(false,x1+gap,[y0,y1],x1,'overall');
 }
 if(config.openings)for(const o of [...plan.doors||[],...plan.wins||[],...plan.slides||[]]){const [x,y,X,Y]=o.rect,h=X-x>=Y-y;if(h)add(true,y-250,[x,X],y,'opening');else add(false,x-250,[y,Y],x,'opening');}
 return out;
}
function drawingBounds(plan,input={}){const all=(plan.walls||[]).flatMap(w=>[[w[0],w[1]],[w[2],w[3]]]);for(const d of dimensions(plan,input))all.push(d.a,d.b,...d.refs);const b=plan.bounds||{x:0,y:0,w:1000,h:1000};if(!all.length)return b;const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),pad=350,x=Math.min(b.x,Math.min(...xs)-pad),y=Math.min(b.y,Math.min(...ys)-pad);return {x,y,w:Math.max(b.x+b.w,Math.max(...xs)+pad)-x,h:Math.max(b.y+b.h,Math.max(...ys)+pad)-y};}
function sun(horizontal,input={}){return rotate(horizontal,settings(input).northAngle??0);}
const api={settings,rotate,bounds,dimensions,drawingBounds,sun};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishDrawing=api;
})(typeof globalThis!=='undefined'?globalThis:this);
