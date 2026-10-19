/* Shared parameter vocabulary for surface editing, presets and associations. */
(function(root){
'use strict';
const definitions={
 width:{label:'砖长 mm',group:'spec',kinds:['wall','floor'],min:20,max:6000},height:{label:'砖宽 mm',group:'spec',kinds:['wall','floor'],min:20,max:6000},angle:{label:'铺贴方向 °',group:'spec',kinds:['wall','floor'],min:-360,max:360},gap:{label:'砖缝宽 mm',group:'gap',kinds:['wall','floor'],min:0,max:50},
 grout:{label:'美缝颜色',group:'grout',kinds:['wall','floor']},enabled:{label:'启用排版',group:'enabled',kinds:['wall','floor']},material:{label:'地砖材质',group:'material',kinds:['floor']},
 offset:{label:'沿墙砖缝基准 mm',group:'origin',kinds:['wall'],min:-1e6,max:1e6},startHeight:{label:'竖向砖缝基准 mm',group:'height',kinds:['wall'],min:-20000,max:20000},reference:{label:'竖向参考基准',group:'height',kinds:['wall']},followFloor:{label:'跟随地砖起铺缝',group:'alignment',kinds:['wall']},
 originX:{label:'砖角 X · 原图 mm',group:'origin',kinds:['floor'],min:-1e6,max:1e6},originY:{label:'砖角 Y · 原图 mm',group:'origin',kinds:['floor'],min:-1e6,max:1e6},
 tileThickness:{label:'瓷砖厚度 mm',kinds:['wall','floor'],optional:true,min:0,max:1000},bondThickness:{label:'粘结层厚度 mm',group:'thickness',kinds:['wall'],optional:true,min:0,max:200},
 rawZ:{label:'毛坯地面标高 mm',group:'elevation',kinds:['floor'],optional:true,min:-20000,max:20000},baseThickness:{label:'粘结找平层 mm',group:'elevation',kinds:['floor'],optional:true,min:0,max:1000},mode:{label:'地面标高计算',group:'elevation',kinds:['floor']},targetZ:{label:'目标完成标高 mm',group:'elevation',kinds:['floor'],optional:true,min:-20000,max:20000},levelReference:{label:'参考房间',group:'elevation',kinds:['floor']},drop:{label:'低于参考房间 mm',group:'elevation',kinds:['floor'],optional:true,min:0,max:1000},bands:{label:'墙面上下分带',group:'bands',kinds:['wall']}
};
const groupLabels={spec:'规格与方向',gap:'缝宽',grout:'美缝颜色',material:'地砖材质',bands:'墙面分带',enabled:'启用状态',origin:'起铺位置',height:'墙面竖向基准',alignment:'墙地对缝',thickness:'墙面层厚',elevation:'地面标高与层厚'};
const groups=Object.keys(groupLabels),layoutGroups={spec:['width','height','angle'],gap:['gap'],origin:['offset'],height:['startHeight','reference']};
const supported=kind=>kind==='wall'?['spec','gap','grout','bands','origin','height','alignment','thickness','enabled']:['spec','gap','grout','material','origin','elevation','enabled'];
const group=(field,kind)=>field==='tileThickness'?(kind==='wall'?'thickness':'elevation'):definitions[field]?.group;
const patchGroups=(patch,kind)=>[...new Set(Object.keys(patch).map(k=>group(k,kind)).filter(Boolean))];
function hasGroup(v,k,kind){if(v.bands?.rows){const fields=layoutGroups[k];if(fields&&v.bands.rows.some(r=>fields.some(f=>Object.hasOwn(r.layout,f))))return true;if(k==='alignment'&&v.bands.rows.some(r=>r.followFloor!==undefined))return true;}return k==='spec'?['width','height','angle'].some(x=>Object.hasOwn(v.layout||{},x)):k==='gap'?Object.hasOwn(v.layout||{},'gap'):k==='origin'?kind==='wall'?Object.hasOwn(v.layout||{},'offset'):!!v.layout?.origin:k==='height'?['startHeight','reference'].some(x=>Object.hasOwn(v.layout||{},x)):k==='alignment'?v.followFloor!==undefined:k==='thickness'?!!v.finish:k==='elevation'?!!v.elevation:v[k]!==undefined;}
const api={definitions,groupLabels,groups,layoutGroups,supported,group,patchGroups,hasGroup};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishTileParameters=api;
})(typeof globalThis!=='undefined'?globalThis:this);
