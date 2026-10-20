'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),D=require('../src/core/floorplan-core.js'),P=require('../src/core/project-core.js'),B=require('../src/core/bay-window-core.js');
const copy=structuredClone;
for(const type of ['recessed','three-sided']){
 const points=[[100,100],[500,100],[500,500],[100,500]],draft={version:1,id:'custom_bay_edit',name:'飘窗编辑回归',source:'dxf',image:'',scale:10,width:600,height:600,walls:points.map((a,i)=>({id:'w'+i,a,b:points[(i+1)%4],kind:'e',thickness:200})),openings:[{id:'bay',wall:'w0',t:.5,length:1200,kind:'window',side:1,entry:false,bay:{type,depth:600,height:450,head:2400}},{id:'ordinary',wall:'w2',t:.5,length:1200,kind:'window',side:1,entry:false,sill:900,head:2400}]};
 const before=D.build(draft),bay=B.list(before)[0],settings={w:{}};
 for(const {index} of bay.windows)settings.w[index]={sill:.45,head:2.4,panels:index===0?3:0,stackSide:index===0?'right':'left'};
 const ordinary=before.winRefs.indexOf('ordinary');settings.w[ordinary]={sill:1,head:2.45,panels:3,stackSide:'left'};
 const source=copy(settings),nextDraft=D.editOpening(draft,'bay',{bay:{...draft.openings[0].bay,height:575,head:2525,depth:650}}),after=D.build(nextDraft);
 for(const options of [{windowId:'bay'},{}]){
  const open=P.remapOpenings(before,after,settings,options),effective=P.effectivePlan(after,{furniture:[],architecture:{draft:nextDraft,phase:'survey'},open});
  const b=B.list(effective)[0];assert.equal(b.platform.height,.575);for(const {window:w,index} of b.windows){assert.equal(w.sill,.575);assert.equal(w.head,2.525);assert.equal(w.panels,source.w[index].panels);assert.equal(w.stackSide,source.w[index].stackSide);}
  assert.deepEqual(open.w[ordinary],settings.w[ordinary]);assert.deepEqual(settings,source);
  const packed=P.pack({planId:nextDraft.id,current:{furniture:[],architecture:{draft:nextDraft,phase:'survey'},open},designs:[],catalog:[]});assert.deepEqual(P.unpack(packed).current.open,open);
 }
 // A stale serialized height in a face-style override cannot detach a generated bay.
 const stale=copy(settings);stale.w[0]={sill:.2,head:1.8,panels:3,stackSide:'right'};
 const plan=P.effectivePlan(before,{furniture:[],architecture:{draft,phase:'survey'},open:stale});assert.equal(plan.wins[0].sill,.45);assert.equal(plan.wins[0].head,2.4);assert.equal(plan.wins[0].panels,3);assert.equal(B.list(plan)[0].platform.height,.45);
 // A live canvas carrying cached base values and an independent plan agree.
 const live=copy(before);for(const w of live.wins){w._sill0=w.sill;w._head0=w.head;w._panels0=w.panels??0;w._stackSide0=w.stackSide??'left';}
 B.applyWindows(live,stale.w);assert.deepEqual(live.wins.map(w=>[w.sill,w.head,w.panels,w.stackSide]),plan.wins.map(w=>[w.sill,w.head,w.panels,w.stackSide]));B.applyWindows(live,null);assert.ok(live.wins.every(w=>w.panels===0));B.applyWindows(live);assert.ok(live.wins.every(w=>w.panels===0));
 // Plain window <-> recessed bay conversion retains its front face's style.
 if(type==='recessed'){
  const plain=D.editOpening(draft,'bay',{bay:undefined,sill:450,head:2400}),plainPlan=D.build(plain),toBay=P.remapOpenings(plainPlan,before,{w:{0:{sill:.45,head:2.4,panels:3,stackSide:'right'}}},{windowId:'bay'});
  assert.equal(toBay.w[0].panels,3);assert.equal(toBay.w[0].stackSide,'right');assert.equal(P.remapOpenings(before,plainPlan,toBay,{windowId:'bay'}).w[0].panels,3);
 }
}
// Older per-face overrides still produce one shared sill and reset without drift.
const preset=copy(require('../src/data/plans.js')[0]),b=B.list(preset)[0],first=b.windows[0].index;
B.applyWindows(preset,{[first]:.6});for(const {window} of b.windows)assert.equal(window.sill,.6);assert.equal(b.platform.height,.6);
// The floorplan editor also edits a preset copy through one shared bay height.
const copied=D.fromPlan(require('../src/data/plans.js')[0],'custom_group_height').draft,original=D.build(copied),assembly=B.list(original)[0],changed=D.editOpening(copied,original.winRefs[assembly.windows[0].index],{sill:650,head:2500}),rebuilt=D.build(changed),faceSettings={w:Object.fromEntries(assembly.windows.map(({index})=>[index,{sill:.45,head:2.4,panels:3,stackSide:'right'}]))};
const grouped=P.effectivePlan(rebuilt,{furniture:[],architecture:{draft:changed,phase:'survey'},open:P.remapOpenings(original,rebuilt,faceSettings)}),edited=B.list(grouped).find(v=>v.id===assembly.id);
const copyWork={furniture:[],architecture:{draft:copy(copied),phase:'survey'},open:copy(faceSettings)};B.setHeights(copyWork,original,assembly.id,700,2550);assert.ok(B.list(D.build(copyWork.architecture.draft)).find(v=>v.id===assembly.id).windows.every(v=>v.window.sill===.7));assert.ok(B.list(P.effectivePlan(original,copyWork)).find(v=>v.id===assembly.id).windows.every(v=>v.window.panels===3&&v.window.sill===.7));
assert.equal(edited.platform.height,.65);assert.ok(edited.windows.every(v=>v.window.sill===.65&&v.window.head===2.5&&v.window.panels===3));assert.equal(B.list(rebuilt).find(v=>v.id===assembly.id).platform.height,.65);
// Exercise the shared UI binder, including preview ordering and empty input.
const scope=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8'),scope);
const sill={value:'647'},height={value:'1657'},head={value:'2304'};let preview;
sill.oninput=()=>preview=head.value;scope.linkWindowHeightInputs(sill,height,head);sill.value='667';sill.oninput();assert.equal(head.value,'2324');assert.equal(preview,'2324');head.value='2400';head.oninput();assert.equal(height.value,'1733');height.value='';height.oninput();assert.equal(head.value,'');
console.log('PASS bay dimension/style preservation, trace and panel remapping, conversion, live/independent parity, shared sill, reset, project roundtrip and one UI height binder');
