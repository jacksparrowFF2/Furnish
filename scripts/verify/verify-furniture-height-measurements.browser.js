async(page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1450,height:1000},offline:mode==='file'}),p=await context.newPage();
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');
   await p.evaluate(()=>{const r=PLAN.rooms.find(r=>r.counted!==false),b=bbox(r.poly);mutate(()=>{Object.assign(state,FurnishFloorFinish.setLayers(state,PLAN,[r.id],{rawZ:0,tileThickness:10,baseThickness:50,bathroomBaseThickness:45}));state.furnitureDatum='finished-floor';state.furniture=[{id:'height-cab',type:'wardrobe',name:'高度验收柜',cx:(b[0]+b[2])/2,cy:(b[1]+b[3])/2,w:800,d:600,h:2400,rot:0,color:'#ddd'}];});select({kind:'furn',id:'height-cab'});});
   await p.locator('#fab [data-fab-edit="distance"]').click();
   const summary=p.locator('#fab-editor [data-furniture-dimensions]');await summary.waitFor();
   if(!(await summary.innerText()).includes('顶部距房顶'))throw Error('Missing ceiling gap');
   await p.screenshot({path:verification.output('playwright/furniture-height/'+mode+'-desktop.png')});
   await p.setViewportSize({width:390,height:844});await p.evaluate(()=>closeDrawers());await p.waitForFunction(()=>document.querySelector('aside.right').getBoundingClientRect().left>=innerWidth);await p.waitForTimeout(400);await p.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});await p.screenshot({path:verification.output('playwright/furniture-height/'+mode+'-mobile.png')});
   if(!await summary.isVisible())throw Error('Height summary hidden on mobile');
   const text=await summary.innerText();
   if(!text.includes('2400 mm')||!text.includes('340 mm'))throw Error('Finished floor/ceiling gap incorrect: '+text);
   await p.evaluate(()=>mutate(()=>state.furniture[0].h=2500));await p.evaluate(()=>undo());
   if(await p.evaluate(()=>state.furniture[0].h)!==2400)throw Error('Undo failed');
   await p.evaluate(()=>redo());if(await p.evaluate(()=>state.furniture[0].h)!==2500)throw Error('Redo failed');
   await verification.waitForCache(p);await p.reload();
   const restored=await p.evaluate(()=>FurnishDesign.furnitureHeightMeasurements(state.furniture.find(f=>f.id==='height-cab'),canvasEffectivePlan(),state.furniture));
   if(restored.top!==2500||restored.roofGap!==240)throw Error('Refresh changed height: '+JSON.stringify(restored));
   results.push({mode,passed:true,text,undoRedoRefresh:true});
  }finally{await context.close();}
 }return results;
}
