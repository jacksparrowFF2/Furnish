/* Planar functional regions, including sloping edges and unassigned holes.
 * Exact vertical decomposition, no raster sampling or external dependencies. */
(function(root){
 'use strict';
 const EPS=1e-7,round=v=>Math.round(v*1e6)/1e6,fail=m=>{throw Error(m);};
 const signed=p=>p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[1]-b[0]*a[1];},0)/2;
 const inside=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const on=(p,a,b)=>Math.abs(cross(a,b,p))<EPS&&p[0]>=Math.min(a[0],b[0])-EPS&&p[0]<=Math.max(a[0],b[0])+EPS&&p[1]>=Math.min(a[1],b[1])-EPS&&p[1]<=Math.max(a[1],b[1])+EPS;
 const segments=polys=>polys.flatMap(p=>p.map((a,i)=>[a,p[(i+1)%p.length]]).filter(([a,b])=>Math.hypot(a[0]-b[0],a[1]-b[1])>EPS));
 function intersection(a,b,c,d){const dx=b[0]-a[0],dy=b[1]-a[1],ex=d[0]-c[0],ey=d[1]-c[1],det=dx*ey-dy*ex;if(Math.abs(det)<EPS)return null;
  const t=((c[0]-a[0])*ey-(c[1]-a[1])*ex)/det,u=((c[0]-a[0])*dy-(c[1]-a[1])*dx)/det;
  return t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS?[a[0]+t*dx,a[1]+t*dy]:null;
 }
 function validatePolygon(poly){
  if(!Array.isArray(poly)||poly.length<3||poly.length>100||poly.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>typeof v!=='number'||!Number.isFinite(v))))fail('多边形须包含 3–100 个有效顶点');
  const edges=segments([poly]);if(edges.length!==poly.length)fail('多边形顶点不能重复');
  for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
   const [a,b]=edges[i],[c,d]=edges[j],adjacent=j===i+1||i===0&&j===edges.length-1;
   if(adjacent){const shared=j===i+1?b:a,other=j===i+1?d:c,prev=j===i+1?a:b;if(on(other,prev,shared)||on(prev,shared,other))fail('多边形边不能折返重叠');continue;}
   if(intersection(a,b,c,d)||on(a,c,d)||on(b,c,d)||on(c,a,b)||on(d,a,b))fail('多边形不能自交或自接触');
  }
  if(Math.abs(signed(poly))<1e-4)fail('多边形面积太小');return poly;
 }
 function decompose(polys,predicate){
  const edges=segments(polys);if(edges.length>2000)fail('功能区轮廓过于复杂，请减少顶点');
  const cuts=polys.flatMap(p=>p.map(v=>v[0]));
  for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){const p=intersection(...edges[i],...edges[j]);if(p)cuts.push(p[0]);}
  const xs=cuts.sort((a,b)=>a-b).filter((v,i,a)=>!i||v-a[i-1]>EPS),pieces=[];
  for(let i=1;i<xs.length;i++){
   const lo=xs[i-1],hi=xs[i],mx=(lo+hi)/2;if(hi-lo<EPS)continue;
   const value=(s,x)=>s[0][1]+(x-s[0][0])*(s[1][1]-s[0][1])/(s[1][0]-s[0][0]);
   const lines=edges.filter(([a,b])=>mx>Math.min(a[0],b[0])&&mx<Math.max(a[0],b[0])).map(s=>({s,y:value(s,mx)})).sort((a,b)=>a.y-b.y).filter((v,i,a)=>!i||v.y-a[i-1].y>EPS);
   let start=null;
   for(let j=1;j<lines.length;j++){
    const occupied=predicate([mx,(lines[j-1].y+lines[j].y)/2]);
    if(occupied&&!start)start=lines[j-1];
    if(start&&(!occupied||j===lines.length-1)){
     const end=occupied?lines[j]:lines[j-1];
     const poly=[[lo,value(start.s,lo)],[hi,value(start.s,hi)],[hi,value(end.s,hi)],[lo,value(end.s,lo)]].map(p=>p.map(round)).filter((p,k,a)=>k===0||Math.hypot(p[0]-a[k-1][0],p[1]-a[k-1][1])>EPS);
     if(poly.length>2&&Math.abs(signed(poly))>EPS)pieces.push(poly);start=null;
    }
   }
  }
  if(pieces.length>10000)fail('功能区拆分过于复杂');return pieces;
 }
 function outline(pieces){
  const key=p=>p.map(round).join(','),vertical=new Map(),edges=new Map();
  for(const poly of pieces)for(const p of poly){const x=String(round(p[0])),set=vertical.get(x)||new Set();set.add(round(p[1]));vertical.set(x,set);}
  const add=(a,b)=>{if(key(a)===key(b))return;const forward=key(a)+'>'+key(b),back=key(b)+'>'+key(a);if(edges.has(back))edges.delete(back);else edges.set(forward,[a,b]);};
  for(const [a,b]of segments(pieces)){
   if(Math.abs(a[0]-b[0])<EPS){const cuts=[...vertical.get(String(round(a[0])))].filter(y=>y>=Math.min(a[1],b[1])-EPS&&y<=Math.max(a[1],b[1])+EPS).sort((x,y)=>a[1]<b[1]?x-y:y-x);for(let i=1;i<cuts.length;i++)add([a[0],cuts[i-1]],[b[0],cuts[i]]);}
   else add(a,b);
  }
  const outgoing=new Map();for(const [id,e]of edges){const k=key(e[0]),list=outgoing.get(k)||[];list.push({id,e});outgoing.set(k,list);}
  const rings=[];
  while(edges.size){const first=edges.values().next().value,ring=[first[0]];let e=first,steps=0;
   do{edges.delete(key(e[0])+'>'+key(e[1]));ring.push(e[1]);if(key(e[1])===key(ring[0]))break;
    const candidates=(outgoing.get(key(e[1]))||[]).filter(v=>edges.has(v.id)),angle=Math.atan2(e[1][1]-e[0][1],e[1][0]-e[0][0]);
    const turn=v=>(Math.atan2(v.e[1][1]-v.e[0][1],v.e[1][0]-v.e[0][0])-angle+Math.PI*2)%(Math.PI*2);
    candidates.sort((a,b)=>turn(a)-turn(b));if(!candidates.length||++steps>50000)fail('功能区边界无法闭合');e=candidates[0].e;
   }while(true);
   ring.pop();
   // Intersecting rounded sloping edges can leave a microscopic reverse step.
   // Remove only adjacent near-duplicates whose local area is negligible.
   let simplified=true;while(simplified&&ring.length>3){simplified=false;for(let i=0;i<ring.length;i++){const a=ring[(i+ring.length-1)%ring.length],p=ring[i],b=ring[(i+1)%ring.length];if(Math.hypot(p[0]-a[0],p[1]-a[1])<1e-4&&Math.abs(cross(a,p,b))/2<.001){ring.splice(i,1);simplified=true;break;}}}
   const clean=ring.filter((p,i)=>Math.abs(cross(ring[(i+ring.length-1)%ring.length],p,ring[(i+1)%ring.length]))>EPS);
   // Very narrow slabs can place two near-collinear vertices at a corner.
   // Removing both simultaneously must never change the boundary's area.
   const boundary=clean.length>2&&Math.abs(signed(clean)-signed(ring))<1e-4?clean:ring;if(boundary.length>2)rings.push(boundary);
  }
  if(!rings.length)return {poly:[],rings:[],polys:[],at:null};
  // Opposite bridge traversals cancel: legacy point/area queries retain holes
  // and disconnected islands. Renderers use rings; 3D uses convex pieces.
  const root=rings[0][0],poly=[...rings[0],root];for(const ring of rings.slice(1))poly.push(...ring,ring[0],root);
  const largest=pieces.reduce((a,b)=>Math.abs(signed(a))>=Math.abs(signed(b))?a:b),at=largest.reduce((a,p)=>[a[0]+p[0]/largest.length,a[1]+p[1]/largest.length],[0,0]);
  return {poly,rings,polys:pieces,at};
 }
 const area=pieces=>pieces.reduce((n,p)=>n+Math.abs(signed(p)),0);
 function ringPath(rings){if(!rings.length)return [];const start=rings[0][0],poly=[...rings[0],start];for(const ring of rings.slice(1))poly.push(...ring,ring[0],start);return poly;}
 function adjacent(A,B){return segments(A).some(([a,b])=>segments(B).some(([c,d])=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),project=p=>((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length;return Math.abs(cross(a,b,c))/length<1e-5&&Math.abs(cross(a,b,d))/length<1e-5&&Math.min(length,Math.max(project(c),project(d)))-Math.max(0,Math.min(project(c),project(d)))>1e-5;}));}
 function splitRegion(rings,line){
  if(!Array.isArray(line)||line.length<2||line.length>100||line.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v))))fail('折线须包含 2–100 个有效点');
  const outer=rings.filter(r=>signed(r)>0);if(outer.length!==1)fail('请先选择一个连续区域再用折线拆分');
  const poly=outer[0],project=p=>{let best=null;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))),q=[a[0]+dx*t,a[1]+dy*t],distance=Math.hypot(q[0]-p[0],q[1]-p[1]);if(!best||distance<best.distance)best={edge:i,t,point:q,distance};}return best;};
  const first=project(line[0]),last=project(line.at(-1));if(first.distance>1e-5||last.distance>1e-5)fail('折线起点和终点必须在所选区域的外边界上');
  const cut=line.map(p=>[...p]);cut[0]=first.point;cut[cut.length-1]=last.point;if(Math.hypot(cut[0][0]-cut.at(-1)[0],cut[0][1]-cut.at(-1)[1])<1e-5)fail('折线起点和终点不能相同');
  const original=ringPath(rings);for(let i=1;i<cut.length;i++){if(Math.hypot(cut[i][0]-cut[i-1][0],cut[i][1]-cut[i-1][1])<1e-5)fail('折线顶点不能重复');if(!inside(cut[i].map((v,k)=>(v+cut[i-1][k])/2),original))fail('折线必须在区域内部，不能跨越孔洞或实际墙体');for(const hole of rings.filter(r=>signed(r)<0))for(const [a,b]of segments([hole]))if(intersection(cut[i-1],cut[i],a,b)||on(a,cut[i-1],cut[i])||on(b,cut[i-1],cut[i]))fail('折线不能跨越区域孔洞');}
  const boundary=[];for(let i=0;i<poly.length;i++){const points=[{t:0,point:poly[i]},...[first,last].filter(p=>p.edge===i)];points.sort((a,b)=>a.t-b.t);for(const p of points)if(!boundary.length||Math.hypot(p.point[0]-boundary.at(-1)[0],p.point[1]-boundary.at(-1)[1])>1e-5)boundary.push(p.point);}
  if(Math.hypot(boundary[0][0]-boundary.at(-1)[0],boundary[0][1]-boundary.at(-1)[1])<1e-5)boundary.pop();
  const index=p=>boundary.findIndex(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-5),start=index(cut[0]),end=index(cut.at(-1)),walk=(a,b)=>{const path=[boundary[a]];for(let i=(a+1)%boundary.length;i!==b;i=(i+1)%boundary.length)path.push(boundary[i]);path.push(boundary[b]);return path;};
  const sides=[walk(start,end).concat(cut.slice(1,-1).reverse()),walk(end,start).concat(cut.slice(1,-1))];sides.forEach(validatePolygon);
  const result=sides.map(side=>outline(decompose([...rings,side],p=>inside(p,original)&&inside(p,side))));
  if(result.some(g=>g.rings.filter(r=>signed(r)>0).length!==1))fail('折线须拆成两个连续区域，请调整路径');
  const combined=result.flatMap(g=>g.polys),difference=area(decompose([...rings,...combined],p=>inside(p,original)!==combined.some(poly=>inside(p,poly))));if(difference>.01||Math.abs(area(combined)-Math.abs(signed(original)))>.1)fail('折线拆分面积校验失败');
  return result;
 }
 const api={inside,signed,validatePolygon,decompose,outline,area,ringPath,adjacent,splitRegion};root.FurnishZoneGeometry=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
