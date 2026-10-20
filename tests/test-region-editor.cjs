// Exercise the real region controls, split readiness and save/undo handlers.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/zone-geometry.js');
const nodes=new Map();let overlay=null,dialog=null,serial=0,buildCalls=0;
class Element{
 constructor(){this.dataset={};this.style={};this.classList={toggle(){}};this.events={};this.value='';this.hidden=false;this.children=[];}
 set innerHTML(html){this.htmlWrites=(this.htmlWrites||0)+1;this.html=html;this.children=[];for(const tag of html.matchAll(/<[^/!][^>]*>/g)){const n=new Element();for(const a of tag[0].matchAll(/data-([\w-]+)="([^"]*)"/g))n.dataset[a[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=a[2];n.disabled=/\bdisabled\b/.test(tag[0]);if(Object.keys(n.dataset).length)this.children.push(n);const id=tag[0].match(/\bid="([^"]+)"/);if(id){n.value=tag[0].match(/\bvalue="([^"]*)"/)?.[1]||'';nodes.set('#'+id[1],n);}}for(const select of html.matchAll(/<select[^>]+id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g))nodes.get('#'+select[1]).value=select[2].match(/value="([^"]+)"/)?.[1]||'';}
 get innerHTML(){return this.html||'';}
 insertAdjacentHTML(_,html){const old=this.children,previous=this.html||'';this.innerHTML=html;this.children=[...old,...this.children];this.html=previous+html;}
 querySelector(s){const attr=s.match(/^\[data-([\w-]+)="([^"]+)"\]$/);if(attr){const key=attr[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return this.children.find(n=>n.dataset[key]===attr[2]);}return $(s);}
 querySelectorAll(s){const attr=s.match(/^\[data-([\w-]+)\]$/);if(!attr)return [];const key=attr[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return this.children.filter(n=>key in n.dataset);}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 setAttribute(){} after(el){if(overlay&&el)overlay.children.push(el);} before(){} focus(){} remove(){if(this===overlay)overlay=null;} setPointerCapture(){}
 getScreenCTM(){return {a:1,b:0,inverse(){return {};}};}
 createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x,y:this.y};}};}
}
const $=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);};$('#dlg').hidden=true;
const documentEvents={};
const document={createElement:()=>new Element(),querySelector:()=>overlay,addEventListener(k,fn){(documentEvents[k]??=[]).push(fn);},removeEventListener(){},body:{append(el){overlay=el;}}};
const d={version:1,id:'custom_region_ui',name:'区域测试',source:'dxf',image:'',width:2000,height:1500,scale:2,walls:[{id:'top',a:[0,50],b:[2000,50]},{id:'bottom',a:[0,1450],b:[2000,1450]},{id:'left',a:[50,100],b:[50,1400]},{id:'right',a:[1950,100],b:[1950,1400]}].map(w=>({...w,thickness:200,kind:'b',caps:[0,0]})),openings:[]};
const plan=C.build(d),state={architecture:{draft:d,phase:'survey'},rooms:{room1:{name:'房间 1',use:'other',mat:'wood'}},furniture:[],open:{}};
const context=vm.createContext({document,$,window:{},FurnishDraft:{...C,build(input){buildCalls++;return C.build(input);}},FurnishProject:P,FurnishZoneGeometry:G,FurnishDesign:require('../src/core/design-core.js'),inPoly:(x,y,p)=>G.inside([x,y],p),tr:s=>s,esc:s=>s,PLAN:plan,ROOMS:plan.rooms,state,store:{work:{},customPlans:[]},PLANS:[plan],uid:()=>String(++serial),undoStack:[],redoStack:[],snap:()=>'',commit(){},renderAll(){},fitView(){},buildPlanList(){},toast(){},save(){},snapshot(){},regionUseOptions:()=>'<option value="living">客厅</option>',openDialog(opts){dialog=opts;$('#dlgBody').innerHTML=opts.body;}});
vm.runInContext(fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(require.resolve('../src/ui/floorplan-editor.js'),'utf8'),context);context.window.FurnishEditor.open();assert.equal(buildCalls,1,"initial render builds geometry once");
const mode=m=>overlay.querySelectorAll('[data-trace-mode]').find(b=>b.dataset.traceMode===m).onclick();
const control=(attr,id)=>$('#trace-properties').querySelectorAll('[data-'+attr+']').find(b=>Object.values(b.dataset).includes(id));
const point=(x,y)=>{for(const fn of $('#trace-canvas').events.pointerdown||[])fn({button:0,clientX:x,clientY:y,pointerId:1,target:{dataset:{}},preventDefault(){}});};
mode('zone-split-path');assert.equal($('#area-path-complete').disabled,true);
assert.equal($('#trace-properties').querySelectorAll('[data-region-name]').length,1);
assert.equal($('#trace-properties').querySelectorAll('[data-region-split]').length,1);
assert.equal(typeof $('#region-picker').onchange,'function');
control('region-split','room1').onclick();assert.match($('#area-path-complete').innerHTML||$('#trace-properties').innerHTML,/等待边界起点/);
point(100,500);assert.equal($('#area-path-complete').disabled,true);
point(700,600);assert.equal($('#area-path-complete').disabled,true);point(703,900);assert.match($('#trace-canvas').innerHTML,/<polyline points="100,500 700,600 700,900"/);
point(1900,500);assert.equal($('#area-path-complete').disabled,false);assert.equal(dialog,null);
const readyLine=$('#trace-canvas').innerHTML.match(/<polyline points="([^"]+)"/)[1];
$('#trace-canvas').events.pointermove.forEach(fn=>fn({clientX:1100,clientY:900,target:{dataset:{}}}));
assert.equal($('#trace-canvas').innerHTML.match(/<polyline points="([^"]+)"/)[1],readyLine);
const keypress=key=>documentEvents.keydown.forEach(fn=>fn({key,target:{matches:()=>false},preventDefault(){},stopImmediatePropagation(){}}));
keypress('Escape');assert.equal($('#area-path-complete').disabled,false);assert.equal(dialog,null);
assert.equal($('#trace-canvas').innerHTML.match(/<polyline points="([^"]+)"/)[1],readyLine);
keypress('Enter');assert.equal(dialog.title,'拆分后的名称与用途');assert.equal($('#path-name-0').value,'房间 1');assert.equal($('#path-name-1').value,'房间 2');dialog.actions[0].fn();assert.equal($('#area-path-complete').disabled,true);
// Click near corners rather than exactly on them: reuse existing coordinates.
point(103,106);point(1896,1394);
assert.match($('#trace-canvas').innerHTML,/cx="100" cy="100"[^>]*data-path-point="0"/);
assert.match($('#trace-canvas').innerHTML,/cx="1900" cy="1400"[^>]*data-path-point="1"/);
const pathEvent={button:0,clientX:100,clientY:100,pointerId:1,target:{dataset:{pathPoint:'0'}},preventDefault(){}};
$('#trace-canvas').events.pointerdown.forEach(fn=>fn(pathEvent));
$('#trace-canvas').events.pointermove.forEach(fn=>fn({...pathEvent,clientX:102,clientY:500}));
$('#trace-canvas').events.pointerup.forEach(fn=>fn({...pathEvent,type:'pointerup'}));
assert.match($('#trace-canvas').innerHTML,/cx="100" cy="500"[^>]*data-path-point="0"/);
// Orthogonal mode constrains drawing and moves adjacent segments together.
control('region-split','room1').onclick();
$('#area-path-orthogonal').checked=true;$('#area-path-orthogonal').onchange();
point(100,500);point(700,510);point(710,1400);
assert.equal($('#area-path-complete').disabled,false);
assert.match($('#trace-canvas').innerHTML,/<polyline points="100,500 700,500 700,1400"/);
const dragCorner=(x,y)=>{const e={button:0,clientX:700,clientY:500,pointerId:1,target:{dataset:{pathPoint:'1'}},preventDefault(){}};$('#trace-canvas').events.pointerdown.forEach(fn=>fn(e));$('#trace-canvas').events.pointermove.forEach(fn=>fn({...e,clientX:x,clientY:y}));$('#trace-canvas').events.pointerup.forEach(fn=>fn({...e,type:'pointerup'}));};
dragCorner(850,600);assert.match($('#trace-canvas').innerHTML,/<polyline points="100,600 850,600 850,1400"/);
$('#area-path-orthogonal').checked=false;$('#area-path-orthogonal').onchange();
dragCorner(900,650);assert.match($('#trace-canvas').innerHTML,/<polyline points="100,600 900,650 850,1400"/);
$('#area-path-cancel').onclick();control('region-name','room1').onclick();$('#region-edit-name').value='客餐厅';$('#region-edit-use').value='living';assert.equal(dialog.actions[1].fn(),true);
assert.match($('#trace-canvas').innerHTML,/客餐厅/);$('#trace-undo').onclick();assert.match($('#trace-canvas').innerHTML,/房间 1/);$('#trace-redo').onclick();
control('region-boundary','room1').onclick();assert.match($('#trace-canvas').innerHTML,/data-area-vertex/);
const canvas=$('#trace-canvas'),countVertices=()=>[...canvas.innerHTML.matchAll(/data-area-vertex=/g)].length;
const initialCount=countVertices(),mid=canvas.innerHTML.match(/data-area-edge="0" cx="([^"]+)" cy="([^"]+)"/);
const doubleClick=dataset=>{const event={button:0,clientX:Number(mid[1]),clientY:Number(mid[2]),pointerId:1,target:{dataset},preventDefault(){}};for(let i=0;i<2;i++){canvas.events.pointerdown.forEach(fn=>fn(event));canvas.events.pointerup.forEach(fn=>fn({...event,type:'pointerup'}));}canvas.events.dblclick.forEach(fn=>fn(event));};
doubleClick({areaEdge:'0'});assert.equal(countVertices(),initialCount+1);
doubleClick({areaVertex:'1'});assert.equal(countVertices(),initialCount);
$('#trace-undo').onclick();assert.equal(countVertices(),initialCount+1);assert.equal($('#trace-redo').disabled,false);
$('#trace-undo').onclick();assert.equal(countVertices(),initialCount);
$('#trace-redo').onclick();assert.equal(countVertices(),initialCount+1);
$('#trace-redo').onclick();assert.equal(countVertices(),initialCount);
assert.equal($('#area-boundary-apply').onclick(),true);
// A point outside the canvas remains editable until final application. A point
// within a wall footprint is now a valid authored boundary, clipped at build.
const vertexEvent={button:0,clientX:100,clientY:100,pointerId:1,target:{dataset:{areaVertex:'0'}},preventDefault(){}};
canvas.events.pointerdown.forEach(fn=>fn(vertexEvent));
canvas.events.pointermove.forEach(fn=>fn({...vertexEvent,clientX:-10,clientY:-10,shiftKey:true}));
canvas.events.pointerup.forEach(fn=>fn({...vertexEvent,type:'pointerup'}));
assert.match(canvas.innerHTML,/data-area-vertex="0" cx="-10" cy="-10"/);
$('#trace-undo').onclick();assert.match(canvas.innerHTML,/data-area-vertex="0" cx="100" cy="100"/);
$('#trace-redo').onclick();assert.match(canvas.innerHTML,/data-area-vertex="0" cx="-10" cy="-10"/);
assert.equal($('#area-boundary-apply').onclick(),false);
assert.match(canvas.innerHTML,/data-area-vertex="0" cx="-10" cy="-10"/);
doubleClick({areaVertex:'0'});assert.equal(countVertices(),initialCount-1);
const previewMid=canvas.innerHTML.match(/data-area-edge="0" cx="([^"]+)" cy="([^"]+)"/);
canvas.events.dblclick.forEach(fn=>fn({clientX:Number(previewMid[1]),clientY:Number(previewMid[2]),target:{dataset:{areaEdge:'0'}},preventDefault(){}}));assert.equal(countVertices(),initialCount);
$('#area-boundary-cancel').onclick();assert.match(canvas.innerHTML,/data-area-vertex="0" cx="100" cy="100"/);
// Align a dragged point to distant vertices on the same X/Y axis.
const moveVertex=(x,y,shiftKey=false)=>{canvas.events.pointerdown.forEach(fn=>fn(vertexEvent));canvas.events.pointermove.forEach(fn=>fn({...vertexEvent,clientX:x,clientY:y,shiftKey}));canvas.events.pointerup.forEach(fn=>fn({...vertexEvent,type:'pointerup'}));};
moveVertex(103,500);assert.match(canvas.innerHTML,/data-area-vertex="0" cx="100" cy="500"/);$('#area-boundary-cancel').onclick();
moveVertex(400,106);assert.match(canvas.innerHTML,/data-area-vertex="0" cx="400" cy="100"/);$('#area-boundary-cancel').onclick();
moveVertex(103,500,true);assert.match(canvas.innerHTML,/data-area-vertex="0" cx="103" cy="500"/);
$('#trace-close').onclick();assert.ok(overlay);assert.equal(typeof $('#trace-exit-continue').onclick,'function');assert.equal(typeof $('#trace-exit-discard').onclick,'function');
$('#trace-exit-continue').onclick();assert.ok(overlay);assert.match(canvas.innerHTML,/data-area-vertex="0" cx="103" cy="500"/);$('#area-boundary-cancel').onclick();
console.log('PASS horizontal/vertical vertex alignment, Shift bypass and inline exit preserves preview');
// Coalesce a burst into one frame, flush the final move before pointerup,
// and keep canceled/undone operations from running in a later frame.
let frameId=0;const frames=new Map();
context.window.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};
context.window.cancelAnimationFrame=id=>frames.delete(id);
canvas.events.pointerdown.forEach(fn=>fn(vertexEvent));
const writes=canvas.htmlWrites,builds=buildCalls;
for(let i=0;i<60;i++)canvas.events.pointermove.forEach(fn=>fn({...vertexEvent,clientX:130+i,clientY:140,shiftKey:true}));
assert.equal(frames.size,1);assert.equal(canvas.htmlWrites,writes);
canvas.events.pointerup.forEach(fn=>fn({...vertexEvent,type:'pointerup'}));
assert.equal(frames.size,0);assert.equal(buildCalls,builds,"preview reuses committed geometry");
assert.equal(canvas.htmlWrites,writes+2,"one movement render and one release render");
assert.match(canvas.innerHTML,/data-area-vertex="0" cx="189" cy="140"/);
$('#trace-undo').onclick();assert.match(canvas.innerHTML,/data-area-vertex="0" cx="100" cy="100"/);
$('#trace-redo').onclick();assert.match(canvas.innerHTML,/data-area-vertex="0" cx="189" cy="140"/);
$('#area-boundary-cancel').onclick();
canvas.events.pointerdown.forEach(fn=>fn(vertexEvent));
canvas.events.pointermove.forEach(fn=>fn({...vertexEvent,clientX:180,clientY:180,shiftKey:true}));
canvas.events.pointercancel.forEach(fn=>fn({...vertexEvent,type:'pointercancel'}));
assert.equal(frames.size,0);assert.match(canvas.innerHTML,/data-area-vertex="0" cx="100" cy="100"/);
console.log('PASS 60 pointer moves coalesced, final position preserved, no preview geometry rebuilds and canceled frame cleanup');
$('#trace-undo').onclick();$('#trace-undo').onclick();$('#trace-undo').onclick();
control('region-remove','room1').onclick();assert.match($('#trace-canvas').innerHTML,/未划分空间/);$('#trace-finish').onclick();assert.equal(state.rooms.room1.name,'未划分空间');assert.equal(C.build(state.architecture.draft).rooms[0].use,'unassigned');
console.log('PASS default region name/delete/boundary controls, undo/redo, saved metadata and explicit split readiness');
