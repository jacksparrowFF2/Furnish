async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const visible=selector=>p.locator(selector).evaluateAll(els=>els.filter(el=>getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0).length);
  const toggle=async key=>{if(!await p.locator('#showMenu').evaluate(el=>el.open))await p.locator('#showMenu > summary').click();await p.locator(`[data-t="${key}"]`).click();};
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');await p.locator('#lib .item').first().waitFor();
   await p.evaluate(()=>{
    const room=PLAN.rooms.find(r=>r.id==='kitchen')||PLAN.rooms.find(r=>r.counted!==false),[cx,cy]=room.at;
    mutate(()=>{state.furniture=[{id:'check-heater',type:'waterheater_flat',name:'热水器',cx:cx-900,cy,w:700,d:320,h:565,mountHeight:1650,rot:0,color:'#fafafa'},{id:'check-fridge',type:'fridge',name:'冰箱',cx,cy,w:700,d:700,h:1800,rot:0,color:'#ddd'},{id:'check-dishwasher',type:'dishwasher_mijia_countertop',name:'台面洗碗机',cx:cx+900,cy,w:550,d:350,h:598,mountHeight:860,rot:0,color:'#eee'}];state.scene3d=FurnishDesign.sceneSettings();state.wallTiling=FurnishWallTiling.setEnabled(state,FurnishProject.effectivePlan(PLAN,state),[room.id],true).wallTiling;});
   });
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(250);
   await p.waitForFunction(()=>[...document.querySelectorAll('.wall-tile-scene-number')].some(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0));
   if(await visible('.heater-clearance-label')!==2||await visible('.appliance-clearance-label')!==2)throw Error('missing appliance labels');
   if(!await p.locator('[data-clearance-item="check-fridge"]').textContent().then(t=>t.includes('预留尺寸：无数据')))throw Error('no missing-data message');
   if(!await p.locator('[data-clearance-item="check-dishwasher"]').textContent().then(t=>t.includes('200 mm')&&t.includes('待核对')))throw Error('no dishwasher checks');
   await p.locator('#showMenu > summary').click();
   await p.waitForTimeout(250);
   await p.screenshot({path:verification.output('playwright/scene-clearances/'+mode+'-on.png')});
   await toggle('wallNumbers');await p.waitForTimeout(150);
   if(await visible('.wall-tile-scene-number'))throw Error('wall numbers remain visible');
   if(await visible('.heater-clearance-label')!==2)throw Error('wall toggle affected clearances');
   await toggle('clearances');await p.waitForTimeout(150);
   if(await visible('.heater-clearance-label')||await visible('.appliance-clearance-label'))throw Error('clearance labels remain visible');
   await toggle('furn');await toggle('furn');await p.waitForTimeout(150);
   if(await visible('.heater-clearance-label'))throw Error('furniture toggle reset clearance preference');
   await p.evaluate(()=>{mutate(()=>state.furniture[0].cx+=10);undo();redo();});
   if(await p.evaluate(()=>state.scene3d.wallNumbers||state.scene3d.clearances))throw Error('undo/redo lost switches');
   await verification.waitForCache(p);await p.reload();
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);
   await p.locator('#showMenu > summary').click();
   if(await visible('.wall-tile-scene-number')||await visible('.heater-clearance-label')||await visible('.appliance-clearance-label'))throw Error('reload lost switches');
   await toggle('clearances');await toggle('wallNumbers');await p.waitForTimeout(150);
   if(await visible('.appliance-clearance-label')!==2||!await visible('.wall-tile-scene-number'))throw Error('reenable failed');
   await p.screenshot({path:verification.output('playwright/scene-clearances/'+mode+'-restored.png')});
   await p.setViewportSize({width:390,height:844});await p.waitForTimeout(150);
   if(!await p.locator('#showMenu').getAttribute('open').then(v=>v!==null))await p.locator('#showMenu > summary').click();
   await p.waitForTimeout(250);
   await p.screenshot({path:verification.output('playwright/scene-clearances/'+mode+'-narrow.png')});
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('narrow viewport overflow');
   await toggle('clearances');await toggle('wallNumbers');await p.waitForTimeout(150);
   if(await visible('.heater-clearance-label')||await visible('.appliance-clearance-label')||await visible('.wall-tile-scene-number'))throw Error('narrow switches failed');
   await toggle('clearances');await toggle('wallNumbers');await p.waitForTimeout(150);
   if(await visible('.appliance-clearance-label')!==2)throw Error('narrow reenable failed');
   if(errors.length)throw Error(errors.join('\n'));results.push({mode,passed:true,independentSwitches:true,reload:true,undoRedo:true,missingData:true,dishwasher:true,narrow:true});
  }finally{await context.close();}
 }
 return results;
}
