async (page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[],dir='output/playwright/stove-boundaries/';
 const check=(v,m)=>{if(!v)throw Error(m);};p.on('pageerror',e=>errors.push(e.stack));
 try{
  await p.goto(verification.baseURL);await p.locator('#drawing-compass').waitFor();
  await p.evaluate(()=>{
   const rooms=structuredClone(state.rooms);
   PLAN={...PLAN,walls:[[0,0,100,6000],[0,0,6000,100],[5900,0,6000,6000],[0,5900,6000,6000]],wins:[],doors:[],slides:[],rooms:[{id:'boundary-room',name:'燃气灶边距',mat:'tile800',at:[3000,3000],poly:[[100,100],[5900,100],[5900,5900],[100,5900]]}]};applyPlanData();
   state=freshWork(PLAN);state.rooms={...rooms,...state.rooms};state.furniture=[F('counter','实体台面',3800,2200,1800,600,0,'#e0ccb0'),F('stove_fotile_th36b','方太燃气灶 TH36B-T',3900,2210,750,440,0,'#111214')];
   delete state.furniture[0].kitchen;
   state.furniture[0].id='boundary-host';state.furniture[1].id='boundary-stove';state.measures=[];ui.layers.clear=true;renderAll();selectIds(['boundary-stove']);zoomToBox([2600,1600,5000,2900],180);
  });
  const read=()=>p.evaluate(()=>Object.fromEntries(Object.entries(directionalMeasurements()).map(([d,m])=>[d,m&&Math.round(m.distance)])));
  check(JSON.stringify(await read())===JSON.stringify({l:625,r:425,t:90,b:70}),'four distances to enclosing physical edges: '+JSON.stringify(await read()));
  check(await p.locator('[data-edit-overlay="directional-distance"]').count()===4,'four visible canvas labels');
  check((await p.locator('[data-distance-row="r"]').innerText()).includes('台面边界'),'property panel identifies physical worktop edge');
  await p.screenshot({path:dir+'desktop.png'});
  await p.locator('#directional-measure-save').click();check(await p.evaluate(()=>state.measures.length===4),'save four lines atomically');
  const saved=await p.evaluate(()=>JSON.stringify(state.measures));await p.keyboard.press('Control+z');check(await p.evaluate(()=>state.measures.length===0),'undo all four');await p.keyboard.press('Control+y');check(await p.evaluate(()=>JSON.stringify(state.measures))===saved,'redo endpoints');
  await p.keyboard.press('ArrowRight');check(JSON.stringify(await read())===JSON.stringify({l:635,r:415,t:90,b:70}),'moving hob updates edge distances');await p.keyboard.press('Control+z');
  await p.locator('#drawing-right').click();check(JSON.stringify(await read())===JSON.stringify({l:70,r:90,t:625,b:425}),'drawing rotation remaps all four labels');
  await p.screenshot({path:dir+'rotated.png'});
  await p.evaluate(()=>{state.measures=[];state.drawing={...state.drawing,rotation:0};const host=getF('boundary-host');Object.assign(host,FurnishKitchen.configure(host,{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'hob'},{run:1,width:1000,role:'door'}]}));Object.assign(getF('boundary-stove'),FurnishKitchen.attach(getF('boundary-stove'),host,0));FurnishKitchen.normalize(state.furniture);renderAll();selectIds(['boundary-stove']);zoomToBox([2600,1000,5000,3300],160);});
  check(JSON.stringify(await read())===JSON.stringify({l:225,r:225,t:80,b:80}),'linked L kitchen measures outer perimeter instead of cabinet seams/cutout');
  await p.screenshot({path:dir+'linked-l.png'});
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{closeDrawers();zoomToBox([2600,1000,5000,3300],80);});
  await p.screenshot({path:dir+'mobile-canvas.png'});await p.locator('#tgPanel').click();await p.locator('#directional-measure-save').scrollIntoViewIfNeeded();
  check(await p.locator('[data-distance-row]').count()===4,'four directions on mobile');check(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no horizontal overflow');await p.screenshot({path:dir+'mobile-panel.png'});
  await p.locator('#directional-measure-save').click();check(await p.evaluate(()=>state.measures.length===4),'linked measurements can be saved');await p.waitForFunction(()=>!savePending);
  const final=await p.evaluate(()=>JSON.stringify({furniture:state.furniture,measures:state.measures}));await p.reload();await p.locator('#drawing-compass').waitFor();
  check(await p.evaluate(()=>JSON.stringify({furniture:state.furniture,measures:state.measures}))===final,'refresh restores original structure and fixed measurements');check(!errors.length,errors.join('\n'));
  return {status:'PASS',fourDistances:true,canvas:true,propertyPanel:true,saveUndoRedo:true,movement:true,drawingRotation:true,linkedLKitchen:true,mobile390:true,refresh:true,errors};
 }catch(e){return {status:'FAIL',message:e.message,stack:e.stack,errors};}finally{await context.close();}
}
