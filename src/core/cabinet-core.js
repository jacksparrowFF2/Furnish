/* Parametric cabinetry, in millimetres. Shared by editor, scene and imports. */
(function(root){
 'use strict';
 const types=['cabinet','wardrobe','shoecab','bookshelf','chest','nightstand','tvstand','ovencol'];
 const templates=[
  ['storage','收纳柜',1000,450,1800,2,'double',4,0],
  ['pantry800','800 库 · 食品高柜',800,600,2200,1,'double',5,0],
  ['pantry500','500 库 · 窄高柜',500,600,2200,1,'left',5,0],
  ['sideboard','餐边柜 · 门柜',1600,400,900,3,'left',1,0],
  ['sideboard-drawers','餐边柜 · 抽屉组合',1600,450,900,3,'left',1,2],
  ['sideboard-open','餐边柜 · 开放展示',1600,400,1200,3,'none',2,1],
  ['sideboard-mixed','餐边柜 · 开放格与门柜',1800,450,1800,3,'mixed',3,1],
  ['wardrobe','衣柜 · 分区收纳',2000,600,2200,4,'left',3,1],
  ['shoe','鞋柜 · 双门',1000,350,1100,2,'left',4,0],
  ['book','书柜 · 开放层板',1200,350,2000,3,'none',5,0],
  ['chest','斗柜 · 四层抽屉',800,500,1000,1,'none',0,4],
  ['base','厨房地柜',800,600,850,2,'left',1,0],
  ['wall','壁柜',800,350,700,2,'left',1,0],
  ['tv','电视柜 · 抽屉与开放格',2000,400,500,4,'none',0,1],
  ['tv-floor','落地电视柜 · 上盖抽屉藏线',3000,400,240,5,'none',0,0],
  ['entry-pegboard','玄关柜 · 洞洞板换鞋区',674,350,2400,1,'double',0,2],
 ];
 const supported=f=>!!f&&types.includes(f.type)&&!f.obj;
 const defaultId=f=>({wardrobe:'wardrobe',shoecab:'shoe',bookshelf:'book',chest:'chest',tvstand:'tv',nightstand:'chest',ovencol:'pantry500'}[f.type]||(/储物|收纳/.test(f.name||'')?'storage':'sideboard'));
 function preset(id){
  const t=templates.find(t=>t[0]===id);if(!t)throw Error('柜体模板无效');
  const [key,name,w,d,h,n,door,shelves,drawers]=t,thickness=18,plinth=key==='tv-floor'?0:60,inside=h-plinth-2*thickness;
  if(key==='entry-pegboard')return {name,w,d,h,color:'#d5c4bb',cabinet:{version:1,template:key,thickness,plinth:0,columns:[{door:'double',doorOpen:false,doorBottom:1796,pegboard:true,handle:'none',shelves:[1778],drawers:[{height:180,open:false},{height:180,open:false}]}]}};
  return {name,w,d,h,cabinet:{version:1,template:key,thickness,plinth,columns:Array.from({length:n},(_,i)=>{
   const heights=key==='tv-floor'&&i!==2?[inside]:Array(drawers).fill(Math.min(160,Math.floor(inside/(drawers+2)))),bottom=heights.reduce((a,b)=>a+b,0);
   return {door:door==='mixed'?(i===1?'none':'left'):door,doorOpen:false,shelves:Array.from({length:shelves},(_,j)=>Math.round(bottom+(inside-bottom)*(j+1)/(shelves+1))),drawers:heights.map(height=>({height,open:false})),...(key==='tv-floor'?{top:i===2?'drawer':'fixed',topOpen:false,cableGap:i===2?30:0,finish:'wood',handle:'none'}:{})};
  })}};
 }
 function config(f){
  if(f.cabinet)return JSON.parse(JSON.stringify(f.cabinet));
  const p=preset(defaultId(f));p.cabinet.columns=p.cabinet.columns.slice(0,Math.max(1,Math.floor((f.w-18)/118)));
  if(f.type==='nightstand')p.cabinet.columns[0].drawers=p.cabinet.columns[0].drawers.slice(0,2);
  const h=height(f),inside=h-p.cabinet.plinth-36,old=p.h-p.cabinet.plinth-36;
  for(const c of p.cabinet.columns){c.shelves=c.shelves.map(v=>Math.round(v*inside/old));c.drawers=c.drawers.map(v=>({...v,height:Math.max(60,Math.round(v.height*inside/old))}));}
  return p.cabinet;
 }
 function height(f){return f.h||({nightstand:500,chest:850,shoecab:1000,tvstand:450,bookshelf:1800}[f.type])||preset(defaultId(f)).h;}
 function widths(f){const c=config(f),equal=(f.w-(c.columns.length+1)*c.thickness)/c.columns.length;return c.columns.map(col=>col.width===undefined?equal:col.width);}
 function layout(f){const c=config(f);let left=-f.w/2+c.thickness;return widths(f).map(width=>{const bay={left,width,center:left+width/2};left+=width+c.thickness;return bay;});}
 function scaleWidths(f,next){
  const c=next.cabinet;if(!c.columns.some(col=>col.width!==undefined))return next;
  const old=widths(f),space=next.w-(c.columns.length+1)*c.thickness,total=old.reduce((a,b)=>a+b,0);
  c.columns.forEach((col,i)=>col.width=old[i]*space/total);return next;
 }
 function setColumnWidth(f,column,width){
  if(!Number.isFinite(width)||width<100)throw Error('分区净宽须至少 100 mm');
  const c=config(f),values=widths(f);if(!c.columns[column])throw Error('柜体分区不存在');values[column]=width;
  c.columns.forEach((col,i)=>col.width=values[i]);return validate({...f,w:values.reduce((a,b)=>a+b,0)+(c.columns.length+1)*c.thickness,cabinet:c});
 }
 function shelfLimits(f,column,shelf){
  const c=config(f),col=c.columns[column];if(!col||!Number.isInteger(shelf)||shelf<0||shelf>=col.shelves.length)throw Error('层板不存在');
  const bottom=col.drawers.reduce((n,d)=>n+d.height,0);
  return {min:Math.ceil(shelf?col.shelves[shelf-1]+c.thickness+40:bottom+40),max:Math.floor((shelf+1<col.shelves.length?col.shelves[shelf+1]:height(f)-c.plinth-2*c.thickness)-c.thickness-40)};
 }
 function moveShelf(f,column,shelf,value){
  if(!Number.isFinite(value))throw Error('层板高度无效');const limits=shelfLimits(f,column,shelf),c=config(f);
  const col=c.columns[column],attached=col.doorBottom!==undefined&&Math.abs(col.shelves[shelf]+c.thickness-col.doorBottom)<.01;
  col.shelves[shelf]=Math.max(limits.min,Math.min(limits.max,Math.round(value)));if(attached)col.doorBottom=col.shelves[shelf]+c.thickness;return validate({...f,cabinet:c});
 }
 function moveDivider(f,index,delta){
  const c=config(f),values=widths(f);if(!Number.isInteger(index)||index<0||index>=values.length-1||!Number.isFinite(delta))throw Error('分隔板无效');
  delta=Math.max(100-values[index],Math.min(values[index+1]-100,Math.round(delta)));
  values[index]+=delta;values[index+1]-=delta;c.columns.forEach((col,i)=>col.width=values[i]);return validate({...f,cabinet:c});
 }
 function spaces(f,column){
  const c=config(f),col=c.columns[column];if(!col)throw Error('柜体分区不存在');
  let bottom=col.drawers.reduce((n,d)=>n+d.height,0);const result=[];
  for(const top of [...col.shelves,height(f)-c.plinth-2*c.thickness]){result.push({bottom,top,height:top-bottom});bottom=top+c.thickness;}return result;
 }
 function snapShelf(f,column,shelf,value){
  const c=config(f),limits=shelfLimits(f,column,shelf),col=c.columns[column],bottom=shelf?col.shelves[shelf-1]+c.thickness:col.drawers.reduce((n,d)=>n+d.height,0);
  const candidates=[...c.columns.filter((_,i)=>i!==column).flatMap(col=>col.shelves),...[200,250,300,350,400,450,500,600].map(gap=>bottom+gap)];
  const close=candidates.filter(v=>v>=limits.min&&v<=limits.max&&Math.abs(v-value)<=8).sort((a,b)=>Math.abs(a-value)-Math.abs(b-value));
  return Math.max(limits.min,Math.min(limits.max,close[0]??Math.round(value/10)*10));
 }
 function editStructure(f,column,operation,index,target){
  const c=config(f),col=c.columns[column];if(!col)throw Error('柜体分区不存在');
  if(operation==='addShelf'||operation==='copyShelf'){
   if(col.shelves.length>=20)throw Error('每个分区最多 20 块层板');
   let gaps=spaces(f,column).filter(g=>g.height>=80+c.thickness);
   if(operation==='copyShelf'){if(!Number.isInteger(index)||!col.shelves[index])throw Error('层板不存在');const level=col.shelves[index];gaps.sort((a,b)=>Math.abs(a.bottom-level)-Math.abs(b.bottom-level));}else gaps.sort((a,b)=>b.height-a.height);
   if(!gaps.length)throw Error('没有足够空间添加层板');const gap=gaps[0];col.shelves.push(Math.round((gap.bottom+gap.top-c.thickness)/2));col.shelves.sort((a,b)=>a-b);
  }else if(operation==='deleteShelf'){if(!Number.isInteger(index)||index<0||index>=col.shelves.length)throw Error('层板不存在');col.shelves.splice(index,1);
  }else if(operation==='equalShelves'){
   const bottom=col.drawers.reduce((n,d)=>n+d.height,0),n=col.shelves.length,space=(height(f)-c.plinth-2*c.thickness-bottom-n*c.thickness)/(n+1);
   if(space<40)throw Error('净空间不足，无法均分');col.shelves=Array.from({length:n},(_,i)=>Math.round(bottom+space*(i+1)+c.thickness*i));
  }else if(operation==='addDrawer'){
   if(col.drawers.length>=10)throw Error('每个分区最多 10 个抽屉');const bottom=col.drawers.reduce((n,d)=>n+d.height,0),max=(col.shelves[0]??height(f)-c.plinth-2*c.thickness-20)-40-bottom;
   if(max<60)throw Error('底部空间不足，请先抬高或移除层板');col.drawers.push({height:Math.min(160,Math.floor(max)),open:false});
  }else if(operation==='deleteDrawer'){if(!col.drawers[index])throw Error('抽屉不存在');col.drawers.splice(index,1);
  }else if(operation==='copyDrawers'){if(!Number.isInteger(target)||target===column||!c.columns[target])throw Error('请选择另一个目标分区');c.columns[target].drawers=JSON.parse(JSON.stringify(col.drawers));
  }else throw Error('柜体操作无效');return validate({...f,cabinet:c});
 }
 // Local plan coordinates: front is +Y, and mirroring reverses the hinge side.
 function openingZones(f,{passage=800}={}){
  const c=config(f),bays=layout(f),zones=[],transform=points=>{const a=(f.rot||0)*Math.PI/180,co=Math.cos(a),si=Math.sin(a);return points.map(([x,y])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*co-y*si,(f.cy||0)+x*si+y*co];});};
  c.columns.forEach((col,i)=>{
   const bay=bays[i],front=f.d/2;
   if(col.door!=='none'){
    const n=col.door==='double'?2:1,leaf=bay.width/n,angle=Math.max(99,col.doorAngle??99)*Math.PI/180;
    for(let j=0;j<n;j++){const right=col.door==='right'||col.door==='double'&&j===1,hinge=bay.left+leaf*(j+(right?1:0)),sign=right?-1:1,points=[[hinge,front]];
     for(let k=0;k<=24;k++){const t=angle*k/24;points.push([hinge+sign*leaf*Math.cos(t),front+leaf*Math.sin(t)]);}zones.push({column:i,kind:'cabinetdoor',poly:transform(points)});
    }
   }
   if(col.drawers.length||col.top==='drawer'){const travel=f.d*.7;zones.push({column:i,kind:'cabinetdrawer',poly:transform([[bay.left,front],[bay.left+bay.width,front],[bay.left+bay.width,front+travel],[bay.left,front+travel]])});
    if(passage>0)zones.push({column:i,kind:'cabinetpassage',poly:transform([[bay.left,front+travel],[bay.left+bay.width,front+travel],[bay.left+bay.width,front+travel+passage],[bay.left,front+travel+passage]])});
   }
  });return zones;
 }
 function validate(f){
  if(!supported(f))throw Error('此家具不支持柜体设计');
  const c=f.cabinet,h=height(f),finite=v=>typeof v==='number'&&Number.isFinite(v);
  if(![f.w,f.d,h].every(finite)||f.w<150||f.w>6000||f.d<150||f.d>1200||h<200||h>3200)throw Error('柜宽 150–6000、深 150–1200、高 200–3200 mm');
  if(!c||c.version!==1||!finite(c.thickness)||c.thickness<12||c.thickness>30||!finite(c.plinth)||c.plinth<0||c.plinth>250||!Array.isArray(c.columns)||c.columns.length<1||c.columns.length>12)throw Error('柜板厚 12–30 mm，底座高 0–250 mm，分区 1–12 个');
  const inner=h-c.plinth-2*c.thickness,explicit=c.columns.filter(col=>col?.width!==undefined).length;
  if(c.columns.some(col=>!col||typeof col!=='object'))throw Error('柜体分区无效');
  if(explicit&&explicit!==c.columns.length)throw Error('须为所有分区指定净宽');
  const values=widths(f);
  if(inner<100||values.some(v=>!finite(v)||v<100)||f.d<4*c.thickness)throw Error('内部净高、分区净宽须至少 100 mm，柜深须容纳板件');
  if(Math.abs(values.reduce((a,b)=>a+b,0)+(c.columns.length+1)*c.thickness-f.w)>.01)throw Error('分区净宽加板厚须等于柜体总宽');
  for(const col of c.columns){
   if(col.top!==undefined&&!['fixed','drawer'].includes(col.top)||col.topOpen!==undefined&&typeof col.topOpen!=='boolean'||col.cableGap!==undefined&&(!finite(col.cableGap)||col.cableGap<0||col.cableGap>Math.min(100,f.d-4*c.thickness)))throw Error('顶盖类型或后侧留缝无效（0–100 mm，须容纳板件）');
   if(col.top==='drawer'&&(col.door!=='none'||col.drawers.length||col.shelves.length))throw Error('上盖抽屉不能同时设置柜门、层板或普通抽屉');
   if(!['none','left','right','double'].includes(col.door)||typeof col.doorOpen!=='boolean'||!Array.isArray(col.drawers)||col.drawers.length>10||!Array.isArray(col.shelves)||col.shelves.length>20)throw Error('柜门、层板或抽屉配置无效');
   if(col.doorBottom!==undefined&&(!finite(col.doorBottom)||col.doorBottom<0||col.doorBottom>inner-100)||col.pegboard!==undefined&&typeof col.pegboard!=='boolean')throw Error('上柜门底部高度或洞洞板配置无效');
   if(col.doorAngle!==undefined&&(!finite(col.doorAngle)||col.doorAngle<0||col.doorAngle>110)||col.finish!==undefined&&!['solid','wood','glass'].includes(col.finish)||col.handle!==undefined&&!['bar','knob','none'].includes(col.handle)||col.doorColor!==undefined&&!/^#[0-9a-f]{6}$/i.test(col.doorColor))throw Error('门板材质、颜色、把手或开启角度无效');
   let bottom=0;for(const drawer of col.drawers){if(!drawer||!finite(drawer.height)||drawer.height<60||typeof drawer.open!=='boolean'||drawer.extension!==undefined&&(!finite(drawer.extension)||drawer.extension<0||drawer.extension>1))throw Error('抽屉高度至少 60 mm，拉出程度须为 0–100%');bottom+=drawer.height;}
   if(bottom>inner)throw Error('抽屉总高度超出柜内净高');
   if(col.doorBottom!==undefined&&(col.doorBottom<bottom||!col.shelves.some(v=>Math.abs(v+c.thickness-col.doorBottom)<.01)))throw Error('上柜门底部须对齐一块层板上表面，并高于抽屉');
   if(col.pegboard&&(col.doorBottom===undefined||col.doorBottom-c.thickness-bottom<100||col.top==='drawer'))throw Error('洞洞板需要至少 100 mm 高的开放区及固定顶板');
   let last=bottom;for(const shelf of col.shelves){if(!finite(shelf)||shelf-last<40||shelf>inner-c.thickness-40)throw Error('层板从柜内底部计高，须递增且与抽屉、顶板及相邻层板留出至少 40 mm');last=shelf+c.thickness;}
  }
  return f;
 }
 function resize(f,next){
  if(!f.cabinet){if(supported(next))validate({...next,cabinet:config(next)});return next;}
  const c=config(f),ratio=(height(next)-c.plinth-2*c.thickness)/(height(f)-c.plinth-2*c.thickness);
  for(const col of c.columns){const divider=col.doorBottom===undefined?-1:col.shelves.findIndex(v=>Math.abs(v+c.thickness-col.doorBottom)<.01);col.shelves=col.shelves.map(v=>Math.round(v*ratio));col.drawers=col.drawers.map(v=>({...v,height:Math.round(v.height*ratio)}));if(col.doorBottom!==undefined)col.doorBottom=divider<0?Math.round(col.doorBottom*ratio):col.shelves[divider]+c.thickness;}
  return validate(scaleWidths(f,{...next,cabinet:c}));
 }
 function toggle(f,column,drawer,lid=false){
  const c=config(f),col=c.columns[column];if(!col)throw Error('柜体分区不存在');
  if(lid){if(col.top!=='drawer')throw Error('此分区没有可开合上盖');col.topOpen=!col.topOpen;}
  else if(drawer===undefined){col.doorOpen=!col.doorOpen;if(col.doorOpen&&col.doorAngle===0)col.doorAngle=99;}else{if(!col.drawers[drawer])throw Error('抽屉不存在');col.drawers[drawer].open=!col.drawers[drawer].open;if(col.drawers[drawer].open&&col.drawers[drawer].extension===0)col.drawers[drawer].extension=1;}
  return validate({...f,h:height(f),cabinet:c});
 }
 function specification(f){const c=config(f);return {...c,columns:c.columns.map(col=>{const {doorAngle,topOpen,...rest}=col;return {...rest,doorOpen:false,drawers:col.drawers.map(d=>{const {extension,...rest}=d;return {...rest,open:false};})};})};}
 const api={types,templates,supported,defaultId,preset,config,height,widths,layout,scaleWidths,setColumnWidth,shelfLimits,moveShelf,moveDivider,spaces,snapShelf,editStructure,openingZones,validate,resize,toggle,specification};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCabinet=api;
})(typeof globalThis!=='undefined'?globalThis:this);
