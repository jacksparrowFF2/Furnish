// Exercise the real region controls, split readiness and save/undo handlers.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),G=require('../src/core/zone-geometry.js');
const nodes=new Map();let overlay=null,dialog=null,serial=0;
class Element{
 constructor(){this.dataset={};this.style={};this.classList={toggle(){}};this.events={};this.value='';this.hidden=false;this.children=[];}
 set innerHTML(html){this.html=html;this.children=[];for(const tag of html.matchAll(/<[^/!][^>]*>/g)){const n=new Element();for(const a of tag[0].matchAll(/data-([\w-]+)="([^"]*)"/g))n.dataset[a[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=a[2];n.disabled=/\bdisabled\b/.test(tag[0]);if(Object.keys(n.dataset).length)this.children.push(n);const id=tag[0].match(/\bid="([^"]+)"/);if(id){n.value=tag[0].match(/\bvalue="([^"]*)"/)?.[1]||'';nodes.set('#'+id[1],n);}}for(const select of html.matchAll(/<select[^>]+id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g))nodes.get('#'+select[1]).value=select[2].match(/value="([^"]+)"/)?.[1]||'';}
 get innerHTML(){return this.html||'';}
 insertAdjacentHTML(_,html){const old=this.children;this.innerHTML=html;this.children=[...old,...this.children];this.html=html;}
 querySelector(s){const attr=s.match(/^\[data-([\w-]+)="([^"]+)"\]$/);if(attr){const key=attr[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return this.children.find(n=>n.dataset[key]===attr[2]);}return $(s);}
 querySelectorAll(s){const attr=s.match(/^\[data-([\w-]+)\]$/);if(!attr)return [];const key=attr[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return this.children.filter(n=>key in n.dataset);}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 setAttribute(){} after(el){if(overlay&&el)overlay.children.push(el);} before(){} focus(){} remove(){overlay=null;} setPointerCapture(){}
 getScreenCTM(){return {a:1,b:0,inverse(){return {};}};}
 createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x,y:this.y};}};}
}
const $=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);};$('#dlg').hidden=true;
const document={createElement:()=>new Element(),querySelector:()=>overlay,addEventListener(){},removeEventListener(){},body:{append(el){overlay=el;}}};
const d={version:1,id:'custom_region_ui',name:'区域测试',source:'dxf',image:'',width:2000,height:1500,scale:2,walls:[{id:'top',a:[0,50],b:[2000,50]},{id:'bottom',a:[0,1450],b:[2000,1450]},{id:'left',a:[50,100],b:[50,1400]},{id:'right',a:[1950,100],b:[1950,1400]}].map(w=>({...w,thickness:200,kind:'b',caps:[0,0]})),openings:[]};
const plan=C.build(d),state={architecture:{draft:d,phase:'survey'},rooms:{room1:{name:'房间 1',use:'other',mat:'wood'}},furniture:[],open:{}};
const context=vm.createContext({document,$,window:{},FurnishDraft:C,FurnishProject:P,FurnishZoneGeometry:G,FurnishDesign:require('../src/core/design-core.js'),inPoly:(x,y,p)=>G.inside([x,y],p),tr:s=>s,esc:s=>s,PLAN:plan,ROOMS:plan.rooms,state,store:{work:{},customPlans:[]},PLANS:[plan],uid:()=>String(++serial),undoStack:[],redoStack:[],snap:()=>'',commit(){},renderAll(){},fitView(){},buildPlanList(){},toast(){},save(){},snapshot(){},regionUseOptions:()=>'<option value="living">客厅</option>',openDialog(opts){dialog=opts;$('#dlgBody').innerHTML=opts.body;}});
vm.runInContext(fs.readFileSync(require.resolve('../src/ui/floorplan-editor.js'),'utf8'),context);context.window.FurnishEditor.open();
const mode=m=>overlay.querySelectorAll('[data-trace-mode]').find(b=>b.dataset.traceMode===m).onclick();
const control=(attr,id)=>$('#trace-properties').querySelectorAll('[data-'+attr+']').find(b=>Object.values(b.dataset).includes(id));
const point=(x,y)=>{for(const fn of $('#trace-canvas').events.pointerdown||[])fn({button:0,clientX:x,clientY:y,pointerId:1,target:{dataset:{}},preventDefault(){}});};
mode('zone-split-path');assert.equal($('#area-path-complete').disabled,true);
control('region-split','room1').onclick();assert.match($('#area-path-complete').innerHTML||$('#trace-properties').innerHTML,/等待边界起点/);
point(100,500);assert.equal($('#area-path-complete').disabled,true);
point(700,600);assert.equal($('#area-path-complete').disabled,true);
point(1900,500);assert.equal($('#area-path-complete').disabled,false);assert.equal(dialog,null);
$('#area-path-complete').onclick();assert.equal(dialog.title,'拆分后的名称与用途');dialog.actions[0].fn();assert.equal($('#area-path-complete').disabled,true);
$('#area-path-cancel').onclick();control('region-name','room1').onclick();$('#region-edit-name').value='客餐厅';$('#region-edit-use').value='living';assert.equal(dialog.actions[1].fn(),true);
assert.match($('#trace-canvas').innerHTML,/客餐厅/);$('#trace-undo').onclick();assert.match($('#trace-canvas').innerHTML,/房间 1/);$('#trace-redo').onclick();
control('region-boundary','room1').onclick();assert.match($('#trace-canvas').innerHTML,/data-area-vertex/);
const canvas=$('#trace-canvas'),countVertices=()=>[...canvas.innerHTML.matchAll(/data-area-vertex=/g)].length;
const initialCount=countVertices(),mid=canvas.innerHTML.match(/data-area-edge="0" cx="([^"]+)" cy="([^"]+)"/);
const doubleClick=dataset=>{const event={button:0,clientX:Number(mid[1]),clientY:Number(mid[2]),pointerId:1,target:{dataset},preventDefault(){}};for(let i=0;i<2;i++){canvas.events.pointerdown.forEach(fn=>fn(event));canvas.events.pointerup.forEach(fn=>fn({...event,type:'pointerup'}));}canvas.events.dblclick.forEach(fn=>fn(event));};
doubleClick({areaEdge:'0'});assert.equal(countVertices(),initialCount+1);
doubleClick({areaVertex:'1'});assert.equal(countVertices(),initialCount);
$('#trace-undo').onclick();$('#trace-undo').onclick();$('#trace-undo').onclick();
control('region-remove','room1').onclick();assert.match($('#trace-canvas').innerHTML,/未划分空间/);$('#trace-finish').onclick();assert.equal(state.rooms.room1.name,'未划分空间');assert.equal(C.build(state.architecture.draft).rooms[0].use,'unassigned');
console.log('PASS default region name/delete/boundary controls, undo/redo, saved metadata and explicit split readiness');
