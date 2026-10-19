/* Wall finishes in absolute mm. Survey geometry is never edited by this module. */
(function(root){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),EPS=1e-6,finite=v=>typeof v==='number'&&Number.isFinite(v);
const zones=()=>root.FurnishZoneGeometry||(typeof require==='function'?require('./zone-geometry.js'):null);
const draft=()=>root.FurnishDraft||(typeof require==='function'?require('./floorplan-core.js'):null);
const rectPoly=r=>[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]];
const rules=Object.freeze({min:0,max:200}); // Input limits, not installation recommendations.
let lastDerivation=null;
function validate(input){
 if(input===undefined)return;
 if(!input||input.version!==1||Object.keys(input).some(k=>!['version','surfaces'].includes(k))||!Array.isArray(input.surfaces)||input.surfaces.length>500)throw Error('墙面饰面数据无效');
 const seen=[];
 for(const s of input.surfaces){
  if(!s||Object.keys(s).some(k=>!['wallId','side','range','cross','tileThickness','bondThickness'].includes(k))||s.cross!==undefined&&s.cross!==true||typeof s.wallId!=='string'||!s.wallId||s.wallId.length>200||![-1,1].includes(s.side)||!Array.isArray(s.range)||s.range.length!==2||!s.range.every(finite)||s.range[0]<0||s.range[1]>1||s.range[1]-s.range[0]<EPS)throw Error('饰面须绑定有效墙侧及沿墙范围');
  for(const k of ['tileThickness','bondThickness'])if(s[k]!==undefined&&(!finite(s[k])||s[k]<rules.min||s[k]>rules.max))throw Error('瓷砖／粘结层厚度须为 0–200 mm；未知请留空');
  if(seen.some(v=>v.wallId===s.wallId&&v.side===s.side&&!!v.cross===!!s.cross&&Math.min(v.range[1],s.range[1])-Math.max(v.range[0],s.range[0])>EPS))throw Error('同一墙侧的饰面范围不能重叠');
  seen.push(s);
 }
 return input;
}
function sources(plan){
 const d=plan.customDraft;
 if(d)return d.walls.map(w=>({id:w.id,axis:w.a[1]===w.b[1]?0:1,rect:draft().wallRect(w,d.scale,d.walls),indices:(plan.wallRefs||[]).flatMap((id,i)=>id===w.id?[i]:[])}));
 return (plan.walls||[]).map((rect,i)=>({id:plan.finishWallIds?.[i]||'builtin_'+i,rect,indices:[i]}));
}
function faces(plan){
 const out=[],Z=zones(),rooms=plan.physicalRooms||plan.rooms||[];
 for(const source of sources(plan)){
  const r=source.rect,along=source.axis??(r[2]-r[0]>=r[3]-r[1]?0:1),normal=1-along;
  // Imported drawings may split a wall at both window/door ends, leaving an
  // opening-only host with no plain wall segment. Its sill and head still exist.
  if(!source.indices.length&&![...(plan.wins||[]),...(plan.doors||[]),...(plan.slides||[])].some(o=>Math.abs(o.rect[normal]-r[normal])<EPS&&Math.abs(o.rect[normal+2]-r[normal+2])<EPS&&Math.min(o.rect[along+2],r[along+2])-Math.max(o.rect[along],r[along])>EPS))continue;
  for(const axis of [along,1-along]){
  const normal=1-axis,length=r[axis+2]-r[axis],cross=axis!==along;
  for(const side of [-1,1]){
   const position=r[normal+(side===1?2:0)];
   for(const room of rooms.filter(v=>v.counted!==false)){
    const intervals=[];
    for(const ring of room.rings||[room.poly])for(let i=0;i<ring.length;i++){
     const a=ring[i],b=ring[(i+1)%ring.length];if(Math.abs(a[normal]-position)>EPS||Math.abs(b[normal]-position)>EPS)continue;
     const lo=Math.max(r[axis],Math.min(a[axis],b[axis])),hi=Math.min(r[axis+2],Math.max(a[axis],b[axis]));if(hi-lo<=EPS)continue;
     const probe=[0,0];probe[axis]=(lo+hi)/2;probe[normal]=position+side*.01;
     if(!Z.inside(probe,room.poly))continue;intervals.push([lo,hi]);
    }
    intervals.sort((a,b)=>a[0]-b[0]);const merged=[];
    for(const span of intervals){const prev=merged.at(-1);if(prev&&span[0]<=prev[1]+EPS)prev[1]=Math.max(prev[1],span[1]);else merged.push([...span]);}
    for(const [lo,hi] of merged){const range=[(lo-r[axis])/length,(hi-r[axis])/length];out.push({wallId:source.id,side,range,...(cross?{cross:true}:{}),axis,normal,position,lo,hi,roomId:room.id,roomName:room.name,source});}
   }
  }
  }
 }
 return out;
}
const same=(a,b)=>a.wallId===b.wallId&&a.side===b.side&&!!a.cross===!!b.cross&&a.range.every((v,i)=>Math.abs(v-b.range[i])<EPS);
function edit(work,face,values){
 const next=clone(work);
 if(values!==null){
  validate({version:1,surfaces:[{wallId:face.wallId,side:face.side,range:face.range,...(face.cross?{cross:true}:{}),...values}]});
  const previous=next.wallFinishes?.surfaces.find(s=>same(s,face));
  if(previous&&previous.tileThickness===values.tileThickness&&previous.bondThickness===values.bondThickness)return next;
 }
 const surfaces=(next.wallFinishes?.surfaces||[]).flatMap(s=>{
  if(s.wallId!==face.wallId||s.side!==face.side||!!s.cross!==!!face.cross||Math.min(s.range[1],face.range[1])-Math.max(s.range[0],face.range[0])<=EPS)return [s];
  return [s.range[0]<face.range[0]-EPS?{...s,range:[s.range[0],face.range[0]]}:null,s.range[1]>face.range[1]+EPS?{...s,range:[face.range[1],s.range[1]]}:null].filter(Boolean);
 });
 if(values!==null)surfaces.push({wallId:face.wallId,side:face.side,range:[...face.range],...(face.cross?{cross:true}:{}),...values});
 if(surfaces.length)next.wallFinishes={version:1,surfaces};else delete next.wallFinishes;
 validate(next.wallFinishes);return next;
}
// Patch only named layers, preserving other saved layers at every range split.
function editFields(work,face,patch){
 if(!patch||Object.keys(patch).some(k=>!['tileThickness','bondThickness'].includes(k)))throw Error('墙面层厚字段无效');
 const records=(work.wallFinishes?.surfaces||[]).filter(s=>s.wallId===face.wallId&&s.side===face.side&&!!s.cross===!!face.cross&&s.range[1]>face.range[0]&&s.range[0]<face.range[1]),cuts=[...new Set([face.range[0],face.range[1],...records.flatMap(s=>s.range).filter(v=>v>face.range[0]&&v<face.range[1])])].sort((a,b)=>a-b);let next=work;
 for(let i=1;i<cuts.length;i++){const middle=(cuts[i-1]+cuts[i])/2,previous=records.find(s=>s.range[0]<=middle&&s.range[1]>=middle),values={};for(const k of ['tileThickness','bondThickness']){const v=Object.hasOwn(patch,k)?patch[k]:previous?.[k];if(v!==null&&v!==undefined)values[k]=v;}next=edit(next,{...face,range:[cuts[i-1],cuts[i]]},values);}
 return next;
}
function vertical(w,plan){return w[5]?.vertical||{bottom:0,top:w[4]==='low'?Math.min(1000,plan.ceilingHeight??2800):plan.ceilingHeight??2800};}
// Both thickness solids and tile elevations use these same opening heights.
function faceSections(plan,f,height=plan.rooms.find(r=>r.id===f.roomId)?.ceilingHeight??plan.ceilingHeight??2800){
 const out=[],r=f.source.rect,add=(segment,bottom,top)=>{if(top>bottom)out.push({segment,bottom,top});};
 for(const i of f.source.indices){const w=plan.walls[i];if(w)add(w,0,w[4]==='low'?Math.min(1000,height):height);}
 for(const [kind,list] of [['door',plan.doors||[]],['slide',plan.slides||[]],['window',plan.wins||[]]])for(const o of list){
  const q=o.rect;if(Math.abs(q[f.normal]-r[f.normal])>EPS||Math.abs(q[f.normal+2]-r[f.normal+2])>EPS)continue;
  if(kind==='window')add(q,0,Math.min(height,(o.sill??.9)*1000));
  const head=kind==='door'?2100:kind==='slide'?(o.v?2400:2100):(o.head??2.4)*1000;add(q,Math.min(height,head),height);
 }
 return out;
}
function derive(plan,work){
 validate(work.wallFinishes);
 if(!has(work))return plan;
 const key=JSON.stringify([plan.walls,plan.wallRefs,plan.finishWallIds,plan.rooms,plan.physicalRooms,plan.customDraft?.walls,plan.customDraft?.scale,plan.doors,plan.wins,plan.slides,plan.ceilingHeight,work.wallFinishes]);
 if(lastDerivation?.key===key)return {...plan,wallFinish:clone(lastDerivation.data)};
 const available=faces(plan),records=work.wallFinishes?.surfaces||[],solids=[],bands=[],pending=[],Z=zones();
 for(const [index,s] of records.entries()){
  const matches=available.filter(f=>f.wallId===s.wallId&&f.side===s.side&&!!f.cross===!!s.cross&&Math.min(f.range[1],s.range[1])-Math.max(f.range[0],s.range[0])>EPS);
  if(!matches.length){pending.push({index,wallId:s.wallId,message:'饰面原墙侧已变化或拆除，请重新关联／移除设置'});continue;}
  if(!matches.some(f=>same(f,s)))pending.push({index,wallId:s.wallId,roomIds:matches.map(f=>f.roomId),message:'饰面所在墙侧范围已变化；当前保留可关联部分，请重新应用整面墙设置'});
  if(s.tileThickness===undefined||s.bondThickness===undefined){pending.push({index,wallId:s.wallId,roomIds:matches.map(f=>f.roomId),message:'瓷砖或粘结层厚度未录入，完成面净尺寸待核对'});continue;}
  const thickness=s.tileThickness+s.bondThickness;if(thickness<=EPS)continue;
  for(const f of matches){
   const r=f.source.rect,length=r[f.axis+2]-r[f.axis],lo=Math.max(f.lo,r[f.axis]+length*s.range[0]),hi=Math.min(f.hi,r[f.axis]+length*s.range[1]),band=[0,0,0,0];
   band[f.axis]=lo;band[f.axis+2]=hi;band[f.normal]=Math.min(f.position,f.position+f.side*thickness);band[f.normal+2]=Math.max(f.position,f.position+f.side*thickness);
   bands.push({rect:band,roomId:f.roomId,index});
   const height=plan.rooms.find(v=>v.id===f.roomId)?.ceilingHeight??(plan.physicalRooms||plan.rooms).find(v=>v.id===f.roomId)?.ceilingHeight??plan.ceilingHeight??2800;
   const add=(segment,bottom,top)=>{
    if(Math.abs(segment[f.normal+(f.side===1?2:0)]-f.position)>EPS)return;
    const a=Math.max(lo,segment[f.axis]),b=Math.min(hi,segment[f.axis+2]);if(b-a<=EPS||top-bottom<=EPS)return;
    const rect=[...band];rect[f.axis]=a;rect[f.axis+2]=b;
    solids.push({rect,bottom,top,wallId:s.wallId,side:s.side,normal:f.normal,index,tileThickness:s.tileThickness,bondThickness:s.bondThickness});
   };
   for(const s of faceSections(plan,f,height))add(s.segment,s.bottom,s.top);
  }
 }
 const clip=rooms=>(rooms||[]).map(room=>{
  if(room.counted===false)return room;
  const xs=room.poly.map(p=>p[0]),ys=room.poly.map(p=>p[1]),box=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  const polys=bands.filter(b=>b.rect[0]<box[2]&&b.rect[2]>box[0]&&b.rect[1]<box[3]&&b.rect[3]>box[1]).map(b=>rectPoly(b.rect)),rings=room.rings||[room.poly];
  if(!polys.length)return room;
  // Clip the union once: corners do not double-subtract and functional splits remain zero-thickness.
  const pieces=Z.decompose([...rings,...polys],p=>Z.inside(p,room.poly)&&!polys.some(poly=>Z.inside(p,poly))),geometry=Z.outline(pieces);
  return {...room,...geometry,surveyPoly:room.poly};
 });
 const data={solids,bands,pending,rooms:clip(plan.rooms),physicalRooms:clip(plan.physicalRooms||plan.rooms),signature:JSON.stringify(records)};
 lastDerivation={key,data:clone(data)};
 return {...plan,wallFinish:data};
}
function spatial(plan){
 if(!plan.wallFinish||plan.finishSpatial)return plan;
 const data=plan.wallFinish;
 return {...plan,finishSpatial:true,walls:[...plan.walls,...data.solids.map(s=>[...s.rect,'finish',{vertical:{bottom:s.bottom,top:s.top},index:s.index}])],rooms:data.rooms,physicalRooms:data.physicalRooms};
}
function onlyFinishChange(before,after){if(JSON.stringify(before.wallFinishes)===JSON.stringify(after.wallFinishes))return false;const a={...before},b={...after};delete a.wallFinishes;delete b.wallFinishes;return JSON.stringify(a)===JSON.stringify(b);}
function has(work){return !!work?.wallFinishes?.surfaces?.length;}
function remapBuiltin(work,before,after,shift){
 if(!has(work))return;
 const mapped=[];
 for(const s of work.wallFinishes.surfaces){
  const source=sources(before).find(v=>v.id===s.wallId)?.rect;if(!s.wallId.startsWith('builtin_')||!source){mapped.push(s);continue;}
  const along=source[2]-source[0]>=source[3]-source[1]?0:1,axis=s.cross?1-along:along,n=1-axis,len=source[axis+2]-source[axis],lo=source[axis]+s.range[0]*len+shift,hi=source[axis]+s.range[1]*len+shift;let found=false;
  for(const v of sources(after)){
   const r=v.rect;if(Math.abs(r[n]-source[n]-shift)>EPS||Math.abs(r[n+2]-source[n+2]-shift)>EPS)continue;
   const a=Math.max(lo,r[axis]),b=Math.min(hi,r[axis+2]);if(b-a<=EPS)continue;found=true;const next={...s,wallId:v.id,range:[(a-r[axis])/(r[axis+2]-r[axis]),(b-r[axis])/(r[axis+2]-r[axis])]};delete next.cross;if(axis!==(v.axis??(r[2]-r[0]>=r[3]-r[1]?0:1)))next.cross=true;mapped.push(next);
  }
  if(!found)mapped.push(s); // A pending binding is preferable to losing user data.
 }
 work.wallFinishes={version:1,surfaces:mapped};validate(work.wallFinishes);
}
const api={rules,validate,sources,faces,same,edit,editFields,derive,spatial,vertical,faceSections,onlyFinishChange,has,remapBuiltin};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishWallFinish=api;
})(typeof globalThis!=='undefined'?globalThis:this);
