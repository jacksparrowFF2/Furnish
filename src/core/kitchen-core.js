/* Kitchen assemblies and countertop attachments, millimetres; no app state. */
(function(root){
'use strict';
const roles={door:'门柜',drawer:'抽屉柜',sink:'水槽柜',hob:'灶台柜',empty:'设备空位'};
const edgeStyles={plain:'单板无下挂',square:'直角下挂',reverse:'反收下挂',bevel:'45°斜切下挂'};
const cornerSide=f=>f.kitchen.corner??'left';
const counterDepth=f=>f.kitchen.counterDepth??f.kitchen.depth;
const extension=(f,run)=>f.kitchen.endExtensions?.find(e=>e.run===run)??{run,length:0,depth:counterDepth(f)};
function bodyBounds(f){const right=f.kitchen.shape==='L'&&cornerSide(f)==='right',w=f.w-extension(f,0).length,d=f.d-(f.kitchen.shape==='L'?extension(f,1).length:0);return {x:-f.w/2+(right?extension(f,0).length:0),y:-f.d/2,w,d,right};}
const edgeStyle=f=>f.kitchen.edgeStyle??'plain';
const dropHeight=f=>['square','reverse'].includes(edgeStyle(f))?(f.kitchen.dropHeight??20):0;
const clone=v=>JSON.parse(JSON.stringify(v));
const cabinet=()=>root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);
const avoidanceRules=()=>{const R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);return R.definition({type:'counter'}).avoidance;};
const zones=()=>root.FurnishZoneGeometry||(typeof require==='function'?require('./zone-geometry.js'):null);
const rectPoly=s=>[[-s.w/2,-s.d/2],[s.w/2,-s.d/2],[s.w/2,s.d/2],[-s.w/2,s.d/2]].map(([x,y])=>[x+s.x,y+s.y]);
const moduleDoor=(f,m)=>m.role==='drawer'||m.role==='empty'?'none':m.door??'auto';
const moduleLeafCount=(f,m)=>{const door=moduleDoor(f,m);return door==='none'?0:door==='auto'?cabinet().autoDoorCount(m.width??m.length):door==='double'?2:1;};
const moduleLeafState=(f,m,leaf)=>cabinet().doorLeafState(f.kitchen,m,leaf);
const moduleLeafAngle=(f,m,leaf)=>cabinet().doorLeafAngle(f.kitchen,m,leaf);
const moduleMaxAngle=(f,m)=>cabinet().maxDoorAngle(f.kitchen,m);
const moduleAngle=(f,m)=>moduleDoor(f,m)==='none'?0:cabinet().doorAngle(f.kitchen,m);
function defaults(f){const n=Math.max(1,Math.ceil(f.w/600));return {version:1,shape:'straight',depth:f.d,baseHeight:820,thickness:40,modules:Array.from({length:n},()=>({run:0,width:f.w/n,role:'door'}))};}
function validate(f){
 if(!f.kitchen)return f;const k=f.kitchen,finite=Number.isFinite;
 if(![f.w,f.d].every(v=>finite(v)&&v>0&&v<=20000))throw Error('厨房外包宽深须在 0–20000 mm 内');
 if(k.corner!==undefined&&!['left','right'].includes(k.corner))throw Error('厨房转角须为左转角或右转角');
 if(k.doorOverlay!==undefined&&!['full','half','inset'].includes(k.doorOverlay))throw Error('厨房柜门盖板方式无效');
 cabinet().validateDoorSettings(k);
 if(k.autoAvoid!==undefined&&typeof k.autoAvoid!=='boolean')throw Error('厨房自动避让须为布尔值');
 if(k.obstacleFit!==undefined){const fit=k.obstacleFit;if(!k.autoAvoid||!fit||!Array.isArray(fit.depths)||fit.depths.length>50||!Array.isArray(fit.cuts)||fit.cuts.length>100)throw Error('厨房自动避让结果无效');const seen=new Set();for(const row of fit.depths){const end=row?.index>=k.modules.length?extension(f,row.index-k.modules.length):null,m=end?.length?end:k.modules[row?.index],limit=end?.length?end.cabinetDepth??Math.min(1200,end.depth):k.depth;if(!m||m.role&&m.role!=='door'||!Number.isInteger(row.index)||seen.has(row.index)||!finite(row.depth)||row.depth<avoidanceRules().minDepth||row.depth>limit)throw Error('自动避让柜深无效');seen.add(row.index);}for(const poly of fit.cuts){zones().validatePolygon(poly);if(poly.some(p=>p.some(v=>Math.abs(v)>20000)))throw Error('自动台面缺口坐标超限');}}
 if(k.counterDepth!==undefined&&(!finite(k.counterDepth)||k.counterDepth<k.depth||k.counterDepth>k.depth+100))throw Error('台面深度须不小于柜深，前沿挑出最多 100 mm');
 if(k.endExtensions!==undefined){if(!Array.isArray(k.endExtensions)||k.endExtensions.length>2)throw Error('台面末端延伸配置无效');const seen=new Set();for(const e of k.endExtensions){if(!e||![0,1].includes(e.run)||seen.has(e.run)||k.shape==='straight'&&e.run===1||!finite(e.length)||e.length!==0&&e.length<150||e.length>3000||!finite(e.depth)||e.depth<150||e.depth>counterDepth(f)||e.cabinetDepth!==undefined&&(!finite(e.cabinetDepth)||e.cabinetDepth<150||e.cabinetDepth>Math.min(1200,e.depth))||e.backPanel!==undefined&&typeof e.backPanel!=='boolean'||e.doorOpen!==undefined&&typeof e.doorOpen!=='boolean')throw Error('末端薄柜宽须为 0（不添加）或 150–3000 mm；台面／柜深至少 150 mm，柜深不超过台面深；背板及开合须为布尔值');cabinet().validateDoorSettings(e);if(e.doorLeaves&&e.doorLeaves.length!==moduleLeafCount(f,e))throw Error('末端薄柜逐扇开合数量须与门数一致');seen.add(e.run);}}
 if(k.edgeStyle!==undefined&&!Object.hasOwn(edgeStyles,k.edgeStyle)||k.dropHeight!==undefined&&(!finite(k.dropHeight)||k.dropHeight<0||k.dropHeight>100))throw Error('台面下挂样式或高度无效（0–100 mm）');
 if(f.type!=='counter'||f.obj||!k||k.version!==1||!['straight','L'].includes(k.shape)||![k.depth,k.baseHeight,k.thickness].every(finite)||k.depth<300||k.depth>1200||k.baseHeight<400||k.baseHeight>1200||k.thickness<10||k.thickness>100||!Array.isArray(k.modules)||!k.modules.length||k.modules.length>48)throw Error('厨房配置无效：柜深 300–1200、柜高 400–1200、台面厚 10–100 mm');
 const sums=[0,0];for(const m of k.modules){if(!m||![0,1].includes(m.run)||!Object.hasOwn(roles,m.role)||!finite(m.width)||m.width<150||m.width>3000)throw Error('厨房模块宽须为 150–3000 mm，功能与所在边须有效');cabinet().validateDoorSettings(m);if(m.doorLeaves&&m.doorLeaves.length!==moduleLeafCount(f,m))throw Error('逐扇开合数量须与模块门数一致');if(m.doorOpen!==undefined&&typeof m.doorOpen!=='boolean'||m.drawerOpen!==undefined&&(!Array.isArray(m.drawerOpen)||m.drawerOpen.length!==3||m.drawerOpen.some(v=>typeof v!=='boolean')))throw Error('厨房模块开合状态无效');sums[m.run]+=m.width;}
 if(k.shape==='straight'?(sums[1]!==0||Math.abs(f.d-counterDepth(f))>.01||Math.abs(f.w-sums[0]-extension(f,0).length)>.01):(sums[0]<150||sums[1]<150||Math.abs(f.w-k.depth-sums[0]-extension(f,0).length)>.01||Math.abs(f.d-k.depth-sums[1]-extension(f,1).length)>.01))throw Error('厨房外包尺寸须与模块长度、转角及台面延伸一致');
 if(k.obstacleFit?.cuts.length&&topGeometry(f).rings.filter(r=>zones().signed(r)>0).length!==1)throw Error('自动缺口不能切断或移除整片台面');
 return f;
}
function configure(f,k){if(f.locked)throw Error('家具已锁定，请先解锁');const next={...f,kitchen:clone(k)};const sum=run=>k.modules.filter(m=>m.run===run).reduce((n,m)=>n+m.width,0);next.w=sum(0)+(k.shape==='L'?k.depth:0)+extension(next,0).length;next.d=k.shape==='L'?k.depth+sum(1)+extension(next,1).length:counterDepth(next);if(f.kitchen&&k.shape===f.kitchen.shape){const dx=(k.endExtensions!==undefined||f.kitchen.endExtensions!==undefined)?(next.w-f.w)/2*(k.shape==='L'&&cornerSide(next)==='right'?-1:1):0,dy=k.shape==='L'?(k.endExtensions!==undefined||f.kitchen.endExtensions!==undefined?(next.d-f.d)/2:0):k.counterDepth!==undefined?(next.d-f.d)/2:0,[cx,cy]=world(f,dx,dy);next.cx=cx;next.cy=cy;}delete next.kitchen.obstacleFit;
 for(const m of next.kitchen.modules){if(m.role==='drawer'||m.role==='empty')for(const key of ['door','doorOpen','doorAngle','doorMaxAngle','doorLeaves'])delete m[key];if(moduleDoor(next,m)==='none'){delete m.doorOpen;delete m.doorAngle;delete m.doorLeaves;}if(m.role!=='drawer')delete m.drawerOpen;}for(const m of [...next.kitchen.modules,...(next.kitchen.endExtensions||[])]){const count=moduleLeafCount(next,m);if(!count)delete m.doorLeaves;else if(m.doorLeaves){m.doorLeaves=Array.from({length:count},(_,i)=>m.doorLeaves[i]??{open:false});m.doorOpen=m.doorLeaves.some(s=>s.open);}}delete next.h;delete next.cabinet;return validate(next);}
function resize(f,next){const k=clone(f.kitchen);if(k.shape==='straight'){const extra=counterDepth(f)-k.depth;k.depth=next.d-extra;if(k.counterDepth!==undefined)k.counterDepth=next.d;}for(const run of [0,1]){if(run===1&&k.shape==='straight')continue;const old=k.modules.filter(m=>m.run===run).reduce((n,m)=>n+m.width,0),length=(run===0?next.w:next.d)-(k.shape==='L'?k.depth:0)-extension(f,run).length;for(const m of k.modules.filter(m=>m.run===run))m.width*=length/old;}return configure(next,k);}
// Explicit, undoable repair. First validate the recorded module structure;
// only reconcile its derived envelope, never invent missing configuration.
function repairDimensions(f,keepEnvelope=true){
 const canonical=configure(f,f.kitchen);
 const repaired=keepEnvelope?resize(canonical,{...canonical,w:f.w,d:f.d}):canonical;
 return {...f,w:repaired.w,d:repaired.d,kitchen:repaired.kitchen};
}
function layout(f){validate(f);const k=f.kitchen,b=bodyBounds(f),offset=[k.shape==='L'&&!b.right?k.depth:0,k.depth];return k.modules.map((m,index)=>{const start=offset[m.run];offset[m.run]+=m.width;return {...m,index,x:m.run===0?b.x+start+m.width/2:b.x+(b.right?b.w-k.depth/2:k.depth/2),y:m.run===0?b.y+k.depth/2:b.y+start+m.width/2,w:m.run===0?m.width:k.depth,d:m.run===0?k.depth:m.width,rot:m.run===0?0:b.right?90:270};});}
function cornerBlock(f){const k=f.kitchen,b=bodyBounds(f);return {x:b.x+(b.right?b.w-k.depth/2:k.depth/2),y:b.y+k.depth/2,w:k.depth,d:k.depth};}
function endLayout(f){const b=bodyBounds(f);return [0,1].flatMap(run=>{const e=extension(f,run);if(!e.length)return [];const d=e.cabinetDepth??Math.min(1200,e.depth);return [{...e,index:f.kitchen.modules.length+run,role:'door',width:e.length,depth:d,backPanel:e.backPanel??false,x:run===0?(b.right?b.x-e.length/2:b.x+b.w+e.length/2):b.x+(b.right?b.w-d/2:d/2),y:run===0?b.y+d/2:b.y+b.d+e.length/2,w:run===0?e.length:d,d:run===0?d:e.length,rot:run===0?0:b.right?90:270}];});}
function cabinetLayout(f){return [...layout(f),...endLayout(f)].map(m=>{const depth=f.kitchen.obstacleFit?.depths.find(row=>row.index===m.index)?.depth;if(depth===undefined)return m;const nominal=m.depth??f.kitchen.depth,shift=(nominal-depth)/2,normal=m.run===0?[0,1]:[cornerSide(f)==='right'?-1:1,0];return {...m,depth,x:m.x+normal[0]*shift,y:m.y+normal[1]*shift,w:m.run===0?m.width:depth,d:m.run===0?depth:m.width};});}
// A hollow blind cabinet, with its two inside edges open to adjoining runs.
function cornerBoards(f){const b=cornerBlock(f),t=18,h=f.kitchen.baseHeight,p=100,left=b.x-b.w/2,back=b.y-b.d/2,side=cornerSide(f)==='right'?left+b.w-t/2:left+t/2;return [{x:b.x,y:b.y,w:b.w,d:b.d,bottom:p,top:p+t},{x:b.x,y:b.y,w:b.w,d:b.d,bottom:h-t,top:h},{x:b.x,y:back+t/2,w:b.w,d:t,bottom:p+t,top:h-t},{x:side,y:b.y,w:t,d:b.d,bottom:p+t,top:h-t}];}
// Match the adjacent production base's 100 mm plinth and 40 mm front recess.
function cornerPlinth(f){const b=cornerBlock(f),sign=cornerSide(f)==='right'?-1:1,recess=40,back=b.y-b.d/2;return [{x:b.x,y:back+(b.d-recess)/2,w:b.w,d:b.d-recess,bottom:0,top:100},{x:b.x-sign*recess/2,y:back+b.d-recess/2,w:b.w-recess,d:recess,bottom:0,top:100}];}
// Temporary straight rows for viewing each L run from its own front. Never saved.
function elevationRuns(f){
 validate(f);if(f.kitchen.shape!=='L')return [];
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
  return {run,title:run===0?'主边正视':'转角边正视',indices:slots.map(s=>s.index),endIndex:f.kitchen.modules.length+run,mirror:reverse!==flip,blind:{x:bounds[at].x,y:bounds[at].y,width:k.depth},furniture:row};
 });
}
function slabs(f){const k=f.kitchen,b=bodyBounds(f),depth=counterDepth(f),parts=[{x:b.x+b.w/2,y:b.y+depth/2,w:b.w,d:depth}];if(k.shape==='L')parts.push({x:b.x+(b.right?b.w-depth/2:depth/2),y:b.y+(b.d+depth)/2,w:depth,d:b.d-depth});for(const run of [0,1]){const e=extension(f,run);if(!e.length)continue;parts.push(run===0?{x:b.right?b.x-e.length/2:b.x+b.w+e.length/2,y:b.y+e.depth/2,w:e.length,d:e.depth}:{x:b.x+(b.right?b.w-e.depth/2:e.depth/2),y:b.y+b.d+e.length/2,w:e.depth,d:e.length});}return parts;}
// Walk the continuous top perimeter from the outside corner, including narrowed ends.
function outline(f){const b=bodyBounds(f),D=counterDepth(f),a=extension(f,0),e=extension(f,1),points=[[0,0],[b.w+a.length,0]];if(a.length)points.push([b.w+a.length,a.depth],[b.w,a.depth]);points.push([b.w,D]);if(f.kitchen.shape==='straight')points.push([0,D]);else {points.push([D,D],[D,b.d]);if(e.length)points.push([e.depth,b.d],[e.depth,b.d+e.length]);points.push([0,b.d+e.length]);}const clean=points.filter((p,i)=>!i||p[0]!==points[i-1][0]||p[1]!==points[i-1][1]).map(([u,v])=>[b.x+(b.right?b.w-u:u),b.y+v]);return b.right?clean.reverse():clean;}
function frontEdges(f){const points=topGeometry(f).rings.find(r=>zones().signed(r)>0)||outline(f),b=bodyBounds(f),a=extension(f,0),edges=[];for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length],dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy);if(!length)continue;const normal=[dy/length,-dx/length],u=b.right?b.x+b.w-p[0]:p[0]-b.x;if(normal[1]>0||f.kitchen.shape==='L'&&normal[0]===(b.right?-1:1)&&u<counterDepth(f)+.01||a.length&&normal[0]===(b.right?-1:1)&&Math.abs(u-b.w)<.01&&a.depth<counterDepth(f))edges.push({a:p,b:q,normal});}return edges;}
function edgeParts(f){const k=f.kitchen,h=dropHeight(f);if(!h)return [];const t=Math.min(k.thickness,20),parts=frontEdges(f).map(e=>({x:(e.a[0]+e.b[0])/2-e.normal[0]*t/2,y:(e.a[1]+e.b[1])/2-e.normal[1]*t/2,w:Math.abs(e.b[0]-e.a[0])||t,d:Math.abs(e.b[1]-e.a[1])||t,bottom:k.baseHeight-h,top:k.baseHeight,normal:e.normal}));if(k.shape==='L'){const b=bodyBounds(f),D=counterDepth(f),c=[b.x+(b.right?b.w-D:D),b.y+D],n=b.right?-1:1;parts.push({x:c[0]-n*t/2,y:c[1]-t/2,w:t,d:t,bottom:k.baseHeight-h,top:k.baseHeight,normal:[n,1]});}if(edgeStyle(f)!=='reverse')return parts;const lip=Math.min(t,20),height=Math.min(10,h);return parts.flatMap(p=>[{...p,bottom:p.bottom+height},{...p,x:p.x-p.normal[0]*lip/2,y:p.y-p.normal[1]*lip/2,w:p.w+Math.abs(p.normal[0])*lip,d:p.d+Math.abs(p.normal[1])*lip,top:p.bottom+height}]).filter(p=>p.top>p.bottom);}
function topGeometry(f){const cuts=f.kitchen.obstacleFit?.cuts||[],poly=outline(f);if(!cuts.length)return {poly,rings:[poly],polys:slabs(f).map(rectPoly)};const Z=zones(),pieces=Z.decompose([poly,...cuts],p=>Z.inside(p,poly)&&!cuts.some(c=>Z.inside(p,c)));return Z.outline(pieces);}
function area(f){return zones().area(topGeometry(f).polys)/1e6;}
function world(f,x,y){x*=f.flip?-1:1;const a=(f.rot||0)*Math.PI/180;return [f.cx+x*Math.cos(a)-y*Math.sin(a),f.cy+x*Math.sin(a)+y*Math.cos(a)];}
function local(f,x,y){const a=(f.rot||0)*Math.PI/180,dx=x-f.cx,dy=y-f.cy;return [(dx*Math.cos(a)+dy*Math.sin(a))*(f.flip?-1:1),-dx*Math.sin(a)+dy*Math.cos(a)];}
function footprints(f){let pieces=topGeometry(f).polys;if(f.kitchen.obstacleFit?.cuts.length){const Z=zones(),all=[...pieces,...cabinetLayout(f).filter(m=>m.role!=='empty').map(rectPoly),...(f.kitchen.shape==='L'?cornerBoards(f).map(rectPoly):[])];pieces=Z.decompose(all,p=>all.some(poly=>Z.inside(p,poly)));}return pieces.map(p=>p.map(([x,y])=>world(f,x,y)));}
function bodyParts(f){const k=f.kitchen,poly=s=>[[-s.w/2,-s.d/2],[s.w/2,-s.d/2],[s.w/2,s.d/2],[-s.w/2,s.d/2]].map(([x,y])=>world(f,x+s.x,y+s.y)),lower=cabinetLayout(f).filter(m=>m.role!=='empty');return [...(k.shape==='L'?[...cornerBoards(f),...cornerPlinth(f)].map(s=>({p:poly(s),vertical:{bottom:s.bottom,top:s.top}})):[]),...lower.map(s=>({p:poly(s),vertical:{bottom:0,top:k.baseHeight}})),...topGeometry(f).polys.map(p=>({p:p.map(([x,y])=>world(f,x,y)),vertical:{bottom:k.baseHeight,top:k.baseHeight+k.thickness}})),...edgeParts(f).map(s=>({p:poly(s),vertical:{bottom:s.bottom,top:s.top}}))];}
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
function moduleFurniture(f,m){const C=cabinet(),spec=C.preset('base'),c=spec.cabinet;kitchenModuleConfig(c,m,f.kitchen.baseHeight,dropHeight(f),f.kitchen);if(f.kitchen.doorOverlay!==undefined)c.doorOverlay=f.kitchen.doorOverlay;const [cx,cy]=world(f,m.x,m.y);return {...f,kitchen:undefined,type:'cabinet',w:m.width,d:m.depth??f.kitchen.depth,h:f.kitchen.baseHeight,cabinet:c,cx,cy,rot:((f.rot||0)+(f.flip?-m.rot:m.rot)+360)%360};}
function kitchenModuleConfig(c,m,h,drop=0,k={}){c.template='kitchen-base';if(m.backPanel!==undefined)c.backPanel=m.backPanel;c.plinth=100;c.autoDoors=false;if(m.door===undefined)c.autoFrontWidth=m.width;else delete c.autoFrontWidth;if(k.doorMaxAngle!==undefined)c.doorMaxAngle=k.doorMaxAngle;if(drop)c.frontTop=h-drop;else delete c.frontTop;const front=h-drop,drawer=Math.max(60,(front-150)/3),door=m.role==='drawer'||m.role==='empty'?'none':m.door??'left';c.columns=[{door,doorOpen:door!=='none'&&!!m.doorOpen,...(m.doorMaxAngle!==undefined?{doorMaxAngle:m.doorMaxAngle}:{}),...(m.doorAngle!==undefined?{doorAngle:m.doorAngle}:{}),...(m.doorLeaves?{doorLeaves:clone(m.doorLeaves)}:{}),shelves:m.role==='door'?[Math.round((h-140)/2)]:[],drawers:m.role==='drawer'?Array.from({length:3},(_,i)=>({height:drawer,open:!!m.drawerOpen?.[i]})):[]}];return c;}
function toggle(f,index,drawer,open,leaf){if(f.locked)throw Error('请先解锁厨房');const next=clone(f),m=next.kitchen.modules[index]??next.kitchen.endExtensions?.find(e=>e.run===index-next.kitchen.modules.length&&e.length);if(!m||m.role==='empty'||moduleDoor(f,m)==='none'&&m.role!=='drawer')throw Error('该模块没有柜门或抽屉');if(m.role==='drawer'){if(!Number.isInteger(drawer)||drawer<0||drawer>2)throw Error('请选择抽屉');const values=m.drawerOpen??[false,false,false];m.drawerOpen=[...values];m.drawerOpen[drawer]=open??!values[drawer];}else if(leaf!==undefined){const count=moduleLeafCount(next,m);if(!Number.isInteger(leaf)||leaf<0||leaf>=count)throw Error('请选择有效门扇');m.doorLeaves=Array.from({length:count},(_,j)=>clone(moduleLeafState(next,m,j)));const state=m.doorLeaves[leaf];state.open=open??!state.open;if(state.open)state.angle=moduleMaxAngle(next,m);m.doorOpen=m.doorLeaves.some(s=>s.open);if(m.doorOpen)m.doorAngle=moduleMaxAngle(next,m);}else{m.doorOpen=open??!m.doorOpen;if(m.doorOpen)m.doorAngle=moduleMaxAngle(next,m);if(m.doorLeaves)m.doorLeaves.forEach(s=>{s.open=m.doorOpen;if(s.open)s.angle=moduleMaxAngle(next,m);});}return validate(next);}
function specification(f){const k=clone(f.kitchen);[...k.modules,...(k.endExtensions||[])].forEach(m=>{delete m.doorOpen;delete m.doorAngle;delete m.doorLeaves;delete m.drawerOpen;});return k;}
function openingZones(f,options){const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);return cabinetLayout(f).filter(m=>m.role!=='empty').flatMap(m=>C.openingZones(moduleFurniture(f,m),options).map(z=>({...z,column:m.index})));}
// Clip convex obstacle pieces to a module-width strip. Front stays fixed.
function clipAxis(poly,axis,edge,sign){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],inside=sign*(a[axis]-edge)>=-1e-8,next=sign*(b[axis]-edge)>=-1e-8;if(inside)out.push(a);if(inside!==next){const t=(edge-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}return out;}
function adaptObstacles(f,plan,list=[]){
 const next=clone(f),k=next.kitchen,notes=[];if(!k||f.locked)return {furniture:next,notes};delete k.obstacleFit;validate(next);if(!k.autoAvoid)return {furniture:next,notes};
 const Z=zones(),G=root.FurnishGeometry||(typeof require==='function'?require('./layout-geometry.js'):null),R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null),Draft=root.FurnishDraft||(typeof require==='function'?require('./floorplan-core.js'):null),obstacles=[];
 const add=(p,vertical,name)=>{if(!p?.length)return;obstacles.push({p:p.map(([x,y])=>local(next,x,y)),vertical,name});};
 for(const w of plan.walls||[])add([[w[0],w[1]],[w[2],w[1]],[w[2],w[3]],[w[0],w[3]]],{bottom:0,top:w[4]==='low'?Math.min(1000,plan.ceilingHeight??2800):plan.ceilingHeight??2800},'墙体');
 for(const b of plan.beams||[]){const v=Draft.beamVertical(b,plan.ceilingHeight??2800);add(b.poly,v?.assumed?null:v,b.name||'房梁');}
 for(const other of list){if(other.id===f.id||other.kitchen||!G.solidForCollision(other)||R.modelError(other))continue;for(const part of G.bodyParts(other))add(part.p,part.vertical,other.name||'障碍物');}
 const overlapsHeight=(v,lo,hi)=>v&&Math.min(v.top,hi)-Math.max(v.bottom,lo)>1e-6,depths=[],cuts=[],top=outline(next),linked=new Set(list.filter(v=>v.counterLink?.hostId===f.id).map(v=>v.counterLink.module));
 const usable=obstacles.map(o=>({...o,pieces:Z.decompose([o.p],p=>Z.inside(p,o.p))}));
 for(const m of cabinetLayout(next)){
  if(m.role==='empty')continue;const nominal=m.depth??k.depth,angle=m.rot*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);let back=-nominal/2;
  for(const o of usable){if(!overlapsHeight(o.vertical,100,k.baseHeight))continue;for(const piece of o.pieces){let p=piece.map(([x,y])=>[(x-m.x)*c+(y-m.y)*s,-(x-m.x)*s+(y-m.y)*c]);for(const [axis,edge,sign] of [[0,-m.width/2,1],[0,m.width/2,-1],[1,-nominal/2,1],[1,nominal/2,-1]])p=clipAxis(p,axis,edge,sign);if(p.length>2&&Math.abs(Z.signed(p))>.01)back=Math.max(back,...p.map(v=>v[1]));}}
  const depth=Math.round((nominal/2-back)*1e6)/1e6;if(depth>=nominal-1e-5)continue;
  if(m.role!=='door'||linked.has(m.index)){notes.push(`模块 ${m.index+1} 含设备或抽屉，保留柜深，请手动核对`);continue;}
  if(depth<avoidanceRules().minDepth-1e-6){notes.push(`模块 ${m.index+1} 剩余柜深不足 ${avoidanceRules().minDepth} mm，保留原柜体，请调整位置`);continue;}
  depths.push({index:m.index,depth:Math.max(avoidanceRules().minDepth,depth)});
 }
 for(const o of usable){if(!o.vertical){if(Z.area(Z.decompose([top,o.p],p=>Z.inside(p,top)&&Z.inside(p,o.p)))>.01)notes.push(`${o.name} 高度未知，未自动减薄或切台面`);continue;}if(!overlapsHeight(o.vertical,k.baseHeight,k.baseHeight+k.thickness))continue;
  if(Z.area(Z.decompose([top,o.p],p=>Z.inside(p,top)&&Z.inside(p,o.p)))<=.01)continue;
  const protects=layout(next).filter(m=>linked.has(m.index)).some(m=>Z.area(Z.decompose([rectPoly(m),o.p],p=>Z.inside(p,rectPoly(m))&&Z.inside(p,o.p)))>.01);
  if(protects){notes.push(`${o.name} 影响已关联设备模块，台面保留并提示冲突`);continue;}
  const clipped=o.pieces.map(piece=>{let p=piece;for(const [axis,edge,sign] of [[0,-f.w/2,1],[0,f.w/2,-1],[1,-f.d/2,1],[1,f.d/2,-1]])p=clipAxis(p,axis,edge,sign);return p;}).filter(p=>p.length>2&&Math.abs(Z.signed(p))>.01),proposed=[...cuts,...clipped],remaining=Z.outline(Z.decompose([top,...proposed],p=>Z.inside(p,top)&&!proposed.some(poly=>Z.inside(p,poly))));
  if(remaining.rings.filter(r=>Z.signed(r)>0).length!==1){notes.push(`${o.name} 会切断或移除台面，保留原台面并提示冲突`);continue;}
  if(proposed.length>100){notes.push('障碍物过多，未继续自动切台面');break;}cuts.push(...clipped);
 }
 if(depths.length||cuts.length)k.obstacleFit={depths,cuts};validate(next);return {furniture:next,notes};
}
function normalizeObstacles(list,plan){if(!list.some(f=>f.kitchen?.autoAvoid))return list;const source=clone(list);for(const f of list){if(!f.kitchen?.autoAvoid||f.locked)continue;try{f.kitchen=adaptObstacles(f,plan,source).furniture.kitchen;}catch{/* Broken models keep their existing record and review warning. */}}return list;}
const api={isDevice,cutout,roles,edgeStyles,counterDepth,extension,bodyBounds,cornerPlinth,endLayout,cabinetLayout,cornerBoards,edgeStyle,dropHeight,defaults,cornerSide,cornerBlock,validate,configure,resize,repairDimensions,layout,elevationRuns,slabs,outline,frontEdges,edgeParts,area,topGeometry,avoidanceRules,adaptObstacles,normalizeObstacles,world,local,footprints,bodyParts,validateLink,fit,attach,normalize,validateList,moduleFurniture,kitchenModuleConfig,moduleDoor,moduleLeafCount,moduleLeafState,moduleLeafAngle,moduleMaxAngle,moduleAngle,toggle,specification,openingZones};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishKitchen=api;
})(typeof globalThis!=='undefined'?globalThis:this);
