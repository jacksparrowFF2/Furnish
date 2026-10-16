/* Parametric cabinetry, in millimetres. Shared by editor, scene and imports. */
(function(root){
 'use strict';
 const types=['cabinet','wardrobe','shoecab','bookshelf','chest','nightstand','tvstand','ovencol','kitchenwall','vanity'];
 const products=()=>root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);
 const palette={body:'#bc936b',front:'#f3f1ec'};
 const templates=[
  ['storage','收纳柜',1000,450,1800,2,'double',4,0],
  ['pantry800','800 库 · 食品高柜',800,600,2200,1,'double',5,0],
  ['pantry500','500 库 · 窄高柜',500,600,2200,1,'left',5,0],
  ['sideboard','餐边柜 · 门柜',1600,400,900,3,'left',1,0],
  ['sideboard-drawers','餐边柜 · 抽屉组合',1600,450,900,3,'left',1,2],
  ['sideboard-open','餐边柜 · 开放展示',1600,400,1200,3,'none',2,1],
  ['sideboard-mixed','餐边柜 · 开放格与门柜',1800,450,1800,3,'mixed',3,1],
  ['sideboard-wall','餐边柜 · 操作台与玻璃展示柜',1980,450,2430,4,'left',0,0],
  ['sideboard-fridge','餐边柜 · 冰箱位与玻璃展示柜',2156,600,2400,4,'left',0,0],
  ['wardrobe','衣柜 · 分区收纳',2000,600,2200,4,'left',3,1],
  ['shoe','鞋柜 · 双门',1000,350,1100,2,'left',4,0],
  ['book','书柜 · 开放层板',1200,350,2000,3,'none',5,0],
  ['chest','斗柜 · 四层抽屉',800,500,1000,1,'none',0,4],
  ['base','厨房地柜',800,600,850,2,'left',1,0],
  ['wall','壁柜',800,350,700,2,'left',1,0],
  ['tv','电视柜 · 抽屉与开放格',2000,400,500,4,'none',0,1],
  ['tv-floor','落地电视柜 · 上盖抽屉藏线',3000,400,240,5,'none',0,0],
  ['entry-pegboard','玄关柜 · 洞洞板换鞋区',674,350,2400,1,'double',0,2],
  ['entry-console','玄关柜二 · 置物台与鞋柜',1200,350,2400,3,'left',0,1],
 ];
 const templateGroups=[
  {name:'收纳与衣柜',en:'Storage and wardrobes',ids:['storage','wardrobe','pantry800','pantry500']},
  {name:'餐边柜',en:'Sideboards',ids:['sideboard','sideboard-drawers','sideboard-open','sideboard-mixed','sideboard-wall','sideboard-fridge']},
  {name:'玄关与鞋柜',en:'Entry and shoe cabinets',ids:['shoe','entry-pegboard','entry-console']},
  {name:'书柜与斗柜',en:'Bookcases and drawer chests',ids:['book','chest']},
  {name:'电视柜',en:'TV cabinets',ids:['tv','tv-floor']},
  {name:'厨房与壁柜',en:'Kitchen and wall cabinets',ids:['base','wall']}
 ];
 function templateType(id){
  if(!templates.some(t=>t[0]===id))throw Error('柜体模板无效');
  return {wardrobe:'wardrobe',shoe:'shoecab',book:'bookshelf',chest:'chest',tv:'tvstand','tv-floor':'tvstand',wall:'kitchenwall'}[id]||'cabinet';
 }
 const supported=f=>!!f&&types.includes(f.type)&&!f.obj;
 const defaultId=f=>({wardrobe:'wardrobe',shoecab:'shoe',bookshelf:'book',chest:'chest',tvstand:'tv',nightstand:'chest',ovencol:'pantry500',kitchenwall:'wall',vanity:'base'}[f.type]||(/储物|收纳/.test(f.name||'')?'storage':'sideboard'));
 const doorOptions=[['none','无柜门（开放格）','No door (open)'],['left','左铰链单门','Left hinge'],['right','右铰链单门','Right hinge'],['double','左右对开双门','Paired doors'],['up','上翻门','Lift up'],['down','下翻门','Fold down']];
 const verticalDoor=door=>door==='up'||door==='down';
 const maxDoorAngle=(c,col,section)=>section==='display'?(col?.displayMaxAngle??col?.doorMaxAngle??c.doorMaxAngle??90):(col?.doorMaxAngle??c.doorMaxAngle??90);
 const splitDoors=(c,col)=>!!c.entry||!!c.sideboard&&!col.fridgeBay;
 const doorState=(col,section)=>col.doorSections?.[section]??{open:col.doorOpen,angle:col.doorAngle};
 const doorAngle=(c,col,section)=>{const state=doorState(col,section);return state.open?Math.min(state.angle??maxDoorAngle(c,col),maxDoorAngle(c,col)):0;};
 const displayDoor=col=>col.displayDoor??(col.door==='none'?'none':'up');
 const displayAngle=(c,col)=>col.displayOpen?Math.min(col.displayAngle??maxDoorAngle(c,col,'display'),maxDoorAngle(c,col,'display')):0;
 const doorLeafState=(c,col,leaf)=>col.doorLeaves?.[leaf]??{open:!!col.doorOpen,angle:col.doorAngle??maxDoorAngle(c,col)};
 const doorLeafAngle=(c,col,leaf)=>{const state=doorLeafState(c,col,leaf);return state.open?Math.min(state.angle??maxDoorAngle(c,col),maxDoorAngle(c,col)):0;};
 const doorPairing=settings=>settings?.doorPairing??products().definition('counter').doorPairing.default;
 const singleDoorLeaf=(count,pairing)=>count>=3&&count%2===1?(pairing==='start'?count-1:0):null;
 const doorSingleHinge=(settings,door='left')=>settings?.doorSingleHinge??(door==='right'?'right':products().definition('counter').doorPairing.singleHinge.default);
 function doorLayout(count,settings,door='left'){
  if(settings.doorLayout)return [...settings.doorLayout];
  const result=[];for(let i=0;i<count;){if(i===singleDoorLeaf(count,doorPairing(settings))||i===count-1){result.push(doorSingleHinge(settings,door));i++;}else{const a=rightDoorHinge(door,i,count,doorPairing(settings),doorSingleHinge(settings,door)),b=rightDoorHinge(door,i+1,count,doorPairing(settings),doorSingleHinge(settings,door));result.push(...(!a&&b?['pair','paired']:[a?'right':'left',b?'right':'left']));i+=2;}}return result;
 }
 function fitDoorLayout(layout,count){const next=layout.slice(0,count);if(next.at(-1)==='pair')next[next.length-1]='left';while(next.length<count)next.push('left');return next;}
 function validateDoorLayout(settings,count){if(settings.doorLayout&&settings.doorLayout.length!==count)throw Error('自定义柜门布局数量须与实际门扇数一致');}
 function editDoorLayout(settings,count,index,value,door='left'){
  if(!Number.isInteger(index)||index<0||index>=count||!['left','right','pair'].includes(value)||value==='pair'&&index===count-1)throw Error('请选择有效门扇和相邻配对');
  const next={...settings,doorLayout:doorLayout(count,settings,door)},a=next.doorLayout;
  const split=i=>{if(a[i]==='pair'){a[i]='left';a[i+1]='right';}else if(a[i]==='paired'){a[i-1]='left';a[i]='right';}};
  split(index);if(value==='pair'){split(index+1);a[index]='pair';a[index+1]='paired';}else a[index]=value;return next;
 }
 function configureDoorLayout(settings,count,mode,edits=[],door='left'){
  let next={...settings};if(mode==='all')next.doorLayout=Array(count).fill(doorSingleHinge(settings,door));
  else if(mode==='custom'){const previous=doorLayout(count,settings,door);next.doorLayout=previous;for(const [i,value] of edits)if(value!==previous[i]&&value!=='paired')next=editDoorLayout(next,count,i,value,door);}
  else {delete next.doorLayout;if(mode!==doorPairing(settings))next.doorPairing=mode;}
  return next;
 }
 function doorLayoutModes(count){return count<2?[]:[...(doorPairingOptions(count).length?doorPairingOptions(count):[['end','自动相邻配对'],['start','从第 1 扇开始配对']]),['custom','自定义（逐扇设置）'],['all','全部独立']];}
 function doorPairingOptions(count){
  if(count<3||count%2===0)return [];
  return products().definition('counter').doorPairing.values.map(value=>{const groups=[];for(let i=1;i<=count;){if(value==='end'&&i===1||i===count){groups.push(`第 ${i} 扇独立`);i++;}else{groups.push(`${i}、${i+1} 配对`);i+=2;}}return [value,groups.join('；')];});
 }
 function validateDoorSettings(settings){
  if(settings.doorLayout!==undefined){const a=settings.doorLayout,r=products().definition('counter').doorPairing.layout;if(!Array.isArray(a)||!a.length||a.length>r.maxLeaves||Array.from(a).some((v,i)=>!r.values.includes(v)||v==='pair'&&a[i+1]!=='paired'||v==='paired'&&a[i-1]!=='pair'))throw Error('自定义柜门布局须逐扇指定左右铰链或相邻对开，配对不可重叠');}
  if(settings.doorSingleHinge!==undefined&&!products().definition('counter').doorPairing.singleHinge.values.includes(settings.doorSingleHinge))throw Error('独立门扇铰链须为左铰链或右铰链');
  if(settings.doorPairing!==undefined&&!products().definition('counter').doorPairing.values.includes(settings.doorPairing))throw Error('自动配门顺序须为前端或末端开始配对');
  if(settings.doorLeaves!==undefined&&(!Array.isArray(settings.doorLeaves)||!settings.doorLeaves.length||settings.doorLeaves.length>24||settings.doorLeaves.some(s=>!s||typeof s.open!=='boolean'||s.angle!==undefined&&(!Number.isFinite(s.angle)||s.angle<0||s.angle>180))))throw Error('逐扇柜门开合须为 1–24 项，角度须为 0–180°');
  for(const key of ['door','displayDoor'])if(settings[key]!==undefined&&!doorOptions.some(o=>o[0]===settings[key]))throw Error('柜门方向须为无门、左开、右开、对开、上翻或下翻');
  for(const key of ['doorMaxAngle','displayMaxAngle'])if(settings[key]!==undefined&&(!Number.isFinite(settings[key])||settings[key]<1||settings[key]>180))throw Error('铰链最大开启角度须为 1–180°');
  for(const key of ['doorAngle','displayAngle'])if(settings[key]!==undefined&&(!Number.isFinite(settings[key])||settings[key]<0||settings[key]>180))throw Error('柜门当前开启角度须为 0–180°');
 }
 // Millimetre poses shared by all production door builders. Faces use a 1 mm edge gap.
 function doorPose(door,left,right,bottom,top,front,leaf=0,count=door==='double'?2:1,pairing,singleHinge,layout){
  const width=(right-left)/count,height=top-bottom-2,center=left+width*(leaf+.5),vertical=verticalDoor(door),rightHinge=rightDoorHinge(door,leaf,count,pairing,singleHinge,layout),sign=vertical?door==='up'?-1:1:rightHinge?1:-1;
  return {pivot:[vertical?center:center+(rightHinge?1:-1)*width/2,door==='up'?top-1:bottom+1,front],axis:vertical?'x':'y',sign,right:rightHinge,width:width-2,height,localX:vertical?0:(rightHinge?-1:1)*width/2,localBottom:door==='up'?-height:0};
 }
 const drawerCount=col=>col.drawerColumns??(col.door==='double'&&!col.pegboard?2:1);
 const drawerState=(drawer,lane)=>drawer.lanes?.[lane]??drawer;
 function withDrawerColumns(col,count){
  if(!Number.isInteger(count)||count<1||count>12)throw Error('抽屉分列须为 1–12 列的整数');
  const next=JSON.parse(JSON.stringify(col));
  if(count===drawerCount(col))return next;
  next.drawerColumns=count;
  next.drawers.forEach((drawer,j)=>{
   const source=col.drawers[j];
   if(count===1){
    // A merged drawer has one motion state. Preserve the furthest open lane.
    const states=Array.from({length:drawerCount(col)},(_,lane)=>drawerState(source,lane));
    drawer.open=states.some(v=>v.open);
    drawer.extension=drawer.open?Math.max(...states.map(v=>v.open?(v.extension??1):0)):(source.extension??1);
    delete drawer.lanes;
   }else drawer.lanes=Array.from({length:count},(_,lane)=>{const state=drawerState(source,lane);return {open:state.open,extension:state.extension??1};});
  });
  return next;
 }
 // Door leaves share a bay in pairs. Widths include half of each divider,
 // so a 1350 mm front has one nominal 450 mm leaf and a 900 mm pair.
 function autoDoors(f){
  const c=config(f),previous=c.columns;
  if(c.hoodBayHeight!==undefined)throw Error('烟机嵌合吊柜保留左右储物区与中部嵌合区，请使用嵌合尺寸调整');
  if(c.sideboard){
   const index=previous.findIndex(col=>col.fridgeBay),fixed=index<0?null:{...previous[index],width:widths(f)[index]},storage=previous.filter(col=>!col.fridgeBay),sideboard=c.sideboard;
   delete c.sideboard;c.columns=storage;
   const storageWidth=f.w-(fixed?fixed.width+c.thickness:0);if(storageWidth<2*c.thickness+100)throw Error('总宽不足：冰箱位净宽保持固定，餐边柜每个分区至少 100 mm');
   const result=autoDoors({...f,w:storageWidth,cabinet:c}).cabinet;result.sideboard=sideboard;
   if(fixed)result.columns=index===0?[fixed,...result.columns]:[...result.columns,fixed];return {...f,cabinet:result};
  }
  if(previous.some(col=>col.door==='none'||col.top==='drawer'))throw Error('自动配门仅适用于门柜；开放格和上盖抽屉请手动分区');
  const leaves=autoDoorCount(f.w),groups=Array.from({length:Math.ceil(leaves/2)},(_,i)=>i===0&&leaves%2?1:2);
  const sources=previous.flatMap(col=>Array.from({length:drawerCount(col)},(_,lane)=>col.drawers.map(d=>({...drawerState(d,lane)}))));let offset=0;
  c.columns=groups.map((count,i)=>{const col=JSON.parse(JSON.stringify(previous[Math.min(i,previous.length-1)]));col.door=count===2?'double':'left';if(col.doorLayout)col.doorLayout=fitDoorLayout(col.doorLayout,count);col.width=f.w*count/leaves-c.thickness*(i===0&&i===groups.length-1?2:i===0||i===groups.length-1?1.5:1);col.drawerColumns=c.template==='entry-pegboard'?1:count;col.drawers.forEach((drawer,j)=>{drawer.lanes=Array.from({length:col.drawerColumns},(_,lane)=>{const state=sources[offset+lane]?.[j];return {open:state?.open??false,extension:state?.extension??1};});if(drawer.lanes.every(v=>v.open===drawer.lanes[0].open&&v.extension===drawer.lanes[0].extension)){drawer.open=drawer.lanes[0].open;drawer.extension=drawer.lanes[0].extension;delete drawer.lanes;}});offset+=col.drawerColumns;if(i>=previous.length){col.doorOpen=false;if(col.doorSections)for(const state of Object.values(col.doorSections))state.open=false;}return col;});
  c.autoDoors=true;if(c.entry)c.entry.autoColumns=true;return {...f,cabinet:c};
 }
 function mergeDoors(f,index){
  const c=config(f),a=c.columns[index],b=c.columns[index+1],values=widths(f);
  if(!a||!b||!['left','right'].includes(a.door)||!['left','right'].includes(b.door))throw Error('请选择两个相邻的单门分区');
  const structure=col=>{const {door,doorOpen,doorAngle,doorSections,width,drawerColumns,...rest}=col;rest.drawers=rest.drawers.map(({open,extension,lanes,...drawer})=>drawer);return JSON.stringify(rest);};
  if(structure(a)!==structure(b))throw Error('合并前请将相邻分区的层板、抽屉和门板规格设为一致');
  const leftCount=drawerCount(a),rightCount=drawerCount(b);a.drawers.forEach((drawer,j)=>drawer.lanes=[...Array.from({length:leftCount},(_,k)=>({open:drawerState(drawer,k).open,extension:drawerState(drawer,k).extension??1})),...Array.from({length:rightCount},(_,k)=>({open:drawerState(b.drawers[j],k).open,extension:drawerState(b.drawers[j],k).extension??1}))]);a.drawerColumns=leftCount+rightCount;
  c.columns.forEach((col,i)=>col.width=values[i]);a.width+=b.width+c.thickness;a.door='double';a.doorOpen=a.doorOpen||b.doorOpen;c.columns.splice(index+1,1);c.autoDoors=false;if(c.entry)c.entry.autoColumns=false;
  return validate({...f,cabinet:c});
 }
 function preset(id){
  const t=templates.find(t=>t[0]===id);if(!t)throw Error('柜体模板无效');
  const [key,name,w,d,h,n,door,shelves,drawers]=t,thickness=18,plinth=key==='tv-floor'?0:60,inside=h-plinth-2*thickness;
  if(key==='sideboard-wall'||key==='sideboard-fridge'){
   const fridge=key==='sideboard-fridge';
   return autoDoors({name,w,d,h,color:palette.front,cabinet:{version:1,template:key,thickness,plinth:60,autoDoors:true,
    sideboard:{baseHeight:fridge?810:960,counterThickness:20,nicheHeight:fridge?510:600,displayHeight:300,lowerDepth:fridge?410:450,upperDepth:350,fridgeHeight:fridge?1915:1830,...(fridge?{fridgeDepth:600}:{})},
    columns:Array.from({length:4},(_,i)=>({door:i===0&&fridge?'double':'left',doorOpen:false,handle:'none',shelves:[],drawers:fridge&&i===0?[]:[{height:140,open:false}],...(fridge?{width:i===0?800:422,...(i===0?{fridgeBay:true}:{})}:{})}))}});
  }
  if(key==='entry-pegboard')return autoDoors({name,w,d,h,color:'#f3f1ec',cabinet:{version:1,template:key,thickness,plinth:0,columns:[{door:'double',doorOpen:false,doorBottom:1796,pegboard:true,handle:'none',shelves:[1778],drawers:[{height:180,open:false},{height:180,open:false}]}]}});
  if(key==='entry-console')return autoDoors({name,w,d,h,color:'#f3f1ec',cabinet:{version:1,template:key,thickness,plinth:0,entry:{shoeHeight:360,lowerHeight:620,nicheHeight:379,openSide:'left',editable:true},columns:Array.from({length:3},()=>({door:'left',doorOpen:false,handle:'none',shelves:[577,1862],drawers:[{height:150,open:false}]}))}});
  const result={name,w,d,h,color:palette.front,cabinet:{version:1,template:key,thickness,plinth,columns:Array.from({length:n},(_,i)=>{
   const heights=key==='tv-floor'&&i!==2?[inside]:Array(drawers).fill(Math.min(160,Math.floor(inside/(drawers+2)))),bottom=heights.reduce((a,b)=>a+b,0);
   return {door:door==='mixed'?(i===1?'none':'left'):door,doorOpen:false,shelves:Array.from({length:shelves},(_,j)=>Math.round(bottom+(inside-bottom)*(j+1)/(shelves+1))),drawers:heights.map(height=>({height,open:false})),...(key==='tv-floor'?{top:i===2?'drawer':'fixed',topOpen:false,cableGap:i===2?30:0,finish:'solid',handle:'none'}:{})};
  })}};return ['left','double'].includes(door)?autoDoors(result):result;
 }
 function config(f){
  if(f.cabinet){const c=JSON.parse(JSON.stringify(f.cabinet));if(c.entry&&!c.entry.editable){const e=c.entry;c.columns.forEach(col=>{if(!col.shelves.length){const total=col.drawers.reduce((n,d)=>n+d.height,0);col.shelves=[Math.round(e.shoeHeight+(e.lowerHeight-total)/2-c.thickness),Math.round((e.shoeHeight+e.lowerHeight+e.nicheHeight+height(f)-c.plinth-2*c.thickness)/2)];}});c.entry.editable=true;}return c;}
  if(f.type==='vanity'){const c=preset('base').cabinet;c.autoDoors=false;c.plinth=0;c.columns=Array.from({length:f.w>=1100?2:1},()=>({door:'double',doorOpen:false,shelves:[],drawers:[]}));return c;}
  const p=preset(defaultId(f));p.cabinet.columns=p.cabinet.columns.slice(0,Math.max(1,Math.floor((f.w-18)/118)));
  if(f.type==='nightstand')p.cabinet.columns[0].drawers=p.cabinet.columns[0].drawers.slice(0,2);
  const h=height(f),inside=h-p.cabinet.plinth-36,old=p.h-p.cabinet.plinth-36;
  for(const c of p.cabinet.columns){c.shelves=c.shelves.map(v=>Math.round(v*inside/old));c.drawers=c.drawers.map(v=>({...v,height:Math.max(60,Math.round(v.height*inside/old))}));}
  return p.cabinet.autoDoors?autoDoors({...f,cabinet:p.cabinet}).cabinet:p.cabinet;
 }
 function height(f){if(f.kitchen)return f.kitchen.baseHeight;if(f.type==='vanity')return f.cabinet?.bodyHeight??products().cabinetSpec(f).bodyHeight;return f.h||({nightstand:500,chest:850,shoecab:1000,tvstand:450,bookshelf:1800,kitchenwall:700}[f.type])||preset(defaultId(f)).h;}
 function frontHeight(f,c=config(f)){return c.template==='kitchen-base'&&Number.isFinite(c.frontTop)?c.frontTop:height(f);}
 // Kitchen module configs are derived, never written into the saved kitchen.
 function kitchenOverlay(f,c=config(f)){return f.type==='kitchenwall'||c.template==='kitchen-base'||c.template==='base';}
 function doorOverlay(f,c=config(f)){return c.doorOverlay??(kitchenOverlay(f,c)||!!c.entry||c.template==='entry-pegboard'||f.type==='wardrobe'||['storage','wardrobe'].includes(c.template)?'full':'inset');}
 function fullOverlay(f,c=config(f)){return doorOverlay(f,c)==='full';}
 function frontSpan(f,index,c=config(f)){
  if(c.hoodBayHeight!==undefined&&index!==1){const inset=frontInset(f,c);return index===0?{left:-f.w/2+inset,right:0}:{left:0,right:f.w/2-inset};}
  const bay=layout(f)[index],mode=doorOverlay(f,c),t=c.thickness,cover=mode==='inset'?0:t/2;
  return {left:bay.left-(mode==='full'&&index===0?t:cover),right:bay.left+bay.width+(mode==='full'&&index===c.columns.length-1?t:cover)};
 }
 function frontInset(f,c=config(f)){const mode=doorOverlay(f,c);return mode==='full'?0:mode==='half'?c.thickness/2:c.thickness;}
 // Hood storage partitions are internal; two outer-hinged leaves cover the whole cabinet.
 // Shared nominal-width rule; kitchen fronts keep their functional cavity intact.
 const autoDoorCount=width=>Math.max(1,Math.min(24,Math.max(Math.round(width/450),Math.ceil(width/500))));
 function frontLeafCount(f,index,c=config(f)){const door=frontDoor(f,index,c);return door==='none'?0:c.hoodBayHeight===undefined&&!verticalDoor(door)&&c.template==='kitchen-base'&&c.autoFrontWidth!==undefined?autoDoorCount(c.autoFrontWidth):door==='double'?2:1;}
 const rightDoorHinge=(door,leaf,count,pairing,singleHinge,layout)=>layout?['right','paired'].includes(layout[leaf]):singleHinge!==undefined&&leaf===singleDoorLeaf(count,pairing)?singleHinge==='right':door==='right'||count>1&&(pairing==='start'?leaf%2===1:leaf%2===(count%2?0:1)&&!(count%2&&leaf===0));
 // Hood storage partitions are internal; two outer-hinged leaves cover the whole cabinet.
 function frontDoor(f,index,c=config(f)){return c.hoodBayHeight!==undefined&&index===1?'none':c.columns[index].door;}
 function widths(f){const c=config(f),equal=(f.w-(c.columns.length+1)*c.thickness)/c.columns.length;return c.columns.map(col=>col.width===undefined?equal:col.width);}
 function layout(f){const c=config(f);let left=-f.w/2+c.thickness;return widths(f).map(width=>{const bay={left,width,center:left+width/2};left+=width+c.thickness;return bay;});}
 function scaleWidths(f,next){
  if(next.cabinet.hoodBayHeight!==undefined){const c=next.cabinet,center=widths(f)[1],side=(next.w-4*c.thickness-center)/2;c.columns.forEach((col,i)=>col.width=i===1?center:side);return next;}
  const c=next.cabinet,fridge=!!c.sideboard&&c.columns.some(col=>col.fridgeBay);if(!fridge&&!c.columns.some(col=>col.width!==undefined))return next;
  const old=widths(f),space=next.w-(c.columns.length+1)*c.thickness,total=old.reduce((a,b)=>a+b,0);
  if(fridge){const fixed=c.columns.reduce((n,col,i)=>n+(col.fridgeBay?old[i]:0),0),available=space-fixed,flexible=total-fixed,count=c.columns.filter(col=>!col.fridgeBay).length;if(available<count*100)throw Error('总宽不足：冰箱位净宽保持固定，餐边柜每个分区至少 100 mm');c.columns.forEach((col,i)=>col.width=col.fridgeBay?old[i]:old[i]*available/flexible);}else c.columns.forEach((col,i)=>col.width=old[i]*space/total);return next;
 }
 function setColumnWidth(f,column,width){
  if(!Number.isFinite(width)||width<100)throw Error('分区净宽须至少 100 mm');
  const c=config(f),values=widths(f);if(!c.columns[column])throw Error('柜体分区不存在');values[column]=width;
  c.columns.forEach((col,i)=>col.width=values[i]);if(!(c.sideboard&&c.columns[column].fridgeBay))c.autoDoors=false;if(c.entry)c.entry.autoColumns=false;return validate({...f,w:values.reduce((a,b)=>a+b,0)+(c.columns.length+1)*c.thickness,cabinet:c});
 }
 function entryBands(f,column){const c=f.cabinet||config(f),e=c.entry,total=c.columns[column].drawers.reduce((n,v)=>n+v.height,0);return [{bottom:e.shoeHeight-c.thickness,top:e.shoeHeight+e.lowerHeight-total-c.thickness},{bottom:e.shoeHeight+e.lowerHeight+e.nicheHeight,top:height(f)-c.plinth-2*c.thickness}];}
 function setSideboardDrawerHeight(f,value){const c=config(f);if(!c.sideboard||!Number.isFinite(value)||value<60)throw Error('餐边柜浅抽屉高度须至少 60 mm');c.columns.forEach(col=>{if(!col.fridgeBay)col.drawers=[{...col.drawers[0],height:value,open:col.drawers[0]?.open??false}];});return validate({...f,cabinet:c});}
 function configureHoodBay(f,width=500,clearHeight=175){
  if(f.type!=='kitchenwall'||f.obj||f.locked)throw Error('请选择未锁定的厨房吊柜');
  const c=config(f),side=(f.w-4*c.thickness-width)/2,old=c.hoodBayHeight!==undefined?c.columns:null;
  c.plinth=0;c.autoDoors=false;c.hoodBayHeight=clearHeight;
  c.columns=[0,1,2].map(i=>old?{...old[i],width:i===1?width:side}:{width:i===1?width:side,door:i===1?'none':i===0?'left':'right',doorOpen:false,handle:'none',shelves:i===1?[]:[Math.round((height(f)-2*c.thickness)/2)],drawers:[]});
  return validate({...f,cabinet:c});
 }
 function hoodBayCeiling(f,c=config(f)){return c.hoodBayCeiling??products().definition('kitchenwall').hoodBay.ceilingDefault;}
 function setHoodSideGap(f,hood,gap){
  const part=products().hoodInstallation(hood),bay=hoodBay(f),rule=products().definition('kitchenwall').hoodBay;
  if(!part||!bay)throw Error('请选择烟机嵌合柜和对应烟机');
  if(!Number.isFinite(gap)||gap<rule.minSideGap)throw Error('每侧预留间隙须为非负毫米数');
  return configureHoodBay(f,part.coverWidth+2*gap,bay.height);
 }
 function hoodBay(f){if(f.kitchen){const part=(root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null)).hoodHosts(f)[0];return part?hoodBay(part):null;}if(f.type!=='kitchenwall'||f.obj||f.cabinet?.hoodBayHeight===undefined)return null;const c=config(f),bay=layout(f)[1];return {...bay,height:c.hoodBayHeight,depth:f.d-c.thickness};}
 function hoodBayFit(host,hood){
  if(host.kitchen){const parts=(root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null)).hoodHosts(host),results=parts.map(part=>hoodBayFit(part,hood));return results.find(v=>v?.fits)||results[0]||null;}
  const bay=hoodBay(host),P=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null),part=P.hoodInstallation(hood);if(!bay||!part)return null;
  const a=(host.rot||0)*Math.PI/180,co=Math.cos(a),si=Math.sin(a),b=(hood.rot||0)*Math.PI/180,fc=Math.cos(b),fs=Math.sin(b),sign=host.flip?-1:1;
  const local=(x,y)=>{const dx=x-host.cx,dy=y-host.cy;return [sign*(dx*co+dy*si),-dx*si+dy*co];};
  const cover=local(hood.cx-part.coverOffset*fs,hood.cy+part.coverOffset*fc),corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy])=>{const x=sx*part.coverWidth/2,y=sy*part.coverDepth/2;return [cover[0]+sign*((x*fc-y*fs)*co+(x*fs+y*fc)*si),cover[1]-(x*fc-y*fs)*si+(x*fs+y*fc)*co];});
  const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),base=P.value(host,'mountHeight'),bottom=P.value(hood,'mountHeight'),reasons=[];
  if(![...xs,...ys,base,bottom,part.bodyHeight,part.coverHeight].every(Number.isFinite))return {fits:false,reasons:['烟机或吊柜位置／高度未知']};
  if(Math.abs(((hood.rot||0)-(host.rot||0)+540)%360-180)>1e-6)reasons.push('烟机与吊柜朝向须一致');
  if(Math.min(...xs)<bay.left-1e-6||Math.max(...xs)>bay.left+bay.width+1e-6)reasons.push('烟机装饰罩超出中部净宽');
  if(Math.min(...ys)<-host.d/2-1e-6||Math.max(...ys)>host.d/2-host.cabinet.thickness+1e-6)reasons.push('烟机装饰罩超出中部净深');
  const mm=v=>Number(v.toFixed(3))||'<0.001',bodyDelta=bottom+part.bodyHeight-base;
  if(bodyDelta>1e-6)reasons.push(`烟机主机进入吊柜底板／侧储物区（上沿高出柜底 ${mm(bodyDelta)} mm）`);
  if(bodyDelta<-1e-6)reasons.push(`烟机主机上沿尚未与吊柜底部齐平（低于柜底 ${mm(-bodyDelta)} mm）`);
  // Match the production boards: removing the ceiling leaves the back panel
  // starting one board thickness higher, plus the actual top and centre shelves.
  const c=config(host),coverTop=bottom+P.height(hood)-base,limits=[{height:height(host)-c.thickness,label:'吊柜顶板'}];
  if(hoodBayCeiling(host,c))limits.push({height:bay.height,label:'空腔上方横板'});
  else if(c.backPanel!==false&&Math.min(...ys)<-host.d/2+c.thickness-1e-6)limits.push({height:bay.height+c.thickness,label:'中部背板'});
  if(Math.min(...ys)<host.d/2-1.5*c.thickness-1e-6&&Math.max(...ys)>-host.d/2+c.thickness/2+1e-6)for(const shelf of c.columns[1].shelves)limits.push({height:c.plinth+c.thickness+shelf,label:'中部层板'});
  const limit=limits.sort((a,b)=>a.height-b.height)[0];
  if(coverTop>limit.height+1e-6)reasons.push(`烟机装饰罩超出嵌合净高（进入${limit.label}，高出 ${mm(coverTop-limit.height)} mm）`);
  return {fits:!reasons.length,reasons,width:bay.width,height:bay.height,depth:bay.depth,clearances:{left:Math.min(...xs)-bay.left,right:bay.left+bay.width-Math.max(...xs)}};
 }
 function centerHoodInBay(host,hood,flush=false){
  if(host.kitchen){const targets=(root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null)).hoodHosts(host),target=targets.find(v=>hoodBayFit(v,hood)?.fits)||targets[0];if(!target)throw Error('吊柜没有烟机嵌合区');return centerHoodInBay(target,hood,flush);}const bay=hoodBay(host),P=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null),part=P.hoodInstallation(hood);if(!bay||!part)throw Error('请选择带嵌合区的厨房吊柜和烟机');if(hood.locked)throw Error('烟机已锁定，请先解锁');
  const a=(host.rot||0)*Math.PI/180,co=Math.cos(a),si=Math.sin(a),x=bay.center*(host.flip?-1:1),current=(hood.cx-host.cx)*co+(hood.cy-host.cy)*si,delta=x-current;
  const next={...hood,cx:hood.cx+delta*co,cy:hood.cy+delta*si};
  if(flush){const y=-host.d/2+hood.d/2;next.cx=host.cx+x*co-y*si;next.cy=host.cy+x*si+y*co;next.rot=host.rot||0;next.flip=!!host.flip;next.mountHeight=P.value(host,'mountHeight')-part.bodyHeight;if(next.mountHeight<0)throw Error('吊柜高度不足，烟机底部将低于地面');const fit=hoodBayFit(host,next);if(!fit.fits)throw Error(fit.reasons.join('；'));}
  if(![next.cx,next.cy].every(Number.isFinite))throw Error('烟机或吊柜位置无效');return next;
 }
 // The empty fridge bay is a real cavity, not the cabinet's solid footprint.
 // Containment is measured in cabinet-local coordinates after rotation/mirroring.
 function fridgeBayFit(cabinet,fridge){
  if(!supported(cabinet)||!cabinet.cabinet?.sideboard||!['fridge','fridge_french_drawer'].includes(fridge?.type)||fridge.obj)return null;
  const c=config(cabinet),index=c.columns.findIndex(col=>col.fridgeBay);if(index<0)return null;
  const bay=layout(cabinet)[index],depth=c.sideboard.fridgeDepth??cabinet.d,H=(root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null)).height(fridge),values=[cabinet.cx,cabinet.cy,cabinet.w,cabinet.d,fridge.cx,fridge.cy,fridge.w,fridge.d,H,c.sideboard.fridgeHeight,depth,bay.left,bay.width];
  if(!values.every(Number.isFinite)||fridge.w<=0||fridge.d<=0||H<=0)return {fits:false,reasons:['冰箱或预留位尺寸／位置无效']};
  const a=(cabinet.rot||0)*Math.PI/180,co=Math.cos(a),si=Math.sin(a),b=(fridge.rot||0)*Math.PI/180,fc=Math.cos(b),fs=Math.sin(b),sign=cabinet.flip?-1:1;
  const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy])=>{const dx=fridge.cx+sx*fridge.w/2*fc-sy*fridge.d/2*fs-cabinet.cx,dy=fridge.cy+sx*fridge.w/2*fs+sy*fridge.d/2*fc-cabinet.cy;return [sign*(dx*co+dy*si),-dx*si+dy*co];});
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),clearances={left:Math.min(...xs)-bay.left,right:bay.left+bay.width-Math.max(...xs),rear:Math.min(...ys)+cabinet.d/2,front:-cabinet.d/2+depth-Math.max(...ys),top:c.sideboard.fridgeHeight-H},reasons=[],fmt=v=>Math.round(v*100)/100;
  if(clearances.left< -1e-6)reasons.push(`冰箱超出预留位左侧 ${fmt(-clearances.left)} mm`);
  if(clearances.right< -1e-6)reasons.push(`冰箱超出预留位右侧 ${fmt(-clearances.right)} mm`);
  if(clearances.rear< -1e-6)reasons.push(`冰箱超出预留位后沿 ${fmt(-clearances.rear)} mm`);
  if(clearances.front< -1e-6)reasons.push(`冰箱超出预留位前沿 ${fmt(-clearances.front)} mm`);
  if(clearances.top< -1e-6)reasons.push(`冰箱高度 ${fmt(H)} mm 大于预留位净高 ${fmt(c.sideboard.fridgeHeight)} mm，超出 ${fmt(-clearances.top)} mm`);
  return {fits:reasons.length===0,clearances,reasons,column:index,width:bay.width,depth,height:c.sideboard.fridgeHeight};
 }
 function fridgeFitsBay(cabinet,fridge){return fridgeBayFit(cabinet,fridge)?.fits===true;}
 function centerFridgeInBay(cabinet,fridge){
  if(!supported(cabinet)||!cabinet.cabinet?.sideboard||!['fridge','fridge_french_drawer'].includes(fridge?.type))throw Error('请选择带冰箱预留位的餐边柜和冰箱');
  if(fridge.locked)throw Error('冰箱已锁定，请先解锁');
  const c=config(cabinet),index=c.columns.findIndex(col=>col.fridgeBay);if(index<0)throw Error('此柜体没有冰箱预留位');
  const a=(cabinet.rot||0)*Math.PI/180,co=Math.cos(a),si=Math.sin(a),center=layout(cabinet)[index].center*(cabinet.flip?-1:1),current=(fridge.cx-cabinet.cx)*co+(fridge.cy-cabinet.cy)*si,delta=center-current;
  if(Math.abs(delta)<1e-6)return {...fridge};
  const next={...fridge,cx:fridge.cx+delta*co,cy:fridge.cy+delta*si};if(![next.cx,next.cy].every(Number.isFinite))throw Error('冰箱或柜体位置无效');return next;
 }
 function setSideboardFridgeDepth(f,value){const c=config(f);if(!c.sideboard||!c.columns.some(col=>col.fridgeBay)||!Number.isFinite(value)||value<150||value>1200)throw Error('冰箱位深度须为 150–1200 mm');c.sideboard.fridgeDepth=value;return validate({...f,d:Math.max(value,c.sideboard.lowerDepth),cabinet:c});}
 function sideboardDisplayGroups(f){const c=config(f),bays=layout(f),indexes=c.columns.map((col,i)=>col.fridgeBay?-1:i).filter(i=>i>=0),groups=[];
  for(let k=0;k<indexes.length;){const i=indexes[k],pair=c.columns[i].door!=='double'&&k+1<indexes.length&&c.columns[indexes[k+1]].door!=='double',columns=indexes.slice(k,k+(pair?2:1)),first=bays[columns[0]],last=bays[columns.at(-1)];groups.push({column:columns[0],columns,left:first.left,width:last.left+last.width-first.left});k+=columns.length;}return groups;
 }
 function sideboardBands(f,column){const c=f.cabinet||config(f),s=c.sideboard,offset=c.plinth+c.thickness,upper=s.baseHeight+s.counterThickness+s.nicheHeight+s.displayHeight;
  return c.columns[column].fridgeBay?[{bottom:s.fridgeHeight+c.thickness-offset,top:height(f)-c.thickness-offset}]:[{bottom:0,top:s.baseHeight-c.columns[column].drawers.reduce((n,d)=>n+d.height,0)-c.thickness-offset},{bottom:upper+c.thickness-offset,top:height(f)-c.thickness-offset}];
 }
 function shelfLimits(f,column,shelf){
  const c=config(f),col=c.columns[column];if(!col||!Number.isInteger(shelf)||shelf<0||shelf>=col.shelves.length)throw Error('层板不存在');
  const bottom=c.hoodBayHeight!==undefined&&column===1?c.hoodBayHeight:col.drawers.reduce((n,d)=>n+d.height,0);
  if(c.entry||c.sideboard){const band=(c.entry?entryBands:sideboardBands)(f,column).find(b=>col.shelves[shelf]>=b.bottom&&col.shelves[shelf]<=b.top);if(!band)throw Error('层板必须位于上下储物柜内');return {min:Math.ceil(Math.max(band.bottom+40,shelf?col.shelves[shelf-1]+c.thickness+40:band.bottom+40)),max:Math.floor(Math.min(band.top-c.thickness-40,shelf+1<col.shelves.length?col.shelves[shelf+1]-c.thickness-40:band.top-c.thickness-40))};}
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
  values[index]+=delta;values[index+1]-=delta;c.columns.forEach((col,i)=>col.width=values[i]);c.autoDoors=false;if(c.entry)c.entry.autoColumns=false;return validate({...f,cabinet:c});
 }
 function spaces(f,column){
  const c=config(f),col=c.columns[column];if(!col)throw Error('柜体分区不存在');
  let bottom=c.hoodBayHeight!==undefined&&column===1?c.hoodBayHeight:col.drawers.reduce((n,d)=>n+d.height,0);const result=[];
  if(c.entry||c.sideboard){for(const band of (c.entry?entryBands:sideboardBands)(f,column)){let bottom=band.bottom;for(const top of [...col.shelves.filter(v=>v>=band.bottom&&v<band.top),band.top]){result.push({bottom,top,height:top-bottom});bottom=top+c.thickness;}}return result;}
  for(const top of [...col.shelves,height(f)-c.plinth-2*c.thickness]){result.push({bottom,top,height:top-bottom});bottom=top+c.thickness;}return result;
 }
 function snapShelf(f,column,shelf,value){
  const c=config(f),limits=shelfLimits(f,column,shelf),col=c.columns[column],bottom=shelf?col.shelves[shelf-1]+c.thickness:col.drawers.reduce((n,d)=>n+d.height,0);
  const start=c.entry||c.sideboard?Math.max(bottom,(c.entry?entryBands:sideboardBands)(f,column).find(b=>col.shelves[shelf]>=b.bottom&&col.shelves[shelf]<=b.top).bottom):bottom,candidates=[...c.columns.filter((_,i)=>i!==column).flatMap(col=>col.shelves),...[200,250,300,350,400,450,500,600].map(gap=>start+gap)];
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
   if(c.entry||c.sideboard){for(const band of (c.entry?entryBands:sideboardBands)(f,column)){const indexes=col.shelves.map((v,i)=>v>=band.bottom&&v<band.top?i:-1).filter(i=>i>=0),space=(band.top-band.bottom-indexes.length*c.thickness)/(indexes.length+1);if(space<40)throw Error('净空间不足，无法均分');indexes.forEach((index,j)=>col.shelves[index]=Math.round(band.bottom+space*(j+1)+c.thickness*j));}return validate({...f,cabinet:c});}
   const bottom=col.drawers.reduce((n,d)=>n+d.height,0),n=col.shelves.length,space=(height(f)-c.plinth-2*c.thickness-bottom-n*c.thickness)/(n+1);
   if(space<40)throw Error('净空间不足，无法均分');col.shelves=Array.from({length:n},(_,i)=>Math.round(bottom+space*(i+1)+c.thickness*i));
  }else if(operation==='addDrawer'){
   if(c.hoodBayHeight!==undefined)throw Error('烟机柜整组对开门内不设置外露抽屉');
   if(c.sideboard){if(col.fridgeBay)throw Error('冰箱位不能添加抽屉');if(col.drawers.length)throw Error('餐边柜台面下只保留一排浅抽屉');col.drawers.push({height:140,open:false});return validate({...f,cabinet:c});}
   if(c.entry){if(col.drawers.length>=10)throw Error('每个分区最多 10 个抽屉');const total=col.drawers.reduce((n,d)=>n+d.height,0),lower=entryBands(f,column)[0],last=col.shelves.filter(v=>v>=lower.bottom&&v<lower.top).at(-1),max=Math.min(c.entry.lowerHeight-total-120,last===undefined?Infinity:lower.top-last-c.thickness-40);if(max<60)throw Error('下柜空间不足，请调整层板或抽屉');col.drawers.push({height:Math.min(150,Math.floor(max)),open:false});return validate({...f,cabinet:c});}
   if(col.drawers.length>=10)throw Error('每个分区最多 10 个抽屉');const bottom=col.drawers.reduce((n,d)=>n+d.height,0),max=(col.shelves[0]??height(f)-c.plinth-2*c.thickness-20)-40-bottom;
   if(max<60)throw Error('底部空间不足，请先抬高或移除层板');col.drawers.push({height:Math.min(160,Math.floor(max)),open:false});
  }else if(operation==='deleteDrawer'){if(!col.drawers[index])throw Error('抽屉不存在');col.drawers.splice(index,1);
  }else if(operation==='copyDrawers'){if(!Number.isInteger(target)||target===column||!c.columns[target])throw Error('请选择另一个目标分区');c.columns[target].drawers=JSON.parse(JSON.stringify(col.drawers));c.columns[target].drawerColumns=drawerCount(col);
  }else throw Error('柜体操作无效');return validate({...f,cabinet:c});
 }
 // Local plan coordinates: front is +Y, and mirroring reverses the hinge side.
 function openingZones(f,{passage=800}={}){
  if(f.type==='vanity'&&!f.cabinet)return [];
  const c=config(f),bays=layout(f),zones=[],transform=points=>{const a=(f.rot||0)*Math.PI/180,co=Math.cos(a),si=Math.sin(a);return points.map(([x,y])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*co-y*si,(f.cy||0)+x*si+y*co];});};
  const verticalZone=(column,section,door,left,right,bottom,top,front,angle,half=c.thickness/2)=>{
   const pivot=door==='up'?top:bottom,length=top-bottom,sign=door==='up'?-1:1,points=[],steps=Math.max(1,Math.ceil(angle/2));
   for(let k=0;k<=steps;k++){const a=angle*Math.PI/180*k/steps;for(const r of [0,length])for(const q of [-half,half])points.push([front+r*Math.sin(a)+q*Math.cos(a),pivot+sign*(r*Math.cos(a)-q*Math.sin(a))]);}
   const profile=convexHull(points),depths=profile.map(p=>p[0]),min=Math.min(...depths),max=Math.max(...depths);
   zones.push({column,kind:'cabinetdoor',section,poly:transform([[left,min],[right,min],[right,max],[left,max]]),ranges:[[Math.min(...profile.map(p=>p[1])),Math.max(...profile.map(p=>p[1]))]],sweep:{left,right,profile,cx:f.cx||0,cy:f.cy||0,rot:f.rot||0,flip:!!f.flip}});
  };
  c.columns.forEach((col,i)=>{
   const bay=bays[i],front=c.sideboard?-f.d/2+(col.fridgeBay?(c.sideboard.fridgeDepth??f.d):c.sideboard.lowerDepth):f.d/2,overlay=doorOverlay(f,c)!=='inset',span=frontSpan(f,i,c),left=span.left,right=span.right,inset=frontInset(f,c);
   const h=height(f),t=c.thickness,p=c.plinth,total=col.drawers.reduce((n,d)=>n+d.height,0),base=p+t;
   const upper=c.sideboard?c.sideboard.baseHeight+c.sideboard.counterThickness+c.sideboard.nicheHeight+c.sideboard.displayHeight:0;
   const bands=c.sideboard?(col.fridgeBay?[[c.sideboard.fridgeHeight+t+1,h-1]]:[[p+1,c.sideboard.baseHeight-total-(col.drawers.length?12:0)-1],[upper+1,h-1]])
    :c.entry?[[p+c.entry.shoeHeight-t+1,col.drawers.length?p+c.entry.shoeHeight+c.entry.lowerHeight-total-1:p+c.entry.shoeHeight+c.entry.lowerHeight-t-1],[p+c.entry.shoeHeight+c.entry.lowerHeight+c.entry.nicheHeight+1,h-1]]
    :[[col.doorBottom!==undefined?base+col.doorBottom-t+inset+1:base+total-t+inset+1,frontHeight(f,c)-inset-1]];
   if(c.entry||c.sideboard&&c.doorOverlay!==undefined)for(const band of bands){band[0]+=inset;band[1]-=inset;}
   const door=frontDoor(f,i,c);
   if(verticalDoor(door)){
    bands.forEach(([bottom,top],section)=>{const z=c.sideboard?-f.d/2+(col.fridgeBay?(c.sideboard.fridgeDepth??f.d):section===0?c.sideboard.lowerDepth:c.sideboard.upperDepth)-t/2:f.d/2-(overlay||c.doorOverlay!==undefined||col.doorBottom!==undefined?t/2:0);verticalZone(i,c.sideboard?(col.fridgeBay?'fridgeUpper':section===0?'lower':'upper'):'storage',door,left+1,right-1,bottom,top,z,maxDoorAngle(c,col));});
   }else if(door!=='none'){
    const n=frontLeafCount(f,i,c),leaf=(right-left)/n,angle=maxDoorAngle(c,col)*Math.PI/180;
    for(const [section,front] of (c.sideboard?(col.fridgeBay?[-f.d/2+(c.sideboard.fridgeDepth??f.d)]:[-f.d/2+c.sideboard.lowerDepth,-f.d/2+c.sideboard.upperDepth]):[f.d/2-(overlay||c.doorOverlay!==undefined||col.doorBottom!==undefined?t/2:0)]).map((front,i)=>[i,front]))for(let j=0;j<n;j++){const rightHinge=rightDoorHinge(door,j,n,doorPairing(col),doorSingleHinge(col,door),col.doorLayout),hinge=left+leaf*(j+(rightHinge?1:0)),sign=rightHinge?-1:1,points=[[hinge,front]];
     for(let k=0;k<=24;k++){const t=angle*k/24;points.push([hinge+sign*leaf*Math.cos(t),front+leaf*Math.sin(t)]);}const ranges=c.sideboard?[bands[section]]:bands;
     zones.push({column:i,kind:'cabinetdoor',leaf:j,section:c.sideboard?(col.fridgeBay?'fridgeUpper':section===0?'lower':'upper'):'storage',poly:transform(points),ranges:ranges.filter(([a,b])=>b>a)});
    }
   }
   if(col.drawers.length||col.top==='drawer'){const travel=(c.sideboard?c.sideboard.lowerDepth:f.d)*.7;
    const bottom=c.sideboard?c.sideboard.baseHeight-total:c.entry?p+c.entry.shoeHeight+c.entry.lowerHeight-total:overlay?p:base;
    const top=col.top==='drawer'?h:c.sideboard?c.sideboard.baseHeight-t:c.entry?p+c.entry.shoeHeight+c.entry.lowerHeight-t:kitchenOverlay(f,c)?col.door==='none'?frontHeight(f,c)-inset-1:base+total-t-1:base+total-(overlay?t:0);
    zones.push({column:i,kind:'cabinetdrawer',poly:transform([[left,front],[right,front],[right,front+travel],[left,front+travel]]),ranges:[[bottom,top]]});
    if(passage>0)zones.push({column:i,kind:'cabinetpassage',poly:transform([[left,front+travel],[right,front+travel],[right,front+travel+passage],[left,front+travel+passage]]),ranges:[[0,2000]]});
   }
  });
  if(c.sideboard)for(const group of sideboardDisplayGroups(f)){
   const col=c.columns[group.column],door=displayDoor(col);if(door==='none')continue;const front=-f.d/2+c.sideboard.upperDepth,top=c.sideboard.baseHeight+c.sideboard.counterThickness+c.sideboard.nicheHeight+c.sideboard.displayHeight-1,bottom=top-c.sideboard.displayHeight+2,angle=maxDoorAngle(c,col,'display');
   if(verticalDoor(door))verticalZone(group.column,'display',door,group.left+1,group.left+group.width-1,bottom,top,front-c.thickness/2,angle,c.thickness/2+1);
   else {const n=door==='double'?2:1,leaf=group.width/n;for(let j=0;j<n;j++){const rightHinge=rightDoorHinge(door,j,n),hinge=group.left+leaf*(j+(rightHinge?1:0)),sign=rightHinge?-1:1,points=[[hinge,front]];for(let k=0;k<=24;k++){const a=angle*Math.PI/180*k/24;points.push([hinge+sign*leaf*Math.cos(a),front+leaf*Math.sin(a)]);}zones.push({column:group.column,kind:'cabinetdoor',section:'display',leaf:j,poly:transform(points),ranges:[[bottom,top]]});}}
  }const bottom=f.type==='kitchenwall'||f.type==='vanity'?products().cabinetBase(f):0;if(bottom)for(const zone of zones){zone.ranges=zone.ranges.map(([a,b])=>[a+bottom,b+bottom]);if(zone.sweep)zone.sweep.profile=zone.sweep.profile.map(([z,y])=>[z,y+bottom]);}return zones;
 }
 function convexHull(points){
  const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const half=list=>{const out=[];for(const p of list){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
  return [...half(sorted).slice(0,-1),...half(sorted.reverse()).slice(0,-1)];
 }
 function clipOpening(poly,axis,edge,above){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=above?a[axis]>=edge:a[axis]<=edge,bi=above?b[axis]>=edge:b[axis]<=edge;if(ai)out.push(a);if(ai!==bi){const k=(edge-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,j)=>v+k*(b[j]-v)));}}return out;}
 function openingIntersects(zone,poly,vertical,intersects){
  if(!intersects(zone.poly,poly))return false;
  if(!vertical)return true; // Caller labels missing height as pending verification.
  if(!zone.ranges.some(([bottom,top])=>Math.min(top,vertical.top)-Math.max(bottom,vertical.bottom)>1e-6))return false;
  if(!zone.sweep)return true;
  const s=zone.sweep,a=s.rot*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
  let footprint=poly.map(([x,y])=>{x-=s.cx;y-=s.cy;return [(x*co+y*si)*(s.flip?-1:1),-x*si+y*co];});
  footprint=clipOpening(clipOpening(footprint,0,s.left,true),0,s.right,false);if(footprint.length<3)return false;
  const depths=footprint.map(p=>p[1]);let section=s.profile;
  for(const [axis,edge,above] of [[0,Math.min(...depths),true],[0,Math.max(...depths),false],[1,vertical.bottom,true],[1,vertical.top,false]])section=clipOpening(section,axis,edge,above);
  const area=Math.abs(section.reduce((sum,p,i)=>{const q=section[(i+1)%section.length];return sum+p[0]*q[1]-p[1]*q[0];},0))/2;
  return area>1e-6;
 }
 function validate(f){
  if(!supported(f))throw Error('此家具不支持柜体设计');
  const c=f.cabinet,h=height(f),finite=v=>typeof v==='number'&&Number.isFinite(v);
  if(c?.backPanel!==undefined&&typeof c.backPanel!=='boolean')throw Error('柜体背板开关须为布尔值');
  if(c?.hoodBayCeiling!==undefined&&(typeof c.hoodBayCeiling!=='boolean'||c.hoodBayHeight===undefined))throw Error('烟机空腔横板开关须为布尔值且仅用于烟机嵌合柜');
  if(c?.autoDoors!==undefined&&typeof c.autoDoors!=='boolean')throw Error('自动配门设置无效');
  if(c?.doorOverlay!==undefined&&!['full','half','inset'].includes(c.doorOverlay))throw Error('柜门盖板方式须为全盖、半盖或无盖');
  if(c?.doorMaxAngle!==undefined&&(!finite(c.doorMaxAngle)||c.doorMaxAngle<1||c.doorMaxAngle>180))throw Error('柜门最大开启角度须为 1–180°');
  if(c?.frontTop!==undefined&&(c.template!=='kitchen-base'||!finite(c.frontTop)||c.frontTop<c.plinth+200||c.frontTop>h))throw Error('厨房派生门板顶高无效');
  const minDepth=c?.template==='kitchen-base'||f.type==='kitchenwall'?products().definition('counter').kitchenDepth.min:150;
  if(![f.w,f.d,h].every(finite)||f.w<150||f.w>6000||f.d<minDepth||f.d>1200||h<200||h>3200)throw Error(`柜宽 150–6000、深 ${minDepth}–1200、高 200–3200 mm`);
  if(!c||c.version!==1||!finite(c.thickness)||c.thickness<12||c.thickness>30||!finite(c.plinth)||c.plinth<0||c.plinth>250||!Array.isArray(c.columns)||c.columns.length<1||c.columns.length>12)throw Error('柜板厚 12–30 mm，底座高 0–250 mm，分区 1–12 个');
  if(c.bodyHeight!==undefined&&(f.type!=='vanity'||!finite(c.bodyHeight)||c.bodyHeight<products().cabinetSpec(f).min||c.bodyHeight>products().cabinetSpec(f).max))throw Error('浴室柜箱体高度须为 200–3200 mm，仅适用于浴室柜');
  if(c.hoodBayHeight!==undefined&&(f.type!=='kitchenwall'||c.entry||c.sideboard||c.plinth!==0||c.autoDoors||c.columns.length!==3||!finite(c.hoodBayHeight)||c.hoodBayHeight<80||c.hoodBayHeight>h-2*c.thickness-100||Math.abs(widths(f)[0]-widths(f)[2])>.01||c.columns.some(col=>col.drawers.length)||c.columns.some(col=>col.top==='drawer'||col.pegboard||col.doorBottom!==undefined)||c.columns[1].shelves.some(y=>y<c.hoodBayHeight)))throw Error('烟机嵌合区须为居中的三分区吊柜，净高至少 80 mm，上方保留 100 mm；中部不能设置底部抽屉');
  if(c.entry){const e=c.entry;if(!['none','left','right','both'].includes(e.openSide)||![e.shoeHeight,e.lowerHeight,e.nicheHeight].every(finite)||e.shoeHeight<180||e.lowerHeight<300||e.nicheHeight<100||e.shoeHeight+e.lowerHeight+e.nicheHeight+c.plinth>h-200||e.autoColumns!==undefined&&typeof e.autoColumns!=='boolean'||e.editable!==undefined&&typeof e.editable!=='boolean')throw Error('玄关柜分层尺寸或镂空侧无效；上柜须保留至少 200 mm');if(c.columns.some(col=>!col||!Array.isArray(col.drawers)||col.drawers.reduce((n,d)=>n+(d?.height||0),0)>e.lowerHeight-120||col.pegboard||col.doorBottom!==undefined||col.top==='drawer'))throw Error('下柜抽屉须给门柜保留 120 mm；置物台结构使用固定顶板');}
  if(c.sideboard){const s=c.sideboard;
   if(c.entry||!['baseHeight','counterThickness','nicheHeight','displayHeight','lowerDepth','upperDepth','fridgeHeight'].every(k=>finite(s[k]))||s.baseHeight<c.plinth+160||s.counterThickness<12||s.counterThickness>50||s.nicheHeight<200||s.displayHeight<120||s.baseHeight+s.counterThickness+s.nicheHeight+s.displayHeight>h-160||s.lowerDepth<150||s.lowerDepth>f.d||s.upperDepth<150||s.upperDepth>s.lowerDepth||s.fridgeHeight<200||s.fridgeHeight>h-160)throw Error('餐边柜分层尺寸无效；上柜至少保留 160 mm，柜深不能超出总深');
   const fridge=c.columns.filter(col=>col.fridgeBay);if(fridge.length>1||fridge.length&&!(c.columns[0].fridgeBay||c.columns.at(-1).fridgeBay)||c.columns.every(col=>col.fridgeBay))throw Error('冰箱位须为最左或最右的单个分区，旁边须有餐边柜');
   if(s.fridgeDepth!==undefined&&(!finite(s.fridgeDepth)||s.fridgeDepth<150||s.fridgeDepth>1200)||fridge.length&&Math.abs(Math.max(s.fridgeDepth??f.d,s.lowerDepth)-f.d)>.01)throw Error('冰箱位深度须为 150–1200 mm；总深由冰箱位与下柜最大深度确定');
   if(!fridge.length&&Math.abs(s.lowerDepth-f.d)>.01)throw Error('无冰箱餐边柜的总深须等于下柜与台面深度');
   if(c.columns.some(col=>col.fridgeBay&&col.drawers?.length||col.drawers?.length>1||col.drawers?.reduce((n,d)=>n+(d?.height||0),0)>s.baseHeight-c.plinth-160||col.top==='drawer'||col.pegboard||col.doorBottom!==undefined))throw Error('餐边柜只支持台面下一排浅抽屉，须给下柜保留 160 mm；冰箱位不能设置抽屉');
  }
  const inner=h-c.plinth-2*c.thickness,explicit=c.columns.filter(col=>col?.width!==undefined).length;
  if(c.columns.some(col=>!col||typeof col!=='object'))throw Error('柜体分区无效');
  if(explicit&&explicit!==c.columns.length)throw Error('须为所有分区指定净宽');
  const values=widths(f);
  const minBoardDepth=(c.template==='kitchen-base'||f.type==='kitchenwall')&&!c.columns.some(col=>col.drawers?.length)?2*c.thickness+1:4*c.thickness;
  if(inner<100||values.some(v=>!finite(v)||v<100)||f.d<minBoardDepth)throw Error('内部净高、分区净宽须至少 100 mm，柜深须容纳板件');
  if(Math.abs(values.reduce((a,b)=>a+b,0)+(c.columns.length+1)*c.thickness-f.w)>.01)throw Error('分区净宽加板厚须等于柜体总宽');
  for(const col of c.columns){
   if(col.drawerStyle!==undefined){const R=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null),min=R.definition('counter').drawerTiers.styles[col.drawerStyle]?.minHeights;if(!min||c.template!=='kitchen-base'||f.type==='kitchenwall'||col.door!=='none'||col.drawers?.length!==min.length||drawerCount(col)!==1||col.shelves?.length||col.drawers.some((v,j)=>v.height+c.thickness*((j===0?1:0)+(j===min.length-1?1:0))<min[j]-.0001))throw Error('碗碟篮样式仅适用于满足分层下限的地柜三层单列抽屉');}
   if(!c.sideboard&&['displayDoor','displayMaxAngle'].some(key=>col[key]!==undefined))throw Error('展示门设置仅适用于分层餐边柜');
   if(col.doorSections!==undefined){const states=col.doorSections;if(!splitDoors(c,col)||!states||typeof states!=='object'||Array.isArray(states)||Object.keys(states).some(k=>!['lower','upper'].includes(k))||['lower','upper'].some(k=>!states[k]||typeof states[k].open!=='boolean'||states[k].angle!==undefined&&(!finite(states[k].angle)||states[k].angle<0||states[k].angle>180)))throw Error('上下柜门独立开合设置无效');}
   if(col.displayOpen!==undefined&&(typeof col.displayOpen!=='boolean'||!c.sideboard)||col.displayAngle!==undefined&&(!finite(col.displayAngle)||col.displayAngle<0||col.displayAngle>180||!c.sideboard))throw Error('展示柜开合设置无效');
   if(col.fridgeBay!==undefined&&(typeof col.fridgeBay!=='boolean'||!c.sideboard))throw Error('冰箱位配置无效');
   if(col.drawerColumns!==undefined&&(!Number.isInteger(col.drawerColumns)||col.drawerColumns<1||col.drawerColumns>12)||col.drawers.length&&(values[c.columns.indexOf(col)]-(drawerCount(col)-1)*c.thickness)/drawerCount(col)<60)throw Error('抽屉分列须为 1–12 列，每列净宽至少 60 mm');
   for(const drawer of col.drawers)if(drawer.lanes!==undefined&&(!Array.isArray(drawer.lanes)||drawer.lanes.length!==drawerCount(col)||drawer.lanes.some(v=>!v||typeof v.open!=='boolean'||v.extension!==undefined&&(!finite(v.extension)||v.extension<0||v.extension>1))))throw Error('独立抽屉开合配置无效');
   if(col.top!==undefined&&!['fixed','drawer'].includes(col.top)||col.topOpen!==undefined&&typeof col.topOpen!=='boolean'||col.cableGap!==undefined&&(!finite(col.cableGap)||col.cableGap<0||col.cableGap>Math.min(100,f.d-4*c.thickness)))throw Error('顶盖类型或后侧留缝无效（0–100 mm，须容纳板件）');
   if(col.top==='drawer'&&(col.door!=='none'||col.drawers.length||col.shelves.length))throw Error('上盖抽屉不能同时设置柜门、层板或普通抽屉');
   if(!doorOptions.some(o=>o[0]===col.door)||typeof col.doorOpen!=='boolean'||!Array.isArray(col.drawers)||col.drawers.length>10||!Array.isArray(col.shelves)||col.shelves.length>20)throw Error('柜门、层板或抽屉配置无效');
   if(col.doorBottom!==undefined&&(!finite(col.doorBottom)||col.doorBottom<0||col.doorBottom>inner-100)||col.pegboard!==undefined&&typeof col.pegboard!=='boolean')throw Error('上柜门底部高度或洞洞板配置无效');
   if(col.doorAngle!==undefined&&(!finite(col.doorAngle)||col.doorAngle<0||col.doorAngle>180)||col.finish!==undefined&&!['solid','wood','glass'].includes(col.finish)||col.handle!==undefined&&!['bar','knob','none'].includes(col.handle)||col.doorColor!==undefined&&!/^#[0-9a-f]{6}$/i.test(col.doorColor))throw Error('门板材质、颜色、把手或开启角度无效');
   validateDoorSettings(col);validateDoorLayout(col,frontLeafCount(f,c.columns.indexOf(col),c));
   let bottom=0;for(const drawer of col.drawers){if(!drawer||!finite(drawer.height)||drawer.height<60||typeof drawer.open!=='boolean'||drawer.extension!==undefined&&(!finite(drawer.extension)||drawer.extension<0||drawer.extension>1))throw Error('抽屉高度至少 60 mm，拉出程度须为 0–100%');bottom+=drawer.height;}
   if(bottom>inner)throw Error('抽屉总高度超出柜内净高');
   if(!c.entry&&!c.sideboard&&col.door!=='none'&&frontHeight(f,c)-c.plinth-(col.doorBottom??bottom)-2*frontInset(f,c)<=2)throw Error('抽屉或分界层板占满柜门高度，请先调整内部结构');
   if(col.doorBottom!==undefined&&(col.doorBottom<bottom||!col.shelves.some(v=>Math.abs(v+c.thickness-col.doorBottom)<.01)))throw Error('上柜门底部须对齐一块层板上表面，并高于抽屉');
   if(col.pegboard&&(col.doorBottom===undefined||col.doorBottom-c.thickness-bottom<100||col.top==='drawer'))throw Error('洞洞板需要至少 100 mm 高的开放区及固定顶板');
   let last=c.entry||c.sideboard?0:bottom;for(const shelf of col.shelves){if(!finite(shelf)||shelf-last<40||shelf>inner-c.thickness-40||(c.entry||c.sideboard)&&!(c.entry?entryBands:sideboardBands)(f,c.columns.indexOf(col)).some(b=>shelf>=b.bottom+40&&shelf<=b.top-c.thickness-40))throw Error('层板须在储物柜内递增，与抽屉、顶板及相邻层板留出至少 40 mm');last=shelf+c.thickness;}
  }
  return f;
 }
 function resize(f,next){
  if(f.type==='vanity'&&next.h!==f.h&&next.h!==undefined){next={...next,cabinet:{...config(f),bodyHeight:next.h}};if(f.h===undefined)delete next.h;else next.h=f.h;}
  if(!f.cabinet){if(supported(next))validate({...next,cabinet:config(next)});return next;}
  const c=config(f),ratio=(height(next)-c.plinth-2*c.thickness)/(height(f)-c.plinth-2*c.thickness);
  if(f.type==='vanity'&&next.cabinet?.bodyHeight!==undefined)c.bodyHeight=next.cabinet.bodyHeight;
  if(c.sideboard){const scale=height(next)/height(f);for(const key of ['baseHeight','nicheHeight','displayHeight','fridgeHeight'])c.sideboard[key]=Math.round(c.sideboard[key]*scale);if(next.d!==f.d){if(c.columns.some(col=>col.fridgeBay))c.sideboard.fridgeDepth=(c.sideboard.fridgeDepth??f.d)*next.d/f.d;c.sideboard.lowerDepth*=next.d/f.d;c.sideboard.upperDepth*=next.d/f.d;}}
  if(c.entry){const scale=height(next)/height(f);for(const key of ['shoeHeight','lowerHeight','nicheHeight'])c.entry[key]=Math.round(c.entry[key]*scale);}
  for(const col of c.columns){const divider=col.doorBottom===undefined?-1:col.shelves.findIndex(v=>Math.abs(v+c.thickness-col.doorBottom)<.01);col.shelves=col.shelves.map(v=>Math.round(v*ratio));col.drawers=col.drawers.map(v=>({...v,height:Math.round(v.height*ratio)}));if(col.doorBottom!==undefined)col.doorBottom=divider<0?Math.round(col.doorBottom*ratio):col.shelves[divider]+c.thickness;}
  if(next.w!==f.w&&(c.autoDoors===true&&c.entry?.autoColumns!==false||c.entry&&c.entry.autoColumns!==false))return validate(autoDoors({...next,cabinet:c}));
  return validate(scaleWidths(f,{...next,cabinet:c}));
 }
 function toggle(f,column,drawer,lid=false,lane,section){
  const c=config(f),col=c.columns[column];if(!col)throw Error('柜体分区不存在');
  if(section==='display'){if(!c.sideboard||displayDoor(col)==='none'||!sideboardDisplayGroups(f).some(group=>group.column===column))throw Error('玻璃展示柜不存在');col.displayOpen=!col.displayOpen;if(col.displayOpen)col.displayAngle=maxDoorAngle(c,col,'display');}
  else if(['lower','upper'].includes(section)&&splitDoors(c,col)&&drawer===undefined){if(frontDoor(f,column,c)==='none')throw Error('该分区没有柜门');col.doorSections??={lower:{open:col.doorOpen,angle:col.doorAngle??maxDoorAngle(c,col)},upper:{open:col.doorOpen,angle:col.doorAngle??maxDoorAngle(c,col)}};const state=col.doorSections[section];state.open=!state.open;if(state.open)state.angle=maxDoorAngle(c,col);}
  else if(lid){if(col.top!=='drawer')throw Error('此分区没有可开合上盖');col.topOpen=!col.topOpen;}
  else if(drawer===undefined){if(frontDoor(f,column,c)==='none')throw Error('该分区没有柜门');col.doorOpen=!col.doorOpen;if(col.doorOpen)col.doorAngle=maxDoorAngle(c,col);if(col.doorSections)for(const state of Object.values(col.doorSections)){state.open=col.doorOpen;state.angle=maxDoorAngle(c,col);}}else{const d=col.drawers[drawer];if(!d)throw Error('抽屉不存在');if(lane!==undefined){if(!Number.isInteger(lane)||lane<0||lane>=drawerCount(col))throw Error('抽屉列不存在');if(!d.lanes)d.lanes=Array.from({length:drawerCount(col)},()=>({open:d.open,extension:d.extension??1}));const state=d.lanes[lane];state.open=!state.open;if(state.open&&state.extension===0)state.extension=1;}else{d.open=!d.open;if(d.open&&d.extension===0)d.extension=1;d.lanes?.forEach(v=>{v.open=d.open;if(v.open&&v.extension===0)v.extension=1;});}}
  return validate(f.type==='vanity'?{...f,cabinet:c}:{...f,h:height(f),cabinet:c});
 }
 function specification(f){const c=config(f);delete c.autoDoors;if(c.entry){delete c.entry.autoColumns;delete c.entry.editable;}return {...c,columns:c.columns.map(col=>{const {doorAngle,doorLeaves,doorSections,topOpen,displayOpen,displayAngle,...rest}=col;return {...rest,doorOpen:false,drawers:col.drawers.map(d=>{const {extension,lanes,...rest}=d;return {...rest,open:false};})};})};}
 // Derived side openings: only matching, parallel entry cabinets within 20 mm.
 // Plan-local X reverses under mirroring; height remains floor-based.
 function sideOpenings(f,items=[]){
  if(!supported(f))return [];const c=config(f),cuts=[],e=c.entry;
  if(e){const bottom=c.plinth+e.shoeHeight+e.lowerHeight;for(const side of ['left','right'])if(e.openSide===side||e.openSide==='both')cuts.push({side,bottom,top:bottom+e.nicheHeight,back:-f.d/2,front:f.d/2});return cuts;}
  const a=(f.rot||0)*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
  for(const other of items){if(other===f||f.id&&other.id===f.id||!supported(other))continue;const oc=config(other),oe=oc.entry;if(!oe)continue;
   const angle=((other.rot||0)-(f.rot||0)+540)%360-180;if(Math.abs(angle)>.1)continue;
   const dx=((other.cx||0)-(f.cx||0))*co+((other.cy||0)-(f.cy||0))*si,dy=-((other.cx||0)-(f.cx||0))*si+((other.cy||0)-(f.cy||0))*co;
   if(Math.abs(Math.abs(dx)-(f.w+other.w)/2)>20)continue;
   const otherSide=dx*(other.flip?-1:1)>0?'left':'right';if(oe.openSide!==otherSide&&oe.openSide!=='both')continue;
   const side=dx*(f.flip?-1:1)>0?'right':'left',col=c.columns[side==='left'?0:c.columns.length-1];if(!col.pegboard)continue;
   const base=c.plinth+c.thickness,bottom=Math.max(oc.plinth+oe.shoeHeight+oe.lowerHeight,base+col.drawers.reduce((n,v)=>n+v.height,0)),top=Math.min(oc.plinth+oe.shoeHeight+oe.lowerHeight+oe.nicheHeight,base+col.doorBottom-c.thickness),back=Math.max(-f.d/2,dy-other.d/2),front=Math.min(f.d/2,dy+other.d/2);
   if(top>bottom&&front-back>=50)cuts.push({side,bottom,top,back,front});
  }return cuts;
 }
 // Exposed connecting side boards belong to the wooden niche, not the doors.
 function joinedSideFinishes(f,items=[]){
  if(!supported(f))return [];const c=config(f),result=[];
  if(!c.entry){for(const cut of sideOpenings(f,items)){const col=c.columns[cut.side==='left'?0:c.columns.length-1],base=c.plinth+c.thickness;result.push({side:cut.side,bottom:base+col.drawers.reduce((n,v)=>n+v.height,0),top:base+col.doorBottom-c.thickness,gap:0});}return result;}
  const a=(f.rot||0)*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
  for(const other of items){if(other===f||f.id&&other.id===f.id||!supported(other))continue;const oc=config(other);if(oc.entry)continue;const openings=sideOpenings(other,[f]);if(!openings.length)continue;const dx=((other.cx||0)-(f.cx||0))*co+((other.cy||0)-(f.cy||0))*si,side=dx*(f.flip?-1:1)>0?'right':'left';
   const col=oc.columns[openings[0].side==='left'?0:oc.columns.length-1],base=oc.plinth+oc.thickness;result.push({side,bottom:base+col.drawers.reduce((n,v)=>n+v.height,0),top:base+col.doorBottom-oc.thickness,gap:Math.max(0,Math.abs(dx)-(f.w+other.w)/2)});
  }return result;
 }
 // Share the pegboard cabinet's side, removing the console's duplicate side.
 // Each module keeps its plan width; the console gains the removed 18 mm inside.
 function sharedSides(f,items=[]){
  if(!supported(f)||!f.cabinet)return [];const c=config(f),entry=!!c.entry;if(!entry&&c.template!=='entry-pegboard'||c.thickness!==18)return [];
  const a=(f.rot||0)*Math.PI/180,co=Math.cos(a),si=Math.sin(a),result=[];
  for(const other of items){if(other===f||f.id&&other.id===f.id||!supported(other)||!other.cabinet)continue;const oc=config(other);if(oc.thickness!==18||(entry?(!!oc.entry||oc.template!=='entry-pegboard'):!oc.entry))continue;
   const angle=((other.rot||0)-(f.rot||0)+540)%360-180,dx=((other.cx||0)-(f.cx||0))*co+((other.cy||0)-(f.cy||0))*si,dy=-((other.cx||0)-(f.cx||0))*si+((other.cy||0)-(f.cy||0))*co;
   if(Math.abs(angle)>.1||Math.abs(dy)>1||Math.abs(f.d-other.d)>1||Math.abs(height(f)-height(other))>1||c.plinth!==oc.plinth||Math.abs(Math.abs(dx)-(f.w+other.w)/2)>1)continue;
   const side=dx*(f.flip?-1:1)>0?'right':'left';if(!result.some(v=>v.side===side))result.push({side,owner:!entry});
  }return result;
 }
 const api={palette,types,templates,supported,defaultId,preset,config,height,frontHeight,kitchenOverlay,doorOverlay,fullOverlay,frontSpan,frontInset,frontDoor,autoDoorCount,frontLeafCount,rightDoorHinge,doorPairing,doorPairingOptions,doorLayout,fitDoorLayout,validateDoorLayout,editDoorLayout,configureDoorLayout,doorLayoutModes,singleDoorLeaf,doorSingleHinge,widths,layout,scaleWidths,setColumnWidth,autoDoors,mergeDoors,maxDoorAngle,doorAngle,doorState,doorLeafState,doorLeafAngle,splitDoors,drawerCount,drawerState,withDrawerColumns,entryBands,sideboardBands,sideboardDisplayGroups,configureHoodBay,hoodBayCeiling,setHoodSideGap,hoodBay,hoodBayFit,centerHoodInBay,setSideboardDrawerHeight,setSideboardFridgeDepth,fridgeFitsBay,fridgeBayFit,centerFridgeInBay,shelfLimits,moveShelf,moveDivider,spaces,snapShelf,editStructure,openingZones,openingIntersects,validate,resize,toggle,specification,sideOpenings,joinedSideFinishes,sharedSides,doorOptions,verticalDoor,doorPose,validateDoorSettings,displayDoor,displayAngle};
 Object.assign(api,{templateGroups,templateType});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCabinet=api;
})(typeof globalThis!=='undefined'?globalThis:this);
