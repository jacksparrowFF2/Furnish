// Execute the real editor's pointer handlers against a small DOM fixture.
// Geometry and persistence use production modules, including rejected drags.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),plans=require('../src/data/plans.js');
const nodes=new Map();let overlay=null;
class Element{
 constructor(){this.dataset={};this.style={};this.classList={toggle(){}};this.events={};this.value='';this.hidden=false;}
 set innerHTML(html){this.html=html;for(const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){const n=nodes.get('#'+tag[1])||new Element();n.value=tag[0].match(/\bvalue="([^"]*)"/)?.[1]??n.value;nodes.set('#'+tag[1],n);}for(const select of html.matchAll(/<select[^>]+id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g))nodes.get('#'+select[1]).value=select[2].match(/value="([^"]+)"/)?.[1]||'';}
 get innerHTML(){return this.html||'';}
 querySelector(s){if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);}
 querySelectorAll(){return [];}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 setAttribute(){} after(){} focus(){} remove(){overlay=null;} setPointerCapture(){}
 getScreenCTM(){return {inverse(){return {};}};}
 createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x,y:this.y};}};}
}
const document={createElement:()=>new Element(),querySelector:()=>overlay,addEventListener(){},removeEventListener(){},body:{append(el){overlay=el;}}};
const $=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);};$('#dlg').hidden=true;
const d=C.fromPlan(plans.find(p=>p.id==='p10'),'custom_drag').draft,plan=C.build(d);let commits=0;
const context=vm.createContext({document,$,window:{},FurnishDraft:C,FurnishProject:P,tr:s=>s,esc:s=>s,PLAN:plan,ROOMS:plan.rooms,state:{architecture:{draft:d,phase:'survey'},rooms:{},furniture:[],open:{}},store:{work:{},customPlans:[]},PLANS:[plan],uid:()=> 'test',undoStack:[],redoStack:[],snap:()=>'',commit(){commits++;},renderAll(){},fitView(){},buildPlanList(){},toast(){},save(){},snapshot(){},confirm:()=>true});
vm.runInContext(fs.readFileSync(require.resolve('../src/ui/floorplan-editor.js'),'utf8'),context);
context.window.FurnishEditor.open();
const canvas=$('#trace-canvas'),event=(type,x,y,dataset={})=>{for(const fn of canvas.events[type]||[])fn({type,button:0,clientX:x,clientY:y,pointerId:1,target:{dataset},preventDefault(){}});};
const id='preset_window0',o=d.openings.find(o=>o.id===id),w=d.walls.find(w=>w.id===o.wall),x=w.a[0]+(w.b[0]-w.a[0])*o.t,y=w.a[1];
const gap=Math.round(C.openingReferences(d,id)[0].distance);event('pointerdown',x,y,{o:id});assert.equal($('#op-width').value,'1700');
event('pointermove',x+20,y);event('pointerup',x+20,y);assert.equal(Number($('#op-position').value),gap-200);assert.equal($('#trace-undo').disabled,false);
$('#trace-undo').onclick();event('pointerdown',x,y,{o:id});assert.equal(Number($('#op-position').value),gap);
event('pointermove',x+20,y);event('pointercancel',x+20,y);assert.equal(Number($('#op-position').value),gap);
event('pointerdown',x-85,y,{o:id,openingEnd:'-1'});event('pointermove',x-75,y);event('pointerup',x-75,y);assert.equal($('#op-width').value,'1600');
event('pointerdown',x,y,{o:id});event('pointermove',x+1000,y);event('pointerup',x+1000,y);assert.equal($('#op-width').value,'1600');assert.match($('#trace-status').textContent,/未应用/);
$('#op-width').value='1500';$('#op-width').oninput();assert.equal($('#trace-finish').disabled,true);assert.match($('#trace-status').textContent,/预览/);assert.equal(context.state.architecture.draft.openings.find(o=>o.id===id).length,1700);$('#op-cancel').onclick();assert.equal($('#op-width').value,'1600');$('#op-width').value='1500';$('#op-width').oninput();$('#op-apply').onclick();assert.equal($('#op-width').value,'1500');$('#trace-finish').onclick();assert.equal(context.state.architecture.draft.openings.find(o=>o.id===id).length,1500);assert.equal(commits,1);assert.equal(d.openings.find(o=>o.id===id).length,1700);
console.log('PASS opening move, one-step undo, pointer cancellation, endpoint resize, rejected collision, numeric attributes and saving the existing opening');
