/* Fixed French-door fridge: mm, +Z front. Unmeasured hinges/travel/interior are layout assumptions. */
(function(root){
'use strict';
const products=()=>root.FurnishProducts||require('./product-rules.js');
const supported=f=>!!products().definition(f)?.fridgeMotion&&!f.obj;
function reference(){
 const parts=[],add=(name,size,center,material='white',role=null)=>parts.push({name,size,center,material,role});
 const w=833,d=595,h=1910,t=30,front=d/2-36;
 add('shell-back',[w,h-24,t],[0,(h+24)/2,-d/2+t/2]);
 add('shell-left',[t,h-24,d-t-36],[-(w-t)/2,(h+24)/2,(-d/2+t+front)/2]);
 add('shell-right',[t,h-24,d-t-36],[(w-t)/2,(h+24)/2,(-d/2+t+front)/2]);
 for(const [name,y]of [['bottom',39],['top',h-t/2],['divider',782]])add('shell-'+name,[w-2*t,t,d-t-36],[0,y,(-d/2+t+front)/2]);
 for(const x of [-1,1])for(const z of [-1,1])add('foot-'+x+'-'+z,[28,24,28],[x*(w/2-40),12,z*(d/2-40)],'dark');
 for(const y of [1120,1480])add('shelf-'+y,[w-2*t-10,8,d-t-66],[0,y,-18],'shelf');
 for(const [role,sign]of [['left',-1],['right',1]])add('door-'+role,[w/2-6,1102,31],[sign*w/4,1351,281.5],'white',role);
 add('display',[48,208,.4],[80,1529,297.2],'screen','right');
 for(let i=0;i<3;i++)add('display-mark-'+i,[18,6,.05],[80,1474+i*42,297.475],'ink','right');
 for(const [role,bottom,height]of [['upper',460,306],['lower',25,400]]){
  add('drawer-'+role+'-front',[w-8,height,32],[0,bottom+height/2,281.5],'white',role);
  add('drawer-'+role+'-floor',[w-90,12,330],[0,bottom+40,84.5],'shelf',role);
  for(const sign of [-1,1])add('drawer-'+role+'-side-'+sign,[12,height-65,330],[sign*(w-102)/2,bottom+(height-65)/2+30,84.5],'shelf',role);
  add('drawer-'+role+'-back',[w-90,height-65,12],[0,bottom+(height-65)/2+30,-74.5],'shelf',role);
  add('drawer-'+role+'-grip',[w-20,12,10],[0,bottom+height-8,283],'dark',role);
 }
 return parts;
}
function motions(f){
 const P=products(),r=P.definition(f).fridgeMotion,s=[f.w/r.size[0],P.height(f)/r.size[1],f.d/r.size[2]];
 return r.parts.map(m=>({...m,pivot:m.pivot.map((v,k)=>v*s[k]),angle:m.axis==='y'?-m.sign*P.value(f,m.key)*Math.PI/180:0,travel:m.axis==='z'?r.travel*s[2]*P.value(f,m.key):0,maxAngle:m.axis==='y'?-m.sign*r.angle*Math.PI/180:0,maxTravel:m.axis==='z'?r.travel*s[2]:0}));
}
function layout(f){const r=products().definition(f).fridgeMotion,s=[f.w/r.size[0],products().height(f)/r.size[1],f.d/r.size[2]];return reference().map(p=>({...p,size:p.size.map((v,k)=>v*s[k]),center:p.center.map((v,k)=>v*s[k])}));}
function vertices(part,motion,maximum=false,phase=1){
 const [w,h,d]=part.size,[x,y,z]=part.center,a=motion?(maximum?motion.maxAngle:motion.angle)*phase:0,c=Math.cos(a),s=Math.sin(a);
 return [-1,1].flatMap(yy=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([xx,zz])=>{let p=[x+xx*w/2,y+yy*h/2,z+zz*d/2];if(!motion)return p;if(motion.axis==='z'){p[2]+=(maximum?motion.maxTravel:motion.travel)*phase;return p;}const dx=p[0]-motion.pivot[0],dz=p[2]-motion.pivot[2];return [motion.pivot[0]+dx*c+dz*s,p[1],motion.pivot[2]-dx*s+dz*c];}));
}
function hull(points){const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=ps=>{const out=[];for(const p of ps){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=1e-9)out.pop();out.push(p);}return out;};return half(sorted).slice(0,-1).concat(half(sorted.reverse()).slice(0,-1));}
function outline(f){const map=new Map(motions(f).map(m=>[m.role,m]));return hull(layout(f).flatMap(p=>vertices(p,map.get(p.role)).map(v=>[v[0],v[2]])));}
function openingZones(f){
 const parts=layout(f),angle=(f.rot||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),world=([x,z])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*c-z*s,(f.cy||0)+x*s+z*c];};
 return motions(f).map((m,column)=>{const moving=parts.filter(p=>p.role===m.role),steps=m.axis==='y'?Math.ceil(products().definition(f).fridgeMotion.angle/2):1,points=[];
  for(let i=0;i<=steps;i++)for(const p of moving)points.push(...vertices(p,m,true,i/steps));
  // Bound the arc/chord gap between samples before taking the conservative hull.
  const radius=Math.max(...moving.flatMap(p=>vertices(p).map(v=>Math.hypot(v[0]-m.pivot[0],v[2]-m.pivot[2])))),pad=m.axis==='y'?radius*(1/Math.cos(Math.abs(m.maxAngle)/steps/2)-1)+1e-6:0;
  const planar=points.flatMap(v=>pad?[[-pad,-pad],[-pad,pad],[pad,-pad],[pad,pad]].map(([x,z])=>[v[0]+x,v[2]+z]):[[v[0],v[2]]]);
  return {kind:m.axis==='y'?'cabinetdoor':'cabinetdrawer',column,section:'fridge:'+m.role,poly:hull(planar).map(world),ranges:[[Math.min(...points.map(v=>v[1])),Math.max(...points.map(v=>v[1]))]]};
 });
}
const api={supported,reference,motions,layout,vertices,outline,openingZones};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFridge=api;
})(typeof globalThis!=='undefined'?globalThis:this);
