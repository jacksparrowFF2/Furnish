'use strict';
const assert=require('node:assert/strict'),C=require('../src/core/ceiling-core.js'),Z=require('../src/core/zone-geometry.js');
const epsilon=C.rules().epsilon,copy=v=>JSON.parse(JSON.stringify(v));
// Exhaustive pre-optimization narrow phase: no height or XY broad phase.
function brute(c,{p,vertical}){
 function intersection(subject,boundary){let out=subject,sign=C.area(boundary)>0?1:-1;for(let i=0;i<boundary.length&&out.length;i++){
  const a=boundary[i],b=boundary[(i+1)%boundary.length],n=[-(b[1]-a[1])*sign,(b[0]-a[0])*sign],L=Math.hypot(...n),value=v=>((v[0]-a[0])*n[0]+(v[1]-a[1])*n[1])/L,next=[];
  for(let j=0;j<out.length;j++){const v=out[j],w=out[(j+1)%out.length],x=value(v),y=value(w);if(x>=-epsilon)next.push(copy(v));if(x>epsilon&&y< -epsilon||x< -epsilon&&y>epsilon){const t=x/(x-y);next.push(v.map((q,k)=>q+(w[k]-q)*t));}}
  out=next.filter((p,i)=>Math.hypot(...p.map((v,k)=>v-next[(i+next.length-1)%next.length][k]))>epsilon);
 }return out;}
 const positive=p=>p.length>=3&&Math.abs(C.area(p))>epsilon**2;
 if(c.kind==='flat')return Z.area(Z.decompose([p,c.polygon],q=>Z.inside(q,p)&&Z.inside(q,c.polygon)))>epsilon**2&&(!vertical||Math.min(vertical.top,c.height+c.thickness)-Math.max(vertical.bottom,c.height)>epsilon);
 for(const vertices of C.sectionContours(c.section)){const outline=vertices.map(v=>[v.u,v.d]);for(const [i,leg]of C.route(c).entries()){
  const poly=intersection(p,C.legFootprint(c,i,vertices.map(v=>v.u)));if(!positive(poly))continue;
  const us=poly.map(v=>(v[0]-leg.a[0])*leg.normal[0]+(v[1]-leg.a[1])*leg.normal[1]),u0=Math.min(...us),u1=Math.max(...us),d0=vertical?c.height-vertical.top:-C.rules().max,d1=vertical?c.height-vertical.bottom:C.rules().max;
  if(positive(intersection(outline,[[u0,d0],[u1,d0],[u1,d1],[u0,d1]])))return true;
 }}
 return C.endCaps(c).plates.some(plate=>positive(intersection(p,plate.footprint))&&(!vertical||Math.min(vertical.top,c.height-Math.min(...plate.section.map(p=>p[1])))-Math.max(vertical.bottom,c.height-Math.max(...plate.section.map(p=>p[1])))>epsilon));
}
const profile={id:'profile',name:'截面',kind:'profile',roomId:'r',height:2800,path:{a:[0,0],b:[1000,0],normal:[0,1]},section:C.lowCove(),ends:{start:{enabled:true,thickness:12,lightGap:0},end:{enabled:true,thickness:15,lightGap:0}}};
const closed={...copy(profile),path:{closed:true,segments:C.boundaryPaths({poly:[[0,0],[1000,0],[1000,800],[0,800]]})}};delete closed.ends;
const flat={id:'flat',name:'平顶',kind:'flat',height:2500,thickness:12,polygon:[[0,0],[1000,0],[1000,800],[0,800]]};
let comparisons=0;
for(const original of [profile,closed,flat])for(const angle of [0,37,90])for(const mirror of [false,true]){
 const a=angle*Math.PI/180,transform=([x,y])=>{x*=mirror?-1:1;return [x*Math.cos(a)-y*Math.sin(a)+1700,x*Math.sin(a)+y*Math.cos(a)+2100];},c=copy(original);
 if(c.polygon)c.polygon=c.polygon.map(transform);else{const segments=C.route(c).map(p=>({a:transform(p.a),b:transform(p.b),normal:[(mirror?-p.normal[0]:p.normal[0])*Math.cos(a)-p.normal[1]*Math.sin(a),(mirror?-p.normal[0]:p.normal[0])*Math.sin(a)+p.normal[1]*Math.cos(a)]}));c.path=c.path.closed?{closed:true,segments}:segments[0];}
 const bodies=[];
 for(const x of [-20,0,6,15,500,995,1020])for(const y of [-20,0,20,40,65,70,800])for(const vertical of [null,{bottom:0,top:1000},{bottom:2490,top:2500},{bottom:2500,top:2500+epsilon/2},{bottom:2515,top:2520},{bottom:2800,top:2900},{bottom:2799,top:2801}]){
  bodies.push({f:{id:'b'+bodies.length,name:'实体',cx:0,cy:0},p:[[x-2,y-2],[x+2,y-2],[x+2,y+2],[x-2,y+2]].map(transform),vertical});
 }
 const initial=JSON.stringify({c,bodies}),actual=new Set(C.checks({ceilings:{items:[c]}},bodies).map(v=>v.id));
 for(const b of bodies){assert.equal(actual.has(b.f.id),brute(c,b),JSON.stringify({angle,mirror,c:c.id,b}));comparisons++;}
 assert.equal(JSON.stringify({c,bodies}),initial,'checks must not mutate inputs');
}
console.log('ceiling broad phase: '+comparisons+' exhaustive comparisons passed');
