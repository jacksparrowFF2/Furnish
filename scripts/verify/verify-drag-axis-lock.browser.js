async(page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[],dir='output/playwright/drag-axis-lock/';p.on('pageerror',e=>errors.push(e.message));const check=(v,m)=>{if(!v)throw Error(m);};
 const screen=async(x,y)=>p.evaluate(([x,y])=>{const a=drawingPoint([x,y]),pt=svg.createSVGPoint();pt.x=a[0];pt.y=a[1];const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);
 const move=async(x,y)=>{const q=await screen(x,y);await p.mouse.move(q.x,q.y,{steps:5});await p.waitForFunction(()=>!canvasPointerFrame);};
 const at=async(id,x,y)=>{const actual=await p.evaluate(id=>[getF(id).cx,getF(id).cy],id);check(Math.hypot(actual[0]-x,actual[1]-y)<.1,id+' expected '+[x,y]+' actual '+actual);};
 const setup=async(rotation=0,group=false)=>p.evaluate(({rotation,group})=>{const a=F('counter','轴向移动',1000,1000,600,400,0,'#d9cbb7'),b=F('counter','参考家具',2100,1000,600,600,0,'#c4d7db');a.id='axis-a';b.id='axis-b';state.furniture=[a,b];if(group){const c={...a,id:'axis-c',cy:2400};a.groupId=c.groupId='axis-group';state.furniture.push(c);}state.drawing={...FurnishDrawing.settings(state.drawing),rotation};ui.layers.furn=ui.layers.guides=ui.layers.wallSnap=true;selectIds(group?['axis-a','axis-c']:['axis-a'],'axis-a');renderAll();zoomToBox([400,300,2700,2900],100);},{rotation,group});
 const down=async(x,y)=>{await move(x,y);await p.mouse.down();};
 try{
  await p.goto(verification.baseURL);await p.locator('#drawing-compass').waitFor();await p.evaluate(()=>{const rooms=structuredClone(state.rooms);PLAN={...PLAN,walls:[[3500,0,3700,3200]],wins:[],doors:[],slides:[],rooms:[{id:'axis-room',name:'轴向移动验收',mat:'tile800',at:[1000,1000],poly:[[-1000,-1000],[4000,-1000],[4000,4000],[-1000,4000]]}]};applyPlanData();state=freshWork(PLAN);state.rooms={...rooms,...state.rooms};});
  await setup();await down(1000,1000);await move(1505,1020);await p.keyboard.down('Shift');await at('axis-a',1500,1000);
  check(await p.locator('[data-drag-snap="midpoint"]').count()===1,'axis-compatible midpoint remains snapped');await p.screenshot({path:dir+'shift-midpoint.png'});
  await p.keyboard.down('Alt');await at('axis-a',1505,1000);await p.keyboard.up('Shift');await at('axis-a',1505,1020);await p.keyboard.down('Shift');await at('axis-a',1505,1000);
  await move(1300,1900);await at('axis-a',1300,1000);await p.keyboard.up('Shift');await at('axis-a',1300,1900);await p.keyboard.down('Shift');await at('axis-a',1000,1900);
  await p.mouse.up();await p.keyboard.up('Shift');await p.keyboard.up('Alt');await at('axis-a',1000,1900);await p.keyboard.press('Control+z');await at('axis-a',1000,1000);await p.keyboard.press('Control+y');await at('axis-a',1000,1900);
  // Shift already held on a selected item must drag; Shift-click still toggles.
  await setup();await p.keyboard.down('Shift');await down(1000,1000);await move(1505,1020);await p.mouse.up();await p.keyboard.up('Shift');await at('axis-a',1500,1000);
  await p.keyboard.down('Shift');await move(1500,1000);await p.mouse.click((await screen(1500,1000)).x,(await screen(1500,1000)).y);await p.keyboard.up('Shift');check(await p.evaluate(()=>!selIds().length),'Shift-click selected item deselects');
  await p.keyboard.down('Shift');const q=await screen(1500,1000);await p.mouse.click(q.x,q.y);await p.keyboard.up('Shift');check(await p.evaluate(()=>selIds().includes('axis-a')),'Shift-click unselected item adds');
  await setup(0,true);await down(1000,2400);await move(1505,2420);await p.keyboard.down('Shift');await at('axis-a',1500,1000);await at('axis-c',1500,2400);await p.screenshot({path:dir+'shift-group.png'});await p.mouse.up();await p.keyboard.up('Shift');
  await p.keyboard.press('Control+z');await at('axis-a',1000,1000);await at('axis-c',1000,2400);
  for(const rotation of [0,90,180,270]){await setup(rotation);await down(1000,1000);await p.keyboard.down('Shift');await p.keyboard.down('Alt');await move(1080,1400);await at('axis-a',1000,1400);await p.mouse.up();await p.keyboard.up('Alt');await p.keyboard.up('Shift');}
  await setup(90);await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{closeDrawers();zoomToBox([600,600,1700,1700],30);});await p.waitForFunction(()=>document.querySelector('aside.lib').getBoundingClientRect().right<=0&&document.querySelector('aside.right').getBoundingClientRect().left>=innerWidth);
  await down(1000,1000);await p.keyboard.down('Shift');await p.keyboard.down('Alt');await move(1080,1400);await at('axis-a',1000,1400);await p.screenshot({path:dir+'shift-mobile.png'});await p.mouse.up();await p.keyboard.up('Alt');await p.keyboard.up('Shift');
  await p.waitForFunction(()=>!savePending);await p.reload();await p.locator('#drawing-compass').waitFor();await at('axis-a',1000,1400);
  check(!errors.length,errors.join('\n'));return {status:'PASS',checks:'stationary Shift/Alt changes, latched axes, on-axis magnets, Shift-before-drag and click compatibility, groups, four rotations, narrow screen, undo/redo and reload',errors};
 }catch(e){return {status:'FAIL',message:e.message,stack:e.stack,errors};}finally{await context.close();}
}
