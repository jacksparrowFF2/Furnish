if(!process.env.FURNISH_VERIFY_ROOT){require('./verify-browser.cjs').main(['dining-plan-order']).catch(e=>{console.error(e);process.exitCode=1;});}else{
// Isolated browser profile; never changes the user's current project or browser.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const verification=require('./lib/browser-verification.cjs').configuration();
const W=require('../src/core/work-state.js'),catalog=require('../src/data/catalog.js'),plans=require('../src/data/plans.js');
(async()=>{
 const root=verification.root,out=path.join(root,'output/playwright/dining-plan-order');fs.mkdirSync(out,{recursive:true});
 const plan=plans[0],work=W.create({makeId:()=> 'unused',colorFor:()=> '#ddd',materials:catalog.materials}).fresh(plan);
 const table={id:'dining',type:'table',name:'餐桌',cx:30000,cy:30000,w:900,d:1400,rot:0,color:'#dfc9a4'};
 const chairs=[-1,1].flatMap(side=>[-1,1].map(row=>({id:`chair${side}${row}`,type:'chair',name:'餐椅',cx:30000+side*500,cy:30000+row*310,w:450,d:550,rot:side*90,flip:side===1,color:'#b8b1a2'})));
 work.furniture=[table,...chairs];const seed={v:2,planId:plan.id,work:{[plan.id]:work},designs:[],custom:[],customPlans:[]};
 const browser=await require('./lib/browser-verification.cjs').launch();
 try{
  const context=await browser.newContext({viewport:{width:1500,height:1000},offline:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(seed=>{if(!localStorage.getItem('huxing-design-v2'))localStorage.setItem('huxing-design-v2',JSON.stringify(seed));},seed);
  await page.goto((verification.fileBase+'index.html'));await page.locator('#gFurn [data-fid="dining"]').waitFor();
  // Keep fixtures away from walls, while allowing the real drag clamp to run.
  const center=async()=>page.evaluate(()=>{BOUNDS={x:20000,y:20000,w:20000,h:20000};view.s=Math.min(.25,(svg.clientWidth-30)/2500);view.x0=30000-svg.clientWidth/(2*view.s);view.y0=30000-svg.clientHeight/(2*view.s);applyView();});
  const ids=()=>page.locator('#gFurn > [data-fid]').evaluateAll(nodes=>nodes.map(n=>n.dataset.fid));
  const point=(x,y)=>page.evaluate(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(document.querySelector('#gFurn').getScreenCTM());return {x:p.x,y:p.y};},[x,y]);
  const hit=async(x,y)=>{const p=await point(x,y);return page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('[data-fid]')?.dataset.fid,p);};
  const picture=async name=>{const a=await point(29000,29100),b=await point(31000,30900);await page.screenshot({path:path.join(out,name+'.png'),clip:{x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y}});};
  await center();assert.deepEqual(await ids(),[...chairs.map(f=>f.id),'dining']);
  assert.equal(await hit(29600,29690),'dining','table covers the tucked seat');assert.equal(await hit(29280,29690),'chair-1-1','exposed backrest remains selectable');
  await picture('dining-tucked');
  assert.deepEqual(await page.evaluate(()=>state.furniture),work.furniture,'display sorting leaves saved order and dimensions intact');
  assert.deepEqual(await page.evaluate(()=>[...preparePlanSVG().svg.querySelectorAll('#gFurn > [data-fid]')].map(n=>n.dataset.fid)),await ids(),'export shares canvas stacking');
  await page.evaluate(()=>{ui.grid=50;ui.layers.wallSnap=false;ui.layers.guides=false;});
  const a=await point(30000,30000),b=await point(31800,30000);
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});
  assert.equal((await ids())[0],'dining','live pointer drag reorders before release');await page.mouse.up();
  assert.equal(await hit(29600,29690),'chair-1-1','pulling table away reveals the seat');
  await page.locator('#undo').click();assert.equal((await ids()).at(-1),'dining');assert.equal(await hit(29600,29690),'dining');
  await page.locator('#redo').click();assert.equal((await ids())[0],'dining');await page.locator('#undo').click();
  await page.waitForFunction(()=>document.querySelector('#saved').textContent.includes('已自动保存'));
  await page.reload();await page.locator('#gFurn [data-fid="dining"]').waitFor();await center();assert.equal((await ids()).at(-1),'dining');
  for(const rotation of [0,90,180,270]){
   await page.evaluate(rotation=>{mutate(()=>state.drawing={...state.drawing,rotation});const c=drawingPoint([30000,30000]);view.x0=c[0]-svg.clientWidth/(2*view.s);view.y0=c[1]-svg.clientHeight/(2*view.s);applyView();},rotation);
   assert.equal(await hit(29600,29690),'dining');assert.equal(await hit(29280,29690),'chair-1-1');
  }
  await page.evaluate(()=>mutate(()=>state.drawing={...state.drawing,rotation:0}));await center();
  const faded=()=>page.locator('#gFurn > [data-seat-preview]').evaluateAll(nodes=>nodes.map(n=>n.dataset.fid));
  for(const type of ['table','roundtable','desk']){
   const isDesk=type==='desk',nextTable={...table,type,name:isDesk?'书桌':type==='roundtable'?'圆桌':'餐桌',w:type==='table'?900:type==='roundtable'?1200:1400,d:isDesk?700:1200},seat={...chairs[0],id:'moving-seat',name:isDesk?'书椅':'餐椅',type:isDesk?'officechair':'chair',cx:29350,cy:30000,w:450,d:550,rot:-90};
   await page.evaluate(({nextTable,seat})=>{mutate(()=>state.furniture=[nextTable,seat,{...nextTable,id:'unrelated',cx:35000}]);selectIds([]);},{nextTable,seat});
   assert.deepEqual(await ids(),['moving-seat','dining','unrelated'],'all table types cover their seats');assert.deepEqual(await faded(),[]);
   const start=await point(29120,30000),inside=await point(29220,30000);
   await page.mouse.move(start.x,start.y);await page.mouse.down();assert.deepEqual(await faded(),[],'a click alone never fades a table');
   await page.mouse.move(inside.x,inside.y,{steps:6});assert.deepEqual(await faded(),['dining'],'only the overlapping stationary table fades');
   const opacity=await page.locator('[data-fid="dining"]').evaluate(n=>getComputedStyle(n).opacity);assert.equal(opacity,'0.25');
   assert.equal(await page.locator('[data-fid="moving-seat"]').evaluate(n=>getComputedStyle(n).opacity),'1');
   const exportInfo=await page.evaluate(()=>{const s=preparePlanSVG().svg;return {preview:s.querySelectorAll('[data-seat-preview]').length,table:s.querySelector('[data-fid="dining"]').getAttribute('opacity'),furniture:structuredClone(state.furniture)};});
   assert.equal(exportInfo.preview,0,'export strips temporary preview');assert.equal(exportInfo.table,null);assert(exportInfo.furniture.every(f=>!Object.keys(f).some(k=>/preview|opacity/i.test(k))));
   await picture(type+'-seat-drag');await page.mouse.up();assert.deepEqual(await faded(),[],'release restores table opacity');
   assert.equal(await page.locator('[data-fid="dining"]').evaluate(n=>getComputedStyle(n).opacity),'1');
   await picture(type+'-seat-tucked');
   await page.locator('#undo').click();assert.equal(await page.evaluate(()=>getF('moving-seat').cx),seat.cx);await page.locator('#redo').click();assert.deepEqual(await faded(),[]);
   // Re-enter from a visible backrest, leave the table, then cancel the operation.
   const beforeCancel=await page.evaluate(()=>structuredClone(state.furniture));
   const back=await point(29220,30000),again=await point(29320,30000),outside=await point(28450,30000);
   await page.mouse.move(back.x,back.y);await page.mouse.down();await page.mouse.move(again.x,again.y,{steps:4});assert.deepEqual(await faded(),['dining']);
   await page.mouse.move(outside.x,outside.y,{steps:6});assert.deepEqual(await faded(),[],'leaving table restores opacity during the drag');
   await page.mouse.move(again.x,again.y,{steps:6});assert.deepEqual(await faded(),['dining']);
   await page.dispatchEvent('#plan','pointercancel',{pointerId:1,pointerType:'mouse'});await page.mouse.up();assert.deepEqual(await faded(),[]);assert.deepEqual(await page.evaluate(()=>state.furniture),beforeCancel,'cancel restores positions without saving preview');
  }
  await page.evaluate(furniture=>{mutate(()=>state.furniture=furniture);selectIds([]);},work.furniture);
  await page.evaluate(()=>mutate(()=>state.drawing={...state.drawing,rotation:0}));await page.setViewportSize({width:390,height:844});await page.evaluate(()=>closeDrawers());await page.waitForTimeout(400);await center();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=390),true);assert.equal((await ids()).at(-1),'dining');assert.equal(await hit(29600,29690),'dining');await picture('dining-mobile');
  const narrowStart=await point(29280,29690),narrowEnd=await point(29380,29690);await page.mouse.move(narrowStart.x,narrowStart.y);await page.mouse.down();await page.mouse.move(narrowEnd.x,narrowEnd.y,{steps:5});assert.deepEqual(await faded(),['dining']);await picture('dining-mobile-seat-drag');await page.mouse.up();assert.deepEqual(await faded(),[]);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({fileOffline:true,fourChairs:true,roundtableAndDesk:true,dragOpacity:true,previewReleaseAndCancel:true,previewExcludedFromExport:true,hitTargets:true,liveDrag:true,undoRedo:true,refresh:true,export:true,fourDrawingRotations:true,mobile390:true,errors}));
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

}
