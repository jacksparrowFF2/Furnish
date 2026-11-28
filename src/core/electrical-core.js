/* Electrical planning uses ordinary furniture records and the existing history. */
(function(root){
'use strict';
const P=()=>root.FurnishProducts||require('./product-rules.js');
const panel=f=>!!f&&!f.obj&&(P().family(f,'wall-panel')||!!P().definition(f)?.trackSocket);
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
// Only production opening state is permitted on the reference furniture.
const poseKeys=new Set(['open','doorOpen','doorAngle','doorLeaves','doorSections','topOpen','displayOpen','displayAngle','angle','extension','progress','states','drawerOpen','drawerExtensions']);
function structure(v){return Array.isArray(v)?v.map(structure):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!poseKeys.has(k)).map(([k,v])=>[k,structure(v)])):v;}
function reference(f){const out={...f};if(f.cabinet)out.cabinet=structure(f.cabinet);if(f.kitchen)out.kitchen=structure(f.kitchen);return out;}
function assertEditable(before,after){
 const old=new Map(before.furniture.map(f=>[f.id,f])),next=new Map(after.furniture.map(f=>[f.id,f]));
 if(next.size!==after.furniture.length)throw Error('面板编号重复');
 for(const f of before.furniture){const n=next.get(f.id);if(!panel(f)&&(!n||!equal(reference(f),reference(n))))throw Error('插座布置视图中家具位置和结构只读；仅允许柜门／抽屉开合');if(panel(f)&&n&&(!panel(n)||f.groupId!==n.groupId))throw Error('请在家具布局视图中更改面板分组或类型');}
 for(const f of after.furniture)if(!old.has(f.id)&&!panel(f))throw Error('插座布置视图只能新增开关插座面板');
 if(!equal(before.furniture.filter(f=>!panel(f)).map(f=>f.id),after.furniture.filter(f=>!panel(f)).map(f=>f.id)))throw Error('插座布置视图中家具顺序只读');
 validateRoutes(after.wireRoutes);
 const rest=w=>{const out={...w};delete out.furniture;delete out.scene3d;delete out.wireRoutes;if(out.objectLayers){out.objectLayers=structuredClone(out.objectLayers);for(const f of [...before.furniture,...after.furniture].filter(panel))delete out.objectLayers.assignments?.['furniture:'+f.id];}return out;};
 if(!equal(rest(before),rest(after)))throw Error('插座布置视图中建筑、装修及其他方案资料只读');
}
function areaPrefix(index){
 let prefix='';
 for(let n=index+1;n>0;n=Math.floor((n-1)/26)){
  prefix=String.fromCharCode(65+(n-1)%26)+prefix;
 }
 return prefix;
}
function roomFor(rooms,x,y){
 const {inPoly}=root.FurnishGeometry||require('./layout-geometry.js');
 return rooms?.find(room=>inPoly(x,y,room.poly))||null;
}
function perimeter(poly){
 let ring=poly;
 const twiceArea=ring.reduce((area,[x,y],i)=>{
  const [nx,ny]=ring[(i+1)%ring.length];
  return area+x*ny-y*nx;
 },0);
 if(!twiceArea)return [];
 if(twiceArea<0)ring=ring.slice().reverse();
 const start=ring.reduce((first,p,i)=>p[1]<ring[first][1]||p[1]===ring[first][1]&&p[0]<ring[first][0]?i:first,0);
 const edges=[];
 let offset=0;
 for(let i=0;i<ring.length;i++){
  const a=ring[(start+i)%ring.length],b=ring[(start+i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(!length)continue;
  edges.push({a,ux:dx/length,uy:dy/length,length,offset});
  offset+=length;
 }
 return edges;
}
function orderPanels(items,room){
 if(items.length<2)return items;
 const edges=perimeter(room?.poly||[]);
 const height=f=>P().bottomHeight(f)+(P().height(f)||0)/2;
 const compareId=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
 if(!edges.length)return items.sort((a,b)=>a.cy-b.cy||a.cx-b.cx||height(a)-height(b)||compareId(a,b));
 const positions=items.map(f=>{
  const angle=(f.rot||0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),z=height(f);
  let best;
  for(const edge of edges){
   const x=f.cx-edge.a[0],y=f.cy-edge.a[1],along=Math.max(0,Math.min(edge.length,x*edge.ux+y*edge.uy));
   const depth=edge.ux*y-edge.uy*x;
   // Near a corner, prefer the run the panel faces when the distances are similar.
   const facing=edge.ux*cos+edge.uy*sin;
   const score=Math.hypot(x-along*edge.ux,y-along*edge.uy)+2*(1-facing);
   if(!best||score<best.score)best={f,edge,score,depth,at:edge.offset+along,height:z};
  }
  return best;
 }).sort((a,b)=>a.at-b.at||a.height-b.height||a.depth-b.depth||compareId(a.f,b.f));
 // Keep adjacent same-height plates together even if another level projects between them.
 const runs=[];
 for(const p of positions){
  const run=runs.findLast(({last})=>last.edge===p.edge&&p.at-last.at<=(p.f.w+last.f.w)/2+40&&
   Math.abs(p.depth-last.depth)<=40&&Math.abs(p.height-last.height)<=25);
  if(run){run.items.push(p.f);run.last=p;}
  else runs.push({last:p,items:[p.f]});
 }
 return runs.flatMap(run=>run.items);
}
function pointLocations(furniture,rooms){
 const locations=new Map(),areas=rooms??[];
 const groups=new Map(areas.map((room,i)=>[room.id,{room,prefix:areaPrefix(i),items:[]}]));
 groups.set(null,{room:null,prefix:rooms?areaPrefix(areas.length):'E',items:[]});
 for(const f of furniture){
  if(!panel(f))continue;
  const room=roomFor(areas,f.cx,f.cy);
  groups.get(room?.id??null).items.push(f);
 }
 for(const {room,prefix,items} of groups.values())orderPanels(items,room).forEach((f,i)=>{
  locations.set(f.id,{room,number:prefix+String(i+1).padStart(2,'0')});
 });
 return locations;
}
const curtainPreviewTravelMs=4000;
function curtainPreviewState(target,saved,now){
 if(typeof saved==='boolean')return {levels:[Number(saved)]};
 if(!saved){
  const products=P(),sides=products.curtainOpening.sideFields.filter(field=>products.supports(target,field));
  return {levels:(sides.length?sides:['curtainOpen']).map(field=>products.value(target,field))};
 }
 if(saved.startedAt===undefined)return saved;
 const goal=saved.direction==='open'?1:0;
 const travel=Math.max(0,now-saved.startedAt)/curtainPreviewTravelMs;
 const levels=saved.levels.map(level=>goal?Math.min(goal,level+travel):Math.max(goal,level-travel));
 return levels.every(level=>level===goal)?{levels}:{levels,direction:saved.direction,moving:true};
}
function panelActionTargets(work,rooms){
 const products=P(),furniture=Array.isArray(work)?work:work.furniture;
 const targets=furniture.flatMap(source=>{
  const kind=products.panelActionTarget(source);
  return kind?[{id:source.id,source,kind,name:source.name,cx:source.cx,cy:source.cy,room:roomFor(rooms,source.cx,source.cy),actions:products.panelTargetActions(source)}]:[];
 });
 const strips=(work.ceilings?.items||[]).filter(c=>c.kind==='profile'&&c.section?.light);
 if(!strips.length)return targets;
 const occupied=new Set(furniture.map(f=>f.id)),C=root.FurnishCeiling||require('./ceiling-core.js');
 const regions=new Map((work.ceilings.regions||[]).map(r=>[r.id,r]));
 for(const source of strips){
  const id='ceiling-light:'+source.id;
  if(occupied.has(id)||id.length>200)continue;
  const {u}=source.section.light;
  const stops=C.route(source).map(({a,b,normal})=>a.map((v,i)=>(v+b[i])/2+normal[i]*u));
  const located=stops.map(([cx,cy])=>({cx,cy,room:roomFor(rooms,cx,cy)}));
  const point=located.find(p=>p.room)||located[0];
  const room=rooms?.find(r=>r.id===source.roomId)||point.room;
  const heading=(regions.get(source.regionId)?.name||source.name||'').split(/\s*·\s*/,1)[0].trim();
  const area=heading.endsWith('吊顶')?heading.slice(0,-2):'';
  const label=heading.endsWith('灯带')?heading:(area||'')+'灯带';
  targets.push({id,source,kind:'light',name:source.name,room,cx:point.cx,cy:point.cy,label,actions:products.panelActions.lightActions});
 }
 return targets;
}
function testPanelActions(f,key,gesture,work,preview,lamps=false,entries=f.panelActions,now=Date.now()){
 const products=P(),furniture=Array.isArray(work)?work:work.furniture;
 const byId=new Map(panelActionTargets(work).map(target=>[target.id,target]));
 const actions=entries?products.validateField(f,'panelActions',entries):[];
 const slot=actions.filter(entry=>entry.key===key&&entry.gesture===gesture).map(entry=>{
  const resolved=byId.get(entry.targetId),kind=resolved?.kind;
  const target=resolved?.source??furniture.find(item=>item.id===entry.targetId);
  const covering=kind==='covering'?curtainPreviewState(target,preview.get(target.id),now):null;
  return {entry,target,kind,covering,available:resolved?.actions.includes(entry.action)};
 });
 const fullyOpen=({covering})=>covering.levels.every(level=>level>=1);
 const curtains=slot.filter(({covering,entry})=>covering&&entry.action==='toggle');
 // One group command: a mixed or partly open group goes to fully open first.
 const groupOpens=curtains.length>1?!curtains.every(fullyOpen):null;
 const lightGroupTurnsOn=slot.some(({available,kind,entry})=>
  available&&kind==='light'&&entry.action==='toggle'&&!(preview.get(entry.targetId)??lamps));
 const cycle=slot.filter(({covering,entry})=>covering&&entry.action==='cycle');
 const pausedOpening=cycle.some(({covering})=>covering.direction==='open'&&covering.levels.some(level=>level>0));
 const cycleCommand=cycle.some(({covering})=>covering.moving)?'stop':
  cycle.every(fullyOpen)||pausedOpening?'close':'open';
 return slot.map(({entry,target,kind,covering,available})=>{
  if(!available)return {...entry,target,status:'unavailable'};
  if(entry.action==='cycle'){
   const {levels,direction}=covering;
   const next=cycleCommand==='stop'?{levels,direction}:{levels,direction:cycleCommand,startedAt:now};
   preview.set(target.id,next);
   return {...entry,target,status:kind,command:cycleCommand};
  }
  const value=entry.action==='toggle'?(kind==='light'?lightGroupTurnsOn:groupOpens??!covering.levels.some(level=>level>0)):
   entry.action==='on'||entry.action==='open';
  preview.set(entry.targetId,value);
  return {...entry,target,status:kind,value};
 });
}
const leadingCode=/^([EN]\d+)(?:\s*[·・:：-]\s*|\s+|(?=[\u3400-\u9fff])|$)/i;
const numberedLabel=/^[A-Z]{1,3}\d{2,}\s*[·・:：]\s*/;
function pointName(name){
 let label=typeof name==='string'?name.trim():'';
 while(leadingCode.test(label)||numberedLabel.test(label))label=label.replace(leadingCode,'').replace(numberedLabel,'');
 return label.replace(/\s*[·・]\s*N\d+(?=\s*(?:[·・]|$))/gi,'').trim();
}
function displayName(f){return panel(f)?pointName(f.name)||P().kind(f):f?.name;}
function legacyCode(name){return typeof name==='string'?name.trim().match(leadingCode)?.[1].toUpperCase():undefined;}
function renamePoint(previous,input){
 const name=pointName(input);
 if(!name)throw Error('请输入用途／名称');
 return name;
}
function purpose(name,roomNames=[]){
 const label=pointName(name);
 const room=roomNames.filter(Boolean).sort((a,b)=>b.length-a.length).find(name=>label.startsWith(name));
 return room?label.slice(room.length).replace(/^[\s·・:：-]+/,''):label;
}
function actionTargetLabel(f,roomNames=[]){
 const products=P(),kind=products.kind(f);
 const segments=pointName(f.name).split(/\s*·\s*/);
 const parts=segments.map(part=>purpose(part,roomNames)).filter(Boolean);
 const label=parts[0]||kind;
 const branded=(f.brand||'').split(/[/／]/).map(brand=>brand.trim()).some(brand=>brand&&label.startsWith(brand));
 if(products.panelActionTarget(f)==='covering'){
  if(branded)return kind;
  return /帘/.test(label)?label:label+kind;
 }
 if(kind==='平板灯'&&segments[0]==='厨房平板灯'&&roomNames.includes('厨房'))return '主灯';
 if(label==='主灯')return label;
 if(branded&&label.includes(kind))return kind;
 return !label.includes(kind)&&parts.slice(1).some(part=>part.includes(kind))?label+kind:label;
}
const noteSeparator=/([，,。；;、／\n])/;
const noteCode=/(?<![A-Z0-9])E\d+(?![A-Z0-9])/gi;
function legacyControls(panels){
 const aliases=new Map(),sources=new Map();
 for(const f of panels){
  const code=legacyCode(f.name);
  if(code?.startsWith('E'))aliases.set(code,aliases.has(code)?null:f);
 }
 for(const f of panels){
  if(!P().panelSpec(f)?.gangs)continue;
  const clauses=pointName(f.name).split(noteSeparator);
  const matches=[];
  for(const [index,clause] of clauses.entries()){
   if(!/双控|两地控制|两地联动|两处控制|米家(?:场景)?联动|无线联动/i.test(clause))continue;
   if(/不做|不与|不跟|不接|不联动|不可|取消|待定|待确认|待核/.test(clause))continue;
   const codes=[...new Set(clause.match(noteCode)?.map(v=>v.toUpperCase()))];
   if(codes.length!==1)continue;
   const [code]=codes,other=aliases.get(code);
   if(!other||other.id===f.id||!P().panelSpec(other)?.gangs)continue;
   const methods=[
    ...(/有线|物理|双控\s*[（(]\s*电路\s*[）)]/.test(clause)?['wired']:[]),
    ...(/米家|无线|双控\s*[（(]\s*智能\s*[）)]/.test(clause)?['mijia']:[])
   ];
   matches.push({index,code,targetId:other.id,methods});
  }
  if(matches.length)sources.set(f.id,{clauses,matches});
 }
 return sources;
}
function migratePointNames(furniture){
 const panels=furniture.filter(panel),legacy=legacyControls(panels);
 for(const f of panels){
  const source=legacy.get(f.id);
  let name=pointName(f.name);
  if(source){
   const {clauses,matches}=source,links=new Map((f.panelLinks||[]).map(link=>[link.targetId,new Set(link.methods)]));
   for(const {index,targetId,methods} of matches){
    if(!links.has(targetId))links.set(targetId,new Set());
    for(const method of methods)links.get(targetId).add(method);
    clauses[index]=clauses[index].replace(/([与和跟]) *E\d+(?![A-Z0-9])/gi,'$1关联开关').replace(noteCode,'').replace(/ {2,}/g,' ').replace(/([（(]) +/g,'$1');
   }
   name=clauses.join('');
   f.panelLinks=[...links].map(([targetId,methods])=>({targetId,methods:[...methods]}));
  }
  if(name!==f.name)f.name=name||P().kind(f);
 }
 return furniture;
}
function controlPairs(furniture,rooms){
 const panels=furniture.filter(panel),locations=pointLocations(panels,rooms),links=new Map(),references=new Map();
 const switches=new Set(panels.filter(f=>P().panelSpec(f)?.gangs).map(f=>f.id));
 function link(source,target,methods){
  if(!switches.has(source)||!switches.has(target))return;
  for(const [a,b] of [[source,target],[target,source]]){
   if(!links.has(a))links.set(a,new Map());
   const peers=links.get(a);
   if(!peers.has(b))peers.set(b,new Set());
   for(const method of methods)peers.get(b).add(method);
  }
 }
 for(const f of panels)for(const relation of f.panelLinks||[])link(f.id,relation.targetId,relation.methods);
 for(const [id,{matches}] of legacyControls(panels)){
  references.set(id,new Map(matches.map(({code,targetId})=>[code,targetId])));
  for(const {targetId,methods} of matches)link(id,targetId,methods);
 }
 return {locations,links,references};
}
function points(work,plan){
 const panels=new Map(work.furniture.filter(panel).map(f=>[f.id,f]));
 return [...pointLocations(panels.values(),plan?.rooms)].map(([id,location])=>{
  const f=panels.get(id);
  const bottom=P().bottomHeight(f),height=P().height(f);
  const m=plan?(root.FurnishDesign||require('./design-core.js')).furnitureHeightMeasurements(f,plan,work.furniture):{bottom};
  return {id,...location,name:f.name,variant:P().panelSpec(f)||{label:P().definition(f).trackSocket.label},bottom,center:bottom+height/2,finishedBottom:m.bottom,finishedCenter:m.bottom===null?null:m.bottom+height/2};
 });
}
const surfaceCache=new Map();
function mountingWalls(plan){
 const W=root.FurnishWallFinish||require('./wall-finish-core.js');
 const outline=([x,y,X,Y])=>[[x,y],[X,y],[X,Y],[x,Y]];
 return [
  ...(plan.walls||[]).map((r,i)=>({poly:outline(r),label:'墙 '+(i+1),...W.vertical(r,plan)})),
  ...(plan.wallFinish?.solids||[]).map(s=>({poly:s.poly||outline(s.rect),label:'墙面饰层',bottom:s.bottom,top:s.top}))
 ];
}
function surfaces(plan,work,f){
 const G=root.FurnishGeometry||require('./layout-geometry.js'),M=root.FurnishCabinetMotion||require('./cabinet-motion.js'),out=[];
 const floor=P().floorBase(plan,f,work.furniture),key=JSON.stringify([plan.walls,plan.wallFinish?.solids,plan.furnitureDatum,plan.floorFinish,plan.rooms,plan.markers,plan.ceilingHeight,work.furniture.filter(v=>!panel(v)),{...f,cx:0,cy:0,rot:0},floor]);
 if(surfaceCache.has(key))return surfaceCache.get(key);
 const bottom=G.bodyParts(f,plan,work.furniture).flatMap(p=>p.vertices||[]).map(v=>v[1]),range=bottom.length?{bottom:Math.min(...bottom),top:Math.max(...bottom)}:null;
 if(!range)return out;
 function edges(poly,meta,parts=[]){
  const area=poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-b[0]*a[1];},0),sign=area>=0?1:-1;
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<f.w-1e-6)continue;const normal=[sign*dy/length,-sign*dx/length],mid=[(a[0]+b[0])/2+normal[0]*.1,(a[1]+b[1])/2+normal[1]*.1];
   if(parts.some(p=>G.inPoly(mid[0],mid[1],p)))continue;
   out.push({...meta,key:meta.key+':'+i,a,b,normal,length});
  }
 }
 for(const [i,wall]of mountingWalls(plan).entries()){
  if(wall.bottom<=range.bottom+1e-6&&wall.top>=range.top-1e-6)
   edges(wall.poly,{key:'wall:'+i,label:wall.label,kind:'wall'});
 }
 for(const host of work.furniture.filter(v=>floor.known&&!panel(v)&&(v.cabinet||v.kitchen)&&P().floorBase(plan,v,work.furniture).known)){
  const parts=G.bodyParts(host,plan,work.furniture).filter(p=>p.actualBoard&&p.vertical?.bottom<=range.bottom+1e-6&&p.vertical?.top>=range.top-1e-6),polys=parts.map(p=>M.section(p,range));
  parts.forEach((part,i)=>edges(polys[i],{key:'cabinet:'+host.id+':'+i,label:host.name+' · '+part.boardName,kind:'cabinet',hostId:host.id},polys));
 }
 surfaceCache.set(key,out);if(surfaceCache.size>4)surfaceCache.delete(surfaceCache.keys().next().value);return out;
}
function place(f,surface,offset){
 if(!Number.isFinite(offset)||offset<f.w/2-1e-6||offset>surface.length-f.w/2+1e-6)throw Error('面板须完整落在所选面内；中心距起点应在 '+(f.w/2)+'～'+Number((surface.length-f.w/2).toFixed(1))+' mm');
 const t=offset/surface.length,n=surface.normal;
 return {...f,cx:surface.a[0]+(surface.b[0]-surface.a[0])*t+n[0]*f.d/2,cy:surface.a[1]+(surface.b[1]-surface.a[1])*t+n[1]*f.d/2,rot:(Math.atan2(-n[0],n[1])*180/Math.PI+360)%360};
}
function nearest(f,faces,limit=Infinity,{turn=false,accept=()=>true}={}){
 const a=(f.rot||0)*Math.PI/180,n=[-Math.sin(a),Math.cos(a)];let best=null;
 for(const s of faces){
  const dx=f.cx-s.a[0],dy=f.cy-s.a[1];
  if(turn?dx*s.normal[0]+dy*s.normal[1]<-1e-6:n[0]*s.normal[0]+n[1]*s.normal[1]<.99999)continue;
  const offset=(dx*(s.b[0]-s.a[0])+dy*(s.b[1]-s.a[1]))/s.length;
  if(offset<f.w/2||offset>s.length-f.w/2)continue;
  const position=place(f,s,offset),distance=Math.hypot(position.cx-f.cx,position.cy-f.cy);
  if(distance<=limit&&(!best||distance<best.distance)&&accept(position,s))best={surface:s,offset,position,distance};
 }
 return best;
}
function snapMount(f,faces,limit,plan,furniture){
 const G=root.FurnishGeometry||require('./layout-geometry.js'),products=P(),base=products.floorBase(plan,f,furniture);
 if(!base.known)return null;
 const range=products.vertical(f),walls=mountingWalls(plan).filter(w=>w.top>range.bottom+base.z+1e-6&&w.bottom<range.top+base.z-1e-6);
 return nearest(f,faces,limit,{turn:true,accept:(next,s)=>{
  const target=products.floorBase(plan,next,furniture);
  if(!target.known||target.z!==base.z)return false;
  const outline=G.corners(next);
  if(walls.some(w=>G.polygonOverlap(outline,w.poly,1e-6)))return false;
  const host=s.hostId&&furniture.find(v=>v.id===s.hostId);
  return !host||!G.volumeOverlap(next,host,plan,furniture);
 }});
}
function replacePanel(f,candidate,variant,plan,work){
 if(!panel(f)||!panel(candidate))throw Error('请选择插座或开关面板');
 const products=P(),D=root.FurnishDesign||require('./design-core.js'),G=root.FurnishGeometry||require('./layout-geometry.js');
 const base=f.type===candidate.type?f:D.replaceFurniture(f,candidate,{anchor:'center'});
 const next=variant===undefined?{...base}:products.editPanelVariant(base,variant);
 next.name=f.name;
 next.mountHeight=products.bottomHeight(f);
 const a=(f.rot||0)*Math.PI/180,depth=(next.d-f.d)/2;
 next.cx=f.cx-Math.sin(a)*depth;next.cy=f.cy+Math.cos(a)*depth;
 products.validate(next);
 if(next.w===f.w&&next.d===f.d&&products.height(next)===products.height(f))return next;
 const mount=nearest(f,surfaces(plan,work,f),2);
 if(mount){
  const faces=surfaces(plan,work,next).filter(s=>s.kind===mount.surface.kind&&s.hostId===mount.surface.hostId);
  if(!nearest(next,faces,2))throw Error('新面板无法完整放在原安装面内');
 }
 if(work.furniture.some(peer=>peer.id!==f.id&&G.volumeOverlap(next,peer,plan,work.furniture)&&!G.volumeOverlap(f,peer,plan,work.furniture)))throw Error('新面板会与附近物体重叠');
 return next;
}
const panelSpacing=Object.freeze({gap:4,threshold:50});
const panelPose=['cx','cy','rot','w','d','h','mountHeight'];
const independentPanel=f=>!f.obj&&P().family(f,'wall-panel');
const rowTolerance=2,spacingEpsilon=1e-6;
function panelRow(f,panels,plan){
 const angle=(f.rot||0)*Math.PI/180,ux=Math.cos(angle),uy=Math.sin(angle),products=P();
 const datum=o=>products.floorBase(plan,o,panels);
 const base=datum(f),room=roomFor(plan.rooms,f.cx,f.cy);
 const level=o=>products.bottomHeight(o)+products.height(o)/2;
 const row=[{f,at:0}];
 if(!base.known)return {row,ux,uy};
 for(const peer of panels){
  if(peer===f||Math.cos(((peer.rot||0)-(f.rot||0))*Math.PI/180)<.99999)continue;
  const dx=peer.cx-f.cx,dy=peer.cy-f.cy;
  const backOffset=-dx*uy+dy*ux-(peer.d-f.d)/2;
  if(Math.abs(backOffset)>rowTolerance)continue;
  const peerRoom=roomFor(plan.rooms,peer.cx,peer.cy),peerBase=datum(peer);
  if((room&&peerRoom&&room!==peerRoom)||!peerBase.known||Math.abs(base.z+level(f)-peerBase.z-level(peer))>rowTolerance)continue;
  row.push({f:peer,at:dx*ux+dy*uy});
 }
 row.sort((a,b)=>a.at-b.at||a.f.id.localeCompare(b.f.id));
 const gap=(a,b)=>b.at-a.at-(a.f.w+b.f.w)/2;
 let first=row.findIndex(p=>p.f===f),last=first;
 while(first>0&&gap(row[first-1],row[first])<panelSpacing.threshold-spacingEpsilon)first--;
 while(last+1<row.length&&gap(row[last],row[last+1])<panelSpacing.threshold-spacingEpsilon)last++;
 return {row:row.slice(first,last+1),ux,uy};
}
function nearbyPanelCopy(f,plan,work){
 const G=root.FurnishGeometry||require('./layout-geometry.js'),Z=root.FurnishZoneGeometry||require('./zone-geometry.js');
 const D=root.FurnishDesign||require('./design-core.js');
 const products=P(),items=work.furniture,walls=mountingWalls(plan),range=products.vertical(f),rooms=plan.rooms||[];
 if(!range)return null;
 const roomAt=({cx,cy})=>rooms.find(r=>(r.polys||[r.poly]).some(p=>G.inPoly(cx,cy,p)));
 const home=roomAt(f),base=products.floorBase(plan,f,items);
 const {row,ux,uy}=panelRow(f,items.filter(panel),plan),spacing=f.w+panelSpacing.gap;
 const fits=next=>{
  const room=roomAt(next);
  if(!room||home&&room!==home)return false;
  const outline=G.corners(next),roomPolys=room.polys||[room.poly];
  if(Z.area(Z.decompose([outline,...roomPolys],p=>Z.inside(p,outline)&&!roomPolys.some(q=>Z.inside(p,q))))>1e-6)return false;
  const floor=products.floorBase(plan,next,items);
  if(walls.some(w=>(!floor.known||w.top>range.bottom+floor.z+1e-6&&w.bottom<range.top+floor.z-1e-6)&&G.polygonOverlap(outline,w.poly,1e-6)))return false;
  const vertical=D.furnitureVerticalBounds(next,plan,items);
  const clearanceOutline=G.corners({...next,w:next.w+2*panelSpacing.gap});
  return !items.some(peer=>{
   if(!panel(peer))return G.volumeOverlap(next,peer,plan,items);
   if(!G.verticalOverlap(next,peer,[vertical,D.furnitureVerticalBounds(peer,plan,items)]))return false;
   const aligned=Math.cos(((peer.rot||0)-(next.rot||0))*Math.PI/180)>.99999;
   const backOffset=-(peer.cx-next.cx)*uy+(peer.cy-next.cy)*ux-(peer.d-next.d)/2;
   return G.polygonOverlap(aligned&&Math.abs(backOffset)<=rowTolerance?clearanceOutline:outline,G.corners(peer),1e-6);
  });
 };
 const left=row[0],right=row.at(-1);
 const offsets=[spacing,-spacing,right.at+(right.f.w+f.w)/2+panelSpacing.gap,left.at-(left.f.w+f.w)/2-panelSpacing.gap];
 const shift=(along,front=0)=>({...f,cx:f.cx+along*ux-front*uy,cy:f.cy+along*uy+front*ux});
 const mount=base.known&&nearest(f,surfaces(plan,work,f),rowTolerance);
 if(mount){
  for(const offset of new Set(offsets)){
   if(Math.abs(offset)>Math.max(400,3*spacing))continue;
   const hit=nearest(shift(offset),[mount.surface],rowTolerance);
   if(!hit||!fits(hit.position))continue;
   const floor=products.floorBase(plan,hit.position,items);
   if(floor.known&&floor.z===base.z)return hit.position;
  }
 }
 // Keep the fallback local even beside a corner or a full mounting face.
 const depth=f.d+Math.max(30,Math.min(f.w/2,100));
 for(const step of [1,2,3]){
  const side=step*spacing,front=step*depth;
  for(const next of [shift(side),shift(-side),shift(0,front),shift(0,-front),shift(side,front),shift(-side,front)]){
   if(fits(next))return next;
  }
 }
 return null;
}
function normalizePanelGaps(before,work,planFor,{locked=f=>!!f.locked}={}){
 const obstacles=work.furniture.filter(panel),panels=obstacles.filter(independentPanel);
 if(panels.length<2)return;
 const old=new Map(before.furniture.map(f=>[f.id,f]));
 const edited=new Set(panels.filter(f=>!locked(f)&&panelPose.some(key=>f[key]!==old.get(f.id)?.[key])));
 if(!edited.size)return;
 const plan=planFor(),G=root.FurnishGeometry||require('./layout-geometry.js');
 let adjusted=false;
 for(const f of edited){
  const {row,ux,uy}=panelRow(f,panels,plan);
  if(row.length<2)continue;
  let at=0;
  const desired=row.map((p,i)=>i?(at+=(row[i-1].f.w+p.f.w)/2+panelSpacing.gap):0);
  const offsets=row.map((p,i)=>p.at-desired[i]);
  if(offsets.every(offset=>Math.abs(offset-offsets[0])<=spacingEpsilon))continue;
  const members=new Set(row.map(p=>p.f));
  const fixed=row.findIndex(p=>locked(p.f));
  // A stationary member anchors the row when possible. Try other anchors if
  // the resulting row would leave an installation face or meet an obstacle.
  const anchors=fixed>=0?[fixed]:row.map((_,i)=>i).sort((a,b)=>Number(edited.has(row[a].f))-Number(edited.has(row[b].f))||Math.abs(row[a].at)-Math.abs(row[b].at));
  const mounts=new Map();
  for(const anchor of anchors){
   const shifts=offsets.map(offset=>offsets[anchor]-offset);
   const moves=row.flatMap(({f:member},i)=>Math.abs(shifts[i])<=spacingEpsilon?[]:[{
    member,next:{...member,cx:member.cx+shifts[i]*ux,cy:member.cy+shifts[i]*uy}
   }]);
   const fits=moves.every(({member,next})=>{
    if(locked(member))return false;
    if(!mounts.has(member))mounts.set(member,nearest(member,surfaces(plan,work,member),rowTolerance));
    const mount=mounts.get(member);
    if(mount&&!nearest(next,[mount.surface],rowTolerance))return false;
    return !obstacles.some(peer=>!members.has(peer)&&G.volumeOverlap(next,peer,plan,work.furniture));
   });
   if(!fits)continue;
   for(const {member,next} of moves)Object.assign(member,{cx:next.cx,cy:next.cy});
   adjusted=true;
   break;
  }
 }
 return adjusted;
}
const wireKinds=Object.freeze({power:'电线',network:'网线'});
const routeLimits=Object.freeze({routes:500,points:100,xy:1000000,z:20000});
const conduitWalls=Object.freeze({16:1.3,20:1.4,25:1.5,32:1.6});
const conduitDiameters=Object.freeze(Object.keys(conduitWalls).map(Number));
const conduitDefault=20;
function conduitProfile(diameter=conduitDefault){
 if(!conduitDiameters.includes(diameter))throw Error('请选择 Ø16、20、25 或 32 mm 电工套管');
 return {diameter,wall:conduitWalls[diameter],bendRadius:3*diameter,
  stockLength:3000,sleeveLength:2*diameter,sleeveDiameter:1.2*diameter};
}
const identifier=v=>typeof v==='string'&&v.length>0&&v.length<=200&&!/[\x00-\x1f]/.test(v);
const validCoordinate=(v,limit)=>Number.isFinite(v)&&Math.abs(v)<=limit;
const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
function validateRoutes(routes){
 if(routes===undefined)return;
 if(!Array.isArray(routes)||routes.length>routeLimits.routes)throw Error('布线路径列表无效，最多 500 条');
 const ids=new Set();
 for(const route of routes){
  if(!identifier(route?.id)||ids.has(route.id)||!Object.hasOwn(wireKinds,route.kind)||typeof route.name!=='string'||!route.name.trim()||route.name.length>80)throw Error('线路编号、类别或名称无效');
  conduitProfile(route.conduitDiameter);
  ids.add(route.id);
  const pts=route.points;
  if(!Array.isArray(pts)||pts.length<2||pts.length>routeLimits.points)throw Error('每条线路须有 2–100 个路径点');
  for(const [i,p] of pts.entries()){
   if(!p||!validCoordinate(p.x,routeLimits.xy)||!validCoordinate(p.y,routeLimits.xy)||!validCoordinate(p.z,routeLimits.z))throw Error('线路坐标或标高无效');
   if(p.furnitureId!==undefined&&(!identifier(p.furnitureId)||(i!==0&&i!==pts.length-1)))throw Error('只有线路首尾可关联有效点位编号');
   if(i&&distance(pts[i-1],p)===0&&!pts[i-1].furnitureId&&!p.furnitureId)throw Error('线路相邻路径点重合');
  }
 }
}
function boxKind(f){
 return f?.type==='electrical_box_strong'?'power':f?.type==='electrical_box_weak'?'network':null;
}
function endpointKind(f){
 if(!f||f.obj)return null;
 if(boxKind(f))return boxKind(f);
 if(!panel(f))return null;
 const spec=P().panelSpec(f);
 if(spec?.requiresWiring===false)return null;
 if(spec?.group==='信息类'&&/net[56]/.test(P().value(f,'panelVariant')))return 'network';
 if(spec?.gangs||spec?.group==='插座类'||spec?.control==='sensor'||P().definition(f)?.trackSocket)return 'power';
 return null;
}
function endpoint(f,plan,furniture){
 const base=P().floorBase(plan,f,furniture),range=P().vertical(f);
 return {x:f.cx,y:f.cy,z:base.known&&range?base.z+(range.bottom+range.top)/2:null};
}
// Equal trims bisect the turn in the measured plane. The 3D pass then
// handles elevation changes while keeping each plan bend within its angle.
const cornerTrim=150;
const coordinates=['x','y','z'];
const vertical=v=>v[0]===0&&v[1]===0&&v[2]!==0;
const level=v=>v[2]===0&&Math.hypot(v[0],v[1])>0;
function chamfer(points,axes){
 const path=[points[0]],source=[0],reversals=[];
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1];
  const incoming=axes.map(k=>b[k]-a[k]),outgoing=axes.map(k=>c[k]-b[k]);
  const ab=Math.hypot(...incoming),bc=Math.hypot(...outgoing);
  const dot=incoming.reduce((sum,v,k)=>sum+v*outgoing[k],0)/(ab*bc);
  if(dot<=-1+1e-8)reversals.push(i);
  // Keep a conduit at the junction where a level run meets a wall riser.
  const wallRiser=axes===coordinates&&((vertical(incoming)&&level(outgoing))||(level(incoming)&&vertical(outgoing)));
  if(wallRiser||!Number.isFinite(dot)||dot>1e-9||reversals.at(-1)===i){path.push(b);source.push(i);continue;}
  const trim=Math.min(cornerTrim,ab/3,bc/3);
  const toward=(p,len)=>Object.fromEntries(coordinates.map(k=>[k,b[k]+(p[k]-b[k])*(trim/len)]));
  path.push(toward(a,ab),toward(c,bc));
  source.push(i,i);
 }
 path.push(points.at(-1));
 source.push(points.length-1);
 return {path,source,reversals};
}
function networkPath(points){
 const plan=chamfer(points,['x','y']);
 const spatial=chamfer(plan.path,coordinates);
 return {path:spatial.path,reversals:[...new Set([...plan.reversals,...spatial.reversals.map(i=>plan.source[i])])]};
}
function routeGeometry(route,plan,furniture,byId=new Map(furniture.map(f=>[f.id,f]))){
 const points=route.points.map(p=>{
  if(!p.furnitureId)return p;
  const f=byId.get(p.furnitureId);
  if(endpointKind(f)!==route.kind)return {...p,unresolved:true};
  const current=endpoint(f,plan,furniture);
  return current.z===null?{...p,x:current.x,y:current.y,unresolved:true}:current;
 });
 const unresolved=points.some(p=>p.unresolved);
 const {path,reversals}=route.kind==='network'&&points.length>2?networkPath(points):{path:points,reversals:[]};
 const length=unresolved||reversals.length?null:path.reduce((sum,p,i)=>i?sum+distance(path[i-1],p):0,0);
 return {points,path,length,unresolved,reversals};
}
const api={panel,assertEditable,pointName,displayName,renamePoint,purpose,actionTargetLabel,panelActionTargets,controlPairs,roomFor,pointLocations,points,migratePointNames,testPanelActions,surfaces,place,nearest,snapMount,replacePanel,nearbyPanelCopy,normalizePanelGaps,wireKinds,routeLimits,validateRoutes,boxKind,endpointKind,endpoint,routeGeometry,conduitDiameters,conduitDefault,conduitProfile};
root.FurnishElectrical=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
