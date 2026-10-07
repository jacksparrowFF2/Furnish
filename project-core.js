/* Project workflow, portable backups, quantities and spatial checks. No network. */
(function(root){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),fail=m=>{throw new Error(m);},num=v=>typeof v==='number'&&Number.isFinite(v);
 const core=()=>root.FurnishDraft || require('./floorplan-core.js');
 const inside=(p,poly)=>{let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;};
 const area=p=>Math.abs(p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[1]-a[1]*b[0];},0))/2/1e6;
 const perimeter=p=>p.reduce((n,a,i)=>n+Math.hypot(a[0]-p[(i+1)%p.length][0],a[1]-p[(i+1)%p.length][1]),0)/1000;
 function architecture(input){
  const a=clone(input);core().build(a.draft);
  a.phase=a.phase==='survey'?'survey':'design';
  if(a.phase==='design'){a.baseline=a.baseline||clone(a.draft);core().build(a.baseline);if(a.baseline.id!==a.draft.id)fail('Original structure identity mismatch');assertStructure(a.baseline,a.draft);}
  else delete a.baseline;
  return a;
 }
 function assertStructure(before,after){const mapped=d=>({...d,walls:d.walls.map(w=>({...w,kind:w.kind==='e'?'b':w.kind}))});core().assertBearingUnchanged(mapped(before),mapped(after));}
 function protectOriginal(current,next){
  if(current?.phase!=='design')return next;
  if(!next||next.draft.id!==current.draft.id)fail('不能用此方案覆盖已确认的原始结构，请复制为新户型重新核对');
  assertStructure(current.baseline,next.draft);
  return architecture({...next,phase:'design',baseline:clone(current.baseline)});
 }
 function changes(base,next){
  const signature=(w,d)=>JSON.stringify([w.a.map(v=>v*d.scale),w.b.map(v=>v*d.scale),w.thickness,w.kind]);
  const old=new Map(base.walls.map(w=>[w.id,w])),now=new Map(next.walls.map(w=>[w.id,w]));
  return {removed:base.walls.filter(w=>!now.has(w.id)||signature(w,base)!==signature(now.get(w.id),next)),added:next.walls.filter(w=>!old.has(w.id)||signature(w,next)!==signature(old.get(w.id),base))};
 }
 function quantities(plan,arch){
  const rooms=plan.rooms.filter(r=>r.counted!==false),net=rooms.reduce((n,r)=>n+area(r.poly),0),wall=rooms.reduce((n,r)=>n+perimeter(r.poly)*2.8,0);
  // Opening widths multiplied by their actual assumed vertical height, not plan-view wall depth.
  const deduction=(o,height)=>{const r=o.rect,width=r[2]-r[0],depth=r[3]-r[1],horizontal=width>=depth,center=[(r[0]+r[2])/2,(r[1]+r[3])/2],normal=horizontal?1:0,offset=Math.min(width,depth)/2+5;let faces=0;for(const side of [-1,1]){const p=[...center];p[normal]+=side*offset;if(rooms.some(room=>inside(p,room.poly)))faces++;}return Math.max(width,depth)/1000*height*Math.max(1,faces);};
  const holes=(plan.doors||[]).reduce((n,o)=>n+deduction(o,2.1),0)+(plan.wins||[]).reduce((n,o)=>n+deduction(o,o.head-o.sill),0)+(plan.slides||[]).reduce((n,o)=>n+deduction(o,2.1),0);
  let removed=0,added=0;
  if(arch?.baseline){const c=changes(arch.baseline,arch.draft);const len=(w,d)=>Math.hypot(w.a[0]-w.b[0],w.a[1]-w.b[1])*d.scale/1000;removed=c.removed.reduce((n,w)=>n+len(w,arch.baseline),0);added=c.added.reduce((n,w)=>n+len(w,arch.draft),0);}
  return {net,wall,paint:Math.max(0,wall-holes),removed,added,rooms:rooms.length};
 }
 function extraCosts(rows,q){
  if(!Array.isArray(rows)||rows.length>100)fail('最多 100 条装修费用');
  const sources={manual:null,net:q.net,paint:q.paint,removed:q.removed,added:q.added};
  const items=rows.map(r=>{if(!r||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||!Object.hasOwn(sources,r.source)||!num(r.price)||r.price<0||r.price>1e7||!num(r.quantity)||r.quantity<0||r.quantity>1e7||typeof r.unit!=='string'||r.unit.length>12)fail('装修费用数据无效');const quantity=r.source==='manual'?r.quantity:sources[r.source];return {...r,quantity,total:quantity*r.price};});
  return {items,total:items.reduce((n,r)=>n+r.total,0)};
 }
 function remapRooms(oldRooms,newRooms,settings){
  const overlap=(A,B)=>{const xs=[...new Set(A.concat(B).map(p=>p[0]))].sort((a,b)=>a-b),ys=[...new Set(A.concat(B).map(p=>p[1]))].sort((a,b)=>a-b);let value=0;for(let x=0;x<xs.length-1;x++)for(let y=0;y<ys.length-1;y++){const p=[(xs[x]+xs[x+1])/2,(ys[y]+ys[y+1])/2];if(inside(p,A)&&inside(p,B))value+=(xs[x+1]-xs[x])*(ys[y+1]-ys[y]);}return value;};
  const used=new Map();return Object.fromEntries(newRooms.map(r=>{const candidates=oldRooms.map(o=>({o,a:overlap(o.poly,r.poly)})).sort((a,b)=>b.a-a.a),match=candidates[0];if(!match||match.a<=0)return [r.id,{name:r.name,mat:r.mat}];const old=match.o,setting=clone(settings[old.id]||{name:old.name,mat:old.mat});const count=used.get(old.id)||0;used.set(old.id,count+1);if(count)setting.name+=' · 分区 '+(count+1);return [r.id,setting];}));
 }
 function remapOpenings(before,after,settings){const out={d:{},w:{}};
  (after.doorRefs||[]).forEach((id,index)=>{const previous=(before.doorRefs||[]).indexOf(id),value=settings.d?.[previous];if(previous<0||!value)return;const old=before.doors[previous].rect,next=after.doors[index].rect,h=value.h.map((v,axis)=>Math.abs(v-old[axis])<=Math.abs(v-old[axis+2])?next[axis]:next[axis+2]);out.d[index]={...clone(value),h};});
  (after.winRefs||[]).forEach((id,index)=>{const previous=(before.winRefs||[]).indexOf(id);if(previous>=0&&settings.w?.[previous]!==undefined)out.w[index]=settings.w[previous];});return out;
 }
 function polygon(f){const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]].map(([x,y])=>[f.cx+x*c-y*s,f.cy+x*s+y*c]);}
 const rect=r=>[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]];
 function intersects(A,B){for(const P of [A,B])for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],nx=b[1]-a[1],ny=a[0]-b[0],l=Math.hypot(nx,ny);if(!l)continue;const pa=A.map(p=>(p[0]*nx+p[1]*ny)/l),pb=B.map(p=>(p[0]*nx+p[1]*ny)/l);if(Math.max(...pa)<=Math.min(...pb)+5||Math.max(...pb)<=Math.min(...pa)+5)return false;}return true;}
 function spaceCheck(plan,furniture,{passage=800}={}){
  if(!num(passage)||passage<300||passage>2000)fail('通道阈值须为 300–2000 mm');
  const ignored=new Set(['rug','pendant','acwall','wallart','curtain','mirror','tv','stove','ksink','plant']);
  const bodies=furniture.filter(f=>!ignored.has(f.type)).map(f=>({f,p:polygon(f)})),walls=plan.walls.map(rect),issues=[];
  const swings=[];
  (plan.doors||[]).forEach((d,index)=>{const points=[d.h];for(let i=0;i<=20;i++){const t=i/20*Math.PI/2;points.push([d.h[0]+d.len*(d.c[0]*Math.cos(t)+d.o[0]*Math.sin(t)),d.h[1]+d.len*(d.c[1]*Math.cos(t)+d.o[1]*Math.sin(t))]);}swings.push(points);for(const {f,p} of bodies)if(intersects(points,p))issues.push({kind:'door',doorIndex:index,id:f.id,name:f.name,message:'开门范围与家具冲突'});if(walls.some(w=>intersects(points,w)))issues.push({kind:'swingwall',doorIndex:index,name:d.name||'门 '+(index+1),message:'开门范围与墙体冲突'});});
  for(let i=0;i<swings.length;i++)for(let j=i+1;j<swings.length;j++)if(intersects(swings[i],swings[j]))issues.push({kind:'swings',doorIndex:i,name:(plan.doors[i].name||'门 '+(i+1))+' / '+(plan.doors[j].name||'门 '+(j+1)),message:'两扇门的开启范围重叠，请核对同时开门情况'});
  for(const {f,p} of bodies){
   if(walls.some(w=>intersects(p,w)))issues.push({kind:'wall',id:f.id,name:f.name,message:'家具占用墙体空间'});
   const clearance=f.frontClearance??(/wardrobe|cabinet|dresser|custom/.test(f.type)?600:0);if(!clearance)continue;
   const a=f.rot*Math.PI/180,front={...f,cx:f.cx-Math.sin(a)*(f.d/2+clearance/2),cy:f.cy+Math.cos(a)*(f.d/2+clearance/2),d:clearance};const zone=polygon(front);
   if(walls.some(w=>intersects(zone,w))||bodies.some(b=>b.f.id!==f.id&&intersects(zone,b.p)))issues.push({kind:'front',id:f.id,name:f.name,message:`正面 ${clearance} mm 使用空间不足（柜门／抽屉）`});
  }
  // Scan actual horizontal/vertical free intervals in rooms; these are candidate bottlenecks, not a pathfinding guarantee.
  for(const room of plan.rooms){const xs=room.poly.map(p=>p[0]),ys=room.poly.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);let narrow=null;
   for(const axis of [0,1]){const low=axis?x0:y0,high=axis?x1:y1;for(let fixed=low+200;fixed<high;fixed+=200){const cuts=[...(axis?ys:xs)];for(const {p} of bodies)for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],other=1-axis;if((a[other]<=fixed&&b[other]>=fixed)||(b[other]<=fixed&&a[other]>=fixed)){if(a[other]!==b[other])cuts.push(a[axis]+(b[axis]-a[axis])*(fixed-a[other])/(b[other]-a[other]));}}const sorted=[...new Set(cuts)].sort((a,b)=>a-b);let run=0,start=0;for(let i=0;i<sorted.length-1;i++){const point=axis?[fixed,(sorted[i]+sorted[i+1])/2]:[(sorted[i]+sorted[i+1])/2,fixed];const free=inside(point,room.poly)&&!bodies.some(b=>inside(point,b.p));if(free){if(!run)start=sorted[i];run+=sorted[i+1]-sorted[i];}if((!free||i===sorted.length-2)&&run){if(run>=100&&run<passage&&(!narrow||run<narrow.width))narrow={width:run,at:axis?[fixed,start+run/2]:[start+run/2,fixed]};run=0;}}}}
   if(narrow)issues.push({kind:'passage',id:room.id,name:room.name,message:`候选狭窄间隙约 ${Math.round(narrow.width)} mm，低于自设 ${passage} mm 阈值`,at:narrow.at});
  }
  return issues;
 }
 function parseOBJ(text){
  if(typeof text!=='string'||text.length>2e6)fail('OBJ 上限 2 MB');const vertices=[],positions=[];
  for(const line of text.split(/\r?\n/)){const p=line.trim().split(/\s+/);if(p[0]==='v'){const v=p.slice(1,4).map(Number);if(v.length!==3||v.some(n=>!num(n)||Math.abs(n)>1e9))fail('OBJ 顶点无效');vertices.push(v);if(vertices.length>30000)fail('OBJ 顶点过多');}else if(p[0]==='f'){const face=p.slice(1).map(v=>{const id=Number(v.split('/')[0]);if(!Number.isInteger(id)||id===0)fail('OBJ 面索引无效');const index=id<0?vertices.length+id:id-1;if(!vertices[index])fail('OBJ 面引用了不存在的顶点');return vertices[index];});if(face.length<3||face.length>100)fail('OBJ 面无效');for(let i=1;i<face.length-1;i++)positions.push(...face[0],...face[i],...face[i+1]);if(positions.length>180000)fail('OBJ 最多 20000 个三角面');}}
  if(!positions.length)fail('OBJ 未包含网格面');const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<positions.length;i++){const axis=i%3;min[axis]=Math.min(min[axis],positions[i]);max[axis]=Math.max(max[axis],positions[i]);}if(max.some((v,i)=>v-min[i]<1e-9))fail('模型需要具有宽、高、深三个维度');return {positions,min,max};
 }
 const checksum=value=>{let hash=2166136261;for(const c of JSON.stringify(value)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');};
 function validateWork(work){
  if(!work||!Array.isArray(work.furniture)||work.furniture.length>2000)fail('家具数据无效');const w=clone(work),ids=new Set();
  for(const f of w.furniture){if(!f||typeof f.id!=='string'||ids.has(f.id)||![f.cx,f.cy,f.w,f.d,f.rot].every(num)||f.w<=0||f.d<=0||f.w>20000||f.d>20000)fail('家具尺寸或编号无效');ids.add(f.id);if(f.price!==undefined&&(!num(f.price)||f.price<0||f.price>1e7)||f.h!==undefined&&(!num(f.h)||f.h<=0||f.h>20000))fail('家具价格或高度无效');if(f.frontClearance!==undefined&&(!num(f.frontClearance)||f.frontClearance<0||f.frontClearance>3000))fail('家具使用空间无效');if(f.obj){if(!Array.isArray(f.obj.positions)||!f.obj.positions.length||f.obj.positions.length>180000||f.obj.positions.length%9||f.obj.positions.some(v=>!num(v)||Math.abs(v)>1e9))fail('模型数据无效');for(let axis=0;axis<3;axis++){const values=f.obj.positions.filter((v,i)=>i%3===axis);if(Math.max(...values)-Math.min(...values)<1e-9)fail('模型必须具有三维尺寸');}}}
  if(w.architecture)w.architecture=architecture(w.architecture);if(w.renovation)extraCosts(w.renovation,{net:0,paint:0,removed:0,added:0});
  if(w.designNote!==undefined&&(typeof w.designNote!=='string'||w.designNote.length>500))fail('方案备注无效');
  if(w.spaceIgnored!==undefined&&(!Array.isArray(w.spaceIgnored)||w.spaceIgnored.length>100||w.spaceIgnored.some(v=>typeof v!=='string'||v.length>1000000)))fail('忽略提示数据无效');
  if(w.assets!==undefined&&(!Array.isArray(w.assets)||w.assets.length>5||w.assets.some(a=>!a||typeof a.name!=='string'||a.name.length>150||typeof a.data!=='string'||a.data.length>2700000||!(/^[A-Za-z0-9+/]*={0,2}$/.test(a.data)))))fail('项目附件无效');
  return w;
 }
 function pack(payload){return {format:'furnish-project',version:1,createdAt:new Date().toISOString(),checksum:checksum(payload),payload:clone(payload)};}
 function unpack(input){let data=clone(input);if(data.format==='furnish-project'){if(data.version!==1)fail('不支持的项目版本');if(checksum(data.payload)!==data.checksum)fail('项目完整性校验失败，文件可能被修改或损坏');data=data.payload;}else if(Array.isArray(data.furniture)){data={planId:data.plan,current:data,designs:[],catalog:[]};}else fail('不是 Furnish 项目文件');
  if(!data||typeof data.planId!=='string'||!Array.isArray(data.designs)||data.designs.length>100||!Array.isArray(data.catalog)||data.catalog.length>500)fail('项目结构无效');data.current=validateWork(data.current);data.designs=data.designs.map(d=>{if(typeof d.name!=='string'||d.name.length>80)fail('方案名称无效');return {...d,work:validateWork(d.work)};});if(data.current.architecture){const id=data.current.architecture.draft.id;if(id!==data.planId||data.designs.some(d=>d.work.architecture?.draft.id!==id))fail('方案户型不一致');}
  for(const c of data.catalog){if(!c||typeof c.name!=='string'||c.name.length>80||![c.w,c.d,c.h,c.price].every(num)||c.w<50||c.d<50||c.w>20000||c.d>20000||c.h<=0||c.h>20000||c.price<0)fail('家具库数据无效');if(c.obj)validateWork({furniture:[{...c,id:'model',cx:0,cy:0,rot:0}]});}return data;
 }
 root.FurnishProject={architecture,assertStructure,protectOriginal,changes,quantities,extraCosts,remapRooms,remapOpenings,spaceCheck,parseOBJ,pack,unpack,validateWork,area,polygon,intersects};
 if(typeof module!=='undefined')module.exports=root.FurnishProject;
})(typeof window==='undefined'?globalThis:window);
