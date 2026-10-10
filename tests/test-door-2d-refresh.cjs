const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const nodes=new Map(),$=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:''});return nodes.get(s);};
const base={h:[0,0],c:[1,0],o:[0,1],len:900,entry:false,rect:[0,0,900,200]};
const ctx=vm.createContext({$,window:{},ui:{guides:null},state:{open:{d:{}},rooms:{},demolished:[],furniture:[]},DOORS:[{...base,h:[...base.h],c:[...base.c],o:[...base.o]}],WINS:[],SLIDES:[],PAL:{winLine:'#000',ink:'#000',leaf:'#fff'}});
vm.runInContext(fs.readFileSync(require.resolve('../src/render/plan-renderer.js'),'utf8'),ctx);
// Preserve the real renderAll/renderOpenings and opening button handlers.
for(const name of ['syncCustomArchitecture','renderGrid','renderRooms','renderFurn','renderWalls','renderLabels','renderMeasure','renderNotes','renderSel','renderPanel','updateHeader'])ctx[name]=()=>{};
ctx.applyOpeningOverrides=()=>{const value=ctx.state.open.d[0]||base;ctx.DOORS[0]={...base,h:[...value.h],c:[...value.c],o:[...value.o]};};
ctx.mutate=fn=>{fn();ctx.renderAll();};ctx.tr=s=>s;ctx.esc=s=>s;ctx.ico=()=>'';ctx.select=()=>{};
vm.runInContext(fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8'),ctx);
ctx.renderPanel=()=>{};ctx.renderAll();const initial=$('#gOpen').innerHTML;
ctx.bindOpeningPanel({kind:'door',id:0});$('#oFlip').onclick();assert.notEqual($('#gOpen').innerHTML,initial);const flipped=$('#gOpen').innerHTML;
$('#oHinge').onclick();assert.notEqual($('#gOpen').innerHTML,flipped);$('#oReset').onclick();assert.equal($('#gOpen').innerHTML,initial);
const preview={walls:[],wins:[],doors:[{...base,h:[100,0],c:[1,0],o:[0,1]}],slides:[],rooms:[]},actual=ctx.DOORS;
ctx.WALLS=[];ctx.ROOMS=[];$('#gOpen').insertAdjacentHTML=(_,s)=>$('#gOpen').innerHTML+=s;ctx.renderArchitecturePreview(preview,null);assert.equal(ctx.DOORS,actual);
console.log('PASS flip swing, swap hinge and reset immediately redraw real 2D SVG; preview restores live geometry references');
