/* Room semantics and precise placement shared by built-in and imported plans. */
(function(root){
 'use strict';
 const cabinet=()=>root.FurnishCabinet||require('./cabinet-core.js');
 const uses={unassigned:['未分类','Unassigned'],living:['客厅','Living room'],dining:['餐厅','Dining room'],bedroom:['卧室','Bedroom'],study:['书房','Study'],kitchen:['厨房','Kitchen'],bathroom:['卫生间','Bathroom'],balcony:['阳台','Balcony'],hall:['玄关／走廊','Hall'],storage:['储物／衣帽间','Storage'],other:['其他','Other'],bay:['飘窗台','Bay platform']};
 function inferUse(room,setting){
  if(room.counted===false)return 'bay';
  if(Object.hasOwn(uses,setting?.use)&&setting.use!=='bay')return setting.use;
  if(Object.hasOwn(uses,room.use)&&room.use!=='bay')return room.use;
  const text=`${room.id} ${setting?.name||room.name||''}`.toLowerCase();
  for(const [use,re] of [['bathroom',/bath|toilet|卫生|衛生|浴/],['kitchen',/kitchen|厨|廚/],['balcony',/balcony|阳台|陽台/],['storage',/closet|storage|衣帽|储物|儲物/],['study',/study|书房|書房/],['bedroom',/master|child|kid|elder|bedroom|bed|卧|臥|寝/],['dining',/dining|餐厅|餐廳/],['living',/living|studio|客厅|客廳|起居/],['hall',/hall|玄关|玄關|走廊/]])if(re.test(text))return use;
  return 'unassigned';
 }
 function styleFloor(room,setting,style,custom){
  const use=inferUse(room,setting);
  if(['bay','bathroom','kitchen','balcony','other'].includes(use))return null;
  if(['bedroom','study','storage'].includes(use))return style.floor[1];
  if(['living','dining','hall'].includes(use)||custom&&use==='unassigned')return style.floor[0];
  return null;
 }
 function bounds(f){const a=f.rot*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),hw=f.w/2*c+f.d/2*s,hh=f.w/2*s+f.d/2*c;return [f.cx-hw,f.cy-hh,f.cx+hw,f.cy+hh];}
 const resizeAnchors={center:['中心','Center'],left:['左边','Left edge'],right:['右边','Right edge'],top:['上边','Top edge'],bottom:['下边','Bottom edge']};
 function resizeFurniture(f,values,anchor=f.resizeAnchor||'center'){
  if(f.locked)throw Error('家具已锁定，请先解锁');if(!Object.hasOwn(resizeAnchors,anchor))throw Error('尺寸调整基准无效');
  const next={...f};for(const key of ['w','d','h'])if(values[key]!==undefined){const value=values[key];if(!Number.isFinite(value)||value<(key==='h'?10:50)||value>20000)throw Error('宽深须为 50–20000 mm，高须为 10–20000 mm');next[key]=value;}
  const before=bounds(f),after=bounds(next),edges={left:[0,0],right:[0,2],top:[1,1],bottom:[1,3]};if(edges[anchor]){const [axis,edge]=edges[anchor];next[axis?'cy':'cx']+=before[edge]-after[edge];}return cabinet().resize(f,next);
 }
 function pasteFurniture(clipboard,target,planBounds,makeId,available=2000,existingIds=[]){
  if(!clipboard?.items?.length)throw Error('剪贴板没有家具');
  if(clipboard.items.length>available)throw Error('每个方案最多 2000 件家具，请减少粘贴数量');
  if(![clipboard.cx,clipboard.cy,target?.x,target?.y,planBounds?.x,planBounds?.y,planBounds?.w,planBounds?.h].every(Number.isFinite)||planBounds.w<=0||planBounds.h<=0)throw Error('粘贴位置或户型范围无效');
  const boxes=clipboard.items.map(bounds),box=[Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))];
  // Clamp one common translation, never individual items, to preserve the layout.
  const shift=(want,min,max,low,size)=>{const a=low-min,b=low+size-max;return a<=b?Math.max(a,Math.min(b,want)):low+size/2-(min+max)/2;};
  const wanted=[target.x-clipboard.cx,target.y-clipboard.cy],delta=[shift(wanted[0],box[0],box[2],planBounds.x,planBounds.w),shift(wanted[1],box[1],box[3],planBounds.y,planBounds.h)];
  const used=new Set(existingIds),sourceIds=clipboard.items.map(f=>f.id),reserved=new Set(sourceIds),moved=clipboard.cut===true&&!clipboard.cutMoved&&!clipboard.items.some(f=>f.locked)&&sourceIds.every(id=>typeof id==='string'&&id&&!used.has(id))&&reserved.size===sourceIds.length;
  const items=JSON.parse(JSON.stringify(clipboard.items));items.forEach(f=>{if(!moved){let id;do{id=makeId();}while(used.has(id)||reserved.has(id));f.id=id;f.purchaseStatus='planned';delete f.locked;}used.add(f.id);f.cx+=delta[0];f.cy+=delta[1];});
  return {items,moved,adjusted:delta.some((v,i)=>Math.abs(v-wanted[i])>.01),oversized:box[2]-box[0]>planBounds.w||box[3]-box[1]>planBounds.h};
 }
 function replaceFurniture(f,c){
  const base={...f};delete base.cabinet;const next=resizeFurniture(base,{w:c.w,d:c.d,...(c.h!==undefined?{h:c.h}:{})});
  Object.assign(next,{type:c.type,name:c.name,color:c.color,brand:c.brand||'',model:c.model||'',sourceUrl:c.sourceUrl||'',priceDate:c.priceDate||'',referencePrice:c.price,frontClearance:c.frontClearance??600,purchaseStatus:'planned',purchaseNote:''});
  delete next.price;delete next.obj;delete next.catalogId;delete next.catalogSnapshot;delete next.catalogDetached;delete next.curtainStyle;if(c.h===undefined)delete next.h;
  if(c.cabinet&&cabinet().supported(next))next.cabinet=JSON.parse(JSON.stringify(c.cabinet));
  if(c.type==='curtain')next.curtainStyle=c.curtainStyle||'double';
  const laundry=t=>['washer','dryer'].includes(t);
  if(c.type==='waterheater_flat'?f.type!=='waterheater_flat':!(laundry(c.type)&&laundry(f.type)))delete next.mountHeight;
  if(c.type!=='waterheater_flat')delete next.heaterSocket;
  if(c.type==='tripleslidingwindow')next.mountHeight=f.type==='tripleslidingwindow'?(f.mountHeight??900):900;
  if(!(['slidingdoor','tripleslidingdoor','tripleslidingwindow'].includes(c.type)&&['slidingdoor','tripleslidingdoor','tripleslidingwindow'].includes(f.type)))delete next.floorTrack;
  if(!(laundry(c.type)&&laundry(f.type)))delete next.stackHeight;
  if(c.id){next.catalogId=c.id;next.catalogSnapshot=catalogSnapshot(c);}if(c.obj)next.obj=JSON.parse(JSON.stringify(c.obj));return next;
 }
 function catalogSnapshot(c){return {name:c.name,w:c.w,d:c.d,h:c.h,price:c.price,shape:c.shape==='round'?'round':'rect',color:c.color||'#bd9d78',brand:c.brand||'',model:c.model||''};}
 function catalogSource(f,catalog){
  if(f.catalogId)return catalog.find(c=>c.id===f.catalogId)||f.catalogSnapshot||null;
  if(f.catalogSnapshot)return f.catalogSnapshot;
  if(f.catalogDetached)return null;
  const candidates=catalog.filter(c=>c.name===f.name&&(c.shape==='round'?'customround':'custom')===f.type);
  if(candidates.length===1)return candidates[0];
  const exact=candidates.filter(c=>c.w===f.w&&c.d===f.d&&(f.h===undefined||c.h===f.h)&&(!f.brand||c.brand===f.brand)&&(!f.model||c.model===f.model));
  return exact.length===1?exact[0]:null;
 }
 function restoreNotes(list,makeId){
  const ids=new Set(),reserved=new Set(list.map(n=>n.id));return list.map(n=>{const note={...n,x:Number(n.x),y:Number(n.y),color:['accent','teal','ink','paper'].includes(n.color)?n.color:'accent',size:[.8,1,1.4].includes(n.size)?n.size:1};if(typeof note.id!=='string'||!note.id||ids.has(note.id)){do{note.id=makeId();}while(ids.has(note.id)||reserved.has(note.id));}ids.add(note.id);return note;});
 }
 function restoreFurniture(list,{makeId,colorFor}){
  const valid=(Array.isArray(list)?list:[]).filter(f=>f&&typeof f==='object'&&[f.cx,f.cy].every(Number.isFinite)&&Number.isFinite(Number(f.w))&&Number.isFinite(Number(f.d))&&Number(f.w)>0&&Number(f.d)>0),ids=new Set(),reserved=new Set(valid.map(f=>f.id));return valid.map(item=>{
   const f={...item,w:Number(item.w),d:Number(item.d)};if(typeof f.id!=='string'||!f.id||ids.has(f.id)){do{f.id=makeId();}while(ids.has(f.id)||reserved.has(f.id));}ids.add(f.id);
   f.type=typeof f.type==='string'?f.type:'custom';f.name=typeof f.name==='string'?f.name:'家具';f.rot=Number.isFinite(f.rot)?f.rot:0;f.color=typeof f.color==='string'&&/^#[0-9a-f]{3,8}$/i.test(f.color)?f.color:colorFor(f.type);return f;
  });
 }
 function deliveryBounds(base,boxes,padding=250){
  const valid=boxes.filter(b=>b.length===4&&b.every(Number.isFinite)&&b[2]>=b[0]&&b[3]>=b[1]);
  const x=Math.min(base.x,...valid.map(b=>b[0]-padding)),y=Math.min(base.y,...valid.map(b=>b[1]-padding)),right=Math.max(base.x+base.w,...valid.map(b=>b[2]+padding)),bottom=Math.max(base.y+base.h,...valid.map(b=>b[3]+padding));return {x,y,w:right-x,h:bottom-y};
 }
 function measurementGeometry(m,textSize=180){
  const {a,b}=m,length=Math.hypot(b.x-a.x,b.y-a.y);if(length<1)return null;
  let angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;if(angle>90)angle-=180;else if(angle<-90)angle+=180;
  return {length,angle,mx:(a.x+b.x)/2,my:(a.y+b.y)/2,nx:-(b.y-a.y)/length*textSize*.4,ny:(b.x-a.x)/length*textSize*.4,textSize};
 }
 const dirs={left:[0,1],right:[0,-1],top:[1,1],bottom:[1,-1]};
 // Recorded dimensions take priority. Legacy items use the existing model's
 function laundryStack(f,furniture){
  if(!['washer','dryer'].includes(f.type))return null;
  const bottom=f.mountHeight??0,height=f.stackHeight??20;
  const lower=(furniture||[]).find(item=>item.id!==f.id&&['washer','dryer'].includes(item.type)&&item.type!==f.type
   &&Math.abs(item.cx-f.cx)<=5&&Math.abs(item.cy-f.cy)<=5
   &&Math.abs(Math.sin(((item.rot||0)-(f.rot||0))*Math.PI/180))<1e-6
   &&bottom-(item.mountHeight??0)-(item.h??850)>=-1e-6
   &&bottom-(item.mountHeight??0)-(item.h??850)<=height+1e-6);
  return lower?{lowerId:lower.id,bottom:(lower.mountHeight??0)+(lower.h??850),height,w:Math.min(f.w,lower.w),d:Math.min(f.d,lower.d)}:null;
 }
 function normalizeLaundryStacks(furniture,before=[]){
  for(const f of furniture||[]){
   if(f.locked||!['washer','dryer'].includes(f.type))continue;
   const old=before.find(item=>item.id===f.id),previous=old&&laundryStack(old,before),lower=previous&&furniture.find(item=>item.id===previous.lowerId);
   // Keep an existing stack attached when its lower body height changes.
   if(lower&&(f.mountHeight??0)===(old.mountHeight??0)&&Math.abs(lower.cx-f.cx)<=5&&Math.abs(lower.cy-f.cy)<=5
    &&lower.type!==f.type&&['washer','dryer'].includes(lower.type)&&Math.abs(Math.sin(((lower.rot||0)-(f.rot||0))*Math.PI/180))<1e-6){
    const next=(lower.mountHeight??0)+(lower.h??850)+(f.stackHeight??20);if(next<=20000)f.mountHeight=next;
   }
   const stack=laundryStack(f,furniture);if(stack&&stack.bottom+stack.height<=20000)f.mountHeight=stack.bottom+stack.height;
  }
  return furniture;
 }
 // Recorded dimensions take priority. Legacy items use the existing model's
 // nominal envelope; unfamiliar items without a height remain unverified.
 function furnitureVerticalBounds(f){
  if(f.type==='tripleslidingwindow'){const bottom=f.mountHeight??900;return {bottom,top:bottom+(f.h??1500),source:'model'};}
  if(['washer','dryer'].includes(f.type)){const bottom=f.mountHeight??0;return {bottom,top:bottom+(f.h??850),source:f.h===undefined?'model':'recorded'};}
  if(f.type==='sofa_yeswood_cherry')return {bottom:0,top:f.h??895,source:f.h===undefined?'model':'recorded'};
  if(cabinet().supported(f))return {bottom:0,top:cabinet().height(f),source:f.h===undefined?'model':'recorded'};
  if(f.type==='waterheater_flat'){const bottom=f.mountHeight??1650;return {bottom,top:bottom+(f.h??565),source:f.h===undefined?'model':'recorded'};}
  const mounted={acwall:[2170,2510],waterheater:[1300,1950+Math.min(f.d/2,230)],tv:[1200-f.w*.5625/2,1200+f.w*.5625/2],wallart:[1280,1280+Math.min(950,Math.max(500,f.w*.45))],mirror:[50,1700],pendant:[2100,2627],baycushion:[450,900],stove:[862,2330],ksink:[850,1182],vanity:[330,1960]}[f.type];
  if(mounted){const bottom=mounted[0];return {bottom,top:f.h===undefined?mounted[1]:bottom+f.h,source:f.h===undefined?'model':'recorded'};}
  if(Number.isFinite(f.h)&&f.h>0)return {bottom:0,top:f.h,source:'recorded'};
  if(f.obj)return {bottom:0,top:800,source:'model'};
  const height={fridge:1800,fridge_french_drawer:1910,aircon:1800,dishwasher:840,washer:850,dryer:850,curtain:2400,slidingdoor:2100,tripleslidingdoor:2400,tripleslidingwindow:1500,rug:16,bench:440,beanbag:720,barstool:775,custom:800,customround:800}[f.type];
  return height===undefined?null:{bottom:0,top:height,source:'model'};
 }
 // Stable topological order: only separated height ranges with overlapping
 // footprints constrain one another. A pairwise sort comparator is not transitive.
 function planFurnitureOrder(furniture){
  const G=root.FurnishGeometry||require('./layout-geometry.js'),layer=f=>f.type==='rug'?0:f.type==='pendant'?2:1;
  const items=furniture.map((f,index)=>({f,index,layer:layer(f),vertical:furnitureVerticalBounds(f),box:G.aabb({...f,rot:f.rot||0}),after:[],incoming:0}));
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
   const a=items[i],b=items[j],A=a.vertical,B=b.vertical;
   if(a.layer!==b.layer||!A||!B||![A.bottom,A.top,B.bottom,B.top].every(Number.isFinite))continue;
   const low=A.top<=B.bottom?a:B.top<=A.bottom?b:null;if(!low)continue;
   if(Math.abs(a.f.cx-b.f.cx)>=a.box.hw+b.box.hw||Math.abs(a.f.cy-b.f.cy)>=a.box.hh+b.box.hh||!G.obbOverlap({...a.f,rot:a.f.rot||0},{...b.f,rot:b.f.rot||0}))continue;
   const high=low===a?b:a;low.after.push(high);high.incoming++;
  }
  const pending=items.sort((a,b)=>a.layer-b.layer||a.index-b.index),result=[];
  while(pending.length){const index=pending.findIndex(v=>v.incoming===0),item=pending.splice(index,1)[0];result.push(item.f);for(const next of item.after)next.incoming--;}
  return result;
 }
 function waterheaterClearances(plan,f,options={}){
  if(f.type!=='waterheater_flat')return null;
  const P=root.FurnishProject||require('./project-core.js'),location=P.ceilingAt(plan,f.cx,f.cy),ceilingHeight=options.ceilingHeight??location.height,wallHeight=plan.ceilingHeight??2800;
  const bottom=f.mountHeight??1650,height=f.h??565,angle=(f.rot||0)*Math.PI/180,sign=f.flip?-1:1;
  const right=[Math.cos(angle)*sign,Math.sin(angle)*sign],depth=[-Math.sin(angle),Math.cos(angle)],edge=f.w/2;
  const local=([x,y])=>[(x-f.cx)*right[0]+(y-f.cy)*right[1],(x-f.cx)*depth[0]+(y-f.cy)*depth[1]];
  // Clip walls to the strip beyond the physical right side; the full side
  // catches oblique walls, while a touching back wall has zero clipped area.
  const clip=(poly,axis,bound,above)=>{
   const out=[];for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],inside=p=>above?p[axis]>=bound:p[axis]<=bound,ia=inside(a),ib=inside(b);
    if(ia)out.push(a);if(ia!==ib){const t=(bound-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
   }return out;
  };
  let gap=Infinity,blocker=null;const unknown=[];
  const distance=points=>{
   let poly=points.map(local);poly=clip(clip(clip(poly,1,-f.d/2,true),1,f.d/2,false),0,edge,true);
   const area=Math.abs(poly.reduce((sum,a,i)=>{const b=poly[(i+1)%poly.length];return sum+a[0]*b[1]-a[1]*b[0];},0))/2;
   return area>1e-6?Math.max(0,Math.min(...poly.map(p=>p[0]))-edge):null;
  };
  const consider=(value,item)=>{if(value!==null&&value<gap){gap=value;blocker=item;}};
  for(const wall of [...(plan.walls||[]),...(plan.wins||[]).map(w=>w.rect)]){
   if(bottom>=(wall[4]==='low'?1000:wallHeight))continue;
   consider(distance([[wall[0],wall[1]],[wall[2],wall[1]],[wall[2],wall[3]],[wall[0],wall[3]]]),{kind:'wall'});
  }
  for(const item of options.furniture||plan.furniture||[]){
   if(item===f||item.id!==undefined&&item.id===f.id)continue;
   const vertical=furnitureVerticalBounds(item);
   if(vertical&&Math.min(bottom+height,vertical.top)-Math.max(bottom,vertical.bottom)<=1e-6)continue;
   const value=distance(P.polygon({...item,rot:item.rot||0}));if(value===null)continue;
   if(!vertical){if(value<300-1e-6)unknown.push({id:item.id,name:item.name,gap:value});continue;}
   consider(value,{kind:'furniture',id:item.id,name:item.name,...vertical});
  }
  const check=(gap,required)=>({gap,required,ok:gap===null?null:gap>=required-1e-6});
  const rightCheck=check(Number.isFinite(gap)?gap:null,300);if(unknown.length&&rightCheck.ok!==false)rightCheck.ok=null;
  // Socket is a fixed project position, independent of the heater's physical right.
  let socket={...check(null,300),point:null,nearest:null,local:null};
  const s=f.heaterSocket;
  if(s&&[s.x,s.y,s.z].every(Number.isFinite)){
   const a=(s.x-f.cx)*Math.cos(angle)+(s.y-f.cy)*Math.sin(angle),b=-(s.x-f.cx)*Math.sin(angle)+(s.y-f.cy)*Math.cos(angle);
   const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),x=clamp(a,-f.w/2,f.w/2),y=clamp(b,-f.d/2,f.d/2),z=clamp(s.z,bottom,bottom+height);
   socket={...check(Math.hypot(a-x,b-y,s.z-z),300),point:{...s},nearest:{x:f.cx+x*Math.cos(angle)-y*Math.sin(angle),y:f.cy+x*Math.sin(angle)+y*Math.cos(angle),z},local:{point:[a,s.z,b],nearest:[x,z,y]}};
  }
  // `right` remains geometric diagnostics for older callers, not a socket verdict.
  return {ceilingHeight,room:location.room,top:check(ceilingHeight===null?null:ceilingHeight-bottom-height,40),socket,right:{...rightCheck,blocker,unknown}};
 }
 function wallGaps(plan,f){
  const box=bounds(f),out={};
  for(const [dir,[axis,sign]] of Object.entries(dirs)){
   const other=1-axis,center=axis?f.cy:f.cx;
   for(const wall of [...plan.walls,...(plan.wins||[]).map(w=>w.rect)]){
    if(Math.min(box[other+2],wall[other+2])-Math.max(box[other],wall[other])<=.01)continue;
    const middle=(wall[axis]+wall[axis+2])/2;if(sign===1?middle>=center:middle<=center)continue;
    const edge=sign===1?wall[axis+2]:wall[axis],gap=sign===1?box[axis]-edge:edge-box[axis+2];
    if(!out[dir]||gap<out[dir].gap)out[dir]={gap,edge,axis,sign,wall:wall.slice(0,4)};
   }
  }
  return out;
 }
 function placeAtGap(plan,f,dir,gap){
  if(f.locked)throw Error('家具已锁定，请先解锁');
  if(!Number.isFinite(gap)||gap<0||gap>20000)throw Error('距墙尺寸须为 0–20000 mm');
  const target=wallGaps(plan,f)[dir];if(!target)throw Error('该方向未找到与家具边缘对应的墙面');
  const next={...f},key=target.axis?'cy':'cx';next[key]+=target.sign*(gap-target.gap);
  const P=root.FurnishProject||require('./project-core.js');
  if(plan.walls.some(w=>P.intersects(P.polygon(next),[[w[0],w[1]],[w[2],w[1]],[w[2],w[3]],[w[0],w[3]]])))throw Error('调整后家具会穿过墙体，请检查方向和尺寸');
  // The convex hull is the swept footprint for a translation without rotation.
  const points=[...P.polygon(f),...P.polygon(next)].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const half=points=>{const h=[];for(const p of points){while(h.length>1&&cross(h[h.length-2],h[h.length-1],p)<=0)h.pop();h.push(p);}return h.slice(0,-1);},swept=[...half(points),...half([...points].reverse())];
  if(!P.fitsInRooms(plan.rooms,P.polygon(next)))throw Error('调整后家具超出房间，请减小距墙尺寸');
  if(plan.walls.some(w=>{const poly=[[w[0],w[1]],[w[2],w[1]],[w[2],w[3]],[w[0],w[3]]];return !P.intersects(P.polygon(f),poly)&&P.intersects(swept,poly);}))throw Error('移动路径被墙体阻挡，请在当前房间内调整');
  return next;
 }
 function sceneSettings(value){const v=value||{};return {cut:[1.2,2.8].includes(v.cut)?v.cut:2.8,furn:typeof v.furn==='boolean'?v.furn:true,labels:typeof v.labels==='boolean'?v.labels:true,lamps:typeof v.lamps==='boolean'?v.lamps:true,night:typeof v.night==='boolean'?v.night:false,hour:Number.isFinite(v.hour)&&v.hour>=7&&v.hour<=18?v.hour:10};}
 function manageDesign(list,planId,action,{id,name,work,note,now=Date.now()}={}){
  const copy=JSON.parse(JSON.stringify(list)),current=copy.find(d=>d.id===id&&d.planId===planId),local=copy.filter(d=>d.planId===planId);
  if(!['create','rename','update','duplicate','delete'].includes(action))throw Error('未知方案操作');
  if(action!=='create'&&!current)throw Error('方案不存在，请重新打开方案管理');
  if(action==='delete')return copy.filter(d=>d!==current);
  const title=String(name??current?.name??'').trim();if(!title||title.length>80)throw Error('方案名称须为 1–80 个字符');
  if(local.some(d=>d.name.trim()===title&&(action==='create'||action==='duplicate'||d!==current)))throw Error('已有同名方案，请使用其他名称');
  if(['create','duplicate'].includes(action)&&local.length>=100)throw Error('每个户型最多 100 份命名方案');
  const P=root.FurnishProject||require('./project-core.js');
  const next=action==='rename'?current.work:P.validateWork(action==='duplicate'?current.work:work);
  if(note!==undefined){if(typeof note!=='string'||note.length>500)throw Error('方案备注最多 500 字');next.designNote=note;}
  if(['create','duplicate'].includes(action)){let fresh='d'+now.toString(36),i=0;while(copy.some(d=>d.id===fresh))fresh='d'+now.toString(36)+'_'+(++i);copy.push({id:fresh,name:title,planId,ts:now,work:next});}
  else Object.assign(current,{name:title,ts:now,work:next});
  return copy;
 }
 root.FurnishDesign={laundryStack,normalizeLaundryStacks,uses,inferUse,styleFloor,bounds,resizeAnchors,resizeFurniture,replaceFurniture,pasteFurniture,catalogSnapshot,catalogSource,restoreNotes,restoreFurniture,deliveryBounds,measurementGeometry,wallGaps,furnitureVerticalBounds,planFurnitureOrder,waterheaterClearances,placeAtGap,sceneSettings,manageDesign};
 if(typeof module!=='undefined')module.exports=root.FurnishDesign;
})(typeof window==='undefined'?globalThis:window);
