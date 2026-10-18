/* Floor finishes, elevations and rectangular grids in survey mm. No state writes. */
(function(root){
'use strict';
const finite=n=>typeof n==='number'&&Number.isFinite(n),clone=v=>JSON.parse(JSON.stringify(v));
const Z=()=>root.FurnishZoneGeometry||require('./zone-geometry.js');
const tiled=mat=>['tile800','tile600','antislip','marble'].includes(mat);
function validate(data){
 if(data===undefined)return;
 if(!data||data.version!==1||Object.keys(data).some(k=>!['version','areas'].includes(k))||!data.areas||Array.isArray(data.areas)||typeof data.areas!=='object'||Object.keys(data.areas).length>500)throw Error('地面完成面数据无效');
 for(const [id,s] of Object.entries(data.areas)){
  if(!id||id.length>200||['__proto__','prototype','constructor'].includes(id)||!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).some(k=>!['enabled','rawZ','tileThickness','baseThickness','mode','targetZ','reference','drop','layout'].includes(k)))throw Error('地面区域设置无效');
  if(s.enabled!==undefined&&typeof s.enabled!=='boolean')throw Error('地面启用状态须为布尔值');
  for(const k of ['rawZ','targetZ'])if(s[k]!==undefined&&(!finite(s[k])||Math.abs(s[k])>20000))throw Error('毛坯／目标标高须为 −20000–20000 mm');
  for(const k of ['tileThickness','baseThickness','drop'])if(s[k]!==undefined&&(!finite(s[k])||s[k]<0||s[k]>1000))throw Error('地面厚度／降低量须为 0–1000 mm；未知请留空');
  if(!['layers','level','reference'].includes(s.mode))throw Error('地面标高模式无效');
  if(s.reference!==undefined&&(typeof s.reference!=='string'||!s.reference||s.reference.length>200||s.reference===id))throw Error('请选择其它区域作为标高参考');
  if(s.layout!==undefined){const l=s.layout;
   if(!l||Object.keys(l).some(k=>!['width','height','gap','angle','origin'].includes(k))||!['width','height'].every(k=>finite(l[k])&&l[k]>=20&&l[k]<=6000)||!finite(l.gap)||l.gap<0||l.gap>50||!finite(l.angle)||Math.abs(l.angle)>360||!Array.isArray(l.origin)||l.origin.length!==2||!l.origin.every(n=>finite(n)&&Math.abs(n)<=1e6))throw Error('砖尺寸须为 20–6000 mm，砖缝 0–50 mm，方向 −360–360°，起铺点须为有效原图坐标');
  }
 }
 return data;
}
function defaults(room,setting={}){
 const mat=setting.mat||room.mat,size=mat==='tile600'?600:mat==='antislip'?300:800;
 return {rawZ:0,mode:setting.use==='bathroom'?'reference':'layers',...(setting.use==='bathroom'?{drop:5}:{}),...(tiled(mat)?{layout:{width:size,height:size,gap:2,angle:0,origin:[...(room.at||room.poly[0])]}}:{})};
}
function setEnabled(work,plan,ids,enabled){
 if(typeof enabled!=='boolean'||!Array.isArray(ids))throw Error('地面启用操作无效');
 const next=clone(work),areas=next.floorFinishes?.areas||{};
 for(const id of new Set(ids)){
  const room=plan.rooms.find(r=>r.id===id&&r.counted!==false);if(!room)throw Error('地面区域已变化，请重新打开列表');
  if(enabled){areas[id]=areas[id]||defaults(room,work.rooms?.[id]);delete areas[id].enabled;}
  else if(areas[id])areas[id].enabled=false;
 }
 if(Object.keys(areas).length)next.floorFinishes={version:1,areas};validate(next.floorFinishes);return next;
}
function setLayoutBasis(work,plan,ids,basis){
 if(!Array.isArray(ids)||!ids.length||!basis||Object.keys(basis).some(k=>!['origin','angle'].includes(k))||!Array.isArray(basis.origin)||basis.origin.length!==2||!basis.origin.every(n=>finite(n)&&Math.abs(n)<=1e6)||basis.angle!==undefined&&(!finite(basis.angle)||Math.abs(basis.angle)>360))throw Error('统一起铺点须为有效原图坐标，方向须为 −360–360°');
 const next=clone(work),areas=next.floorFinishes?.areas||{};
 for(const id of new Set(ids)){
  const room=plan.rooms.find(r=>r.id===id&&r.counted!==false);
  if(!room||!tiled(work.rooms?.[id]?.mat||room.mat))throw Error('瓷砖区域已变化，请重新打开统一起铺点');
  const initial=defaults(room,work.rooms?.[id]),s=areas[id]||(areas[id]={...initial,enabled:false});
  s.layout={...(s.layout||initial.layout),origin:basis.origin.slice(),...(basis.angle!==undefined?{angle:basis.angle}:{})};
 }
 next.floorFinishes={version:1,areas};validate(next.floorFinishes);return next;
}
function setLayers(work,plan,ids,values){
 if(!Array.isArray(ids)||!ids.length||!values||Object.keys(values).some(k=>!['rawZ','tileThickness','baseThickness','bathroomBaseThickness'].includes(k))||!['rawZ','tileThickness','baseThickness'].every(k=>finite(values[k]))||values.bathroomBaseThickness!==undefined&&!finite(values.bathroomBaseThickness))throw Error('请填写毛坯标高、面层厚度和粘结找平层厚度，并选择区域');
 if(Math.abs(values.rawZ)>20000||['tileThickness','baseThickness','bathroomBaseThickness'].some(k=>values[k]!==undefined&&(values[k]<0||values[k]>1000)))throw Error('毛坯标高须为 −20000–20000 mm，厚度须为 0–1000 mm');
 const next=clone(work),areas=next.floorFinishes?.areas||{};
 for(const id of new Set(ids)){
  const room=plan.rooms.find(r=>r.id===id&&r.counted!==false);if(!room)throw Error('地面区域已变化，请重新选择');
  const old=areas[id]||defaults(room,work.rooms?.[id]),bath=(work.rooms?.[id]?.use||room.use)==='bathroom';
  const s={...old,mode:'layers',rawZ:values.rawZ,tileThickness:values.tileThickness,baseThickness:bath&&values.bathroomBaseThickness!==undefined?values.bathroomBaseThickness:values.baseThickness};
  delete s.enabled;delete s.targetZ;delete s.reference;delete s.drop;areas[id]=s;
 }
 next.floorFinishes={version:1,areas};validate(next.floorFinishes);return next;
}
function derive(plan,work){
 validate(work.floorFinishes);if(!work.floorFinishes)return plan;
 const areas=Object.create(null),pending=[],records=Object.fromEntries(Object.entries(work.floorFinishes.areas).filter(([,s])=>s.enabled!==false)),rooms=(root.FurnishWallFinish||require('./wall-finish-core.js')).spatial(plan).rooms.filter(r=>r.counted!==false);
 function resolve(id,trail=[]){
  if(areas[id])return areas[id];const s=records[id],room=rooms.find(r=>r.id===id);
  if(!s||!room)return null;
  if(trail.includes(id))return {id,pending:'地面标高参考形成循环'};
  const a={id,rawZ:s.rawZ,tileThickness:s.tileThickness,baseThickness:s.baseThickness,layout:tiled(work.rooms?.[id]?.mat||room.mat)?s.layout:undefined,room};
  let target;
  if(s.mode==='reference'){
   const ref=resolve(s.reference,[...trail,id]);target=finite(ref?.finishedZ)&&finite(s.drop)?ref.finishedZ-s.drop:undefined;
   const name=work.rooms?.[s.reference]?.name||rooms.find(r=>r.id===s.reference)?.name||s.reference;
   if(!s.reference)a.pending='请选择参考区域，并先确定该区域的完成标高';
   else if(trail.includes(s.reference))a.pending='地面标高参考形成循环；请修改参考区域';
   else if(!rooms.some(r=>r.id===s.reference))a.pending='参考区域已移除或不计入面积；请重新选择';
   else if(!records[s.reference])a.pending=`参考区域标高未确定：「${name}」未启用地面设置；请先启用并设置其完成标高`;
   else if(!finite(ref?.finishedZ))a.pending=`参考区域标高未确定：「${name}」${ref?.pending||'完成标高待确定'}；请先完成参考区域设置`;
   else if(!finite(s.drop))a.pending='请填写比参考区域低的数值；同高可填 0 mm';
  }else if(s.mode==='level')target=s.targetZ;
  if(s.mode==='layers'){if([s.rawZ,s.tileThickness,s.baseThickness].every(finite))a.finishedZ=s.rawZ+s.tileThickness+s.baseThickness;}
  else if([target,s.rawZ,s.tileThickness].every(finite)){
   const base=target-s.rawZ-s.tileThickness;a.requiredBase=base;
   if(base<0)a.pending='目标标高低于毛坯地面加砖厚，所需粘结找平层为负值';
   else if(finite(s.baseThickness)&&Math.abs(s.baseThickness-base)>1e-6)a.pending='已录入粘结找平层与目标标高冲突；请核对或留空后按目标推算';
   else {a.baseThickness=base;a.finishedZ=target;}
  }
  if(!finite(a.finishedZ))a.pending=a.pending||'毛坯标高／地面层厚度或目标标高尚未确定';
  areas[id]=a;return a;
 }
 for(const id of Object.keys(records)){
  const a=resolve(id);if(!a)pending.push({id,message:'地面原区域已变化或移除，请重新关联／移除设置'});else if(a.pending)pending.push({id,message:a.pending});
 }
 const doorways=doorwayAreas(plan,areas),steps=doorwaySteps(doorways),signature=[...Object.values(areas).map(a=>[a.id,a.rawZ,a.finishedZ,a.pending]),...doorways.map(a=>[a.id,a.roomId,a.room.polys,a.finishedZ])];
 return {...plan,floorFinish:{areas,doorways,steps,pending,signature}};
}
// A doorway belongs to each adjoining room up to the wall centre line. These
// are derived surfaces, never extra room area, quantities or saved settings.
function doorwayAreas(plan,areas){
 const z=Z(),rooms=(plan.rooms||[]).filter(r=>r.counted!==false),out=[];
 for(const [kind,list] of [['door',plan.doors||[]],['slide',plan.slides||[]]])for(const [index,d] of list.entries()){
  const r=d.rect;if(!r||r.length!==4||!r.every(finite))continue;
  const axis=d.c?.some(v=>v)?(d.c[0]?0:1):(r[2]-r[0]>=r[3]-r[1]?0:1),normal=1-axis,mid=(r[normal]+r[normal+2])/2;
  const cuts=[...new Set([r[axis],r[axis+2],...rooms.flatMap(room=>(room.rings||[room.poly]).flat().map(p=>p[axis])).filter(v=>v>=r[axis]&&v<=r[axis+2])])].sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++){
   const lo=cuts[i-1],hi=cuts[i];if(hi-lo<.001)continue;
   const sides=[-1,1].map(side=>{const p=[0,0];p[axis]=(lo+hi)/2;p[normal]=(side<0?r[normal]:r[normal+2])+side*.05;return rooms.find(room=>(room.polys||[room.poly]).some(q=>z.inside(p,q)));});
   for(let side=0;side<2;side++){
    const room=sides[side],a=room&&areas[room.id];if(!a)continue;
    const band=r.slice();band[axis]=lo;band[axis+2]=hi;
    // Exterior openings extend the sole interior finish through the whole hole.
    if(sides[1-side]){band[normal]=side?mid:r[normal];band[normal+2]=side?r[normal+2]:mid;}
    const poly=[[band[0],band[1]],[band[2],band[1]],[band[2],band[3]],[band[0],band[3]]],covered=Object.values(areas).flatMap(v=>v.room.polys||[v.room.poly]).filter(q=>Math.max(...q.map(p=>p[0]))>band[0]&&Math.min(...q.map(p=>p[0]))<band[2]&&Math.max(...q.map(p=>p[1]))>band[1]&&Math.min(...q.map(p=>p[1]))<band[3]);
    const pieces=z.decompose([poly,...covered],p=>z.inside(p,poly)&&!covered.some(q=>z.inside(p,q)));if(!pieces.length)continue;
    const shape=z.outline(pieces),seam=[[0,0],[0,0]];seam[0][axis]=lo;seam[1][axis]=hi;seam[0][normal]=seam[1][normal]=mid;
    out.push({...a,id:`${kind}-${index}-${i}-${side}`,roomId:room.id,kind,index,seam,room:{...a.room,...shape}});
   }
  }
 }
 return out;
}
function doorwaySteps(areas){
 const groups=new Map();for(const a of areas){const key=a.id.slice(0,a.id.lastIndexOf('-'));if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}
 const steps=[];for(const [part,pair] of groups){if(pair.length!==2||!pair.every(a=>finite(a.finishedZ)))continue;const low=Math.min(...pair.map(a=>a.finishedZ)),high=Math.max(...pair.map(a=>a.finishedZ));if(high-low<=1e-6)continue;
  const id=part.slice(0,part.lastIndexOf('-')),seam=pair[0].seam.map(p=>p.slice()),last=steps.at(-1);if(last?.id===id&&last.low===low&&last.high===high&&last.seam[1].every((v,i)=>Math.abs(v-seam[0][i])<1e-6))last.seam[1]=seam[1];else steps.push({id,seam,low,high,drop:high-low});
 }return steps;
}
function surfaces(plan){return [...Object.values(plan.floorFinish?.areas||{}),...(plan.floorFinish?.doorways||[])];}
function at(plan,point){
 const matches=(plan.rooms||[]).filter(r=>r.counted!==false&&(r.polys||[r.poly]).some(p=>Z().inside(point,p)));
 return [...matches.map(r=>plan.floorFinish?.areas[r.id]||{id:r.id,finishedZ:0,legacy:true,room:r}),...(plan.floorFinish?.doorways||[]).filter(a=>(a.room.polys||[a.room.poly]).some(p=>Z().inside(point,p)))];
}
function transform(layout,point,inverse=false){
 const a=layout.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),[x,y]=point;
 if(inverse){const u=x-layout.origin[0],v=y-layout.origin[1];return [c*u+s*v,-s*u+c*v];}
 return [layout.origin[0]+c*x-s*y,layout.origin[1]+s*x+c*y];
}
// The finite cell iterator is for export/verification; rendering uses the same
// analytical grid, without enumerating millions of tiny tiles.
function cells(room,layout,limit=20000){
 const points=(room.rings||[room.poly]).flat().map(p=>transform(layout,p,true)),px=layout.width+layout.gap,py=layout.height+layout.gap;
 const x0=Math.floor(Math.min(...points.map(p=>p[0]))/px),x1=Math.floor(Math.max(...points.map(p=>p[0]))/px),y0=Math.floor(Math.min(...points.map(p=>p[1]))/py),y1=Math.floor(Math.max(...points.map(p=>p[1]))/py);
 if((x1-x0+1)*(y1-y0+1)>limit)throw Error('砖块数量超过导出计算上限；请增大砖尺寸或缩小区域');
 const result=[];
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
  const poly=[[x*px,y*py],[x*px+layout.width,y*py],[x*px+layout.width,y*py+layout.height],[x*px,y*py+layout.height]].map(p=>transform(layout,p));
  const pieces=Z().decompose([...(room.rings||[room.poly]),poly],p=>Z().inside(p,room.poly)&&Z().inside(p,poly));
  if(pieces.length)result.push({x,y,polys:pieces});
 }return result;
}
// Compare every candidate with the original pointer: nearby vertices must not chain.
function snapOrigin(point,rooms,tolerance){
 let distance=tolerance,result={point:point.slice(),snapped:false};
 for(const room of rooms)for(const ring of room.rings||[room.poly])for(const corner of ring){
  const d=Math.hypot(corner[0]-point[0],corner[1]-point[1]);
  if(d<=distance&&(!result.snapped||d<distance)){distance=d;result={point:corner.slice(),snapped:true,roomId:room.id};}
 }
 return result;
}
function onlyChange(a,b){const strip=v=>{const c=clone(v);delete c.floorFinishes;return JSON.stringify(c);};return strip(a)===strip(b);}
function overlaps(a,b){
 const box=p=>[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))],x=box(a),y=box(b);
 if(x[2]<=y[0]||y[2]<=x[0]||x[3]<=y[1]||y[3]<=x[1])return false;
 return Z().area(Z().decompose([a,b],p=>Z().inside(p,a)&&Z().inside(p,b)))>1e-4;
}
function checks(plan,furniture){
 const data=plan.floorFinish;if(!data)return [];const issues=data.pending.map(p=>({kind:'floorfinish',id:'floor-'+p.id,roomId:p.id,name:'地面完成面',pending:true,message:p.message}));
 const G=root.FurnishGeometry||require('./layout-geometry.js'),D=root.FurnishDesign||require('./design-core.js');
 for(const a of Object.values(data.areas))if(finite(a.finishedZ)&&a.finishedZ>=(a.room.ceilingHeight??plan.ceilingHeight??2800))issues.push({kind:'floorheight',id:'floor-'+a.id,roomId:a.id,name:a.room.name,message:'完成地面达到或超过天花标高，请核对毛坯基准与层厚'});
 for(const f of furniture){
  const touched=surfaces(plan).filter(a=>G.footprints(f).some(p=>(a.room.polys||[a.room.poly]).some(q=>overlaps(p,q)))),areas=[...new Map(touched.map(a=>[a.roomId||a.id,a])).values()],known=areas.filter(a=>finite(a.finishedZ)),v=D.furnitureVerticalBounds(f);
  if(!areas.length)continue;
  if(!v||areas.some(a=>!finite(a.finishedZ)))issues.push({kind:'floorheight',id:f.id,name:f.name,pending:true,message:'家具或所跨区域高度未知，地面净高待核对'});
  else for(const a of known)if(v.bottom<a.finishedZ-1e-6)issues.push({kind:'floorheight',id:f.id,roomId:a.roomId||a.id,name:f.name,message:`家具底部低于 ${a.room.name} 完成地面 ${Number((a.finishedZ-v.bottom).toFixed(2))} mm；原高度保持，请人工核对安装`});
  const levels=[...known.map(a=>a.finishedZ),...(plan.rooms||[]).filter(r=>r.counted!==false&&G.footprints(f).some(p=>overlaps(p,r.poly))).map(r=>data.areas[r.id]?.finishedZ??(data.areas[r.id]?undefined:0))].filter(finite);
  if(levels.length&&Math.max(...levels)-Math.min(...levels)>1e-6&&v?.bottom<=Math.max(...levels)+5)issues.push({kind:'floorlevel',id:f.id,name:f.name,message:'家具支承范围跨越不同地面标高，请核对支脚与安装'});
 }
 for(const [i,d] of (plan.doors||[]).entries()){
  const r=d.rect,near=[[(r[0]+r[2])/2,r[1]-1],[(r[0]+r[2])/2,r[3]+1],[r[0]-1,(r[1]+r[3])/2],[r[2]+1,(r[1]+r[3])/2]].flatMap(p=>at(plan,p));
  if(near.some(a=>!a.legacy))issues.push({kind:'floor-door',id:'floor-door-'+i,doorIndex:i,name:d.name||'门',pending:true,message:'地面标高已设置；门扇底部与门槛实际标高未录入，请核对门底净空及高差'});
 }
 return issues;
}
const api={validate,defaults,setEnabled,setLayoutBasis,setLayers,derive,doorwayAreas,surfaces,at,transform,cells,snapOrigin,checks,onlyChange,tiled,has:w=>!!w?.floorFinishes};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFloorFinish=api;
})(typeof globalThis!=='undefined'?globalThis:this);
