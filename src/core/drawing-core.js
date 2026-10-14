/* Derived drawing annotations in mm. Display transforms never modify geometry. */
(function(root){
'use strict';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function settings(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['rotation','northAngle','dimensions','openings'].includes(k)))throw Error('图纸设置格式无效');
 const rotation=input.rotation??0,northAngle=input.northAngle??null,dimensions=input.dimensions??'auto',openings=input.openings??false;
 if(![0,90,180,270].includes(rotation)||northAngle!==null&&(!finite(northAngle)||northAngle<0||northAngle>=360)||!['auto','full','overall','original'].includes(dimensions)||typeof openings!=='boolean')throw Error('图纸旋转须为 90° 的倍数，北向须为 0–359.99°');
 return {rotation,northAngle,dimensions,openings};
}
function rotate(p,angle){const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [p[0]*c-p[1]*s,p[0]*s+p[1]*c];}
function bounds(box,angle=0){const corners=[[box.x,box.y],[box.x+box.w,box.y],[box.x+box.w,box.y+box.h],[box.x,box.y+box.h]].map(p=>rotate(p,angle)),xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
function outlineCuts(rects,h,unique){
 if(!rects.length)return [];
 const axis=h?0:1,cross=1-axis,cuts=unique(rects.flatMap(r=>[r[axis],r[axis+2]])),result=[cuts[0]];let previous=null;
 for(let i=1;i<cuts.length;i++){const mid=(cuts[i-1]+cuts[i])/2,active=rects.filter(r=>r[axis]<mid&&r[axis+2]>mid),profile=active.length?[Math.min(...active.map(r=>r[cross])),Math.max(...active.map(r=>r[cross+2]))]:[Infinity,-Infinity];if(previous&&(profile[0]!==previous[0]||profile[1]!==previous[1]))result.push(cuts[i-1]);previous=profile;}
 result.push(cuts.at(-1));return unique(result);
}
function dimensions(plan,input={}){
 const config=settings(input),walls=plan.walls||[],out=[],unique=values=>[...new Set(values.map(v=>Number(v.toFixed(4))))].sort((a,b)=>a-b);
 if(!walls.length)return out;
 const x0=Math.min(...walls.map(w=>w[0])),x1=Math.max(...walls.map(w=>w[2])),y0=Math.min(...walls.map(w=>w[1])),y1=Math.max(...walls.map(w=>w[3]));
 const add=(h,at,points,anchor,kind)=>{for(let i=1;i<points.length;i++){const lo=points[i-1],hi=points[i];if(hi-lo<.01)continue;out.push({a:h?[lo,at]:[at,lo],b:h?[hi,at]:[at,hi],refs:h?[[lo,anchor],[hi,anchor]]:[[anchor,lo],[anchor,hi]],value:hi-lo,h,kind});}};
 if(config.dimensions==='original')for(const d of plan.dims||[]){const points=[d.start];for(const v of d.segs)points.push(points.at(-1)+v);add(d.h,d.at,points,d.at,'original');}
 else{
  const full=config.dimensions==='full',top=[0,270].includes(config.rotation),left=[0,90].includes(config.rotation);let xs=[],ys=[];
  if(full){
   xs=unique([x0,x1,...walls.filter(w=>w[2]-w[0]<=w[3]-w[1]).flatMap(w=>[w[0],w[2]])]);ys=unique([y0,y1,...walls.filter(w=>w[3]-w[1]<=w[2]-w[0]).flatMap(w=>[w[1],w[3]])]);
  }else if(config.dimensions==='auto'){
   // Fill wall openings when tracing the outer envelope; an opening is not an outline notch.
   const rects=[...walls,...plan.doors||[],...plan.wins||[],...plan.slides||[]].map(r=>r.rect||r).map(r=>[Math.max(x0,r[0]),Math.max(y0,r[1]),Math.min(x1,r[2]),Math.min(y1,r[3])]).filter(r=>r[2]>r[0]&&r[3]>r[1]);
   xs=outlineCuts(rects,true,unique);ys=outlineCuts(rects,false,unique);
  }
  if(xs.length>2){if(full||top)add(true,y0-550,xs,y0,'chain');if(full||!top)add(true,y1+550,xs,y1,'chain');}
  if(ys.length>2){if(full||left)add(false,x0-550,ys,x0,'chain');if(full||!left)add(false,x1+550,ys,x1,'chain');}
  const hGap=xs.length>2?1050:550,vGap=ys.length>2?1050:550;
  if(full||top)add(true,y0-hGap,[x0,x1],y0,'overall');if(full||!top)add(true,y1+hGap,[x0,x1],y1,'overall');if(full||left)add(false,x0-vGap,[y0,y1],x0,'overall');if(full||!left)add(false,x1+vGap,[y0,y1],x1,'overall');
 }
 if(config.openings)for(const o of [...plan.doors||[],...plan.wins||[],...plan.slides||[]]){const [x,y,X,Y]=o.rect,h=X-x>=Y-y;if(h)add(true,y-250,[x,X],y,'opening');else add(false,x-250,[y,Y],x,'opening');}
 return out;
}
function drawingBounds(plan,input={}){const all=(plan.walls||[]).flatMap(w=>[[w[0],w[1]],[w[2],w[3]]]);for(const d of dimensionLayout(dimensions(plan,input),{rotation:settings(input).rotation})){all.push(d.a,d.b,...d.refs);if(d.label)all.push([d.label.box[0],d.label.box[1]],[d.label.box[2],d.label.box[3]]);}const b=plan.bounds||{x:0,y:0,w:1000,h:1000};if(!all.length)return b;const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),pad=350,x=Math.min(b.x,Math.min(...xs)-pad),y=Math.min(b.y,Math.min(...ys)-pad);return {x,y,w:Math.max(b.x+b.w,Math.max(...xs)+pad)-x,h:Math.max(b.y+b.h,Math.max(...ys)+pad)-y};}
function sun(horizontal,input={}){return rotate(horizontal,settings(input).northAngle??0);}
function rasterSize(box){
 if(!box||!finite(box.w)||!finite(box.h)||box.w<=0||box.h<=0)throw Error('导出范围无效');
 const width=3200,height=width*box.h/box.w,scale=Math.min(1,8192/width,8192/height,Math.sqrt(16e6/(width*height)));
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}
const boxHit=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
function textAngle(angle,rotation=0){let screen=((angle+rotation+180)%360+360)%360-180;if(screen>90)screen-=180;if(screen<-90)screen+=180;return screen-rotation;}
const textWidth=(text,font)=>[...text].reduce((n,c)=>n+(/[\x00-\x7f]/.test(c)?.62:1),0)*font;
function furnitureLabels(items,{rotation=0,scale=0,selected=[]}={}){
 const used=[],chosen=new Set(selected),result=new Map(items.map(f=>[f.id,{id:f.id,lines:[],box:null}]));
 const hit=(a,b)=>boxHit(a,b),ordered=[...items].sort((a,b)=>Number(chosen.has(b.id))-Number(chosen.has(a.id))||b.w*b.d-a.w*a.d);
 const wrap=(text,width,font)=>{const chars=[...text],lines=[];let line='';for(const c of chars){if(textWidth(line+c,font)>width&&line){lines.push(line.trim());line=c.trimStart();}else line+=c;}if(line)lines.push(line.trim());const truncated=lines.length>2;if(truncated){lines.length=2;while(lines[1]&&textWidth(lines[1]+'…',font)>width)lines[1]=[...lines[1]].slice(0,-1).join('');lines[1]+='…';}return {lines,truncated};};
 for(const f of ordered){
  if(Math.min(f.w,f.d)<380)continue;const text=String(f.name||'').trim().replace(/\s+/g,' ');if(!text)continue;
  const angle=((f.rot||0)+rotation)*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle)),center=rotate([f.cx,f.cy],rotation),initial=Math.max(80,Math.min(170,Math.min(f.w,f.d)*.2));let fallback=null,full=[];
  for(const font of [...new Set([initial,Math.max(80,initial*.85),Math.max(80,initial*.7)])]){
   if(scale&&font*scale<8)continue;const height=font*2.5,margin=40,width=Math.min(c>1e-6?(f.w-2*margin-s*height)/c:Infinity,s>1e-6?(f.d-2*margin-c*height)/s:Infinity)-font*.3;
   if(width<font*2.5)continue;const v=wrap(text,width,font),w=Math.max(...v.lines.map(line=>textWidth(line,font)))+font*.3,h=v.lines.length*font*1.2;
   const candidate={id:f.id,...v,font,width:w,height:h};if(v.truncated){if(!fallback||font<fallback.font)fallback=candidate;}else full.push(candidate);
  }
  const candidates=[...full,...(fallback?[fallback]:[])];let best=null;
  for(const v of candidates){for(const at of [[0,0],[0,-v.height],[0,v.height]]){
    const a=Math.cos(angle)*at[0]+Math.sin(angle)*at[1],b=-Math.sin(angle)*at[0]+Math.cos(angle)*at[1];
    if(Math.abs(a)+(c*v.width+s*v.height)/2>f.w/2-25||Math.abs(b)+(s*v.width+c*v.height)/2>f.d/2-25)continue;
    const box=[center[0]+at[0]-v.width/2,center[1]+at[1]-v.height/2,center[0]+at[0]+v.width/2,center[1]+at[1]+v.height/2];if(used.some(other=>hit(box,other)))continue;best={...v,at,box};break;
   }if(best)break;}
  if(best){used.push(best.box);result.set(f.id,best);}
 }
 return [...result.values()];
}
function dimensionLayout(lines,{scale=0,rotation=0}={}){
 const placed=[],result=lines.map(d=>({...d,label:null,simple:scale>0&&d.kind==='chain'&&d.value*scale<6}));
 const indices=result.map((_,i)=>i).sort((a,b)=>(result[a].kind==='overall'?-1:0)-(result[b].kind==='overall'?-1:0)||result[b].value-result[a].value||a-b);
 for(const index of indices){const d=result[index];if(d.value<80||scale&&d.kind!=='overall'&&d.value*scale<12)continue;const font=Math.max(d.value<400?140:180,scale?10/scale:0),text=String(Math.round(d.value)),width=text.length*font*.62+font*.3,height=font*1.25,axis=d.h?1:0,mid=d.a.map((v,i)=>(v+d.b[i])/2),anchor=d.refs.reduce((n,p)=>n+p[axis]/d.refs.length,0),sign=Math.sign(mid[axis]-anchor)||-1;
  const angle=textAngle(d.h?0:-90,rotation);
  for(let lane=0;lane<4;lane++){const at=[...mid];at[axis]+=sign*(font*.8+35+lane*(font*1.5));const w=d.h?width:height,h=d.h?height:width,box=[at[0]-w/2,at[1]-h/2,at[0]+w/2,at[1]+h/2];if(placed.some(b=>boxHit(box,b)))continue;d.label={at,font,angle,text,box,lane};placed.push(box);break;}
 }
 return result;
}
function inRoom(p,room){let found=false;for(const ring of room.rings||room.polys||[room.poly]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}if(inside)found=!found;}return found;}
function labelFits(box,room){if(![[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]]].every(p=>inRoom(p,room)))return false;for(const ring of room.rings||room.polys||[room.poly])for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];if(a[0]===b[0]&&a[0]>box[0]&&a[0]<box[2]&&Math.max(a[1],b[1])>box[1]&&Math.min(a[1],b[1])<box[3]||a[1]===b[1]&&a[1]>box[1]&&a[1]<box[3]&&Math.max(a[0],b[0])>box[0]&&Math.min(a[0],b[0])<box[2])return false;}return true;}
function roomLabels(rooms,obstacles=[],{rotation=0}={}){
 const used=[],boxes=obstacles.map(poly=>[Math.min(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[1]))]);
 return rooms.filter(r=>r.at).map(r=>{const xs=r.poly.map(p=>p[0]),ys=r.poly.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),near=boxes.filter(b=>boxHit(b,[x0,y0,x1,y1])),candidates=[r.at,...[.15,.3,.5,.7,.85].flatMap(x=>[.15,.3,.5,.7,.85].map(y=>[x0+(x1-x0)*x,y0+(y1-y0)*y]))].sort((a,b)=>Math.hypot(a[0]-r.at[0],a[1]-r.at[1])-Math.hypot(b[0]-r.at[0],b[1]-r.at[1]));
  const chars=[...String(r.name)].reduce((n,c)=>n+(/[\x00-\x7f]/.test(c)?.58:1),0);let best=null;
  for(const size of [1,.8,.65]){const width=Math.max(chars*250,1000)*size+90,height=530*size+90,w=[90,270].includes(rotation)?height:width,h=[90,270].includes(rotation)?width:height;
   for(const at of candidates){const box=[at[0]-w/2,at[1]-h/2,at[0]+w/2,at[1]+h/2];if(!labelFits(box,r))continue;const hits=near.filter(b=>boxHit(box,b)).length+used.filter(b=>boxHit(box,b)).length;if(!best||hits<best.hits)best={id:r.id,at:[...at],size,box,hits};if(!hits)break;}
   if(best?.hits===0)break;
  }
  best=best||{id:r.id,at:[...r.at],size:.65,box:null,hits:null};if(best.box)used.push(best.box);return best;
 });
}
function netSpans(room,point){
 if(!room||!Array.isArray(point)||point.length!==2||!point.every(finite)||!inRoom(point,room))return null;
 const rings=room.rings||room.polys||[room.poly],eps=1e-6;
 // A boundary anchor has no unambiguous interior section.
 for(const ring of rings)for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length&&Math.abs(dx*(point[1]-a[1])-dy*(point[0]-a[0]))/length<eps&&point[0]>=Math.min(a[0],b[0])-eps&&point[0]<=Math.max(a[0],b[0])+eps&&point[1]>=Math.min(a[1],b[1])-eps&&point[1]<=Math.max(a[1],b[1])+eps)return null;}
 const span=axis=>{const cross=1-axis,values=[];for(const ring of rings)for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],delta=b[cross]-a[cross];if(Math.abs(delta)<eps){if(Math.abs(point[cross]-a[cross])<eps)values.push(a[axis],b[axis]);continue;}const t=(point[cross]-a[cross])/delta;if(t>=-eps&&t<=1+eps)values.push(a[axis]+t*(b[axis]-a[axis]));}const left=values.filter(v=>v<point[axis]-eps),right=values.filter(v=>v>point[axis]+eps);if(!left.length||!right.length)return null;const a=[...point],b=[...point];a[axis]=Math.max(...left);b[axis]=Math.min(...right);return {a,b,value:b[axis]-a[axis],h:axis===0};};
 const horizontal=span(0),vertical=span(1);return horizontal&&vertical?{at:[...point],horizontal,vertical}:null;
}
const api={settings,rotate,bounds,dimensions,drawingBounds,sun,rasterSize,dimensionLayout,roomLabels,furnitureLabels,textWidth,netSpans,textAngle};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishDrawing=api;
})(typeof globalThis!=='undefined'?globalThis:this);
