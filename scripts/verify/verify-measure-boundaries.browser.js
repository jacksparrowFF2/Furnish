async (page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));const check=(v,m)=>{if(!v)throw Error(m);},dir='output/playwright/measure-boundaries/';
 const screen=async(x,y)=>p.evaluate(([x,y])=>{const at=drawingPoint([x,y]),pt=svg.createSVGPoint();pt.x=at[0];pt.y=at[1];const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);
 const click=async(x,y)=>{const q=await screen(x,y);await p.mouse.click(q.x,q.y);};
 try{
  await p.goto(page.url().startsWith('file:')?page.url():verification.baseURL);await p.locator('#drawing-compass').waitFor();
  await p.evaluate(()=>{
   const originalRooms=structuredClone(state.rooms);
   PLAN={...PLAN,walls:[[3000,-1000,3200,3000]],wins:[],doors:[],slides:[],rooms:[{id:'measure-room',name:'测量验收',mat:'tile800',at:[1000,1000],poly:[[-1000,-1000],[3000,-1000],[3000,3000],[-1000,3000]]}]};applyPlanData();state=freshWork(PLAN);
   state.rooms={...originalRooms,...state.rooms};const a=F('counter','测试台面 A',1000,1000,600,550,0,'#d9cbb7'),b=F('counter','测试台面 B',2100,1000,600,550,0,'#c4d7db');a.id='measure-a';b.id='measure-b';state.furniture=[a,b];ui.layers.clear=true;renderAll();zoomToBox([400,200,2700,1800],300);
  });
  await p.keyboard.press('m');const scale=await p.evaluate(()=>view.s);
  const q=await screen(1300+3/scale,1070);await p.mouse.move(q.x,q.y);
  check(await p.evaluate(()=>Math.abs(ui.mSnap.point.x-1300)<1e-6),'hover captures furniture boundary');
  await click(1300+3/scale,1070);await click(1800-3/scale,1070);
  check(await p.evaluate(()=>state.measures.length===1&&Math.abs(state.measures[0].a.x-1300)<1e-6&&Math.abs(state.measures[0].b.x-1800)<1e-6),'real clicks save snapped endpoints');
  await p.keyboard.press('v');await click(1550,1070);
  check(await p.evaluate(()=>ui.sel?.kind==='measure'),'select line through transparent hit area');
  await p.locator('#panel [data-act="del"]').click();check(await p.evaluate(()=>state.measures.length===0),'delete one measurement');
  await p.keyboard.press('Control+z');check(await p.evaluate(()=>state.measures.length===1),'undo deletion');
  await p.keyboard.press('Control+y');check(await p.evaluate(()=>state.measures.length===0),'redo deletion');
  await click(1000,1000);check(await p.locator('[data-edit-overlay="directional-distance"]').count()===1,'one direction available');
  check(await p.locator('#panel').innerText().then(s=>s.includes('500 mm')&&s.includes('四向最近净距')),'directional furniture result and semantics');
  await p.locator('[data-distance-save="r"]').click();check(await p.evaluate(()=>state.measures.length===1&&Math.abs(FurnishDesign.measurementGeometry(state.measures[0]).length-500)<1e-6),'save right distance');
  const exported=await p.evaluate(()=>preparePlanSVG({measurements:true}).svg.outerHTML);check(!exported.includes('directional-distance')&&!exported.includes('data-measure='),'export strips interactive overlays');
  await p.screenshot({path:dir+'nearest-desktop.png'});
  await p.keyboard.press('Control+z');check(await p.evaluate(()=>state.measures.length===0),'nearest save undo');await p.keyboard.press('Control+y');
  await p.evaluate(()=>{mutate(()=>state.drawing={...FurnishDrawing.settings(state.drawing),rotation:90});zoomToBox([400,200,2700,1800],300);});
  await p.keyboard.press('m');const r=await screen(1300+2/scale,930);await p.mouse.move(r.x,r.y);
  check(await p.evaluate(()=>Math.abs(ui.mSnap.point.x-1300)<1e-6),'view rotation captures correct original boundary');
  await p.keyboard.press('v');await click(1550,1000);check(await p.evaluate(()=>ui.sel?.kind==='measure'),'rotated saved line selection');
  await p.keyboard.press('Delete');check(await p.evaluate(()=>state.measures.length===0),'keyboard deletion');await p.keyboard.press('Control+z');
  const saved=await p.evaluate(()=>JSON.stringify(state.measures));await p.waitForFunction(()=>!savePending);await p.reload();await p.locator('#drawing-compass').waitFor();check(await p.evaluate(()=>JSON.stringify(state.measures))===saved,'refresh restores saved endpoints');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{closeDrawers();select({kind:'measure',id:0});zoomToBox([900,500,2300,1200]);});
  await p.waitForFunction(()=>document.querySelector('aside.lib').getBoundingClientRect().right<=0&&document.querySelector('aside.right').getBoundingClientRect().left>=innerWidth);
  check(await p.locator('#fab [data-act="del"]').isVisible(),'mobile delete available outside drawer');check(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'mobile no horizontal overflow');await p.screenshot({path:dir+'delete-mobile.png'});
  await p.locator('#fab [data-act="del"]').click();check(await p.evaluate(()=>state.measures.length===0),'mobile button deletion');
  check(!errors.length,errors.join('\n'));return {status:'PASS',checks:'finite furniture snapping, actual pointer selection, individual delete, keyboard/mobile delete, undo/redo, nearest save, rotated pointer, export cleanup and refresh',errors};
 }catch(e){return {status:'FAIL',message:e.message,stack:e.stack,errors};}finally{await context.close();}
}

