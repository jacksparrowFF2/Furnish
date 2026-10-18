const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../src/render/plan-renderer.js'),'utf8'),D=require('../src/core/drawing-core.js');
let derives=0,dimensions=0,writes=0,html='';
const element={get innerHTML(){return html;},set innerHTML(value){html=value;writes++;},setAttribute(){}};
const plan={walls:[[0,0,6000,200],[0,0,200,4000],[5800,0,6000,4000],[0,3800,6000,4000]],doors:[],wins:[],slides:[],dims:[]};
const context={PLAN:plan,ui:{layers:{dims:true}},state:{rooms:{},furniture:[]},view:{s:.1},PAL:{dim:'#777'},LANG:'zh',tr:s=>s,$:()=>element,drawingRotation:()=>D.settings(context.state.drawing).rotation,FurnishProject:{effectivePlan(base,work){derives++;return structuredClone({...base,rooms:work.rooms});}},FurnishDrawing:{...D,dimensions(...args){dimensions++;return D.dimensions(...args);}}};
vm.createContext(context);vm.runInContext(source,context);
const run=()=>vm.runInContext('renderDims()',context);
run();const original=html;run();assert.equal(derives,1);assert.equal(dimensions,1);assert.equal(writes,1);
context.view.x0=100;run();assert.equal(writes,1,'pan must reuse dimension DOM');
context.state.furniture.push({cx:100,price:50});run();assert.equal(derives,1,'furniture edits do not change the architectural derivation');
context.view.s=.02;run();assert.equal(dimensions,1,'zoom reuses the dimension chains');assert.equal(writes,2);
context.PAL.dim='#f00';run();assert(html.includes('#f00'));assert.equal(dimensions,1);
context.state.drawing={rotation:90};run();assert.equal(dimensions,2);assert.notEqual(html,original);
plan.walls[0][2]=6500;run();assert.equal(derives,2);assert.equal(dimensions,3,'in-place architecture edits invalidate');
// Every work input consumed by effectivePlan must invalidate even on the same object.
for(const field of ['architecture','rooms','demolished','open','ceilingHeight','wallFinishes','floorFinishes','wallTiling','ceilings']){
 const before=derives;context.state[field]={probe:1};run();assert.equal(derives,before+1,field);context.state[field].probe=2;run();assert.equal(derives,before+2,field+' in place');delete context.state[field];run();
}
// Restoring an earlier value (undo/import) must not reuse the later geometry.
plan.walls[0][2]=6000;context.state.rooms={};context.state.drawing=undefined;context.PAL.dim='#777';context.view.s=.1;run();assert.equal(html,original);
html='external alteration';run();assert.equal(html,original,'repair replaced DOM');
vm.runInContext("withCanvasPlan(()=>{canvasEffectivePlan();withCanvasPlan(()=>canvasEffectivePlan());})",context);
assert.throws(()=>vm.runInContext("withCanvasPlan(()=>{canvasEffectivePlan();throw Error('draw failed');})",context),/draw failed/);
const beforeFailure=derives;context.state.ceilingHeight=3000;run();assert.equal(derives,beforeFailure+1,'a failed render must release its scoped plan');
console.log('PASS canvas cache: value-based architecture/finish invalidation, furniture exclusion, pan reuse, zoom/theme/rotation, undo and DOM replacement');
