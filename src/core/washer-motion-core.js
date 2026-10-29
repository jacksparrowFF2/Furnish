/* Generic 600x600x850 washer; circular left-hinged layout door, not manufacturer kinematics. */
(function(root){'use strict';
const P=()=>root.FurnishProducts||require('./product-rules.js');
function profile(f){return P().definition(f)?.washerProfile==='tg10k60w'?{id:'washer-tg10k60w',w:595,h:850,d:560,radius:210,inner:166,cy:410,pivot:-212,hole:170}: {id:'washer',w:600,h:850,d:600,radius:192,inner:164,cy:400,pivot:-194,hole:170};}
function reference(f){const parts=[],add=(name,size,center,material='white',role=null,shape='box')=>parts.push({name,label:name,size,center,material,role,shape});
 add('rear',[600,810,18],[0,445,-291]);for(const s of [-1,1])add('side-'+s,[22,810,552],[s*289,445,-6]);
 add('base',[600,40,552],[0,20,-6],'base');add('top',[600,18,552],[0,841,-6]);add('front-frame',[556,680,12],[0,380,264],'white',null,'frame');
 add('control-fascia',[556,110,12],[0,775,276]);add('detergent-drawer',[180,70,8],[-180,770,286],'base');add('display',[120,35,3],[84,762.5,291],'screen');add('knob',[60,60,14],[-12,780,288],'steel',null,'disc');
 add('drum',[330,330,10],[0,400,253],'drum',null,'disc');add('door-ring',[384,384,28],[0,400,286],'steel','door','ring');add('door-glass',[328,328,12],[0,400,286],'glass','door','lens');add('door-handle',[22,85,16],[165,400,290],'dark','door');add('service-trim',[540,4,3],[0,82,272],'base');
 if(profile(f).id==='washer-tg10k60w'){
  for(const part of parts){part.size[0]-=['rear','base','top'].includes(part.name)?5:part.name.startsWith('side-')?0:part.name==='front-frame'||part.name==='control-fascia'?5:0;if(part.name.startsWith('side-'))part.center[0]=Math.sign(part.center[0])*286.5;if(['base','top'].includes(part.name)||part.name.startsWith('side-'))part.size[2]-=40;if(part.name==='rear')part.center[2]+=20;else if(part.center[2]>200)part.center[2]-=20;}
  const named=n=>parts.find(p=>p.name===n);named('control-fascia').material='fascia';named('detergent-drawer').material='fascia';named('display').material='blue';named('door-ring').material='white';named('door-ring').size=[420,420,28];named('door-handle').material='white';named('door-handle').center[0]=190;
  for(const n of ['door-ring','door-glass','door-handle','drum'])named(n).center[1]+=10;
  parts.splice(parts.findIndex(p=>p.name==='service-trim'),1);named('base').size[1]=28;named('base').center[1]=26;
  add('service-hatch',[112,112,4],[219,93,258],'white',null,'disc');add('service-hatch-outline',[116,116,2],[219,93,255],'shelf',null,'disc');
  for(const x of [-275,275])for(const z of [-240,240])add('foot-'+x+'-'+z,[25,12,25],[x,6,z],'steel');
  // Shallow stamped side channels: source-photo approximations, kept inside nominal envelope.
  for(const side of [-1,1]){for(const y of [158,244,652,756])add('side-groove-'+side+'-'+y,[2,18,390],[side*296.5, y,-8],'shelf');add('side-oval-'+side,[2,170,275],[side*295.3,448,-8],'shelf',null,'side-oval');add('side-oval-inner-'+side,[2,148,248],[side*296.5,448,-8],'white',null,'side-oval');}
  add('knob-mark',[2,22,2],[-12,794,276],'dark');add('brand-mark',[65,9,1],[-221,778,271],'ink');
 }
 return parts;
}
function spec(f){const q=profile(f);return {size:[q.w,q.h,q.d],profile:q,parts:reference(f),motions:[{role:'door',axis:'y',pivot:[q.pivot,q.cy,q.d/2-14],parent:null}]};}
function asset(f){return profile(f).id==='washer-tg10k60w'?(root.FurnishTG10K60WBlenderAsset||require('../data/washer-tg10k60w-blender-asset.js')):(root.FurnishWasherBlenderAsset||require('../data/washer-blender-asset.js'));}
function pose(f,phase=P().value(f,'washerDoorAngle')/110){const q=profile(f),h=P().height(f),r=Math.min(f.w/q.w,h/q.h,f.d/q.d);return {ratio:r,radius:q.radius*r,centerY:q.cy*h/q.h,pivot:[q.pivot*r,q.cy*h/q.h,f.d/2-14*r],angle:-phase*110*Math.PI/180};}
function fit(f,part,v){const q=profile(f),p=pose(f),h=P().height(f),wx=f.w/q.w,hy=h/q.h,front=q.d/2-30,z=n=>n<=front?-f.d/2+(n+q.d/2)/(q.d-30)*(f.d-30*p.ratio):f.d/2-30*p.ratio+(n-front)*p.ratio;
 if(part.role)return [v[0]*p.ratio-p.pivot[0],(v[1]-q.cy)*p.ratio,(v[2]-(q.d/2-14))*p.ratio];
 if(part.shape==='frame'){const x=Math.abs(v[0]),dy=v[1]-q.cy,b=dy<0?q.cy-40:720-q.cy,target=b*hy,edge=(q.w-44)/2;return [Math.sign(v[0])*(x<=q.hole?x*p.ratio:q.hole*p.ratio+(x-q.hole)/(edge-q.hole)*(edge*wx-q.hole*p.ratio)),p.centerY+Math.sign(dy)*(Math.abs(dy)<=q.hole?Math.abs(dy)*p.ratio:q.hole*p.ratio+(Math.abs(dy)-q.hole)/(b-q.hole)*(target-q.hole*p.ratio)),z(v[2])];}
 if(part.shape==='disc'&&part.name==='drum')return [v[0]*p.ratio,p.centerY+(v[1]-q.cy)*p.ratio,z(v[2])];
 return [v[0]*wx,v[1]*hy,z(v[2])];
}
function transform(f,v,phase){const p=pose(f,phase),c=Math.cos(p.angle),s=Math.sin(p.angle);return [v[0]*c+v[2]*s+p.pivot[0],v[1]+p.pivot[1],-v[0]*s+v[2]*c+p.pivot[2]];}
function hull(points){const ps=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=arr=>{const out=[];for(const p of arr){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=1e-8)out.pop();out.push(p);}return out;};return half(ps).slice(0,-1).concat(half(ps.reverse()).slice(0,-1));}
const outlines=new Map();
function outline(f){const q=profile(f),key=JSON.stringify([q.id,f.w,f.d,P().height(f),P().value(f,'washerDoorAngle')]);if(outlines.has(key))return outlines.get(key).map(p=>p.slice());const ps=[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]],refs=new Map(reference(f).map(p=>[p.name,p]));for(const part of asset(f).parts.filter(v=>v.role))for(let i=0;i<part.positions.length;i+=3){const v=transform(f,fit(f,refs.get(part.name),part.positions.slice(i,i+3).map(v=>v*1000)));ps.push([v[0],v[2]]);}const result=hull(ps);outlines.set(key,result);if(outlines.size>64)outlines.delete(outlines.keys().next().value);return result.map(p=>p.slice());}
function openingZones(f){const p=pose(f),a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),world=([x,z])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*c-z*s,(f.cy||0)+x*s+z*c];},slices=[];
 for(let i=0;i<12;i++){const lo=-p.radius+i*p.radius/6,hi=lo+p.radius/6,near=lo<=0&&hi>=0?0:Math.min(Math.abs(lo),Math.abs(hi)),r=Math.sqrt(Math.max(0,p.radius*p.radius-near*near)),points=[],radius=Math.hypot(r-p.pivot[0],14*p.ratio),pad=radius*(1/Math.cos(Math.PI/180)-1)+1e-6;
  for(let j=0;j<=55;j++)for(const x of [-r,r])for(const z of [-14,14]){const v=transform(f,[x-p.pivot[0],0,z*p.ratio],j/55);for(const [dx,dz]of [[-pad,-pad],[-pad,pad],[pad,-pad],[pad,pad]])points.push([v[0]+dx,v[2]+dz]);}
  slices.push({poly:hull(points).map(world),ranges:[[P().value(f,'mountHeight')+p.centerY+lo,P().value(f,'mountHeight')+p.centerY+hi]]});
 }return [{kind:'cabinetdoor',column:0,section:'washer:door',poly:hull(slices.flatMap(v=>v.poly)),ranges:[[slices[0].ranges[0][0],slices.at(-1).ranges[0][1]]],slices}];}
const api={profile,asset,reference,spec,pose,fit,transform,hull,outline,openingZones};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWasherMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this);
