/* Whole-wall tile layouts. All persistent dimensions are survey millimetres. */
(function(root){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),finite=n=>typeof n==='number'&&Number.isFinite(n),EPS=1e-6;
const W=()=>root.FurnishWallFinish||require('./wall-finish-core.js'),F=()=>root.FurnishFloorFinish||require('./floor-finish-core.js');
const eligible=(room,setting={})=>room.counted!==false&&['kitchen','bathroom','balcony'].includes(setting.use||room.use);
const defaults=()=>({width:800,height:400,gap:2,angle:0,offset:0,startHeight:0,reference:'floor'});
const binding=f=>({roomId:f.roomId,wallId:f.wallId,side:f.side,range:[...f.range],...(f.cross?{cross:true}:{})});
const same=(a,b)=>a.roomId===b.roomId&&W().same(a,b);
function validateLayout(l,partial=false){
 if(!l||typeof l!=='object'||Array.isArray(l)||Object.keys(l).some(k=>!Object.hasOwn(defaults(),k)))throw Error('墙砖排版字段无效');
 const value=partial?{...defaults(),...l}:l;
 if(!['width','height'].every(k=>finite(value[k])&&value[k]>=20&&value[k]<=6000)||!finite(value.gap)||value.gap<0||value.gap>50||![0,90].includes(value.angle)||!finite(value.offset)||Math.abs(value.offset)>1e6||!finite(value.startHeight)||Math.abs(value.startHeight)>20000||!['floor','survey'].includes(value.reference))throw Error('墙砖尺寸须为20–6000 mm、砖缝0–50 mm、方向0°／90°，起铺参数须为有效毫米值');
}
function validateBands(b){
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['reference','rows'].includes(k))||!['floor','survey'].includes(b.reference)||!Array.isArray(b.rows)||b.rows.length<2||b.rows.length>20)throw Error('上下分带须包含2–20带，并选择高度基准');
 let previous=b.reference==='floor'?0:-20001;const seen=new Set();
 for(const [i,r]of b.rows.entries()){
  if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!['id','name','top','layout','followFloor'].includes(k))||typeof r.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(r.id)||seen.has(r.id)||['__proto__','constructor','prototype'].includes(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||r.followFloor!==undefined&&typeof r.followFloor!=='boolean')throw Error('分带名称、编号或对缝设置无效');
  seen.add(r.id);if(i===b.rows.length-1?r.top!==null:!finite(r.top)||Math.abs(r.top)>20000||r.top<=previous)throw Error('分界高度须从下至上严格递增；最后一带上沿必须为墙顶');previous=r.top;validateLayout(r.layout,true);
 }
 return b;
}
function validate(data){
 if(data===undefined)return;
 if(!data||data.version!==1||Object.keys(data).some(k=>!['version','surfaces'].includes(k))||!Array.isArray(data.surfaces)||data.surfaces.length>500)throw Error('墙砖排版数据无效');
 W().validate({version:1,surfaces:data.surfaces.map(s=>s&&({wallId:s.wallId,side:s.side,range:s.range,...(s.cross!==undefined?{cross:s.cross}:{})}))});
 for(const s of data.surfaces){
  if(!s||Object.keys(s).some(k=>!['roomId','wallId','side','range','cross','enabled','followFloor','layout','bands'].includes(k))||typeof s.roomId!=='string'||!s.roomId||s.roomId.length>200||s.enabled!==undefined&&typeof s.enabled!=='boolean')throw Error('墙砖区域或启用状态无效');
  if(s.followFloor!==undefined&&typeof s.followFloor!=='boolean')throw Error('墙地自动对缝状态无效');
  validateLayout(s.layout);if(s.bands!==undefined)validateBands(s.bands);
 }
 return data;
}
const faceTitle=f=>`${f.cross?'墙端面 · ':''}${f.axis===0?(f.side===1?'上边墙':'下边墙'):(f.side===1?'左边墙':'右边墙')}`;
function faces(plan,work){const counts=new Map();return W().faces({...plan,physicalRooms:plan.rooms.filter(r=>eligible(r,work.rooms?.[r.id]))}).map(f=>{const number=(counts.get(f.roomId)||0)+1;counts.set(f.roomId,number);return {...f,number,label:faceTitle(f)+' '+number};});}
function record(work,face){return work.wallTiling?.surfaces.find(s=>same(s,face));}
function edit(work,plan,face,values){
 if(!values||Object.keys(values).some(k=>!['enabled','followFloor','layout','bands'].includes(k)))throw Error('墙砖修改仅接受排版参数、分带和开关');
 const current=faces(plan,work).find(f=>same(f,face));if(!current)throw Error('墙侧或区域用途已变化，请重新选择墙面');
 const next=clone(work),surfaces=next.wallTiling?.surfaces||[],index=surfaces.findIndex(s=>same(s,current));
 const s={...binding(current),...(index<0?{enabled:false,layout:defaults()}:surfaces[index]),...clone(values)};
 if(s.followFloor===false)delete s.followFloor;
 if(s.bands===null)delete s.bands;
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
function setSize(work,plan,roomIds,{width,height}){
 if(!Array.isArray(roomIds)||!roomIds.length||![width,height].every(v=>finite(v)&&v>=20&&v<=6000))throw Error('请选择区域并填写 20–6000 mm 的墙砖宽度和高度');
 let next=work;for(const id of new Set(roomIds)){
  if(!plan.rooms.some(r=>r.id===id&&eligible(r,work.rooms?.[id])))throw Error('墙砖区域已变化');
  for(const f of faces(plan,work).filter(f=>f.roomId===id)){const old=record(next,f);next=edit(next,plan,f,{layout:{...(old?.layout||defaults()),width,height,angle:0}});}
 }return clone(next);
}
function floorAlignmentInfo(plan,work,face,layout){
 const a=plan.floorFinish?.areas[face.roomId],l=a?.layout;
 if(!l||!finite(a.finishedZ))throw Error('请先启用本区域地砖并确定完成标高、砖尺寸和起铺点');
 const e=elevation(plan,work,face,layout,{followFloor:false,bands:null}),point=[0,0];point[e.axis]=e.zero;point[e.normal]=e.position;
 if(!finite(e.position))throw Error('墙面完成面位置待核对，暂不能墙地对缝');
 const start=F().transform(l,point,true);point[e.axis]+=e.dir;const end=F().transform(l,point,true),delta=end.map((v,i)=>v-start[i]),axis=Math.abs(delta[0])>Math.abs(delta[1])?0:1;
 if(Math.abs(Math.abs(delta[axis])-1)>EPS||Math.abs(delta[1-axis])>EPS)throw Error('地砖方向与此墙不平行；请先将地砖设为沿墙的 0°／90°方向');
 const size=axis===0?l.width:l.height,pitch=size+l.gap,positive=delta[axis]>0,mod=(v,p)=>((v%p)+p)%p,wallSize=layout.angle===90?layout.height:layout.width,wallPitch=wallSize+layout.gap;
 // Reversed wall directions must align the tile's other edge, not its origin.
 const left=positive?-start[axis]:start[axis]-size,anchor=mod(left,pitch),offset=mod(anchor+(layout.angle===90?wallSize:0),wallPitch);
 // Alignment changes phase only. Purchased wall tiles must never inherit floor dimensions.
 const note=Math.abs(wallSize-size)>EPS||Math.abs(layout.gap-l.gap)>EPS?'墙地砖节距或缝宽不同：保留墙砖规格，仅对齐起铺缝，后续砖缝不能连续对齐':'';
 return {layout:{...layout,offset:Number(offset.toFixed(6))},note};
}
function floorAlignment(plan,work,face,layout=record(work,face)?.layout||defaults()){
 return floorAlignmentInfo(plan,work,face,layout).layout;
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
function elevation(plan,work,face,layout=record(work,face)?.layout||defaults(),{followFloor=record(work,face)?.followFloor===true,bands=record(work,face)?.bands}={}){
 const initialLayout=clone(layout);
 let alignmentPending,alignmentNote;
 if(followFloor&&!bands)try{const info=floorAlignmentInfo(plan,work,face,layout);layout=info.layout;alignmentNote=info.note;}catch(e){alignmentPending='自动墙地对缝暂停：'+e.message;}
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
 let sections=W().faceSections(plan,face,height).flatMap(s=>{
  if(Math.abs(s.segment[face.normal+(face.side===1?2:0)]-face.position)>EPS)return [];
  return intervals.flatMap(([a,b])=>{const lo=Math.max(a,s.segment[face.axis]),hi=Math.min(b,s.segment[face.axis+2]),bottom=Math.max(s.bottom,finite(floorZ)?floorZ:0);return hi>lo+EPS&&s.top>bottom+EPS?[[Math.min(toU(lo),toU(hi)),bottom,Math.max(toU(lo),toU(hi)),s.top]]:[];});
 });
 // Preserve the saved local origin while extending the visible tile to mitered corners.
 const finished=W().tileSections(plan,face);
 if(finite(position)&&finished.length)sections=finished.flatMap(s=>{
  const a=s.segment[face.axis],b=s.segment[face.axis+2],bottom=Math.max(s.bottom,finite(floorZ)?floorZ:0),top=Math.min(s.top,height);if(top<=bottom)return [];
  const cuts=[...new Set([a,b,...(clear?.rings||[clear?.poly||[]]).flat().map(p=>p[face.axis]).filter(v=>v>a&&v<b)])].sort((x,y)=>x-y),out=[];
  for(let i=1;i<cuts.length;i++){const point=[0,0];point[face.axis]=(cuts[i-1]+cuts[i])/2;point[face.normal]=position+face.side*.01;if(!clear||(clear.polys||[clear.poly]).some(poly=>Z.inside(point,poly)))out.push([Math.min(toU(cuts[i-1]),toU(cuts[i])),bottom,Math.max(toU(cuts[i-1]),toU(cuts[i])),top]);}return out;
 });
 if(plan.wallFinish?.pending.some(v=>v.roomIds?.includes(face.roomId)))pending.push('本区域墙面厚度待核对，沿墙净尺寸暂供参考');
 const result={face:binding(face),width,height,layout:clone(layout),followFloor,alignmentPending,alignmentNote,floorZ,originZ,dir,zero,axis:face.axis,normal:face.normal,position,sections,pending};
 if(bands){
  validateBands(bands);const base=bands.reference==='floor'?floorZ:0,clip=(lo,hi)=>sections.map(([x,z,X,Z])=>[x,Math.max(z,lo),X,Math.min(Z,hi)]).filter(r=>r[3]>r[1]+EPS),rows=[];
  let bottom=floorZ;
  for(const r of bands.rows){const top=r.top===null?height:finite(base)?base+r.top:undefined,l={...initialLayout,...r.layout},linked=r.followFloor??followFloor;let alignmentPending,alignmentNote;
   if(linked)try{const info=floorAlignmentInfo(plan,work,face,l);Object.assign(l,info.layout);alignmentNote=info.note;}catch(e){alignmentPending='自动墙地对缝暂停：'+e.message;}
   const z=alignmentPending?undefined:l.reference==='survey'?l.startHeight:finite(floorZ)?floorZ+l.startHeight:undefined;
   rows.push({...result,layout:l,followFloor:linked,originZ:z,alignmentPending,alignmentNote,sections:finite(bottom)&&finite(top)?clip(bottom,top):[],pending:[...pending,...(alignmentPending?[alignmentPending]:[])],band:{id:r.id,name:r.name,bottom,top,reference:bands.reference}});bottom=top;
  }
  const joints=[];
  for(let i=1;i<rows.length;i++){const z=rows[i].band.bottom,gap=Math.max(rows[i-1].layout.gap,rows[i].layout.gap);if(finite(z)&&z>floorZ&&z<height&&gap>0){const lo=Math.max(floorZ,z-gap/2),hi=Math.min(height,z+gap/2);joints.push({z,gap,sections:clip(lo,hi)});rows[i-1].sections=rows[i-1].sections.map(([x,b,X,t])=>[x,b,X,Math.min(t,lo)]).filter(r=>r[3]>r[1]+EPS);rows[i].sections=rows[i].sections.map(([x,b,X,t])=>[x,Math.max(b,hi),X,t]).filter(r=>r[3]>r[1]+EPS);}}
  result.bands=clone(bands);result.patterns=rows;result.bandJoints=joints;
  for(const r of rows){if(r.alignmentPending)pending.push(`${r.band.name}：${r.alignmentPending}`);if(finite(r.band.top)&&r.band.top<=floorZ)pending.push(`${r.band.name}分界不高于完成地面，该带无有效墙面`);}
 }
 return result;
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
const patterns=e=>e.patterns||[e];
function cells(e,limit=20000){if(e.patterns){const all=[];for(const p of e.patterns)all.push(...cells(p,limit-all.length).map(c=>({...c,band:p.band.id})));return all;}if(!finite(e.originZ))return [];const polys=e.sections.map(([a,b,c,d])=>[[a,b],[c,b],[c,d],[a,d]]);if(!polys.length)return [];const Z=root.FurnishZoneGeometry||require('./zone-geometry.js'),room=Z.outline(Z.decompose(polys,p=>polys.some(poly=>Z.inside(p,poly))));return F().cells(room,grid(e),limit);}
function onlyChange(a,b){const strip=v=>{const c=clone(v);delete c.wallTiling;return JSON.stringify(c);};return strip(a)===strip(b);}
function remapBuiltin(work,before,after,shift){
 if(!work.wallTiling)return;const result=[];
 for(const s of work.wallTiling.surfaces){
  if(!s.wallId.startsWith('builtin_')){result.push(s);continue;}
  const fake={wallFinishes:{version:1,surfaces:[{wallId:s.wallId,side:s.side,range:s.range,...(s.cross?{cross:true}:{})}]}};W().remapBuiltin(fake,before,after,shift);
  const old=W().sources(before).find(v=>v.id===s.wallId),axis=old&&(s.cross?1-(old.rect[2]-old.rect[0]>=old.rect[3]-old.rect[1]?0:1):(old.rect[2]-old.rect[0]>=old.rect[3]-old.rect[1]?0:1));
  const dir=axis===0?s.side:-s.side,oldZero=old&&(old.rect[axis]+(old.rect[axis+2]-old.rect[axis])*s.range[dir===1?0:1]);
  for(const b of fake.wallFinishes.surfaces){const source=W().sources(after).find(v=>v.id===b.wallId),zero=source&&(source.rect[axis]+(source.rect[axis+2]-source.rect[axis])*b.range[dir===1?0:1]),mapped={...s,...b,layout:{...s.layout,offset:finite(oldZero)&&finite(zero)?dir*(oldZero+shift+dir*s.layout.offset-zero):s.layout.offset}};if(s.bands){mapped.bands=clone(s.bands);for(const row of mapped.bands.rows)if(Object.hasOwn(row.layout,'offset'))row.layout.offset+=mapped.layout.offset-s.layout.offset;}if(!b.cross)delete mapped.cross;result.push(mapped);}
 }work.wallTiling={version:1,surfaces:result};validate(work.wallTiling);
}
const requiresV7=work=>work?.wallTiling?.surfaces?.some(s=>s.followFloor===true)===true;
const api={requiresV7,faceTitle,eligible,defaults,binding,same,validate,validateLayout,validateBands,patterns,faces,record,edit,setEnabled,setHeights,setSize,floorAlignment,alignFloor,elevation,derive,grid,cells,onlyChange,remapBuiltin,has:w=>!!w?.wallTiling};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWallTiling=api;
})(typeof globalThis!=='undefined'?globalThis:this);
