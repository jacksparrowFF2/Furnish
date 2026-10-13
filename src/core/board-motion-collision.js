/* Continuous circle tests for planar rotation/translation; bounded adaptive
 * 3D tests for lift-up boards. All coordinates are cabinet-local mm. */
(function(root){
 const EPS=.001,Z=()=>root.FurnishZoneGeometry||require('./zone-geometry.js');
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),neg=a=>a.map(v=>-v),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>Math.hypot(...a);
 function segmentDistance(p,a,b){const d=sub(b,a),t=Math.max(0,Math.min(1,dot(sub(p,a),d)/dot(d,d)||0));return Math.hypot(...sub(p,a.map((v,i)=>v+t*d[i])));}
 function distance(p,poly){if(Z().inside(p,poly))return 0;return Math.min(...poly.map((a,i)=>segmentDistance(p,a,poly[(i+1)%poly.length])));}
 function hull(points){const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),turn=(a,b,c)=>(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);const half=p=>{const out=[];for(const v of p){while(out.length>1&&turn(out.at(-2),out.at(-1),v)<=0)out.pop();out.push(v);}return out;};return half(sorted).slice(0,-1).concat(half(sorted.slice().reverse()).slice(0,-1));}
 function planar(part,pipe){
  if(Math.min(part.top,pipe.vertical.top)-Math.max(part.bottom,pipe.vertical.bottom)<=EPS)return {hit:false};
  const m=part.motion;
  if(m.axis==='z')return {hit:distance(pipe.at,hull(part.poly.concat(part.poly.map(([x,z])=>[x,z+m.travel]))))<pipe.radius-EPS};
  const pivot=[m.pivot[0],m.pivot[2]],q=sub(pipe.at,pivot),R=norm(q),poly=part.poly.map(p=>sub(p,pivot));
  if(R<EPS)return {hit:distance(q,poly)<pipe.radius-EPS};
  const start=Math.atan2(q[1],q[0]),lo=start+Math.min(0,m.angle),hi=start+Math.max(0,m.angle),angles=[lo,hi];
  const include=a=>{for(let k=Math.floor((lo-a)/(2*Math.PI));k<=Math.ceil((hi-a)/(2*Math.PI));k++){const v=a+k*2*Math.PI;if(v>=lo-1e-10&&v<=hi+1e-10)angles.push(v);}};
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],n=[a[1]-b[1],b[0]-a[0]],length=norm(n),theta=Math.atan2(n[1],n[0]);
   include(Math.atan2(a[1],a[0]));include(Math.atan2(a[1],a[0])+Math.PI);include(theta);include(theta+Math.PI);
   if(length){const offset=dot(n,a)/(length*R);if(Math.abs(offset)<=1){const t=Math.acos(offset);include(theta+t);include(theta-t);}}
  }
  for(const angle of angles)if(distance([R*Math.cos(angle),R*Math.sin(angle)],poly)<pipe.radius-EPS)return {hit:true,phase:Math.abs(m.angle)>1e-10?(angle-start)/m.angle:0};
  return {hit:false};
 }
 function vertices(part,phase){const m=part.motion,a=(m.angle||0)*phase,c=Math.cos(a),s=Math.sin(a),pivot=m.pivot;return [part.bottom,part.top].flatMap(y=>part.poly.map(([x,z])=>{if(m.axis==='z')return [x,y,z+m.travel*phase];const v=sub([x,y,z],pivot),r=m.axis==='y'?[v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c]:[v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c];return r.map((value,i)=>value+pivot[i]);}));}
 // GJK against an analytic finite vertical cylinder. Projection uses the true
 // circular radius, not the decorative polygon mesh's external bounding box.
 function cylinderTest(points,pipe,inflate=0){
  const radius=Math.max(0,pipe.radius+inflate-EPS),bottom=pipe.vertical.bottom-inflate+EPS,top=pipe.vertical.top+inflate-EPS;
  if(top<=bottom||radius<=0)return 'clear';
  const support=d=>{let v=points[0];for(const p of points)if(dot(p,d)>dot(v,d))v=p;const horizontal=Math.hypot(d[0],d[2]);return [v[0]-pipe.at[0]+(horizontal?radius*d[0]/horizontal:0),v[1]-(d[1]>0?bottom:top),v[2]-pipe.at[1]+(horizontal?radius*d[2]/horizontal:0)];};
  let simplex=[],direction=[1,1,1];
  const line=()=>{const a=simplex.at(-1),b=simplex.at(-2),ab=sub(b,a),ao=neg(a);if(dot(ab,ao)>0){direction=cross(cross(ab,ao),ab);if(norm(direction)<1e-12)direction=cross(ab,Math.abs(ab[0])<Math.abs(ab[1])?[1,0,0]:[0,1,0]);}else{simplex=[a];direction=ao;}};
  const triangle=()=>{const a=simplex.at(-1),b=simplex.at(-2),c=simplex.at(-3),ab=sub(b,a),ac=sub(c,a),ao=neg(a),n=cross(ab,ac);if(dot(cross(n,ac),ao)>0){if(dot(ac,ao)>0){simplex=[c,a];line();}else{simplex=[b,a];line();}}else if(dot(cross(ab,n),ao)>0){simplex=[b,a];line();}else if(dot(n,ao)>0)direction=n;else{simplex=[b,c,a];direction=neg(n);}};
  for(let iteration=0;iteration<64;iteration++){
   const length=norm(direction);if(length<1e-12)return 'uncertain';direction=direction.map(v=>v/length);const a=support(direction);
   if(dot(a,direction)<=EPS)return 'clear';simplex.push(a);
   if(simplex.length===1){direction=neg(a);continue;}if(simplex.length===2){line();continue;}if(simplex.length===3){triangle();continue;}
   const b=simplex[2],c=simplex[1],d=simplex[0],ao=neg(a);let outside=false;
   for(const [u,v,opposite]of [[b,c,d],[c,d,b],[d,b,c]]){let n=cross(sub(u,a),sub(v,a));if(dot(n,sub(opposite,a))>0)n=neg(n);const t=dot(n,ao)/norm(n);if(t>EPS){simplex=[v,u,a];triangle();outside=true;break;}}
   if(!outside)return 'hit';
  }
  return 'uncertain';
 }
 function lift(part,pipe){
  if(Math.max(...part.poly.map(p=>p[0]))<=pipe.at[0]-pipe.radius+EPS||Math.min(...part.poly.map(p=>p[0]))>=pipe.at[0]+pipe.radius-EPS)return {hit:false};
  const radius=Math.max(...[part.bottom,part.top].flatMap(y=>part.poly.map(p=>Math.hypot(y-part.motion.pivot[1],p[1]-part.motion.pivot[2]))));let probes=0;
  const visit=(lo,hi)=>{
   if(++probes>4096)return {hit:false,pending:true};
   const mid=(lo+hi)/2,points=vertices(part,mid),bound=radius*Math.abs(part.motion.angle)*(hi-lo)/2;
   const direct=cylinderTest(points,pipe);if(direct==='hit')return {hit:true,phase:mid};
   if(cylinderTest(points,pipe,bound+.002)==='clear')return {hit:false};
   if(bound<=.05)return {hit:false,pending:true};
   const left=visit(lo,mid);if(left.hit)return left;const right=visit(mid,hi);return right.hit?right:{hit:false,pending:!!left.pending||!!right.pending};
  };
  for(const phase of [0,1])if(cylinderTest(vertices(part,phase),pipe)==='hit')return {hit:true,phase};return visit(0,1);
 }
 const cache=new WeakMap();
 function check(parts,zone,pipe){
  let saved=cache.get(parts);if(!saved){saved=new Map();cache.set(parts,saved);}
  const key=JSON.stringify([zone.kind,zone.column,zone.section,zone.leaf,pipe.at,pipe.radius,pipe.vertical]);if(saved.has(key))return saved.get(key);
  let pending=false,result;
  for(const part of parts){const m=part.motion;if(m.kind!==zone.kind||m.column!==zone.column||(m.section||'storage')!==(zone.section||'storage')||zone.leaf!==undefined&&m.leaf!==zone.leaf)continue;const found=m.axis==='x'?lift(part,pipe):planar(part,pipe);if(found.hit){result={...found,motion:m};break;}pending=pending||found.pending;}
  result=result||{hit:false,pending};saved.set(key,result);return result;
 }
 const api={check,planar,lift,vertices,cylinderTest};root.FurnishBoardCollision=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
