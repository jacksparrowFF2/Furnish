const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../src/ui/canvas-interactions.js'),'utf8');
function harness(realSnapping=false){
 const frames=new Map(),events={},keys={},f={id:'f',type:'custom',cx:100,cy:200,w:400,d:500,rot:0};let serial=0,renders=0,commits=0;
 const el={addEventListener(){},setAttribute(){},classList:{remove(){}}};
 const ctx=vm.createContext({FurnishProducts:require("../src/core/product-rules.js"),withCanvasPlan:fn=>fn(),state:{furniture:realSnapping?[f,{...f,id:'other',cx:700}]:[f]},store:{work:{}},PLAN:{id:'p'},BOUNDS:{x:0,y:0,w:5000,h:5000},TAP:4,ui:{grid:10,layers:{furn:true,guides:true}},view:{s:1},$:()=>el,svg:{...el,addEventListener:(n,fn)=>events[n]=fn},document:{addEventListener:(n,fn)=>keys[n]=fn,querySelector:()=>el},getF:id=>ctx.state.furniture.find(f=>f.id===id),FurnishSnapping:realSnapping?require('../src/core/snapping.js'):{move:(f,x,y)=>({position:[x,y],guides:[]})},renderFurnitureMovement(){renders++;},renderSel(){renders++;},renderAll(){},syncFurnOrder(){},syncTuckedSeatPreview(){},pushOut(){},furnT:()=>'',commit(){commits++;},clearTimeout(){},requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)});
 vm.runInContext(source,ctx);ctx.toMM=e=>({x:e.clientX,y:e.clientY});ctx.initializeCanvasInteractions();
 const before=JSON.stringify(ctx.state);ctx.before=before;
 vm.runInContext("drag={kind:'move',id:'f',ids:['f'],start:{f:[100,200]},ox:0,oy:0,sx:100,sy:200,before}",ctx);
 return {ctx,events,frames,key(type,key='Alt',modifiers={}){keys[type]({key,...modifiers,preventDefault(){}});},get renders(){return renders;},get commits(){return commits;},move(x){events.pointermove({pointerId:1,clientX:x,clientY:200,target:{closest:()=>null}});},frame(){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(0));},before};
}
{
 const h=harness();for(let x=110;x<=200;x+=10)h.move(x);
 assert.equal(h.frames.size,1);assert.equal(h.renders,0);assert.equal(h.ctx.state.furniture[0].cx,100);
 h.frame();assert.equal(h.renders,1);assert.equal(h.ctx.state.furniture[0].cx,200);
 h.move(250);h.events.pointerup({pointerId:1,type:'pointerup'});
 assert.equal(h.ctx.state.furniture[0].cx,250,'quick release flushes latest position');assert.equal(h.commits,1);assert.equal(h.frames.size,0);h.frame();assert.equal(h.commits,1);
}
{
 const h=harness();h.move(200);h.frame();h.move(300);h.events.pointercancel({pointerId:1,type:'pointercancel'});
 assert.equal(JSON.stringify(h.ctx.state),h.before,'cancel restores already rendered drag');assert.equal(h.commits,0);assert.equal(h.frames.size,0);h.frame();assert.equal(JSON.stringify(h.ctx.state),h.before);
}
{
 const h=harness();h.move(200);h.events.pointercancel({pointerId:1,type:'pointercancel'});assert.equal(h.renders,0);assert.equal(JSON.stringify(h.ctx.state),h.before);assert.equal(h.commits,0);
}
console.log('PASS real pointer listener: burst coalescing, latest-position frame, quick release, one commit, cancellation before/after a frame and no delayed write');
{
 const h=harness(true);h.move(304);h.frame();assert.equal(h.ctx.state.furniture[0].cx,300);assert(h.ctx.ui.guides.length);
 h.key('keydown');assert.equal(h.ctx.state.furniture[0].cx,304);assert.equal(h.ctx.ui.guides.length,0);
 h.key('keyup');assert.equal(h.ctx.state.furniture[0].cx,300,'stationary Alt release restores snapping');
 h.move(306);h.key('keydown');assert.equal(h.frames.size,0);assert.equal(h.ctx.state.furniture[0].cx,306,'Alt overrides queued movement');
 h.events.pointerup({pointerId:1,type:'pointerup',clientX:306.375,clientY:203.125,altKey:true});
 assert.equal(h.ctx.state.furniture[0].cx,306.375);assert.equal(h.ctx.state.furniture[0].cy,203.125);assert.equal(h.commits,1);
 h.key('keyup');assert.equal(h.ctx.state.furniture[0].cx,306.375,'Alt release after drop does not resnap');
}
{
 const h=harness(true);h.move(304);h.key('keydown');h.events.pointercancel({pointerId:1,type:'pointercancel'});h.key('keyup');
 assert.equal(JSON.stringify(h.ctx.state),h.before);assert.equal(h.commits,0);assert.equal(h.frames.size,0);
}
console.log('PASS Alt bypass/restoration at stationary pointer, pending frame override, raw fractional release, one commit and cancellation');
{
 const h=harness(true),move=(x,y,shiftKey,altKey=false)=>{h.events.pointermove({pointerId:1,clientX:x,clientY:y,shiftKey,altKey,target:{closest:()=>null}});h.frame();};
 move(304,205,false);h.key('keydown','Shift');assert.equal(h.ctx.state.furniture[0].cy,200);assert.equal(h.ctx.state.furniture[0].cx,300);
 move(320,900,true,true);assert.equal(h.ctx.state.furniture[0].cy,200,'axis stays latched when perpendicular travel grows');assert.equal(h.ctx.state.furniture[0].cx,320);
 h.key('keyup','Shift',{altKey:true});assert.equal(h.ctx.state.furniture[0].cy,900,'stationary release restores raw free movement');
 h.key('keydown','Shift',{altKey:true});assert.equal(h.ctx.state.furniture[0].cx,100,'repress can select the other axis');
 h.events.pointerup({pointerId:1,type:'pointerup',clientX:330.25,clientY:920.375,shiftKey:true,altKey:true});assert.equal(h.ctx.state.furniture[0].cx,100);assert.equal(h.ctx.state.furniture[0].cy,920.375);assert.equal(h.commits,1);
 h.key('keyup','Shift');assert.equal(h.ctx.state.furniture[0].cy,920.375);
}
console.log('PASS Shift stationary latch/release, axis persistence, Alt combination, reselect axis and final release coordinates');
