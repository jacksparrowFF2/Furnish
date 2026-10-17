/* Millimetre ceiling sections, boundary sweeps and explicit flat attachments. */
(function(root){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),finite=v=>typeof v==='number'&&Number.isFinite(v),fail=m=>{throw Error(m);};
const rules=()=> (root.FurnishProducts||require('./product-rules.js')).ceiling;
const eps=()=>rules().epsilon;
// Direct inputs use the exact guard. Derived differences additionally account
// for floating-point cancellation at their operands' scale, without rounding data.
const solid=(v,scale=0)=>finite(v)&&v>0&&v<=rules().max&&(v>=rules().min-eps()||scale>0&&Math.abs(v-(rules().min-eps()))<=Number.EPSILON*Math.max(1,scale)*4);
const point=p=>Array.isArray(p)&&p.length===2&&p.every(v=>finite(v)&&Math.abs(v)<=1e7);
const key=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,200}$/.test(v);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0)/2;
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
function onSegment(p,a,b){const len=distance(a,b);return len>0&&Math.abs(cross(a,b,p))/len<=eps()&&p.every((v,i)=>v>=Math.min(a[i],b[i])-eps()&&v<=Math.max(a[i],b[i])+eps());}
function intersects(a,b,c,d){
 const ab=distance(a,b),cd=distance(c,d),x=cross(a,b,c)/ab,y=cross(a,b,d)/ab,z=cross(c,d,a)/cd,w=cross(c,d,b)/cd;
 return (x>eps()&&y< -eps()||x< -eps()&&y>eps())&&(z>eps()&&w< -eps()||z< -eps()&&w>eps())||onSegment(c,a,b)||onSegment(d,a,b)||onSegment(a,c,d)||onSegment(b,c,d);
}
function polygon(p,label='轮廓'){
 if(!Array.isArray(p)||p.length<3||p.length>rules().maxVertices||!p.every(point))fail(label+'需要3～128个有效节点');
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length];if(!solid(distance(a,b),Math.max(...a.map(Math.abs),...b.map(Math.abs))))fail(label+'边长须在0.1～20000 mm范围内');
  const prev=p[(i+p.length-1)%p.length];if(onSegment(prev,a,b)||onSegment(b,prev,a))fail(label+'不能折返或重叠');
  for(let j=i+1;j<p.length;j++){if(j===i+1||i===0&&j===p.length-1)continue;if(intersects(a,b,p[j],p[(j+1)%p.length]))fail(label+'不能自交或自接触');}
 }
 if(Math.abs(area(p))<eps()*eps())fail(label+'不能为零面积');return p;
}
function inside(p,poly,boundary=true){
 if(poly.some((a,i)=>onSegment(p,a,poly[(i+1)%poly.length])))return boundary;
 let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++)if((poly[i][1]>p[1])!==(poly[j][1]>p[1])&&p[0]<(poly[j][0]-poly[i][0])*(p[1]-poly[i][1])/(poly[j][1]-poly[i][1])+poly[i][0])yes=!yes;return yes;
}
function lowCove(values={}){
 const q={...rules().lowCove,...values},D=q.drop,P=q.projection,B=q.back,T=q.bottom,F=q.front,L=q.lip;
 if(Object.keys(q).some(k=>!Object.hasOwn(rules().lowCove,k))||![D,P,B,T,F,L].every(v=>solid(v))||!solid(P-B-F,Math.max(P,B,F))||!solid(L-T,Math.max(L,T))||!solid(D-L,Math.max(D,L)))fail('低灯槽尺寸须为0.1～20000 mm，槽腔净宽、挡边有效高度和上方开口须有效');
 const coordinates=[[0,0],[B,0],[B,D-T],[P-F,D-T],[P-F,D-L],[P,D-L],[P,D],[0,D]];
 return {vertices:coordinates.map(([u,d],i)=>({id:'v'+i,u,d})),light:clone(rules().light),template:{kind:'lowCove',values:q}};
}
function section(s){
 if(!s||!Array.isArray(s.vertices))fail('缺少吊顶截面');const ids=new Set();
 for(const v of s.vertices){if(!v||!key(v.id)||ids.has(v.id)||![v.u,v.d].every(n=>finite(n)&&n>=0&&n<=rules().max))fail('截面节点编号须唯一，坐标须为0～20000 mm');ids.add(v.id);}
 polygon(s.vertices.map(v=>[v.u,v.d]),'截面');
 if(s.template){if(s.template.kind!=='lowCove'||!s.template.values)fail('截面模板无效');const expected=lowCove(s.template.values).vertices;if(expected.length!==s.vertices.length||expected.some((v,i)=>['id','u','d'].some(k=>v[k]!==s.vertices[i][k])))fail('截面模板尺寸与轮廓不一致');}
 if(s.light!==undefined){const l=s.light;if(!l||![l.u,l.d,l.angle].every(finite)||Math.abs(l.u)>rules().max||Math.abs(l.d)>rules().max||Math.abs(l.angle)>360||!solid(l.width)||!solid(l.thickness))fail('发光位置须在±20000 mm内，朝向在±360°内，灯带宽厚须为0.1～20000 mm');}
 if(s.light?.cornerSetback!==undefined&&(!finite(s.light.cornerSetback)||s.light.cornerSetback<0||s.light.cornerSetback>rules().max))fail('转角额外退让须为0～20000 mm');
 if(s.light?.corner!==undefined){const c=s.light.corner;if(!c||Object.keys(c).some(k=>!['mode','radius'].includes(k))||!['segmented','arc'].includes(c.mode)||!solid(c.radius))fail('灯带转角模式无效，中心线半径须为0.1～20000 mm');}
 return s;
}
function lightPolygon(l){const r=l.angle*Math.PI/180,n=[Math.cos(r),Math.sin(r)],t=[-n[1],n[0]];return [[-1,0],[1,0],[1,1],[-1,1]].map(([w,h])=>[l.u+t[0]*w*l.width/2+n[0]*h*l.thickness,l.d+t[1]*w*l.width/2+n[1]*h*l.thickness]);}
function lightIssues(s){
 if(!s.light)return [];const p=lightPolygon(s.light),body=s.vertices.map(v=>[v.u,v.d]),overlap=intersection(body,p);
 if(overlap.length>=3&&Math.abs(area(overlap))>eps()**2)return ['灯带实体与截面相交，请调整发光位置或朝向'];
 return body.some((a,i)=>onSegment(p[0],a,body[(i+1)%body.length])&&onSegment(p[1],a,body[(i+1)%body.length]))?[]:['灯带当前为自由位置，安装承托待核对'];
}
function route(c){return c.path.segments||[{id:'leg0',...c.path}];}
function tangent(p){const L=distance(p.a,p.b);return p.b.map((v,i)=>(v-p.a[i])/L);}
function samePath(a,b){return distance(a.a,b.a)<=eps()&&distance(a.b,b.b)<=eps()&&distance(a.normal,b.normal)<=eps()||distance(a.a,b.b)<=eps()&&distance(a.b,b.a)<=eps()&&distance(a.normal,b.normal)<=eps();}
function joinedPath(first,second){
 let a=clone(first),b=clone(second);if(distance(a.b,b.a)>eps()){
  if(distance(a.b,b.b)<=eps())[b.a,b.b]=[b.b,b.a];
  else if(distance(a.a,b.a)<=eps())[a.a,a.b]=[a.b,a.a];
  else if(distance(a.a,b.b)<=eps()){[a.a,a.b]=[a.b,a.a];[b.a,b.b]=[b.b,b.a];}
  else fail('请选择共享一个墙角的相邻边界');
 }
 const dot=(u,v)=>u[0]*v[0]+u[1]*v[1],ta=tangent(a),tb=tangent(b);
 if(Math.abs(dot(ta,tb))>eps()||Math.abs(dot(ta,b.normal)+1)>eps()||Math.abs(dot(tb,a.normal)-1)>eps())fail('连续转角目前支持区域内侧90°相邻墙；凹角或斜角请分开设计');
 return {segments:[{...a,id:'leg0'},{...b,id:'leg1'}],join:'miter'};
}
function offsetStations(c,u){
 const legs=route(c),first=legs[0],last=legs.at(-1),out=[first.a.map((v,i)=>v+first.normal[i]*u)];
 if(legs.length===2){const t=tangent(first);out.push(first.b.map((v,i)=>v+(first.normal[i]-t[i])*u));}
 out.push(last.b.map((v,i)=>v+last.normal[i]*u));return out;
}
function legFootprint(c,index,us){const lo=offsetStations(c,Math.min(...us)),hi=offsetStations(c,Math.max(...us));return [lo[index],lo[index+1],hi[index+1],hi[index]];}
function hull(points){const p=points.map(v=>v.slice()).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),half=a=>{const out=[];for(const p of a){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};return [...half(p).slice(0,-1),...half(p.reverse()).slice(0,-1)];}
function compactLightRadius(light){const R=Math.max(rules().corner.lightRadius,Math.max(...lightPolygon(light).map(p=>p[0]-light.u))+rules().corner.compactInnerRadius);if(!solid(R))fail('当前灯带宽厚不能采用小圆角，请先减小宽厚');return R;}
function endOpening(c){
 const v=c.section.vertices,body=v.map(p=>[p.u,p.d]),candidates=[];
 for(let i=0;i<v.length;i++){
  const a=v[i],b=v[(i+1)%v.length],before=v[(i+v.length-1)%v.length],after=v[(i+2)%v.length];if(Math.abs(a.d-b.d)>eps()||!solid(Math.abs(a.u-b.u),Math.max(a.u,b.u)))continue;
  const mid=(a.u+b.u)/2;if(inside([mid,a.d-.0001],body,false)||!inside([mid,a.d+.0001],body,false))continue;
  if(Math.abs(before.u-a.u)>eps()||Math.abs(after.u-b.u)>eps()||!solid(a.d-before.d,Math.max(a.d,before.d))||!solid(b.d-after.d,Math.max(b.d,after.d)))continue;
  const u0=Math.min(a.u,b.u),u1=Math.max(a.u,b.u),top=Math.max(before.d,after.d),bottom=a.d;if(!solid(bottom-top,Math.max(bottom,top)))continue;
  candidates.push([[u0,top],[u1,top],[u1,bottom],[u0,bottom]]);
 }
 return candidates.length===1?candidates[0]:null;
}
function endCaps(c){
 const active=['start','end'].filter(end=>c.ends?.[end]?.enabled).map(end=>[end,c.ends[end]]),pending=[],plates=[];if(!active.length)return {plates,pending};const section=endOpening(c),legs=route(c);
 if(!section)return {plates,pending:['端板槽口无法唯一识别，请保留水平槽底及两侧竖向挡边，再更新收口']};
 if(legs.length===1&&active.length===2&&!solid(distance(legs[0].a,legs[0].b)-active.reduce((s,[,v])=>s+v.thickness,0),distance(legs[0].a,legs[0].b)))return {plates,pending:['两端端板占满直线路径，请减小板厚']};
 for(const [end,config] of active){
  const leg=end==='start'?legs[0]:legs.at(-1),L=distance(leg.a,leg.b),t=tangent(leg),reserve=legs.length===2?Math.max(...section.map(p=>p[0])):0;
  if(!solid(L-reserve-config.thickness,L)){pending.push(`${end==='start'?'起端':'末端'}端板侵入转角或占满路径，请减小板厚`);continue;}
  const a=end==='start'?clone(leg.a):leg.b.map((v,i)=>v-t[i]*config.thickness),b=end==='start'?leg.a.map((v,i)=>v+t[i]*config.thickness):clone(leg.b),path={a,b,normal:clone(leg.normal)},footprint=[a.map((v,i)=>v+leg.normal[i]*section[0][0]),b.map((v,i)=>v+leg.normal[i]*section[0][0]),b.map((v,i)=>v+leg.normal[i]*section[1][0]),a.map((v,i)=>v+leg.normal[i]*section[1][0])];
  plates.push({end,section:clone(section),path,footprint,thickness:config.thickness,lightGap:config.lightGap,innerPoint:clone(end==='start'?b:a)});
 }
 return {plates,pending};
}
function endRetreats(c){const caps=endCaps(c),offsets={start:0,end:0};for(const p of caps.plates)offsets[p.end]=p.thickness+p.lightGap;return {offsets,pending:caps.pending};}
function continuousLight(c){
 const l=c.section.light,p=lightPolygon(l),legs=route(c),R=l.corner.radius,H=l.u+R,pending=[],none=()=>({pieces:[],pending,continuous:null}),ends=endRetreats(c);
 if(ends.pending.length){pending.push('端板收口尚未生成，灯带内侧退让待核对');return none();}
 if(legs.length!==2){pending.push('连续绕角需要两段L形路径');return none();}
 const minRadius=R-Math.max(...p.map(v=>v[0]-l.u));if(!solid(minRadius,Math.max(R,...p.map(v=>Math.abs(v[0])),Math.abs(l.u)))){pending.push('连续灯带内缘半径不足0.1 mm，请增大绕角半径或减小灯带宽厚');return none();}
 const lengths=legs.map(p=>distance(p.a,p.b));if(H<0||lengths.some((L,i)=>!solid(L-H-ends.offsets[i===0?'start':'end'],L))){pending.push('连续绕角或端板退让占满路径，转角两侧须各保留至少0.1 mm直段');return none();}
 const t=tangent(legs[0]),n=legs[0].normal,J=legs[0].b,O=J.map((v,i)=>v+(n[i]-t[i])*H),outer=Math.max(...p.map(v=>H-v[0])),angle=Math.min(rules().corner.arcMaxAngle*Math.PI/180,2*Math.acos(Math.max(-1,1-rules().corner.arcChordError/outer))),steps=Math.min(rules().corner.arcMaxSegments,Math.max(8,2*Math.ceil(Math.PI/2/angle/2)));
 const at=(q,theta)=>O.map((v,i)=>v+(t[i]*Math.sin(theta)-n[i]*Math.cos(theta))*(H-q));
 const rings=[p.map(([q])=>legs[0].a.map((v,i)=>v+n[i]*q+t[i]*ends.offsets.start))],centerline=[pointAt(c,l.u,ends.offsets.start)];
 for(let k=0;k<=steps;k++){const theta=k*Math.PI/2/steps;rings.push(p.map(([q])=>at(q,theta)));centerline.push(at(l.u,theta));}
 const lastT=tangent(legs[1]);rings.push(p.map(([q])=>legs[1].b.map((v,i)=>v+legs[1].normal[i]*q-lastT[i]*ends.offsets.end)));centerline.push(legs[1].b.map((v,i)=>v+legs[1].normal[i]*l.u-lastT[i]*ends.offsets.end));
 const minIndex=p.reduce((best,v,i)=>v[0]<p[best][0]?i:best,0),maxIndex=p.reduce((best,v,i)=>v[0]>p[best][0]?i:best,0),footprints=rings.slice(1).map((ring,i)=>[rings[i][minIndex],ring[minIndex],ring[maxIndex],rings[i][maxIndex]]);
 // On either half of a convex 90-degree miter the nearest wall coordinate is
 // H-(H-q)*cos(theta), theta in [0,pi/4]. Its swept (q,d) projection is exactly
 // the convex hull of the initial and midpoint light sections, not a center ray.
 const mid=p.map(([q,d])=>[H-(H-q)*Math.SQRT1_2,d]),envelope=hull([...p,...mid]),body=c.section.vertices.map(v=>[v.u,v.d]),overlap=intersection(body,envelope);
 if(overlap.length>=3&&Math.abs(area(overlap))>eps()**2)pending.push('连续转角灯带实体与槽腔边界相交，请调整半径、发光位置或截面');
 else if(!lightIssues(c.section).length){const support=[p[0],p[1],mid[0],mid[1]];if(!body.some((a,i)=>support.every(v=>onSegment(v,a,body[(i+1)%body.length]))))pending.push('连续转角灯带承托不完整，请核对槽底或调整发光位置');}
 return {pieces:[],pending,continuous:{rings,footprints,centerline,radius:R,steps,innerRadius:minRadius}};
}
function lightLayout(c){
 if(!c.section.light)return {pieces:[],pending:[]};if(c.section.light.corner?.mode==='arc')return continuousLight(c);const legs=route(c),pending=[],pieces=[],p=lightPolygon(c.section.light),maxU=Math.max(...p.map(v=>v[0])),extra=c.section.light.cornerSetback??rules().corner.lightSetback,ends=endRetreats(c);
 if(ends.pending.length)return {pieces,pending:['端板收口尚未生成，灯带内侧退让待核对']};
 for(let i=0;i<legs.length;i++){
  const leg=legs[i],L=distance(leg.a,leg.b),start=legs.length===2&&i===1?maxU+extra:ends.offsets.start,end=legs.length===2&&i===0?L-maxU-extra:L-ends.offsets.end;
  if(!solid(end-start,L)){pending.push(`第${i+1}段灯带转角退让后长度不足，暂不生成此段灯带`);continue;}
  const t=tangent(leg);pieces.push({legId:leg.id,path:{a:leg.a.map((v,k)=>v+t[k]*start),b:leg.a.map((v,k)=>v+t[k]*end),normal:clone(leg.normal)}});
 }
 let join=null;if(legs.length===2&&pieces.length===2){const l=c.section.light,center=(Math.min(...p.map(v=>v[0]))+maxU)/2;join=pieces.map((piece,i)=>{const a=i===0?piece.path.b:piece.path.a;return a.map((v,k)=>v+piece.path.normal[k]*center);});}
 return {pieces,pending,join};
}
function sample(c){
 const out=clone(c),legs=route(out),offset=end=>out.ends?.[end]?.enabled?out.ends[end].thickness+out.ends[end].lightGap:0,drop=end=>{if(out.ends){delete out.ends[end];if(!Object.keys(out.ends).length)delete out.ends;}};if(legs.length===1){const original=distance(out.path.a,out.path.b),L=Math.min(Math.max(600,offset('start')+100),original);if(L<original-eps()&&offset('end')>=original-L-eps())return out;out.path.b=pointAt(out,0,L);if(L<original-eps())drop('end');return out;}
 // A wide section or large light setback needs a longer sample to represent
 // the valid source; trimming every route to 600 would invent a short-arm error.
 const light=out.section.light,need=Math.max(600,Math.max(...out.section.vertices.map(v=>v.u))+100,light?(light.corner?.mode==='arc'?light.u+light.corner.radius:Math.max(...lightPolygon(light).map(p=>p[0]))+(light.cornerSetback??0))+100:0);
 const t0=tangent(legs[0]),t1=tangent(legs[1]),original0=distance(legs[0].a,legs[0].b),original1=distance(legs[1].a,legs[1].b),L0=Math.min(need,original0),L1=Math.min(need,original1);if(L0<original0-eps()&&offset('start')>=original0-L0-eps()||L1<original1-eps()&&offset('end')>=original1-L1-eps())return out;legs[0].a=legs[0].b.map((v,i)=>v-t0[i]*L0);legs[1].b=legs[1].a.map((v,i)=>v+t1[i]*L1);if(L0<original0-eps())drop('start');if(L1<original1-eps())drop('end');return out;
}
function validate(data){
 if(data===undefined)return;if(!data||data.version!==1||!Array.isArray(data.items)||data.items.length>rules().maxItems)fail('吊顶数据版本或数量无效');const ids=new Set();
 for(const c of data.items){
  if(!c||!key(c.id)||ids.has(c.id)||!key(c.roomId)||typeof c.name!=='string'||!c.name.trim()||c.name.length>80||!finite(c.height)||c.height<0||c.height>rules().max)fail('吊顶编号、区域、名称或标高无效');ids.add(c.id);
  if(c.ends!==undefined&&c.kind!=='profile')fail('端板收口仅支持沿边截面造型');
  if(c.kind==='profile'){
   if(c.ends!==undefined){if(!c.ends||typeof c.ends!=='object'||Array.isArray(c.ends)||Object.keys(c.ends).some(k=>!['start','end'].includes(k)))fail('端板收口只支持起端和末端');for(const e of Object.values(c.ends))if(!e||Object.keys(e).some(k=>!['enabled','thickness','lightGap'].includes(k))||typeof e.enabled!=='boolean'||!solid(e.thickness)||!finite(e.lightGap)||e.lightGap<0||e.lightGap>rules().max)fail('端板厚度须为0.1～20000 mm，灯带内侧退让须为0～20000 mm');}
   section(c.section);if(!c.path||c.path.segments!==undefined&&(!Array.isArray(c.path.segments)||c.path.segments.length!==rules().corner.maxLegs||c.path.a!==undefined||c.path.b!==undefined||c.path.join!=='miter'))fail('L形路径需要两条相邻直边和连续拼角');
   const legs=route(c),legIds=new Set();for(const p of legs){if(!p||!point(p.a)||!point(p.b)||!point(p.normal)||!solid(distance(p.a,p.b))||Math.abs(Math.hypot(...p.normal)-1)>eps())fail('吊顶路径和朝向无效');const t=tangent(p);if(Math.abs(t[0]*p.normal[0]+t[1]*p.normal[1])>eps())fail('路径朝向必须垂直于路径');if(!key(p.id)||legIds.has(p.id))fail('路径分段编号无效或重复');legIds.add(p.id);}
   if(legs.length===2){if(distance(legs[0].b,legs[1].a)>eps())fail('L形路径必须首尾相接');joinedPath(legs[0],legs[1]);const maxU=Math.max(...c.section.vertices.map(v=>v.u));if(legs.some(p=>!solid(distance(p.a,p.b)-maxU,distance(p.a,p.b))))fail('截面凸出占满短边，转角后须保留至少0.1 mm有效长度');}
   if(c.section.vertices.some(v=>c.height-v.d< -eps()))fail('吊顶截面不能低于测量基准地面');
  }else if(c.kind==='flat'){
   polygon(c.polygon,'平顶边界');if(!solid(c.thickness)||c.height+c.thickness>rules().max)fail('平顶板厚或顶部标高无效');
   if(c.basePolygon)polygon(c.basePolygon,'平顶原区域');
   if(c.attachment&&(!key(c.attachment.profileId)||!key(c.attachment.startId)||!key(c.attachment.endId)||!c.basePolygon||c.attachment.legs!==undefined&&(!Array.isArray(c.attachment.legs)||c.attachment.legs.length!==2||c.attachment.legs.some(v=>!key(v))||new Set(c.attachment.legs).size!==2)))fail('平顶固定连接参照无效');
  }else fail('吊顶类型无效');
 }
 return data;
}
function boundaryRing(input){
 const p=clone(input);if(!Array.isArray(p)||!p.every(point))fail('区域边界节点无效');while(p.length>3&&distance(p[0],p.at(-1))<=eps())p.pop();polygon(p,'区域边界');return p;
}
function regionBoundary(room){if(room.rings?.length>1)fail('首版平顶暂不支持带孔或多片区域，请先划分区域');return boundaryRing(room.rings?.[0]||room.poly);}
function boundaryPaths(room){
 return (room.rings?.length?room.rings:[room.poly]).flatMap(ring=>{const poly=boundaryRing(ring);return poly.map((a,i)=>{
  const b=poly[(i+1)%poly.length],L=distance(a,b),t=b.map((v,k)=>(v-a[k])/L),mid=a.map((v,k)=>(v+b[k])/2);let n=[-t[1],t[0]];
  if(!inside(mid.map((v,k)=>v+n[k]*.0001),room.poly,false))n=n.map(v=>-v);
  if(!inside(mid.map((v,k)=>v+n[k]*.0001),room.poly,false))fail('区域边界内侧无法确定，请先核对区域轮廓');
  return {a:clone(a),b:clone(b),normal:n};
 });});
}
function pointAt(c,u,s=0,index=0){const p=route(c)[index],t=tangent(p);return p.a.map((v,i)=>v+p.normal[i]*u+t[i]*s);}
function footprint(c,u=c.section.vertices.map(v=>v.u)){return [...offsetStations(c,Math.min(...u)),...offsetStations(c,Math.max(...u)).reverse()];}
function faces(c){return c.section.vertices.flatMap((a,i)=>{const b=c.section.vertices[(i+1)%c.section.vertices.length];if(Math.abs(a.u-b.u)>eps()||!solid(Math.abs(a.d-b.d),Math.max(a.d,b.d)))return [];const mid=[a.u+Math.max(.0001,eps()*10),(a.d+b.d)/2];if(inside(mid,c.section.vertices.map(v=>[v.u,v.d]),false))return [];return [{startId:a.id,endId:b.id,u:a.u,bottom:c.height-Math.max(a.d,b.d),top:c.height-Math.min(a.d,b.d)}];});}
// Clip one simple convex region. Concave/multiple-ring regions are rejected by the
// attachment operation rather than silently bridging disconnected components.
function convex(p){let sign=0;for(let i=0;i<p.length;i++){const x=cross(p[i],p[(i+1)%p.length],p[(i+2)%p.length]);if(Math.abs(x)<=eps())continue;if(sign&&Math.sign(x)!==sign)return false;sign=Math.sign(x);}return true;}
function clip(p,a,n,u){
 const out=[],value=v=>(v[0]-a[0])*n[0]+(v[1]-a[1])*n[1]-u;
 for(let i=0;i<p.length;i++){const v=p[i],w=p[(i+1)%p.length],x=value(v),y=value(w);if(x>=-eps())out.push(clone(v));if(x>eps()&&y< -eps()||x< -eps()&&y>eps()){const t=x/(x-y);out.push(v.map((q,k)=>q+(w[k]-q)*t));}}
 return out.filter((p,i)=>distance(p,out[(i+out.length-1)%out.length])>eps());
}
function attach(flat,profile,edge){
 if(flat.roomId!==profile.roomId)fail('当前仅支持同一区域内吸附平顶');
 const face=faces(profile).find(f=>f.startId===edge.startId&&f.endId===edge.endId);if(!face)fail('原截面立面已变化，请重新选择吸附面');
 if(face.top-face.bottom<flat.thickness-eps())fail('目标立面不能覆盖平顶全板厚，请选择更高的立面或修改板厚');
 const base=clone(flat.basePolygon||flat.polygon);if(!convex(base))fail('首版吸附平顶支持凸多边形区域，凹形区域请先划分');
 const legs=route(profile),stations=offsetStations(profile,face.u);let poly=base;for(const leg of legs)poly=clip(poly,leg.a,leg.normal,face.u);polygon(poly,'吸附后平顶');
 for(const [i,leg] of legs.entries()){
  const t=tangent(leg),along=p=>(p[0]-leg.a[0])*t[0]+(p[1]-leg.a[1])*t[1],contact=poly.filter(p=>Math.abs((p[0]-leg.a[0])*leg.normal[0]+(p[1]-leg.a[1])*leg.normal[1]-face.u)<=eps()),range=[along(stations[i]),along(stations[i+1])];
  if(contact.length<2||Math.max(...contact.map(along))-Math.min(...contact.map(along))<rules().min-eps()||Math.min(...contact.map(along))<range[0]-eps()||Math.max(...contact.map(along))>range[1]+eps())fail(`第${i+1}段目标路径未完整覆盖平顶连接边`);
 }
 if(checks({ceilings:{items:[profile]}},[{f:{id:flat.id,name:flat.name},p:poly,vertical:{bottom:face.bottom,top:face.bottom+flat.thickness}}]).length)fail('吸附后平顶与截面其他实体相交，请更换立面或修改截面');
 return {...clone(flat),polygon:poly,basePolygon:base,height:face.bottom,attachment:{profileId:profile.id,startId:face.startId,endId:face.endId,...(legs.length===2?{legs:legs.map(p=>p.id)}:{})}};
}
function resolve(data){
 validate(data);const items=clone(data?.items||[]),pending=[];
 for(let i=0;i<items.length;i++){
  const c=items[i];if(c.kind==='profile')for(const message of [...endCaps(c).pending,...lightIssues(c.section),...lightLayout(c).pending])pending.push({id:c.id,message});
  if(c.kind==='flat'&&c.attachment){const source=items.find(v=>v.id===c.attachment.profileId&&v.kind==='profile');try{if(!source)fail('固定连接的吊顶已不存在，请重新吸附或解除固定');const legs=route(source);if(JSON.stringify(c.attachment.legs||[])!==JSON.stringify(legs.length===2?legs.map(p=>p.id):[]))fail('固定边数量或参照已变化，请重新吸附平顶');items[i]=attach(c,source,c.attachment);}catch(e){pending.push({id:c.id,message:e.message});}}
 }
 return {items,pending};
}
function edit(work,item){const next=clone(work);next.ceilings=next.ceilings||{version:1,items:[]};const i=next.ceilings.items.findIndex(c=>c.id===item.id);if(i<0)next.ceilings.items.push(clone(item));else next.ceilings.items[i]=clone(item);validate(next.ceilings);return next;}
function remove(work,id){const next=clone(work);if(next.ceilings){const current=resolve(next.ceilings);next.ceilings.items=current.items.filter(c=>c.id!==id).map(c=>{if(c.attachment?.profileId===id){delete c.attachment;delete c.basePolygon;}return c;});if(!next.ceilings.items.length)delete next.ceilings;}return next;}
function derive(plan,work){if(!work.ceilings)return plan;const data=resolve(work.ceilings);for(const c of data.items){const r=plan.rooms.find(r=>r.id===c.roomId);if(!r)data.pending.push({id:c.id,message:'原区域已变化，请重新关联吊顶'});else{
  const poly=c.kind==='profile'?footprint(c):c.polygon;if(poly.some(p=>!inside(p,r.poly)))data.pending.push({id:c.id,message:'吊顶超出当前区域，请核对边界'});
  const light=c.kind==='profile'&&c.section.light?lightPolygon(c.section.light):[],top=c.kind==='profile'?c.height-Math.min(...c.section.vertices.map(v=>v.d),...light.map(p=>p[1])):c.height+c.thickness;
  if(light.length){const layout=lightLayout(c),polys=layout.continuous?.footprints||layout.pieces.map(piece=>footprint({...c,path:piece.path},light.map(p=>p[0])));if(polys.some(poly=>poly.some(p=>!inside(p,r.poly))))data.pending.push({id:c.id,message:'灯带超出当前区域，请核对发光位置'});}
  if(light.some(p=>c.height-p[1]< -eps()))data.pending.push({id:c.id,message:'灯带低于测量基准地面，请核对发光位置'});
  if(!finite(r.ceilingHeight))data.pending.push({id:c.id,message:'原顶高度待核对'});else if(top>r.ceilingHeight+eps())data.pending.push({id:c.id,message:'吊顶或灯带超过当前原顶高度'});
 }}return {...plan,ceilings:data};}
function onlyChange(a,b){const strip=v=>{const c=clone(v);delete c.ceilings;return JSON.stringify(c);};return strip(a)===strip(b);}
function intersection(subject,boundary){let out=subject,sign=area(boundary)>0?1:-1;for(let i=0;i<boundary.length&&out.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length],L=distance(a,b);out=clip(out,a,[-(b[1]-a[1])*sign/L,(b[0]-a[0])*sign/L],0);}return out;}
function checks(plan,bodies){
 const out=(plan.ceilings?.pending||[]).map(p=>({kind:'ceiling',id:p.id,ceilingId:p.id,name:'吊顶',pending:true,message:p.message}));
 for(const c of plan.ceilings?.items||[])for(const {f,p,vertical} of bodies){
  let hit=false;
  if(c.kind==='flat'){
   const overlap=intersection(c.polygon,p);if(overlap.length<3||Math.abs(area(overlap))<=eps()**2)continue;
   hit=!vertical||Math.min(vertical.top,c.height+c.thickness)-Math.max(vertical.bottom,c.height)>eps();
  }else{
   const outline=c.section.vertices.map(v=>[v.u,v.d]);for(const [i,leg] of route(c).entries()){
    const poly=intersection(p,legFootprint(c,i,outline.map(v=>v[0])));if(poly.length<3||Math.abs(area(poly))<=eps()**2)continue;
    const us=poly.map(v=>(v[0]-leg.a[0])*leg.normal[0]+(v[1]-leg.a[1])*leg.normal[1]),u0=Math.min(...us),u1=Math.max(...us),d0=vertical?c.height-vertical.top:-rules().max,d1=vertical?c.height-vertical.bottom:rules().max;
    const overlap=intersection(outline,[[u0,d0],[u1,d0],[u1,d1],[u0,d1]]);if(overlap.length>=3&&Math.abs(area(overlap))>eps()**2){hit=true;break;}
   }
   if(!hit)for(const plate of endCaps(c).plates){const poly=intersection(p,plate.footprint);if(poly.length<3||Math.abs(area(poly))<=eps()**2)continue;const bottom=c.height-Math.max(...plate.section.map(p=>p[1])),top=c.height-Math.min(...plate.section.map(p=>p[1]));if(!vertical||Math.min(vertical.top,top)-Math.max(vertical.bottom,bottom)>eps()){hit=true;break;}}
  }
  if(hit)out.push({kind:'ceiling',id:f.id,ceilingId:c.id,name:f.name,pending:!vertical,at:[f.cx,f.cy],message:`${f.name}与${c.name}${vertical?'实体相交':'投影重叠，家具高度未知，待核对'}`});
 }
 return out;
}
function signature(data){return data?data.items.map(({name,...geometry})=>{const g=clone(geometry);if(g.section)delete g.section.template;return g;}):null;}
function shift(work,offset){if(!work.ceilings)return;for(const c of work.ceilings.items){if(c.kind==='profile'){for(const p of route(c))for(const k of ['a','b'])p[k]=p[k].map(v=>v+offset);if(!c.path.segments){c.path.a=c.path.a.map(v=>v+offset);c.path.b=c.path.b.map(v=>v+offset);}}else for(const k of ['polygon','basePolygon'])if(c[k])c[k]=c[k].map(p=>p.map(v=>v+offset));}}
function requiresV6(work){return !!work?.ceilings?.items.some(c=>c.kind==='profile'&&(c.path?.segments||c.section?.light?.cornerSetback!==undefined)||c.attachment?.legs);}
function requiresV7(work){return !!work?.ceilings?.items.some(c=>c.section?.light?.corner!==undefined);}
function requiresV8(work){return !!work?.ceilings?.items.some(c=>c.ends!==undefined);}
const api={rules,lowCove,section,validate,polygon,area,inside,lightPolygon,lightIssues,route,tangent,samePath,joinedPath,offsetStations,legFootprint,compactLightRadius,endOpening,endCaps,lightLayout,sample,regionBoundary,boundaryPaths,pointAt,footprint,faces,attach,resolve,edit,remove,derive,onlyChange,checks,signature,shift,requiresV6,requiresV7,requiresV8};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCeiling=api;
})(typeof globalThis!=='undefined'?globalThis:this);
