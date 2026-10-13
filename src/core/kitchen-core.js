/* Kitchen assemblies and countertop attachments, millimetres; no app state. */
(function(root){
'use strict';
const roles={door:'门柜',drawer:'抽屉柜',sink:'水槽柜',hob:'灶台柜',empty:'设备空位'};
const cornerSide=f=>f.kitchen.corner??'left';
const clone=v=>JSON.parse(JSON.stringify(v));
function defaults(f){const n=Math.max(1,Math.ceil(f.w/600));return {version:1,shape:'straight',depth:f.d,baseHeight:820,thickness:40,modules:Array.from({length:n},()=>({run:0,width:f.w/n,role:'door'}))};}
function validate(f){
 if(!f.kitchen)return f;const k=f.kitchen,finite=Number.isFinite;
 if(![f.w,f.d].every(v=>finite(v)&&v>0&&v<=20000))throw Error('厨房外包宽深须在 0–20000 mm 内');
 if(k.corner!==undefined&&!['left','right'].includes(k.corner))throw Error('厨房转角须为左转角或右转角');
 if(k.doorOverlay!==undefined&&!['full','half','inset'].includes(k.doorOverlay))throw Error('厨房柜门盖板方式无效');
 if(f.type!=='counter'||f.obj||!k||k.version!==1||!['straight','L'].includes(k.shape)||![k.depth,k.baseHeight,k.thickness].every(finite)||k.depth<300||k.depth>1200||k.baseHeight<400||k.baseHeight>1200||k.thickness<10||k.thickness>100||!Array.isArray(k.modules)||!k.modules.length||k.modules.length>48)throw Error('厨房配置无效：柜深 300–1200、柜高 400–1200、台面厚 10–100 mm');
 const sums=[0,0];for(const m of k.modules){if(!m||![0,1].includes(m.run)||!Object.hasOwn(roles,m.role)||!finite(m.width)||m.width<150||m.width>3000)throw Error('厨房模块宽须为 150–3000 mm，功能与所在边须有效');sums[m.run]+=m.width;}
 if(k.shape==='straight'?(sums[1]!==0||Math.abs(f.d-k.depth)>.01||Math.abs(f.w-sums[0])>.01):(sums[0]<150||sums[1]<150||Math.abs(f.w-k.depth-sums[0])>.01||Math.abs(f.d-k.depth-sums[1])>.01))throw Error('厨房外包尺寸须与模块长度及转角一致');
 return f;
}
function configure(f,k){if(f.locked)throw Error('家具已锁定，请先解锁');const next={...f,kitchen:clone(k)};const sum=run=>k.modules.filter(m=>m.run===run).reduce((n,m)=>n+m.width,0);next.w=sum(0)+(k.shape==='L'?k.depth:0);next.d=k.shape==='L'?k.depth+sum(1):k.depth;delete next.h;delete next.cabinet;return validate(next);}
function resize(f,next){const k=clone(f.kitchen);if(k.shape==='straight')k.depth=next.d;for(const run of [0,1]){if(run===1&&k.shape==='straight')continue;const old=k.modules.filter(m=>m.run===run).reduce((n,m)=>n+m.width,0),length=(run===0?next.w:next.d)-(k.shape==='L'?k.depth:0);for(const m of k.modules.filter(m=>m.run===run))m.width*=length/old;}return configure(next,k);}
function layout(f){validate(f);const k=f.kitchen,right=cornerSide(f)==='right',offset=[k.shape==='L'&&!right?k.depth:0,k.depth];return k.modules.map((m,index)=>{const start=offset[m.run];offset[m.run]+=m.width;return {...m,index,x:m.run===0?-f.w/2+start+m.width/2:(right?1:-1)*(f.w-k.depth)/2,y:m.run===0?-f.d/2+k.depth/2:-f.d/2+start+m.width/2,w:m.run===0?m.width:k.depth,d:m.run===0?k.depth:m.width,rot:m.run===0?0:right?90:270};});}
function cornerBlock(f){const k=f.kitchen;return {x:(cornerSide(f)==='right'?1:-1)*(f.w-k.depth)/2,y:-f.d/2+k.depth/2,w:k.depth,d:k.depth};}
function slabs(f){const k=f.kitchen;return [{x:0,y:-f.d/2+k.depth/2,w:f.w,d:k.depth},...(k.shape==='L'?[{x:cornerBlock(f).x,y:k.depth/2,w:k.depth,d:f.d-k.depth}]:[])];}
function area(f){return slabs(f).reduce((sum,s)=>sum+s.w*s.d,0)/1e6;}
function world(f,x,y){x*=f.flip?-1:1;const a=(f.rot||0)*Math.PI/180;return [f.cx+x*Math.cos(a)-y*Math.sin(a),f.cy+x*Math.sin(a)+y*Math.cos(a)];}
function local(f,x,y){const a=(f.rot||0)*Math.PI/180,dx=x-f.cx,dy=y-f.cy;return [(dx*Math.cos(a)+dy*Math.sin(a))*(f.flip?-1:1),-dx*Math.sin(a)+dy*Math.cos(a)];}
function footprints(f){return slabs(f).map(s=>[[-s.w/2,-s.d/2],[s.w/2,-s.d/2],[s.w/2,s.d/2],[-s.w/2,s.d/2]].map(([x,y])=>world(f,x+s.x,y+s.y)));}
function bodyParts(f){const k=f.kitchen,poly=s=>[[-s.w/2,-s.d/2],[s.w/2,-s.d/2],[s.w/2,s.d/2],[-s.w/2,s.d/2]].map(([x,y])=>world(f,x+s.x,y+s.y)),lower=layout(f).filter(m=>m.role!=='empty');if(k.shape==='L')lower.push(cornerBlock(f));return [...lower.map(s=>({p:poly(s),vertical:{bottom:0,top:k.baseHeight}})),...slabs(f).map(s=>({p:poly(s),vertical:{bottom:k.baseHeight,top:k.baseHeight+k.thickness}}))];}
const isDevice=f=>['ksink','stove','stove_fotile_th36b'].includes(f.type);
const cutout=f=>f.type==='stove_fotile_th36b'?{w:f.w*660/750,d:f.d*350/440}:{w:f.w-30,d:f.d-30};
// Nominal opening within the supplied adjustable range; resizing is a layout approximation.
function validateLink(f){const l=f.counterLink;if(l===undefined)return;if(!isDevice(f)||!l||typeof l!=='object'||typeof l.hostId!=='string'||!l.hostId||l.hostId.length>200||!Number.isInteger(l.module)||l.module<0||l.module>47)throw Error('水槽／灶具的台面关联无效');}
function fit(f,host,index){const m=layout(host)[index],role=f.type==='ksink'?'sink':'hob';if(!m||m.role!==role)throw Error('请选择对应的水槽柜或灶台柜');const angle=m.rot,depth=host.kitchen.depth;if(f.w>m.width-40||f.d>depth-40)throw Error('设备尺寸须在模块和柜深内保留模型边距 20 mm');return {m,angle};}
function attach(f,host,index){if(f.locked||host.locked)throw Error('请先解锁设备与厨房');fit(f,host,index);return {...f,counterLink:{hostId:host.id,module:index}};}
function normalize(list,before=[]){
 for(const f of list){if(!f.counterLink)continue;const host=list.find(h=>h.id===f.counterLink.hostId&&h.type==='counter'&&h.kitchen&&!h.obj);if(!host){delete f.counterLink;continue;}
  const old=before.find(o=>o.id===f.id),oldHost=old&&before.find(h=>h.id===old.counterLink?.hostId);
  // Editing an attached appliance's position explicitly detaches it.
  if(old?.counterLink&&oldHost&&host.cx===oldHost.cx&&host.cy===oldHost.cy&&host.rot===oldHost.rot&&!!host.flip===!!oldHost.flip&&(f.cx!==old.cx||f.cy!==old.cy||f.rot!==old.rot||!!f.flip!==!!old.flip)){delete f.counterLink;continue;}
  let result;try{result=fit(f,host,f.counterLink.module);}catch(e){delete f.counterLink;continue;}
  const [x,y]=world(host,result.m.x,result.m.y);f.cx=x;f.cy=y;f.rot=((host.rot||0)+(host.flip?-result.angle:result.angle)+360)%360;f.flip=!!host.flip;f.counterElevation=host.kitchen.baseHeight+host.kitchen.thickness;
 }
 return list;
}
function validateList(list){for(const f of list){validate(f);validateLink(f);if(f.counterLink){const host=list.find(h=>h.id===f.counterLink.hostId&&h.kitchen);if(!host)throw Error('关联的厨房台面不存在');fit(f,host,f.counterLink.module);if(list.some(g=>g!==f&&g.counterLink?.hostId===host.id&&g.counterLink.module===f.counterLink.module))throw Error('同一厨房模块只能关联一件水槽或灶具');}}}
function moduleFurniture(f,m){const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null),spec=C.preset('base'),c=spec.cabinet;kitchenModuleConfig(c,m,f.kitchen.baseHeight);if(f.kitchen.doorOverlay!==undefined)c.doorOverlay=f.kitchen.doorOverlay;const [cx,cy]=world(f,m.x,m.y);return {...f,kitchen:undefined,type:'cabinet',w:m.width,d:f.kitchen.depth,h:f.kitchen.baseHeight,cabinet:c,cx,cy,rot:((f.rot||0)+(f.flip?-m.rot:m.rot)+360)%360};}
function kitchenModuleConfig(c,m,h){c.template='kitchen-base';c.plinth=100;c.autoDoors=false;const drawer=Math.max(60,(h-150)/3);c.columns=[{door:m.role==='drawer'?'none':m.width>650?'double':'left',doorOpen:false,shelves:m.role==='door'?[Math.round((h-140)/2)]:[],drawers:m.role==='drawer'?[{height:drawer,open:false},{height:drawer,open:false},{height:drawer,open:false}]:[]}];return c;}
function openingZones(f,options){const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);return layout(f).filter(m=>m.role!=='empty').flatMap(m=>C.openingZones(moduleFurniture(f,m),options).map(z=>({...z,column:m.index})));}
const api={isDevice,cutout,roles,defaults,cornerSide,cornerBlock,validate,configure,resize,layout,slabs,area,world,local,footprints,bodyParts,validateLink,fit,attach,normalize,validateList,moduleFurniture,kitchenModuleConfig,openingZones};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishKitchen=api;
})(typeof globalThis!=='undefined'?globalThis:this);
