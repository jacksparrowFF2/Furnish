async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(v,s)=>{if(!v)throw Error(mode+': '+s);};
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');
   await p.evaluate(()=>{mutate(()=>{state.furniture=[{id:'tv-view',type:'tv',name:'电视视图验收',cx:4000,cy:4000,w:1880,d:90,rot:270,flip:true,color:'#1d1d1f'}];});selectIds(['tv-view']);zoomSel();});
   await p.locator('#gFurn [data-tv-part="panel"]').waitFor();
   await p.screenshot({path:verification.output('playwright/tv-views/'+mode+'-plan.png')});
   await p.evaluate(()=>mutate(()=>{getF('tv-view').d=160;}));await p.evaluate(()=>undo());check(await p.evaluate(()=>getF('tv-view').d===90),'undo');await p.evaluate(()=>redo());
   await verification.waitForCache(p);await p.reload();check(await p.evaluate(()=>getF('tv-view').d===160),'reload');
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(1200);
   await p.evaluate(()=>selectIds(['tv-view']));await p.locator('#vSelection').click();await p.waitForTimeout(1500);
   await p.screenshot({path:verification.output('playwright/tv-views/'+mode+'-3d.png')});
   await p.setViewportSize({width:390,height:844});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow overflow');
   check(!errors.length,errors.join(';'));results.push({mode,passed:true,errors});
  }finally{await context.close();}
 }
 return results;
}
