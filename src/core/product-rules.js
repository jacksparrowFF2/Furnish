/* Product capabilities shared by browser/Node. No DOM, storage or geometry engine. */
(function(root){
'use strict';
const numeric=(min,max,message)=>({min,max,message});
const kitchen=()=>root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);
const fields={
 groupId:{string:true,max:200,message:'家具组编号须为 1–200 字的非空字符串'},
 hoodPanelOpen:{boolean:true,message:'烟机面板开合设置无效'},
 kitchen:{custom:true,message:'厨房配置无效'},
 counterLink:{custom:true,message:'台面关联无效'},
 counterElevation:numeric(0,2000,'台面离地高度须为 0–2000 mm'),
 mountHeight:numeric(0,20000,'设备底部离地高度须为 0–20000 mm'),
 stackHeight:numeric(0,1000,'洗烘连接层高度须为 0–1000 mm'),
 showerMixerHeight:numeric(0,40000,'混水器中心离地高度须为 0–40000 mm'),
 showerRise:numeric(100,500,'花洒顶部调节段须为 100–500 mm'),
 showerHandAngle:numeric(0,35,'手持花洒角度须为 0–35°'),
 curtainStyle:{values:['single','double'],message:'窗帘样式须为单开或双开'},
 floorTrack:{boolean:true,message:'轨道设置无效'},
 heaterSocket:{point:true,message:'热水器插座须有有效 X、Y 和 0–20000 mm 离地高度'}
};
const laundry={family:'laundry',height:850,anchor:'bottom',defaults:{mountHeight:0,stackHeight:20},fields:['mountHeight','stackHeight'],create:['mountHeight']};
const types={
 counter:{family:'kitchen',fields:['kitchen'],create:['kitchen']},
 kitchenwall:{height:700,anchor:'bottom',defaults:{mountHeight:1480},fields:['mountHeight'],create:['mountHeight']},
 stove_fotile_th36b:{embedded:true,height:138,defaults:{counterElevation:860},fields:['counterLink','counterElevation'],create:['counterElevation'],identity:{brand:'方太/FOTILE',model:'TH36B-T'}},
 rangehood_fotile_jcd10ta:{height:520,anchor:'bottom',defaults:{mountHeight:1315,hoodPanelOpen:false},fields:['mountHeight','hoodPanelOpen'],create:['mountHeight','hoodPanelOpen'],identity:{brand:'方太/FOTILE',model:'JCD10TA'}},
 stove:{fields:['counterLink','counterElevation']},ksink:{fields:['counterLink','counterElevation']},
 washer:laundry,dryer:laundry,
 waterheater_flat:{family:'flat-heater',height:565,anchor:'bottom',defaults:{mountHeight:1650},fields:['mountHeight','heaterSocket'],create:['mountHeight']},
 shower_arrow_cream:{family:'arrow-shower',height:1749,anchor:'mixer',defaults:{showerMixerHeight:1000,showerRise:400,showerHandAngle:180*.20/Math.PI},fields:['mountHeight','showerMixerHeight','showerRise','showerHandAngle'],create:['showerMixerHeight'],identity:{brand:'ARROW/箭牌',model:'AE34129ZMKW-P2'}},
 tripleslidingwindow:{family:'sliding',height:1500,anchor:'bottom',defaults:{mountHeight:900,floorTrack:true},fields:['mountHeight','floorTrack'],create:['mountHeight']},
 tripleslidingdoor:{family:'sliding',height:2400,defaults:{floorTrack:false},fields:['floorTrack']},
 slidingdoor:{family:'sliding',height:2100,defaults:{floorTrack:true},fields:['floorTrack']},
 curtain:{height:2400,defaults:{curtainStyle:'double'},fields:['curtainStyle'],create:['curtainStyle']},
 fridge:{height:1800},fridge_french_drawer:{height:1910},sofa_yeswood_cherry:{height:895},mirror:{height:1650},
 aircon:{height:1800},dishwasher:{height:840},rug:{height:16},bench:{height:440},beanbag:{height:720},barstool:{height:775},custom:{height:800},customround:{height:800},toilet:{height:796}
};
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
 if(key==='kitchen'){kitchen().validate({...f,kitchen:v});return v;}if(key==='counterLink'){kitchen().validateLink({...f,counterLink:v});return v;}
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 const valid=rule.point?v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>['x','y','z'].includes(k))&&[v.x,v.y,v.z].every(finite)&&Math.abs(v.x)<=1e6&&Math.abs(v.y)<=1e6&&v.z>=0&&v.z<=20000
  :rule.string?typeof v==='string'&&!!v.trim()&&v.length<=rule.max:rule.boolean?typeof v==='boolean':rule.values?rule.values.includes(v):finite(v)&&v>=rule.min&&v<=rule.max;
 if(!valid)throw Error(rule.message);return v;
}
function validate(f){for(const key of Object.keys(fields))if(f[key]!==undefined)validateField(f,key,f[key]);return f;}
// Report broken model records without migrating, deleting or rewriting them.
function modelError(f){try{validate(f);if(f.cabinet)(root.FurnishCabinet||require('./cabinet-core.js')).validate(f);return null;}catch(e){return e.message||String(e);}}
function initial(f){const result={};for(const key of definition(f)?.create||[])result[key]=key==='kitchen'?kitchen().defaults(f):value(f,key);return {...result,...definition(f)?.identity};}
// Legacy bottom datum is read, never filled into saved records implicitly.
function showerInstallation(f){const nominal=types.shower_arrow_cream.height,offset=646.889539615265*(f.h??nominal)/nominal,mixer=f.showerMixerHeight??(f.mountHeight!==undefined?f.mountHeight+offset:types.shower_arrow_cream.defaults.showerMixerHeight),bottom=mixer-offset;return {mixer,bottom,top:bottom+(f.h??nominal)*(1+(value(f,'showerRise')-types.shower_arrow_cream.defaults.showerRise)/nominal)};}
// Matches the production JCD10TA chimney; these are model dimensions, not installation clearances.
function hoodInstallation(f){if(f.type!=='rangehood_fotile_jcd10ta'||f.obj)return null;const h=height(f);return {bodyHeight:h*345/520,coverHeight:h*175/520,coverWidth:f.w*480/900,coverDepth:f.d*310/350,coverOffset:-f.d*20/350};}
function migrate(f){const next={...f};if(family(f,'arrow-shower')){next.showerMixerHeight=showerInstallation(f).mixer;delete next.mountHeight;}return next;}
function vertical(f){
 if(f.kitchen)return {bottom:0,top:f.kitchen.baseHeight+f.kitchen.thickness,source:'recorded'};
 if(f.type==='vanity'&&f.cabinet){const spec=cabinetSpec(f);return {bottom:spec.bottom,top:spec.bottom+(f.cabinet.bodyHeight??spec.bodyHeight)+spec.aboveBody,source:'recorded'};}
 if(f.type==='stove_fotile_th36b'){const h=height(f),base=value(f,'counterElevation');return {bottom:base-80*h/138,top:base+58*h/138,source:'model'};}
 if(['stove','ksink'].includes(f.type)&&f.counterElevation!==undefined)return {bottom:f.counterElevation-(f.type==='ksink'?200:0),top:f.counterElevation+(f.type==='ksink'?320:40),source:'model'};
 const def=definition(f);if(def?.envelope){const [bottom,top]=def.envelope(f);return {bottom,top:f.h===undefined?top:bottom+f.h,source:f.h===undefined?'model':'recorded'};}
 if(!def?.anchor)return null;if(def.anchor==='mixer'){const {bottom,top}=showerInstallation(f);return {bottom,top,source:'model'};}
 const bottom=value(f,'mountHeight');return {bottom,top:bottom+height(f),source:f.h===undefined||f.type==='tripleslidingwindow'?'model':'recorded'};
}
function replacement(previous,next,candidate){
 if(previous.type==='vanity'){if(!candidate.cabinet)delete next.cabinet;if(candidate.h!==undefined)next.h=candidate.h;}
 for(const key of Object.keys(fields)){
  if(key==='groupId')continue; // Layout membership survives product replacement.
  // Family permits washer↔dryer and track styles; installation belongs to the
  // specific product except for the laundry family. Socket is a world point.
  const retain=supports(next,key)&&supports(previous,key)&&(key==='floorTrack'||previous.type===next.type||family(previous,'laundry')&&family(next,'laundry'));
  if(!retain)delete next[key];
 }
 if(['stove_fotile_th36b','rangehood_fotile_jcd10ta'].includes(next.type)){for(const [key,v] of Object.entries(initial(next)))if(next[key]===undefined||key==='brand'||key==='model')next[key]=v;}
 if(supports(next,'curtainStyle'))next.curtainStyle=candidate.curtainStyle??value({type:next.type},'curtainStyle');
 if(family(next,'arrow-shower')){delete next.mountHeight;next.showerMixerHeight=previous.type===next.type?showerInstallation(previous).mixer:value({type:next.type},'showerMixerHeight');for(const [key,v] of Object.entries(definition(next).identity))next[key]=candidate[key]||v;}
 if(next.type==='tripleslidingwindow')next.mountHeight=previous.type===next.type?value(previous,'mountHeight'):value({type:next.type},'mountHeight');
 if(next.type==='kitchenwall')next.mountHeight=previous.type===next.type?value(previous,'mountHeight'):value({type:next.type},'mountHeight');
 return next;
}
// Derived geometry capability; no field is added to saved furniture instances.
function serviceCut(f){const C=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);return !f.obj&&(C.supported(f)||['counter','vanity'].includes(f.type));}
const api={types,fields,definition,supports,family,value,height,cabinetSpec,cabinetBase,validateField,validate,modelError,initial,migrate,showerInstallation,hoodInstallation,vertical,replacement,serviceCut};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishProducts=api;
})(typeof globalThis!=='undefined'?globalThis:this);
