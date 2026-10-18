/* Product capabilities shared by browser/Node. No DOM, storage or geometry engine. */
(function(root){
'use strict';
const numeric=(min,max,message)=>({min,max,message});
const kitchen=()=>root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);
const fields={
 laundryHostId:{string:true,max:200,message:'洗衣机柜关联编号无效'},
 groupId:{string:true,max:200,message:'家具组编号须为 1–200 字的非空字符串'},
 hoodPanelOpen:{boolean:true,message:'烟机面板开合设置无效'},
 dishwasherDoorOpen:{boolean:true,message:'洗碗机折叠门开合设置无效'},
 foldingTablePose:{values:['round','single','capsule'],message:'折叠桌形态须为圆桌、单边收起或胶囊桌'},
 hoodGeometry:{custom:true,message:'烟机几何尺寸无效'},
 hobCutout:{custom:true,message:'灶具开孔尺寸无效'},
 kitchen:{custom:true,message:'厨房配置无效'},
 sinkNotch:{custom:true,message:'水槽缺角无效'},
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
const hobCutoutLimits={min:1,max:20000};
const foldingTable={family:'folding-table',height:760,defaults:{foldingTablePose:'round'},fields:['foldingTablePose'],create:['foldingTablePose'],identity:{brand:'源氏木语/YESWOOD',model:'白蜡木原木色 · 象牙白岩板折叠餐桌',sourceUrl:'https://item.jd.com/10195288580856.html'}};
const types={
 table_folding_1100:{...foldingTable,folding:{diameter:1100,closedDepth:740,singleDepth:920,top:32,leg:75,apron:120}},
 table_folding_1200:{...foldingTable,folding:{diameter:1200,closedDepth:793,singleDepth:996.5,top:32,leg:75,apron:120}},
 table_folding_1300:{...foldingTable,folding:{diameter:1305,closedDepth:848,singleDepth:1075,top:32,leg:75,apron:120}},
 sink_arrow_680:{...arrowSink,identity:{brand:'ARROW/箭牌',model:'AE5568459G23-YNC',sourceUrl:'https://item.jd.com/100199201484.html'}},
 sink_arrow_750:{...arrowSink,identity:{brand:'ARROW/箭牌',model:'AE5575459G23-YNC',sourceUrl:'https://item.jd.com/100199201484.html'}},
 counter:{family:'kitchen',moduleDividers:true,drawerTiers:{boundaryResize:true,snapPixels:8,defaultCount:3,minCount:1,maxCount:10,minHeight:96,plinth:100,board:18,legacyOffset:150,legacyMin:60,styles:{standard:{label:'普通抽屉'},'dish-basket':{label:'碗碟篮（两外抽、三层）',minHeights:[300,220,100],hiddenTier:2,outerTier:1}}},kitchenDepth:{min:50,max:1200,drawerMin:72,emptyMinWidth:50},kitchenShapes:{straight:{runs:[0],ends:[0]},L:{runs:[0,1],ends:[0,1]},U:{runs:[0,1,2],ends:[0,2],independentResize:true,outerResize:true,runDepth:{min:50,max:1200}}},endResize:{fields:['length','cabinetDepth'],minLength:150,maxLength:3000,minDepth:50,maxDepth:1200},cornerPartitions:{sides:['left','right'],retained:false,roleDefaults:{drawer:true}},avoidance:{enabled:false,minDepth:150},fields:['kitchen'],create:['kitchen']},
 kitchenwall:{height:700,anchor:'bottom',defaults:{mountHeight:1480},hoodBay:{ceilingDefault:true,minSideGap:0},moduleDividers:true,moduleMaxWidth:6000,drawerTiers:{boundaryResize:true,snapPixels:8,defaultCount:3,minCount:1,maxCount:10,minHeight:96,plinth:0,board:18,legacyOffset:50,legacyMin:60},kitchenShapes:{straight:{runs:[0],ends:[0]},L:{runs:[0,1],ends:[0,1]},U:{runs:[0,1,2],ends:[0,2],independentResize:true,outerResize:true,runDepth:{min:50,max:1200}}},fields:['mountHeight','kitchen'],create:['mountHeight','kitchen']},
 stove_fotile_th36b:{embedded:true,measureSurfaceBoundary:true,surfaceMeasurement,hobCutout:{...hobCutoutLimits,widthRatio:660/750,depthRatio:350/440},height:138,defaults:{counterElevation:860},fields:['counterLink','counterElevation','hobCutout'],create:['counterElevation'],identity:{brand:'方太/FOTILE',model:'TH36B-T'}},
 rangehood_fotile_jcd10ta:{height:520,anchor:'bottom',hoodGeometry:{min:10,max:20000},defaults:{mountHeight:1315,hoodPanelOpen:false},fields:['mountHeight','hoodPanelOpen','hoodGeometry'],create:['mountHeight','hoodPanelOpen'],identity:{brand:'方太/FOTILE',model:'JCD10TA'}},
 stove:{measureSurfaceBoundary:true,surfaceMeasurement,hobCutout:{...hobCutoutLimits,inset:30},fields:['counterLink','counterElevation','hobCutout']},ksink:{fields:['counterLink','counterElevation','sinkNotch'],notch:{min:20,margin:80,bodyDepth:220,rim:20,floor:12,faucetRise:292}},
 washer:laundry,dryer:laundry,
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
// Optional kitchen door pairing keeps the historical leading single leaf by default.
types.counter.doorPairing=doorPairing;types.kitchenwall.doorPairing=doorPairing;
types.counter.laundry={sideThickness:18,sideMin:10,sideMax:50,width:1340,depth:630,baseHeight:900,thickness:20,bayWidth:640,notchMin:20,minRemainingDepth:150,area:{upperHeight:600,upperBottom:1800,upperDepth:350,openHeight:200,openBottom:1600,openDepth:320,serviceGap:100,notch:100,sinkWidth:600,sinkDepth:500}};
// Preserve historical model envelopes, including dimension-derived bounds.
const envelopes={acwall:()=>[2170,2510],waterheater:f=>[1300,1950+Math.min(f.d/2,230)],tv:f=>[1200-f.w*.5625/2,1200+f.w*.5625/2],wallart:f=>[1280,1280+Math.min(950,Math.max(500,f.w*.45))],mirror:()=>[50,1700],pendant:()=>[2100,2627],baycushion:()=>[450,900],stove:()=>[862,2330],ksink:()=>[850,1182],vanity:()=>[330,1960]};
for(const [type,envelope] of Object.entries(envelopes))types[type]={...types[type],envelope};
// Historical vanity body/installation, separate from its basin, faucet and mirror envelope.
types.vanity.cabinet={bodyHeight:450,bottom:330,aboveBody:1180,min:200,max:3200};
function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
freeze(fields);freeze(types);
const definition=f=>Object.hasOwn(types,typeof f==='string'?f:f?.type)?types[typeof f==='string'?f:f.type]:null;
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
 if(!valid)throw Error(rule.message);return v;
}
function validate(f){for(const key of Object.keys(fields))if(f[key]!==undefined)validateField(f,key,f[key]);return f;}
// Report broken model records without migrating, deleting or rewriting them.
function modelError(f){try{validate(f);if(f.cabinet)(root.FurnishCabinet||require('./cabinet-core.js')).validate(f);return null;}catch(e){return e.message||String(e);}}
function initial(f){const result={};for(const key of definition(f)?.create||[]){if(key==='kitchen'&&f.type==='kitchenwall'&&(!Number.isFinite(f.w)||!Number.isFinite(f.d)))continue;result[key]=key==='kitchen'?kitchen().defaults(f):value(f,key);}return {...result,...definition(f)?.identity};}
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
function vertical(f){
 if(f.type==='ksink'&&f.sinkNotch){const base=f.counterElevation??862,r=definition(f).notch;return {bottom:base-r.bodyDepth,top:base+r.faucetRise,source:'model'};}
 if(family(f,'arrow-sink')){const {bottom,top}=sinkInstallation(f);return {bottom,top,source:'model'};}
 if(f.kitchen){const bottom=f.type==='kitchenwall'?value(f,'mountHeight'):0;return {bottom,top:f.kitchen.laundry?.assembly?kitchen().laundryHeight(f):bottom+f.kitchen.baseHeight+((f.kitchen.laundry?.countertop===false)?0:f.kitchen.thickness),source:'recorded'};}
 if(f.type==='vanity'&&f.cabinet){const spec=cabinetSpec(f);return {bottom:spec.bottom,top:spec.bottom+(f.cabinet.bodyHeight??spec.bodyHeight)+spec.aboveBody,source:'recorded'};}
 if(f.type==='stove_fotile_th36b'){const h=height(f),base=value(f,'counterElevation');return {bottom:base-80*h/138,top:base+58*h/138,source:'model'};}
 if(['stove','ksink'].includes(f.type)&&f.counterElevation!==undefined)return {bottom:f.counterElevation-(f.type==='ksink'?200:0),top:f.counterElevation+(f.type==='ksink'?320:40),source:'model'};
 const def=definition(f);if(def?.envelope){const [bottom,top]=def.envelope(f);return {bottom,top:f.h===undefined?top:bottom+f.h,source:f.h===undefined?'model':'recorded'};}
 if(!def?.anchor)return null;if(def.anchor==='mixer'){const {bottom,top}=showerInstallation(f);return {bottom,top,source:'model'};}
 const bottom=value(f,'mountHeight');return {bottom,top:bottom+height(f),source:f.h===undefined||f.type==='tripleslidingwindow'?'model':'recorded'};
}
function retainReplacementField(previous,next,key){return key==='groupId'||supports(next,key)&&supports(previous,key)&&(key==='floorTrack'||previous.type===next.type||family(previous,'laundry')&&family(next,'laundry'));}
// Remove incompatible parameters before checking the replacement's outer size.
function replacementResizeSource(previous,candidate){const next={...previous};for(const key of Object.keys(fields))if(!retainReplacementField(previous,candidate,key))delete next[key];return next;}
function replacement(previous,next,candidate){
 if(previous.type==='vanity'){if(!candidate.cabinet)delete next.cabinet;if(candidate.h!==undefined)next.h=candidate.h;}
 for(const key of Object.keys(fields)){
  if(key==='groupId')continue; // Layout membership survives product replacement.
  // Family permits washer↔dryer and track styles; installation belongs to the
  // specific product except for the laundry family. Socket is a world point.
  const retain=retainReplacementField(previous,next,key);
  if(!retain)delete next[key];
 }
 if(family(next,'folding-table')||family(next,'arrow-sink')||['stove_fotile_th36b','rangehood_fotile_jcd10ta','aquarium_mijia_2pro','dishwasher_mijia_countertop'].includes(next.type)){for(const [key,v] of Object.entries(initial(next)))if(next[key]===undefined||key==='brand'||key==='model'||key==='sourceUrl'&&!next[key])next[key]=v;}
 if(family(next,'folding-table')&&previous.type===next.type){const full=foldingTableGeometry({...candidate,foldingTablePose:candidate.foldingTablePose??'round'}).fullDepth;next.d=full*foldingTableGeometry(next).ratio;}
 if(supports(next,'curtainStyle'))next.curtainStyle=candidate.curtainStyle??value({type:next.type},'curtainStyle');
 if(family(next,'arrow-shower')){delete next.mountHeight;next.showerMixerHeight=previous.type===next.type?showerInstallation(previous).mixer:value({type:next.type},'showerMixerHeight');for(const [key,v] of Object.entries(definition(next).identity))next[key]=candidate[key]||v;}
 if(next.type==='tripleslidingwindow')next.mountHeight=previous.type===next.type?value(previous,'mountHeight'):value({type:next.type},'mountHeight');
 if(next.type==='kitchenwall')next.mountHeight=previous.type===next.type?value(previous,'mountHeight'):value({type:next.type},'mountHeight');
 return next;
}
// Derived geometry capability; no field is added to saved furniture instances.
function serviceCut(f){const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);return !f.obj&&(C.supported(f)||['counter','vanity'].includes(f.type));}
// Ceiling defaults describe design examples, not manufacturer requirements.
const ceiling={min:.1,epsilon:1e-6,max:20000,maxVertices:128,maxItems:200,snapPixels:12,flatThickness:12,
 corner:{maxLegs:2,angle:90,lightSetback:0,lightRadius:8,compactInnerRadius:1,arcChordError:.05,arcMaxAngle:3,arcMaxSegments:1024},
 endCap:{thickness:12,lightGap:5},
 lowCove:{drop:300,projection:70,back:20,bottom:10,front:10,lip:30},light:{u:40,d:290,angle:-90,width:10,thickness:2}};
const api={ceiling,types,fields,definition,supports,family,value,height,cabinetSpec,cabinetBase,validateField,validate,modelError,initial,migrate,hobCutout,editHobCutout,foldingTableGeometry,foldingTableOutline,editFoldingTablePose,dishwasherInstallation,sinkInstallation,showerInstallation,hoodInstallation,editHoodGeometry,resizeHoodGeometry,vertical,replacementResizeSource,replacement,serviceCut};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishProducts=api;
})(typeof globalThis!=='undefined'?globalThis:this);
