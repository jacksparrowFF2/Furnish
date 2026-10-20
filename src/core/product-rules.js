/* Product capabilities shared by browser/Node. No DOM, storage or geometry engine. */
(function(root){
'use strict';
const numeric=(min,max,message)=>({min,max,message});
const kitchen=()=>root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);
const fields={
 pipeBoxShape:{values:['four','three','two'],message:'包管柜结构须为四面、三面或直角两面'},
 pipeBoxOpenSide:{values:['back','front','left','right'],message:'包管柜敞开面须为前、后、左或右面'},
 pipeBoxCorner:{values:['front-left','front-right','back-left','back-right'],message:'包管柜须保留两个相邻面'},
 pipeBoxThickness:numeric(1,100,'包管柜板厚须为 1–100 mm'),
 laundryHostId:{string:true,max:200,message:'洗衣机柜关联编号无效'},
 groupId:{string:true,max:200,message:'家具组编号须为 1–200 字的非空字符串'},
 hoodPanelOpen:{boolean:true,message:'烟机面板开合设置无效'},
 dishwasherDoorOpen:{boolean:true,message:'洗碗机折叠门开合设置无效'},
 teaBarUpperOpen:{boolean:true,message:'茶吧机上层柜门开合设置无效'},
 teaBarLowerOpen:{boolean:true,message:'茶吧机下层柜门开合设置无效'},
 foldingTablePose:{values:['round','single','capsule'],message:'折叠桌形态须为圆桌、单边收起或胶囊桌'},
 hoodGeometry:{custom:true,message:'烟机几何尺寸无效'},
 hobCutout:{custom:true,message:'灶具开孔尺寸无效'},
 kitchen:{custom:true,message:'厨房配置无效'},
 sinkNotch:{custom:true,message:'水槽缺角无效'},
 sinkStyle:{values:['inset','vessel'],message:'定制水槽样式须为嵌入盆或台上盆'},
 sinkBowlHeight:numeric(50,400,'台上盆高度须为 50–400 mm'),
 counterLink:{custom:true,message:'台面关联无效'},
 counterElevation:numeric(0,2000,'台面离地高度须为 0–2000 mm'),
 sinkInstall:{values:['top','flush','under'],message:'水槽安装方式须为台上、台中或台下'},
 mountHeight:numeric(0,20000,'设备底部离地高度须为 0–20000 mm'),
 stackHeight:numeric(0,1000,'洗烘连接层高度须为 0–1000 mm'),
 showerMixerHeight:numeric(0,40000,'混水器中心离地高度须为 0–40000 mm'),
 showerRise:numeric(100,500,'花洒顶部调节段须为 100–500 mm'),
 showerHandAngle:numeric(0,35,'手持花洒角度须为 0–35°'),
 curtainStyle:{values:['single','double'],message:'窗帘样式须为单开或双开'},
 floorTrack:{boolean:true,message:'轨道设置无效'},
 heaterSocket:{point:true,message:'热水器插座须有有效 X、Y 和 0–20000 mm 离地高度'}
};
const laundry={family:'laundry',height:850,anchor:'bottom',defaults:{mountHeight:0,stackHeight:20},fields:['mountHeight','stackHeight','laundryHostId'],create:['mountHeight']};
const surfaceMeasurement={wallContactTolerance:5};
const arrowSink={embedded:true,measureSurfaceBoundary:true,surfaceMeasurement,family:'arrow-sink',height:240,sink:{rimThickness:.8,nominalDepth:450,faucetRise:360,nominalInnerWidth:640},defaults:{counterElevation:860,sinkInstall:'top'},fields:['counterLink','counterElevation','sinkInstall'],create:['counterElevation','sinkInstall']};
const doorPairing={values:['end','start'],default:'end',singleHinge:{values:['left','right'],default:'left'},layout:{values:['left','right','pair','paired'],maxLeaves:24}};
// Editable leaf widths are model dimensions, not hardware installation limits.
const doorWidths={minWidth:50,maxLeaves:24,gap:2};
const hobCutoutLimits={min:1,max:20000,moduleMargin:20};
const foldingTable={family:'folding-table',height:760,defaults:{foldingTablePose:'round'},fields:['foldingTablePose'],create:['foldingTablePose'],identity:{brand:'源氏木语/YESWOOD',model:'白蜡木原木色 · 象牙白岩板折叠餐桌',sourceUrl:'https://item.jd.com/10195288580856.html'}};
const types={
 bench_yeswood_oak:{family:'shoe-bench',height:450,envelope:()=>[0,450],identity:{brand:'源氏木语/YESWOOD',model:'橡木软包换鞋凳 · 80cm'}},
 coffeetable_yeswood_cherry:{family:'coffee-table',height:450,envelope:()=>[0,450],identity:{brand:'源氏木语/YESWOOD',model:'樱桃木茶几 · 1.2米白色岩板面'}},
 aircon_midea_ultra_2hp:{family:'floor-aircon',height:1856,envelope:()=>[0,1856],planShape:{kind:'superellipse',exponent:.7,segments:96,bodyWidth:383,bodyDepth:424,label:{x:-135,width:16,offset:3},rear:{width:220,z:-213.5,referenceWidth:395,referenceDepth:436},version:1},clearanceReview:'missing',identity:{brand:'美的/Midea',model:'KFR-51LW/N8KS1-1U'}},
 tea_table_800:{family:'tea-table',height:720,teaTable:{cabinetHeight:720,accessoryTop:897},envelope:()=>[0,720]},
 tea_bar_mijia_pro:{family:'tea-bar',height:1155,envelope:()=>[0,1155],defaults:{teaBarUpperOpen:false,teaBarLowerOpen:false},fields:['teaBarUpperOpen','teaBarLowerOpen'],create:['teaBarUpperOpen','teaBarLowerOpen'],teaBar:{width:315,depth:310,height:1155,hingeX:-147.5,front:146,thickness:14,angle:100,bottle:{diameter:270,height:500,neckDiameter:55,neckHeight:80,bottom:36,z:0,capHeight:14,adapterHeight:22},doors:[{section:'upper',key:'teaBarUpperOpen',bottom:601.5,top:809},{section:'lower',key:'teaBarLowerOpen',bottom:17,top:600}]},identity:{brand:'米家/Mijia',model:'智能茶吧机 Pro 立式'}},
 pet_feeder_mijia_2:{family:'pet-feeder',height:370,envelope:()=>[0,370],identity:{brand:'米家/Mijia',model:'智能宠物喂食器 2'}},
 cat_tree:{family:'pet-cat-tree',height:1430,envelope:()=>[0,1430]},
 litter_box:{family:'pet-litter-box',height:400,envelope:()=>[0,400]},
 block:{family:'placeholder',height:1000,anchor:'bottom',defaults:{mountHeight:0},fields:['mountHeight'],create:['mountHeight']},
 pipebox:{family:'pipe-box',height:2400,anchor:'bottom',defaults:{mountHeight:0,pipeBoxThickness:18,pipeBoxShape:'three',pipeBoxOpenSide:'back',pipeBoxCorner:'front-left'},fields:['mountHeight','pipeBoxThickness','pipeBoxShape','pipeBoxOpenSide','pipeBoxCorner'],create:['mountHeight','pipeBoxThickness','pipeBoxShape']},
 table_folding_1100:{...foldingTable,folding:{diameter:1100,closedDepth:740,singleDepth:920,top:32,leg:75,apron:120}},
 table_folding_1200:{...foldingTable,folding:{diameter:1200,closedDepth:793,singleDepth:996.5,top:32,leg:75,apron:120}},
 table_folding_1300:{...foldingTable,folding:{diameter:1305,closedDepth:848,singleDepth:1075,top:32,leg:75,apron:120}},
 sink_arrow_680:{...arrowSink,identity:{brand:'ARROW/箭牌',model:'AE5568459G23-YNC',sourceUrl:'https://item.jd.com/100199201484.html'}},
 sink_arrow_750:{...arrowSink,identity:{brand:'ARROW/箭牌',model:'AE5575459G23-YNC',sourceUrl:'https://item.jd.com/100199201484.html'}},
 counter:{family:'kitchen',moduleDividers:true,drawerTiers:{boundaryResize:true,snapPixels:8,defaultCount:3,minCount:1,maxCount:10,minHeight:96,plinth:100,board:18,legacyOffset:150,legacyMin:60,styles:{standard:{label:'普通抽屉'},'dish-basket':{label:'碗碟篮（两外抽、三层）',minHeights:[300,220,100],hiddenTier:2,outerTier:1}}},kitchenDepth:{min:50,max:1200,drawerMin:72,emptyMinWidth:50},kitchenShapes:{straight:{runs:[0],ends:[0]},L:{runs:[0,1],ends:[0,1]},U:{runs:[0,1,2],ends:[0,2],independentResize:true,outerResize:true,runDepth:{min:50,max:1200}}},endResize:{fields:['length','cabinetDepth'],minLength:150,maxLength:3000,minDepth:50,maxDepth:1200},cornerPartitions:{sides:['left','right'],retained:false,roleDefaults:{drawer:true}},avoidance:{enabled:false,minDepth:150},fields:['kitchen'],create:['kitchen']},
 kitchenwall:{height:700,anchor:'bottom',defaults:{mountHeight:1480},hoodBay:{ceilingDefault:true,minSideGap:0},moduleDividers:true,moduleMaxWidth:6000,drawerTiers:{boundaryResize:true,snapPixels:8,defaultCount:3,minCount:1,maxCount:10,minHeight:96,plinth:0,board:18,legacyOffset:50,legacyMin:60},kitchenShapes:{straight:{runs:[0],ends:[0]},L:{runs:[0,1],ends:[0,1]},U:{runs:[0,1,2],ends:[0,2],independentResize:true,outerResize:true,runDepth:{min:50,max:1200}}},fields:['mountHeight','kitchen'],create:['mountHeight','kitchen']},
 stove_fotile_th36b:{embedded:true,measureSurfaceBoundary:true,surfaceMeasurement,hobCutout:{...hobCutoutLimits,widthRatio:660/750,depthRatio:350/440},height:138,defaults:{counterElevation:860},fields:['counterLink','counterElevation','hobCutout'],create:['counterElevation'],identity:{brand:'方太/FOTILE',model:'TH36B-T'}},
 rangehood_fotile_jcd10ta:{height:520,anchor:'bottom',hoodGeometry:{min:10,max:20000},defaults:{mountHeight:1315,hoodPanelOpen:false},fields:['mountHeight','hoodPanelOpen','hoodGeometry'],create:['mountHeight','hoodPanelOpen'],identity:{brand:'方太/FOTILE',model:'JCD10TA'}},
 stove:{measureSurfaceBoundary:true,surfaceMeasurement,hobCutout:{...hobCutoutLimits,inset:30},fields:['counterLink','counterElevation','hobCutout']},ksink:{fields:['counterLink','counterElevation','sinkNotch','sinkStyle','sinkBowlHeight'],defaults:{sinkStyle:'inset',sinkBowlHeight:150},vessel:{minSize:80,defaultDepth:400,rim:15,floor:12,drain:45,faucetRise:300,faucetClearance:100},notch:{min:20,margin:80,bodyDepth:220,rim:20,floor:12,faucetRise:292}},
 washer:laundry,dryer:laundry,
 water_purifier_mijia_1200g:{family:'under-sink-purifier',height:379,anchor:'bottom',defaults:{mountHeight:0},fields:['mountHeight'],create:['mountHeight'],identity:{brand:'米家/Mijia',model:'净水器 2 1200G'}},
 dishwasher_mijia_countertop:{family:'countertop-dishwasher',height:598,anchor:'bottom',defaults:{mountHeight:860,dishwasherDoorOpen:false},fields:['mountHeight','dishwasherDoorOpen'],create:['mountHeight','dishwasherDoorOpen'],identity:{brand:'米家/Mijia',model:'智能洗碗机 台式 5套'},foldDoor:{nominalWidth:550,nominalHeight:598,nominalDepth:350,openDepth:600,openingBottom:52,openingTop:584},installation:{ventSide:'left',sideClearance:200,worktopToCabinet:650,topAccess:50,frontOffset:80}},
 aquarium_mijia_2pro:{family:'aquarium',height:334,anchor:'bottom',defaults:{mountHeight:0},fields:['mountHeight'],create:['mountHeight'],identity:{brand:'米家/Mijia',model:'智能鱼缸 2 Pro',sourceUrl:'https://item.jd.com/100317574693.html'}},
 waterheater_flat:{family:'flat-heater',height:565,anchor:'bottom',defaults:{mountHeight:1650},fields:['mountHeight','heaterSocket'],create:['mountHeight']},
 shower_arrow_cream:{family:'arrow-shower',height:1749,anchor:'mixer',defaults:{showerMixerHeight:1000,showerRise:400,showerHandAngle:180*.20/Math.PI},fields:['mountHeight','showerMixerHeight','showerRise','showerHandAngle'],create:['showerMixerHeight'],identity:{brand:'ARROW/箭牌',model:'AE34129ZMKW-P2'}},
 tripleslidingwindow:{family:'sliding',height:1500,anchor:'bottom',defaults:{mountHeight:900,floorTrack:true},fields:['mountHeight','floorTrack'],create:['mountHeight']},
 tripleslidingdoor:{family:'sliding',height:2400,defaults:{floorTrack:false},fields:['floorTrack']},
 slidingdoor:{family:'sliding',height:2100,defaults:{floorTrack:true},fields:['floorTrack']},
 curtain:{height:2400,defaults:{curtainStyle:'double'},fields:['curtainStyle'],create:['curtainStyle']},
 fridge:{height:1800},fridge_french_drawer:{height:1910},sofa_yeswood_cherry:{height:895},mirror:{height:1650},
 aircon:{height:1800},dishwasher:{height:840},rug:{height:16},bench:{height:440},beanbag:{height:720},barstool:{height:775},custom:{height:800},customround:{height:800},toilet:{height:796}
};
// Installation review coverage is a product capability, not a saved instance field.
for(const type of ['tea_bar_mijia_pro','water_purifier_mijia_1200g','aquarium_mijia_2pro','stove_fotile_th36b','rangehood_fotile_jcd10ta','stove','fridge','washer','waterheater','waterheater_flat','tv','fridge_french_drawer','aircon','acwall','dishwasher','dishwasher_mijia_countertop','dryer','purifier','robot_p20max_tank','robot_p20max_plumbed','robot_p20max']){
 types[type]={...types[type],clearanceReview:type==='waterheater_flat'?'heater':type==='dishwasher_mijia_countertop'?'dishwasher':'missing'};
}
// Optional kitchen door pairing keeps the historical leading single leaf by default.
types.counter.doorPairing=doorPairing;types.kitchenwall.doorPairing=doorPairing;
types.counter.doorWidths=doorWidths;types.kitchenwall.doorWidths=doorWidths;
types.counter.laundry={outerResize:true,sideThickness:18,sideMin:10,sideMax:50,width:1340,depth:630,baseHeight:900,thickness:20,bayWidth:640,notchMin:20,minRemainingDepth:150,area:{upperHeight:600,upperBottom:1800,upperDepth:350,openHeight:200,openBottom:1600,openDepth:320,serviceGap:0,notch:100,sinkWidth:600,sinkDepth:500}};
// Preserve historical model envelopes, including dimension-derived bounds.
const envelopes={acwall:()=>[2170,2510],waterheater:f=>[1300,1950+Math.min(f.d/2,230)],tv:f=>[1200-f.w*.5625/2,1200+f.w*.5625/2],wallart:f=>[1280,1280+Math.min(950,Math.max(500,f.w*.45))],mirror:()=>[50,1700],pendant:()=>[2100,2627],baycushion:()=>[450,900],stove:()=>[862,2330],ksink:()=>[850,1182],vanity:()=>[330,1960]};
for(const [type,envelope] of Object.entries(envelopes))types[type]={...types[type],envelope};
// Historical vanity body/installation, separate from its basin, faucet and mirror envelope.
types.vanity.cabinet={bodyHeight:450,bottom:330,aboveBody:1180,min:200,max:3200};
// Historical combined envelopes retained; internal boards use project model defaults.
types.counter.legacyStructure={kind:'kitchen',board:18,lowerHeight:820,plinth:100,top:40,upperBottom:1480,upperHeight:700,upperDepth:330,bayWidth:600,backThickness:10};
types.vanity.legacyStructure={kind:'vanity',board:18,bodyHeight:450,bottom:330,depthInset:40};
const legacyCabinet=f=>!f?.obj&&!f?.kitchen&&!f?.cabinet?definition(f)?.legacyStructure:null;
function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
freeze(fields);freeze(types);
const definition=f=>Object.hasOwn(types,typeof f==='string'?f:f?.type)?types[typeof f==='string'?f:f.type]:null;
// Local mm outline; custom models retain the rectangular fallback.
// Curvature is a visual estimate, never an installation requirement.
function planBodyOutline(f,segments){
 const shape=!f.obj&&definition(f)?.planShape;if(!shape)return null;
 const count=segments||shape.segments,signed=v=>Math.abs(v)<1e-12?0:Math.sign(v)*Math.pow(Math.abs(v),shape.exponent);
 return Array.from({length:count},(_,i)=>{const t=i*2*Math.PI/count;return [f.w/2*signed(Math.sin(t)),f.d/2*signed(Math.cos(t))];});
}
function planOutline(f,segments){
 const points=planBodyOutline(f,segments);if(!points)return null;
 const rear=definition(f).planShape.rear;if(!rear)return points;
 const x=rear.width/2*f.w/rear.referenceWidth,z=rear.z*f.d/rear.referenceDepth;
 // Convex hull includes the projecting rear filter; no recessed void is claimed.
 const shape=definition(f).planShape,label=shape.label,labelZ=(shape.bodyDepth/2*Math.pow(1-Math.pow(Math.abs(label.x/(shape.bodyWidth/2)),2/shape.exponent),shape.exponent/2)+label.offset+.5)*f.d/rear.referenceDepth;
 const labels=[-1,1].map(sign=>[(label.x+sign*label.width/2)*f.w/rear.referenceWidth,labelZ]);
 const sorted=[...points,[-x,z],[x,z],...labels].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const half=pts=>{const out=[];for(const p of pts){while(out.length>1&&cross(out[out.length-2],out[out.length-1],p)<=0)out.pop();out.push(p);}out.pop();return out;};
 return [...half(sorted),...half([...sorted].reverse())];
}

const supports=(f,key)=>key==='groupId'||definition(f)?.fields?.includes(key)||false;
const family=(f,name)=>definition(f)?.family===name;
const value=(f,key)=>f[key]??definition(f)?.defaults?.[key];
const height=f=>f.h??definition(f)?.height;
const cabinetSpec=f=>definition(f)?.cabinet;
const cabinetBase=f=>f.type==='kitchenwall'?value(f,'mountHeight'):cabinetSpec(f)?.bottom??0;
function validateField(f,key,v){
 const rule=fields[key];if(!rule||!supports(f,key))throw Error(rule?.message||'不支持的产品参数：'+key);
 if(key==='sinkNotch'){const r=definition(f).notch;if(f.obj||!v||Object.keys(v).some(k=>!['side','width','depth'].includes(k))||!['left','right'].includes(v.side)||![v.width,v.depth].every(Number.isFinite)||v.width<r.min||v.depth<r.min||v.width>f.w-r.margin||v.depth>f.d-r.margin)throw Error('水槽后角缺口宽深至少 20 mm，剩余宽深至少 80 mm');return v;}
 if(key==='hobCutout'){
  const limits=definition(f).hobCutout;
  if(f.obj)throw Error('自定义模型不支持灶具开孔参数');
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['w','d'].includes(k))||Object.values(v).some(n=>typeof n!=='number'||!Number.isFinite(n)||n<limits.min||n>limits.max))throw Error(`开孔宽／深须为 ${limits.min}–${limits.max} mm`);
  const size=hobCutout({...f,hobCutout:v});if(size.w>f.w||size.d>f.d)throw Error('开孔宽／深不能超过灶具面板宽／深');return v;
 }
 if(key==='hoodGeometry'){
  const limits=definition(f).hoodGeometry,keys=['bodyHeight','coverWidth','coverDepth'];
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k))||Object.values(v).some(n=>typeof n!=='number'||!Number.isFinite(n)||n<limits.min||n>limits.max))throw Error('烟机分段尺寸须为 10–20000 mm');
  const spec=hoodInstallation({...f,hoodGeometry:v});
  if(spec.bodyHeight>=height(f)||spec.coverWidth>f.w||spec.coverDepth>f.d)throw Error('主机高度须小于总高，装饰罩宽／深不能超过整机宽／深');return v;
 }
 if(key==='kitchen'){kitchen().validate({...f,kitchen:v});return v;}if(key==='counterLink'){kitchen().validateLink({...f,counterLink:v});return v;}
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 const valid=rule.point?v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>['x','y','z'].includes(k))&&[v.x,v.y,v.z].every(finite)&&Math.abs(v.x)<=1e6&&Math.abs(v.y)<=1e6&&v.z>=0&&v.z<=20000
  :rule.string?typeof v==='string'&&!!v.trim()&&v.length<=rule.max:rule.boolean?typeof v==='boolean':rule.values?rule.values.includes(v):finite(v)&&v>=rule.min&&v<=rule.max;
 if(!valid)throw Error(rule.message);if(['pipeBoxThickness','pipeBoxShape','pipeBoxOpenSide','pipeBoxCorner'].includes(key))pipeBoxPanels({...f,[key]:v});return v;
}
function validate(f){for(const key of Object.keys(fields))if(f[key]!==undefined)validateField(f,key,f[key]);if(family(f,'pipe-box')&&!f.obj)pipeBoxPanels(f);if(vesselSink(f)&&(![f.w,f.d].every(v=>Number.isFinite(v)&&v>=definition(f).vessel.minSize)))throw Error('台上盆宽深至少 80 mm');return f;}
const vesselSink=f=>f?.type==='ksink'&&!f.obj&&value(f,'sinkStyle')==='vessel';
// Report broken model records without migrating, deleting or rewriting them.
function modelError(f){try{validate(f);if(f.cabinet)(root.FurnishCabinet||require('./cabinet-core.js')).validate(f);return null;}catch(e){return e.message||String(e);}}
function initial(f){const result={};for(const key of definition(f)?.create||[]){if(key==='kitchen'&&f.type==='kitchenwall'&&(!Number.isFinite(f.w)||!Number.isFinite(f.d)))continue;result[key]=key==='kitchen'?kitchen().defaults(f):value(f,key);}return {...result,...definition(f)?.identity};}
// Static vertical boards; top/bottom stay open. Missing shape retains the legacy U. All values are mm.
// Tea bar door geometry, shared by production, plan symbols and opening checks.
function teaBarDoors(f){
 const r=definition(f)?.teaBar;if(!r||f.obj)return [];
 const sx=f.w/r.width,sz=f.d/r.depth,sy=height(f)/r.height;
 return r.doors.map(door=>{
  const polygon=degrees=>{const a=degrees*Math.PI/180;return [[-r.width/2-r.hingeX,-r.thickness/2],[r.width/2-r.hingeX,-r.thickness/2],[r.width/2-r.hingeX,r.thickness/2],[-r.width/2-r.hingeX,r.thickness/2]].map(([x,z])=>[(r.hingeX+x*Math.cos(a)-z*Math.sin(a))*sx,(r.front+x*Math.sin(a)+z*Math.cos(a))*sz]);};
  return {...door,bottom:door.bottom*sy,top:door.top*sy,open:!!value(f,door.key),poly:polygon(value(f,door.key)?r.angle:0),polygon};
 });
}
function teaBarOpeningZones(f){
 const r=definition(f)?.teaBar;if(!r||f.obj)return [];
 const hull=points=>{const sorted=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=ps=>{const out=[];for(const p of ps){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};return [...half(sorted).slice(0,-1),...half(sorted.slice().reverse()).slice(0,-1)];};
 const a=(f.rot||0)*Math.PI/180,co=Math.cos(a),si=Math.sin(a),transform=([x,y])=>{x*=f.flip?-1:1;return [(f.cx||0)+x*co-y*si,(f.cy||0)+x*si+y*co];};
 return teaBarDoors(f).map((d,column)=>({kind:'cabinetdoor',column,section:d.section,poly:hull(Array.from({length:51},(_,i)=>d.polygon(r.angle*i/50)).flat()).map(transform),ranges:[[d.bottom,d.top]]}));
}
function pipeBoxSignature(f){
 if(!family(f,'pipe-box')||f.obj)return null;
 const shape=value(f,'pipeBoxShape');return [shape,shape==='three'?value(f,'pipeBoxOpenSide'):shape==='two'?value(f,'pipeBoxCorner'):null];
}
function pipeBoxSides(f){
 if(!family(f,'pipe-box')||f.obj)return null;
 const [shape,direction]=pipeBoxSignature(f),sides=['left','right','front','back'];
 if(!fields.pipeBoxShape.values.includes(shape))throw Error(fields.pipeBoxShape.message);
 if(shape==='four')return sides;
 const key=shape==='three'?'pipeBoxOpenSide':'pipeBoxCorner';
 if(!fields[key].values.includes(direction))throw Error(fields[key].message);
 return sides.filter(side=>shape==='three'?side!==direction:direction.split('-').includes(side));
}
function pipeBoxPanels(f){
 if(!family(f,'pipe-box')||f.obj)return null;
 const w=f.w,d=f.d,h=height(f),t=value(f,'pipeBoxThickness'),bottom=value(f,'mountHeight'),sides=pipeBoxSides(f),rule=fields.pipeBoxThickness;
 if(f.cabinet||f.kitchen)throw Error('包管柜不支持内部柜体结构');
 if(![w,d,h,t,bottom].every(Number.isFinite)||w<50||d<50||h<10||Math.max(w,d,h)>20000||t<rule.min||t>rule.max||bottom<0||bottom>fields.mountHeight.max)throw Error('包管柜尺寸或离地高度无效');
 const has=side=>sides.includes(side),widthBoards=Number(has('left'))+Number(has('right')),depthBoards=Number(has('front'))+Number(has('back'));
 if(widthBoards*t>=w||depthBoards*t>=d)throw Error(`包管柜外宽须大于${widthBoards===2?'两倍':''}板厚，外深须大于${depthBoards===2?'两倍':''}板厚`);
 return sides.map(key=>key==='left'||key==='right'?{key,w:t,d:d-depthBoards*t,h,x:(key==='left'?-1:1)*(w-t)/2,z:(Number(has('back'))-Number(has('front')))*t/2,bottom}:{key,w,d:t,h,x:0,z:(key==='front'?1:-1)*(d-t)/2,bottom});
}
// Missing overrides retain the historical opening; explicit values are absolute mm.
function hobCutout(f){const spec=definition(f)?.hobCutout;if(!spec||f.obj)return null;return {w:f.hobCutout?.w??(spec.widthRatio===undefined?f.w-spec.inset:f.w*spec.widthRatio),d:f.hobCutout?.d??(spec.depthRatio===undefined?f.d-spec.inset:f.d*spec.depthRatio)};}
function editHobCutout(f,key,n){if(f.locked)throw Error('家具已锁定，请先解锁');const next={...f,hobCutout:{...f.hobCutout,[key]:n}};validateField(next,'hobCutout',next.hobCutout);return next;}
// w/d describe the current horizontal bounding box. Missing pose reads round,
// without migrating old instances. Keep the physical frame fixed when folding.
function foldingTableGeometry(f){
 const spec=definition(f)?.folding;if(!spec||f.obj)return null;
 const pose=value(f,'foldingTablePose'),ratio=pose==='capsule'?spec.closedDepth/spec.diameter:pose==='single'?spec.singleDepth/spec.diameter:1;
 const fullDepth=f.d/ratio,cut=fullDepth*(spec.singleDepth/spec.diameter-.5),backCut=fullDepth*(spec.closedDepth/spec.diameter)-cut;
 const offset=pose==='single'?(fullDepth-f.d)/2:pose==='capsule'?(backCut-cut)/2:0;
 return {...spec,pose,fullDepth,cut,backCut,offset,ratio};
}
function editFoldingTablePose(f,pose){
 if(pose===undefined){const poses=fields.foldingTablePose.values;pose=poses[(poses.indexOf(value(f,'foldingTablePose'))+1)%poses.length];}
 if(f.locked)throw Error('家具已锁定，请先解锁');validateField(f,'foldingTablePose',pose);
 const old=foldingTableGeometry(f);if(!old)throw Error('当前模型不支持折叠桌形态');
 const spec=definition(f).folding,ratio=pose==='capsule'?spec.closedDepth/spec.diameter:pose==='single'?spec.singleDepth/spec.diameter:1;
 const depth=old.fullDepth*ratio,next={...f,foldingTablePose:pose,d:Math.abs(depth-Math.round(depth*1e6)/1e6)<1e-8?Math.round(depth*1e6)/1e6:depth},geom=foldingTableGeometry(next),delta=old.offset-geom.offset,a=(f.rot||0)*Math.PI/180;
 if(next.d<50||next.d>20000)throw Error('切换后的深度须为 50–20000 mm');
 next.cx=f.cx-Math.sin(a)*delta;next.cy=f.cy+Math.cos(a)*delta;return next;
}
// Shared sampled circle segments for the production slabs and SVG outline.
function foldingTableOutline(f,region='visible'){
 const s=foldingTableGeometry(f);if(!s)return null;
 const low=region==='front'?s.cut:region==='back'?-s.fullDepth/2:region==='center'||s.pose==='capsule'?-s.backCut:-s.fullDepth/2;
 const high=region==='back'?-s.backCut:region==='front'?s.fullDepth/2:region==='center'||s.pose!=='round'?s.cut:s.fullDepth/2;
 const angle=v=>Math.asin(Math.max(-1,Math.min(1,2*v/s.fullDepth))),a=angle(low),b=angle(high),points=[];
 const n=Math.max(8,Math.ceil((b-a)*48/Math.PI));
 const angles=Array.from({length:n+1},(_,i)=>a+(b-a)*i/n);if(a<0&&b>0)angles.push(0);angles.sort((x,y)=>x-y);
 for(const t of angles)points.push([f.w/2*Math.cos(t),s.fullDepth/2*Math.sin(t)+s.offset]);
 for(const t of [...angles].reverse())points.push([-f.w/2*Math.cos(t),s.fullDepth/2*Math.sin(t)+s.offset]);return points;
}
// Full opening reservation is independent of the current display pose. Only the
// layout envelope scales; the reference installation distances remain absolute mm.
function dishwasherInstallation(f){
 const def=definition(f);if(!def?.foldDoor||f.obj)return null;const spec=def.foldDoor,bottom=value(f,'mountHeight'),h=height(f),extension=f.d*(spec.openDepth-spec.nominalDepth)/spec.nominalDepth;
 return {...def.installation,bottom,top:bottom+h,extension,openDepth:f.d+extension,openingBottom:bottom+h*spec.openingBottom/spec.nominalHeight,openingTop:bottom+h*spec.openingTop/spec.nominalHeight,nominal:Math.abs(f.w-spec.nominalWidth)<1e-6&&Math.abs(f.d-spec.nominalDepth)<1e-6&&Math.abs(h-spec.nominalHeight)<1e-6};
}
// Legacy bottom datum is read, never filled into saved records implicitly.
function showerInstallation(f){const nominal=types.shower_arrow_cream.height,offset=646.889539615265*(f.h??nominal)/nominal,mixer=f.showerMixerHeight??(f.mountHeight!==undefined?f.mountHeight+offset:types.shower_arrow_cream.defaults.showerMixerHeight),bottom=mixer-offset;return {mixer,bottom,top:bottom+(f.h??nominal)*(1+(value(f,'showerRise')-types.shower_arrow_cream.defaults.showerRise)/nominal)};}
// Matches the production JCD10TA chimney; these are model dimensions, not installation clearances.
function hoodInstallation(f){if(f.type!=='rangehood_fotile_jcd10ta'||f.obj)return null;const h=height(f),bodyHeight=f.hoodGeometry?.bodyHeight??h*345/520,coverDepth=f.hoodGeometry?.coverDepth??f.d*310/350;return {bodyHeight,coverHeight:h-bodyHeight,coverWidth:f.hoodGeometry?.coverWidth??f.w*480/900,coverDepth,coverOffset:(coverDepth-f.d)/2};}
function editHoodGeometry(f,key,n){
 if(f.locked)throw Error('家具已锁定，请先解锁');
 const next={...f,hoodGeometry:{...f.hoodGeometry,[key]:n}};validateField(next,'hoodGeometry',next.hoodGeometry);return next;
}
// Outer resizing retains each section's proportion; individual section edits use absolute mm.
function resizeHoodGeometry(f,next){
 if(f.hoodGeometry){next.hoodGeometry={...f.hoodGeometry};for(const [key,axis] of [['bodyHeight','h'],['coverWidth','w'],['coverDepth','d']])if(f.hoodGeometry[key]!==undefined)next.hoodGeometry[key]*=(axis==='h'?height(next)/height(f):next[axis]/f[axis]);validateField(next,'hoodGeometry',next.hoodGeometry);}return next;
}
function migrate(f){const next={...f};if(family(f,'arrow-shower')){next.showerMixerHeight=showerInstallation(f).mixer;delete next.mountHeight;}return next;}
function sinkInstallation(f,host){const spec=definition(f).sink,thickness=host?.kitchen?.thickness??40,surface=host?.kitchen?host.kitchen.baseHeight+thickness:860,upper=host?surface+(value(f,'sinkInstall')==='under'?-thickness:value(f,'sinkInstall')==='top'?spec.rimThickness:0):value(f,'counterElevation');return {upper,bottom:upper-height(f),top:upper+spec.faucetRise*Math.min(f.d/spec.nominalDepth,Math.max(0,f.w-40)/spec.nominalInnerWidth)};}
// Furniture dimensions stay relative to the selected datum. Architectural
// elevations (ceilings, openings, beams and fixed sockets) remain absolute.
const furnitureDatum=Object.freeze({default:'finished-floor',legacy:'survey',values:Object.freeze(['survey','finished-floor'])});
function floorBase(plan,f,furniture=plan?.furniture||[],trail=new Set()){
 if(plan?.furnitureDatum!==furnitureDatum.default)return {z:0,known:true};
 if(trail.has(f.id))return {z:0,known:false};trail=new Set(trail);trail.add(f.id);
 const hostId=f.counterLink?.hostId||f.laundryHostId,host=hostId&&furniture.find(v=>v.id===hostId);
 if(host)return floorBase(plan,host,furniture,trail);
 const F=root.FurnishFloorFinish||require('./floor-finish-core.js');
 let candidates=F.at(plan,[f.cx,f.cy]);
 if(!candidates.length){
  const G=root.FurnishGeometry||require('./layout-geometry.js'),Z=root.FurnishZoneGeometry||require('./zone-geometry.js'),footprints=G.footprints(f);
  candidates=(plan.rooms||[]).filter(r=>r.counted!==false).map(room=>{const polys=room.polys||[room.poly],overlap=Z.area(Z.decompose([...polys,...footprints],p=>polys.some(q=>Z.inside(p,q))&&footprints.some(q=>Z.inside(p,q))));return {room,overlap,...(plan.floorFinish?.areas[room.id]||{id:room.id,finishedZ:0})};}).filter(a=>a.overlap>1e-6).sort((a,b)=>b.overlap-a.overlap);
  // A bay platform is architectural. Furniture in it shares the adjoining
  // room's floor datum, without moving the measured platform or window sill.
  if(!candidates.length){const bay=(plan.rooms||[]).find(r=>r.counted===false&&Z.inside([f.cx,f.cy],r.poly));if(bay)for(let i=0;i<bay.poly.length&&!candidates.length;i++){const a=bay.poly[i],b=bay.poly[(i+1)%bay.poly.length],mid=a.map((v,j)=>(v+b[j])/2);candidates=[[.1,0],[-.1,0],[0,.1],[0,-.1]].flatMap(d=>F.at(plan,mid.map((v,j)=>v+d[j])));}}
 }
 const area=candidates[0];return area?{z:Number.isFinite(area.finishedZ)?area.finishedZ:0,known:Number.isFinite(area.finishedZ),roomId:area.roomId||area.id}:{z:0,known:false};
}
// Floor-use area counts the whole standing envelope, including legs/plinths;
// textiles and hosted appliances do not reserve a second ground footprint.
function floorStanding(f,range){
 if(['rug','curtain'].includes(f.type)||definition(f)?.embedded||f.counterLink?.hostId||f.laundryHostId)return false;
 if(!range)return null;
 return range.bottom<=1e-6&&range.top>1e-6;
}
function validateDatum(work){if(work?.furnitureDatum!==undefined&&!furnitureDatum.values.includes(work.furnitureDatum))throw Error('家具高度基准须为毛坯或完成地面');}
function vertical(f){
 if(vesselSink(f)){const base=f.counterElevation??862;return {bottom:base,top:base+Math.max(value(f,'sinkBowlHeight')+definition(f).vessel.faucetClearance,definition(f).vessel.faucetRise),source:'model'};}
 if(f.type==='ksink'&&f.sinkNotch){const base=f.counterElevation??862,r=definition(f).notch;return {bottom:base-r.bodyDepth,top:base+r.faucetRise,source:'model'};}
 if(family(f,'arrow-sink')){const {bottom,top}=sinkInstallation(f);return {bottom,top,source:'model'};}
 if(f.kitchen){const bottom=f.type==='kitchenwall'?value(f,'mountHeight'):0;return {bottom,top:f.kitchen.laundry?.assembly?kitchen().laundryHeight(f):bottom+f.kitchen.baseHeight+((f.kitchen.laundry?.countertop===false)?0:f.kitchen.thickness),source:'recorded'};}
 if(legacyCabinet(f)?.kind==='kitchen'){const s=legacyCabinet(f);return {bottom:0,top:s.upperBottom+s.upperHeight,source:'model'};}
 if(f.type==='vanity'&&f.cabinet){const spec=cabinetSpec(f);return {bottom:spec.bottom,top:spec.bottom+(f.cabinet.bodyHeight??spec.bodyHeight)+spec.aboveBody,source:'recorded'};}
 if(f.type==='stove_fotile_th36b'){const h=height(f),base=value(f,'counterElevation');return {bottom:base-80*h/138,top:base+58*h/138,source:'model'};}
 if(['stove','ksink'].includes(f.type)&&f.counterElevation!==undefined)return {bottom:f.counterElevation-(f.type==='ksink'?200:0),top:f.counterElevation+(f.type==='ksink'?320:40),source:'model'};
 const def=definition(f);if(def?.teaTable&&!f.obj)return {bottom:0,top:height(f)*def.teaTable.accessoryTop/def.teaTable.cabinetHeight,source:'model'};if(def?.envelope){const [bottom,top]=def.envelope(f);return {bottom,top:f.h===undefined?top:bottom+f.h,source:f.h===undefined?'model':'recorded'};}
 if(!def?.anchor)return null;if(def.anchor==='mixer'){const {bottom,top}=showerInstallation(f);return {bottom,top,source:'model'};}
 const bottom=value(f,'mountHeight');return {bottom,top:bottom+height(f),source:f.h===undefined||f.type==='tripleslidingwindow'?'model':'recorded'};
}
function retainReplacementField(previous,next,key){return key==='groupId'||supports(next,key)&&supports(previous,key)&&(key==='floorTrack'||previous.type===next.type||family(previous,'laundry')&&family(next,'laundry'));}
// Remove incompatible parameters before checking the replacement's outer size.
function customSinkCandidate(next,candidate){
 if(next.type!=='ksink')return;
 for(const key of ['sinkStyle','sinkBowlHeight'])if(candidate[key]!==undefined)next[key]=validateField(next,key,candidate[key]);
 if(vesselSink(next))delete next.sinkNotch;
}
function replacementResizeSource(previous,candidate){const next={...previous};for(const key of Object.keys(fields))if(!retainReplacementField(previous,candidate,key))delete next[key];if(previous.type===candidate.type)customSinkCandidate(next,candidate);return next;}
function replacement(previous,next,candidate){
 if(previous.type==='vanity'){if(!candidate.cabinet)delete next.cabinet;if(candidate.h!==undefined)next.h=candidate.h;}
 for(const key of Object.keys(fields)){
  if(key==='groupId')continue; // Layout membership survives product replacement.
  // Family permits washer↔dryer and track styles; installation belongs to the
  // specific product except for the laundry family. Socket is a world point.
  const retain=retainReplacementField(previous,next,key);
  if(!retain)delete next[key];
 }
 if(family(next,'floor-aircon')||family(next,'tea-bar')||family(next,'placeholder')||family(next,'under-sink-purifier')||family(next,'pipe-box')||family(next,'folding-table')||family(next,'arrow-sink')||['stove_fotile_th36b','rangehood_fotile_jcd10ta','aquarium_mijia_2pro','dishwasher_mijia_countertop'].includes(next.type)){for(const [key,v] of Object.entries(initial(next)))if(next[key]===undefined||key==='brand'||key==='model'||key==='sourceUrl'&&!next[key])next[key]=v;}
 if(family(next,'folding-table')&&previous.type===next.type){const full=foldingTableGeometry({...candidate,foldingTablePose:candidate.foldingTablePose??'round'}).fullDepth;next.d=full*foldingTableGeometry(next).ratio;}
 if(supports(next,'curtainStyle'))next.curtainStyle=candidate.curtainStyle??value({type:next.type},'curtainStyle');
 if(next.type==='ksink'){customSinkCandidate(next,candidate);validate(next);}
 if(family(next,'arrow-shower')){delete next.mountHeight;next.showerMixerHeight=previous.type===next.type?showerInstallation(previous).mixer:value({type:next.type},'showerMixerHeight');for(const [key,v] of Object.entries(definition(next).identity))next[key]=candidate[key]||v;}
 if(next.type==='tripleslidingwindow')next.mountHeight=previous.type===next.type?value(previous,'mountHeight'):value({type:next.type},'mountHeight');
 if(next.type==='kitchenwall')next.mountHeight=previous.type===next.type?value(previous,'mountHeight'):value({type:next.type},'mountHeight');
 if(family(next,'pipe-box'))validate(next);return next;
}
// Derived geometry capability; no field is added to saved furniture instances.
function serviceCut(f){const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);return !f.obj&&(C.supported(f)||['counter','vanity'].includes(f.type));}
// Ceiling defaults describe design examples, not manufacturer requirements.
const ceiling={min:.1,epsilon:1e-6,max:20000,maxVertices:128,maxItems:200,snapPixels:12,flatThickness:12,
 corner:{maxLegs:2,angle:90,lightSetback:0,lightRadius:8,compactInnerRadius:1,arcChordError:.05,arcMaxAngle:3,arcMaxSegments:1024},
 endCap:{thickness:12,lightGap:5},
 lowCove:{drop:300,projection:70,back:20,bottom:10,front:10,lip:30},light:{u:40,d:290,angle:-90,width:10,thickness:2}};
const api={legacyCabinet,planBodyOutline,planOutline,floorStanding,teaBarDoors,teaBarOpeningZones,vesselSink,ceiling,types,fields,definition,supports,family,value,height,cabinetSpec,cabinetBase,validateField,validate,modelError,initial,migrate,pipeBoxSignature,pipeBoxSides,pipeBoxPanels,hobCutout,editHobCutout,foldingTableGeometry,foldingTableOutline,editFoldingTablePose,dishwasherInstallation,sinkInstallation,showerInstallation,hoodInstallation,editHoodGeometry,resizeHoodGeometry,furnitureDatum,floorBase,validateDatum,vertical,replacementResizeSource,replacement,serviceCut};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishProducts=api;
})(typeof globalThis!=='undefined'?globalThis:this);
