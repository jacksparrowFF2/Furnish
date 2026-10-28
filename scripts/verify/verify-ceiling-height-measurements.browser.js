async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1450,height:1000},offline:mode==='file'}),p=await ctx.newPage();
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');
   await p.evaluate(()=>{const r=PLAN.rooms.find(r=>r.counted!==false),b=bbox(r.poly),x=(b[0]+b[2])/2,y=(b[1]+b[3])/2;mutate(()=>{Object.assign(state,FurnishFloorFinish.setLayers(state,PLAN,[r.id],{rawZ:0,tileThickness:10,baseThickness:50,bathroomBaseThickness:45}));state.ceilings=FurnishCeiling.setRegion(state,{id:'height-ceiling',name:'吊顶高度验收',polygon:[[x-300,y-300],[x+300,y-300],[x+300,y+300],[x-300,y+300]],style:'flat',height:2400,thickness:12,center:true,sections:[]}).ceilings;});});
   await p.evaluate(()=>{const r=state.ceilings.regions.find(r=>r.id==='height-ceiling');mutate(()=>{state.ceilings=FurnishCeiling.setRegion(state,{...r,id:'height-ring',name:'中央板高度',style:'ring',polygon:r.polygon.map(p=>p.map((v,i)=>v+(v-(r.polygon[0][i]+r.polygon[2][i])/2))),sections:[FurnishCeiling.componentPreset('gypsum','plain')],center:true,centerConnection:{mode:'independent',height:2500,inset:450}}).ceilings;});});
   await p.locator('#ceiling-open').click();await p.locator('[data-design="region"]').selectOption('height-ring');await p.locator('[data-design-stage="section"]').click();await p.locator('[data-assembly-part="center"]').click();
   const center=p.locator('[data-assembly-key="centerHeight"]');if(await center.inputValue()!=='2440')throw Error('Center input datum mismatch');await center.fill('2450');await p.waitForFunction(()=>!document.querySelector('[data-design-action="save"]').disabled);await p.locator('[data-design-action="save"]').click();
   if(await p.evaluate(()=>state.ceilings.regions.find(r=>r.id==='height-ring').centerConnection.height)!==2510)throw Error('Center save datum mismatch');
   await p.locator('#ceiling-open').click();await p.locator('[data-design="region"]').selectOption('height-ceiling');await p.locator('[data-design-stage="area"]').click();
   const input=p.locator('[data-design="height"]');if(await input.inputValue()!=='2340')throw Error('Input must use finished floor');
   await input.fill('2350');await p.waitForFunction(()=>!document.querySelector('[data-design-action="save"]').disabled);
   await p.locator('[data-design-action="save"]').click();
   const saved=await p.evaluate(()=>state.ceilings.regions.find(r=>r.id==='height-ceiling').height);if(saved!==2410)throw Error('Absolute save drift: '+saved);
   await p.evaluate(()=>undo());await p.evaluate(()=>redo());await V.waitForCache(p);await p.reload();
   await p.locator('[data-plan-mode="ceiling"]').click();
   const level=p.locator('[data-ceiling-level="height-ceiling"]');if(!(await level.textContent()).includes('底部距地砖 2350 mm')||!(await level.textContent()).includes('底部距房顶 390 mm'))throw Error('Plan height labels mismatch');
   const exported=await p.evaluate(()=>preparePlanSVG().svg.querySelector('[data-ceiling-level="height-ceiling"]').textContent);if(!exported.includes('底部距地砖 2350 mm'))throw Error('Export datum mismatch');
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);
   await p.evaluate(()=>{const c=state.ceilings.items.find(c=>c.regionId==='height-ceiling');select({kind:'ceiling',id:c.id,regionId:c.regionId});});
   const label=p.locator('.scene-ceiling-height');await label.waitFor();if(!(await label.innerText()).includes('2350 mm'))throw Error('Scene finished-floor height missing');
   await p.waitForTimeout(400);await p.screenshot({path:V.output('playwright/ceiling-height/'+mode+'-desktop.png')});
   await p.setViewportSize({width:390,height:844});await p.evaluate(()=>closeDrawers());await p.waitForTimeout(400);await p.screenshot({path:V.output('playwright/ceiling-height/'+mode+'-mobile.png')});
   results.push({mode,passed:true,saved,scene:await label.innerText(),undoRedoRefresh:true});
  }finally{await ctx.close();}
 }return results;
}
