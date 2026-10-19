/* Room-scoped tile appearance. Colours never participate in spatial rules. */
(function(root){
'use strict';
const valid=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v),clone=v=>JSON.parse(JSON.stringify(v));
function validate(data){
 if(data===undefined)return;
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 if(!object(data)||data.version!==1||Object.keys(data).some(k=>!['version','rooms','walls'].includes(k))||!object(data.rooms)||Object.keys(data.rooms).length>500)throw Error('美缝颜色设置无效');
 for(const [id,r] of Object.entries(data.rooms))if(!id||id.length>200||['__proto__','constructor','prototype'].includes(id)||!object(r)||Object.keys(r).some(k=>!['wall','floor'].includes(k))||Object.values(r).some(v=>!valid(v)))throw Error('美缝颜色须为 #RRGGBB 格式');
 if(data.walls!==undefined){if(!Array.isArray(data.walls)||data.walls.length>500)throw Error('单墙美缝设置无效');const T=root.FurnishWallTiling||require('./wall-tiling-core.js'),seen=new Set();for(const s of data.walls){if(!object(s)||Object.keys(s).some(k=>!['roomId','wallId','side','range','cross','mode','color'].includes(k))||!['auto','custom'].includes(s.mode)||s.mode==='custom'&&!valid(s.color)||s.mode==='auto'&&s.color!==undefined)throw Error('单墙美缝颜色无效');T.validate({version:1,surfaces:[{...T.binding(s),layout:T.defaults()}]});const key=JSON.stringify(T.binding(s));if(seen.has(key))throw Error('单墙美缝设置重复');seen.add(key);}}
 return data;
}
const color=(work,id,kind,face)=>{const T=root.FurnishWallTiling||(typeof require==='function'?require('./wall-tiling-core.js'):null),s=kind==='wall'&&face&&work.tileGrout?.walls?.find(s=>T.same(s,face));return s?s.mode==='custom'?s.color:undefined:work.tileGrout?.rooms[id]?.[kind];};
const values=(work,targets)=>targets.flatMap(t=>[color(work,t.roomId,t.kind),...(t.kind==='wall'?(work.tileGrout?.walls||[]).filter(s=>s.roomId===t.roomId).map(s=>s.mode==='custom'?s.color:undefined):[])]);
const matches=(work,targets,value)=>values(work,targets).every(c=>c===value);
function clean(next,data){if(!data.walls?.length)delete data.walls;if(Object.keys(data.rooms).length||data.walls?.length)next.tileGrout=data;else delete next.tileGrout;validate(next.tileGrout);return next;}
function editFace(work,plan,face,value){validate(work.tileGrout);const T=root.FurnishWallTiling||require('./wall-tiling-core.js');if(!face||!T.faces(plan,work).some(f=>T.same(f,face))||value!==undefined&&!valid(value))throw Error('墙面或美缝颜色已变化');const next=clone(work),data=next.tileGrout||{version:1,rooms:{}};data.walls=(data.walls||[]).filter(s=>!T.same(s,face));if(value!==data.rooms[face.roomId]?.wall)data.walls.push({...T.binding(face),mode:value===undefined?'auto':'custom',...(value===undefined?{}:{color:value.toLowerCase()})});return clean(next,data);}
function autoColor(base='#e8e2d8'){
 if(/^#[0-9a-f]{3}$/i.test(base))base='#'+[...base.slice(1)].map(c=>c+c).join('');
 if(!valid(base))base='#e8e2d8';
 return '#'+base.slice(1).match(/../g).map(s=>{const c=parseInt(s,16)/255,l=(c<=.04045?c/12.92:((c+.055)/1.055)**2.4)*.9,v=l<=.0031308?l*12.92:1.055*l**(1/2.4)-.055;return Math.round(v*255).toString(16).padStart(2,'0');}).join('');
}
function edit(work,plan,id,kind,value){
 validate(work.tileGrout);
 if(['__proto__','constructor','prototype'].includes(id)||!['wall','floor'].includes(kind)||value!==undefined&&!valid(value))throw Error('请选择跟随砖色或填写 #RRGGBB 美缝颜色');
 const room=plan.rooms.find(r=>r.id===id&&r.counted!==false),setting=work.rooms?.[id]||room;
 if(!room||kind==='wall'&&!(root.FurnishWallTiling||require('./wall-tiling-core.js')).eligible(room,setting)||kind==='floor'&&!(root.FurnishFloorFinish||require('./floor-finish-core.js')).tiled(setting.mat||room.mat))throw Error('此区域没有对应的瓷砖设置');
 const next=clone(work),data=next.tileGrout||{version:1,rooms:{}},r=data.rooms[id]||{};
 if(value===undefined)delete r[kind];else r[kind]=value.toLowerCase();
 if(Object.keys(r).length)data.rooms[id]=r;else delete data.rooms[id];
 if(kind==='wall'&&data.walls)data.walls=data.walls.filter(s=>s.roomId!==id);
 return clean(next,data);
}
function onlyChange(a,b){const strip=v=>{const c=clone(v);delete c.tileGrout;return JSON.stringify(c);};return strip(a)===strip(b);}
function targets(work,plan,ids,kinds){
 if(!Array.isArray(ids)||!ids.length||!Array.isArray(kinds)||!kinds.length||kinds.some(k=>!['wall','floor'].includes(k)))throw Error('请选择房间及墙砖／地砖范围');
 const T=root.FurnishWallTiling||require('./wall-tiling-core.js'),F=root.FurnishFloorFinish||require('./floor-finish-core.js'),out=[];
 for(const id of new Set(ids)){const room=plan.rooms.find(r=>r.id===id&&r.counted!==false),s=work.rooms?.[id]||room;if(!room)throw Error('所选房间已变化，请重新打开设置');for(const kind of new Set(kinds))if(kind==='wall'?T.eligible(room,s):F.tiled(s.mat||room.mat))out.push({roomId:id,kind});}
 if(!out.length)throw Error('所选范围没有对应的墙砖或地砖');return out;
}
function batch(work,plan,ids,kinds,value){let next=work;const list=targets(work,plan,ids,kinds);for(const t of list)next=edit(next,plan,t.roomId,t.kind,value);return next;}
const api={validate,color,autoColor,edit,editFace,values,matches,targets,batch,onlyChange};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishTileGrout=api;
})(typeof globalThis!=='undefined'?globalThis:this);
