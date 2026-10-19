/* Saved tile recipes copy explicit fields into the existing finish records. */
(function(root){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),object=v=>v&&typeof v==='object'&&!Array.isArray(v),num=v=>typeof v==='number'&&Number.isFinite(v),id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v),text=v=>typeof v==='string'&&v.trim()&&v.length<=80,keys=(v,allowed)=>object(v)&&Object.keys(v).every(k=>allowed.includes(k));
const T=()=>root.FurnishWallTiling||require('./wall-tiling-core.js'),F=()=>root.FurnishFloorFinish||require('./floor-finish-core.js'),W=()=>root.FurnishWallFinish||require('./wall-finish-core.js'),G=()=>root.FurnishTileGrout||require('./tile-grout-core.js');
const parameters=root.FurnishTileParameters||require('./tile-parameters-core.js'),groups=parameters.groups;
function variant(v,kind){
 if(!keys(v,['id','name','layout','grout','material','enabled','followFloor','finish','elevation','bands'])||!id(v.id)||!text(v.name))throw Error('预设分项名称或编号无效');
 if(v.bands!==undefined){if(kind!=='wall')throw Error('上下分带仅适用于墙砖');if(v.bands!==null)T().validateBands(v.bands);}
 if(v.layout!==undefined){const l=v.layout,allowed=kind==='wall'?['width','height','gap','angle','offset','startHeight','reference']:['width','height','gap','angle','origin'];if(!keys(l,allowed))throw Error('预设铺贴字段无效');for(const k of Object.keys(l)){const n=l[k];if(['width','height'].includes(k)&&(!num(n)||n<20||n>6000)||k==='gap'&&(!num(n)||n<0||n>50)||k==='angle'&&(!num(n)||(kind==='wall'?![0,90].includes(n):Math.abs(n)>360))||k==='offset'&&(!num(n)||Math.abs(n)>1e6)||k==='startHeight'&&(!num(n)||Math.abs(n)>20000)||k==='reference'&&!['floor','survey'].includes(n)||k==='origin'&&(!Array.isArray(n)||n.length!==2||!n.every(x=>num(x)&&Math.abs(x)<=1e6)))throw Error('预设尺寸、缝宽、方向或起铺参数无效');}}
 if(v.grout!==undefined&&(!keys(v.grout,['mode','color'])||!['auto','custom'].includes(v.grout.mode)||v.grout.mode==='custom'&&!/^#[0-9a-f]{6}$/i.test(v.grout.color)||v.grout.mode==='auto'&&v.grout.color!==undefined))throw Error('预设美缝颜色无效');
 if(v.material!==undefined&&(kind!=='floor'||!F().tiled(v.material)))throw Error('预设须选择有效瓷砖材质');
 if(v.enabled!==undefined&&typeof v.enabled!=='boolean'||v.followFloor!==undefined&&(kind!=='wall'||typeof v.followFloor!=='boolean'))throw Error('预设铺贴开关无效');
 if(v.finish!==undefined){if(kind!=='wall'||!keys(v.finish,['tileThickness','bondThickness']))throw Error('墙面层厚预设无效');for(const n of Object.values(v.finish))if(n!==null&&(!num(n)||n<0||n>200))throw Error('墙面层厚须为0–200 mm，未知可留空');}
 if(v.elevation!==undefined){const e=v.elevation;if(kind!=='floor'||!keys(e,['rawZ','tileThickness','baseThickness','mode','targetZ','reference','drop']))throw Error('地面标高预设无效');for(const [k,n]of Object.entries(e)){if(n===null)continue;if(['rawZ','targetZ'].includes(k)&&(!num(n)||Math.abs(n)>20000)||['tileThickness','baseThickness','drop'].includes(k)&&(!num(n)||n<0||n>1000)||k==='mode'&&!['layers','level','reference'].includes(n)||k==='reference'&&(typeof n!=='string'||!n||n.length>200))throw Error('地面标高、参考区域或层厚无效');}}
 return v;
}
function validate(data){
 if(data===undefined)return;if(!keys(data,['version','items','bindings'])||![1,2].includes(data.version)||!Array.isArray(data.items)||data.items.length>200||data.version===1&&data.bindings!==undefined||data.version===2&&(!Array.isArray(data.bindings)||data.bindings.length>2000))throw Error('铺贴预设库无效');const seen=new Set();
 for(const p of data.items){if(!keys(p,['id','name','kind','variants','source'])||!id(p.id)||seen.has(p.id)||!text(p.name)||!['wall','floor'].includes(p.kind)||!Array.isArray(p.variants)||!p.variants.length||p.variants.length>100)throw Error('铺贴预设名称、类型或分项无效');seen.add(p.id);const vs=new Set();for(const v of p.variants){variant(v,p.kind);if(vs.has(v.id))throw Error('预设分项编号重复');vs.add(v.id);}if(p.source!==undefined){const s=p.source;if(!keys(s,['roomId','assignments','signature'])||typeof s.roomId!=='string'||!s.roomId||s.roomId.length>200||s.signature!==undefined&&(typeof s.signature!=='string'||s.signature.length>100000)||!Array.isArray(s.assignments)||s.assignments.length>500||new Set(s.assignments.map(a=>a.number)).size!==s.assignments.length||s.assignments.some(a=>!keys(a,['number','variantId'])||!Number.isInteger(a.number)||a.number<1||a.number>500||!vs.has(a.variantId)))throw Error('预设混排编号建议无效');}}
 const bound=[];for(const b of data.bindings||[]){const p=data.items.find(p=>p.id===b.presetId);if(!keys(b,['presetId','variantId','roomId','face','groups'])||!p||!p.variants.some(v=>v.id===b.variantId)||typeof b.roomId!=='string'||!b.roomId||b.roomId.length>200||!Array.isArray(b.groups)||!b.groups.length||new Set(b.groups).size!==b.groups.length||b.groups.some(g=>!groups.includes(g)))throw Error('铺贴预设关联无效');if(p.kind==='wall'){if(!keys(b.face,['roomId','wallId','side','range','cross'])||b.face.roomId!==b.roomId)throw Error('预设须关联有效墙面');const {roomId,...face}=b.face;W().validate({version:1,surfaces:[face]});}else if(b.face!==undefined)throw Error('地面预设关联不能包含墙面');if(bound.some(a=>sameTarget(a,b)))throw Error('同一表面不能重复关联预设');bound.push(b);}
 return data;
}
const sameTarget=(a,b)=>a.roomId===b.roomId&&(!a.face&&!b.face||a.face&&b.face&&T().same(a.face,b.face));
function library(work,items,bindings=[]){if(!items.length)delete work.tilePresets;else work.tilePresets=bindings.length?{version:2,items,bindings}:{version:1,items};validate(work.tilePresets);return work;}
function detach(work,presetId,targets){validate(work.tilePresets);const next=clone(work);return library(next,next.tilePresets?.items||[],(next.tilePresets?.bindings||[]).filter(b=>b.presetId!==presetId||targets&&!targets.some(t=>sameTarget(t,b))));}
function unsubscribe(work,targets){
 validate(work.tilePresets);const next=clone(work);let changed=false;
 const bindings=(next.tilePresets?.bindings||[]).flatMap(b=>{const selected=targets.find(t=>sameTarget(t,b));if(!selected)return [b];const remaining=b.groups.filter(g=>!selected.groups.includes(g));if(remaining.length===b.groups.length)return [b];changed=true;return remaining.length?[{...b,groups:remaining}]:[];});
 return changed?library(next,next.tilePresets.items,bindings):next;
}
function save(work,preset,plan){
 validate(work.tilePresets);validate({version:1,items:[preset]});let next=clone(work);const linked=(next.tilePresets?.bindings||[]).filter(b=>b.presetId===preset.id);if(linked.length&&!plan)throw Error('更新关联预设需要当前户型');const old=next.tilePresets?.items.find(p=>p.id===preset.id);if(old&&old.kind!==preset.kind)throw Error('不能改变预设的墙砖／地砖类型');
 const items=next.tilePresets?.items||[],i=items.findIndex(p=>p.id===preset.id);if(i<0)items.push(clone(preset));else items[i]=clone(preset);
 const faces=linked.length?T().faces(plan,next):[],valid=b=>preset.variants.some(v=>v.id===b.variantId)&&plan.rooms.some(r=>r.id===b.roomId&&r.counted!==false)&&(preset.kind!=='wall'||faces.some(f=>sameTarget({roomId:f.roomId,face:f},b)));
 library(next,items,(next.tilePresets?.bindings||[]).filter(b=>b.presetId!==preset.id||valid(b)));
 for(const b of linked.filter(valid))next=apply(next,plan,preset,[b],b.groups,{sync:true}).work;
 return next;
}
function remove(work,presetId){const next=detach(work,presetId);return library(next,(next.tilePresets?.items||[]).filter(p=>p.id!==presetId),next.tilePresets?.bindings||[]);}
function remapBuiltin(work,before,after,shift){
 if(!work.tilePresets)return;const bindings=[];
 for(const b of work.tilePresets.bindings||[]){if(!b.face?.wallId.startsWith('builtin_')){bindings.push(b);continue;}const {roomId,...face}=b.face,fake={wallFinishes:{version:1,surfaces:[face]}};W().remapBuiltin(fake,before,after,shift);for(const mapped of fake.wallFinishes.surfaces)bindings.push({...b,face:{roomId,...mapped}});}
 for(const p of work.tilePresets.items)if(p.kind==='floor')for(const v of p.variants)if(v.layout?.origin)v.layout.origin=v.layout.origin.map(n=>n+shift);
 library(work,work.tilePresets.items,bindings);
}
function templates(){const wall=(id,name,width,height)=>({id,name,layout:{width,height,gap:2,angle:0},enabled:true,grout:{mode:'auto'}});return [
 {id:'builtin_kitchen',name:'厨房竖铺',kind:'wall',variants:[wall('main','400宽×800高',400,800)]},
 {id:'builtin_bath',name:'卫生间横铺',kind:'wall',variants:[wall('main','800宽×400高',800,400)]},
 {id:'builtin_balcony',name:'阳台三种规格混排',kind:'wall',variants:[wall('square','主窗800方砖',800,800),wall('narrow','窄墙400×800',400,800),wall('laundry','柜后800×400',800,400)]},
 {id:'builtin_balcony_bands',name:'同墙上下分带 · 可编辑示例',kind:'wall',variants:[{...wall('main','上下方砖／中带长砖',800,800),bands:{reference:'floor',rows:[{id:'lower',name:'下带',top:800,layout:{width:800,height:800,angle:0}},{id:'middle',name:'中带',top:1600,layout:{width:400,height:800,angle:0}},{id:'upper',name:'上带',top:null,layout:{width:800,height:800,angle:0}}]}}]},
 {id:'builtin_floor',name:'800方砖地面',kind:'floor',variants:[{id:'main',name:'800方砖',layout:{width:800,height:800,gap:2,angle:0},material:'tile800',enabled:true,grout:{mode:'auto'}}]},
 {id:'builtin_bath_floor',name:'卫生间800×400地砖',kind:'floor',variants:[{id:'main',name:'800×400',layout:{width:800,height:400,gap:2,angle:0},material:'tile800',enabled:true,grout:{mode:'auto'}}]}
 ];}
function capture(work,plan,roomId,kind,presetId,name){
 const room=plan.rooms.find(r=>r.id===roomId&&r.counted!==false);if(!room)throw Error('请选择有效房间');const p={id:presetId,name,kind,variants:[]},assignment=[];
 if(kind==='wall'){
  const available=T().faces(plan,work).filter(f=>f.roomId===roomId);if(!available.length)throw Error('此房间没有可保存的墙砖面');
  for(const f of available){const s=T().record(work,f),finish=work.wallFinishes?.surfaces.find(s=>W().same(s,f)),color=G().color(work,roomId,'wall',f),values={layout:clone(s?.layout||T().defaults()),grout:color?{mode:'custom',color}:{mode:'auto'},enabled:!!s&&s.enabled!==false,followFloor:!!s?.followFloor,...(s?.bands?{bands:clone(s.bands)}:{}),...(finish?{finish:{tileThickness:finish.tileThickness??null,bondThickness:finish.bondThickness??null}}:{})},key=JSON.stringify(values);let v=p.variants.find(v=>JSON.stringify(Object.fromEntries(Object.entries(v).filter(([k])=>!['id','name'].includes(k))))===key);if(!v){v={id:'v'+(p.variants.length+1),name:`${values.layout.width}×${values.layout.height} · 组合${p.variants.length+1}`,...values};p.variants.push(v);}assignment.push({number:f.number,variantId:v.id});}
  p.source={roomId,assignments:assignment,signature:JSON.stringify(available.map(f=>T().binding(f)))};
 }else{
  if(!F().tiled(work.rooms[roomId].mat))throw Error('请选择瓷砖地面');const s=work.floorFinishes?.areas[roomId],color=G().color(work,roomId,'floor'),e={};for(const k of ['rawZ','tileThickness','baseThickness','mode','targetZ','reference','drop'])if(s&&Object.hasOwn(s,k))e[k]=s[k];p.variants=[{id:'main',name:'当前地砖',layout:clone(s?.layout||F().defaults(room,work.rooms[roomId]).layout),material:work.rooms[roomId].mat,grout:color?{mode:'custom',color}:{mode:'auto'},enabled:!!s&&s.enabled!==false,...(Object.keys(e).length?{elevation:e}:{})}];
 }validate({version:1,items:[p]});return p;
}
function apply(work,plan,preset,targets,selected,options={}){
 validate(work.tilePresets);validate({version:1,items:[preset]});if(!Array.isArray(targets)||!targets.length||targets.length>500||!Array.isArray(selected)||!selected.length||selected.some(k=>!groups.includes(k)))throw Error('请选择目标和要应用的参数');
 const g=new Set(selected),available=T().faces(plan,work),seen=new Set(),resolved=targets.map(t=>{if(!object(t))throw Error('铺贴目标无效');const room=plan.rooms.find(r=>r.id===t.roomId&&r.counted!==false),v=preset.variants.find(v=>v.id===t.variantId);if(!room||!v)throw Error('预设分项或房间已变化，请重新选择');const face=preset.kind==='wall'&&object(t.face)&&available.find(f=>T().same(f,t.face)&&f.roomId===t.roomId),key=preset.kind==='wall'?JSON.stringify(face&&T().binding(face)):t.roomId;if(preset.kind==='wall'&&!face)throw Error('墙面编号已变化，请重新选择');if(seen.has(key))throw Error('同一目标不能重复分配不同分项');seen.add(key);return {room,v,face};});
 let next=clone(work);const changes=[],warnings=[];
 for(const {room,v,face}of resolved){
  if(preset.kind==='wall'){
   const old=T().record(next,face),layout={...(old?.layout||T().defaults())},values={};if(old?.bands&&!g.has('bands')&&!warnings.includes('此墙原有分带保留；整墙参数只影响各带未单独覆盖的字段。'))warnings.push('此墙原有分带保留；整墙参数只影响各带未单独覆盖的字段。');
   for(const [group,fields]of [['spec',['width','height','angle']],['gap',['gap']],['origin',['offset']],['height',['startHeight','reference']]])if(g.has(group)&&v.layout)for(const k of fields)if(Object.hasOwn(v.layout,k))layout[k]=v.layout[k];
   if(['spec','gap','origin','height'].some(k=>g.has(k))&&v.layout)values.layout=layout;if(g.has('enabled')&&v.enabled!==undefined)values.enabled=v.enabled;if(g.has('alignment')&&v.followFloor!==undefined)values.followFloor=v.followFloor;
   if(g.has('bands')&&v.bands!==undefined){values.bands=v.bands===null?null:{reference:v.bands.reference,rows:v.bands.rows.map((r,i)=>{const previous=old?.bands?.rows.find(b=>b.id===r.id)||old?.bands?.rows[i],l={...(previous?.layout||{})};for(const [group,fields]of [['spec',['width','height','angle']],['gap',['gap']],['origin',['offset']],['height',['startHeight','reference']]])if(g.has(group))for(const key of fields){if(options.sync)delete l[key];if(Object.hasOwn(r.layout,key))l[key]=r.layout[key];}return {id:r.id,name:r.name,top:r.top,layout:l,...(g.has('alignment')&&r.followFloor!==undefined?{followFloor:r.followFloor}:previous?.followFloor!==undefined&&!(options.sync&&g.has('alignment'))?{followFloor:previous.followFloor}:{})};})};}
   if(!g.has('bands')&&old?.bands&&v.bands&&options.sync){values.bands=clone(old.bands);values.bands.rows.forEach((row,i)=>{const source=v.bands.rows.find(r=>r.id===row.id)||v.bands.rows[i];if(!source)return;for(const [group,fields]of Object.entries(parameters.layoutGroups))if(g.has(group))for(const key of fields){delete row.layout[key];if(Object.hasOwn(source.layout,key))row.layout[key]=source.layout[key];}if(g.has('alignment')){delete row.followFloor;if(source.followFloor!==undefined)row.followFloor=source.followFloor;}});}
   if(Object.keys(values).length)next=T().edit(next,plan,face,values);
   if(g.has('thickness')&&v.finish)next=W().editFields(next,face,v.finish);
   if(g.has('grout')&&v.grout)next=G().editFace(next,plan,face,v.grout.mode==='auto'?undefined:v.grout.color);
   changes.push({roomId:room.id,label:face.label,variant:v.name});
  }else{
   const setting=next.rooms[room.id];if(g.has('material')&&v.material)setting.mat=v.material;
   if(!F().tiled(setting.mat)&&['spec','gap','origin'].some(k=>g.has(k)))throw Error('此区域不是瓷砖材料，请同时应用瓷砖材质');
   const areas=next.floorFinishes?.areas||{},old=areas[room.id],s=old?clone(old):{mode:'layers',enabled:false},layout={...(old?.layout||F().defaults(room,setting).layout)};let wrote=false;
   for(const [group,fields]of [['spec',['width','height','angle']],['gap',['gap']],['origin',['origin']]])if(g.has(group)&&v.layout)for(const k of fields)if(Object.hasOwn(v.layout,k)){layout[k]=clone(v.layout[k]);wrote=true;}
   if(wrote)s.layout=layout;if(g.has('enabled')&&v.enabled!==undefined){s.enabled=v.enabled;wrote=true;}
   if(g.has('elevation')&&v.elevation){for(const [k,value]of Object.entries(v.elevation)){if(value===null)delete s[k];else s[k]=clone(value);}if(!s.mode)s.mode='layers';wrote=true;}
   if(wrote){areas[room.id]=s;next.floorFinishes={version:1,areas};F().validate(next.floorFinishes);}
   if(g.has('grout')&&v.grout)next=G().edit(next,plan,room.id,'floor',v.grout.mode==='auto'?undefined:v.grout.color);
   changes.push({roomId:room.id,label:setting.name||room.name,variant:v.name});
  }
 }
 if(options.link){const items=next.tilePresets?.items||[],i=items.findIndex(p=>p.id===preset.id);if(i<0)items.push(clone(preset));else if(JSON.stringify(items[i])!==JSON.stringify(preset))throw Error('预设已变化，请重新选择');const bindings=(next.tilePresets?.bindings||[]).filter(b=>!resolved.some(({room,face})=>sameTarget(b,{roomId:room.id,...(face?{face}: {})})));for(const {room,v,face}of resolved)bindings.push({presetId:preset.id,variantId:v.id,roomId:room.id,...(face?{face:T().binding(face)}:{}),groups:[...new Set(selected)]});library(next,items,bindings);}
 W().validate(next.wallFinishes);F().validate(next.floorFinishes);T().validate(next.wallTiling);G().validate(next.tileGrout);
 if(g.has('spec')||g.has('gap'))warnings.push('砖规格或缝宽变化可能改变裁砖及原有对缝；起铺位置按未勾选项保留。');if(g.has('thickness')||g.has('elevation'))warnings.push('层厚或标高会改变完成面和净尺寸，请在3D及空间核对中复核。');return {work:next,changes,warnings};
}
function onlyChange(a,b){const strip=v=>{const c=clone(v);for(const k of ['tilePresets','tileGrout','wallTiling','wallFinishes','floorFinishes'])delete c[k];for(const r of Object.values(c.rooms||{}))delete r.mat;return JSON.stringify(c);};return strip(a)===strip(b);}
const api={groups,validate,variant,templates,save,remove,detach,unsubscribe,remapBuiltin,capture,apply,onlyChange};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishTilePresets=api;
})(typeof globalThis!=='undefined'?globalThis:this);
