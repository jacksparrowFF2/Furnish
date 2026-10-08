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
 root.FurnishDesign={uses,inferUse,styleFloor,bounds,resizeAnchors,resizeFurniture,wallGaps,placeAtGap,sceneSettings,manageDesign};
 if(typeof module!=='undefined')module.exports=root.FurnishDesign;
})(typeof window==='undefined'?globalThis:window);
