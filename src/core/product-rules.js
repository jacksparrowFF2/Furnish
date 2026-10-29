/* Product capabilities shared by browser/Node. No DOM, storage or geometry engine. */
(function(root){
'use strict';
const numeric=(min,max,message)=>({min,max,message});
// Model capability limits; decorative panel thickness is not a fabrication requirement.
const cabinetConstruction={modes:['shared','independent'],default:'shared',joints:['separate','shared'],endPanel:{min:0,max:50},minBoxWidth:150};
// Layout profile, not a hardware specification. Rod axis is below its upper board.
const wardrobeHanging={template:'wardrobe-hanging',profile:25,endGap:2,topOffset:60,minGap:600};
const cabinetTopClosure={height:{min:0,max:300,default:50},doorGap:{min:0,max:50,default:10}};
const pegboardAssembly={parts:['upper','left','right','lower','displayShelves','hooks','light'],accessoryParts:['displayShelves','hooks','light'],legacyParts:['accessories'],structureParts:['upper','left','right','lower'],thickness:18,hatch:{modes:['manual','auto'],maxPanels:16,minWeb:20,margin:20,min:50,gap:2,angle:100,defaultWidth:400,defaultHeight:300,fitPadding:10,padding:{sides:['top','bottom','left','right'],min:0,max:100},maxRearGap:500,alignmentDegrees:1},holes:{diameter:9,minDiameter:2,maxDiameter:30,margin:30,pitch:40,maxCount:3000,maxAxis:200,minWeb:2},bottom:{min:0,max:20000}};
const kitchen=()=>root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);
const fields={
 sideTableUpperOpen:{boolean:true,message:'边几上抽屉开合无效'},
 sideTableLowerOpen:{boolean:true,message:'边几下抽屉开合无效'},
 downlightWatts:{values:[5,7],message:"筒灯功率须为5W或7W"},
 downlightKelvin:{values:[3000,4000,6500],message:"筒灯色温须为3000K、4000K或6500K"},
 manifoldLengths:{custom:true,message:'上下排主管长度须分别为 55–10000 mm'},
 manifoldLoops:{...numeric(1,12,'分水器路数须为 1–12 的整数'),integer:true},
 pipeBoxShape:{values:['four','three','two'],message:'包管柜结构须为四面、三面或直角两面'},
 pipeBoxOpenSide:{values:['back','front','left','right'],message:'包管柜敞开面须为前、后、左或右面'},
 pipeBoxCorner:{values:['front-left','front-right','back-left','back-right'],message:'包管柜须保留两个相邻面'},
 pipeBoxThickness:numeric(1,100,'包管柜板厚须为 1–100 mm'),
 washerDoorAngle:numeric(0,110,'洗衣机圆门角度须为0–110度'),
 laundryHostId:{string:true,max:200,message:'洗衣机柜关联编号无效'},
 groupId:{string:true,max:200,message:'家具组编号须为 1–200 字的非空字符串'},
 fridgeLeftAngle:numeric(0,100,'冰箱左门角度须为0–100度'),
 fridgeRightAngle:numeric(0,100,'冰箱右门角度须为0–100度'),
 fridgeUpperExtension:numeric(0,1,'冰箱上抽屉行程比例须为0–1'),
 fridgeLowerExtension:numeric(0,1,'冰箱下抽屉行程比例须为0–1'),
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
 curtainOpen:numeric(0,1,'窗帘收起比例须为 0–1'),
 blindAngle:numeric(0,85,'百叶角度须为 0–85°'),
 shadeMode:{values:['day','night'],message:'柔纱帘调光须为日间或夜间'},
 slidingStackSide:{values:['left','right'],message:'收门方向须为左侧或右侧'},
 slidingOpen:{boolean:true,message:'门扇开合设置无效'},
 floorTrack:{boolean:true,message:'轨道设置无效'},
 slidingTrackOrder:{values:['leading-front','leading-back'],message:'活动扇所在侧须为靠正面或靠背面'},
 heaterSocket:{point:true,message:'热水器插座须有有效 X、Y 和 0–20000 mm 离地高度'}
};
const laundry={family:'laundry',actions:['alignLaundryBay'],height:850,anchor:'bottom',defaults:{mountHeight:0,stackHeight:20},fields:['mountHeight','stackHeight','laundryHostId'],create:['mountHeight']};
const surfaceMeasurement={wallContactTolerance:5};
const linkedSurfaceOffset={max:20000}; // Local module axes, mm; missing offsets retain centred placement.
const arrowSink={embedded:true,measureSurfaceBoundary:true,surfaceMeasurement,linkedSurfaceOffset,family:'arrow-sink',height:240,sink:{rimThickness:.8,nominalDepth:450,faucetRise:360,nominalInnerWidth:640},defaults:{counterElevation:860,sinkInstall:'top'},fields:['counterLink','counterElevation','sinkInstall'],create:['counterElevation','sinkInstall']};
const doorPairing={values:['end','start'],default:'end',singleHinge:{values:['left','right'],default:'left'},layout:{values:['left','right','pair','paired'],maxLeaves:24}};
// Editable leaf widths are model dimensions, not hardware installation limits.
const doorWidths={minWidth:50,maxLeaves:24,gap:2};
const hobCutoutLimits={min:1,max:20000,moduleMargin:20};
const washer={...laundry,kind:'洗衣机',laundryKind:'washer',washerMotion:true,solidModel:{global:'FurnishWasherModel',module:'washer'},defaults:{...laundry.defaults,washerDoorAngle:0},fields:[...laundry.fields,'washerDoorAngle'],create:[...laundry.create,'washerDoorAngle']};
const foldingTable={solidModel:{global:'FurnishFoldingTableModel',module:'folding-table'},family:'folding-table',height:760,defaults:{foldingTablePose:'round'},fields:['foldingTablePose'],create:['foldingTablePose'],identity:{brand:'源氏木语/YESWOOD',model:'白蜡木原木色 · 象牙白岩板折叠餐桌',sourceUrl:'https://item.jd.com/10195288580856.html'}};
const electricalBox={family:'electrical-box',wallRecess:true,height:400,anchor:'bottom',defaults:{mountHeight:1200},fields:['mountHeight'],create:['mountHeight']};
// Generic made-to-measure covering assumptions, not a manufacturer's installation specification.
const covering={defaultFrontClearance:0,family:'window-covering',height:1800,anchor:'bottom',defaults:{mountHeight:900,curtainOpen:0},fields:['mountHeight','curtainOpen'],create:['mountHeight','curtainOpen'],solidModel:{global:'FurnishWindowCoveringModel',module:'window-covering'}};
const coverSpecs={head:50,hem:14,cellPitch:30,slatPitch:38,slatThickness:1.5,band:90,bambooPitch:10,sheet:1};
const types={
 armchair_yeswood_berlin:{height:845,family:'lounge-chair',armchairProfile:'berlin',solidModel:{global:'FurnishArmchairModel',module:'armchair'},identity:{brand:'源氏木语/YESWOOD',model:'柏林休闲沙发椅 · 米色 · 710×850×845'}},
 armchair_yeswood_y09hs:{height:905,armchairProfile:'original',family:'lounge-chair',solidModel:{global:'FurnishArmchairModel',module:'armchair'},identity:{brand:'源氏木语/YESWOOD',model:'单人沙发椅 · 亚麻色 · 725×900×905',sourceUrl:'https://detail.tmall.com/item.htm?id=1013742104698&mi_id=0000YOu__P7FO1Od4DVMBOKIdVmXewhzkN4eAYmXTAOn9nU&skuId=6131810120970&spm=tbpc.boughtlist.suborder_itemtitle.1.24b02e8dUKATHx'}},
 sidetable_tmall_635382906309:{defaultFrontClearance:0,family:'side-table',sideTable:{minWidth:500,minDepth:180,minHeight:560,stone:11,post:42.5,upperClearance:185,travel:220},height:612,defaults:{sideTableUpperOpen:false,sideTableLowerOpen:false},fields:['sideTableUpperOpen','sideTableLowerOpen'],create:['sideTableUpperOpen','sideTableLowerOpen'],solidModel:{global:'FurnishSideTableModel',module:'side-table'},identity:{model:'双抽岩板边几 · 680×300×612',sourceUrl:'https://detail.tmall.com/item.htm?abbucket=0&id=635382906309&mi_id=0000n64ioooJG8d3oTuI_3sSR6yl6NubVt7Jui-6QXW-OA4&rn=1d72a6e371179b1c55984da266deb1b9&skuId=5776584417656&spm=a1z10.3-b-s.w4011-14781637738.244.629a5884FD6Y30'}},
 curtain_sheer:{...covering,height:2400,defaults:{mountHeight:0,curtainOpen:0,curtainStyle:'double'},fields:[...covering.fields,'curtainStyle'],create:[...covering.create,'curtainStyle'],solidModel:undefined,covering:{kind:'sheer',soft:true}},
 blind_venetian:{...covering,defaults:{...covering.defaults,blindAngle:85},fields:[...covering.fields,'blindAngle'],create:[...covering.create,'blindAngle'],covering:{kind:'venetian'}},
 blind_honeycomb:{...covering,covering:{kind:'honeycomb'}},
 blind_zebra:{...covering,defaults:{...covering.defaults,shadeMode:'day'},fields:[...covering.fields,'shadeMode'],create:[...covering.create,'shadeMode'],covering:{kind:'zebra'}},
 blind_bamboo:{...covering,covering:{kind:'bamboo'}},
 blind_roller:{...covering,covering:{kind:'roller'}},
 pocketdoor_double:{family:'pocket-door',height:2640,defaults:{slidingOpen:true},fields:['slidingOpen'],create:['slidingOpen'],solidModel:{global:'FurnishSlidingOpeningModel',module:'sliding-opening'},pocket:{minWidth:1600,minDepth:120,minHeight:1800,skin:18,leaf:40,end:30,overlap:20,head:300,bottom:10,reserve:100}},
 pocketdoor_triple:{family:'pocket-door',height:2640,defaults:{slidingOpen:true,slidingStackSide:'left'},fields:['slidingOpen','slidingStackSide'],create:['slidingOpen','slidingStackSide'],solidModel:{global:'FurnishSlidingOpeningModel',module:'sliding-opening'},pocket:{panels:3,minWidth:2000,minDepth:200,minHeight:1800,skin:18,leaf:40,end:30,overlap:20,head:300,bottom:10,reserve:120,laneGap:10}},
 bookshelf_yeswood_y52y09:{height:750,bookcase:{template:'book-y52y09-low',width:1115,depth:230,thickness:18,edgeRadius:6},identity:{brand:'源氏木语/YESWOOD',model:'Y52Y09 · 三列两层 · 无底框',sourceUrl:'https://item.jd.com/100266639340.html'}},
 panel_light_300x600:{family:'ceiling-panel-device',clearanceReview:'missing',height:35,anchor:'bottom',defaults:{mountHeight:2500},fields:['mountHeight'],create:['mountHeight'],solidModel:{global:'FurnishBathHeaterModel',module:'bath-heater'},ceilingPanel:{width:300,length:600,rim:2,alignment:.1},panelLight:{watts:24,frame:3,color:'#fff4e4',previewCandela:60,columns:2,rows:3,bounceCandela:3,bounceDrop:900,bounceReach:4000}},
 bath_heater_aopu_se2:{family:'ceiling-panel-device',clearanceReview:'missing',height:112,anchor:'bottom',defaults:{mountHeight:2500},fields:['mountHeight'],create:['mountHeight'],identity:{brand:'奥普/AUPU',model:'SE2'},solidModel:{global:'FurnishBathHeaterModel',module:'bath-heater'},ceilingPanel:{width:300,length:600,rim:2,alignment:.1,profile:'se2',bodyHeight:110,minCeilingDrop:130}},
 bath_heater_300x600:{family:'ceiling-panel-device',clearanceReview:'missing',height:180,anchor:'bottom',defaults:{mountHeight:2500},fields:['mountHeight'],create:['mountHeight'],solidModel:{global:'FurnishBathHeaterModel',module:'bath-heater'},ceilingPanel:{width:300,length:600,rim:2,alignment:.1}},
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
 counter:{family:'kitchen',kitchenPlinth:{default:100,min:0,max:250},kitchenTall:{label:'高柜',defaultHeight:2200,minHeight:1200,maxHeight:3200},moduleDividers:true,drawerTiers:{boundaryResize:true,snapPixels:8,defaultCount:3,minCount:1,maxCount:10,minHeight:96,plinth:100,board:18,legacyOffset:150,legacyMin:60,styles:{standard:{label:'普通抽屉'},'dish-basket':{label:'碗碟篮（两外抽、三层）',minHeights:[300,220,100],hiddenTier:2,outerTier:1}}},kitchenDepth:{min:50,max:1200,drawerMin:72,emptyMinWidth:50},kitchenShapes:{straight:{runs:[0],ends:[0]},L:{runs:[0,1],ends:[0,1]},U:{runs:[0,1,2],ends:[0,2],independentResize:true,outerResize:true,runDepth:{min:50,max:1200}}},endResize:{fields:['length','cabinetDepth'],minLength:150,maxLength:3000,minDepth:50,maxDepth:1200},cornerPartitions:{sides:['left','right'],retained:false,roleDefaults:{drawer:true,tall:true}},avoidance:{enabled:false,minDepth:150,unoccupiedRoles:['door','sink','hob']},fields:['kitchen'],create:['kitchen']},
 kitchenwall:{height:700,anchor:'bottom',defaults:{mountHeight:1480},hoodBay:{ceilingDefault:true,minSideGap:0},moduleDividers:true,moduleMaxWidth:6000,drawerTiers:{boundaryResize:true,snapPixels:8,defaultCount:3,minCount:1,maxCount:10,minHeight:96,plinth:0,board:18,legacyOffset:50,legacyMin:60},kitchenShapes:{straight:{runs:[0],ends:[0]},L:{runs:[0,1],ends:[0,1]},U:{runs:[0,1,2],ends:[0,2],independentResize:true,outerResize:true,runDepth:{min:50,max:1200}}},fields:['mountHeight','kitchen'],create:['mountHeight','kitchen']},
 stove_fotile_th36b:{embedded:true,measureSurfaceBoundary:true,surfaceMeasurement,hobCutout:{...hobCutoutLimits,widthRatio:660/750,depthRatio:350/440},height:138,defaults:{counterElevation:860},fields:['counterLink','counterElevation','hobCutout'],create:['counterElevation'],identity:{brand:'方太/FOTILE',model:'TH36B-T'}},
 rangehood_fotile_jcd10ta:{hoodMotion:true,solidModel:{global:'FurnishFotileModel',module:'fotile'},height:520,anchor:'bottom',hoodGeometry:{min:10,max:20000},defaults:{mountHeight:1315,hoodPanelOpen:false},fields:['mountHeight','hoodPanelOpen','hoodGeometry'],create:['mountHeight','hoodPanelOpen'],identity:{brand:'方太/FOTILE',model:'JCD10TA'}},
 stove:{measureSurfaceBoundary:true,surfaceMeasurement,hobCutout:{...hobCutoutLimits,inset:30},fields:['counterLink','counterElevation','hobCutout']},ksink:{linkedSurfaceOffset,surfaceMeasurement,fields:['counterLink','counterElevation','sinkNotch','sinkStyle','sinkBowlHeight'],defaults:{sinkStyle:'inset',sinkBowlHeight:150},vessel:{minSize:80,defaultDepth:400,rim:15,floor:12,drain:45,faucetRise:300,faucetClearance:100},notch:{min:20,margin:80,bodyDepth:220,rim:20,floor:12,faucetRise:292}},
 washer:{...washer},washer_littleswan_tg10k60w:{...washer,washerProfile:'tg10k60w',washerGeometryVersion:2,identity:{brand:'小天鹅/LittleSwan',model:'TG10K60W'},installation:{referenceWidth:625,referenceDepth:600,referenceHeight:865,closedCabinetDepth:605,sideClearance:15,topClearance:15,rearClearance:30,source:'用户提供的TG10K60W安装图（开放不封闭柜）'}},dryer:{...laundry,laundryKind:'dryer'},
 water_purifier_mijia_1200g:{family:'under-sink-purifier',height:379,anchor:'bottom',defaults:{mountHeight:0},fields:['mountHeight'],create:['mountHeight'],identity:{brand:'米家/Mijia',model:'净水器 2 1200G'}},
 dishwasher_mijia_countertop:{solidModel:{global:'FurnishDishwasherModel',module:'dishwasher'},foldAsset:true,family:'countertop-dishwasher',height:598,anchor:'bottom',defaults:{mountHeight:860,dishwasherDoorOpen:false},fields:['mountHeight','dishwasherDoorOpen'],create:['mountHeight','dishwasherDoorOpen'],identity:{brand:'米家/Mijia',model:'智能洗碗机 台式 5套'},foldDoor:{nominalWidth:550,nominalHeight:598,nominalDepth:350,openDepth:600,openingBottom:52,openingTop:584},installation:{ventSide:'left',sideClearance:200,worktopToCabinet:650,topAccess:50,frontOffset:80}},
 aquarium_mijia_2pro:{family:'aquarium',height:334,anchor:'bottom',defaults:{mountHeight:0},fields:['mountHeight'],create:['mountHeight'],identity:{brand:'米家/Mijia',model:'智能鱼缸 2 Pro',sourceUrl:'https://item.jd.com/100317574693.html'}},
 waterheater_flat:{family:'flat-heater',height:565,anchor:'bottom',defaults:{mountHeight:1650},fields:['mountHeight','heaterSocket'],create:['mountHeight']},
 shower_arrow_cream:{family:'arrow-shower',height:1749,anchor:'mixer',defaults:{showerMixerHeight:1000,showerRise:400,showerHandAngle:180*.20/Math.PI},fields:['mountHeight','showerMixerHeight','showerRise','showerHandAngle'],create:['showerMixerHeight'],identity:{brand:'ARROW/箭牌',model:'AE34129ZMKW-P2'}},
 tripleslidingwindow:{family:'sliding',height:1500,anchor:'bottom',defaults:{mountHeight:900,floorTrack:true},fields:['mountHeight','floorTrack'],create:['mountHeight']},
 telescopicdoor20:{family:'sliding',telescopic:{panels:2,allMoving:true,cornerTolerance:1,leafDepth:40,defaultDepth:100,glass:'ultra-clear'},solidModel:{global:'FurnishSlidingOpeningModel',module:'sliding-opening',sliding:true},height:2400,defaults:{floorTrack:false,slidingTrackOrder:'leading-front',slidingStackSide:'left',slidingOpen:false},fields:['floorTrack','slidingTrackOrder','slidingStackSide','slidingOpen']},
 doubleslidingdoor:{family:'sliding',telescopic:{panels:2,cornerTolerance:1},solidModel:{global:'FurnishSlidingOpeningModel',module:'sliding-opening',sliding:true},height:2400,defaults:{floorTrack:false,slidingTrackOrder:'leading-front'},fields:['floorTrack','slidingTrackOrder']},
 tripleslidingdoor:{family:'sliding',telescopic:{panels:3,cornerTolerance:1},solidModel:{global:'FurnishSlidingOpeningModel',module:'sliding-opening',sliding:true},height:2400,defaults:{floorTrack:false,slidingTrackOrder:'leading-front'},fields:['floorTrack','slidingTrackOrder']},
 slidingdoor:{family:'sliding',height:2100,defaults:{floorTrack:true},fields:['floorTrack']},
 curtain:{defaultFrontClearance:0,family:'window-covering',height:2400,anchor:'bottom',covering:{kind:'cloth',soft:true},defaults:{curtainStyle:'double',curtainOpen:0,mountHeight:0},fields:['curtainStyle','curtainOpen','mountHeight'],create:['curtainStyle','curtainOpen','mountHeight']},
 fridge:{height:1800},fridge_french_drawer:{height:1910,solidModel:{global:'FurnishFridgeModel',module:'fridge'},fields:['fridgeLeftAngle','fridgeRightAngle','fridgeUpperExtension','fridgeLowerExtension'],defaults:{fridgeLeftAngle:0,fridgeRightAngle:0,fridgeUpperExtension:0,fridgeLowerExtension:0},fridgeMotion:{size:[833,1910,595],angle:100,travel:350,parts:[{role:'left',key:'fridgeLeftAngle',axis:'y',sign:1,pivot:[-413.5,800,281.5]},{role:'right',key:'fridgeRightAngle',axis:'y',sign:-1,pivot:[413.5,800,281.5]},{role:'upper',key:'fridgeUpperExtension',axis:'z',pivot:[0,0,0]},{role:'lower',key:'fridgeLowerExtension',axis:'z',pivot:[0,0,0]}]}},sofa_yeswood_cherry:{solidModel:{global:'FurnishYeswoodSofaModel',module:'yeswood-sofa',rounded:true},height:895},mirror:{height:1650},
 aircon:{height:1800},dishwasher:{height:840},rug:{height:16},bench:{height:440},beanbag:{height:720},barstool:{height:775},custom:{height:800},customround:{height:800},toilet:{height:796}
};
for(const type of ["bed","sofa","armchair","cornersofa","dresser","desk","chair","coffeetable","table","roundtable","island","barstool","officechair","bench"])types[type]={...types[type],solidModel:{global:'FurnishBasicFurnitureModel',module:'basic-furniture',positionSeed:true}};
// Installation review coverage is a product capability, not a saved instance field.
for(const type of ['heating_manifold','electrical_box_strong','electrical_box_weak','tea_bar_mijia_pro','water_purifier_mijia_1200g','aquarium_mijia_2pro','stove_fotile_th36b','rangehood_fotile_jcd10ta','stove','fridge','washer','washer_littleswan_tg10k60w','waterheater','waterheater_flat','tv','fridge_french_drawer','aircon','acwall','dishwasher','dishwasher_mijia_countertop','dryer','purifier','robot_p20max_tank','robot_p20max_plumbed','robot_p20max']){
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
// Concept construction dimensions, not a hardware specification. Total width includes both pockets.
function pocketLayout(f){
 const r=definition(f)?.pocket;if(!r||f.obj)return null;
 const h=height(f);if(!(f.w>=r.minWidth&&f.d>=r.minDepth&&h>=r.minHeight))throw Error(`口袋门草模总宽至少${r.minWidth}、墙厚至少${r.minDepth}、总高至少${r.minHeight} mm`);
 if(r.panels===3){
  const opening=(f.w-r.reserve)*r.panels/(r.panels+1),pocket=f.w-opening,clearHeight=h-r.head,leaf=(opening+(r.panels-1)*r.overlap)/r.panels,sign=value(f,'slidingStackSide')==='right'?-1:1,start=-f.w/2+pocket,parked=-f.w/2+r.end+20+leaf/2,parts=[];
  for(const face of [-1,1])parts.push({key:'pocket-skin',w:pocket,d:r.skin,h:clearHeight,x:sign*(-f.w/2+pocket/2),z:face*(f.d-r.skin)/2,bottom:0});
  parts.push({key:'pocket-end',w:r.end,d:f.d,h:clearHeight,x:sign*(-f.w/2+r.end/2),z:0,bottom:0},{key:'pocket-header',w:f.w,d:f.d,h:r.head,x:0,z:0,bottom:clearHeight});
  const leaves=Array.from({length:r.panels},(_,i)=>({side:i,closed:sign*(start+leaf/2+i*(leaf-r.overlap)),opened:sign*parked,width:leaf,z:(i-(r.panels-1)/2)*(r.leaf+r.laneGap)}));
  for(const l of leaves)parts.push({key:'pocket-leaf',w:leaf,d:r.leaf,h:clearHeight-r.bottom,x:value(f,'slidingOpen')?l.opened:l.closed,z:l.z,bottom:r.bottom,side:l.side});
  return {opening,pocket,clearHeight,leaves,parts,panels:r.panels};
 }
 const opening=f.w/2-r.reserve,pocket=(f.w-opening)/2,clearHeight=h-r.head,leaf=opening/2+r.overlap,travel=opening/2+r.overlap+2,parts=[];
 for(const side of [-1,1]){
  const x=side*(opening/2+pocket/2);
  for(const face of [-1,1])parts.push({key:'pocket-skin',w:pocket,d:r.skin,h:clearHeight,x,z:face*(f.d-r.skin)/2,bottom:0});
  parts.push({key:'pocket-end',w:r.end,d:f.d,h:clearHeight,x:side*(f.w-r.end)/2,z:0,bottom:0});
 }
 parts.push({key:'pocket-header',w:f.w,d:f.d,h:r.head,x:0,z:0,bottom:clearHeight});
 const leaves=[-1,1].map(side=>({side,closed:side*(leaf/2+1),opened:side*(leaf/2+1+travel),width:leaf}));
 for(const l of leaves)parts.push({key:'pocket-leaf',w:leaf,d:r.leaf,h:clearHeight-r.bottom,x:value(f,'slidingOpen')?l.opened:l.closed,z:0,bottom:r.bottom,side:l.side});
 return {opening,pocket,clearHeight,leaves,parts};
}
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
 if(!f.obj&&family(f,'side-table'))return (root.FurnishSideTable||require('./side-table-core.js')).outline(f);
 if(!f.obj&&definition(f)?.washerMotion)return (root.FurnishWasherMotion||require('./washer-motion-core.js')).outline(f);
 if(!f.obj&&definition(f)?.hoodMotion)return (root.FurnishHoodMotion||require('./hood-motion-core.js')).outline(f);
 if(!f.obj&&definition(f)?.foldAsset)return (root.FurnishDishwasherFold||require('./dishwasher-fold-core.js')).outline(f);
 if(!f.obj&&definition(f)?.fridgeMotion)return (root.FurnishFridge||require('./fridge-core.js')).outline(f);
 const b=assemblyBounds(f);if(b)return [[b.left,b.back],[b.right,b.back],[b.right,b.front],[b.left,b.front]];
 const shape=!f.obj&&definition(f)?.planShape;if(!shape)return null;
 const count=segments||shape.segments,signed=v=>Math.abs(v)<1e-12?0:Math.sign(v)*Math.pow(Math.abs(v),shape.exponent);
 return Array.from({length:count},(_,i)=>{const t=i*2*Math.PI/count;return [f.w/2*signed(Math.sin(t)),f.d/2*signed(Math.cos(t))];});
}
function planOutline(f,segments,context){
 if(!f.obj&&definition(f)?.telescopic?.allMoving)return slidingLayout(f,context?slidingCorner(f,context.furniture,context.plan):null).railOutline;
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

function coveringLayout(f){
 const spec=definition(f)?.covering;if(!spec||f.obj)return null;
 const h=height(f),open=value(f,'curtainOpen'),parts=[],add=(role,w,d,h,x,bottom,z=0,angle=0)=>parts.push({role,w,d,h,x,bottom,z,angle});
 if(spec.soft)return {...spec,open,h,count:value(f,'curtainStyle')==='single'?1:2,parts};
 const r=coverSpecs,head=Math.min(r.head,h*.15),hem=Math.min(r.hem,h*.08),available=h-head-hem,stack=spec.kind==='roller'||spec.kind==='zebra'||spec.kind==='bamboo'?Math.min(75,available*.25):Math.min(available*.25,Math.max(40,spec.kind==='venetian'?Math.ceil(available/r.slatPitch)*r.slatThickness*1.8:available*.055)),drop=available*(1-open)+stack*open,bottom=h-head-drop-hem;
 add('headrail',f.w,f.d,head,0,h-head);add('bottom-rail',f.w,Math.min(f.d,20),hem,0,bottom);
 if(spec.kind==='roller')add('cloth',f.w,Math.min(r.sheet,f.d),drop,0,bottom+hem);
 if(spec.kind==='zebra'){
  const band=Math.min(r.band,available/4),offset=value(f,'shadeMode')==='night'?band:0;
  for(const [layer,z]of [[0,-f.d*.15],[1,f.d*.15]]){
   add('sheer',f.w,r.sheet,drop,0,bottom+hem,z);
   for(let i=-1;i<Math.ceil(drop/(band*2))+1;i++){const start=i*band*2+(layer?offset:0),a=Math.max(0,start),b=Math.min(drop,start+band);if(b>a)add('opaque-band',f.w,r.sheet,b-a,0,bottom+hem+a,z+2);}
  }
 }
 if(spec.kind==='venetian'){
  const count=Math.min(160,Math.max(2,Math.ceil(available/r.slatPitch))),pitch=drop/count,depth=Math.min(f.d-4,available/count*.98),thickness=r.slatThickness,wanted=value(f,'blindAngle')*Math.PI/180*(1-open);let angle=wanted;for(let i=0;i<24&&Math.sin(angle)*depth+Math.cos(angle)*thickness>pitch*.99;i++)angle*=.9;const span=Math.abs(Math.sin(angle))*depth+Math.abs(Math.cos(angle))*thickness;
  for(let i=0;i<count;i++){const center=bottom+hem+(drop-span)/Math.max(1,count-1)*i+span/2;add('slat',f.w,depth,thickness,0,center-thickness/2,0,angle);}
 }
 if(spec.kind==='bamboo'){
  const count=Math.min(280,Math.max(2,Math.ceil(drop/r.bambooPitch))),pitch=drop/count;
  for(let i=0;i<count;i++)add('bamboo-reed',f.w,Math.min(5,f.d*.2),pitch*.86,0,bottom+hem+i*pitch);
  for(const x of [-.3,.3])add('binding',2,Math.min(2,f.d*.1),drop,f.w*x,bottom+hem,Math.min(4,f.d*.3));
 }
 if(spec.kind==='honeycomb'){
  const count=Math.min(120,Math.max(2,Math.ceil(available/r.cellPitch))),pitch=drop/count,depth=Math.min(f.d-4,35),length=Math.hypot(pitch/2,depth/2),angle=Math.atan2(depth,pitch),thickness=Math.min(1,pitch*.08);
  for(let i=0;i<count;i++)for(const [side,half]of [[-1,0],[1,0],[-1,1],[1,1]]){const center=bottom+hem+(i+(half?.75:.25))*pitch;add('cell-wall',f.w,thickness,length,0,center-length/2,side*depth/4,(half?-1:1)*side*angle);}
 }
 return {...spec,open,h,head,hem,drop,bottom,parts};
}
const supports=(f,key)=>key==='groupId'||definition(f)?.fields?.includes(key)||false;
const family=(f,name)=>definition(f)?.family===name;
const value=(f,key)=>f[key]??definition(f)?.defaults?.[key];
const footprintMinimum=(f,key)=>!f.obj&&key==='d'&&definition(f)?.telescopic?.leafDepth?definition(f).telescopic.panels*definition(f).telescopic.leafDepth:Number.isFinite(f?.[key])&&f[key]>0?Math.min(50,f[key]):50;
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
function validate(f){const st=definition(f)?.sideTable;if(!f.obj&&st&&(f.w<st.minWidth||f.d<st.minDepth||height(f)<st.minHeight))throw Error(`边几布局草模宽至少${st.minWidth}、深至少${st.minDepth}、高至少${st.minHeight} mm`);if(definition(f)?.covering&&f.type!=='curtain'&&(![f.w,f.d,height(f)].every(Number.isFinite)||f.w<100||f.d<20||height(f)<100))throw Error('通用窗饰模型宽至少100、深至少20、高至少100mm');pocketLayout(f);if(!f.obj&&definition(f)?.telescopic?.leafDepth)slidingTracks(f);for(const key of Object.keys(fields))if(f[key]!==undefined)validateField(f,key,f[key]);manifoldLayout(f);if(family(f,'pipe-box')&&!f.obj)pipeBoxPanels(f);if(vesselSink(f)&&(![f.w,f.d].every(v=>Number.isFinite(v)&&v>=definition(f).vessel.minSize)))throw Error('台上盆宽深至少 80 mm');return f;}
// User-facing kinds are independent of renderer IDs, product identities and plan names.
const kindGroups={
 '占位体':'block', '平板灯':'panel_light_300x600', '浴霸':'bath_heater_aopu_se2 bath_heater_300x600',
 '筒灯':'downlight_philips_dl269', '地暖分水器':'heating_manifold', '强电箱':'electrical_box_strong', '弱电箱':'electrical_box_weak',
 '鱼缸':'aquarium_mijia_2pro', '燃气灶':'stove stove_fotile_th36b', '抽油烟机':'rangehood_fotile_jcd10ta',
 '冰箱':'fridge fridge_french_drawer', '洗衣机':'washer washer_littleswan_tg10k60w', '烘干机':'dryer',
 '电热水器':'waterheater waterheater_flat', '电视':'tv', '立式空调':'aircon aircon_midea_ultra_2hp', '壁挂空调':'acwall',
 '洗碗机':'dishwasher dishwasher_mijia_countertop', '净水器':'water_purifier_mijia_1200g', '茶吧机':'tea_bar_mijia_pro',
 '空气净化器':'purifier', '扫拖机器人':'robot_p20max', '扫拖机器人套装':'robot_p20max_tank robot_p20max_plumbed',
 '管道包覆柜':'pipebox', '收纳柜':'cabinet', '床头柜':'nightstand', '衣柜':'wardrobe', '斗柜':'chest',
 '书柜':'bookshelf bookshelf_yeswood_y52y09', '电视柜':'tvstand', '鞋柜':'shoecab', '床':'bed', '婴儿床':'crib',
 '单人沙发椅':'armchair armchair_yeswood_y09hs', '沙发':'sofa sofa_yeswood_cherry', '转角沙发':'cornersofa', '懒人沙发':'beanbag',
 '茶几':'coffeetable coffeetable_yeswood_cherry', '茶台':'tea_table_800', '梳妆台':'dresser', '书桌':'desk',
 '圆桌':'roundtable', '边几':'sidetable sidetable_tmall_635382906309', '餐桌':'table',
 '折叠餐桌':'table_folding_1100 table_folding_1200 table_folding_1300', '岛台':'island', '橱柜':'counter',
 '水槽':'ksink sink_arrow_680 sink_arrow_750', '厨房吊柜':'kitchenwall', '蒸烤箱高柜':'ovencol',
 '换鞋凳':'bench bench_yeswood_oak', '椅子':'chair', '吧椅':'barstool', '办公椅':'officechair',
 '浴室柜':'vanity', '马桶':'toilet', '淋浴房':'shower', '花洒':'shower_arrow_cream', '浴缸':'bathtub',
 '落地灯':'floorlamp', '吊灯':'pendant', '飘窗垫':'baycushion', '地毯':'rug', '布帘':'curtain', '纱帘':'curtain_sheer',
 '百叶帘':'blind_venetian', '蜂巢帘':'blind_honeycomb', '柔纱帘':'blind_zebra', '竹帘':'blind_bamboo', '卷帘':'blind_roller',
 '绿植':'plant', '装饰画':'wallart', '镜子':'mirror', '钢琴':'piano', '跑步机':'treadmill',
 '口袋门':'pocketdoor_double pocketdoor_triple', '推拉门':'slidingdoor', '联动推拉门':'telescopicdoor20 doubleslidingdoor tripleslidingdoor',
 '联动推拉窗':'tripleslidingwindow', '猫爬架':'cat_tree', '宠物喂食器':'pet_feeder_mijia_2', '猫砂盆':'litter_box', '晾衣架':'dryingrack',
 '自定义家具':'custom customround'
};
const kinds=Object.freeze(Object.fromEntries(Object.entries(kindGroups).flatMap(([kind,ids])=>ids.split(' ').map(id=>[id,kind]))));
function kind(f){const id=typeof f==='string'?f:f?.type;return definition(f)?.kind||(Object.hasOwn(kinds,id)?kinds[id]:'未分类');}
function supportsAction(f,action){return !f?.obj&&!!definition(f)?.actions?.includes(action);}
// Exact historical defaults only: personal plan names are never inferred or overwritten.
function upgradeIdentity(f){return f.type==='washer_littleswan_tg10k60w'&&f.name==='小天鹅 TG10K60W · 10kg'?{...f,name:'小天鹅洗衣机 TG10K60W · 10kg'}:f;}
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
 return {...result,...(definition(f)?.defaultFrontClearance!==undefined?{frontClearance:definition(f).defaultFrontClearance}:{}),...definition(f)?.identity};
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
// Reservation covers depth-scaled reference and fitted rigid leaf reach; installation distances stay absolute mm.
function dishwasherInstallation(f){
 const def=definition(f);if(!def?.foldDoor||f.obj)return null;const spec=def.foldDoor,bottom=value(f,'mountHeight'),h=height(f),extension=Math.max(f.d*(spec.openDepth-spec.nominalDepth)/spec.nominalDepth,250*h/spec.nominalHeight);
 return {...def.installation,bottom,top:bottom+h,extension,openDepth:f.d+extension,openingBottom:bottom+Math.min(h*spec.openingBottom/spec.nominalHeight,70*h/spec.nominalHeight-18*Math.min(h/spec.nominalHeight,f.d/spec.nominalDepth)),openingTop:bottom+h*spec.openingTop/spec.nominalHeight,nominal:Math.abs(f.w-spec.nominalWidth)<1e-6&&Math.abs(f.d-spec.nominalDepth)<1e-6&&Math.abs(h-spec.nominalHeight)<1e-6};
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
 if(family(f,'window-covering')||['rug','curtain'].includes(f.type)||definition(f)?.embedded||f.counterLink?.hostId||f.laundryHostId)return false;
 if(!range)return null;
 return range.bottom<=1e-6&&range.top>1e-6;
}
function validateDatum(work){if(work?.furnitureDatum!==undefined&&!furnitureDatum.values.includes(work.furnitureDatum))throw Error('家具高度基准须为毛坯或完成地面');}
function vertical(f){
 if(!f.obj&&definition(f)?.hoodMotion){const b=(root.FurnishHoodMotion||require('./hood-motion-core.js')).bounds(f),z=value(f,'mountHeight');return {bottom:z+b.bottom,top:z+b.top,source:'model'};}
 if(!f.obj&&definition(f)?.foldAsset){const b=(root.FurnishDishwasherFold||require('./dishwasher-fold-core.js')).bounds(f),z=value(f,'mountHeight');return {bottom:z+b.bottom,top:z+b.top,source:'model'};}
 const b=assemblyBounds(f);if(b)return {bottom:b.bottom,top:b.top,source:'model'};
 if(vesselSink(f)){const base=f.counterElevation??862;return {bottom:base,top:base+Math.max(value(f,'sinkBowlHeight')+definition(f).vessel.faucetClearance,definition(f).vessel.faucetRise),source:'model'};}
 if(f.type==='ksink'&&(f.sinkNotch||f.sinkBowlHeight!==undefined)){const base=f.counterElevation??862,r=definition(f).notch;return {bottom:base-sinkBodyDepth(f),top:base+r.faucetRise,source:'model'};}
 if(family(f,'arrow-sink')){const {bottom,top}=sinkInstallation(f);return {bottom,top,source:'model'};}
 if(f.kitchen){const bottom=f.type==='kitchenwall'?value(f,'mountHeight'):0;return {bottom,top:f.kitchen.laundry?.assembly?kitchen().laundryHeight(f):bottom+kitchen().overallHeight(f),source:'recorded'};}
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
 if(definition(next)?.washerProfile||definition(next)?.ceilingPanel||definition(next)?.downlight||definition(next)?.manifold||family(next,'floor-aircon')||family(next,'tea-bar')||family(next,'placeholder')||family(next,'under-sink-purifier')||family(next,'pipe-box')||family(next,'folding-table')||family(next,'arrow-sink')||['stove_fotile_th36b','rangehood_fotile_jcd10ta','aquarium_mijia_2pro','dishwasher_mijia_countertop'].includes(next.type)){for(const [key,v] of Object.entries(initial(next)))if(next[key]===undefined||key==='brand'||key==='model'||key==='sourceUrl'&&!next[key])next[key]=v;}
 if(family(next,'folding-table')&&previous.type===next.type){const full=foldingTableGeometry({...candidate,foldingTablePose:candidate.foldingTablePose??'round'}).fullDepth;next.d=full*foldingTableGeometry(next).ratio;}
 if(supports(next,'curtainStyle'))next.curtainStyle=candidate.curtainStyle??value({type:next.type},'curtainStyle');
 if(family(next,'window-covering'))next.frontClearance=candidate.frontClearance??definition(next).defaultFrontClearance;
 if(family(next,'window-covering'))for(const key of definition(next).fields)if(candidate[key]!==undefined||next[key]===undefined)next[key]=candidate[key]??value({type:next.type},key);
 if(next.type==='ksink'){customSinkCandidate(next,candidate);validate(next);}
 if(family(next,'arrow-shower')){delete next.mountHeight;next.showerMixerHeight=previous.type===next.type?showerInstallation(previous).mixer:value({type:next.type},'showerMixerHeight');for(const [key,v] of Object.entries(definition(next).identity))next[key]=candidate[key]||v;}
 if(next.type==='tripleslidingwindow')next.mountHeight=previous.type===next.type?value(previous,'mountHeight'):value({type:next.type},'mountHeight');
 if(next.type==='kitchenwall')next.mountHeight=previous.type===next.type?value(previous,'mountHeight'):value({type:next.type},'mountHeight');
 if(definition(next)?.manifold||family(next,'pipe-box'))validate(next);return next;
}
// Shared millimetre track geometry. The leading leaf is furthest from the stack.
const slidingGlass=Object.freeze({color:'#f7fcff',planColor:'#f3fafc',opacity:.18,roughness:.12});
const slidingTrackSpec=Object.freeze({floorWidth:4,floorHeight:8,hangingClearance:4});
const slidingFloorHeight=f=>Math.min(slidingTrackSpec.floorHeight,height(f)/20);
const slidingBottom=(f,enabled=value(f,'floorTrack'))=>enabled?slidingFloorHeight(f):slidingTrackSpec.hangingClearance;
function slidingTracks(f,{panels=definition(f)?.telescopic?.panels??3,slim=true,order=value(f,'slidingTrackOrder')??'leading-front',leafDepth:fixedDepth=definition(f)?.telescopic?.leafDepth}={}){
 if(fixedDepth&&Number.isFinite(f.d)&&f.d<panels*fixedDepth)throw Error('整组深度至少 '+(panels*fixedDepth)+' mm，才能容纳 '+panels+' 扇各厚 '+fixedDepth+' mm 的门扇');
 const leafDepth=fixedDepth??Math.min(slim?18:25,f.d/(panels+1)*.7),pitch=(f.d-leafDepth)/(fixedDepth?panels-1:panels),direction=order==='leading-back'?-1:1;
 return {panels,leafDepth,pitch,direction,leadingOffset:(panels-1)/2*pitch*direction};
}
function slidingLayout(f,corner=null,options={}){
 const allMoving=options.allMoving??definition(f)?.telescopic?.allMoving;
 if(allMoving){
  const tracks=slidingTracks(f,options),edge=Math.min(16,f.w/20,height(f)/12),jamb=9,side=options.stackSide??value(f,'slidingStackSide'),sign=side==='right'?-1:1;
  // The far parking rail stays fixed when a neighbor changes the closing end.
  const baseWidth=(f.w-2*jamb+edge)/2,end=corner?corner.leafEnd*sign:f.w/2-jamb,width=(end+f.w/2-jamb+edge)/2,step=width-edge;
  const railStart=-f.w/2-baseWidth-jamb,railEnd=f.w/2,parked=railStart+jamb+width/2,first=-f.w/2+jamb+width/2;
  const railOutline=corner?[[railStart*sign,-f.d/2],[corner.x-corner.slope*f.d/2,-f.d/2],[corner.x+corner.slope*f.d/2,f.d/2],[railStart*sign,f.d/2]]:[[railStart*sign,-f.d/2],[railEnd*sign,-f.d/2],[railEnd*sign,f.d/2],[railStart*sign,f.d/2]];
  const leaves=Array.from({length:2},(_,i)=>({x:(first+step*i)*sign,opened:parked*sign,z:(i-.5)*tracks.pitch*tracks.direction,width}));
  const half=slidingTrackSpec.floorWidth/2,cut=z=>corner?corner.x+corner.slope*z:railEnd*sign,floorTracks=leaves.map((leaf,i)=>({leafIndex:i,z:leaf.z,start:railStart*sign,end:cut(leaf.z),outline:[[railStart*sign,leaf.z-half],[cut(leaf.z-half),leaf.z-half],[cut(leaf.z+half),leaf.z+half],[railStart*sign,leaf.z+half]]}));
  return {...tracks,allMoving:true,edge,jamb,width,mirrored:sign<0,railOutline,leaves,floorTracks,floorRailHeight:slidingFloorHeight(f),bottomClearance:corner?.floorClearance??slidingBottom(f,options.floorTrack??value(f,'floorTrack'))};
 }
 const tracks=slidingTracks(f,options),slim=options.slim??true,edge=Math.min(slim?16:28,f.w/20,height(f)/12),jamb=slim?9:edge;
 const mirrored=(options.stackSide??(corner?.side==='left'?'right':'left'))==='right',sign=mirrored?-1:1,end=corner?corner.leafEnd*sign:f.w/2-jamb;
 const width=(end+f.w/2-jamb+(tracks.panels-1)*edge)/tracks.panels,step=width-edge,opened=-f.w/2+jamb+width/2;
 const railOutline=corner?[[sign*-f.w/2,-f.d/2],[corner.x-corner.slope*f.d/2,-f.d/2],[corner.x+corner.slope*f.d/2,f.d/2],[sign*-f.w/2,f.d/2]]:[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]];
 const leaves=Array.from({length:tracks.panels},(_,i)=>({x:(opened+step*i)*sign,opened:opened*sign,z:(i-(tracks.panels-1)/2)*tracks.pitch*tracks.direction,width}));
 const movingOnly=options.floorTrackMode?options.floorTrackMode==='moving':!!definition(f)?.telescopic,half=slidingTrackSpec.floorWidth/2,cut=z=>corner?corner.x+corner.slope*z:sign*f.w/2;
 const floorTracks=leaves.flatMap((leaf,i)=>movingOnly&&Math.abs(leaf.x-leaf.opened)<=1e-6?[]:[{leafIndex:i,z:leaf.z,start:sign*-f.w/2,end:cut(leaf.z),outline:[[sign*-f.w/2,leaf.z-half],[cut(leaf.z-half),leaf.z-half],[cut(leaf.z+half),leaf.z+half],[sign*-f.w/2,leaf.z+half]]}]);
 return {...tracks,edge,jamb,width,mirrored,railOutline,leaves,floorTracks,floorRailHeight:slidingFloorHeight(f),bottomClearance:corner?.floorClearance??slidingBottom(f,options.floorTrack??value(f,'floorTrack'))};
}
// Resizing uses the far stacking end of the complete rail as its fixed datum.
function slidingResizeFrame(f){
 if(f.obj||!definition(f)?.telescopic?.allMoving)return null;
 const layout=slidingLayout(f),xs=layout.railOutline.map(p=>p[0]),lo=Math.min(...xs),hi=Math.max(...xs),flip=f.flip?-1:1,sign=(value(f,'slidingStackSide')==='right'?-1:1)*flip;
 const x=value(f,'slidingStackSide')==='right'?hi:lo,y=-f.d/2*sign,a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),point=(x,y)=>[f.cx+x*flip*c-y*s,f.cy+x*flip*s+y*c],center=point((lo+hi)/2,0);
 return {local:[x*flip,y],anchor:point(x,y),proxy:{...f,type:'custom',w:hi-lo,d:f.d,cx:center[0],cy:center[1],rot:(f.rot||0)+(sign<0?180:0),flip:false}};
}
function resizeSliding(f,values){
 const next={...f,...values};validate(next);const before=slidingResizeFrame(f),after=slidingResizeFrame(next);
 if(before&&after){next.cx+=before.anchor[0]-after.anchor[0];next.cy+=before.anchor[1]-after.anchor[1];}return next;
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
   if(definition(v).telescopic.allMoving&&side===value(v,'slidingStackSide'))continue;
   // Rectangular leaves meet end-to-face, never on the rail's miter plane.
   // One leaf runs through the joint; the other stops at its near surface.
   // Directed corner axes choose complementary roles, independent of IDs.
   const otherTracks=slidingTracks(other),through=cross(u,q)*Math.sign(t)*Math.sign(s)>0;
   const otherNormal=[-q[1],q[0]],leafEnd=(t+dot(otherNormal,u)*otherTracks.leadingOffset+Math.sign(t)*(through?1:-1)*otherTracks.leafDepth/2)*flip;
   const slope=-Math.sign(t)*flip*other.d/(dot(towardOther,normal)*v.d),layout=slidingLayout(v,{side,leafEnd,x,slope});if(layout.width<=2*layout.edge)continue;
   const floorClearance=Math.max(slidingBottom(v),otherBase.z-base.z+slidingBottom(other));
   out.push({other,side,x,leafEnd,through,floorClearance,slope,partnerLeafDepth:otherTracks.leafDepth});
  }return out;
 };
 const hits=candidates(f);if(hits.length!==1)return null;const reciprocal=candidates(hits[0].other);if(reciprocal.length!==1||reciprocal[0].other.id!==f.id)return null;
 const {other,side,x,slope,leafEnd,through,floorClearance,partnerLeafDepth}=hits[0];return {partnerId:other.id,side,x,slope,leafEnd,through,floorClearance,partnerLeafDepth};
}
// Derived geometry capability; no field is added to saved furniture instances.
function serviceCut(f){const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);return !f.obj&&(C.supported(f)||['counter','vanity'].includes(f.type));}
// Ceiling defaults describe design examples, not manufacturer requirements.
const ceiling={min:.1,epsilon:1e-6,max:20000,maxVertices:128,maxItems:200,maxRegions:100,maxSections:8,snapPixels:12,flatThickness:12,newChannelEnabled:false,aluminum:{width:300,length:600,thickness:8,gap:1,trim:20,direction:0,maxAngle:360,maxPanels:2000},uniformInset:200,sectionRotationStep:15,sectionRotationTolerance:4,
 corner:{maxLegs:2,angle:90,lightSetback:0,lightRadius:8,compactInnerRadius:1,arcChordError:.05,arcMaxAngle:3,arcMaxSegments:1024},
 endCap:{thickness:12,lightGap:5},
 lowCove:{drop:300,projection:70,back:20,bottom:10,front:10,lip:30},light:{u:40,d:290,angle:-90,width:10,thickness:2},
 // Design examples; the wash-channel envelope is read from the user's image.
 componentPresets:{gypsum:[{id:'plain',name:'封闭边吊'},{id:'low',name:'窄边托板'},{id:'wide',name:'宽边托板'}],channel:[{id:'wash',name:'43.5 mm 洗顶灯槽'},{id:'upMount',name:'39 mm 上发光 · 安装卡槽'},{id:'up',name:'39 mm 上发光 · 简化'}]},
 soffit:{drop:250,projection:300,back:12,bottom:12,front:12},
 sectionPresets:{low:{drop:300,projection:70,back:20,bottom:10,front:10,lip:30},wide:{drop:250,projection:300,back:12,bottom:12,front:12,lip:40}},
 washChannel:{width:43.5,height:18.5,clearWidth:12.5,wall:2,gap:8},
 // 39 / 22.5 / 13.6 / 18.6 are user-image labels. Remaining values are editable design assumptions.
 upChannel:{mountDetail:false,mountProjection:4,mountHeight:7,mountBridge:3.5,mountFootHeight:4.5,mirrorU:false,mirrorD:false,rotation:0,width:39,bodyWidth:22.5,opening:13.6,height:18.6,wall:1.5,rail:2,wingThickness:1.5,u:300,d:238,diffuserEnabled:true,diffuserThickness:1,diffuserInset:.5,lightEnabled:true,lightWidth:10,lightThickness:2,lightOffsetU:0,lightOffsetD:0,lightAngle:-90}};
const api={kind,kinds,supportsAction,upgradeIdentity,wardrobeHanging,coveringLayout,coverSpecs,pocketLayout,cabinetTopClosure,cabinetConstruction,slidingGlass,slidingResizeFrame,resizeSliding,slidingLayout,slidingTracks,slidingCorner,downlightSpec,editDownlight,manifoldLayout,editManifold,resizeManifold,footprintMinimum,dimensions,assemblyBounds,pegboardAssembly,planBodyOutline,planOutline,floorStanding,teaBarDoors,teaBarOpeningZones,sinkBodyDepth,vesselSink,ceiling,types,fields,definition,supports,family,value,height,cabinetSpec,cabinetBase,validateField,validate,modelError,initial,migrate,pipeBoxSignature,pipeBoxSides,pipeBoxPanels,hobCutout,editHobCutout,foldingTableGeometry,foldingTableOutline,editFoldingTablePose,dishwasherInstallation,sinkInstallation,showerInstallation,hoodInstallation,editHoodGeometry,resizeHoodGeometry,furnitureDatum,floorHost,floorBase,validateDatum,vertical,replacementResizeSource,replacement,serviceCut};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishProducts=api;
})(typeof globalThis!=='undefined'?globalThis:this);
