/* Room semantics and precise placement shared by built-in and imported plans. */
(function(root){
 'use strict';
 const uses={unassigned:['未分类','Unassigned'],living:['客厅','Living room'],dining:['餐厅','Dining room'],bedroom:['卧室','Bedroom'],study:['书房','Study'],kitchen:['厨房','Kitchen'],bathroom:['卫生间','Bathroom'],balcony:['阳台','Balcony'],hall:['玄关／走廊','Hall'],storage:['储物／衣帽间','Storage'],other:['其他','Other'],bay:['飘窗台','Bay platform']};
 function inferUse(room,setting){
  if(room.counted===false)return 'bay';
  if(Object.hasOwn(uses,setting?.use)&&setting.use!=='bay')return setting.use;
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
  const before=bounds(f),after=bounds(next),edges={left:[0,0],right:[0,2],top:[1,1],bottom:[1,3]};if(edges[anchor]){const [axis,edge]=edges[anchor];next[axis?'cy':'cx']+=before[edge]-after[edge];}return next;
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
  const next=resizeFurniture(f,{w:c.w,d:c.d,...(c.h!==undefined?{h:c.h}:{})});
  Object.assign(next,{type:c.type,name:c.name,color:c.color,brand:c.brand||'',model:c.model||'',sourceUrl:c.sourceUrl||'',priceDate:c.priceDate||'',referencePrice:c.price,frontClearance:c.frontClearance??600,purchaseStatus:'planned',purchaseNote:''});
  delete next.price;delete next.obj;delete next.catalogId;delete next.catalogSnapshot;delete next.catalogDetached;if(c.h===undefined)delete next.h;
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
 function sceneSettings(value){const v=value||{};return {cut:[1.2,2.8].includes(v.cut)?v.cut:2.8,furn:typeof v.furn==='boolean'?v.furn:true,labels:typeof v.labels==='boolean'?v.labels:true,night:typeof v.night==='boolean'?v.night:false,hour:Number.isFinite(v.hour)&&v.hour>=7&&v.hour<=18?v.hour:10};}
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
 root.FurnishDesign={uses,inferUse,styleFloor,bounds,resizeAnchors,resizeFurniture,replaceFurniture,pasteFurniture,catalogSnapshot,catalogSource,restoreNotes,restoreFurniture,deliveryBounds,measurementGeometry,wallGaps,placeAtGap,sceneSettings,manageDesign};
 if(typeof module!=='undefined')module.exports=root.FurnishDesign;
})(typeof window==='undefined'?globalThis:window);
