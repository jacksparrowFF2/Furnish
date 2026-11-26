/* Continuous swept-disc checks against the effective plan. All units are mm. */
(function(root){
'use strict';
const geometry=()=>root.FurnishGeometry||require('./layout-geometry.js');
const zone=()=>root.FurnishZoneGeometry||require('./zone-geometry.js');
const EPS=1e-5,CELL=500,MAX_NODES=220000;
const rect=([x,y,X,Y])=>[[x,y],[X,y],[X,Y],[x,Y]];
const edges=poly=>poly.map((point,i)=>[point,poly[(i+1)%poly.length]]).filter(([a,b])=>a[0]!==b[0]||a[1]!==b[1]);
const bounds=(a,b)=>[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const overlaps=(a,b)=>a[0]<=b[2]&&b[0]<=a[2]&&a[1]<=b[3]&&b[1]<=a[3];
const expand=(box,r)=>[box[0]-r,box[1]-r,box[2]+r,box[3]+r];

function pointDistance(p,[a,b]){
 const x=b[0]-a[0],y=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y)));
 return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y);
}
function segmentDistance(a,b,[c,d]){
 if(overlaps(bounds(a,b),bounds(c,d))&&cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0)return 0;
 return Math.min(pointDistance(a,[c,d]),pointDistance(b,[c,d]),pointDistance(c,[a,b]),pointDistance(d,[a,b]));
}
function distance(a,b,entry){
 if(entry.poly&&(zone().inside(a,entry.poly)||zone().inside(b,entry.poly)))return 0;
 const measure=a[0]===b[0]&&a[1]===b[1]?edge=>pointDistance(a,edge):edge=>segmentDistance(a,b,edge);
 let result=Infinity;
 for(const edge of entry.edges)result=Math.min(result,measure(edge));
 return result;
}
function obstacleIndex(entries){
 const cells=new Map(),large=[];
 function* keys(box){
  for(let y=Math.floor(box[1]/CELL);y<=Math.floor(box[3]/CELL);y++)
   for(let x=Math.floor(box[0]/CELL);x<=Math.floor(box[2]/CELL);x++)yield x+','+y;
 }
 for(const entry of entries){
  if((entry.box[2]-entry.box[0]+CELL)*(entry.box[3]-entry.box[1]+CELL)>CELL*CELL*400){large.push(entry);continue;}
  for(const key of keys(entry.box)){if(!cells.has(key))cells.set(key,[]);cells.get(key).push(entry);}
 }
 return box=>new Set([...large,...[...keys(box)].flatMap(key=>cells.get(key)||[])]);
}
function doorLeaf(leaf,open,G){
 const axis=open?G.doorOpenVector(leaf):leaf.c,normal=[-axis[1],axis[0]],offset=G.doorLeafOffset(leaf);
 return [[0,offset-20],[leaf.len,offset-20],[leaf.len,offset+20],[0,offset+20]]
  .map(([u,v])=>leaf.h.map((coordinate,i)=>coordinate+u*axis[i]+v*normal[i]));
}
function environment(plan,furniture,options){
 const G=geometry(),Z=zone(),W=root.FurnishWallFinish||require('./wall-finish-core.js'),
  D=root.FurnishDraft||require('./floorplan-core.js'),P=root.FurnishProject||require('./project-core.js'),
  Products=root.FurnishProducts||require('./product-rules.js'),S=root.FurnishServices||require('./service-core.js'),
  C=root.FurnishCeiling||require('./ceiling-core.js');
 const spatial=W.spatial(plan),bottom=options.bottom??0,top=bottom+options.height,
  overlapsHeight=range=>!range||range.bottom<top-EPS&&range.top>bottom+EPS;
 const entries=[],pending=[],unmodeled=[];
 const add=(poly,kind,id,range,unknown=false)=>{
  if(!poly?.length||!overlapsHeight(range))return;
  const entry={kind,id,poly,edges:edges(poly),box:G.bbox(poly)};
  entries.push(entry);
  if(unknown)pending.push({kind,id});
 };
 const openings=[...(plan.doors||[]),...(plan.slides||[])].map(door=>rect(door.rect));
 const rooms=(spatial.physicalRooms||spatial.rooms).filter(room=>room.counted!==false);
 const domain=rooms.map(room=>room.poly).concat(openings);
 const contains=point=>domain.some(poly=>Z.inside(point,poly));
 const floor=Z.outline(Z.decompose(domain,contains));
 if(!floor.rings.length)throw Error('当前户型没有可用的室内范围');
 for(const ring of floor.rings)for(const [a,b] of edges(ring))entries.push({kind:'boundary',id:'floor-boundary',edges:[[a,b]],box:bounds(a,b)});
 spatial.walls.forEach((wall,index)=>add(rect(wall),'wall',plan.wallRefs?.[index]||String(index),W.vertical(wall,spatial)));
 for(const beam of plan.beams||[]){
  const range=D.beamVertical(beam,P.ceilingHeight(plan)),unknown=!range||range.assumed;
  add(beam.poly,'beam',beam.id,unknown?null:range,unknown);
 }
 for(const room of plan.rooms){
  const area=plan.floorFinish?.areas?.[room.id],high=room.ceilingHeight??plan.ceilingHeight;
  if(Number.isFinite(high))add(room.poly,'ceiling',room.id,{bottom:high,top:Infinity});
  if(area){
   if(Number.isFinite(area.finishedZ))add(room.poly,'floor-level',room.id,{bottom:-Infinity,top:area.finishedZ});
   else unmodeled.push({kind:'floor-level',id:room.id,poly:room.poly});
  }
 }
 for(const part of plan.ceilings?.items||[]){
  if(part.kind==='flat'){add(part.polygon,'ceiling-part',part.id,{bottom:part.height,top:part.height+part.thickness});continue;}
  for(const band of C.profileBands(part))for(const leg of band.legs)add(leg.poly,'ceiling-profile',part.id,band);
 }
 for(const pipe of S.pipes(plan))add(pipe.poly,'service',pipe.id,pipe.vertical);
 const doors=new Map();
 for(const row of options.doorStates||[]){
  if(doors.has(row.index)||!plan.doors?.[row.index])throw Error('门编号重复或不存在');
  doors.set(row.index,row.state);
 }
 for(const [index,door] of (plan.doors||[]).entries()){
  const id=plan.doorRefs?.[index]||String(index),mode=doors.get(index)||'open';
  if(!door.h||!door.c||!door.o||!door.len){unmodeled.push({kind:'door-leaf',id,poly:rect(door.rect)});continue;}
  const source=plan.customDraft?.openings.find(opening=>opening.id===id),head=source?.height;
  if(Number.isFinite(head))add(rect(door.rect),'door-header',id,{bottom:head,top:Infinity});
  else unmodeled.push({kind:'door-height',id,poly:rect(door.rect)});
  const polys=mode==='sweep'?G.doorSwingPolygons(door):G.doorLeaves(door).map(leaf=>doorLeaf(leaf,mode==='open',G));
  for(const poly of polys)add(poly,'door-'+mode,id,Number.isFinite(head)?{bottom:0,top:head}:null);
 }
 for(const [index,slide] of (plan.slides||[]).entries())unmodeled.push({kind:'sliding-door',id:plan.slideRefs?.[index]||String(index),poly:rect(slide.rect)});
 const byId=new Map(furniture.map(item=>[item.id,item])),use=new Set(options.useFurnitureIds||[]);
 if(use.size!==(options.useFurnitureIds||[]).length||[...use,options.removeFurnitureId].filter(Boolean).some(id=>!byId.has(id))||use.has(options.removeFurnitureId))throw Error('使用或搬运的家具 ID 无效');
 for(const item of furniture){
  if(item.id===options.removeFurnitureId||item.type==='rug')continue;
  const invalid=Products.modelError(item);
  if(invalid)for(const poly of G.footprints(item))add(poly,'furniture-model',item.id,null,true);
  else for(const part of G.bodyParts(item,plan,furniture))add(part.p,'furniture',item.id,part.vertical,!part.vertical);
  if(!use.has(item.id))continue;
  const datum=Products.floorBase(plan,item,furniture),motions=P.furnitureOpeningZones(item).filter(motion=>motion.kind!=='cabinetpassage');
  if(!motions.length)unmodeled.push({kind:'furniture-use',id:item.id});
  for(const motion of motions){
   const range=datum.known&&motion.ranges?.length?{
    bottom:datum.z+Math.min(...motion.ranges.map(range=>range[0])),
    top:datum.z+Math.max(...motion.ranges.map(range=>range[1]))
   }:null;
   add(motion.poly,'furniture-sweep',item.id,range,!range);
  }
 }
 return {entries,pending,unmodeled,contains,box:G.bbox(floor.rings.flat())};
}

function sampledPath(from,to,step,box,clear){
 const [left,top,right,bottom]=box,columns=Math.ceil((right-left)/step)+1,rows=Math.ceil((bottom-top)/step)+1;
 if(columns*rows>MAX_NODES)throw Error('路径网格超出计算上限，请增大 resolution');
 const coords=id=>[left+(id%columns)*step,top+Math.floor(id/columns)*step];
 const seen=new Int32Array(columns*rows).fill(-2),queue=new Int32Array(columns*rows);
 const near=point=>{
  const x=Math.round((point[0]-left)/step),y=Math.round((point[1]-top)/step),ids=[];
  for(let j=Math.max(0,y-2);j<=Math.min(rows-1,y+2);j++)
   for(let i=Math.max(0,x-2);i<=Math.min(columns-1,x+2);i++)ids.push(j*columns+i);
  return ids.filter(id=>clear(point,coords(id)));
 };
 const goals=new Set(near(to));
 if(!goals.size)return null;
 let used=0;
 for(const id of near(from)){seen[id]=-1;queue[used++]=id;}
 let target=-1;
 for(let read=0;read<used;read++){
  const id=queue[read],x=id%columns,y=Math.floor(id/columns),a=coords(id);
  if(goals.has(id)){target=id;break;}
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(x+dx<0||x+dx>=columns||y+dy<0||y+dy>=rows)continue;
   const next=id+dy*columns+dx;
   if(seen[next]!==-2||!clear(a,coords(next)))continue;
   seen[next]=id;queue[used++]=next;
  }
 }
 if(target<0)return null;
 const path=[to];
 for(let id=target;id>=0;id=seen[id])path.push(coords(id));
 path.push(from);path.reverse();
 // Keep the grid as a search aid and recheck each line of the returned path.
 const simplified=[from];
 for(let start=0;start<path.length-1;){
  let end=start+1;
  while(end+1<path.length&&clear(path[start],path[end+1]))end++;
  simplified.push(path[end]);start=end;
 }
 return simplified;
}

function check(plan,furniture,options){
 const from=[options.from.x,options.from.y],to=[options.to.x,options.to.y],
  step=options.resolution??50,diameter=options.depth?Math.hypot(options.width,options.depth):options.width,radius=diameter/2;
 if(options.usePositions?.length){
  const positions=new Map();
  for(const {id,...pose} of options.usePositions){
   const item=furniture.find(value=>value.id===id);
   if(!item||item.kitchen||item.laundryHostId||item.drawerHostId||item.inventoryArray||id===options.removeFurnitureId||positions.has(id))
    throw Error('使用位置只能模拟独立家具，且 ID 必须唯一');
   positions.set(id,pose);
  }
  furniture=furniture.map(item=>positions.has(item.id)?{...item,...positions.get(item.id)}:item);
  plan={...plan,furniture};
 }
 const {entries,pending,unmodeled,contains,box}=environment(plan,furniture,options),near=obstacleIndex(entries);
 const clear=(a,b)=>{
  if(!contains(a)||!contains(b))return false;
  const range=expand(bounds(a,b),radius);
  for(const entry of near(range))if(overlaps(range,entry.box)&&distance(a,b,entry)<radius-EPS)return false;
  return true;
 };
 const endpoints=[clear(from,from),clear(to,to)];
 const path=endpoints.every(Boolean)?(clear(from,to)?[from,to]:sampledPath(from,to,step,box,clear)):null;
 const common={unit:'mm',requestedWidth:options.width,envelopeDiameter:diameter,resolution:step,endpoints,
  ...(options.removeFurnitureId?{removedFromScenario:options.removeFurnitureId}:{}),...(options.usePositions?{usePositions:options.usePositions}:{}),
  limit:'路径使用恒定绝对标高和水平圆包络。矩形搬运货件以外接圆核对；窄处可另做转体、抬升及现场试搬。'};
 if(!path)return {...common,status:'no-path-found',path:[],pending,unmodeled:unmodeled.map(({kind,id})=>({kind,id})),limit:common.limit+' 未找到路径需结合网格分辨率和未建模项复核。'};
 let length=0,bottleneck=null;
 const checks=new Map();
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],range=expand(bounds(a,b),radius);
  length+=Math.hypot(b[0]-a[0],b[1]-a[1]);
  for(const entry of entries){
   const value=distance(a,b,entry)*2;
   if(!bottleneck||value<bottleneck.width)bottleneck={width:value,segment:[a,b],kind:entry.kind,id:entry.id};
  }
  for(const item of unmodeled){
   const poly=item.poly;
   if(!poly||overlaps(range,geometry().bbox(poly))&&distance(a,b,{poly,edges:edges(poly)})<=radius+EPS)checks.set(item.kind+':'+item.id,{kind:item.kind,id:item.id});
  }
 }
 return {...common,status:checks.size?'needs-review':'path-found',path,length,bottleneck,unmodeled:[...checks.values()]};
}
const api={check};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishRoute=api;
})(typeof globalThis!=='undefined'?globalThis:this);
