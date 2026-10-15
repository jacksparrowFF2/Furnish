/* Kitchen assemblies and countertop attachments, millimetres; no app state. */
(function(root){
'use strict';
const roles={door:'门柜',drawer:'抽屉柜',sink:'水槽柜',hob:'灶台柜',empty:'设备空位'};
const isWall=f=>f?.type==='kitchenwall';
const bodyHeight=f=>f.kitchen.baseHeight;
const plinth=f=>isWall(f)?0:100;
const baseElevation=f=>isWall(f)?(root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null)).value(f,'mountHeight'):0;
const moduleRoles=f=>isWall(f)?{door:'门柜',drawer:'抽屉柜',empty:'预留空位',custom:'保留内部结构'}:roles;
const edgeStyles={plain:'单板无下挂',square:'直角下挂',reverse:'反收下挂',bevel:'45°斜切下挂'};
const cornerSide=f=>f.kitchen.corner??'left';
const counterDepth=f=>isWall(f)?f.kitchen.depth:f.kitchen.counterDepth??f.kitchen.depth;
const runDepth=(f,run)=>f.kitchen.shape==='U'?(f.kitchen.runDepths?.[run]??f.kitchen.depth):f.kitchen.depth;
const runCounterDepth=(f,run)=>runDepth(f,run)+counterDepth(f)-f.kitchen.depth;
const shapeRules=f=>{const R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);return (R.definition(f)??R.definition('counter')).kitchenShapes?.[f.kitchen.shape];};
const runs=f=>shapeRules(f)?.runs??[];
const endRuns=f=>shapeRules(f)?.ends??[];
const runName=(f,run)=>run===0?'主边':run===2?'回折边':f.kitchen.shape==='U'?'连接边':'转角边';
const runNormal=m=>m.rot===180?[0,-1]:m.rot===90?[-1,0]:m.rot===270?[1,0]:[0,1];
const runLength=(f,run)=>f.kitchen.modules.filter(m=>m.run===run).reduce((sum,m)=>sum+m.width,0);
const extension=(f,run)=>f.kitchen.endExtensions?.find(e=>e.run===run)??{run,length:0,depth:runCounterDepth(f,run)};
// The two open arms may have independent lengths; extensions belong to their free ends.
function dimensions(f){
 const k=f.kitchen,sum=run=>runLength(f,run);
 if(k.shape==='U')return {w:runDepth(f,1)+Math.max(sum(0)+extension(f,0).length,sum(2)+extension(f,2).length),d:runDepth(f,0)+runDepth(f,2)+sum(1)};
 return {w:sum(0)+(k.shape==='L'?k.depth:0)+extension(f,0).length,d:k.shape==='L'?k.depth+sum(1)+extension(f,1).length:counterDepth(f)};
}
function bodyBounds(f){const right=f.kitchen.shape!=='straight'&&cornerSide(f)==='right';if(f.kitchen.shape==='U')return {x:-f.w/2,y:-f.d/2,w:f.w,d:f.d,right};const w=f.w-extension(f,0).length,d=f.d-(f.kitchen.shape==='L'?extension(f,1).length:0);return {x:-f.w/2+(right?extension(f,0).length:0),y:-f.d/2,w,d,right};}
const edgeStyle=f=>f.kitchen.edgeStyle??'plain';
const dropHeight=f=>!isWall(f)&&['square','reverse'].includes(edgeStyle(f))?(f.kitchen.dropHeight??20):0;
const clone=v=>JSON.parse(JSON.stringify(v));
const cabinet=()=>root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);
const avoidanceRules=()=>{const R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);return R.definition({type:'counter'}).avoidance;};
const partitionRules=()=>{const R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);return R.definition({type:'counter'}).cornerPartitions;};
const depthRules=()=>{const R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);return R.definition({type:'counter'}).kitchenDepth;};
const endResizeRules=()=>{const R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);return R.definition({type:'counter'}).endResize;};
const drawerRules=f=>{const R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);return (R.definition(f??'counter')??R.definition('counter')).drawerTiers;};
const drawerSpan=f=>f.kitchen.baseHeight-dropHeight(f)-drawerRules(f).plinth;
function drawerHeights(f,m){
 if(m.role!=='drawer')return [];if(m.drawerHeights!==undefined)return clone(m.drawerHeights);
 const r=drawerRules(f),height=Math.max(r.legacyMin,(f.kitchen.baseHeight-dropHeight(f)-r.legacyOffset)/r.defaultCount),values=Array(r.defaultCount).fill(height);values[0]+=r.board;values[values.length-1]=drawerSpan(f)-values.slice(0,-1).reduce((a,b)=>a+b,0);return values;
}
function validateDrawers(f,m){
 const r=drawerRules(f),values=m.drawerHeights;
 if(values!==undefined&&(m.role!=='drawer'||!Array.isArray(values)||values.length<r.minCount||values.length>r.maxCount||Array.from(values).some(v=>!Number.isFinite(v)||v<r.minHeight)||Math.abs(values.reduce((a,b)=>a+b,0)-drawerSpan(f))>.01))throw Error(`抽屉须为 ${r.minCount}–${r.maxCount} 层，每层至少 ${r.minHeight} mm，层高合计须等于可分配高度 ${drawerSpan(f)} mm`);
}
function setDrawerCount(f,index,count,{equal=false}={}){
 if(f.locked)throw Error('请先解锁厨房');const m=f.kitchen.modules[index],r=drawerRules(f);if(m?.role!=='drawer'||!Number.isInteger(count)||count<r.minCount||count>r.maxCount||count*r.minHeight>drawerSpan(f)+1e-8)throw Error(`抽屉层数须为 ${r.minCount}–${Math.min(r.maxCount,Math.floor(drawerSpan(f)/r.minHeight))} 层`);
 if(!equal&&count===drawerHeights(f,m).length)return clone(f);const k=clone(f.kitchen);k.modules[index].drawerHeights=Array.from({length:count},()=>drawerSpan(f)/count);return configure(f,k);
}
function setDrawerHeight(f,index,tier,height){
 if(f.locked)throw Error('请先解锁厨房');const m=f.kitchen.modules[index],r=drawerRules(f);if(m?.role!=='drawer'||!Number.isInteger(tier))throw Error('请选择有效抽屉层');const values=drawerHeights(f,m);if(tier<0||tier>=values.length||!Number.isFinite(height)||height<r.minHeight)throw Error(`每层抽屉高度至少 ${r.minHeight} mm`);
 let difference=height-values[tier];if(Math.abs(difference)<1e-8)return clone(f);values[tier]=height;
 for(let j=values.length-1;j>=0&&Math.abs(difference)>1e-8;j--){if(j===tier)continue;const change=difference>0?Math.min(difference,Math.max(0,values[j]-r.minHeight)):difference;values[j]-=change;difference-=change;}
 if(Math.abs(difference)>1e-8)throw Error('其他抽屉层剩余高度不足，请减少层数或调整高度');const k=clone(f.kitchen);k.modules[index].drawerHeights=values;return configure(f,k);
}
function resizeDrawerBoundary(f,index,boundary,delta){
 if(f.locked)throw Error('请先解锁厨房');validate(f);const m=f.kitchen.modules[index];if(m?.role!=='drawer'||!Number.isInteger(boundary)||!Number.isFinite(delta))throw Error('请选择有效的抽屉层间分界线');
 const values=drawerHeights(f,m);if(boundary<0||boundary>=values.length-1)throw Error('请选择有效的抽屉层间分界线');if(Math.abs(delta)<1e-8)return clone(f);
 values[boundary]+=delta;values[boundary+1]-=delta;const k=clone(f.kitchen);k.modules[index].drawerHeights=values;return configure(f,k);
}
// Only the immediately touching drawers on this run supply alignment references.
function drawerBoundaryTargets(f,index,boundary){
 const m=f.kitchen?.modules[index];if(f.locked||m?.role!=='drawer'||m.drawerOpen?.some(Boolean)||!Number.isInteger(boundary))return [];
 const values=drawerHeights(f,m);if(boundary<0||boundary>=values.length-1)return [];
 const row=f.kitchen.modules.map((module,column)=>({module,column})).filter(v=>v.module.run===m.run),at=row.findIndex(v=>v.column===index),base=drawerRules(f).plinth+values.slice(0,boundary+1).reduce((a,b)=>a+b,0),targets=[];
 for(const other of [row[at-1],row[at+1]]){if(other?.module.role!=='drawer'||other.module.drawerOpen?.some(Boolean))continue;const heights=drawerHeights(f,other.module);let height=drawerRules(f).plinth;
  for(let tier=0;tier<heights.length-1;tier++){height+=heights[tier];const delta=height-base;try{resizeDrawerBoundary(f,index,boundary,delta);targets.push({column:other.column,boundary:tier,height,delta});}catch{/* A reference must respect both adjacent tier minimums. */}}
 }return targets;
}
const cornerPartition=(m,side)=>m.cornerPartitions?.[side]??partitionRules().roleDefaults[m.role]??partitionRules().retained;
function validatePartitions(m){const p=m.cornerPartitions;if(p!==undefined&&(!p||Array.isArray(p)||typeof p!=='object'||Object.entries(p).some(([side,keep])=>!partitionRules().sides.includes(side)||typeof keep!=='boolean')))throw Error('转角竖向隔板须按模块左／右侧设置保留或取消');}
const zones=()=>root.FurnishZoneGeometry||(typeof require==='function'?require('./zone-geometry.js'):null);
const rectPoly=s=>[[-s.w/2,-s.d/2],[s.w/2,-s.d/2],[s.w/2,s.d/2],[-s.w/2,s.d/2]].map(([x,y])=>[x+s.x,y+s.y]);
const moduleDoor=(f,m)=>m.role==='drawer'||m.role==='empty'?'none':m.door??'auto';
const moduleLeafCount=(f,m)=>{const door=moduleDoor(f,m);return door==='none'?0:door==='auto'?cabinet().autoDoorCount(m.width??m.length):door==='double'?2:1;};
const moduleLeafState=(f,m,leaf)=>cabinet().doorLeafState(f.kitchen,m,leaf);
const moduleLeafAngle=(f,m,leaf)=>cabinet().doorLeafAngle(f.kitchen,m,leaf);
const moduleMaxAngle=(f,m)=>cabinet().maxDoorAngle(f.kitchen,m);
const moduleAngle=(f,m)=>moduleDoor(f,m)==='none'?0:cabinet().doorAngle(f.kitchen,m);
function defaults(f){const n=Math.max(1,Math.ceil(f.w/600));if(isWall(f))return {version:1,shape:'straight',depth:f.d,baseHeight:f.h??700,thickness:0,modules:Array.from({length:n},()=>({run:0,width:f.w/n,role:'door'}))};return {version:1,shape:'straight',depth:f.d,baseHeight:820,thickness:40,modules:Array.from({length:n},()=>({run:0,width:f.w/n,role:'door'}))};}
function validate(f){
 if(!f.kitchen)return f;const k=f.kitchen,finite=Number.isFinite;
 if(![f.w,f.d].every(v=>finite(v)&&v>0&&v<=20000))throw Error('厨房外包宽深须在 0–20000 mm 内');
 if(k.corner!==undefined&&!['left','right'].includes(k.corner))throw Error('厨房转角须为左转角或右转角');
 if(k.doorOverlay!==undefined&&!['full','half','inset'].includes(k.doorOverlay))throw Error('厨房柜门盖板方式无效');
 cabinet().validateDoorSettings(k);
 if(k.autoAvoid!==undefined&&typeof k.autoAvoid!=='boolean')throw Error('厨房自动避让须为布尔值');
 if(k.runDepths!==undefined){const rule=shapeRules(f)?.runDepth;if(!rule||!Array.isArray(k.runDepths)||k.runDepths.length!==3||Array.from(k.runDepths).some(v=>!finite(v)||v<rule.min||v>rule.max))throw Error('三边独立柜深须为三个 50–1200 mm 数值，仅 U 形支持');}
 if(k.obstacleFit!==undefined){const fit=k.obstacleFit;if(!k.autoAvoid||!fit||!Array.isArray(fit.depths)||fit.depths.length>50||!Array.isArray(fit.cuts)||fit.cuts.length>100)throw Error('厨房自动避让结果无效');const seen=new Set();for(const row of fit.depths){const end=row?.index>=k.modules.length?extension(f,row.index-k.modules.length):null,m=end?.length?end:k.modules[row?.index],limit=end?.length?end.cabinetDepth??Math.min(1200,end.depth):runDepth(f,m?.run);if(!m||m.role&&m.role!=='door'||!Number.isInteger(row.index)||seen.has(row.index)||!finite(row.depth)||row.depth<avoidanceRules().minDepth||row.depth>limit)throw Error('自动避让柜深无效');seen.add(row.index);}for(const poly of fit.cuts){zones().validatePolygon(poly);if(poly.some(p=>p.some(v=>Math.abs(v)>20000)))throw Error('自动台面缺口坐标超限');}}
 if(k.counterDepth!==undefined&&(!finite(k.counterDepth)||k.counterDepth<k.depth||k.counterDepth>k.depth+100))throw Error('台面深度须不小于柜深，前沿挑出最多 100 mm');
 if(k.obstacleFit?.corners!==undefined){const values=k.obstacleFit.corners,blocks=cornerBlocks(f),seen=new Set();if(!Array.isArray(values)||values.length>blocks.length)throw Error('转角自动避让结果无效');for(const row of values){const b=blocks[row?.index],min=avoidanceRules().minDepth;if(!b||!Number.isInteger(row.index)||seen.has(row.index)||![row.width,row.depth].every(finite)||row.width<min||row.width>b.w||row.depth<min||row.depth>b.d)throw Error('转角避让宽深无效');seen.add(row.index);}}
 if(k.endExtensions!==undefined){if(!Array.isArray(k.endExtensions)||k.endExtensions.length>2)throw Error('台面末端延伸配置无效');const seen=new Set();for(const e of k.endExtensions){if(!e||!endRuns(f).includes(e.run)||seen.has(e.run)||!finite(e.length)||e.length!==0&&e.length<150||e.length>3000||!finite(e.depth)||e.depth<endResizeRules().minDepth||e.depth>runCounterDepth(f,e.run)||e.cabinetDepth!==undefined&&(!finite(e.cabinetDepth)||e.cabinetDepth<endResizeRules().minDepth||e.cabinetDepth>Math.min(1200,e.depth))||e.backPanel!==undefined&&typeof e.backPanel!=='boolean'||e.doorOpen!==undefined&&typeof e.doorOpen!=='boolean')throw Error('末端薄柜宽须为 0（不添加）或 150–3000 mm；台面／柜深至少 50 mm，柜深不超过台面深；背板及开合须为布尔值');cabinet().validateDoorSettings(e);if(e.doorLeaves&&e.doorLeaves.length!==moduleLeafCount(f,e))throw Error('末端薄柜逐扇开合数量须与门数一致');seen.add(e.run);}}
 if(k.edgeStyle!==undefined&&!Object.hasOwn(edgeStyles,k.edgeStyle)||k.dropHeight!==undefined&&(!finite(k.dropHeight)||k.dropHeight<0||k.dropHeight>100))throw Error('台面下挂样式或高度无效（0–100 mm）');
 if(!['counter','kitchenwall'].includes(f.type)||f.obj||!k||k.version!==1||!shapeRules(f)||![k.depth,k.baseHeight,k.thickness].every(finite)||k.depth<depthRules().min||k.depth>depthRules().max||(isWall(f)?k.baseHeight<200||k.baseHeight>3200||k.thickness!==0:k.baseHeight<400||k.baseHeight>1200||k.thickness<10||k.thickness>100)||!Array.isArray(k.modules)||!k.modules.length||k.modules.length>48)throw Error('厨房配置无效：柜深 50–1200、柜高 400–1200、台面厚 10–100 mm');
 if(isWall(f)&&f.h!==undefined&&f.h!==k.baseHeight)throw Error('吊柜高度须与分排柜高一致');
 const sums=[0,0,0];for(const m of k.modules){if(!m||!runs(f).includes(m.run)||!Object.hasOwn(moduleRoles(f),m.role)||!finite(m.width)||m.width<(m.role==='empty'?depthRules().emptyMinWidth:150)||m.width>((root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null)).definition(f)?.moduleMaxWidth??3000))throw Error('厨房模块宽须为 150–3000 mm，功能与所在边须有效');if(m.role==='drawer'&&runDepth(f,m.run)<depthRules().drawerMin)throw Error(`抽屉柜深须至少 ${depthRules().drawerMin} mm 以容纳现有板件`);cabinet().validateDoorSettings(m);validatePartitions(m);validateDrawers(f,m);if(m.shelves!==undefined&&(m.role!=='door'||!Array.isArray(m.shelves)||m.shelves.some(v=>!Number.isFinite(v))))throw Error('自定义层板须为门柜的毫米高度数组');if(m.structure!==undefined&&m.role!=='custom')throw Error('保留结构仅适用于保留内部结构模块');if(isWall(f)&&m.role!=='empty'||m.shelves!==undefined||m.structure!==undefined){if(!isWall(f))throw Error('自定义层板与保留结构仅用于吊柜');cabinet().validate(moduleFurniture(f,{...m,index:0,x:0,y:0,rot:0}));}if(m.doorLeaves&&m.doorLeaves.length!==moduleLeafCount(f,m))throw Error('逐扇开合数量须与模块门数一致');if(m.doorOpen!==undefined&&typeof m.doorOpen!=='boolean'||m.drawerOpen!==undefined&&(!Array.isArray(m.drawerOpen)||m.drawerOpen.length!==(m.role==='drawer'?drawerHeights(f,m).length:drawerRules().defaultCount)||m.drawerOpen.some(v=>typeof v!=='boolean')))throw Error('厨房模块开合状态无效');sums[m.run]+=m.width;}
 const expected=dimensions(f);if(runs(f).some(run=>sums[run]<150)||Math.abs(f.w-expected.w)>.01||Math.abs(f.d-expected.d)>.01)throw Error('厨房外包尺寸须与模块长度、转角及台面延伸一致');
 if(k.shape==='U'&&sums[1]<=2*(counterDepth(f)-k.depth))throw Error('U 形须有三边模块，内侧台面不能相交或封闭');
 if(k.obstacleFit?.cuts.length&&topGeometry(f).rings.filter(r=>zones().signed(r)>0).length!==1)throw Error('自动缺口不能切断或移除整片台面');
 return f;
}
function configure(f,k){
 if(f.locked)throw Error('家具已锁定，请先解锁');const next={...f,kitchen:clone(k)};Object.assign(next,dimensions(next));
 if(isWall(f)){if(k.thickness!==0)throw Error('吊柜不设置台面厚度');for(const m of next.kitchen.modules)if(m.role==='drawer'&&!m.drawerHeights&&drawerSpan(next)<drawerRules(next).defaultCount*drawerRules(next).minHeight){const count=Math.max(1,Math.floor(drawerSpan(next)/drawerRules(next).minHeight));m.drawerHeights=Array(count).fill(drawerSpan(next)/count);}}
 if(f.kitchen){const oldSpan=drawerSpan(f),span=drawerSpan(next);if(Math.abs(span-oldSpan)>1e-8)next.kitchen.modules.forEach((m,i)=>{const old=f.kitchen.modules[i];if(m.role==='drawer'&&m.drawerHeights&&JSON.stringify(m.drawerHeights)===JSON.stringify(old?.drawerHeights))m.drawerHeights=m.drawerHeights.map(v=>v*span/oldSpan);});}
 if(f.kitchen&&k.shape===f.kitchen.shape){
  const dx=k.shape==='U'?((next.w-f.w)/2-(runDepth(next,1)-runDepth(f,1)))*(cornerSide(next)==='right'?-1:1):(k.endExtensions!==undefined||f.kitchen.endExtensions!==undefined)?(next.w-f.w)/2*(k.shape==='L'&&cornerSide(next)==='right'?-1:1):0;
  const dy=k.shape==='U'?(next.d-f.d)/2-(runDepth(next,0)-runDepth(f,0)):k.shape==='L'?(k.endExtensions!==undefined||f.kitchen.endExtensions!==undefined?(next.d-f.d)/2:0):k.counterDepth!==undefined?(next.d-f.d)/2:0;
  const [cx,cy]=world(f,dx,dy);next.cx=cx;next.cy=cy;
 }
 delete next.kitchen.obstacleFit;
 for(const m of next.kitchen.modules){if(m.role==='custom')for(const key of ['door','doorOpen','doorAngle','doorMaxAngle','doorLeaves','shelves'])delete m[key];if(m.role==='drawer'||m.role==='empty')for(const key of ['door','doorOpen','doorAngle','doorMaxAngle','doorLeaves'])delete m[key];if(moduleDoor(next,m)==='none'){delete m.doorOpen;delete m.doorAngle;delete m.doorLeaves;}if(m.role!=='custom')delete m.structure;if(m.role!=='door')delete m.shelves;if(m.role!=='drawer'){delete m.drawerOpen;delete m.drawerHeights;}else if(Array.isArray(m.drawerOpen))m.drawerOpen=Array.from({length:drawerHeights(next,m).length},(_,i)=>m.drawerOpen[i]??false);}for(const m of [...next.kitchen.modules,...(next.kitchen.endExtensions||[])]){const count=moduleLeafCount(next,m);if(!count)delete m.doorLeaves;else if(m.doorLeaves){m.doorLeaves=Array.from({length:count},(_,i)=>m.doorLeaves[i]??{open:false});m.doorOpen=m.doorLeaves.some(s=>s.open);}}if(isWall(next))next.h=next.kitchen.baseHeight;else delete next.h;delete next.cabinet;return validate(next);}
// Explicit shape edits preserve retained module indices and remap only removed runs.
function changeShape(f,shape,corner='left'){
 const k=clone(f.kitchen),previous=k.shape;k.shape=shape;k.corner=corner;if(corner==='left')delete k.corner;
 if(shape!=='U')delete k.runDepths;
 const allowed=runs({...f,kitchen:k});if(!allowed.length)throw Error('厨房形状无效');const remap=new Map();k.modules=k.modules.filter((m,i)=>{if(!allowed.includes(m.run))return false;remap.set(i,remap.size);return true;});
 for(const run of allowed)if(!k.modules.some(m=>m.run===run))k.modules.push({run,width:600,role:'door'});
 if(k.endExtensions){k.endExtensions=k.endExtensions.map(e=>({...e,run:shape==='U'&&previous==='L'&&e.run===1?2:previous==='U'&&shape==='L'&&e.run===2?1:e.run})).filter(e=>endRuns({...f,kitchen:k}).includes(e.run));}
 const next=configure(f,k);
 // Adding/removing the third arm keeps the existing L corner and retained runs fixed.
 if(previous!==shape&&previous!=='straight'&&shape!=='straight'&&cornerSide(f)===corner){const a=cornerBlock(f),b=cornerBlock(next),old=world(f,a.x,a.y),now=world(next,b.x,b.y);next.cx+=old[0]-now[0];next.cy+=old[1]-now[1];}
 return {furniture:next,remap};
}
const terminalIndex=(f,run)=>{const indices=f.kitchen.modules.flatMap((m,i)=>m.run===run?[i]:[]);return run===0&&f.kitchen.shape!=='straight'&&cornerSide(f)==='right'?indices[0]:indices.at(-1);};
// Transient grip geometry in the same local mm frame as the production stone.
function runHandles(f){
 if(!f.kitchen||!shapeRules(f)?.independentResize)return [];validate(f);
 const k=f.kitchen,b=bodyBounds(f),sign=b.right?-1:1,x=u=>b.x+(b.right?b.w-u:u);
 return runs(f).map(run=>{
  const e=extension(f,run),D=runCounterDepth(f,run),length=(run===1?runDepth(f,0)+runDepth(f,2):runDepth(f,1))+runLength(f,run)+e.length;
  return {run,name:runName(f,run),length,index:terminalIndex(f,run),span:e.length?e.depth:D,x:run===1?x(D/2):x(length),y:run===0?b.y+(e.length?e.depth:D)/2:run===2?b.y+b.d-(e.length?e.depth:D)/2:b.y+b.d-runCounterDepth(f,2),dx:run===1?0:sign,dy:run===1?1:0};
 });
}
function resizeRun(f,run,length,{furniture=[]}={}){
 if(f.locked)throw Error('家具已锁定，请先解锁');
 const handle=runHandles(f).find(h=>h.run===run);if(!handle||!Number.isFinite(length))throw Error('请选择有效的 U 形厨房边和长度');
 const delta=length-handle.length;if(Math.abs(delta)<1e-8)return clone(f);
 const k=clone(f.kitchen);k.modules[handle.index].width+=delta;
 // configure keeps the first corner fixed when the derived envelope changes.
 // Editing the connector translates the return arm, without resizing its bays.
 const next=configure(f,k);
 for(const device of furniture)if(device.counterLink?.hostId===f.id)fit(device,next,device.counterLink.module);
 return next;
}
// A shared boundary redistributes the two adjacent widths, keeping the run fixed.
function dividerHandles(f){
 const R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);if(!f.kitchen||!R.definition(f)?.moduleDividers)return [];validate(f);
 const all=cabinetLayout(f),handles=[];
 for(const run of runs(f)){const modules=all.filter(m=>m.run===run),angle=(modules[0]?.rot??0)*Math.PI/180,u=[Math.cos(angle),Math.sin(angle)],n=[-u[1],u[0]],dot=(m,v)=>m.x*v[0]+m.y*v[1];modules.sort((a,b)=>dot(a,u)-dot(b,u));
  for(let i=1;i<modules.length;i++){const a=modules[i-1],b=modules[i],at=(dot(a,u)+a.width/2+dot(b,u)-b.width/2)/2;if(Math.abs(dot(a,u)+a.width/2-dot(b,u)+b.width/2)>.01)continue;
   const da=a.depth??runDepth(f,run),db=b.depth??runDepth(f,run),a0=dot(a,n)-da/2,a1=dot(a,n)+da/2,b0=dot(b,n)-db/2,b1=dot(b,n)+db/2;if(Math.min(a1,b1)-Math.max(a0,b0)<=.01)continue;
   const lo=Math.min(a0,b0),hi=Math.max(a1,b1),mid=(lo+hi)/2;
   handles.push({key:`${a.index}:${b.index}`,run,left:a.index,right:b.index,leftWidth:a.width,rightWidth:b.width,x:u[0]*at+n[0]*mid,y:u[1]*at+n[1]*mid,dx:u[0],dy:u[1],span:hi-lo});
  }
 }
 return handles;
}
function resizeDivider(f,key,delta,{furniture=[]}={}){
 if(f.locked)throw Error('家具已锁定，请先解锁');validate(f);
 const h=dividerHandles(f).find(h=>h.key===key);if(!h||!Number.isFinite(delta))throw Error('请选择有效的柜间分界线');if(Math.abs(delta)<1e-8)return clone(f);
 const k=clone(f.kitchen),set=(index,width)=>{if(index<k.modules.length)k.modules[index].width=width;else {const rules=endResizeRules();if(width<rules.minLength||width>rules.maxLength)throw Error(`末端薄柜宽须为 ${rules.minLength}–${rules.maxLength} mm`);k.endExtensions.find(e=>e.run===index-k.modules.length).length=width;}};
 set(h.left,h.leftWidth+delta);set(h.right,h.rightWidth-delta);const next=configure(f,k);Object.assign(next,{cx:f.cx,cy:f.cy,w:f.w,d:f.d});validate(next);
 for(const device of furniture)if(device.counterLink?.hostId===f.id)fit(device,next,device.counterLink.module);
 return next;
}
// Thin ends have their own edges; their edits never change ordinary module widths.
function extensionHandles(f){
 if(!f.kitchen)return [];validate(f);
 return endLayout(f).flatMap(m=>{const e=extension(f,m.run),n=runNormal(m),dx=m.run===0||f.kitchen.shape==='U'?(f.kitchen.shape!=='straight'&&cornerSide(f)==='right'?-1:1):0,dy=dx?0:1,back={x:m.x-n[0]*m.depth/2,y:m.y-n[1]*m.depth/2};
  return [{run:m.run,field:'length',name:runName(f,m.run)+'薄柜宽',value:e.length,x:back.x+dx*e.length/2+n[0]*e.depth/2,y:back.y+dy*e.length/2+n[1]*e.depth/2,dx,dy,span:e.depth},{run:m.run,field:'cabinetDepth',name:runName(f,m.run)+'薄柜柜深',value:m.depth,x:m.x+n[0]*m.depth/2,y:m.y+n[1]*m.depth/2,dx:n[0],dy:n[1],span:e.length}];
 });
}
function resizeExtension(f,run,field,value){
 if(f.locked)throw Error('家具已锁定，请先解锁');validate(f);
 const rule=endResizeRules(),e=extension(f,run);if(!rule.fields.includes(field)||!endRuns(f).includes(run)||!e.length||!Number.isFinite(value))throw Error('薄柜拉伸边界无效');
 const min=field==='length'?rule.minLength:rule.minDepth,max=field==='length'?rule.maxLength:Math.min(rule.maxDepth,e.depth);
 if(value<min||value>max)throw Error(`薄柜${field==='length'?'宽':'柜深'}须在 ${min}–${max} mm 内`);
 const current=field==='length'?e.length:e.cabinetDepth??Math.min(rule.maxDepth,e.depth);if(Math.abs(value-current)<1e-8)return clone(f);
 const k=clone(f.kitchen);k.endExtensions=k.endExtensions.map(row=>row.run===run?{...row,[field]:value}:row);return configure(f,k);
}
// Canonical (before furniture mirror) outer edges address the touching cabinet row.
function outerEdge(f,edge){
 if(!f.kitchen||!shapeRules(f)?.outerResize||!['left','right','top','bottom'].includes(edge))throw Error('请选择有效的 U 形厨房外边');
 if(edge==='top'||edge==='bottom')return {kind:'depth',run:edge==='top'?0:2};
 if(edge===(cornerSide(f)==='right'?'right':'left'))return {kind:'depth',run:1};
 const lengths=endRuns(f).map(run=>({run,length:runLength(f,run)+extension(f,run).length})),longest=Math.max(...lengths.map(v=>v.length)),run=lengths.find(v=>Math.abs(v.length-longest)<1e-6).run;
 return {kind:'width',run,index:terminalIndex(f,run)};
}
function resizeOuter(f,edge,delta,{furniture=[]}={}){
 if(f.locked)throw Error('家具已锁定，请先解锁');validate(f);
 const target=outerEdge(f,edge);if(!Number.isFinite(delta))throw Error('外边调整尺寸无效');if(Math.abs(delta)<1e-8)return clone(f);
 const k=clone(f.kitchen);
 if(target.kind==='depth'){k.runDepths=runs(f).map(run=>runDepth(f,run));k.runDepths[target.run]+=delta;}
 else {
  k.modules[target.index].width+=delta;
  const available=runLength(f,target.run)+extension(f,target.run).length+delta;
  if(endRuns(f).some(run=>run!==target.run&&runLength(f,run)+extension(f,run).length>available+1e-6))throw Error('另一边长度保持固定，不能越过其末端；请用三边独立手柄调整');
 }
 const next=configure(f,k),dx=edge==='left'?-delta/2:edge==='right'?delta/2:0,dy=edge==='top'?-delta/2:edge==='bottom'?delta/2:0;
 const [cx,cy]=world(f,dx,dy);next.cx=cx;next.cy=cy;
 for(const device of furniture)if(device.counterLink?.hostId===f.id)fit(device,next,device.counterLink.module);
 return next;
}
// The outer handles change run lengths, never proportionally scale every bay.
// Preserve saved middle bays; the free-end bay absorbs the length difference.
function resize(f,next){
 const k=clone(f.kitchen);if(isWall(f)&&next.h!==undefined&&next.h!==f.h)k.baseHeight=next.h;const changeRun=(run,length)=>{
  const delta=length-runLength(f,run);if(Math.abs(delta)<1e-8)return;
  const index=terminalIndex(f,run);
  if(index===undefined)throw Error('厨房所在边没有可调整的末端模块');
  k.modules[index].width+=delta;
 };
 if(k.shape==='U'){
  if(next.w!==f.w){
   const lengths=endRuns(f).map(run=>({run,length:runLength(f,run)+extension(f,run).length})),longest=Math.max(...lengths.map(row=>row.length)),active=lengths.find(row=>Math.abs(row.length-longest)<1e-6),available=next.w-runDepth(f,1);
   // The main arm wins a tie. The other arm is a fixed independent design.
   if(lengths.some(row=>row!==active&&row.length>available+1e-6))throw Error('另一边长度保持固定，不能继续缩短整体宽度；请在功能模块中单独调整该边');
   changeRun(active.run,available-extension(f,active.run).length);
  }
  if(next.d!==f.d)changeRun(1,next.d-runDepth(f,0)-runDepth(f,2));
 }else{
  if(k.shape==='straight'){
   const extra=counterDepth(f)-k.depth;k.depth=next.d-extra;
   if(k.counterDepth!==undefined)k.counterDepth=next.d;
  }
  if(next.w!==f.w)changeRun(0,next.w-(k.shape==='L'?k.depth:0)-extension(f,0).length);
  if(k.shape==='L'&&next.d!==f.d)changeRun(1,next.d-k.depth-extension(f,1).length);
 }
 // configure validates the terminal bay's ordinary 150–3000 mm capability,
 // updates leaf counts and clears derived obstacle fitting atomically.
 return configure(next,k);
}
// Explicit, undoable repair. First validate the recorded module structure;
// only reconcile its derived envelope, never invent missing configuration.
function repairDimensions(f,keepEnvelope=true){
 const canonical=configure(f,f.kitchen);
 const repaired=keepEnvelope?resize(canonical,{...canonical,w:f.w,d:f.d}):canonical;
 return {...f,w:repaired.w,d:repaired.d,kitchen:repaired.kitchen};
}
function layout(f){
 validate(f);const k=f.kitchen,b=bodyBounds(f),offset=[k.shape!=='straight'&&!b.right?k.depth:0,k.depth,k.depth];
 if(k.shape==='U'){
  const d0=runDepth(f,0),d1=runDepth(f,1),d2=runDepth(f,2);offset[0]=offset[2]=d1;offset[1]=d0;
  return k.modules.map((m,index)=>{
   const start=offset[m.run];offset[m.run]+=m.width;
   // Main/right follows the saved L ordering; the new return starts at its corner.
   const depth=runDepth(f,m.run),x=m.run===1?d1/2:m.run===0&&b.right?2*d1+runLength(f,0)-start-m.width/2:start+m.width/2;
   return {...m,index,depth,x:b.x+(b.right?b.w-x:x),y:m.run===0?b.y+d0/2:m.run===2?b.y+b.d-d2/2:b.y+start+m.width/2,w:m.run===1?depth:m.width,d:m.run===1?m.width:depth,rot:m.run===0?0:m.run===2?180:b.right?90:270};
  });
 }
 return k.modules.map((m,index)=>{const start=offset[m.run];offset[m.run]+=m.width;return {...m,index,x:m.run===0?b.x+start+m.width/2:b.x+(b.right?b.w-k.depth/2:k.depth/2),y:m.run===0?b.y+k.depth/2:b.y+start+m.width/2,w:m.run===0?m.width:k.depth,d:m.run===0?k.depth:m.width,rot:m.run===0?0:b.right?90:270};});
}
function cornerBlock(f){const b=bodyBounds(f),w=runDepth(f,1),d=runDepth(f,0);return {x:b.x+(b.right?b.w-w/2:w/2),y:b.y+d/2,w,d};}
function endLayout(f){const b=bodyBounds(f),k=f.kitchen;return endRuns(f).flatMap(run=>{const e=extension(f,run);if(!e.length)return [];const d=e.cabinetDepth??Math.min(1200,e.depth);if(k.shape==='U'){const x=runDepth(f,1)+runLength(f,run)+e.length/2;return [{...e,index:k.modules.length+run,role:'door',width:e.length,depth:d,backPanel:e.backPanel??false,x:b.x+(b.right?b.w-x:x),y:run===0?b.y+d/2:b.y+b.d-d/2,w:e.length,d,rot:run===0?0:180}];}return [{...e,index:k.modules.length+run,role:'door',width:e.length,depth:d,backPanel:e.backPanel??false,x:run===0?(b.right?b.x-e.length/2:b.x+b.w+e.length/2):b.x+(b.right?b.w-d/2:d/2),y:run===0?b.y+d/2:b.y+b.d+e.length/2,w:run===0?e.length:d,d:run===0?d:e.length,rot:run===0?0:b.right?90:270}];});}
function cabinetLayout(f){return [...layout(f),...endLayout(f)].map(m=>{const depth=f.kitchen.obstacleFit?.depths.find(row=>row.index===m.index)?.depth;if(depth===undefined)return m;const nominal=m.depth??f.kitchen.depth,shift=(nominal-depth)/2,normal=runNormal(m);return {...m,depth,x:m.x+normal[0]*shift,y:m.y+normal[1]*shift,w:m.run===1?depth:m.width,d:m.run===1?m.width:depth};});}
function cornerBlocks(f){if(f.kitchen.shape==='straight')return [];const b=cornerBlock(f),d=runDepth(f,2);return f.kitchen.shape==='U'?[b,{...b,y:f.d/2-d/2,d}]:[b];}
function cornerLayout(f){return cornerBlocks(f).map((b,index)=>{const fit=f.kitchen.obstacleFit?.corners?.find(row=>row.index===index);if(!fit)return {...b,index};const sx=cornerSide(f)==='right'?-1:1,sy=index===0?1:-1;return {...b,index,x:b.x+sx*(b.w-fit.width)/2,y:b.y+sy*(b.d-fit.depth)/2,w:fit.width,d:fit.depth};});}
// Contacts are independent of the user's choice to keep each side panel.
function cornerConnections(f,m,blinds=cornerLayout(f)){const a=m.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),depth=m.depth??f.kitchen.depth;return blinds.flatMap(b=>{const x=(b.x-m.x)*c+(b.y-m.y)*s,y=-(b.x-m.x)*s+(b.y-m.y)*c,w=b.width??Math.abs(b.w*c)+Math.abs(b.d*s),d=b.depth??Math.abs(b.w*s)+Math.abs(b.d*c),back=Math.max(-depth/2,y-d/2),front=Math.min(depth/2,y+d/2);return Math.abs(Math.abs(x)-(m.width+w)/2)<.01&&front-back>.01?[{side:x<0?'left':'right',back,front}]:[];});}
function adjacentOpenings(f,m,blinds=cornerLayout(f),mirrored=false){return cornerConnections(f,m,blinds).map(o=>({...o,side:mirrored?(o.side==='left'?'right':'left'):o.side})).filter(o=>!cornerPartition(m,o.side));}
function adjacentSides(f,m,blinds=cornerLayout(f)){return adjacentOpenings(f,m,blinds).map(o=>o.side);}
// Shelf levels are measured above the base's inner floor, as in cabinet-core.
function moduleShelves(m,h,wall=false){return m.role==='door'?m.shelves??[Math.round((h-(wall?36:140))/2)]:[];}
function cornerShelves(f,index){return cornerLayout(f)[index]?moduleShelves({role:'door'},f.kitchen.baseHeight,isWall(f)):[];}
// Two hollow corners in U; the second reflects the first toward the opposite run.
function cornerBoards(f,blocks=cornerLayout(f)){const t=18,h=f.kitchen.baseHeight,p=plinth(f);return blocks.flatMap((b,i)=>{const sign=i===1?-1:1,back=b.y-sign*b.d/2,sx=cornerSide(f)==='right'?1:-1,side=b.x+sx*(b.w-t)/2,shelves=b.shelves??cornerShelves(f,b.index??i);return [{x:b.x,y:b.y,w:b.w,d:b.d,bottom:p,top:p+t},{x:b.x,y:b.y,w:b.w,d:b.d,bottom:h-t,top:h},{x:b.x,y:back+sign*t/2,w:b.w,d:t,bottom:p+t,top:h-t},{x:side,y:b.y,w:t,d:b.d,bottom:p+t,top:h-t},...shelves.map(level=>({x:b.x-sx*t/2,y:b.y+sign*t/2,w:b.w-t,d:b.d-t,bottom:p+t+level,top:p+2*t+level,shelf:true}))].map(row=>({...row,cornerIndex:b.index??i}));});}
// Match the adjacent production base's 100 mm plinth and 40 mm front recess.
function cornerPlinth(f,blocks=cornerLayout(f)){if(isWall(f))return [];const sign=cornerSide(f)==='right'?-1:1,recess=40;return blocks.flatMap((b,i)=>{const v=i===1?-1:1,back=b.y-v*b.d/2;return [{x:b.x,y:back+v*(b.d-recess)/2,w:b.w,d:b.d-recess,bottom:0,top:100},{x:b.x-sign*recess/2,y:back+v*(b.d-recess/2),w:b.w-recess,d:recess,bottom:0,top:100}].map(row=>({...row,cornerIndex:b.index??i}));});}

// Temporary straight rows for each bent kitchen run, viewed from its own front. Never saved.
function elevationRuns(f){
 validate(f);
 if(f.kitchen.shape==='U')return runs(f).map(run=>{
  const k=f.kitchen,all=layout(f),sample=all.find(m=>m.run===run),angle=sample.rot*Math.PI/180,axis=[Math.cos(angle),Math.sin(angle)],project=p=>(p.x*axis[0]+p.y*axis[1])*(f.flip?-1:1);
  const depth=runDepth(f,run),D=runCounterDepth(f,run),corners=cornerBlocks(f).map((b,index)=>({...b,index})).filter(b=>run===1||b.index===(run===0?0:1)),slots=[...all.filter(m=>m.run===run).map(m=>({index:m.index,module:clone(k.modules[m.index]),at:project(m)})),...corners.map(b=>({index:null,cornerIndex:b.index,nominal:b,module:{run:0,width:run===1?b.d:b.w,role:'empty'},at:project(b)}))].sort((a,b)=>a.at-b.at);
  const ext=extension(f,run),end=endLayout(f).find(m=>m.run===run),flip=!!end&&project(end)<slots[0].at;if(flip)slots.reverse();const modules=slots.map(s=>({...s.module,run:0})),length=modules.reduce((sum,m)=>sum+m.width,0),row={...clone(f),cx:0,cy:0,rot:0,flip,w:length+ext.length,d:D,kitchen:{...clone(k),shape:'straight',depth,counterDepth:D,modules}};
  delete row.kitchen.runDepths;delete row.kitchen.endExtensions;delete row.kitchen.obstacleFit;if(ext.length)row.kitchen.endExtensions=[{...ext,run:0}];const depths=slots.flatMap((s,i)=>{const fit=k.obstacleFit?.depths.find(r=>r.index===s.index);return fit?[{index:i,depth:fit.depth}]:[];}),endFit=end&&k.obstacleFit?.depths.find(r=>r.index===end.index);if(endFit)depths.push({index:modules.length,depth:endFit.depth});if(depths.length)row.kitchen.obstacleFit={depths,cuts:[]};const bounds=layout(row),blinds=slots.flatMap((s,i)=>{if(s.index!==null)return [];const fit=cornerLayout(f)[s.cornerIndex],w=run===1?fit.d:fit.w,d=run===1?fit.w:fit.d;return [{x:bounds[i].x+(project(fit)-project(s.nominal))*(flip?-1:1),y:bounds[i].y+(depth-d)/2,width:w,depth:d,shelves:cornerShelves(f,s.cornerIndex)}];});
  return {run,title:runName(f,run)+'正视',indices:slots.map(s=>s.index),endIndex:k.modules.length+run,mirror:!!f.flip!==flip,blind:blinds,furniture:row};
 });
 if(f.kitchen.shape!=='L')return [];
 const k=f.kitchen,right=cornerSide(f)==='right';
 return [0,1].map(run=>{
  const reverse=run===0?!!f.flip:(!right !== !!f.flip),indices=k.modules.map((m,i)=>m.run===run?i:null).filter(i=>i!==null);
  let slots=indices.map(index=>({index,module:clone(k.modules[index])}));
  const blind={index:null,module:{run:0,width:k.depth,role:'empty'}};
  if(run===1||!right)slots.unshift(blind);else slots.push(blind);
  const ext=extension(f,run),flip=ext.length>0&&((run===0&&right)!==reverse);if(reverse!==flip)slots.reverse();
  const modules=slots.map(s=>({...s.module,run:0})),length=modules.reduce((sum,m)=>sum+m.width,0);
  const row={...clone(f),cx:0,cy:0,rot:0,flip,w:length+ext.length,d:counterDepth(f),kitchen:{...clone(k),shape:'straight',modules}};
  delete row.kitchen.obstacleFit;const depths=slots.flatMap((s,i)=>{const fit=f.kitchen.obstacleFit?.depths.find(r=>r.index===s.index);return fit?[{index:i,depth:fit.depth}]:[];});const endFit=f.kitchen.obstacleFit?.depths.find(r=>r.index===f.kitchen.modules.length+run);if(endFit)depths.push({index:modules.length,depth:endFit.depth});if(depths.length)row.kitchen.obstacleFit={depths,cuts:[]};delete row.kitchen.endExtensions;if(ext.length)row.kitchen.endExtensions=[{...ext,run:0}];const bounds=layout(row),at=slots.findIndex(s=>s===blind);
  const nominal=cornerBlocks(f)[0],fit=cornerLayout(f)[0],sample=layout(f).find(m=>m.run===run),angle=sample.rot*Math.PI/180,project=p=>(p.x*Math.cos(angle)+p.y*Math.sin(angle))*(f.flip?-1:1),depth=run===0?fit.d:fit.w;
  return {run,title:run===0?'主边正视':'转角边正视',indices:slots.map(s=>s.index),endIndex:f.kitchen.modules.length+run,mirror:reverse!==flip,blind:{x:bounds[at].x+(project(fit)-project(nominal))*(flip?-1:1),y:bounds[at].y+(k.depth-depth)/2,width:run===0?fit.w:fit.d,depth,shelves:cornerShelves(f,0)},furniture:row};
 });
}
function slabs(f){
 if(f.kitchen.shape==='U'){
  const b=bodyBounds(f),d1=runDepth(f,1),D0=runCounterDepth(f,0),D1=runCounterDepth(f,1),D2=runCounterDepth(f,2),rect=(x,y,w,d)=>({x:b.x+(b.right?b.w-x:x),y:b.y+y,w,d});
  const a=d1+runLength(f,0),c=d1+runLength(f,2),parts=[rect(a/2,D0/2,a,D0),rect(D1/2,(b.d+D0-D2)/2,D1,b.d-D0-D2),rect(c/2,b.d-D2/2,c,D2)];
  for(const run of endRuns(f)){const e=extension(f,run);if(e.length)parts.push(rect(d1+runLength(f,run)+e.length/2,run===0?e.depth/2:b.d-e.depth/2,e.length,e.depth));}
  return parts;
 }
 const k=f.kitchen,b=bodyBounds(f),depth=counterDepth(f),parts=[{x:b.x+b.w/2,y:b.y+depth/2,w:b.w,d:depth}];if(k.shape==='L')parts.push({x:b.x+(b.right?b.w-depth/2:depth/2),y:b.y+(b.d+depth)/2,w:depth,d:b.d-depth});for(const run of [0,1]){const e=extension(f,run);if(!e.length)continue;parts.push(run===0?{x:b.right?b.x-e.length/2:b.x+b.w+e.length/2,y:b.y+e.depth/2,w:e.length,d:e.depth}:{x:b.x+(b.right?b.w-e.depth/2:e.depth/2),y:b.y+b.d+e.length/2,w:e.depth,d:e.length});}return parts;}
// Walk the continuous top perimeter from the outside corner, including narrowed ends.
function outline(f){
 if(f.kitchen.shape==='U'){
  const b=bodyBounds(f),D0=runCounterDepth(f,0),D1=runCounterDepth(f,1),D2=runCounterDepth(f,2),a=extension(f,0),e=extension(f,2),l0=runDepth(f,1)+runLength(f,0),l2=runDepth(f,1)+runLength(f,2),points=[[0,0],[l0+a.length,0]];
  if(a.length)points.push([l0+a.length,a.depth],[l0,a.depth]);
  points.push([l0,D0],[D1,D0],[D1,b.d-D2],[l2,b.d-D2]);
  if(e.length)points.push([l2,b.d-e.depth],[l2+e.length,b.d-e.depth]);
  points.push([l2+e.length,b.d],[0,b.d]);
  const clean=points.filter((p,i)=>!i||p[0]!==points[i-1][0]||p[1]!==points[i-1][1]).map(([u,v])=>[b.x+(b.right?b.w-u:u),b.y+v]);
  return b.right?clean.reverse():clean;
 }
 const b=bodyBounds(f),D=counterDepth(f),a=extension(f,0),e=extension(f,1),points=[[0,0],[b.w+a.length,0]];if(a.length)points.push([b.w+a.length,a.depth],[b.w,a.depth]);points.push([b.w,D]);if(f.kitchen.shape==='straight')points.push([0,D]);else {points.push([D,D],[D,b.d]);if(e.length)points.push([e.depth,b.d],[e.depth,b.d+e.length]);points.push([0,b.d+e.length]);}const clean=points.filter((p,i)=>!i||p[0]!==points[i-1][0]||p[1]!==points[i-1][1]).map(([u,v])=>[b.x+(b.right?b.w-u:u),b.y+v]);return b.right?clean.reverse():clean;}
function frontEdges(f){const points=topGeometry(f).rings.find(r=>zones().signed(r)>0)||outline(f),b=bodyBounds(f),a=extension(f,0),edges=[];for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length],dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy);if(!length)continue;const normal=[dy/length,-dx/length],u=b.right?b.x+b.w-p[0]:p[0]-b.x;if(f.kitchen.shape==='U'?(normal[1]>0&&p[1]<=b.y+runCounterDepth(f,0)+.01||normal[1]<0&&p[1]>=b.y+b.d-runCounterDepth(f,2)-.01||normal[0]===(b.right?-1:1)&&(u<runCounterDepth(f,1)+.01||endRuns(f).some(run=>Math.abs(u-runDepth(f,1)-runLength(f,run))<.01&&extension(f,run).length>0))):normal[1]>0||f.kitchen.shape==='L'&&normal[0]===(b.right?-1:1)&&u<counterDepth(f)+.01||a.length&&normal[0]===(b.right?-1:1)&&Math.abs(u-b.w)<.01&&a.depth<counterDepth(f))edges.push({a:p,b:q,normal});}return edges;}
function edgeParts(f){const k=f.kitchen,h=dropHeight(f);if(!h)return [];const t=Math.min(k.thickness,20),parts=frontEdges(f).map(e=>({x:(e.a[0]+e.b[0])/2-e.normal[0]*t/2,y:(e.a[1]+e.b[1])/2-e.normal[1]*t/2,w:Math.abs(e.b[0]-e.a[0])||t,d:Math.abs(e.b[1]-e.a[1])||t,bottom:k.baseHeight-h,top:k.baseHeight,normal:e.normal}));if(k.shape!=='straight'){const b=bodyBounds(f),D=runCounterDepth(f,1),n=b.right?-1:1;for(const v of (k.shape==='U'?[1,-1]:[1])){const c=[b.x+(b.right?b.w-D:D),v===1?b.y+runCounterDepth(f,0):b.y+b.d-runCounterDepth(f,2)];parts.push({x:c[0]-n*t/2,y:c[1]-v*t/2,w:t,d:t,bottom:k.baseHeight-h,top:k.baseHeight,normal:[n,v]});}}if(edgeStyle(f)!=='reverse')return parts;const lip=Math.min(t,20),height=Math.min(10,h);return parts.flatMap(p=>[{...p,bottom:p.bottom+height},{...p,x:p.x-p.normal[0]*lip/2,y:p.y-p.normal[1]*lip/2,w:p.w+Math.abs(p.normal[0])*lip,d:p.d+Math.abs(p.normal[1])*lip,top:p.bottom+height}]).filter(p=>p.top>p.bottom);}
function topGeometry(f){const cuts=f.kitchen.obstacleFit?.cuts||[],poly=outline(f);if(!cuts.length)return {poly,rings:[poly],polys:slabs(f).map(rectPoly)};const Z=zones(),pieces=Z.decompose([poly,...cuts],p=>Z.inside(p,poly)&&!cuts.some(c=>Z.inside(p,c)));return Z.outline(pieces);}
function area(f){return zones().area(topGeometry(f).polys)/1e6;}
function world(f,x,y){x*=f.flip?-1:1;const a=(f.rot||0)*Math.PI/180;return [f.cx+x*Math.cos(a)-y*Math.sin(a),f.cy+x*Math.sin(a)+y*Math.cos(a)];}
function local(f,x,y){const a=(f.rot||0)*Math.PI/180,dx=x-f.cx,dy=y-f.cy;return [(dx*Math.cos(a)+dy*Math.sin(a))*(f.flip?-1:1),-dx*Math.sin(a)+dy*Math.cos(a)];}
function footprints(f){if(isWall(f))return [...cabinetLayout(f).filter(m=>m.role!=='empty'),...cornerLayout(f)].map(m=>rectPoly(m).map(p=>world(f,...p)));let pieces=topGeometry(f).polys;if(f.kitchen.obstacleFit?.cuts.length){const Z=zones(),all=[...pieces,...cabinetLayout(f).filter(m=>m.role!=='empty').map(rectPoly),...(f.kitchen.shape!=='straight'?cornerBoards(f).map(rectPoly):[])];pieces=Z.decompose(all,p=>all.some(poly=>Z.inside(p,poly)));}return pieces.map(p=>p.map(([x,y])=>world(f,x,y)));}
function bodyParts(f){if(isWall(f)){const bottom=baseElevation(f);return [...cabinetLayout(f).filter(m=>m.role!=='empty').map(m=>({p:rectPoly(m).map(p=>world(f,...p)),vertical:{bottom,top:bottom+f.kitchen.baseHeight}})),...cornerBoards(f).map(m=>({p:rectPoly(m).map(p=>world(f,...p)),vertical:{bottom:bottom+m.bottom,top:bottom+m.top}}))];}const k=f.kitchen,poly=s=>[[-s.w/2,-s.d/2],[s.w/2,-s.d/2],[s.w/2,s.d/2],[-s.w/2,s.d/2]].map(([x,y])=>world(f,x+s.x,y+s.y)),lower=cabinetLayout(f).filter(m=>m.role!=='empty');return [...(k.shape!=='straight'?[...cornerBoards(f),...cornerPlinth(f)].map(s=>({p:poly(s),vertical:{bottom:s.bottom,top:s.top}})):[]),...lower.map(s=>({p:poly(s),vertical:{bottom:0,top:k.baseHeight}})),...topGeometry(f).polys.map(p=>({p:p.map(([x,y])=>world(f,x,y)),vertical:{bottom:k.baseHeight,top:k.baseHeight+k.thickness}})),...edgeParts(f).map(s=>({p:poly(s),vertical:{bottom:s.bottom,top:s.top}}))];}
const sinkProducts=()=>root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);
const arrowSink=f=>sinkProducts().family(f,'arrow-sink');
const isSink=f=>f.type==='ksink'||arrowSink(f);
const isDevice=f=>isSink(f)||['stove','stove_fotile_th36b'].includes(f.type);
const sinkMode=f=>{const R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);return R.value(f,'sinkInstall');};
const cutout=f=>arrowSink(f)?sinkMode(f)==='under'?{w:f.w-40,d:f.d*411/450,r:20*f.d/450}:{w:f.w-20,d:f.d*430/450,r:15*f.d/450}:f.type==='stove_fotile_th36b'?{w:f.w*660/750,d:f.d*350/440}:{w:f.w-30,d:f.d-30};
// Rounded openings share their transforms with the production countertop.
function openingRing(f,spec=cutout(f)){const {w,d}=spec,r=Math.max(0,Math.min(spec.r||0,w/2,d/2)),p=[];for(const [x,y,start] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,90],[-w/2+r,-d/2+r,180],[w/2-r,-d/2+r,270]])for(let j=0;j<=8;j++){const a=(start+j*90/8)*Math.PI/180;p.push([x+r*Math.cos(a),y+r*Math.sin(a)]);}return p;}
function surfaceGeometry(host){const poly=[[-host.w/2,-host.d/2],[host.w/2,-host.d/2],[host.w/2,host.d/2],[-host.w/2,host.d/2]];return host.kitchen?topGeometry(host):{poly,polys:[poly],rings:[poly]};}
function onSurface(f,host){
 if(host.type!=='counter'||host.obj||host.id===f.id)return false;
 try{if(host.kitchen)validate(host);const Z=zones(),surface=surfaceGeometry(host),rect=[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]].map(p=>local(host,...world(f,...p))),pieces=Z.decompose([rect,...surface.polys],p=>Z.inside(p,rect)&&!surface.polys.some(poly=>Z.inside(p,poly)));return Z.area(pieces)<.01;}catch{return false;}
}
function support(f,list){const hosts=list.filter(h=>onSurface(f,h));return hosts.find(h=>h.id===f.counterLink?.hostId)||hosts[0]||null;}
function deviceOpenings(host,list){return list.filter(f=>!f.obj&&(f.counterLink?.hostId===host.id||isSink(f)&&support(f,list)?.id===host.id)).map(f=>{const m=f.counterLink?.hostId===host.id&&host.kitchen?layout(host)[f.counterLink.module]:null,a=(m?.rot||0)*Math.PI/180;return {device:f,ring:openingRing(f).map(p=>m?[m.x+p[0]*Math.cos(a)-p[1]*Math.sin(a),m.y+p[0]*Math.sin(a)+p[1]*Math.cos(a)]:local(host,...world(f,...p)))};});}
function slabGeometry(host,list,recess=false){const Z=zones(),surface=surfaceGeometry(host),cuts=deviceOpenings(host,list).map(({device,ring})=>recess&&arrowSink(device)&&sinkMode(device)==='flush'?openingRing(device,{w:device.w,d:device.d,r:12}).map(p=>local(host,...world(device,...p))):ring);return cuts.length?Z.outline(Z.decompose([...surface.polys,...cuts],p=>surface.polys.some(poly=>Z.inside(p,poly))&&!cuts.some(poly=>Z.inside(p,poly)))):surface;}
function ringArea(ring){return zones().signed(ring);}
function ringInside(point,ring){return zones().inside(point,ring);}
function deviceSignature(host,list){return deviceOpenings(host,list).map(({device:f,ring})=>[f.id,f.type,f.w,f.d,f.h,f.sinkInstall,ring]);}
// Nominal opening within the supplied adjustable range; resizing is a layout approximation.
function validateLink(f){const l=f.counterLink;if(l===undefined)return;if(!isDevice(f)||!l||typeof l!=='object'||typeof l.hostId!=='string'||!l.hostId||l.hostId.length>200||!Number.isInteger(l.module)||l.module<0||l.module>47)throw Error('水槽／灶具的台面关联无效');}
function fit(f,host,index){const m=layout(host)[index],role=isSink(f)?'sink':'hob';if(!m||m.role!==role)throw Error('请选择对应的水槽柜或灶台柜');const angle=m.rot,depth=runDepth(host,m.run);if(f.w>m.width-40||f.d>depth-40)throw Error('设备尺寸须在模块和柜深内保留模型边距 20 mm');return {m,angle};}
function attach(f,host,index){if(f.locked||host.locked)throw Error('请先解锁设备与厨房');fit(f,host,index);return {...f,counterLink:{hostId:host.id,module:index}};}
function normalize(list,before=[]){
 for(const f of list){if(!f.counterLink)continue;const host=list.find(h=>h.id===f.counterLink.hostId&&h.type==='counter'&&h.kitchen&&!h.obj);if(!host){delete f.counterLink;continue;}
  // A broken host needs explicit repair; keep its appliances and links intact.
  try{validate(host);}catch{continue;}
  const old=before.find(o=>o.id===f.id),oldHost=old&&before.find(h=>h.id===old.counterLink?.hostId);
  // Editing an attached appliance's position explicitly detaches it.
  if(old?.counterLink&&oldHost&&host.cx===oldHost.cx&&host.cy===oldHost.cy&&host.rot===oldHost.rot&&!!host.flip===!!oldHost.flip&&(f.cx!==old.cx||f.cy!==old.cy||f.rot!==old.rot||!!f.flip!==!!old.flip)){delete f.counterLink;continue;}
  let result;try{result=fit(f,host,f.counterLink.module);}catch(e){delete f.counterLink;continue;}
  const [x,y]=world(host,result.m.x,result.m.y);f.cx=x;f.cy=y;f.rot=((host.rot||0)+(host.flip?-result.angle:result.angle)+360)%360;f.flip=!!host.flip;f.counterElevation=host.kitchen.baseHeight+host.kitchen.thickness;
 }
 return normalizeSinks(list);
}
function normalizeSinks(list){for(const f of list.filter(v=>arrowSink(v)&&!v.obj&&!v.locked)){const host=support(f,list);if(host)f.counterElevation=sinkProducts().sinkInstallation(f,host).upper;}return list;}
function validateList(list){for(const f of list){validate(f);validateLink(f);if(f.counterLink){const host=list.find(h=>h.id===f.counterLink.hostId&&h.kitchen);if(!host)throw Error('关联的厨房台面不存在');fit(f,host,f.counterLink.module);if(list.some(g=>g!==f&&g.counterLink?.hostId===host.id&&g.counterLink.module===f.counterLink.module))throw Error('同一厨房模块只能关联一件水槽或灶具');}}}
function moduleFurniture(f,m){const C=cabinet(),spec=C.preset('base'),c=spec.cabinet;kitchenModuleConfig(c,m,f.kitchen.baseHeight,dropHeight(f),f.kitchen,isWall(f));if(f.kitchen.doorOverlay!==undefined)c.doorOverlay=f.kitchen.doorOverlay;const [cx,cy]=world(f,m.x,m.y),part={...f,kitchen:undefined,type:isWall(f)?'kitchenwall':'cabinet',w:m.width,d:m.depth??f.kitchen.depth,h:f.kitchen.baseHeight,cabinet:c,cx,cy,rot:((f.rot||0)+(f.flip?-m.rot:m.rot)+360)%360};if(m.role==='custom'){if(!m.structure||!isWall(f)||Object.keys(m.structure).some(key=>!['w','d','h','cabinet'].includes(key))||![m.structure.w,m.structure.d,m.structure.h].every(Number.isFinite))throw Error('吊柜保留结构缺少尺寸基准');const source={...part,...clone(m.structure),type:'kitchenwall',kitchen:undefined};C.validate(source);const target={...source,w:part.w,d:part.d,h:part.h,cx,cy,rot:part.rot,flip:part.flip};return part.h===source.h?C.validate(C.scaleWidths(source,target)):C.resize(source,target);}return part;}
function fromWall(f){if(!isWall(f)||f.obj)throw Error('请选择厨房吊柜');if(f.kitchen)return clone(f);const C=cabinet(),c=C.config(f),h=C.height(f);C.validate({...f,h,cabinet:c});return configure(f,{version:1,shape:'straight',depth:f.d,baseHeight:h,thickness:0,modules:[{run:0,width:f.w,role:'custom',structure:{w:f.w,d:f.d,h,cabinet:c}}]});}
function moduleShelfLimits(f,index,shelf){const m=cabinetLayout(f).find(m=>m.index===index);if(!isWall(f)||m?.role!=='door')throw Error('请选择吊柜门柜层板');return cabinet().shelfLimits(moduleFurniture(f,m),0,shelf);}
function moveModuleShelf(f,index,shelf,value){if(f.locked)throw Error('请先解锁吊柜');const m=cabinetLayout(f).find(m=>m.index===index);moduleShelfLimits(f,index,shelf);const part=cabinet().moveShelf(moduleFurniture(f,m),0,shelf,value),k=clone(f.kitchen);k.modules[index].shelves=part.cabinet.columns[0].shelves;return configure(f,k);}
function snapModuleShelf(f,index,shelf,value){const m=cabinetLayout(f).find(m=>m.index===index),limits=moduleShelfLimits(f,index,shelf),targets=cabinetLayout(f).filter(v=>v.index!==index&&v.run===m.run&&v.role==='door').flatMap(v=>moduleShelves(v,f.kitchen.baseHeight,true));let next=value,best=8;for(const target of targets)if(target>=limits.min&&target<=limits.max&&Math.abs(value-target)<=best){next=target;best=Math.abs(value-target);}return next;}
function hoodHosts(f){return isWall(f)&&f.kitchen?cabinetLayout(f).filter(m=>m.role==='custom').map(m=>moduleFurniture(f,m)).filter(part=>cabinet().hoodBay(part)):[];}
function kitchenModuleConfig(c,m,h,drop=0,k={},wall=false){
 const r=drawerRules(wall?{type:'kitchenwall'}:undefined);
 c.template='kitchen-base';if(m.backPanel!==undefined)c.backPanel=m.backPanel;c.plinth=r.plinth;c.autoDoors=false;if(m.door===undefined)c.autoFrontWidth=m.width;else delete c.autoFrontWidth;if(k.doorMaxAngle!==undefined)c.doorMaxAngle=k.doorMaxAngle;if(drop)c.frontTop=h-drop;else delete c.frontTop;
 const front=h-drop,drawer=Math.max(r.legacyMin,(front-r.legacyOffset)/r.defaultCount),door=m.role==='drawer'||m.role==='empty'?'none':m.door??'left';let drawers=[];
 if(m.role==='drawer'){
  drawers=m.drawerHeights?m.drawerHeights.map((height,i,values)=>({height:height-c.thickness*((i===0?1:0)+(i===values.length-1?1:0)),open:!!m.drawerOpen?.[i]})):Array.from({length:r.defaultCount},(_,i)=>({height:drawer,open:!!m.drawerOpen?.[i]}));
  // Absorb accepted sub-millimetre sum tolerance in the top box, never in the saved tiers.
  if(m.drawerHeights){const prior=drawers.slice(0,-1).reduce((sum,d)=>sum+d.height,0);drawers.at(-1).height=front-c.plinth-2*c.thickness-prior-1e-8;}
 }
 c.columns=[{door,doorOpen:door!=='none'&&!!m.doorOpen,...(m.doorMaxAngle!==undefined?{doorMaxAngle:m.doorMaxAngle}:{}),...(m.doorAngle!==undefined?{doorAngle:m.doorAngle}:{}),...(m.doorLeaves?{doorLeaves:clone(m.doorLeaves)}:{}),shelves:moduleShelves(m,h,wall),drawers}];return c;
}

function toggle(f,index,drawer,open,leaf,bay=0,lid=false,lane,section){if(f.locked)throw Error('请先解锁厨房');const next=clone(f),m=next.kitchen.modules[index]??next.kitchen.endExtensions?.find(e=>e.run===index-next.kitchen.modules.length&&e.length);if(m?.role==='custom'){const part=moduleFurniture(next,{...cabinetLayout(next).find(v=>v.index===index)}),edited=open===undefined?cabinet().toggle(part,bay,drawer,lid,lane,section):clone(part);if(open!==undefined)for(const col of edited.cabinet.columns){col.doorOpen=open&&col.door!=='none';if(col.doorOpen)col.doorAngle=cabinet().maxDoorAngle(edited.cabinet,col);if(col.top==='drawer')col.topOpen=open;for(const d of col.drawers){d.open=open;d.lanes?.forEach(v=>v.open=open);}}m.structure={w:edited.w,d:edited.d,h:edited.h,cabinet:edited.cabinet};return validate(next);}if(!m||m.role==='empty'||moduleDoor(f,m)==='none'&&m.role!=='drawer')throw Error('该模块没有柜门或抽屉');if(m.role==='drawer'){if(!Number.isInteger(drawer)||drawer<0||drawer>=drawerHeights(f,m).length)throw Error('请选择抽屉');const values=m.drawerOpen??Array(drawerHeights(f,m).length).fill(false);m.drawerOpen=[...values];m.drawerOpen[drawer]=open??!values[drawer];}else if(leaf!==undefined){const count=moduleLeafCount(next,m);if(!Number.isInteger(leaf)||leaf<0||leaf>=count)throw Error('请选择有效门扇');m.doorLeaves=Array.from({length:count},(_,j)=>clone(moduleLeafState(next,m,j)));const state=m.doorLeaves[leaf];state.open=open??!state.open;if(state.open)state.angle=moduleMaxAngle(next,m);m.doorOpen=m.doorLeaves.some(s=>s.open);if(m.doorOpen)m.doorAngle=moduleMaxAngle(next,m);}else{m.doorOpen=open??!m.doorOpen;if(m.doorOpen)m.doorAngle=moduleMaxAngle(next,m);if(m.doorLeaves)m.doorLeaves.forEach(s=>{s.open=m.doorOpen;if(s.open)s.angle=moduleMaxAngle(next,m);});}return validate(next);}
function specification(f){const k=clone(f.kitchen);[...k.modules,...(k.endExtensions||[])].forEach((m,i)=>{delete m.doorOpen;delete m.doorAngle;delete m.doorLeaves;delete m.drawerOpen;if(m.structure){const part=moduleFurniture(f,cabinetLayout(f).find(v=>v.index===i));m.structure={w:part.w,d:part.d,h:part.h,cabinet:cabinet().specification(part)};}});return k;}
function openingZones(f,options){const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);return cabinetLayout(f).filter(m=>m.role!=='empty').flatMap(m=>C.openingZones(moduleFurniture(f,m),options).map(z=>({...z,column:m.index,...(m.role==='custom'?{bay:z.column}:{})})));}
// Clip convex obstacle pieces to a module-width strip. Front stays fixed.
function clipAxis(poly,axis,edge,sign){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],inside=sign*(a[axis]-edge)>=-1e-8,next=sign*(b[axis]-edge)>=-1e-8;if(inside)out.push(a);if(inside!==next){const t=(edge-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}return out;}
function adaptObstacles(f,plan,list=[]){
 const next=clone(f),k=next.kitchen,notes=[];if(!k||f.locked)return {furniture:next,notes};delete k.obstacleFit;validate(next);if(!k.autoAvoid)return {furniture:next,notes};
 const Z=zones(),G=root.FurnishGeometry||(typeof require==='function'?require('./layout-geometry.js'):null),R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null),Draft=root.FurnishDraft||(typeof require==='function'?require('./floorplan-core.js'):null),obstacles=[];
 const add=(p,vertical,name)=>{if(!p?.length)return;obstacles.push({p:p.map(([x,y])=>local(next,x,y)),vertical:vertical?{...vertical,bottom:vertical.bottom-baseElevation(next),top:vertical.top-baseElevation(next)}:null,name});};
 for(const w of plan.walls||[])add([[w[0],w[1]],[w[2],w[1]],[w[2],w[3]],[w[0],w[3]]],{bottom:0,top:w[4]==='low'?Math.min(1000,plan.ceilingHeight??2800):plan.ceilingHeight??2800},'墙体');
 for(const b of plan.beams||[]){const v=Draft.beamVertical(b,plan.ceilingHeight??2800);add(b.poly,v?.assumed?null:v,b.name||'房梁');}
 for(const other of list){if(other.id===f.id||other.kitchen||!G.solidForCollision(other)||R.modelError(other))continue;for(const part of G.bodyParts(other))add(part.p,part.vertical,other.name||'障碍物');}
 const overlapsHeight=(v,lo,hi)=>v&&Math.min(v.top,hi)-Math.max(v.bottom,lo)>1e-6,depths=[],cuts=[],corners=[],top=outline(next),linked=new Set(list.filter(v=>v.counterLink?.hostId===f.id).map(v=>v.counterLink.module));
 const usable=obstacles.map(o=>({...o,pieces:Z.decompose([o.p],p=>Z.inside(p,o.p))}));
 for(const m of cabinetLayout(next)){
  if(m.role==='empty')continue;const nominal=m.depth??k.depth,angle=m.rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);let back=-nominal/2;
  for(const o of usable){if(!overlapsHeight(o.vertical,plinth(f),k.baseHeight))continue;for(const piece of o.pieces){let p=piece.map(([x,y])=>[(x-m.x)*c+(y-m.y)*s,-(x-m.x)*s+(y-m.y)*c]);for(const [axis,edge,sign] of [[0,-m.width/2,1],[0,m.width/2,-1],[1,-nominal/2,1],[1,nominal/2,-1]])p=clipAxis(p,axis,edge,sign);if(p.length>2&&Math.abs(Z.signed(p))>.01)back=Math.max(back,...p.map(v=>v[1]));}}
  const depth=Math.round((nominal/2-back)*1e6)/1e6;if(depth>=nominal-1e-5)continue;
  if(m.role!=='door'||linked.has(m.index)){notes.push(`模块 ${m.index+1} 含设备或抽屉，保留柜深，请手动核对`);continue;}
  if(depth<avoidanceRules().minDepth-1e-6){notes.push(`模块 ${m.index+1} 剩余柜深不足 ${avoidanceRules().minDepth} mm，保留原柜体，请调整位置`);continue;}
  depths.push({index:m.index,depth:Math.max(avoidanceRules().minDepth,depth)});
 }
 for(const [index,b] of cornerBlocks(next).entries()){
  const sx=cornerSide(next)==='right'?-1:1,sy=index===0?1:-1,min=avoidanceRules().minDepth;let ix=0,iy=0;
  for(const o of usable){if(!overlapsHeight(o.vertical,plinth(f),k.baseHeight))continue;for(const piece of o.pieces){let p=piece.map(([x,y])=>[(x-b.x)*sx+b.w/2,(y-b.y)*sy+b.d/2]);for(const [axis,edge,sign] of [[0,ix,1],[0,b.w,-1],[1,iy,1],[1,b.d,-1]])p=clipAxis(p,axis,edge,sign);if(p.length<3||Math.abs(Z.signed(p))<=.01)continue;
    const xmin=Math.min(...p.map(q=>q[0])),ymin=Math.min(...p.map(q=>q[1])),xmax=Math.max(...p.map(q=>q[0])),ymax=Math.max(...p.map(q=>q[1])),options=[];
    if(xmin<=ix+1e-5&&b.w-xmax>=min-1e-6)options.push({axis:0,value:xmax,loss:(xmax-ix)*(b.d-iy)});
    if(ymin<=iy+1e-5&&b.d-ymax>=min-1e-6)options.push({axis:1,value:ymax,loss:(ymax-iy)*(b.w-ix)});
    options.sort((a,b)=>a.loss-b.loss);if(!options.length){notes.push(`转角 ${index+1} 无法从背面安全让空，请手动核对`);continue;}if(options[0].axis===0)ix=options[0].value;else iy=options[0].value;
  }}
  if(ix>1e-5||iy>1e-5)corners.push({index,width:Math.max(min,Math.round((b.w-ix)*1e6)/1e6),depth:Math.max(min,Math.round((b.d-iy)*1e6)/1e6)});
 }
 for(const o of usable){if(!o.vertical){if(Z.area(Z.decompose([top,o.p],p=>Z.inside(p,top)&&Z.inside(p,o.p)))>.01)notes.push(`${o.name} 高度未知，未自动减薄或切台面`);continue;}if(!overlapsHeight(o.vertical,k.baseHeight,k.baseHeight+k.thickness))continue;
  if(Z.area(Z.decompose([top,o.p],p=>Z.inside(p,top)&&Z.inside(p,o.p)))<=.01)continue;
  const protects=layout(next).filter(m=>linked.has(m.index)).some(m=>Z.area(Z.decompose([rectPoly(m),o.p],p=>Z.inside(p,rectPoly(m))&&Z.inside(p,o.p)))>.01);
  if(protects){notes.push(`${o.name} 影响已关联设备模块，台面保留并提示冲突`);continue;}
  const clipped=o.pieces.map(piece=>{let p=piece;for(const [axis,edge,sign] of [[0,-f.w/2,1],[0,f.w/2,-1],[1,-f.d/2,1],[1,f.d/2,-1]])p=clipAxis(p,axis,edge,sign);return p;}).filter(p=>p.length>2&&Math.abs(Z.signed(p))>.01),proposed=[...cuts,...clipped],remaining=Z.outline(Z.decompose([top,...proposed],p=>Z.inside(p,top)&&!proposed.some(poly=>Z.inside(p,poly))));
  if(remaining.rings.filter(r=>Z.signed(r)>0).length!==1){notes.push(`${o.name} 会切断或移除台面，保留原台面并提示冲突`);continue;}
  if(proposed.length>100){notes.push('障碍物过多，未继续自动切台面');break;}cuts.push(...clipped);
 }
 if(depths.length||cuts.length||corners.length)k.obstacleFit={depths,cuts,...(corners.length?{corners}:{})};validate(next);return {furniture:next,notes};
}
function normalizeObstacles(list,plan){if(!list.some(f=>f.kitchen?.autoAvoid))return list;const source=clone(list);for(const f of list){if(!f.kitchen?.autoAvoid||f.locked)continue;try{f.kitchen=adaptObstacles(f,plan,source).furniture.kitchen;}catch{/* Broken models keep their existing record and review warning. */}}return list;}
const api={isWall,plinth,baseElevation,bodyHeight,moduleRoles,fromWall,snapModuleShelf,moveModuleShelf,moduleShelfLimits,hoodHosts,drawerBoundaryTargets,resizeDrawerBoundary,drawerRules,drawerSpan,drawerHeights,setDrawerCount,setDrawerHeight,slabGeometry,ringArea,ringInside,isSink,arrowSink,sinkMode,openingRing,surfaceGeometry,onSurface,support,deviceOpenings,deviceSignature,normalizeSinks,dividerHandles,resizeDivider,depthRules,endResizeRules,extensionHandles,resizeExtension,partitionRules,cornerPartition,cornerConnections,moduleShelves,cornerShelves,adjacentOpenings,cornerLayout,runDepth,runCounterDepth,outerEdge,resizeOuter,runHandles,resizeRun,changeShape,shapeRules,runs,endRuns,runName,runNormal,runLength,cornerBlocks,adjacentSides,isDevice,cutout,roles,edgeStyles,counterDepth,extension,bodyBounds,cornerPlinth,endLayout,cabinetLayout,cornerBoards,edgeStyle,dropHeight,defaults,cornerSide,cornerBlock,validate,configure,resize,repairDimensions,layout,elevationRuns,slabs,outline,frontEdges,edgeParts,area,topGeometry,avoidanceRules,adaptObstacles,normalizeObstacles,world,local,footprints,bodyParts,validateLink,fit,attach,normalize,validateList,moduleFurniture,kitchenModuleConfig,moduleDoor,moduleLeafCount,moduleLeafState,moduleLeafAngle,moduleMaxAngle,moduleAngle,toggle,specification,openingZones};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishKitchen=api;
})(typeof globalThis!=='undefined'?globalThis:this);
