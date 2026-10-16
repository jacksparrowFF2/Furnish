async (page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[],dir='output/playwright/directional-heights/';
 const check=(v,m)=>{if(!v)throw Error(m);};p.on('pageerror',e=>errors.push(e.stack));
 try{
  await p.goto(verification.baseURL);await p.locator('#drawing-compass').waitFor();
  await p.evaluate(()=>{
   const rooms=structuredClone(state.rooms);
   PLAN={...PLAN,walls:[[0,0,100,6000],[0,0,6000,100],[5900,0,6000,6000],[0,5900,6000,6000]],wins:[],doors:[],slides:[],rooms:[{id:'height-room',name:'燃气灶与吊柜',mat:'tile800',at:[3000,3000],poly:[[100,100],[5900,100],[5900,5900],[100,5900]]}]};applyPlanData();
   state=freshWork(PLAN);state.rooms={...rooms,...state.rooms};state.furniture=[F('counter','实体台面',3800,2200,1800,600,0,'#e0ccb0'),F('stove_fotile_th36b','方太燃气灶 TH36B-T',3900,2210,750,440,0,'#111214')];
   delete state.furniture[0].kitchen;state.furniture[0].h=860;state.furniture[0].id='height-host';state.furniture[1].id='height-stove';state.measures=[];ui.layers.clear=true;renderAll();selectIds(['height-stove']);zoomToBox([2600,1600,5000,2900],180);
  });
  const read=()=>p.evaluate(()=>Object.fromEntries(Object.entries(directionalMeasurements()).map(([d,m])=>[d,m&&Math.round(m.distance)])));
  const baseline=JSON.stringify(await read());check(baseline===JSON.stringify({l:625,r:425,t:90,b:70}),'baseline physical distances');
  await p.evaluate(()=>mutate(()=>{const wall=F('kitchenwall','吊柜',3900,2350,1200,400,0,'#ddd');delete wall.kitchen;wall.id='height-upper';wall.mountHeight=1480;state.furniture.push(wall);}));
  check(JSON.stringify(await read())===baseline,'legacy wall cabinet preserves all four distances');
  await p.keyboard.press('Control+z');check(await p.evaluate(()=>!getF('height-upper')),'undo cabinet addition');check(JSON.stringify(await read())===baseline,'undo distances');
  await p.keyboard.press('Control+y');check(await p.evaluate(()=>!!getF('height-upper')),'redo cabinet addition');check(JSON.stringify(await read())===baseline,'redo distances');
  await p.evaluate(()=>mutate(()=>{const wall=getF('height-upper');Object.assign(wall,FurnishKitchen.configure(wall,{version:1,shape:'straight',depth:400,baseHeight:700,thickness:0,plinth:0,modules:[{run:0,width:1200,role:'door'}]}));}));
  check(JSON.stringify(await read())===baseline,'modular wall cabinet preserves distances');
  check(await p.locator('[data-edit-overlay="directional-distance"]').count()===4,'four canvas labels');
  check((await p.locator('[data-distance-row="b"]').innerText()).includes('70 mm'),'property panel uses corrected bottom distance');
  await p.getByText('测量参照与规则',{exact:true}).click();check((await p.locator('#panel').innerText()).includes('高度明确分离的家具不参与'),'panel documents height filter');
  await p.screenshot({animations:'disabled',path:dir+'desktop.png'});
  await p.locator('#directional-measure-save').click();check(await p.evaluate(()=>state.measures.length===4),'save four fixed measurements');
  const saved=await p.evaluate(()=>JSON.stringify(state.measures));await p.keyboard.press('Control+z');check(await p.evaluate(()=>state.measures.length===0),'undo saved measurements');await p.keyboard.press('Control+y');check(await p.evaluate(()=>JSON.stringify(state.measures))===saved,'redo saved measurements');
  await p.locator('#drawing-right').click();check(JSON.stringify(await read())===JSON.stringify({l:70,r:90,t:625,b:425}),'rotated drawing distances');
  await p.screenshot({animations:'disabled',path:dir+'rotated.png'});
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{closeDrawers();zoomToBox([2600,1600,5000,2900],80);});await p.screenshot({animations:'disabled',path:dir+'mobile-canvas.png'});
  await p.locator('#tgPanel').click();await p.locator('#directional-measure-save').scrollIntoViewIfNeeded();check(await p.locator('[data-distance-row]').count()===4,'mobile panel');check(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no horizontal overflow');await p.screenshot({animations:'disabled',path:dir+'mobile-panel.png'});
  await p.waitForFunction(()=>!savePending);const final=await p.evaluate(()=>JSON.stringify({furniture:state.furniture,measures:state.measures}));await p.reload();await p.locator('#drawing-compass').waitFor();
  check(await p.evaluate(()=>JSON.stringify({furniture:state.furniture,measures:state.measures}))===final,'refresh preserves cabinets and measurements');const restoredDistances=await p.evaluate(()=>Object.fromEntries(Object.entries(FurnishSnapping.directional(getF('height-stove'),{furniture:state.furniture,rotation:drawingRotation()})).map(([d,m])=>[d,m&&Math.round(m.distance)])));check(JSON.stringify(restoredDistances)===JSON.stringify({l:70,r:90,t:625,b:425}),'refresh furniture distances');check(!errors.length,errors.join('\n'));
  return {status:'PASS',legacyAndModular:true,addUndoRedo:true,saveUndoRedo:true,canvasAndPanel:true,drawingRotation:true,mobile390:true,refresh:true,errors};
 }catch(e){return {status:'FAIL',message:e.message,stack:e.stack,errors};}finally{await context.close();}
}
