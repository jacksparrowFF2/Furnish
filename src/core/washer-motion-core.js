/* Generic 600x600x850 washer; circular left-hinged layout door, not manufacturer kinematics. */
(function(root){'use strict';
const P=()=>root.FurnishProducts||require('./product-rules.js');
function reference(){const parts=[],add=(name,size,center,material='white',role=null,shape='box')=>parts.push({name,label:name,size,center,material,role,shape});
 add('rear',[600,810,18],[0,445,-291]);for(const s of [-1,1])add('side-'+s,[22,810,552],[s*289,445,-6]);
 add('base',[600,40,552],[0,20,-6],'base');add('top',[600,18,552],[0,841,-6]);add('front-frame',[556,680,12],[0,380,264],'white',null,'frame');
 add('control-fascia',[556,110,12],[0,775,276]);add('detergent-drawer',[180,70,8],[-180,770,286],'base');add('display',[120,35,3],[84,762.5,291],'screen');add('knob',[60,60,14],[-12,780,288],'steel',null,'disc');
 add('drum',[330,330,10],[0,400,253],'drum',null,'disc');add('door-ring',[384,384,28],[0,400,286],'steel','door','ring');add('door-glass',[328,328,12],[0,400,286],'glass','door','lens');add('door-handle',[22,85,16],[165,400,290],'dark','door');add('service-trim',[540,4,3],[0,82,272],'base');return parts;
}
function spec(){return {size:[600,850,600],parts:reference(),motions:[{role:'door',axis:'y',pivot:[-194,400,286],parent:null}]};}
function pose(f,phase=P().value(f,'washerDoorAngle')/110){const h=P().height(f),r=Math.min(f.w/600,h/850,f.d/600);return {ratio:r,radius:192*r,centerY:400*h/850,pivot:[-194*r,400*h/850,f.d/2-14*r],angle:-phase*110*Math.PI/180};}
function fit(f,part,v){const p=pose(f),h=P().height(f),wx=f.w/600,hy=h/850,z=n=>n<=270?-f.d/2+(n+300)/570*(f.d-30*p.ratio):f.d/2-30*p.ratio+(n-270)*p.ratio;
 if(part.role)return [v[0]*p.ratio-p.pivot[0],(v[1]-400)*p.ratio,(v[2]-286)*p.ratio];
 if(part.shape==='frame'){const x=Math.abs(v[0]),dy=v[1]-400,b=dy<0?360:320,target=dy<0?400*hy-40*hy:720*hy-400*hy;return [Math.sign(v[0])*(x<=170?x*p.ratio:170*p.ratio+(x-170)/108*(278*wx-170*p.ratio)),p.centerY+Math.sign(dy)*(Math.abs(dy)<=170?Math.abs(dy)*p.ratio:170*p.ratio+(Math.abs(dy)-170)/(b-170)*(target-170*p.ratio)),z(v[2])];}
 if(part.shape==='disc'&&part.name==='drum')return [v[0]*p.ratio,p.centerY+(v[1]-400)*p.ratio,z(v[2])];
 return [v[0]*wx,v[1]*hy,z(v[2])];
}
function transform(f,v,phase){const p=pose(f,phase),c=Math.cos(p.angle),s=Math.sin(p.angle);return [v[0]*c+v[2]*s+p.pivot[0],v[1]+p.pivot[1],-v[0]*s+v[2]*c+p.pivot[2]];}
function hull(points){const ps=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=arr=>{const out=[];for(const p of arr){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=1e-8)out.pop();out.push(p);}return out;};return half(ps).slice(0,-1).concat(half(ps.reverse()).slice(0,-1));}
const outlines=new Map();
function outline(f){const key=JSON.stringify([f.w,f.d,P().height(f),P().value(f,'washerDoorAngle')]);if(outlines.has(key))return outlines.get(key).map(p=>p.slice());const p=pose(f),c=Math.cos(p.angle),s=Math.sin(p.angle),ps=[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]],asset=root.FurnishWasherBlenderAsset||require('../data/washer-blender-asset.js');for(const part of asset.parts.filter(v=>v.role))for(let i=0;i<part.positions.length;i+=3){const x=part.positions[i]*1000*p.ratio-p.pivot[0],z=(part.positions[i+2]*1000-286)*p.ratio;ps.push([x*c+z*s+p.pivot[0],-x*s+z*c+p.pivot[2]]);}const result=hull(ps);outlines.set(key,result);if(outlines.size>64)outlines.delete(outlines.keys().next().value);return result.map(p=>p.slice());}
function openingZones(f){const p=pose(f),a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),world=([x,z])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*c-z*s,(f.cy||0)+x*s+z*c];},slices=[];
 for(let i=0;i<12;i++){const lo=-p.radius+i*p.radius/6,hi=lo+p.radius/6,near=lo<=0&&hi>=0?0:Math.min(Math.abs(lo),Math.abs(hi)),r=Math.sqrt(Math.max(0,p.radius*p.radius-near*near)),points=[],radius=Math.hypot(r-p.pivot[0],14*p.ratio),pad=radius*(1/Math.cos(Math.PI/180)-1)+1e-6;
  for(let j=0;j<=55;j++)for(const x of [-r,r])for(const z of [-14,14]){const v=transform(f,[x-p.pivot[0],0,z*p.ratio],j/55);for(const [dx,dz]of [[-pad,-pad],[-pad,pad],[pad,-pad],[pad,pad]])points.push([v[0]+dx,v[2]+dz]);}
  slices.push({poly:hull(points).map(world),ranges:[[P().value(f,'mountHeight')+p.centerY+lo,P().value(f,'mountHeight')+p.centerY+hi]]});
 }return [{kind:'cabinetdoor',column:0,section:'washer:door',poly:hull(slices.flatMap(v=>v.poly)),ranges:[[slices[0].ranges[0][0],slices.at(-1).ranges[0][1]]],slices}];}
const api={reference,spec,pose,fit,transform,hull,outline,openingZones};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWasherMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this);
