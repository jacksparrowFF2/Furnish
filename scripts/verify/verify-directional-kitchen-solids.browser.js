async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.stack||e.message));const check=(v,m)=>{if(!v)throw Error(mode+': '+m);};
  await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib').waitFor();
  await p.evaluate(()=>{
   const originalRooms=structuredClone(state.rooms);
   PLAN={...PLAN,walls:[[0,0,200,5000],[0,0,5000,200],[4800,0,5000,5000],[0,4800,5000,5000]],wins:[],doors:[],slides:[],rooms:[{id:'gap-room',name:'橱柜设备空位',mat:'tile800',at:[2500,2500],poly:[[200,200],[4800,200],[4800,4800],[200,4800]]}]};
   applyPlanData();state=freshWork(PLAN);state.rooms={...originalRooms,...state.rooms};
   const host=FurnishKitchen.configure({id:'gap-kitchen',type:'counter',name:'橱柜',w:1800,d:600,cx:2500,cy:2500,rot:0,color:'#ddd'},{version:1,shape:'straight',depth:600,baseHeight:800,thickness:20,modules:[{run:0,width:400,role:'door'},{run:0,width:1000,role:'empty'},{run:0,width:400,role:'door'}]});
   state.furniture=[host,{id:'gap-block',type:'block',name:'方块占位体',w:800,d:150,h:540,cx:2500,cy:2500,rot:0,mountHeight:0,color:'#a8b6c4'}];state.measures=[];ui.layers.clear=true;renderAll();selectIds(['gap-block']);zoomToBox([1400,1800,3600,3200],180);
  });
  const read=()=>p.evaluate(()=>Object.fromEntries(Object.entries(directionalMeasurements(getF('gap-block'))).map(([d,m])=>[d,m&&Math.round(m.distance)])));
  const baseline=await read();check(JSON.stringify(baseline)===JSON.stringify({l:100,r:100,t:2225,b:2225}),'empty bay distances');
  check(await p.locator('[data-edit-overlay="directional-distance"]').count()===4,'four canvas labels');
  await p.screenshot({animations:'disabled',path:verification.output('playwright/directional-kitchen-solids/'+mode+'-2d.png')});
  await p.locator('#plan [data-distance-edit="r"]').first().click();await p.locator('#directional-gap-input').fill('50');await p.locator('#directional-gap-input').press('Enter');
  check(await p.evaluate(()=>getF('gap-block').cx===2550),'numeric positioning');check((await read()).r===50,'positioned clearance');
  await p.evaluate(()=>undo());check((await read()).r===100,'undo');await p.evaluate(()=>redo());check((await read()).r===50,'redo');await p.evaluate(()=>undo());
  await p.locator('#fH').fill('801');await p.locator('#fH').press('Tab');check(Object.values(await read()).every(v=>v===0),'real slab overlap remains zero');
  await p.evaluate(()=>undo());check(JSON.stringify(await read())===JSON.stringify(baseline),'height undo');
  await p.locator('#fMountHeight').fill('820');await p.locator('#fMountHeight').press('Tab');check((await read()).r===1900,'above slab measures to wall');await p.evaluate(()=>undo());
  await p.locator('#drawing-right').click();check(JSON.stringify(await read())===JSON.stringify({l:2225,r:2225,t:100,b:100}),'drawing rotation');await p.locator('#drawing-left').click();
  await p.evaluate(()=>saveDirectionalMeasurements());check(await p.evaluate(()=>state.measures.length===4),'save measurements');await p.evaluate(()=>undo());check(await p.evaluate(()=>state.measures.length===0),'undo saved');await p.evaluate(()=>redo());
  await verification.waitForCache(p);await p.reload();await p.evaluate(()=>selectIds(['gap-block']));check((await read()).r===100,'refresh uses kitchen solids');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{closeDrawers();zoomToBox([1400,1800,3600,3200],80);});await p.waitForTimeout(300);
  await p.screenshot({animations:'disabled',path:verification.output('playwright/directional-kitchen-solids/'+mode+'-mobile.png')});
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');check(!errors.length,errors.join(';'));
  results.push({mode,passed:true,baseline});await context.close();
 }
 return results;
}
