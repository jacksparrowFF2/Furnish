/* Kitchen assemblies and countertop attachments, millimetres; no app state. */
(function(root){
'use strict';
const roles={door:'门柜',drawer:'抽屉柜',sink:'水槽柜',hob:'灶台柜',empty:'设备空位'};
const edgeStyles={plain:'单板无下挂',square:'直角下挂',reverse:'反收下挂',bevel:'45°斜切下挂'};
const cornerSide=f=>f.kitchen.corner??'left';
const counterDepth=f=>f.kitchen.counterDepth??f.kitchen.depth;
const edgeStyle=f=>f.kitchen.edgeStyle??'plain';
const dropHeight=f=>['square','reverse'].includes(edgeStyle(f))?(f.kitchen.dropHeight??20):0;
const clone=v=>JSON.parse(JSON.stringify(v));
const cabinet=()=>root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);
const moduleDoor=(f,m)=>m.role==='drawer'||m.role==='empty'?'none':m.door??'auto';
const moduleMaxAngle=(f,m)=>cabinet().maxDoorAngle(f.kitchen,m);
const moduleAngle=(f,m)=>moduleDoor(f,m)==='none'?0:cabinet().doorAngle(f.kitchen,m);
function defaults(f){const n=Math.max(1,Math.ceil(f.w/600));return {version:1,shape:'straight',depth:f.d,baseHeight:820,thickness:40,modules:Array.from({length:n},()=>({run:0,width:f.w/n,role:'door'}))};}
function validate(f){
 if(!f.kitchen)return f;const k=f.kitchen,finite=Number.isFinite;
 if(![f.w,f.d].every(v=>finite(v)&&v>0&&v<=20000))throw Error('厨房外包宽深须在 0–20000 mm 内');
 if(k.corner!==undefined&&!['left','right'].includes(k.corner))throw Error('厨房转角须为左转角或右转角');
 if(k.doorOverlay!==undefined&&!['full','half','inset'].includes(k.doorOverlay))throw Error('厨房柜门盖板方式无效');
 cabinet().validateDoorSettings(k);
 if(k.counterDepth!==undefined&&(!finite(k.counterDepth)||k.counterDepth<k.depth||k.counterDepth>k.depth+100))throw Error('台面深度须不小于柜深，前沿挑出最多 100 mm');
 if(k.edgeStyle!==undefined&&!Object.hasOwn(edgeStyles,k.edgeStyle)||k.dropHeight!==undefined&&(!finite(k.dropHeight)||k.dropHeight<0||k.dropHeight>100))throw Error('台面下挂样式或高度无效（0–100 mm）');
 if(f.type!=='counter'||f.obj||!k||k.version!==1||!['straight','L'].includes(k.shape)||![k.depth,k.baseHeight,k.thickness].every(finite)||k.depth<300||k.depth>1200||k.baseHeight<400||k.baseHeight>1200||k.thickness<10||k.thickness>100||!Array.isArray(k.modules)||!k.modules.length||k.modules.length>48)throw Error('厨房配置无效：柜深 300–1200、柜高 400–1200、台面厚 10–100 mm');
 const sums=[0,0];for(const m of k.modules){if(!m||![0,1].includes(m.run)||!Object.hasOwn(roles,m.role)||!finite(m.width)||m.width<150||m.width>3000)throw Error('厨房模块宽须为 150–3000 mm，功能与所在边须有效');cabinet().validateDoorSettings(m);if(m.doorOpen!==undefined&&typeof m.doorOpen!=='boolean'||m.drawerOpen!==undefined&&(!Array.isArray(m.drawerOpen)||m.drawerOpen.length!==3||m.drawerOpen.some(v=>typeof v!=='boolean')))throw Error('厨房模块开合状态无效');sums[m.run]+=m.width;}
 if(k.shape==='straight'?(sums[1]!==0||Math.abs(f.d-counterDepth(f))>.01||Math.abs(f.w-sums[0])>.01):(sums[0]<150||sums[1]<150||Math.abs(f.w-k.depth-sums[0])>.01||Math.abs(f.d-k.depth-sums[1])>.01))throw Error('厨房外包尺寸须与模块长度及转角一致');
 return f;
}
function configure(f,k){if(f.locked)throw Error('家具已锁定，请先解锁');const next={...f,kitchen:clone(k)};const sum=run=>k.modules.filter(m=>m.run===run).reduce((n,m)=>n+m.width,0);next.w=sum(0)+(k.shape==='L'?k.depth:0);next.d=k.shape==='L'?k.depth+sum(1):counterDepth(next);if(f.kitchen&&k.counterDepth!==undefined&&k.shape==='straight'&&f.kitchen.shape==='straight'){const delta=(next.d-f.d)/2,a=(f.rot||0)*Math.PI/180;next.cx=f.cx-delta*Math.sin(a);next.cy=f.cy+delta*Math.cos(a);}for(const m of next.kitchen.modules){if(m.role==='drawer'||m.role==='empty')for(const key of ['door','doorOpen','doorAngle','doorMaxAngle'])delete m[key];if(moduleDoor(next,m)==='none'){delete m.doorOpen;delete m.doorAngle;}if(m.role!=='drawer')delete m.drawerOpen;}delete next.h;delete next.cabinet;return validate(next);}
function resize(f,next){const k=clone(f.kitchen);if(k.shape==='straight'){const extra=counterDepth(f)-k.depth;k.depth=next.d-extra;if(k.counterDepth!==undefined)k.counterDepth=next.d;}for(const run of [0,1]){if(run===1&&k.shape==='straight')continue;const old=k.modules.filter(m=>m.run===run).reduce((n,m)=>n+m.width,0),length=(run===0?next.w:next.d)-(k.shape==='L'?k.depth:0);for(const m of k.modules.filter(m=>m.run===run))m.width*=length/old;}return configure(next,k);}
// Explicit, undoable repair. First validate the recorded module structure;
// only reconcile its derived envelope, never invent missing configuration.
function repairDimensions(f,keepEnvelope=true){
 const canonical=configure(f,f.kitchen);
 const repaired=keepEnvelope?resize(canonical,{...canonical,w:f.w,d:f.d}):canonical;
 return {...f,w:repaired.w,d:repaired.d,kitchen:repaired.kitchen};
}
function layout(f){validate(f);const k=f.kitchen,right=cornerSide(f)==='right',offset=[k.shape==='L'&&!right?k.depth:0,k.depth];return k.modules.map((m,index)=>{const start=offset[m.run];offset[m.run]+=m.width;return {...m,index,x:m.run===0?-f.w/2+start+m.width/2:(right?1:-1)*(f.w-k.depth)/2,y:m.run===0?-f.d/2+k.depth/2:-f.d/2+start+m.width/2,w:m.run===0?m.width:k.depth,d:m.run===0?k.depth:m.width,rot:m.run===0?0:right?90:270};});}
function cornerBlock(f){const k=f.kitchen;return {x:(cornerSide(f)==='right'?1:-1)*(f.w-k.depth)/2,y:-f.d/2+k.depth/2,w:k.depth,d:k.depth};}
// Temporary straight rows for viewing each L run from its own front. Never saved.
function elevationRuns(f){
 validate(f);if(f.kitchen.shape!=='L')return [];
 const k=f.kitchen,right=cornerSide(f)==='right';
 return [0,1].map(run=>{
  const reverse=run===0?!!f.flip:(!right !== !!f.flip),indices=k.modules.map((m,i)=>m.run===run?i:null).filter(i=>i!==null);
  let slots=indices.map(index=>({index,module:clone(k.modules[index])}));
  const blind={index:null,module:{run:0,width:k.depth,role:'empty'}};
  if(run===1||!right)slots.unshift(blind);else slots.push(blind);
  if(reverse)slots.reverse();
  const modules=slots.map(s=>({...s.module,run:0})),length=modules.reduce((sum,m)=>sum+m.width,0);
  const row={...clone(f),cx:0,cy:0,rot:0,flip:false,w:length,d:counterDepth(f),kitchen:{...clone(k),shape:'straight',modules}};
  const bounds=layout(row),at=slots.findIndex(s=>s.index===null);
  return {run,title:run===0?'主边正视':'转角边正视',indices:slots.map(s=>s.index),mirror:reverse,blind:{x:bounds[at].x,y:bounds[at].y,width:k.depth},furniture:row};
 });
}
function slabs(f){const k=f.kitchen,depth=counterDepth(f),extra=depth-k.depth;return [{x:0,y:-f.d/2+depth/2,w:f.w,d:depth},...(k.shape==='L'?[{x:cornerBlock(f).x+(cornerSide(f)==='right'?-1:1)*extra/2,y:depth/2,w:depth,d:f.d-depth}]:[])];}
function outline(f){const x=-f.w/2,y=-f.d/2,w=f.w,d=f.d,depth=counterDepth(f);return f.kitchen.shape==='straight'?[[x,y],[x+w,y],[x+w,y+d],[x,y+d]]:cornerSide(f)==='left'?[[x,y],[x+w,y],[x+w,y+depth],[x+depth,y+depth],[x+depth,y+d],[x,y+d]]:[[x,y],[x+w,y],[x+w,y+d],[x+w-depth,y+d],[x+w-depth,y+depth],[x,y+depth]];}
function frontEdges(f){const x=-f.w/2,y=-f.d/2,depth=counterDepth(f),left=cornerSide(f)==='left';if(f.kitchen.shape==='straight')return [{a:[x,y+depth],b:[x+f.w,y+depth],normal:[0,1]}];const corner=[left?x+depth:x+f.w-depth,y+depth];return [{a:[left?corner[0]:x,corner[1]],b:[left?x+f.w:corner[0],corner[1]],normal:[0,1]},{a:corner,b:[corner[0],y+f.d],normal:[left?1:-1,0]}];}
function edgeParts(f){const k=f.kitchen,h=dropHeight(f);if(!h)return [];const t=Math.min(k.thickness,20),parts=frontEdges(f).map(e=>({x:(e.a[0]+e.b[0])/2-e.normal[0]*t/2,y:(e.a[1]+e.b[1])/2-e.normal[1]*t/2,w:Math.abs(e.b[0]-e.a[0])||t,d:Math.abs(e.b[1]-e.a[1])||t,bottom:k.baseHeight-h,top:k.baseHeight,normal:e.normal}));if(k.shape==='L'){const c=frontEdges(f)[1].a,n=cornerSide(f)==='left'?1:-1;parts.push({x:c[0]-n*t/2,y:c[1]-t/2,w:t,d:t,bottom:k.baseHeight-h,top:k.baseHeight,normal:[n,1]});}if(edgeStyle(f)!=='reverse')return parts;const lip=Math.min(t,20),height=Math.min(10,h);return parts.flatMap(p=>[{...p,bottom:p.bottom+height},{...p,x:p.x-p.normal[0]*lip/2,y:p.y-p.normal[1]*lip/2,w:p.w+Math.abs(p.normal[0])*lip,d:p.d+Math.abs(p.normal[1])*lip,top:p.bottom+height}]).filter(p=>p.top>p.bottom);}
function area(f){return slabs(f).reduce((sum,s)=>sum+s.w*s.d,0)/1e6;}
function world(f,x,y){x*=f.flip?-1:1;const a=(f.rot||0)*Math.PI/180;return [f.cx+x*Math.cos(a)-y*Math.sin(a),f.cy+x*Math.sin(a)+y*Math.cos(a)];}
function local(f,x,y){const a=(f.rot||0)*Math.PI/180,dx=x-f.cx,dy=y-f.cy;return [(dx*Math.cos(a)+dy*Math.sin(a))*(f.flip?-1:1),-dx*Math.sin(a)+dy*Math.cos(a)];}
function footprints(f){return slabs(f).map(s=>[[-s.w/2,-s.d/2],[s.w/2,-s.d/2],[s.w/2,s.d/2],[-s.w/2,s.d/2]].map(([x,y])=>world(f,x+s.x,y+s.y)));}
function bodyParts(f){const k=f.kitchen,poly=s=>[[-s.w/2,-s.d/2],[s.w/2,-s.d/2],[s.w/2,s.d/2],[-s.w/2,s.d/2]].map(([x,y])=>world(f,x+s.x,y+s.y)),lower=layout(f).filter(m=>m.role!=='empty');if(k.shape==='L')lower.push(cornerBlock(f));return [...lower.map(s=>({p:poly(s),vertical:{bottom:0,top:k.baseHeight}})),...slabs(f).map(s=>({p:poly(s),vertical:{bottom:k.baseHeight,top:k.baseHeight+k.thickness}})),...edgeParts(f).map(s=>({p:poly(s),vertical:{bottom:s.bottom,top:s.top}}))];}
const isDevice=f=>['ksink','stove','stove_fotile_th36b'].includes(f.type);
const cutout=f=>f.type==='stove_fotile_th36b'?{w:f.w*660/750,d:f.d*350/440}:{w:f.w-30,d:f.d-30};
// Nominal opening within the supplied adjustable range; resizing is a layout approximation.
function validateLink(f){const l=f.counterLink;if(l===undefined)return;if(!isDevice(f)||!l||typeof l!=='object'||typeof l.hostId!=='string'||!l.hostId||l.hostId.length>200||!Number.isInteger(l.module)||l.module<0||l.module>47)throw Error('水槽／灶具的台面关联无效');}
function fit(f,host,index){const m=layout(host)[index],role=f.type==='ksink'?'sink':'hob';if(!m||m.role!==role)throw Error('请选择对应的水槽柜或灶台柜');const angle=m.rot,depth=host.kitchen.depth;if(f.w>m.width-40||f.d>depth-40)throw Error('设备尺寸须在模块和柜深内保留模型边距 20 mm');return {m,angle};}
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
 return list;
}
function validateList(list){for(const f of list){validate(f);validateLink(f);if(f.counterLink){const host=list.find(h=>h.id===f.counterLink.hostId&&h.kitchen);if(!host)throw Error('关联的厨房台面不存在');fit(f,host,f.counterLink.module);if(list.some(g=>g!==f&&g.counterLink?.hostId===host.id&&g.counterLink.module===f.counterLink.module))throw Error('同一厨房模块只能关联一件水槽或灶具');}}}
function moduleFurniture(f,m){const C=cabinet(),spec=C.preset('base'),c=spec.cabinet;kitchenModuleConfig(c,m,f.kitchen.baseHeight,dropHeight(f),f.kitchen);if(f.kitchen.doorOverlay!==undefined)c.doorOverlay=f.kitchen.doorOverlay;const [cx,cy]=world(f,m.x,m.y);return {...f,kitchen:undefined,type:'cabinet',w:m.width,d:f.kitchen.depth,h:f.kitchen.baseHeight,cabinet:c,cx,cy,rot:((f.rot||0)+(f.flip?-m.rot:m.rot)+360)%360};}
function kitchenModuleConfig(c,m,h,drop=0,k={}){c.template='kitchen-base';c.plinth=100;c.autoDoors=false;if(m.door===undefined)c.autoFrontWidth=m.width;else delete c.autoFrontWidth;if(k.doorMaxAngle!==undefined)c.doorMaxAngle=k.doorMaxAngle;if(drop)c.frontTop=h-drop;else delete c.frontTop;const front=h-drop,drawer=Math.max(60,(front-150)/3),door=m.role==='drawer'||m.role==='empty'?'none':m.door??'left';c.columns=[{door,doorOpen:door!=='none'&&!!m.doorOpen,...(m.doorMaxAngle!==undefined?{doorMaxAngle:m.doorMaxAngle}:{}),...(m.doorAngle!==undefined?{doorAngle:m.doorAngle}:{}),shelves:m.role==='door'?[Math.round((h-140)/2)]:[],drawers:m.role==='drawer'?Array.from({length:3},(_,i)=>({height:drawer,open:!!m.drawerOpen?.[i]})):[]}];return c;}
function toggle(f,index,drawer,open){if(f.locked)throw Error('请先解锁厨房');const next=clone(f),m=next.kitchen.modules[index];if(!m||m.role==='empty'||moduleDoor(f,m)==='none'&&m.role!=='drawer')throw Error('该模块没有柜门或抽屉');if(m.role==='drawer'){if(!Number.isInteger(drawer)||drawer<0||drawer>2)throw Error('请选择抽屉');const values=m.drawerOpen??[false,false,false];m.drawerOpen=[...values];m.drawerOpen[drawer]=open??!values[drawer];}else {m.doorOpen=open??!m.doorOpen;if(m.doorOpen)m.doorAngle=moduleMaxAngle(next,m);}return validate(next);}
function specification(f){const k=clone(f.kitchen);k.modules.forEach(m=>{delete m.doorOpen;delete m.doorAngle;delete m.drawerOpen;});return k;}
function openingZones(f,options){const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);return layout(f).filter(m=>m.role!=='empty').flatMap(m=>C.openingZones(moduleFurniture(f,m),options).map(z=>({...z,column:m.index})));}
const api={isDevice,cutout,roles,edgeStyles,counterDepth,edgeStyle,dropHeight,defaults,cornerSide,cornerBlock,validate,configure,resize,repairDimensions,layout,elevationRuns,slabs,outline,frontEdges,edgeParts,area,world,local,footprints,bodyParts,validateLink,fit,attach,normalize,validateList,moduleFurniture,kitchenModuleConfig,moduleDoor,moduleMaxAngle,moduleAngle,toggle,specification,openingZones};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishKitchen=api;
})(typeof globalThis!=='undefined'?globalThis:this);
