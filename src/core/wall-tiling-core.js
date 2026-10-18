/* Whole-wall tile layouts. All persistent dimensions are survey millimetres. */
(function(root){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),finite=n=>typeof n==='number'&&Number.isFinite(n),EPS=1e-6;
const W=()=>root.FurnishWallFinish||require('./wall-finish-core.js'),F=()=>root.FurnishFloorFinish||require('./floor-finish-core.js');
const eligible=(room,setting={})=>room.counted!==false&&['kitchen','bathroom','balcony'].includes(setting.use||room.use);
const defaults=()=>({width:600,height:300,gap:2,angle:0,offset:0,startHeight:0,reference:'floor'});
const binding=f=>({roomId:f.roomId,wallId:f.wallId,side:f.side,range:[...f.range],...(f.cross?{cross:true}:{})});
const same=(a,b)=>a.roomId===b.roomId&&W().same(a,b);
function validate(data){
 if(data===undefined)return;
 if(!data||data.version!==1||Object.keys(data).some(k=>!['version','surfaces'].includes(k))||!Array.isArray(data.surfaces)||data.surfaces.length>500)throw Error('墙砖排版数据无效');
 W().validate({version:1,surfaces:data.surfaces.map(s=>s&&({wallId:s.wallId,side:s.side,range:s.range,...(s.cross!==undefined?{cross:s.cross}:{})}))});
 for(const s of data.surfaces){
  if(!s||Object.keys(s).some(k=>!['roomId','wallId','side','range','cross','enabled','followFloor','layout'].includes(k))||typeof s.roomId!=='string'||!s.roomId||s.roomId.length>200||s.enabled!==undefined&&typeof s.enabled!=='boolean')throw Error('墙砖区域或启用状态无效');
  if(s.followFloor!==undefined&&typeof s.followFloor!=='boolean')throw Error('墙地自动对缝状态无效');
  const l=s.layout;
  if(!l||Object.keys(l).some(k=>!Object.hasOwn(defaults(),k))||!['width','height'].every(k=>finite(l[k])&&l[k]>=20&&l[k]<=6000)||!finite(l.gap)||l.gap<0||l.gap>50||![0,90].includes(l.angle)||!finite(l.offset)||Math.abs(l.offset)>1e6||!finite(l.startHeight)||Math.abs(l.startHeight)>20000||!['floor','survey'].includes(l.reference))throw Error('墙砖尺寸须为 20–6000 mm、砖缝 0–50 mm、方向 0°／90°，起铺高度须为有效毫米值');
 }
 return data;
}
function faces(plan,work){return W().faces({...plan,physicalRooms:plan.rooms.filter(r=>eligible(r,work.rooms?.[r.id]))});}
function record(work,face){return work.wallTiling?.surfaces.find(s=>same(s,face));}
function edit(work,plan,face,values){
 if(!values||Object.keys(values).some(k=>!['enabled','followFloor','layout'].includes(k)))throw Error('墙砖修改仅接受排版参数和开关');
 const current=faces(plan,work).find(f=>same(f,face));if(!current)throw Error('墙侧或区域用途已变化，请重新选择墙面');
 const next=clone(work),surfaces=next.wallTiling?.surfaces||[],index=surfaces.findIndex(s=>same(s,current));
 const s={...binding(current),...(index<0?{enabled:false,layout:defaults()}:surfaces[index]),...clone(values)};
 if(s.followFloor===false)delete s.followFloor;
 if(index<0)surfaces.push(s);else surfaces[index]=s;
 next.wallTiling={version:1,surfaces};validate(next.wallTiling);return next;
}
function setEnabled(work,plan,roomIds,enabled){
 if(!Array.isArray(roomIds)||typeof enabled!=='boolean')throw Error('墙砖区域操作无效');
 let next=work;const available=faces(plan,work);for(const id of new Set(roomIds)){
  if(!plan.rooms.some(r=>r.id===id&&eligible(r,work.rooms?.[id])))throw Error('第一阶段仅支持厨房、卫生间和阳台');
  for(const f of available.filter(f=>f.roomId===id)){if(enabled||record(next,f))next=edit(next,plan,f,{enabled});}
 }return clone(next);
}
function setHeights(work,plan,roomIds,{reference,startHeight}){
 if(!Array.isArray(roomIds)||!roomIds.length||!['floor','survey'].includes(reference)||!finite(startHeight)||Math.abs(startHeight)>20000)throw Error('请录入有效的统一起铺高度及基准');
 let next=work;for(const id of new Set(roomIds)){
  if(!plan.rooms.some(r=>r.id===id&&eligible(r,work.rooms?.[id])))throw Error('墙砖区域已变化');
  for(const f of faces(plan,work).filter(f=>f.roomId===id)){const old=record(next,f);next=edit(next,plan,f,{layout:{...(old?.layout||defaults()),reference,startHeight}});}
 }return clone(next);
}
function floorAlignment(plan,work,face,layout=record(work,face)?.layout||defaults()){
 const a=plan.floorFinish?.areas[face.roomId],l=a?.layout;
 if(!l||!finite(a.finishedZ))throw Error('请先启用本区域地砖并确定完成标高、砖尺寸和起铺点');
 const e=elevation(plan,work,face,layout,{followFloor:false}),point=[0,0];point[e.axis]=e.zero;point[e.normal]=e.position;
 if(!finite(e.position))throw Error('墙面完成面位置待核对，暂不能墙地对缝');
 const start=F().transform(l,point,true);point[e.axis]+=e.dir;const end=F().transform(l,point,true),delta=end.map((v,i)=>v-start[i]),axis=Math.abs(delta[0])>Math.abs(delta[1])?0:1;
 if(Math.abs(Math.abs(delta[axis])-1)>EPS||Math.abs(delta[1-axis])>EPS)throw Error('地砖方向与此墙不平行；请先将地砖设为沿墙的 0°／90°方向');
 const size=axis===0?l.width:l.height,pitch=size+l.gap,positive=delta[axis]>0,mod=v=>((v%pitch)+pitch)%pitch;
 // Reversed wall directions must align the tile's other edge, not its origin.
 const left=positive?-start[axis]:start[axis]-size,offset=mod(left+(layout.angle===90?size:0));
 return {...layout,[layout.angle===90?'height':'width']:size,gap:l.gap,offset:Number(offset.toFixed(6))};
}
function alignFloor(work,plan,roomIds){
 if(!Array.isArray(roomIds)||!roomIds.length)throw Error('请选择需要墙地对缝的区域');
 const available=faces(plan,work),changes=[];
 for(const id of new Set(roomIds)){
  const selected=available.filter(f=>f.roomId===id);if(!selected.length)throw Error('区域没有可对缝的墙面');
  for(const f of selected)changes.push([f,floorAlignment(plan,work,f)]);
 }
 let next=work;for(const [f,layout] of changes)next=edit(next,plan,f,{layout,followFloor:true});return clone(next);
}
function elevation(plan,work,face,layout=record(work,face)?.layout||defaults(),{followFloor=record(work,face)?.followFloor===true}={}){
 let alignmentPending;
 if(followFloor)try{layout=floorAlignment(plan,work,face,layout);}catch(e){alignmentPending='自动墙地对缝暂停：'+e.message;}
 validate({version:1,surfaces:[{...binding(face),layout}]});
 const room=plan.rooms.find(r=>r.id===face.roomId),height=room?.ceilingHeight??plan.ceilingHeight??2800,area=plan.floorFinish?.areas[face.roomId],floorZ=area?area.finishedZ:0;
 const originZ=alignmentPending?undefined:layout.reference==='survey'?layout.startHeight:finite(floorZ)?floorZ+layout.startHeight:undefined;
 const pending=alignmentPending?[alignmentPending]:[];if(!finite(floorZ))pending.push('区域完成地面标高待核对；暂以毛坯范围显示墙体');if(!finite(originZ)&&!alignmentPending)pending.push('完成地面标高未知，起铺绝对标高待定');
 const covering=(work.wallFinishes?.surfaces||[]).filter(s=>s.wallId===face.wallId&&s.side===face.side&&!!s.cross===!!face.cross&&Math.min(s.range[1],face.range[1])-Math.max(s.range[0],face.range[0])>EPS);
 let thickness=0;
 if(covering.length){const s=covering[0];if(covering.length!==1||s.range[0]>face.range[0]+EPS||s.range[1]<face.range[1]-EPS||!finite(s.tileThickness)||!finite(s.bondThickness)){thickness=undefined;pending.push('墙面厚度或覆盖范围待核对，三维排版暂不生成');}else thickness=s.tileThickness+s.bondThickness;}
 else pending.push('未设置墙面厚度，三维图案按毛坯墙面显示；排版不补写厚度');
 const position=finite(thickness)?face.position+face.side*thickness:undefined,clear=W().spatial(plan).rooms.find(r=>r.id===face.roomId),Z=root.FurnishZoneGeometry||require('./zone-geometry.js');
 let intervals=[[face.lo,face.hi]];
 if(clear&&finite(position)){
  const cuts=[...new Set([face.lo,face.hi,...(clear.rings||[clear.poly]).flat().map(p=>p[face.axis]).filter(v=>v>face.lo&&v<face.hi)])].sort((a,b)=>a-b);intervals=[];
  for(let i=1;i<cuts.length;i++){const point=[0,0];point[face.axis]=(cuts[i-1]+cuts[i])/2;point[face.normal]=position+face.side*.01;if((clear.polys||[clear.poly]).some(poly=>Z.inside(point,poly)))intervals.push([cuts[i-1],cuts[i]]);}
  if(!intervals.length)pending.push('此墙面被其它完成面遮挡或净空间已消失，请核对');
 }
 const lo=intervals.length?intervals[0][0]:face.lo,hi=intervals.length?intervals.at(-1)[1]:face.hi,dir=face.axis===0?face.side:-face.side,zero=dir===1?lo:hi,toU=v=>(v-zero)*dir,width=hi-lo;
 const sections=W().faceSections(plan,face,height).flatMap(s=>{
  if(Math.abs(s.segment[face.normal+(face.side===1?2:0)]-face.position)>EPS)return [];
  return intervals.flatMap(([a,b])=>{const lo=Math.max(a,s.segment[face.axis]),hi=Math.min(b,s.segment[face.axis+2]),bottom=Math.max(s.bottom,finite(floorZ)?floorZ:0);return hi>lo+EPS&&s.top>bottom+EPS?[[Math.min(toU(lo),toU(hi)),bottom,Math.max(toU(lo),toU(hi)),s.top]]:[];});
 });
 if(plan.wallFinish?.pending.some(v=>v.roomIds?.includes(face.roomId)))pending.push('本区域墙面厚度待核对，沿墙净尺寸暂供参考');
 return {face:binding(face),width,height,layout:clone(layout),followFloor,alignmentPending,floorZ,originZ,dir,zero,axis:face.axis,normal:face.normal,position,sections,pending};
}
let last=null;
function derive(plan,work){
 validate(work.wallTiling);if(!work.wallTiling)return plan;
 const key=JSON.stringify([plan.walls,plan.wallRefs,plan.finishWallIds,plan.rooms,plan.customDraft?.walls,plan.customDraft?.scale,plan.wins,plan.doors,plan.slides,plan.ceilingHeight,work.rooms,work.wallFinishes,work.floorFinishes,plan.floorFinish?.signature,work.wallTiling]);
 if(last?.key===key)return {...plan,wallTiling:clone(last.data)};
 const available=faces(plan,work),surfaces=[],pending=[];
 for(const [index,s] of work.wallTiling.surfaces.entries()){
  const f=available.find(f=>same(f,s));if(!f){pending.push({index,message:'墙砖原区域／墙侧范围已变化或不再支持，请重新关联或移除'});continue;}
  if(s.enabled===false)continue;const e=elevation(plan,work,f,s.layout);surfaces.push({...e,index});for(const message of e.pending)pending.push({index,message});
 }
 const data={surfaces,pending};last={key,data:clone(data)};return {...plan,wallTiling:data};
}
function grid(e){return {width:e.layout.width,height:e.layout.height,gap:e.layout.gap,angle:e.layout.angle,origin:[e.layout.offset,e.originZ]};}
function cells(e,limit=20000){if(!finite(e.originZ))return [];const polys=e.sections.map(([a,b,c,d])=>[[a,b],[c,b],[c,d],[a,d]]);if(!polys.length)return [];const Z=root.FurnishZoneGeometry||require('./zone-geometry.js'),room=Z.outline(Z.decompose(polys,p=>polys.some(poly=>Z.inside(p,poly))));return F().cells(room,grid(e),limit);}
function onlyChange(a,b){const strip=v=>{const c=clone(v);delete c.wallTiling;return JSON.stringify(c);};return strip(a)===strip(b);}
function remapBuiltin(work,before,after,shift){
 if(!work.wallTiling)return;const result=[];
 for(const s of work.wallTiling.surfaces){
  if(!s.wallId.startsWith('builtin_')){result.push(s);continue;}
  const fake={wallFinishes:{version:1,surfaces:[{wallId:s.wallId,side:s.side,range:s.range,...(s.cross?{cross:true}:{})}]}};W().remapBuiltin(fake,before,after,shift);
  const old=W().sources(before).find(v=>v.id===s.wallId),axis=old&&(s.cross?1-(old.rect[2]-old.rect[0]>=old.rect[3]-old.rect[1]?0:1):(old.rect[2]-old.rect[0]>=old.rect[3]-old.rect[1]?0:1));
  const dir=axis===0?s.side:-s.side,oldZero=old&&(old.rect[axis]+(old.rect[axis+2]-old.rect[axis])*s.range[dir===1?0:1]);
  for(const b of fake.wallFinishes.surfaces){const source=W().sources(after).find(v=>v.id===b.wallId),zero=source&&(source.rect[axis]+(source.rect[axis+2]-source.rect[axis])*b.range[dir===1?0:1]),mapped={...s,...b,layout:{...s.layout,offset:finite(oldZero)&&finite(zero)?dir*(oldZero+shift+dir*s.layout.offset-zero):s.layout.offset}};if(!b.cross)delete mapped.cross;result.push(mapped);}
 }work.wallTiling={version:1,surfaces:result};validate(work.wallTiling);
}
const requiresV7=work=>work?.wallTiling?.surfaces?.some(s=>s.followFloor===true)===true;
const api={requiresV7,eligible,defaults,binding,same,validate,faces,record,edit,setEnabled,setHeights,floorAlignment,alignFloor,elevation,derive,grid,cells,onlyChange,remapBuiltin,has:w=>!!w?.wallTiling};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWallTiling=api;
})(typeof globalThis!=='undefined'?globalThis:this);
