async (page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[],dir='output/playwright/measure-boundaries/';
 p.on('pageerror',e=>errors.push(e.message));const check=(v,m)=>{if(!v)throw Error(m);};
 try{
  await p.goto(verification.baseURL);await p.locator('#drawing-compass').waitFor();
  await p.evaluate(()=>{
   const rooms=structuredClone(state.rooms);PLAN={...PLAN,walls:[[0,0,200,5000],[0,0,5000,200],[4800,0,5000,5000],[0,4200,5000,4400]],wins:[],doors:[],slides:[],rooms:[{id:'direction-room',name:'四向净距',mat:'tile800',at:[2500,2500],poly:[[200,200],[4800,200],[4800,4200],[200,4200]]}]};applyPlanData();state=freshWork(PLAN);state.rooms={...rooms,...state.rooms};
   state.furniture=[F('counter','中间台面',2500,2500,600,550,0,'#e0ccb0'),F('counter','右侧柜体',3600,2500,600,550,0,'#bcd7d7'),F('fridge','左下冰箱',1500,2900,600,400,0,'#cbd8e7'),F('cabinet','上方柜体',2500,1500,600,500,0,'#d0d9b9')];state.furniture.forEach((f,i)=>f.id='direction-'+i);ui.layers.clear=true;renderAll();selectIds(['direction-0']);zoomToBox([500,700,4500,4400],200);
  });
  const read=()=>p.evaluate(()=>Object.fromEntries(Object.entries(directionalMeasurements(getF('direction-0'))).map(([d,m])=>[d,m&&Math.round(m.distance)])));
  check(JSON.stringify(await read())===JSON.stringify({l:400,r:500,t:475,b:1425}),'four independent nearest distances');
  check(await p.locator('[data-edit-overlay="directional-distance"]').count()===4,'four actual overlays');
  check((await p.locator('[data-distance-row="b"]').innerText()).includes('墙面'),'down targets nearest wall');
  check((await p.locator('[data-distance-row="l"]').innerText()).includes('左下冰箱'),'off-center fridge wins left direction');
  await p.screenshot({path:dir+'four-directions-desktop.png'});
  await p.locator('#directional-measure-save').click();check(await p.evaluate(()=>state.measures.length===4),'save all four atomically');check(await p.locator('[data-edit-overlay="directional-distance"]').count()===0,'saved measurements replace identical previews without duplicate labels');
  const saved=await p.evaluate(()=>JSON.stringify(state.measures));await p.keyboard.press('Control+z');check(await p.evaluate(()=>state.measures.length===0),'one undo removes all four');await p.keyboard.press('Control+y');check(await p.evaluate(()=>JSON.stringify(state.measures))===saved,'redo endpoints');
  await p.locator('[data-distance-save="r"]').click();check(await p.evaluate(()=>state.measures.length===5),'save just one direction');await p.keyboard.press('Control+z');
  const exported=await p.evaluate(()=>preparePlanSVG().svg.outerHTML);check(!exported.includes('directional-distance')&&exported.includes('data-saved-measure'),'saved lines exported, previews excluded');
  await p.keyboard.press('ArrowRight');check((await read()).r===490&&(await read()).l===410,'moving selected furniture refreshes both directions');await p.keyboard.press('Control+z');
  await p.locator('#drawing-right').click();check(JSON.stringify(await read())===JSON.stringify({l:1425,r:475,t:400,b:500}),'labels follow rotated drawing');await p.screenshot({path:dir+'four-directions-rotated.png'});
  await p.evaluate(()=>setLayer('furn',false));check((await read()).b===2000,'hidden furniture excluded; right wall becomes drawing down');await p.evaluate(()=>setLayer('furn',true));
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{closeDrawers();zoomToBox([500,700,4500,4400],200);});
  await p.waitForFunction(()=>document.querySelector('aside.right').getBoundingClientRect().left>=innerWidth);await p.screenshot({path:dir+'four-directions-mobile.png'});
  await p.locator('#tgPanel').click();await p.locator('#directional-measure-save').scrollIntoViewIfNeeded();check(await p.locator('[data-distance-save]').count()===4,'all directional actions on mobile');check(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'mobile no horizontal overflow');await p.screenshot({path:dir+'four-directions-mobile-panel.png'});
  await p.locator('#directional-measure-save').click();check(await p.evaluate(()=>state.measures.length===8),'mobile save four');
  const final=await p.evaluate(()=>JSON.stringify(state.measures));await p.waitForFunction(()=>!savePending);await p.reload();await p.locator('#drawing-compass').waitFor();check(await p.evaluate(()=>JSON.stringify(state.measures))===final,'refresh keeps saved directions');check(!errors.length,errors.join('\n'));
  return {status:'PASS',fourDirections:true,offCenterTarget:true,atomicSave:true,singleSave:true,undoRedo:true,rotation:true,movement:true,hiddenFurniture:true,mobile390:true,export:true,refresh:true,errors};
 }catch(e){return {status:'FAIL',message:e.message,stack:e.stack,errors};}finally{await context.close();}
}
