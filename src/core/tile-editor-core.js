/* Shared wall/floor editing adapter. Drafts use the existing persistent records. */
(function(root){
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v)),T=()=>root.FurnishWallTiling||require('./wall-tiling-core.js'),F=()=>root.FurnishFloorFinish||require('./floor-finish-core.js'),W=()=>root.FurnishWallFinish||require('./wall-finish-core.js'),G=()=>root.FurnishTileGrout||require('./tile-grout-core.js');
const parameters=root.FurnishTileParameters||require('./tile-parameters-core.js'),fields=Object.keys(parameters.definitions),presets=()=>root.FurnishTilePresets||require('./tile-preset-core.js');
const keys=['floorFinishes','wallTiling','wallFinishes','tileGrout','tilePresets','furnitureDatum'];
const key=t=>t.kind==='floor'?'floor:'+t.roomId:'wall:'+JSON.stringify(T().binding(t.face));
const fullFace=(work,plan,face)=>T().faces(plan,work).find(f=>T().same(f,face));
function targets(work,plan){return plan.rooms.filter(r=>r.counted!==false).map(r=>({kind:'floor',roomId:r.id,label:'地面'})).concat(T().faces(plan,work).map(face=>({kind:'wall',roomId:face.roomId,label:face.label,face:T().binding(face)}))).map(t=>({...t,key:key(t)}));}
// Logical coplanar walls keep their original persistent segment bindings.
function groups(work,plan){
 const all=targets(work,plan),faces=T().faces(plan,work),result=[];
 for(const t of all){
  if(t.kind==='floor'){result.push(t);continue;}
  const f=faces.find(f=>T().same(f,t.face)),e=T().elevation(plan,work,f);
  const compatible=g=>g.kind==='wall'&&g.roomId===t.roomId&&g.axis===f.axis&&g.side===f.side&&Math.abs(g.position-f.position)<1e-6&&((Number.isFinite(g.finish)&&Number.isFinite(e.position)&&Math.abs(g.finish-e.position)<1e-6)||g.finish===e.position);
  const matches=result.filter(g=>compatible(g)&&f.lo<=g.hi+1e-6&&f.hi>=g.lo-1e-6);
  const g=matches[0]||{...t,members:[],axis:f.axis,side:f.side,position:f.position,finish:e.position,lo:f.lo,hi:f.hi};
  if(!matches.length)result.push(g);g.members.push(t);g.lo=Math.min(g.lo,f.lo);g.hi=Math.max(g.hi,f.hi);
  for(const other of matches.slice(1)){g.members.push(...other.members);g.lo=Math.min(g.lo,other.lo);g.hi=Math.max(g.hi,other.hi);result.splice(result.indexOf(other),1);}
 }
 for(const g of result)if(g.members?.length>1){g.members.sort((a,b)=>{const ea=T().elevation(plan,work,faces.find(f=>T().same(f,a.face))),eb=T().elevation(plan,work,faces.find(f=>T().same(f,b.face)));return Number(!!eb.sections.length)-Number(!!ea.sections.length)||Number(!!a.face.cross)-Number(!!b.face.cross);});const primary=g.members[0];Object.assign(g,{key:primary.key,face:primary.face,label:primary.label});}
 const counts=new Map();return result.map(g=>{const number=(counts.get(g.roomId)||0)+1;counts.set(g.roomId,number);const target=g.members?.length>1?g:g.members?g.members[0]:g;if(target.kind==='floor'){counts.set(g.roomId,number-1);return target;}return {...target,number,label:target.label.replace(/ \d+$/,'')+' '+number+(target.members?' · 整墙':'')};});
}
const members=t=>t.members||[t];
const contains=(target,face)=>members(target).some(t=>t.face&&T().same(t.face,face));
function elevation(work,plan,target){
 const faces=T().faces(plan,work),parts=members(target).map(t=>T().elevation(plan,work,faces.find(f=>T().same(f,t.face))));
 if(parts.length===1)return parts[0];
 const first=parts[0],zero=first.dir===1?Math.min(...parts.map(e=>e.zero)):Math.max(...parts.map(e=>e.zero)),shift=e=>(e.zero-zero)*e.dir;
 const moved=e=>({...e,zero,layout:{...e.layout,offset:e.layout.offset+shift(e)},sections:e.sections.map(([x,z,X,Z])=>[x+shift(e),z,X+shift(e),Z])});
 return {...moved(first),width:Math.max(...parts.map(e=>e.width+shift(e))),sections:parts.flatMap(e=>moved(e).sections),patterns:parts.flatMap(e=>T().patterns(e).map(p=>moved({...p,zero:e.zero}))),bandJoints:parts.flatMap(e=>(e.bandJoints||[]).map(j=>({...j,sections:j.sections.map(([x,z,X,Z])=>[x+shift(e),z,X+shift(e),Z])}))),bands:parts.find(e=>e.bands)?.bands,pending:[...new Set(parts.flatMap(e=>e.pending))],grouped:true};
}
function groupValues(work,plan,target){
 if(!target.members)return [read(work,plan,target)];
 const full=elevation(work,plan,target),faces=T().faces(plan,work);
 return target.members.map(t=>{const e=T().elevation(plan,work,faces.find(f=>T().same(f,t.face))),shift=(e.zero-full.zero)*e.dir,v=read(work,plan,t);return {...v,offset:v.offset+shift,bands:v.bands?{...copy(v.bands),rows:v.bands.rows.map(r=>({...copy(r),layout:{...copy(r.layout),...(r.layout.offset!==undefined?{offset:r.layout.offset+shift}:{})}}))}:undefined};});
}
function resolve(work,plan,selected){
 if(!Array.isArray(selected)||!selected.length)throw Error('请先选择要铺砖的表面');
 const all=targets(work,plan),logical=groups(work,plan),seen=new Set();return selected.flatMap(t=>{
  const g=t.members?logical.find(g=>g.key===t.key):null;
  if(t.members&&(!g||JSON.stringify(g.members.map(m=>m.key).sort())!==JSON.stringify(t.members.map(m=>m.key).sort())))throw Error('所选整墙已变化，请重新选择');
  const full=g?elevation(work,plan,g):null;
  return members(g||t).map(part=>{const match=all.find(a=>a.key===part.key);if(!match||seen.has(part.key))throw Error('所选表面已变化或重复，请重新选择');seen.add(part.key);
   if(!full)return match;const f=fullFace(work,plan,part.face),e=T().elevation(plan,work,f);return {...match,offsetShift:(full.zero-e.zero)*e.dir};
  });
 });
}
function read(work,plan,target){
 if(target.members)return groupValues(work,plan,target)[0];
 const room=plan.rooms.find(r=>r.id===target.roomId),wall=target.kind==='wall',s=wall?T().record(work,target.face):work.floorFinishes?.areas[target.roomId],finish=wall?work.wallFinishes?.surfaces.find(f=>W().same(f,target.face)):s;
 const layout=wall?s?.followFloor&&!s.bands?T().elevation(plan,work,fullFace(work,plan,target.face)).layout:s?.layout||T().defaults():s?.layout||F().defaults(room,work.rooms?.[room.id]).layout||{width:800,height:800,gap:2,angle:0,origin:[...(room.at||room.poly[0])]};
 const c=G().color(work,target.roomId,target.kind,target.face);
 return {...copy(layout),enabled:!!s&&s.enabled!==false,grout:c||'auto',followFloor:!!s?.followFloor,material:work.rooms?.[target.roomId]?.mat||room.mat,bands:s?.bands,originX:layout.origin?.[0],originY:layout.origin?.[1],tileThickness:finish?.tileThickness,bondThickness:finish?.bondThickness,rawZ:s?.rawZ,baseThickness:s?.baseThickness,mode:s?.mode||'layers',targetZ:s?.targetZ,levelReference:wall?undefined:s?.reference,drop:s?.drop};
}
function localPatch(target,patch){
 const result=copy(patch);if(target.offsetShift!==undefined){if(Object.hasOwn(result,'offset'))result.offset+=target.offsetShift;if(result.bands)for(const row of result.bands.rows)if(row.layout.offset!==undefined)row.layout.offset+=target.offsetShift;}return result;
}
function edit(work,plan,selected,patch){
 if(!patch||typeof patch!=='object'||Array.isArray(patch)||!Object.keys(patch).length||Object.keys(patch).some(k=>!fields.includes(k)))throw Error('铺砖修改字段无效');
 const list=resolve(work,plan,selected),inputPatch=patch;let next=copy(work);
 for(const target of list){
  const patch=localPatch(target,inputPatch);
  const wall=target.kind==='wall',id=target.roomId,room=plan.rooms.find(r=>r.id===id),has=k=>Object.hasOwn(patch,k);
  const unsupported=fields.filter(k=>!parameters.definitions[k].kinds.includes(target.kind));
  if(unsupported.some(has))throw Error('此参数不适用于所选表面，请分别选择墙面或地面');
  if(has('enabled')&&typeof patch.enabled!=='boolean'||has('followFloor')&&typeof patch.followFloor!=='boolean')throw Error('启用和对缝状态无效');
  if(wall){
   const s=T().record(next,target.face),layout={...(s?.layout||T().defaults())},values={};
   if(!s&&target.offsetShift!==undefined){layout.offset+=target.offsetShift;if(['enabled','followFloor','bands','width','height','gap','angle','offset','startHeight','reference'].some(has))values.layout=layout;}
   for(const k of ['width','height','gap','angle','offset','startHeight','reference'])if(has(k)){layout[k]=patch[k];values.layout=layout;}
   for(const k of ['enabled','followFloor','bands'])if(has(k))values[k]=copy(patch[k]);
   // A surface-wide edit changes only the explicitly edited fields of each band.
   // Keep boundaries, identities and all other band-specific choices intact.
   if(s?.bands&&!has('bands')){const bandFields=['width','height','gap','angle','offset','startHeight','reference'].filter(has);if(bandFields.length||has('followFloor'))values.bands={...copy(s.bands),rows:s.bands.rows.map(row=>({...copy(row),layout:{...copy(row.layout),...Object.fromEntries(bandFields.map(k=>[k,patch[k]]))},...(has('followFloor')?{followFloor:patch.followFloor}:{})}))};}
   if(has('followFloor')&&!patch.followFloor&&!has('offset')&&s?.followFloor){const effective=T().elevation(plan,next,fullFace(next,plan,target.face));if(!effective.alignmentPending&&!s.bands){layout.offset=effective.layout.offset;values.layout=layout;}}
   if(Object.keys(values).length)next=T().edit(next,plan,target.face,values);
   if(has('tileThickness')||has('bondThickness'))next=W().editFields(next,target.face,Object.fromEntries(['tileThickness','bondThickness'].filter(has).map(k=>[k,patch[k]])));
   if(has('grout'))next=G().editFace(next,plan,target.face,patch.grout==='auto'?undefined:patch.grout);
  }else{
   if(has('material')){if(!F().tiled(patch.material))throw Error('请选择支持的瓷砖材质');next.rooms[id].mat=patch.material;}
   const areas=next.floorFinishes?.areas||{},saved=areas[id],s=saved?copy(saved):{mode:'layers',enabled:false},layout={...(s.layout||F().defaults(room,next.rooms[id]).layout)},layoutFields=['width','height','gap','angle','originX','originY'];let wrote=false;
   if(layoutFields.some(has)){
    if(!F().tiled(next.rooms[id].mat))throw Error('此地面不是瓷砖，请先选择瓷砖材质');
    if(!layout.origin)Object.assign(layout,F().defaults(room,next.rooms[id]).layout);
    for(const k of ['width','height','gap','angle'])if(has(k))layout[k]=patch[k];
    if(has('originX')||has('originY'))layout.origin=[has('originX')?patch.originX:layout.origin[0],has('originY')?patch.originY:layout.origin[1]];
    s.layout=layout;wrote=true;
   }
   if(has('enabled')){s.enabled=patch.enabled;wrote=true;if(patch.enabled&&!saved&&!s.layout&&F().tiled(next.rooms[id].mat))s.layout=F().defaults(room,next.rooms[id]).layout;}
   for(const k of ['rawZ','tileThickness','baseThickness','mode','targetZ','drop','levelReference'])if(has(k)){const name=k==='levelReference'?'reference':k;if(patch[k]===null)delete s[name];else s[name]=patch[k];wrote=true;}
   if(wrote){areas[id]=s;next.floorFinishes={version:1,areas};F().validate(next.floorFinishes);}
   if(has('grout'))next=G().edit(next,plan,id,'floor',patch.grout==='auto'?undefined:patch.grout);
  }
 }
 W().validate(next.wallFinishes);T().validate(next.wallTiling);F().validate(next.floorFinishes);G().validate(next.tileGrout);return next;
}
function signature(work){return JSON.stringify([keys.map(k=>work[k]),Object.entries(work.rooms||{}).map(([id,r])=>[id,r.mat])]);}
function onlyChange(a,b){const strip=w=>{const c=copy(w);for(const k of keys)delete c[k];for(const r of Object.values(c.rooms||{}))delete r.mat;return JSON.stringify(c);};return strip(a)===strip(b);}
const binding=(work,t)=>(work.tilePresets?.bindings||[]).find(b=>b.roomId===t.roomId&&(t.kind==='wall'?b.face&&T().same(b.face,t.face):!b.face));
function changeGroups(work,t,patch,plan){
 const previous=plan?read(work,plan,t):null,groups=parameters.patchGroups(Object.fromEntries(Object.entries(patch).filter(([k,v])=>k!=='bands'&&(!previous||JSON.stringify(previous[k]??null)!==JSON.stringify(v??null)))),t.kind);if(!Object.hasOwn(patch,'bands'))return groups;
 const before=T().record(work,t.face)?.bands,after=patch.bands,topology=b=>b?{reference:b.reference,rows:b.rows.map(r=>[r.id,r.name,r.top])}:null;
 if(JSON.stringify(topology(before))!==JSON.stringify(topology(after)))groups.push('bands');
 for(const row of after?.rows||[]){const old=before?.rows.find(r=>r.id===row.id);for(const k of new Set([...Object.keys(row.layout),...Object.keys(old?.layout||{})]))if(JSON.stringify(row.layout[k])!==JSON.stringify(old?.layout[k]))groups.push(parameters.group(k,'wall'));if(row.followFloor!==old?.followFloor)groups.push('alignment');}
 if(before&&!after)groups.push('spec','gap','origin','height','alignment');return [...new Set(groups.filter(Boolean))];
}
function editLinked(work,plan,selected,patch,policy='local'){
 if(!['local','preset','keep'].includes(policy))throw Error('请选择独立修改或更新关联预设');
 if(policy==='preset'&&selected.some(t=>t.members)&&('offset' in patch||'bands' in patch))throw Error('整墙各段使用不同局部起点；请选“仅修改此处”调整整墙起点或分带，原规格和美缝关联会保留');
 let next=edit(work,plan,selected,patch);const list=resolve(work,plan,selected);if(policy==='keep')return next;
 if(policy==='local')return presets().unsubscribe(next,list.map(t=>({...t,groups:changeGroups(work,t,localPatch(t,patch),plan)})));
 const changed=new Map();
 for(const t of list){const b=binding(work,t);if(!b)continue;const groups=changeGroups(work,t,patch,plan).filter(g=>b.groups.includes(g));if(!groups.length)continue;
  let p=changed.get(b.presetId);if(!p){p=copy(work.tilePresets.items.find(p=>p.id===b.presetId));changed.set(p.id,p);}const v=p.variants.find(v=>v.id===b.variantId),values=read(work,plan,t);
  for(const [k,value]of Object.entries(patch)){
   if(k==='bands'){if(groups.some(g=>['bands','spec','gap','origin','height','alignment'].includes(g)))v.bands=copy(value);continue;}
   if(!groups.includes(parameters.group(k,t.kind)))continue;
   if(['width','height','gap','angle','offset','startHeight','reference'].includes(k)){v.layout={...v.layout,[k]:value};if(v.bands)for(const row of v.bands.rows)row.layout[k]=value;}
   else if(k==='originX'||k==='originY'){v.layout={...v.layout,origin:[...(v.layout?.origin||[values.originX,values.originY])]};v.layout.origin[k==='originX'?0:1]=value;}
   else if(k==='grout')v.grout=value==='auto'?{mode:'auto'}:{mode:'custom',color:value};
   else if(k==='tileThickness'||k==='bondThickness'){const field=t.kind==='wall'?'finish':'elevation';v[field]={...v[field],[k]:value};}
   else if(['rawZ','baseThickness','mode','targetZ','levelReference','drop'].includes(k))v.elevation={...v.elevation,[k==='levelReference'?'reference':k]:value};
   else{v[k]=copy(value);if(k==='followFloor'&&v.bands)for(const row of v.bands.rows)row.followFloor=value;}
  }
 }
 for(const p of changed.values())next=presets().save(next,p,plan);return next;
}
function install(work,next){for(const k of keys){if(next[k]===undefined)delete work[k];else work[k]=copy(next[k]);}for(const [id,r]of Object.entries(next.rooms||{}))work.rooms[id].mat=r.mat;}
const api={groups,members,contains,elevation,groupValues,targets,resolve,read,edit,editLinked,changeGroups,binding,key,signature,install,fields,onlyChange};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishTileEditor=api;
})(typeof globalThis!=='undefined'?globalThis:this);
