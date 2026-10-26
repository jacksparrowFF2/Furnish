/* Product capabilities shared by browser/Node. No DOM, storage or geometry engine. */
(function(root){
'use strict';
const numeric=(min,max,message)=>({min,max,message});
const pegboardAssembly={parts:['upper','left','right','lower','displayShelves','hooks','light'],accessoryParts:['displayShelves','hooks','light'],legacyParts:['accessories'],structureParts:['upper','left','right','lower'],thickness:18,hatch:{modes:['manual','auto'],maxPanels:16,minWeb:20,margin:20,min:50,gap:2,angle:100,defaultWidth:400,defaultHeight:300,fitPadding:10,padding:{sides:['top','bottom','left','right'],min:0,max:100},maxRearGap:500,alignmentDegrees:1},holes:{diameter:9,minDiameter:2,maxDiameter:30,margin:30,pitch:40,maxCount:3000,maxAxis:200,minWeb:2},bottom:{min:0,max:20000}};
const kitchen=()=>root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);
const fields={
 downlightWatts:{values:[5,7],message:"筒灯功率须为5W或7W"},
 downlightKelvin:{values:[3000,4000,6500],message:"筒灯色温须为3000K、4000K或6500K"},
 manifoldLengths:{custom:true,message:'上下排主管长度须分别为 55–10000 mm'},
 manifoldLoops:{...numeric(1,12,'分水器路数须为 1–12 的整数'),integer:true},
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
 sinkBowlHeight:numeric(50,400,'盆体高度／深度须为 50–400 mm'),
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
 slidingTrackOrder:{values:['leading-front','leading-back'],message:'活动扇所在侧须为靠正面或靠背面'},
 heaterSocket:{point:true,message:'热水器插座须有有效 X、Y 和 0–20000 mm 离地高度'}
};
const laundry={family:'laundry',height:850,anchor:'bottom',defaults:{mountHeight:0,stackHeight:20},fields:['mountHeight','stackHeight','laundryHostId'],create:['mountHeight']};
const surfaceMeasurement={wallContactTolerance:5};
const linkedSurfaceOffset={max:20000}; // Local module axes, mm; missing offsets retain centred placement.
const arrowSink={embedded:true,measureSurfaceBoundary:true,surfaceMeasurement,linkedSurfaceOffset,family:'arrow-sink',height:240,sink:{rimThickness:.8,nominalDepth:450,faucetRise:360,nominalInnerWidth:640},defaults:{counterElevation:860,sinkInstall:'top'},fields:['counterLink','counterElevation','sinkInstall'],create:['counterElevation','sinkInstall']};
const doorPairing={values:['end','start'],default:'end',singleHinge:{values:['left','right'],default:'left'},layout:{values:['left','right','pair','paired'],maxLeaves:24}};
// Editable leaf widths are model dimensions, not hardware installation limits.
const doorWidths={minWidth:50,maxLeaves:24,gap:2};
const hobCutoutLimits={min:1,max:20000,moduleMargin:20};
const foldingTable={solidModel:{global:'FurnishFoldingTableModel',module:'folding-table'},family:'folding-table',height:760,defaults:{foldingTablePose:'round'},fields:['foldingTablePose'],create:['foldingTablePose'],identity:{brand:'源氏木语/YESWOOD',model:'白蜡木原木色 · 象牙白岩板折叠餐桌',sourceUrl:'https://item.jd.com/10195288580856.html'}};
const electricalBox={family:'electrical-box',wallRecess:true,height:400,anchor:'bottom',defaults:{mountHeight:1200},fields:['mountHeight'],create:['mountHeight']};
const types={
 downlight_philips_dl269:{family:"downlight",clearanceReview:"missing",height:45,anchor:"bottom",defaults:{mountHeight:2500,downlightWatts:5,downlightKelvin:4000},fields:["mountHeight","downlightWatts","downlightKelvin"],create:["mountHeight","downlightWatts","downlightKelvin"],planShape:{exponent:1,segments:64},downlight:{diameter:85,rim:2,cutout:76.5,cutoutMin:75,cutoutMax:78,lumens:380,kelvin:4000,watts:5,beam:100,flux:{5:{3000:360,4000:380,6500:380},7:{3000:480,4000:500,6500:500}},colors:{3000:"#ffb16e",4000:"#ffd1a3",6500:"#fffafe"}},identity:{brand:"飞利浦/PHILIPS",model:"品焕 DL269"}},
 heating_manifold:{wallFinishOpening:'rectangle',rearService:true,solidModel:{global:'FurnishManifoldModel',module:'manifold'},family:'heating-manifold',height:600,anchor:'bottom',defaults:{mountHeight:0,manifoldLoops:5},fields:['mountHeight','manifoldLoops','manifoldLengths'],create:['mountHeight','manifoldLoops','manifoldLengths'],manifold:{width:800,depth:180,pitch:50,endWidth:150,minLeft:100,minRun:55,maxLeft:10000,minHeight:400,minDepth:80}},
 electrical_box_strong:{...electricalBox},electrical_box_weak:{...electricalBox},
 bench_yeswood_oak:{solidModel:{global:'FurnishShoeBenchModel',module:'shoe-bench'},family:'shoe-bench',height:450,envelope:()=>[0,450],identity:{brand:'源氏木语/YESWOOD',model:'橡木软包换鞋凳 · 80cm'}},
 coffeetable_yeswood_cherry:{solidModel:{global:'FurnishCherryCoffeeTableModel',module:'cherry-coffee-table'},family:'coffee-table',height:450,envelope:()=>[0,450],identity:{brand:'源氏木语/YESWOOD',model:'樱桃木茶几 · 1.2米白色岩板面'}},
 aircon_midea_ultra_2hp:{family:'floor-aircon',height:1856,envelope:()=>[0,1856],planShape:{kind:'superellipse',exponent:.7,segments:96,bodyWidth:383,bodyDepth:424,label:{x:-135,width:16,offset:3},rear:{width:220,z:-213.5,referenceWidth:395,referenceDepth:436},version:1},clearanceReview:'missing',identity:{brand:'美的/Midea',model:'KFR-51LW/N8KS1-1U'}},
 tea_table_800:{solidModel:{global:'FurnishTeaTableModel',module:'tea-table'},family:'tea-table',height:720,teaTable:{cabinetHeight:720,accessoryTop:897},envelope:()=>[0,720]},
 tea_bar_mijia_pro:{solidModel:{global:'FurnishTeaBarModel',module:'tea-bar'},family:'tea-bar',height:1155,envelope:()=>[0,1155],defaults:{teaBarUpperOpen:false,teaBarLowerOpen:false},fields:['teaBarUpperOpen','teaBarLowerOpen'],create:['teaBarUpperOpen','teaBarLowerOpen'],teaBar:{width:315,depth:310,height:1155,hingeX:-147.5,front:146,thickness:14,angle:100,bottle:{diameter:270,height:500,neckDiameter:55,neckHeight:80,bottom:36,z:0,capHeight:14,adapterHeight:22},doors:[{section:'upper',key:'teaBarUpperOpen',bottom:601.5,top:809},{section:'lower',key:'teaBarLowerOpen',bottom:17,top:600}]},identity:{brand:'米家/Mijia',model:'智能茶吧机 Pro 立式'}},
 pet_feeder_mijia_2:{solidModel:{global:'FurnishPetFeederModel',module:'pet-feeder'},family:'pet-feeder',height:370,envelope:()=>[0,370],identity:{brand:'米家/Mijia',model:'智能宠物喂食器 2'}},
 cat_tree:{solidModel:{global:'FurnishCatTreeModel',module:'cat-tree'},family:'pet-cat-tree',height:1430,envelope:()=>[0,1430]},
 litter_box:{family:'pet-litter-box',height:400,envelope:()=>[0,400]},
 block:{family:'placeholder',height:1000,anchor:'bottom',defaults:{mountHeight:0},fields:['mountHeight'],create:['mountHeight']},
 pipebox:{family:'pipe-box',height:2400,anchor:'bottom',defaults:{mountHeight:0,pipeBoxThickness:18,pipeBoxShape:'three',pipeBoxOpenSide:'back',pipeBoxCorner:'front-left'},fields:['mountHeight','pipeBoxThickness','pipeBoxShape','pipeBoxOpenSide','pipeBoxCorner'],create:['mountHeight','pipeBoxThickness','pipeBoxShape']},
 table_folding_1100:{...foldingTable,folding:{diameter:1100,closedDepth:740,singleDepth:920,top:32,leg:75,apron:120}},
 table_folding_1200:{...foldingTable,folding:{diameter:1200,closedDepth:793,singleDepth:996.5,top:32,leg:75,apron:120}},
 table_folding_1300:{...foldingTable,folding:{diameter:1305,closedDepth:848,singleDepth:1075,top:32,leg:75,apron:120}},
 sink_arrow_680:{...arrowSink,identity:{brand:'ARROW/箭牌',model:'AE5568459G23-YNC',sourceUrl:'https://item.jd.com/100199201484.html'}},
 sink_arrow_750:{...arrowSink,identity:{brand:'ARROW/箭牌',model:'AE5575459G23-YNC',sourceUrl:'https://item.jd.com/100199201484.html'}},
 counter:{family:'kitchen',kitchenPlinth:{default:100,min:0,max:250},moduleDividers:true,drawerTiers:{boundaryResize:true,snapPixels:8,defaultCount:3,minCount:1,maxCount:10,minHeight:96,plinth:100,board:18,legacyOffset:150,legacyMin:60,styles:{standard:{label:'普通抽屉'},'dish-basket':{label:'碗碟篮（两外抽、三层）',minHeights:[300,220,100],hiddenTier:2,outerTier:1}}},kitchenDepth:{min:50,max:1200,drawerMin:72,emptyMinWidth:50},kitchenShapes:{straight:{runs:[0],ends:[0]},L:{runs:[0,1],ends:[0,1]},U:{runs:[0,1,2],ends:[0,2],independentResize:true,outerResize:true,runDepth:{min:50,max:1200}}},endResize:{fields:['length','cabinetDepth'],minLength:150,maxLength:3000,minDepth:50,maxDepth:1200},cornerPartitions:{sides:['left','right'],retained:false,roleDefaults:{drawer:true}},avoidance:{enabled:false,minDepth:150},fields:['kitchen'],create:['kitchen']},
 kitchenwall:{height:700,anchor:'bottom',defaults:{mountHeight:1480},hoodBay:{ceilingDefault:true,minSideGap:0},moduleDividers:true,moduleMaxWidth:6000,drawerTiers:{boundaryResize:true,snapPixels:8,defaultCount:3,minCount:1,maxCount:10,minHeight:96,plinth:0,board:18,legacyOffset:50,legacyMin:60},kitchenShapes:{straight:{runs:[0],ends:[0]},L:{runs:[0,1],ends:[0,1]},U:{runs:[0,1,2],ends:[0,2],independentResize:true,outerResize:true,runDepth:{min:50,max:1200}}},fields:['mountHeight','kitchen'],create:['mountHeight','kitchen']},
 stove_fotile_th36b:{embedded:true,measureSurfaceBoundary:true,surfaceMeasurement,hobCutout:{...hobCutoutLimits,widthRatio:660/750,depthRatio:350/440},height:138,defaults:{counterElevation:860},fields:['counterLink','counterElevation','hobCutout'],create:['counterElevation'],identity:{brand:'方太/FOTILE',model:'TH36B-T'}},
 rangehood_fotile_jcd10ta:{height:520,anchor:'bottom',hoodGeometry:{min:10,max:20000},defaults:{mountHeight:1315,hoodPanelOpen:false},fields:['mountHeight','hoodPanelOpen','hoodGeometry'],create:['mountHeight','hoodPanelOpen'],identity:{brand:'方太/FOTILE',model:'JCD10TA'}},
 stove:{measureSurfaceBoundary:true,surfaceMeasurement,hobCutout:{...hobCutoutLimits,inset:30},fields:['counterLink','counterElevation','hobCutout']},ksink:{linkedSurfaceOffset,surfaceMeasurement,fields:['counterLink','counterElevation','sinkNotch','sinkStyle','sinkBowlHeight'],defaults:{sinkStyle:'inset',sinkBowlHeight:150},vessel:{minSize:80,defaultDepth:400,rim:15,floor:12,drain:45,faucetRise:300,faucetClearance:100},notch:{min:20,margin:80,bodyDepth:220,rim:20,floor:12,faucetRise:292}},
 washer:laundry,dryer:laundry,
 water_purifier_mijia_1200g:{family:'under-sink-purifier',height:379,anchor:'bottom',defaults:{mountHeight:0},fields:['mountHeight'],create:['mountHeight'],identity:{brand:'米家/Mijia',model:'净水器 2 1200G'}},
 dishwasher_mijia_countertop:{family:'countertop-dishwasher',height:598,anchor:'bottom',defaults:{mountHeight:860,dishwasherDoorOpen:false},fields:['mountHeight','dishwasherDoorOpen'],create:['mountHeight','dishwasherDoorOpen'],identity:{brand:'米家/Mijia',model:'智能洗碗机 台式 5套'},foldDoor:{nominalWidth:550,nominalHeight:598,nominalDepth:350,openDepth:600,openingBottom:52,openingTop:584},installation:{ventSide:'left',sideClearance:200,worktopToCabinet:650,topAccess:50,frontOffset:80}},
 aquarium_mijia_2pro:{family:'aquarium',height:334,anchor:'bottom',defaults:{mountHeight:0},fields:['mountHeight'],create:['mountHeight'],identity:{brand:'米家/Mijia',model:'智能鱼缸 2 Pro',sourceUrl:'https://item.jd.com/100317574693.html'}},
 waterheater_flat:{family:'flat-heater',height:565,anchor:'bottom',defaults:{mountHeight:1650},fields:['mountHeight','heaterSocket'],create:['mountHeight']},
 shower_arrow_cream:{family:'arrow-shower',height:1749,anchor:'mixer',defaults:{showerMixerHeight:1000,showerRise:400,showerHandAngle:180*.20/Math.PI},fields:['mountHeight','showerMixerHeight','showerRise','showerHandAngle'],create:['showerMixerHeight'],identity:{brand:'ARROW/箭牌',model:'AE34129ZMKW-P2'}},
 tripleslidingwindow:{family:'sliding',height:1500,anchor:'bottom',defaults:{mountHeight:900,floorTrack:true},fields:['mountHeight','floorTrack'],create:['mountHeight']},
 doubleslidingdoor:{family:'sliding',telescopic:{panels:2,cornerTolerance:1},solidModel:{global:'FurnishSlidingOpeningModel',module:'sliding-opening',sliding:true},height:2400,defaults:{floorTrack:false,slidingTrackOrder:'leading-front'},fields:['floorTrack','slidingTrackOrder']},
 tripleslidingdoor:{family:'sliding',telescopic:{panels:3,cornerTolerance:1},solidModel:{global:'FurnishSlidingOpeningModel',module:'sliding-opening',sliding:true},height:2400,defaults:{floorTrack:false,slidingTrackOrder:'leading-front'},fields:['floorTrack','slidingTrackOrder']},
 slidingdoor:{family:'sliding',height:2100,defaults:{floorTrack:true},fields:['floorTrack']},
 curtain:{height:2400,defaults:{curtainStyle:'double'},fields:['curtainStyle'],create:['curtainStyle']},
 fridge:{height:1800},fridge_french_drawer:{height:1910},sofa_yeswood_cherry:{solidModel:{global:'FurnishYeswoodSofaModel',module:'yeswood-sofa',rounded:true},height:895},mirror:{height:1650},
 aircon:{height:1800},dishwasher:{height:840},rug:{height:16},bench:{height:440},beanbag:{height:720},barstool:{height:775},custom:{height:800},customround:{height:800},toilet:{height:796}
};
for(const type of ["bed","sofa","armchair","cornersofa","dresser","desk","chair","coffeetable","table","roundtable","island","barstool","officechair","bench"])types[type]={...types[type],solidModel:{global:'FurnishBasicFurnitureModel',module:'basic-furniture',positionSeed:true}};
// Installation review coverage is a product capability, not a saved instance field.
for(const type of ['heating_manifold','electrical_box_strong','electrical_box_weak','tea_bar_mijia_pro','water_purifier_mijia_1200g','aquarium_mijia_2pro','stove_fotile_th36b','rangehood_fotile_jcd10ta','stove','fridge','washer','waterheater','waterheater_flat','tv','fridge_french_drawer','aircon','acwall','dishwasher','dishwasher_mijia_countertop','dryer','purifier','robot_p20max_tank','robot_p20max_plumbed','robot_p20max']){
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
function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
freeze(fields);freeze(types);
const definition=f=>Object.hasOwn(types,typeof f==='string'?f:f?.type)?types[typeof f==='string'?f:f.type]:null;
// Local mm outline; custom models retain the rectangular fallback.
// Curvature is a visual estimate, never an installation requirement.
function assemblyBounds(f){if(f?.cabinet?.template!=='entry-pegboard')return null;const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);return C?.assemblyBounds(f)??null;}
function dimensions(f){const b=assemblyBounds(f);return b?{w:b.w,d:b.d,h:b.h}:{w:f.w,d:f.d,h:f.h??height(f)};}
// Reference geometry only: widths include valves/caps, left length starts at the header inlet.
function manifoldLayout(f){
 const r=definition(f)?.manifold;if(!r||f.obj)return null;
 const loops=value(f,'manifoldLoops'),railWidth=r.endWidth+(loops-1)*r.pitch,leftLength=f.w-railWidth;
 if(!Number.isInteger(loops)||loops<fields.manifoldLoops.min||loops>fields.manifoldLoops.max)throw Error(fields.manifoldLoops.message);
 if(!Number.isFinite(leftLength)||leftLength<r.minLeft||leftLength>r.maxLeft)throw Error(`左侧主管长度须为 ${r.minLeft}–${r.maxLeft} mm`);
 // Missing configuration keeps the previous model's physical positions; edits materialise independent values.
 const lengths=f.manifoldLengths??{upper:leftLength,lower:leftLength*.55};
 if(f.manifoldLengths!==undefined){validateField(f,'manifoldLengths',lengths);if(Math.abs(Math.max(lengths.upper,lengths.lower)-leftLength)>1e-6)throw Error('主管长度与分水器总宽不一致');}
 if(!Number.isFinite(f.d)||f.d<r.minDepth||!Number.isFinite(height(f))||height(f)<r.minHeight)throw Error(`分水器模型深度至少 ${r.minDepth} mm，高度至少 ${r.minHeight} mm`);
 return {loops,railWidth,leftLength,lengths:{...lengths},pitch:r.pitch,inlet:-f.w/2+leftLength};
}
function editManifold(f,changes){
 if(f.locked)throw Error('家具已锁定，请先解锁');const old=manifoldLayout(f);if(!old)throw Error('不是分水器模型');
 const next={...f,manifoldLoops:changes.loops??old.loops,manifoldLengths:{upper:changes.upper??changes.leftLength??old.lengths.upper,lower:changes.lower??old.lengths.lower}};validateField(next,'manifoldLoops',next.manifoldLoops);
 const r=definition(f).manifold;next.w=Math.max(next.manifoldLengths.upper,next.manifoldLengths.lower)+r.endWidth+(next.manifoldLoops-1)*r.pitch;
 if(next.w>20000)throw Error('分水器总宽不能超过 20000 mm');validate(next);return next;
}
function resizeManifold(f,next){
 if(!definition(f)?.manifold||f.obj||next.w===f.w)return;
 const old=manifoldLayout(f),left=next.w-old.railWidth,ratio=left/old.leftLength;
 // Explicit overall resizing scales both independently saved lengths. No ratio is imposed by a single-row edit.
 if(f.manifoldLengths)next.manifoldLengths={upper:old.lengths.upper*ratio,lower:old.lengths.lower*ratio};
}
function planBodyOutline(f,segments){
 const b=assemblyBounds(f);if(b)return [[b.left,b.back],[b.right,b.back],[b.right,b.front],[b.left,b.front]];
 const shape=!f.obj&&definition(f)?.planShape;if(!shape)return null;
 const count=segments||shape.segments,signed=v=>Math.abs(v)<1e-12?0:Math.sign(v)*Math.pow(Math.abs(v),shape.exponent);
 return Array.from({length:count},(_,i)=>{const t=i*2*Math.PI/count;return [f.w/2*signed(Math.sin(t)),f.d/2*signed(Math.cos(t))];});
}
function planOutline(f,segments){
 const points=planBodyOutline(f,segments);if(!points)return null;
 const rear=definition(f)?.planShape?.rear;if(!rear)return points;
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
const footprintMinimum=(f,key)=>Number.isFinite(f?.[key])&&f[key]>0?Math.min(50,f[key]):50;
const height=f=>f.h??definition(f)?.height;
const cabinetSpec=f=>definition(f)?.cabinet;
const cabinetBase=f=>f.type==='kitchenwall'?value(f,'mountHeight'):cabinetSpec(f)?.bottom??0;
function validateField(f,key,v){
 const rule=fields[key];if(!rule||!supports(f,key))throw Error(rule?.message||'不支持的产品参数：'+key);
 if(key==='manifoldLengths'){const r=definition(f).manifold;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==2||!['upper','lower'].every(k=>Object.hasOwn(v,k)&&typeof v[k]==='number'&&Number.isFinite(v[k])&&v[k]>=r.minRun&&v[k]<=r.maxLeft))throw Error(rule.message);return v;}
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
 if(!valid||rule.integer&&!Number.isInteger(v))throw Error(rule.message);if(['pipeBoxThickness','pipeBoxShape','pipeBoxOpenSide','pipeBoxCorner'].includes(key))pipeBoxPanels({...f,[key]:v});return v;
}
function validate(f){for(const key of Object.keys(fields))if(f[key]!==undefined)validateField(f,key,f[key]);manifoldLayout(f);if(family(f,'pipe-box')&&!f.obj)pipeBoxPanels(f);if(vesselSink(f)&&(![f.w,f.d].every(v=>Number.isFinite(v)&&v>=definition(f).vessel.minSize)))throw Error('台上盆宽深至少 80 mm');return f;}
const sinkBodyDepth=f=>f.sinkBowlHeight??definition(f).notch.bodyDepth;
const vesselSink=f=>f?.type==='ksink'&&!f.obj&&value(f,'sinkStyle')==='vessel';
// Report broken model records without migrating, deleting or rewriting them.
function modelError(f){try{validate(f);if(f.cabinet)(root.FurnishCabinet||require('./cabinet-core.js')).validate(f);return null;}catch(e){return e.message||String(e);}}
function downlightSpec(f){
 const spec=!f?.obj&&definition(f)?.downlight;if(!spec)return null;
 const watts=value(f,'downlightWatts'),kelvin=value(f,'downlightKelvin');validateField(f,'downlightWatts',watts);validateField(f,'downlightKelvin',kelvin);
 return {watts,kelvin,lumens:spec.flux[watts][kelvin],color:spec.colors[kelvin],beam:spec.beam};
}
function editDownlight(f,key,v){
 if(!definition(f)?.downlight||!['downlightWatts','downlightKelvin'].includes(key)||f.obj)throw Error('不支持的筒灯参数');
 validateField(f,key,v);const next={...f,[key]:v};
 if(next.name==='飞利浦品焕筒灯 DL269 · 5W 4000K')next.name='飞利浦品焕筒灯 DL269';
 if(next.model==='品焕 DL269 · 5W 4000K')next.model=definition(f).identity.model;
 return next;
}
function initial(f){
 const result={};for(const key of definition(f)?.create||[]){
  if(key==='kitchen'&&f.type==='kitchenwall'&&(!Number.isFinite(f.w)||!Number.isFinite(f.d)))continue;
  if(key==='manifoldLengths'){
   const r=definition(f).manifold,upper=(f.w??r.width)-r.endWidth-(value(f,'manifoldLoops')-1)*r.pitch;
   result[key]={...(f.manifoldLengths??{upper,lower:Math.min(330,upper)})};
  }else result[key]=key==='kitchen'?kitchen().defaults(f):value(f,key);
 }
 return {...result,...definition(f)?.identity};
}
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
function floorHost(f,furniture){const id=f.counterLink?.hostId||f.laundryHostId;return id&&furniture.find(v=>v.id===id);}
function floorBase(plan,f,furniture=plan?.furniture||[],trail=new Set()){
 if(plan?.furnitureDatum!==furnitureDatum.default)return {z:0,known:true};
 if(trail.has(f.id))return {z:0,known:false};trail=new Set(trail);trail.add(f.id);
 const host=floorHost(f,furniture);
 if(host)return floorBase(plan,host,furniture,trail);
 const F=root.FurnishFloorFinish||require('./floor-finish-core.js');
 let candidates=F.at(plan,[f.cx,f.cy]);
 if(!candidates.length&&definition(f)?.wallRecess){const a=(f.rot||0)*Math.PI/180,q=f.d/2+1;candidates=F.at(plan,[f.cx-Math.sin(a)*q,f.cy+Math.cos(a)*q]);}
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
 const b=assemblyBounds(f);if(b)return {bottom:b.bottom,top:b.top,source:'model'};
 if(vesselSink(f)){const base=f.counterElevation??862;return {bottom:base,top:base+Math.max(value(f,'sinkBowlHeight')+definition(f).vessel.faucetClearance,definition(f).vessel.faucetRise),source:'model'};}
 if(f.type==='ksink'&&(f.sinkNotch||f.sinkBowlHeight!==undefined)){const base=f.counterElevation??862,r=definition(f).notch;return {bottom:base-sinkBodyDepth(f),top:base+r.faucetRise,source:'model'};}
 if(family(f,'arrow-sink')){const {bottom,top}=sinkInstallation(f);return {bottom,top,source:'model'};}
 if(f.kitchen){const bottom=f.type==='kitchenwall'?value(f,'mountHeight'):0;return {bottom,top:f.kitchen.laundry?.assembly?kitchen().laundryHeight(f):bottom+f.kitchen.baseHeight+((f.kitchen.laundry?.countertop===false)?0:f.kitchen.thickness),source:'recorded'};}
 if(f.type==='vanity'&&f.cabinet){const spec=cabinetSpec(f);return {bottom:spec.bottom,top:spec.bottom+(f.cabinet.bodyHeight??spec.bodyHeight)+spec.aboveBody,source:'recorded'};}
 if(f.type==='stove_fotile_th36b'){const h=height(f),base=value(f,'counterElevation');return {bottom:base-80*h/138,top:base+58*h/138,source:'model'};}
 if(['stove','ksink'].includes(f.type)&&f.counterElevation!==undefined)return {bottom:f.counterElevation-(f.type==='ksink'?200:0),top:f.counterElevation+(f.type==='ksink'?320:40),source:'model'};
 const def=definition(f);if(def?.teaTable&&!f.obj)return {bottom:0,top:height(f)*def.teaTable.accessoryTop/def.teaTable.cabinetHeight,source:'model'};if(def?.envelope){const [bottom,top]=def.envelope(f);return {bottom,top:f.h===undefined?top:bottom+f.h,source:f.h===undefined?'model':'recorded'};}
 if(!def?.anchor)return null;if(def.anchor==='mixer'){const {bottom,top}=showerInstallation(f);return {bottom,top,source:'model'};}
 const bottom=value(f,'mountHeight');return {bottom,top:bottom+height(f),source:f.h===undefined||f.type==='tripleslidingwindow'?'model':'recorded'};
}
function retainReplacementField(previous,next,key){return key==='groupId'||supports(next,key)&&supports(previous,key)&&(key==='floorTrack'||key==='slidingTrackOrder'||previous.type===next.type||family(previous,'laundry')&&family(next,'laundry'));}
// Remove incompatible parameters before checking the replacement's outer size.
function customSinkCandidate(next,candidate){
 if(next.type!=='ksink')return;
 for(const key of ['sinkStyle','sinkBowlHeight'])if(candidate[key]!==undefined)next[key]=validateField(next,key,candidate[key]);
 if(vesselSink(next))delete next.sinkNotch;
}
function replacementResizeSource(previous,candidate){
 const next={...previous};for(const key of Object.keys(fields))if(!retainReplacementField(previous,candidate,key))delete next[key];
 if(previous.type===candidate.type)customSinkCandidate(next,candidate);
 // Cross-product resizing uses the source footprint but must not impose manifold inlet limits on the destination.
 else if(definition(previous)?.manifold)next.type='custom';
 return next;
}
function replacement(previous,next,candidate){
 if(previous.type==='vanity'){if(!candidate.cabinet)delete next.cabinet;if(candidate.h!==undefined)next.h=candidate.h;}
 for(const key of Object.keys(fields)){
  if(key==='groupId')continue; // Layout membership survives product replacement.
  // Family permits washer↔dryer and track styles; installation belongs to the
  // specific product except for the laundry family. Socket is a world point.
  const retain=retainReplacementField(previous,next,key);
  if(!retain)delete next[key];
 }
 if(definition(next)?.downlight||definition(next)?.manifold||family(next,'floor-aircon')||family(next,'tea-bar')||family(next,'placeholder')||family(next,'under-sink-purifier')||family(next,'pipe-box')||family(next,'folding-table')||family(next,'arrow-sink')||['stove_fotile_th36b','rangehood_fotile_jcd10ta','aquarium_mijia_2pro','dishwasher_mijia_countertop'].includes(next.type)){for(const [key,v] of Object.entries(initial(next)))if(next[key]===undefined||key==='brand'||key==='model'||key==='sourceUrl'&&!next[key])next[key]=v;}
 if(family(next,'folding-table')&&previous.type===next.type){const full=foldingTableGeometry({...candidate,foldingTablePose:candidate.foldingTablePose??'round'}).fullDepth;next.d=full*foldingTableGeometry(next).ratio;}
 if(supports(next,'curtainStyle'))next.curtainStyle=candidate.curtainStyle??value({type:next.type},'curtainStyle');
 if(next.type==='ksink'){customSinkCandidate(next,candidate);validate(next);}
 if(family(next,'arrow-shower')){delete next.mountHeight;next.showerMixerHeight=previous.type===next.type?showerInstallation(previous).mixer:value({type:next.type},'showerMixerHeight');for(const [key,v] of Object.entries(definition(next).identity))next[key]=candidate[key]||v;}
 if(next.type==='tripleslidingwindow')next.mountHeight=previous.type===next.type?value(previous,'mountHeight'):value({type:next.type},'mountHeight');
 if(next.type==='kitchenwall')next.mountHeight=previous.type===next.type?value(previous,'mountHeight'):value({type:next.type},'mountHeight');
 if(definition(next)?.manifold||family(next,'pipe-box'))validate(next);return next;
}
// Shared millimetre track geometry. The leading leaf is furthest from the stack.
const slidingTrackSpec=Object.freeze({floorWidth:4,floorHeight:8,hangingClearance:4});
const slidingFloorHeight=f=>Math.min(slidingTrackSpec.floorHeight,height(f)/20);
const slidingBottom=(f,enabled=value(f,'floorTrack'))=>enabled?slidingFloorHeight(f):slidingTrackSpec.hangingClearance;
function slidingTracks(f,{panels=definition(f)?.telescopic?.panels??3,slim=true,order=value(f,'slidingTrackOrder')??'leading-front'}={}){
 const leafDepth=Math.min(slim?18:25,f.d/(panels+1)*.7),pitch=(f.d-leafDepth)/panels,direction=order==='leading-back'?-1:1;
 return {panels,leafDepth,pitch,direction,leadingOffset:(panels-1)/2*pitch*direction};
}
function slidingLayout(f,corner=null,options={}){
 const tracks=slidingTracks(f,options),slim=options.slim??true,edge=Math.min(slim?16:28,f.w/20,height(f)/12),jamb=slim?9:edge;
 const mirrored=(options.stackSide??(corner?.side==='left'?'right':'left'))==='right',sign=mirrored?-1:1,end=corner?corner.leafEnd*sign:f.w/2-jamb;
 const width=(end+f.w/2-jamb+(tracks.panels-1)*edge)/tracks.panels,step=width-edge,opened=-f.w/2+jamb+width/2;
 const railOutline=corner?[[sign*-f.w/2,-f.d/2],[corner.x-corner.slope*f.d/2,-f.d/2],[corner.x+corner.slope*f.d/2,f.d/2],[sign*-f.w/2,f.d/2]]:[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]];
 const leaves=Array.from({length:tracks.panels},(_,i)=>({x:(opened+step*i)*sign,opened:opened*sign,z:(i-(tracks.panels-1)/2)*tracks.pitch*tracks.direction,width}));
 const movingOnly=options.floorTrackMode?options.floorTrackMode==='moving':!!definition(f)?.telescopic,half=slidingTrackSpec.floorWidth/2,cut=z=>corner?corner.x+corner.slope*z:sign*f.w/2;
 const floorTracks=leaves.flatMap((leaf,i)=>movingOnly&&Math.abs(leaf.x-leaf.opened)<=1e-6?[]:[{leafIndex:i,z:leaf.z,start:sign*-f.w/2,end:cut(leaf.z),outline:[[sign*-f.w/2,leaf.z-half],[cut(leaf.z-half),leaf.z-half],[cut(leaf.z+half),leaf.z+half],[sign*-f.w/2,leaf.z+half]]}]);
 return {...tracks,edge,jamb,width,mirrored,railOutline,leaves,floorTracks,floorRailHeight:slidingFloorHeight(f),bottomClearance:corner?.floorClearance??slidingBottom(f,options.floorTrack??value(f,'floorTrack'))};
}
// Automatic L joint: only a unique perpendicular end-to-end partner at the
// same known rail elevation. Mid-span crossings and ambiguous junctions stay intact.
function slidingCorner(f,furniture=[],plan){
 const eligible=v=>!!definition(v)?.telescopic&&!v.obj&&[v.cx,v.cy,v.w,v.d,height(v)].every(Number.isFinite)&&v.w>v.d*2&&v.d>0&&height(v)>0&&Number.isFinite(v.rot??0)&&!modelError(v);
 if(!eligible(f))return null;
 const items=[f,...furniture.filter(v=>v.id!==f.id&&eligible(v))];
 const axis=v=>{const a=(v.rot||0)*Math.PI/180;return [Math.cos(a),Math.sin(a)];};
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
 const candidates=v=>{
  const u=axis(v),base=floorBase(plan,v,items),out=[];if(!base.known)return out;
  for(const other of items){
   if(other.id===v.id)continue;const q=axis(other);if(Math.abs(dot(u,q))>1e-6)continue;
   const otherBase=floorBase(plan,other,items),tol=definition(v).telescopic.cornerTolerance;
   if(!otherBase.known||Math.abs(base.z+height(v)-otherBase.z-height(other))>tol)continue;
   const delta=[other.cx-v.cx,other.cy-v.cy],den=cross(u,q),t=cross(delta,q)/den,s=cross(delta,u)/den;
   if(Math.abs(Math.abs(t)-v.w/2)>other.d/2+tol||Math.abs(Math.abs(s)-other.w/2)>v.d/2+tol)continue;
   // Native coordinates include furniture mirroring; the builder may mirror
   // again to stack away from this free corner.
   const flip=v.flip?-1:1,x=t*flip,side=x>0?'right':'left',towardOther=[-Math.sign(s)*q[0],-Math.sign(s)*q[1]],normal=[-u[1],u[0]];
   // Rectangular leaves meet end-to-face, never on the rail's miter plane.
   // One leaf runs through the joint; the other stops at its near surface.
   // Directed corner axes choose complementary roles, independent of IDs.
   const otherTracks=slidingTracks(other),through=cross(u,q)*Math.sign(t)*Math.sign(s)>0;
   const otherNormal=[-q[1],q[0]],leafEnd=(t+dot(otherNormal,u)*otherTracks.leadingOffset+Math.sign(t)*(through?1:-1)*otherTracks.leafDepth/2)*flip;
   const slope=-Math.sign(t)*flip*other.d/(dot(towardOther,normal)*v.d),layout=slidingLayout(v,{side,leafEnd,x,slope});if(layout.width<=2*layout.edge)continue;
   const floorClearance=Math.max(slidingBottom(v),otherBase.z-base.z+slidingBottom(other));
   out.push({other,side,x,leafEnd,through,floorClearance,slope});
  }return out;
 };
 const hits=candidates(f);if(hits.length!==1||candidates(hits[0].other).length!==1)return null;
 const {other,side,x,slope,leafEnd,through,floorClearance}=hits[0];return {partnerId:other.id,side,x,slope,leafEnd,through,floorClearance};
}
// Derived geometry capability; no field is added to saved furniture instances.
function serviceCut(f){const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);return !f.obj&&(C.supported(f)||['counter','vanity'].includes(f.type));}
// Ceiling defaults describe design examples, not manufacturer requirements.
const ceiling={min:.1,epsilon:1e-6,max:20000,maxVertices:128,maxItems:200,maxRegions:100,maxSections:8,snapPixels:12,flatThickness:12,aluminum:{width:300,length:600,thickness:8,gap:1,trim:20,direction:0,maxPanels:2000},uniformInset:200,sectionRotationStep:15,sectionRotationTolerance:4,
 corner:{maxLegs:2,angle:90,lightSetback:0,lightRadius:8,compactInnerRadius:1,arcChordError:.05,arcMaxAngle:3,arcMaxSegments:1024},
 endCap:{thickness:12,lightGap:5},
 lowCove:{drop:300,projection:70,back:20,bottom:10,front:10,lip:30},light:{u:40,d:290,angle:-90,width:10,thickness:2},
 // Design examples; the wash-channel envelope is read from the user's image.
 sectionPresets:{low:{drop:300,projection:70,back:20,bottom:10,front:10,lip:30},wide:{drop:250,projection:300,back:12,bottom:12,front:12,lip:40}},
 washChannel:{width:43.5,height:18.5,clearWidth:12.5,wall:2,gap:8},
 // 39 / 22.5 / 13.6 / 18.6 are user-image labels. Remaining values are editable design assumptions.
 upChannel:{mirrorU:false,mirrorD:false,rotation:0,width:39,bodyWidth:22.5,opening:13.6,height:18.6,wall:1.5,rail:2,wingThickness:1.5,u:300,d:238,diffuserEnabled:true,diffuserThickness:1,diffuserInset:.5,lightEnabled:true,lightWidth:10,lightThickness:2,lightOffsetU:0,lightOffsetD:0,lightAngle:-90}};
const api={slidingLayout,slidingTracks,slidingCorner,downlightSpec,editDownlight,manifoldLayout,editManifold,resizeManifold,footprintMinimum,dimensions,assemblyBounds,pegboardAssembly,planBodyOutline,planOutline,floorStanding,teaBarDoors,teaBarOpeningZones,sinkBodyDepth,vesselSink,ceiling,types,fields,definition,supports,family,value,height,cabinetSpec,cabinetBase,validateField,validate,modelError,initial,migrate,pipeBoxSignature,pipeBoxSides,pipeBoxPanels,hobCutout,editHobCutout,foldingTableGeometry,foldingTableOutline,editFoldingTablePose,dishwasherInstallation,sinkInstallation,showerInstallation,hoodInstallation,editHoodGeometry,resizeHoodGeometry,furnitureDatum,floorHost,floorBase,validateDatum,vertical,replacementResizeSource,replacement,serviceCut};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishProducts=api;
})(typeof globalThis!=='undefined'?globalThis:this);
