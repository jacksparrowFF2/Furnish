const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),C=require('../src/core/cabinet-core.js');
const source=fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8');
const priceOf=f=>f.price??f.referencePrice??0;
const ctx=require('./helpers/layer-context.cjs').createContext({state:{},canvasEffectivePlan:()=>({rooms:[{id:'room',poly:[[0,0],[5000,0],[5000,5000],[0,5000]]}]}),FurnishDesign:D,FurnishProject:P,FurnishCabinet:C,priceOf,tr:a=>a,esc:a=>String(a),yen:n=>'¥'+n,window:{}});
vm.runInContext(source,ctx);
const base={id:'item',name:'测试',w:800,d:350,cx:1500,cy:1500,rot:0};
for(const [item,bottom,top] of [
 [{...base,type:'wardrobe',w:2400,d:600},0,2200],
 [{...base,type:'kitchenwall'},1480,2180],
 [{...base,type:'washer',h:850,mountHeight:870},870,1720],
 [{...base,type:'dishwasher_mijia_countertop'},860,1458],
 [{...base,type:'sink_arrow_680',w:680,d:450},620,1220],
 [{...base,type:'custom',h:1234.56789},0,1234.56789]
]){
 const before=JSON.stringify(item),html=ctx.furnitureDimensionSummary(item);
 assert(html.includes('>'+Number(bottom.toFixed(2))+' mm<'),html);
 assert(html.includes('>'+Number(top.toFixed(2))+' mm<'),html);
 assert.equal(JSON.stringify(item),before,'viewing a legacy summary must not materialize defaults or round stored inputs');
}
assert(ctx.furnitureDimensionSummary({...base,type:'unrecognised'}).includes('高度未知'));
assert(!ctx.furnitureDimensionSummary({...base,type:'unrecognised'}).includes('0 mm'));
assert.equal(ctx.furniturePriceText({...base}),'价格待填写');
assert.equal(ctx.furniturePriceText({...base,price:0}),'¥0 · 已确认价');
assert.equal(ctx.furniturePriceText({...base,referencePrice:0}),'¥0 · 参考价');
assert.equal(ctx.furniturePriceText({...base,referencePrice:23}),'¥23 · 参考价');

let current={...base,type:'custom'},history=[],errors=[];
const nodes=Object.fromEntries(['#fName','#fP','#full-product-details'].map(id=>[id,{}]));
Object.assign(ctx,{$:id=>nodes[id],document:{querySelectorAll:()=>[],querySelector:()=>null},getF:()=>current,mutate:fn=>{history.push({...current});fn();},toast:message=>errors.push(message)});
ctx.renderPanel=()=>{};ctx.bindFurnPanel(current);
nodes['#fP'].onchange({target:{value:'0'}});assert.equal(current.price,0);
nodes['#fP'].onchange({target:{value:''}});assert(!Object.hasOwn(current,'price'));
current.referencePrice=88;nodes['#fP'].onchange({target:{value:'9'}});nodes['#fP'].onchange({target:{value:''}});
assert.equal(current.referencePrice,88);assert.equal(ctx.furniturePriceText(current),'¥88 · 参考价');
for(const value of ['-1','NaN','Infinity'])nodes['#fP'].onchange({target:{value}});
assert.equal(history.length,4);assert.equal(errors.length,3);assert(!Object.hasOwn(current,'price'));

const plan={id:'p',rooms:[{id:'r',name:'厨房',poly:[[0,0],[5000,0],[5000,5000],[0,5000]]}],walls:[],doors:[],wins:[]};
const appliance={...base,type:'dishwasher_mijia_countertop',w:550,d:350},installation=P.dishwasherChecks(plan,appliance,{furniture:[appliance]});
const installationIssues=installation.checks.filter(v=>v.ok!==true),other={kind:'wall',id:appliance.id,message:'实体进入墙体'},related={...installationIssues[0],id:'other',otherId:appliance.id};
const ui=require('./helpers/layer-context.cjs').createContext({window:{},FurnishDesign:D,FurnishProject:{...P,effectivePlan:()=>plan,spaceCheck:()=>[...installationIssues,other,related]},PLAN:plan,state:{furniture:[appliance]},tr:a=>a,esc:a=>String(a),$:()=>({after(){},append(){}}),document:{createElement:()=>({})},FurnishWorkspace:{open(){}},renderHist(){},renderPanel(){}});
vm.runInContext(fs.readFileSync(require.resolve('../src/ui/design-ui.js'),'utf8'),ui);
const html=ui.window.FurnishDesignUI.placementPanel(appliance,{shownIssues:installation.checks});
assert(html.includes(other.message),'unrelated spatial risks stay visible');
assert(html.includes(related.message),'a different object with the same installation message stays visible');
assert.equal(html.split(related.message).length-1,1,'the current installation result is removed only from its duplicate placement row');
assert(html.includes('原户型 X/Y'),'wall-only inputs keep their original coordinate reference');
const before=JSON.stringify(appliance);
const packed=P.unpack(P.pack({planId:'p',current:{furniture:[appliance]},designs:[{name:'旧方案',work:{furniture:[appliance]}}],catalog:[]}));
assert.equal(JSON.stringify(packed.current.furniture[0]),before);assert.equal(JSON.stringify(packed.designs[0].work.furniture[0]),before);
const layer={},distance={a:{x:0,y:0},b:{x:100,y:0},distance:100,entity:{kind:'wall',id:'wall',name:'墙'}};
const renderer=require('./helpers/layer-context.cjs').createContext({tr:a=>a,esc:a=>String(a),view:{s:1},ui:{tool:'select',layers:{clear:true}},state:{measures:[{a:distance.a,b:distance.b},{a:{x:0,y:20},b:{x:200,y:20}}]},selItems:()=>[base],directionalMeasurements:()=>({r:distance}),drawingRotation:()=>0,PAL:{halo:'#fff'},COARSE:false,$:()=>layer});
vm.runInContext(fs.readFileSync(require.resolve('../src/render/plan-renderer.js'),'utf8'),renderer);
renderer.renderMeasure();assert(layer.innerHTML.includes('右 100 mm · 墙面'));assert(layer.innerHTML.includes('200 mm'));
assert(!/undefined|NaN/.test(layer.innerHTML),'matching and independent fixed measurements both render without invalid labels');
assert(renderer.clearanceSVG(base,1)==='','the preview still avoids duplicate fixed-endpoint measurements');
console.log('PASS legacy summary envelopes and unknowns, confirmed/reference zero, clearing prices without default migration, exact installation deduplication and named project preservation');
