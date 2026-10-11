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
 ];
 const supported=f=>!!f&&types.includes(f.type)&&!f.obj;
 const defaultId=f=>({wardrobe:'wardrobe',shoecab:'shoe',bookshelf:'book',chest:'chest',tvstand:'tv',nightstand:'chest',ovencol:'pantry500'}[f.type]||(/储物|收纳/.test(f.name||'')?'storage':'sideboard'));
 function preset(id){
  const t=templates.find(t=>t[0]===id);if(!t)throw Error('柜体模板无效');
  const [key,name,w,d,h,n,door,shelves,drawers]=t,thickness=18,plinth=60,inside=h-plinth-2*thickness;
  return {name,w,d,h,cabinet:{version:1,template:key,thickness,plinth,columns:Array.from({length:n},(_,i)=>{
   const heights=Array(drawers).fill(Math.min(160,Math.floor(inside/(drawers+2)))),bottom=heights.reduce((a,b)=>a+b,0);
   return {door:door==='mixed'?(i===1?'none':'left'):door,doorOpen:false,shelves:Array.from({length:shelves},(_,j)=>Math.round(bottom+(inside-bottom)*(j+1)/(shelves+1))),drawers:heights.map(height=>({height,open:false}))};
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
  c.columns[column].shelves[shelf]=Math.max(limits.min,Math.min(limits.max,Math.round(value)));return validate({...f,cabinet:c});
 }
 function validate(f){
  if(!supported(f))throw Error('此家具不支持柜体设计');
  const c=f.cabinet,h=height(f),finite=v=>typeof v==='number'&&Number.isFinite(v);
  if(![f.w,f.d,h].every(finite)||f.w<150||f.w>6000||f.d<150||f.d>1200||h<200||h>3200)throw Error('柜宽 150–6000、深 150–1200、高 200–3200 mm');
  if(!c||c.version!==1||!finite(c.thickness)||c.thickness<12||c.thickness>30||!finite(c.plinth)||c.plinth<0||c.plinth>250||!Array.isArray(c.columns)||c.columns.length<1||c.columns.length>12)throw Error('柜板厚 12–30 mm，底座高 0–250 mm，分区 1–12 个');
  const inner=h-c.plinth-2*c.thickness,explicit=c.columns.filter(col=>col?.width!==undefined).length;
  if(explicit&&explicit!==c.columns.length)throw Error('须为所有分区指定净宽');
  const values=widths(f);
  if(inner<100||values.some(v=>!finite(v)||v<100)||f.d<4*c.thickness)throw Error('内部净高、分区净宽须至少 100 mm，柜深须容纳板件');
  if(Math.abs(values.reduce((a,b)=>a+b,0)+(c.columns.length+1)*c.thickness-f.w)>.01)throw Error('分区净宽加板厚须等于柜体总宽');
  for(const col of c.columns){
   if(!['none','left','right','double'].includes(col.door)||typeof col.doorOpen!=='boolean'||!Array.isArray(col.drawers)||col.drawers.length>10||!Array.isArray(col.shelves)||col.shelves.length>20)throw Error('柜门、层板或抽屉配置无效');
   let bottom=0;for(const drawer of col.drawers){if(!drawer||!finite(drawer.height)||drawer.height<60||typeof drawer.open!=='boolean')throw Error('抽屉高度至少 60 mm');bottom+=drawer.height;}
   if(bottom>inner-60)throw Error('抽屉总高度超出柜内净高（须留 60 mm）');
   let last=bottom;for(const shelf of col.shelves){if(!finite(shelf)||shelf-last<40||shelf>inner-c.thickness-40)throw Error('层板从柜内底部计高，须递增且与抽屉、顶板及相邻层板留出至少 40 mm');last=shelf+c.thickness;}
  }
  return f;
 }
 function resize(f,next){
  if(!f.cabinet){if(supported(next))validate({...next,cabinet:config(next)});return next;}
  const c=config(f),ratio=(height(next)-c.plinth-2*c.thickness)/(height(f)-c.plinth-2*c.thickness);
  for(const col of c.columns){col.shelves=col.shelves.map(v=>Math.round(v*ratio));col.drawers=col.drawers.map(v=>({...v,height:Math.round(v.height*ratio)}));}
  return validate(scaleWidths(f,{...next,cabinet:c}));
 }
 function toggle(f,column,drawer){
  const c=config(f),col=c.columns[column];if(!col)throw Error('柜体分区不存在');
  if(drawer===undefined)col.doorOpen=!col.doorOpen;else{if(!col.drawers[drawer])throw Error('抽屉不存在');col.drawers[drawer].open=!col.drawers[drawer].open;}
  return validate({...f,h:height(f),cabinet:c});
 }
 function specification(f){const c=config(f);return {...c,columns:c.columns.map(col=>({...col,doorOpen:false,drawers:col.drawers.map(d=>({...d,open:false}))}))};}
 const api={types,templates,supported,defaultId,preset,config,height,widths,layout,scaleWidths,setColumnWidth,shelfLimits,moveShelf,validate,resize,toggle,specification};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCabinet=api;
})(typeof globalThis!=='undefined'?globalThis:this);
