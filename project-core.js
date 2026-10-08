/* Project workflow, portable backups, quantities and spatial checks. No network. */
(function(root){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),fail=m=>{throw new Error(m);},num=v=>typeof v==='number'&&Number.isFinite(v);
 const core=()=>root.FurnishDraft || require('./floorplan-core.js');
 const design=()=>root.FurnishDesign || require('./design-core.js');
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
  const holes=(plan.doors||[]).reduce((n,o)=>n+deduction(o,2.1),0)+(plan.wins||[]).reduce((n,o)=>n+(o.bayId?(o.paintRect?deduction({...o,rect:o.paintRect},o.head-o.sill):0):deduction(o,o.head-o.sill)),0)+(plan.slides||[]).reduce((n,o)=>n+deduction(o,o.v?2.4:2.1),0);
  let removed=0,added=0;
  if(arch?.baseline){const c=changes(arch.baseline,arch.draft);const len=(w,d)=>Math.hypot(w.a[0]-w.b[0],w.a[1]-w.b[1])*d.scale/1000;removed=c.removed.reduce((n,w)=>n+len(w,arch.baseline),0);added=c.added.reduce((n,w)=>n+len(w,arch.draft),0);}
  return {net,wall,paint:Math.max(0,wall-holes),removed,added,rooms:rooms.length};
 }
 // One set of rates feeds the current budget, comparisons and exports.
 function pricing(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('预算参数格式无效');
  const result={floorWaste:input.floorWaste??5,paintWaste:input.paintWaste??10,paintPrice:input.paintPrice??28,materials:{...input.materials}};
  if(!num(result.floorWaste)||result.floorWaste<0||result.floorWaste>100||!num(result.paintWaste)||result.paintWaste<0||result.paintWaste>100)fail('损耗率须为 0–100%');
  if(!num(result.paintPrice)||result.paintPrice<0||result.paintPrice>1e7)fail('乳胶漆单价无效');
  if(input.materials!==undefined&&(!input.materials||typeof input.materials!=='object'||Array.isArray(input.materials)))fail('材料单价格式无效');
  if(Object.keys(result.materials).length>100||Object.entries(result.materials).some(([id,v])=>!id||id.length>80||!num(v)||v<0||v>1e7))fail('地面材料单价无效');
  return result;
 }
 function estimate(plan,work,materials,priceOf=f=>f.price??f.referencePrice??0){
  const settings=pricing(work.pricing),q=quantities(plan,work.architecture),counted=plan.rooms.filter(r=>r.counted!==false),byMat=new Map();
  for(const r of plan.rooms){const m=work.rooms?.[r.id]?.mat||r.mat;if(!materials[m])fail('地面材料不存在：'+m);byMat.set(m,(byMat.get(m)||0)+area(r.poly));}
  const mats=[...byMat].map(([m,a])=>{const price=settings.materials[m]??materials[m].price,quantity=a*(1+settings.floorWaste/100);return {m,a,price,quantity,c:quantity*price};});
  const floor=mats.reduce((n,r)=>n+r.c,0),paintQuantity=q.paint*(1+settings.paintWaste/100),paintCost=paintQuantity*settings.paintPrice,furniture=work.furniture.reduce((n,f)=>n+priceOf(f),0),extra=extraCosts(work.renovation||[],q);
  return {...q,settings,counted,tot:q.net,mats,floor,wallArea:q.wall,paintArea:q.paint,paintQuantity,paint:paintCost,paintCost,furniture,furn:furniture,extra:extra.items,renovation:extra.total,total:floor+paintCost+furniture+extra.total};
 }
 // Read a version without inheriting the currently rendered opening overrides.
 function effectivePlan(base,work){
  const plan=work.architecture?core().build(work.architecture.draft):clone(base);
  plan.walls=plan.walls.filter((w,i)=>!(work.demolished||[]).includes('w'+i));
  (plan.doors||[]).forEach((d,i)=>{if(d._base)Object.assign(d,clone(d._base));if(work.open?.d?.[i])Object.assign(d,clone(work.open.d[i]));});
  (plan.wins||[]).forEach((w,i)=>{w.sill=w._sill0??w.sill;w.head=w._head0??w.head??2.4;const v=work.open?.w?.[i];if(typeof v==='number')w.sill=v;else if(v)Object.assign(w,{sill:v.sill,head:v.head});});
  plan.rooms=plan.rooms.map(r=>({...r,name:work.rooms?.[r.id]?.name||r.name}));
  (plan.wins||[]).forEach(w=>{if(w.bayGroup){const r=plan.rooms.find(r=>r.id===w.bayGroup);if(r)r.height=w.sill;}});
  return plan;
 }
 function validatePlanWork(base,work){
  const plan=work.architecture?core().build(work.architecture.draft):base;if(!plan)fail('文件引用了不存在的户型');
  for(const id of work.demolished||[])if(Number(id.slice(1))>=plan.walls.length)fail('拆墙编号 '+id+' 不存在于此方案');
  for(const [kind,list] of [['d',plan.doors||[]],['w',plan.wins||[]]])for(const [index,value] of Object.entries(work.open?.[kind]||{})){
   if(Number(index)>=list.length)fail((kind==='d'?'门':'窗')+'编号 '+index+' 不存在于此方案');
   if(kind==='d'){const r=list[index].rect,h=value.h,axis=r[2]-r[0]>=r[3]-r[1]?0:1;if(h[0]<r[0]-.01||h[0]>r[2]+.01||h[1]<r[1]-.01||h[1]>r[3]+.01)fail('门 '+index+' 的铰链位置超出洞口');const start=Math.abs(h[axis]-r[axis])<=.01,end=Math.abs(h[axis]-r[axis+2])<=.01;if(!start&&!end||value.c[1-axis]!==0||value.c[axis]!== (start?1:-1))fail('门 '+index+' 的铰链与关闭方向不匹配洞口');}
  }
  return work;
 }
 function previewPlan(payload,plans){const base=plans.find(p=>p.id===payload.planId);for(const [label,work] of [['当前方案',payload.current],...payload.designs.map(d=>['命名方案「'+d.name+'」',d.work])]){try{validatePlanWork(base,work);}catch(e){fail(label+'：'+e.message);}}return effectivePlan(base,payload.current);}
 function checkFingerprint(issue,plan,furniture,passage){return JSON.stringify([issue,passage,plan.rooms.map(r=>[r.id,r.poly]),plan.walls,plan.doors,furniture.map(f=>[f.id,f.type,f.cx,f.cy,f.w,f.d,f.rot,f.frontClearance])]);}
 function review(plan,work){const passage=work.spaceThreshold||800,issues=spaceCheck(plan,work.furniture,{passage}),ignored=new Set(work.spaceIgnored||[]);return issues.map(v=>({...v,ignored:ignored.has(checkFingerprint(v,plan,work.furniture,passage))}));}
 function readiness(plan,work){
  const items=[];
  if(work.architecture?.phase==='survey')items.push({kind:'structure',name:'原始结构',message:'尚未确认原始墙体与门窗',action:'structure'});
  for(const r of plan.rooms)if(r.counted!==false&&design().inferUse(r,work.rooms?.[r.id])==='unassigned')items.push({kind:'room',id:r.id,name:work.rooms?.[r.id]?.name||r.name,message:'房间用途未分类',action:'room'});
  for(const f of work.furniture){
   const missing=[];if(f.h===undefined)missing.push('高度');if(!f.brand?.trim())missing.push('品牌');if(!f.model?.trim())missing.push('型号');
   if(missing.length)items.push({kind:'spec',id:f.id,name:f.name,message:'待补充：'+missing.join('、'),action:'product'});
   if(f.price===undefined)items.push({kind:'price',id:f.id,name:f.name,message:'使用参考价格，尚未录入确认单价',action:'product'});
  }
  for(const issue of review(plan,work))items.push({...issue,kind:'space',issue,action:'space'});
  const pending=items.filter(v=>!v.ignored),counts=Object.fromEntries(['structure','room','spec','price','space'].map(k=>[k,pending.filter(v=>v.kind===k).length]));
  return {items,counts,pending:pending.length,reviewed:items.length-pending.length,ready:pending.length===0};
 }
 function openingSchedule(plan,work){
  const width=o=>Math.round(Math.max(o.rect[2]-o.rect[0],o.rect[3]-o.rect[1])),rows=[],seen=new Set();
  (plan.doors||[]).forEach((d,i)=>rows.push({name:d.name||'门 '+(i+1),type:'平开门',width:width(d),height:2100,sill:0,depth:null,parts:1}));
  (plan.slides||[]).forEach((d,i)=>rows.push({name:d.name||'推拉门 '+(i+1),type:'推拉门',width:width(d),height:d.v?2400:2100,sill:0,depth:null,parts:1}));
  (plan.wins||[]).forEach((w,i)=>{const group=w.bayId||w.bayGroup;if(group&&seen.has(group))return;if(group)seen.add(group);const opening=work.architecture?.draft.openings.find(o=>o.id===group),parts=group?plan.wins.filter(v=>(v.bayId||v.bayGroup)===group):[w];rows.push({name:group?'飘窗 '+seen.size:'窗 '+(i+1),type:group?'三面飘窗':'普通窗',width:opening?.length??(group?parts.map(width).join(' / '):width(w)),height:Math.round((w.head-w.sill)*1000),sill:Math.round(w.sill*1000),depth:opening?.bay?.depth??null,parts:parts.length});});
  return rows;
 }
 const purchaseStates={planned:'待选型',confirmed:'已确认',ordered:'已下单',received:'已到货'};
 const purchaseMoney=value=>'¥'+Math.round(Number(value)).toLocaleString('zh-CN');
 function procurement(plan,work,priceOf=f=>f.price??0){
  const groups=new Map(),totals=Object.fromEntries(Object.keys(purchaseStates).map(k=>[k,0]));
  for(const f of work.furniture){const price=priceOf(f),status=Object.hasOwn(purchaseStates,f.purchaseStatus)?f.purchaseStatus:'planned',note=f.purchaseNote||'',key=JSON.stringify([f.type,f.name,f.brand||'',f.model||'',f.w,f.d,f.h??null,price,f.price===undefined,f.priceDate||'',f.sourceUrl||'',status,note]);
   const item=groups.get(key)||{name:f.name,brand:f.brand||'',model:f.model||'',w:f.w,d:f.d,h:f.h??null,price,estimated:f.price===undefined,priceDate:f.priceDate||'',sourceUrl:f.sourceUrl||'',status,note,ids:[],rooms:[]};item.ids.push(f.id);
   const room=plan.rooms.find(r=>inside([f.cx,f.cy],r.poly)),name=room?.name||'未分配房间';if(!item.rooms.includes(name))item.rooms.push(name);groups.set(key,item);totals[status]+=price;
  }
  const items=[...groups.values()].map(v=>({...v,quantity:v.ids.length,total:v.price*v.ids.length}));
  return {items,totals,total:Object.values(totals).reduce((a,b)=>a+b,0),estimated:items.filter(v=>v.estimated).reduce((n,v)=>n+v.quantity,0),missingHeight:items.filter(v=>v.h===null).reduce((n,v)=>n+v.quantity,0)};
 }
 function updatePurchaseGroup(work,ids,values){
  const allowed=['brand','model','sourceUrl','priceDate','price','purchaseStatus','purchaseNote'];if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).some(k=>!allowed.includes(k)))fail('本组采购资料更新无效');
  for(const key of ['brand','model','sourceUrl','priceDate','purchaseStatus','purchaseNote'])if(Object.hasOwn(values,key)&&typeof values[key]!=='string')fail('采购资料须为文字');
  if(Object.hasOwn(values,'price')&&values.price!==null&&(!num(values.price)||values.price<0||values.price>1e7))fail('单价须为 0–10000000 元');
  const next=clone(work),selected=new Set(ids);if(next.furniture.filter(f=>selected.has(f.id)).length!==ids.length)fail('本组家具已变更，请重新打开采购清单');
  for(const f of next.furniture)if(selected.has(f.id)){Object.assign(f,values);if(values.price===null)delete f.price;}
  return validateWork(next);
 }
 function csv(rows){return '\ufeff'+rows.map(row=>row.map(value=>{let text=String(value??'');if(typeof value!=='number'&&/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');}
 function extraCosts(rows,q){
  if(!Array.isArray(rows)||rows.length>100)fail('最多 100 条装修费用');
  const sources={manual:null,net:q.net,paint:q.paint,removed:q.removed,added:q.added};
  const items=rows.map(r=>{if(!r||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||!Object.hasOwn(sources,r.source)||!num(r.price)||r.price<0||r.price>1e7||!num(r.quantity)||r.quantity<0||r.quantity>1e7||typeof r.unit!=='string'||r.unit.length>12)fail('装修费用数据无效');const quantity=r.source==='manual'?r.quantity:sources[r.source];return {...r,quantity,total:quantity*r.price};});
  return {items,total:items.reduce((n,r)=>n+r.total,0)};
 }
 function remapRooms(oldRooms,newRooms,settings){
  const overlap=(A,B)=>{const xs=[...new Set(A.concat(B).map(p=>p[0]))].sort((a,b)=>a-b),ys=[...new Set(A.concat(B).map(p=>p[1]))].sort((a,b)=>a-b);let value=0;for(let x=0;x<xs.length-1;x++)for(let y=0;y<ys.length-1;y++){const p=[(xs[x]+xs[x+1])/2,(ys[y]+ys[y+1])/2];if(inside(p,A)&&inside(p,B))value+=(xs[x+1]-xs[x])*(ys[y+1]-ys[y]);}return value;};
  const used=new Map();return Object.fromEntries(newRooms.map(r=>{const candidates=oldRooms.map(o=>({o,a:overlap(o.poly,r.poly)})).sort((a,b)=>b.a-a.a),match=candidates[0];if(!match||match.a<=0)return [r.id,{name:r.name,mat:r.mat,use:design().inferUse(r)}];const old=match.o,setting=clone(settings[old.id]||{name:old.name,mat:old.mat});setting.use=design().inferUse(r,setting);const count=used.get(old.id)||0;used.set(old.id,count+1);if(count)setting.name+=' · 分区 '+(count+1);return [r.id,setting];}));
 }
 function remapOpenings(before,after,settings){const out={d:{},w:{}};
  (after.doorRefs||[]).forEach((id,index)=>{const previous=(before.doorRefs||[]).indexOf(id),value=settings.d?.[previous];if(previous<0||!value)return;const old=before.doors[previous].rect,next=after.doors[index].rect,h=value.h.map((v,axis)=>Math.abs(v-old[axis])<=Math.abs(v-old[axis+2])?next[axis]:next[axis+2]);out.d[index]={...clone(value),h};});
  (after.winRefs||[]).forEach((id,index)=>{const previous=(before.winRefs||[]).indexOf(id);if(previous>=0&&settings.w?.[previous]!==undefined)out.w[index]=settings.w[previous];});return out;
 }
 function polygon(f){const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]].map(([x,y])=>[f.cx+x*c-y*s,f.cy+x*s+y*c]);}
 function fitsInRooms(rooms,footprint){
  // Room boundaries are orthogonal. Every grid cell has a uniform room membership;
  // clipping the rotated footprint to those cells also catches concave notches.
  const xs=footprint.map(p=>p[0]),ys=footprint.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const cuts=(axis,lo,hi)=>[...new Set([lo,hi,...rooms.flatMap(r=>r.poly.map(p=>p[axis])).filter(v=>v>lo&&v<hi)])].sort((a,b)=>a-b),xx=cuts(0,x0,x1),yy=cuts(1,y0,y1);
  const clip=(poly,axis,edge,sign)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=sign*(a[axis]-edge)>=0,bi=sign*(b[axis]-edge)>=0;if(ai)out.push(a);if(ai!==bi){const t=(edge-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}return out;};
  let outside=0;for(let i=0;i<xx.length-1;i++)for(let j=0;j<yy.length-1;j++){if(rooms.some(r=>inside([(xx[i]+xx[i+1])/2,(yy[j]+yy[j+1])/2],r.poly)))continue;let piece=footprint;for(const [axis,edge,sign] of [[0,xx[i],1],[0,xx[i+1],-1],[1,yy[j],1],[1,yy[j+1],-1]])piece=clip(piece,axis,edge,sign);if(piece.length>2)outside+=area(piece)*1e6;if(outside>1)return false;}return true;
 }
 const rect=r=>[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]];
 function intersects(A,B){for(const P of [A,B])for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],nx=b[1]-a[1],ny=a[0]-b[0],l=Math.hypot(nx,ny);if(!l)continue;const pa=A.map(p=>(p[0]*nx+p[1]*ny)/l),pb=B.map(p=>(p[0]*nx+p[1]*ny)/l);if(Math.max(...pa)<=Math.min(...pb)+5||Math.max(...pb)<=Math.min(...pa)+5)return false;}return true;}
 function spaceCheck(plan,furniture,{passage=800,focusId=null,focusIds=null,scanPassages=true,maxIssues=Infinity}={}){
  if(!num(passage)||passage<300||passage>2000)fail('通道阈值须为 300–2000 mm');
  const targets=focusIds?new Set(focusIds):focusId?new Set([focusId]):null;
  const ignored=new Set(['rug','pendant','acwall','wallart','curtain','mirror','tv','stove','ksink','plant']);
  const bodies=furniture.filter(f=>!ignored.has(f.type)).map(f=>{const p=polygon(f);return {f,p,box:[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))]};}),walls=plan.walls.map(rect),issues=[];
  const swings=[];
  (plan.doors||[]).forEach((d,index)=>{const points=[d.h];for(let i=0;i<=20;i++){const t=i/20*Math.PI/2;points.push([d.h[0]+d.len*(d.c[0]*Math.cos(t)+d.o[0]*Math.sin(t)),d.h[1]+d.len*(d.c[1]*Math.cos(t)+d.o[1]*Math.sin(t))]);}swings.push(points);for(const {f,p} of bodies)if(intersects(points,p))issues.push({kind:'door',doorIndex:index,id:f.id,name:f.name,message:'开门范围与家具冲突'});if(walls.some(w=>intersects(points,w)))issues.push({kind:'swingwall',doorIndex:index,name:d.name||'门 '+(index+1),message:'开门范围与墙体冲突'});});
  for(let i=0;i<swings.length;i++)for(let j=i+1;j<swings.length;j++)if(intersects(swings[i],swings[j]))issues.push({kind:'swings',doorIndex:i,name:(plan.doors[i].name||'门 '+(i+1))+' / '+(plan.doors[j].name||'门 '+(j+1)),message:'两扇门的开启范围重叠，请核对同时开门情况'});
  for(const {f,p} of bodies){
   if(targets&&!targets.has(f.id))continue;
   if(targets&&issues.filter(v=>targets.has(v.id)||targets.has(v.otherId)).length>=maxIssues)break;
   if(walls.some(w=>intersects(p,w)))issues.push({kind:'wall',id:f.id,name:f.name,message:'家具占用墙体空间'});
   if(plan.rooms.length&&!fitsInRooms(plan.rooms,p))issues.push({kind:'outside',id:f.id,name:f.name,message:'家具占地超出房间范围（含折角／凹口）'});
   const clearance=f.frontClearance??(/wardrobe|cabinet|dresser|custom/.test(f.type)?600:0);if(!clearance)continue;
   const a=f.rot*Math.PI/180,front={...f,cx:f.cx-Math.sin(a)*(f.d/2+clearance/2),cy:f.cy+Math.cos(a)*(f.d/2+clearance/2),d:clearance};const zone=polygon(front);
   if(walls.some(w=>intersects(zone,w))||bodies.some(b=>b.f.id!==f.id&&intersects(zone,b.p)))issues.push({kind:'front',id:f.id,name:f.name,message:`正面 ${clearance} mm 使用空间不足（柜门／抽屉）`});
  }
  const pair=(a,b)=>{if(a.box[2]<=b.box[0]||b.box[2]<=a.box[0]||a.box[3]<=b.box[1]||b.box[3]<=a.box[1])return;if(intersects(a.p,b.p))issues.push({kind:'overlap',id:a.f.id,otherId:b.f.id,name:a.f.name+' / '+b.f.name,message:'家具占地范围重叠，请核对实际摆放'});};
  if(targets){const selectedIssues=issues.filter(v=>targets.has(v.id)||targets.has(v.otherId));if(selectedIssues.length>=maxIssues)return selectedIssues.slice(0,maxIssues);groupPairs:for(let i=0;i<bodies.length;i++)if(targets.has(bodies[i].f.id))for(let j=0;j<bodies.length;j++)if(i!==j&&(!targets.has(bodies[j].f.id)||i<j)){const count=issues.length;pair(bodies[i],bodies[j]);if(issues.length>count)selectedIssues.push(issues[issues.length-1]);if(selectedIssues.length>=maxIssues)break groupPairs;}}else for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)pair(bodies[i],bodies[j]);
  // Scan actual horizontal/vertical free intervals in rooms; these are candidate bottlenecks, not a pathfinding guarantee.
  for(const room of scanPassages?plan.rooms.filter(r=>r.counted!==false):[]){const xs=room.poly.map(p=>p[0]),ys=room.poly.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);let narrow=null;
   for(const axis of [0,1]){const low=axis?x0:y0,high=axis?x1:y1;for(let fixed=low+200;fixed<high;fixed+=200){const cuts=[...(axis?ys:xs)];for(const {p} of bodies)for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],other=1-axis;if((a[other]<=fixed&&b[other]>=fixed)||(b[other]<=fixed&&a[other]>=fixed)){if(a[other]!==b[other])cuts.push(a[axis]+(b[axis]-a[axis])*(fixed-a[other])/(b[other]-a[other]));}}const sorted=[...new Set(cuts)].sort((a,b)=>a-b);let run=0,start=0;for(let i=0;i<sorted.length-1;i++){const point=axis?[fixed,(sorted[i]+sorted[i+1])/2]:[(sorted[i]+sorted[i+1])/2,fixed];const free=inside(point,room.poly)&&!bodies.some(b=>inside(point,b.p));if(free){if(!run)start=sorted[i];run+=sorted[i+1]-sorted[i];}if((!free||i===sorted.length-2)&&run){if(run>=100&&run<passage&&(!narrow||run<narrow.width))narrow={width:run,at:axis?[fixed,start+run/2]:[start+run/2,fixed]};run=0;}}}}
   if(narrow)issues.push({kind:'passage',id:room.id,name:room.name,message:`候选狭窄间隙约 ${Math.round(narrow.width)} mm，低于自设 ${passage} mm 阈值`,at:narrow.at});
  }
  return targets?issues.filter(v=>targets.has(v.id)||targets.has(v.otherId)):issues;
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
  for(const f of w.furniture){if(f.catalogId!==undefined&&(typeof f.catalogId!=='string'||!f.catalogId||f.catalogId.length>200))fail('家具来源编号无效');if(f.catalogDetached!==undefined&&typeof f.catalogDetached!=='boolean')fail('家具来源状态无效');if(f.catalogSnapshot){const c=f.catalogSnapshot;if(typeof c.name!=='string'||!c.name||c.name.length>80||![c.w,c.d,c.h,c.price].every(num)||c.w<50||c.d<50||c.w>20000||c.d>20000||c.h<=0||c.h>20000||c.price<0||c.price>1e7||!['rect','round'].includes(c.shape)||typeof c.color!=='string'||!/^#[0-9a-f]{3,8}$/i.test(c.color)||['brand','model'].some(k=>typeof c[k]!=='string'||c[k].length>500))fail('家具原始规格无效');}}
  if(w.furniture.some(f=>f.referencePrice!==undefined&&(!num(f.referencePrice)||f.referencePrice<0||f.referencePrice>1e7)))fail('家具参考价无效');
  if(w.measures!==undefined&&(!Array.isArray(w.measures)||w.measures.length>2000||w.measures.some(m=>!m||[m.a,m.b].some(p=>!p||![p.x,p.y].every(num)))))fail('测量线数据无效');
  if(w.notes!==undefined){if(!Array.isArray(w.notes)||w.notes.length>2000||w.notes.some(n=>!n||typeof n.text!=='string'||!n.text.trim()||n.text.length>120||[n.x,n.y].some(v=>!(num(v)||typeof v==='string'&&v.trim()&&Number.isFinite(Number(v))))))fail('文字标注须有有效位置与 1–120 字文字，最多 2000 条');let noteId=0;w.notes=design().restoreNotes(w.notes,()=> 'note_'+ ++noteId);}
  if(w.demolished!==undefined&&(!Array.isArray(w.demolished)||w.demolished.length>10000||w.demolished.some(id=>typeof id!=='string'||!/^w(0|[1-9]\d*)$/.test(id))))fail('拆墙编号须为 w 加非负整数');
  if(w.open!==undefined){const object=v=>v&&typeof v==='object'&&!Array.isArray(v);if(!object(w.open)||Object.keys(w.open).some(k=>!['d','w'].includes(k)))fail('门窗设置格式无效');for(const [kind,values] of Object.entries(w.open)){if(!object(values)||Object.keys(values).length>10000||Object.keys(values).some(k=>!/^(0|[1-9]\d*)$/.test(k)))fail('门窗编号格式无效');if(kind==='d')for(const [id,v] of Object.entries(values)){const pair=a=>Array.isArray(a)&&a.length===2&&a.every(num),axis=a=>pair(a)&&((Math.abs(a[0])===1&&a[1]===0)||(a[0]===0&&Math.abs(a[1])===1));if(!object(v)||Object.keys(v).some(k=>!['h','c','o'].includes(k))||!pair(v.h)||!axis(v.c)||!axis(v.o)||v.c[0]*v.o[0]+v.c[1]*v.o[1]!==0)fail('门 '+id+' 的铰链或开启方向无效');}}}
  if(w.architecture)w.architecture=architecture(w.architecture);if(w.renovation)extraCosts(w.renovation,{net:0,paint:0,removed:0,added:0});
  if(w.rooms){if(typeof w.rooms!=='object'||Array.isArray(w.rooms))fail('房间设置无效');for(const r of Object.values(w.rooms)){if(!r||r.use!==undefined&&!Object.hasOwn(design().uses,r.use))fail('房间用途无效');}}
  if(w.furniture.some(f=>f.resizeAnchor!==undefined&&!Object.hasOwn(design().resizeAnchors,f.resizeAnchor)))fail('家具尺寸调整基准无效');
  for(const f of w.furniture){if(f.purchaseStatus!==undefined&&!Object.hasOwn(purchaseStates,f.purchaseStatus))fail('采购状态无效');if(f.purchaseNote!==undefined&&(typeof f.purchaseNote!=='string'||f.purchaseNote.length>500))fail('采购备注最多 500 字');for(const key of ['brand','model','sourceUrl'])if(f[key]!==undefined&&(typeof f[key]!=='string'||f[key].length>500))fail('家具品牌、型号或来源无效');if(f.sourceUrl&&!/^https?:\/\//i.test(f.sourceUrl))fail('家具来源须为 http(s) 链接');if(f.priceDate&&(typeof f.priceDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(f.priceDate)||!Number.isFinite(Date.parse(f.priceDate))||new Date(f.priceDate).toISOString().slice(0,10)!==f.priceDate))fail('价格日期无效');}
  for(const v of Object.values(w.open?.w||{})){if(typeof v==='number'){if(!num(v)||v<0||v>2.4)fail('窗台高无效');}else if(!v||!num(v.sill)||!num(v.head)||v.sill<0||v.head<=v.sill||v.head>2.8)fail('窗高度无效');}
  if(w.pricing!==undefined)pricing(w.pricing);
  if(w.designNote!==undefined&&(typeof w.designNote!=='string'||w.designNote.length>500))fail('方案备注无效');
  if(w.scene3d!==undefined){const s=w.scene3d;if(!s||typeof s!=='object'||Array.isArray(s)||!num(s.hour)||s.hour<7||s.hour>18||![1.2,2.8].includes(s.cut)||['furn','labels','night'].some(k=>typeof s[k]!=='boolean'))fail('三维展示设置无效');}
  if(w.spaceThreshold!==undefined&&(!num(w.spaceThreshold)||w.spaceThreshold<300||w.spaceThreshold>2000))fail('通道阈值须为 300–2000 mm');
  if(w.spaceIgnored!==undefined&&(!Array.isArray(w.spaceIgnored)||w.spaceIgnored.length>100||w.spaceIgnored.some(v=>typeof v!=='string'||v.length>1000000)))fail('忽略提示数据无效');
  if(w.assets!==undefined&&(!Array.isArray(w.assets)||w.assets.length>5||w.assets.some(a=>!a||typeof a.name!=='string'||a.name.length>150||typeof a.data!=='string'||a.data.length>2700000||!(/^[A-Za-z0-9+/]*={0,2}$/.test(a.data)))))fail('项目附件无效');
  return w;
 }
 function mergeCatalog(existing,input,makeId){
  const catalog=clone(existing),payload=clone(input),mapping=new Map(),reserved=new Set(catalog.map(c=>c.id));
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])):v;
  const key=c=>JSON.stringify(canonical({...c,id:undefined}));
  const byContent=new Map();for(const c of catalog)if(!byContent.has(key(c)))byContent.set(key(c),c);
  for(const c of payload.catalog){if(c.id&&mapping.has(c.id))fail('家具库编号重复');const signature=key(c);let local=byContent.get(signature);if(!local){let id;do{id=makeId();}while(reserved.has(id));reserved.add(id);local={...c,id};catalog.push(local);byContent.set(signature,local);}if(c.id)mapping.set(c.id,local);}
  if(catalog.length>500)fail('合并家具库超过 500 条，请精简当前家具库或使用空浏览器导入');
  for(const work of [payload.current,...payload.designs.map(d=>d.work)])for(const f of work.furniture){
   if(!['custom','customround'].includes(f.type))continue;
   const source=design().catalogSource(f,payload.catalog),local=source&&(mapping.get(source.id)||byContent.get(key(source)));
   if(local){f.catalogId=local.id;f.catalogSnapshot=design().catalogSnapshot(local);delete f.catalogDetached;}
   else {delete f.catalogId;if(!f.catalogSnapshot)f.catalogDetached=true;}
  }
  return {catalog,payload};
 }
 function pack(payload){return {format:'furnish-project',version:1,createdAt:new Date().toISOString(),checksum:checksum(payload),payload:clone(payload)};}
 function historyEntries(entries){const counts=new Map(),result=[];for(const entry of [...entries].sort((a,b)=>(b?.ts||0)-(a?.ts||0))){if(!entry||typeof entry.planId!=='string'||!num(entry.ts)||!entry.data||result.some(v=>v.ts===entry.ts&&v.planId===entry.planId))continue;const count=counts.get(entry.planId)||0;if(count>=8)continue;counts.set(entry.planId,count+1);result.push(entry);if(result.length===64)break;}return result;}
 function recoveryEntry(entries,planId,work,reason,now=Date.now()){
  entries=historyEntries(entries);const data=clone(work),ts=Math.max(now,...entries.map(v=>v.ts+1)),entry={ts,planId,n:data.furniture.length,reason:String(reason).slice(0,80),data};
  const result=historyEntries([entry,...entries]);while(result.length>1&&JSON.stringify(result).length>32e6)result.pop();return result;
 }
 function mergeDesigns(existing,incoming,planId){const result=clone(existing);for(const entry of incoming){if(result.some(d=>d.planId===planId&&(d.name===entry.name||d.name.startsWith(entry.name.slice(0,65)+' · 导入 '))&&JSON.stringify(d.work)===JSON.stringify(entry.work)))continue;let name=entry.name,n=1;while(result.some(d=>d.planId===planId&&d.name===name))name=entry.name.slice(0,65)+' · 导入 '+n++;if(result.filter(d=>d.planId===planId).length>=100)fail('合并后命名方案超过 100 份，请先精简已有方案');result.push({...clone(entry),name,planId});}return result;}
 function copyProject(input,id){const p=clone(input);if(!/^custom_[a-z0-9_]+$/.test(id)||!p.current.architecture)fail('只能复制自定义户型');p.planId=id;for(const w of [p.current,...p.designs.map(d=>d.work)]){w.plan=id;const a=w.architecture;if(!a)fail('方案缺少自定义户型');a.draft.id=id;if(a.baseline)a.baseline.id=id;for(const d of a.originalRevisions||[])d.id=id;}for(const d of p.designs)d.planId=id;return p;}
 function unpack(input){let data=clone(input);if(data.format==='furnish-project'){if(data.version!==1)fail('不支持的项目版本');if(checksum(data.payload)!==data.checksum)fail('项目完整性校验失败，文件可能被修改或损坏');data=data.payload;}else if(Array.isArray(data.furniture)){data={planId:data.plan,current:data,designs:[],catalog:[]};}else fail('不是 Furnish 项目文件');
  if(!data||typeof data.planId!=='string'||!Array.isArray(data.designs)||data.designs.length>100||!Array.isArray(data.catalog)||data.catalog.length>500)fail('项目结构无效');const checked=(label,work)=>{try{return validateWork(work);}catch(e){fail(label+'：'+e.message);}};data.current=checked('当前方案',data.current);data.designs=data.designs.map(d=>{if(typeof d.name!=='string'||d.name.length>80)fail('方案名称无效');return {...d,work:checked('命名方案「'+d.name+'」',d.work)};});if(data.current.architecture){const id=data.current.architecture.draft.id;if(id!==data.planId||data.designs.some(d=>d.work.architecture?.draft.id!==id))fail('方案户型不一致');}
  for(const [label,work] of [['当前方案',data.current],...data.designs.map(d=>['命名方案「'+d.name+'」',d.work])])if(work.plan!==undefined&&work.plan!==data.planId)fail(label+'：方案户型编号与项目不一致');
  const catalogIds=new Set();for(const c of data.catalog){if(c?.id!==undefined){if(typeof c.id!=='string'||!c.id||c.id.length>200||catalogIds.has(c.id))fail('家具库编号无效或重复');catalogIds.add(c.id);}if(!c||typeof c.name!=='string'||c.name.length>80||![c.w,c.d,c.h,c.price].every(num)||c.w<50||c.d<50||c.w>20000||c.d>20000||c.h<=0||c.h>20000||c.price<0)fail('家具库数据无效');validateWork({furniture:[{...c,id:'model',cx:0,cy:0,rot:0}]});}return data;
 }
 root.FurnishProject={readiness,pricing,estimate,architecture,assertStructure,protectOriginal,changes,quantities,effectivePlan,validatePlanWork,previewPlan,checkFingerprint,review,openingSchedule,purchaseStates,purchaseMoney,procurement,updatePurchaseGroup,csv,historyEntries,recoveryEntry,mergeDesigns,mergeCatalog,extraCosts,remapRooms,remapOpenings,spaceCheck,parseOBJ,pack,unpack,validateWork,copyProject,area,polygon,fitsInRooms,intersects};
 if(typeof module!=='undefined')module.exports=root.FurnishProject;
})(typeof window==='undefined'?globalThis:window);
