async(page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[],dir='output/playwright/drag-feature-snapping/';
 p.on('pageerror',e=>errors.push(e.message));const check=(v,m)=>{if(!v)throw Error(m);};
 const screen=async(x,y)=>p.evaluate(([x,y])=>{const a=drawingPoint([x,y]),pt=svg.createSVGPoint();pt.x=a[0];pt.y=a[1];const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);
 const dragTo=async(start,end,kind,shot)=>{const a=await screen(...start),b=await screen(...end);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:8});await p.waitForFunction(()=>!canvasPointerFrame);check(await p.locator(`[data-drag-snap="${kind}"]`).count()===1,'visible '+kind+' magnet');if(shot)await p.screenshot({path:dir+shot});
  if(shot==='midpoint-desktop.png'||shot==='group.png'){
   const original=await p.evaluate(()=>({positions:state.furniture.map(f=>[f.cx,f.cy]),layers:JSON.stringify(ui.layers)}));
   await p.keyboard.down('Alt');check(await p.locator('[data-drag-snap]').count()===0,'stationary Alt hides magnet');
   check(await p.evaluate(()=>!canvasPointerFrame&&ui.guides.length===0),'Alt clears queued guide');
   check(await p.evaluate(()=>{const raw=toMM(drag.pointer),f=getF(drag.id);return Math.hypot(f.cx-(raw.x-drag.ox),f.cy-(raw.y-drag.oy))<1e-5;}),'stationary Alt restores raw pointer position');
   if(shot==='midpoint-desktop.png')await p.screenshot({path:dir+'alt-free-position.png'});
   await p.keyboard.up('Alt');
   check(await p.locator(`[data-drag-snap="${kind}"]`).count()===1,'stationary Alt release restores magnet');
   check(await p.evaluate(o=>JSON.stringify(state.furniture.map(f=>[f.cx,f.cy]))===JSON.stringify(o.positions)&&JSON.stringify(ui.layers)===o.layers,original),'restores original snapped positions and preserves switches');
  }
  await p.mouse.up();};
 const near=async(id,x,y)=>check(await p.evaluate(({id,x,y})=>{const f=getF(id);return Math.hypot(f.cx-x,f.cy-y)<1e-5;},{id,x,y}),'exact '+id+' position');
 try{
  await p.goto(verification.baseURL);await p.locator('#drawing-compass').waitFor();
  await p.evaluate(()=>{const rooms=structuredClone(state.rooms);PLAN={...PLAN,walls:[[3000,0,3200,2000]],wins:[],doors:[],slides:[],rooms:[{id:'drag-room',name:'拖动吸附验收',mat:'tile800',at:[1000,1000],poly:[[-1000,-1000],[4000,-1000],[4000,3500],[-1000,3500]]}]};applyPlanData();state=freshWork(PLAN);state.rooms={...rooms,...state.rooms};
   const a=F('counter','拖动家具',1000,1000,600,400,0,'#d9cbb7'),b=F('counter','参考家具',2100,1000,600,600,0,'#c4d7db');a.id='drag-a';b.id='drag-b';state.furniture=[a,b];ui.layers.furn=ui.layers.guides=ui.layers.wallSnap=true;renderAll();zoomToBox([300,0,3400,2200],100);});
  const scale=await p.evaluate(()=>view.s);
  await dragTo([1000,1000],[1500+5/scale,1000+4/scale],'midpoint','midpoint-desktop.png');await near('drag-a',1500,1000);
  check(await p.locator('[data-drag-snap]').count()===0,'magnet clears after release');
  await p.keyboard.press('Control+z');await near('drag-a',1000,1000);await p.keyboard.press('Control+y');await near('drag-a',1500,1000);
  const altStart=await screen(1500,1000),altEnd=await screen(1500+5/scale,1000+4/scale);await p.mouse.move(altStart.x,altStart.y);await p.mouse.down();await p.keyboard.down('Alt');await p.mouse.move(altEnd.x,altEnd.y,{steps:4});await p.waitForFunction(()=>!canvasPointerFrame);
  const rawDrop=await p.evaluate(()=>{const q=toMM(drag.pointer);return [q.x-drag.ox,q.y-drag.oy];});
  check(await p.locator('[data-drag-snap]').count()===0,'Alt held during movement suppresses magnet');await p.mouse.up();await p.keyboard.up('Alt');await near('drag-a',...rawDrop);
  await p.keyboard.press('Control+z');await near('drag-a',1500,1000);await p.keyboard.press('Control+y');await near('drag-a',...rawDrop);await p.keyboard.press('Control+z');
  await dragTo([1500,1000],[2700+5/scale,1000+4/scale],'midpoint','wall-midpoint.png');await near('drag-a',2700,1000);
  await p.keyboard.press('Control+z');await p.keyboard.press('Control+z');
  const rotated=await p.evaluate(()=>{mutate(()=>getF('drag-a').rot=37);const q=FurnishGeometry.corners(getF('drag-a'))[2];return [1800-(q[0]-1000),700-(q[1]-1000)];});
  await dragTo([1000,1000],[rotated[0]+5/scale,rotated[1]+4/scale],'corner','rotated-corner.png');await near('drag-a',...rotated);
  await p.keyboard.press('Control+z');await p.keyboard.press('Control+z');
  await p.evaluate(()=>{mutate(()=>{const c={...getF('drag-a'),id:'drag-c',cy:1800};state.furniture.push(c);getF('drag-a').groupId=c.groupId='drag-group';});selectIds(['drag-a','drag-c'],'drag-c');});
  await dragTo([1000,1800],[1500+5/scale,1800+4/scale],'midpoint','group.png');await near('drag-a',1500,1000);await near('drag-c',1500,1800);
  await p.keyboard.press('Control+z');await near('drag-c',1000,1800);
  // Native pointer cancellation restores an already painted magnet.
  const a=await screen(1000,1800),b=await screen(1500+5/scale,1800+4/scale);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:5});await p.waitForFunction(()=>!canvasPointerFrame);await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'})));await p.mouse.up();await near('drag-a',1000,1000);await near('drag-c',1000,1800);
  await p.evaluate(()=>{mutate(()=>{state.furniture=state.furniture.filter(f=>f.id!=='drag-c');delete getF('drag-a').groupId;state.drawing={...FurnishDrawing.settings(state.drawing),rotation:90};});closeDrawers();});
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{closeDrawers();zoomToBox([600,600,2500,1400],40);});
  await p.waitForFunction(()=>document.querySelector('aside.lib').getBoundingClientRect().right<=0&&document.querySelector('aside.right').getBoundingClientRect().left>=innerWidth);
  const mobileScale=await p.evaluate(()=>view.s);await dragTo([1000,1000],[1500+4/mobileScale,1000+3/mobileScale],'midpoint','midpoint-mobile.png');await near('drag-a',1500,1000);
  await p.waitForFunction(()=>!savePending);await p.reload();await p.locator('#drawing-compass').waitFor();await near('drag-a',1500,1000);
  check(!errors.length,errors.join('\n'));return {status:'PASS',checks:'furniture/wall midpoints, rotated corners, member-based group snapping, undo/redo/cancel, release cleanup, rotated mobile and reload',errors};
 }catch(e){return {status:'FAIL',message:e.message,stack:e.stack,errors};}finally{await context.close();}
}
