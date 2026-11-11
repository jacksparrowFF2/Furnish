async(page,V)=>{
 const results=[],check=(v,m)=>{if(!v)throw Error(m);};
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>!repositoryBooting);
   await p.evaluate(()=>{mutate(()=>state.furniture=[{...FurnishCabinet.preset('tv-floor'),id:'prop-tv',type:'cabinet',cx:3000,cy:3000,rot:90},FurnishKitchen.configure({id:'prop-kitchen',type:'counter',name:'厨房',cx:5000,cy:4000,rot:0,color:'#eee'},FurnishKitchen.defaults({w:2046,d:600})),{...F('custom','普通家具',4000,5000,600,500,0,'#ccc'),id:'prop-other'}]);selectIds(['prop-tv']);drawer('panel',true);});
   const original=await p.evaluate(()=>JSON.stringify(getF('prop-tv')));
   for(const width of [1500,1088,390]){
    await p.setViewportSize({width,height:900});await p.evaluate(()=>{selectIds(['prop-tv']);drawer('panel',!narrow());});
    await p.locator('#fab [data-act="prop"]').click();await p.locator('#cab-builder canvas').waitFor();
    check(await p.locator('#dlgTitle').innerText()==='乐高式柜体搭建','properties opens cabinet designer '+width);
    check(await p.locator('[data-builder-overall="w"]').inputValue()==='3000','existing cabinet width');
    check(await p.evaluate(()=>JSON.stringify(getF('prop-tv')))===original,'opening preserves saved structure');
    await p.screenshot({path:V.output('playwright/property-open/'+mode+'-'+width+'.png')});
    await p.getByRole('button',{name:'取消',exact:true}).click();
    check(await p.evaluate(()=>JSON.stringify(getF('prop-tv')))===original,'cancel preserves saved structure');
   }
   await p.locator('#fab [data-act="prop"]').click();await V.setCabinetOverall(p,'w',2900);await p.getByRole('button',{name:'保存柜体搭建',exact:true}).click();
   check(await p.evaluate(()=>Math.abs(getF('prop-tv').w-2900)<.001),'save');await p.evaluate(()=>undo());check(await p.evaluate(()=>JSON.stringify(getF('prop-tv')))===original,'undo');await p.evaluate(()=>redo());check(await p.evaluate(()=>Math.abs(getF('prop-tv').w-2900)<.001),'redo');
   await V.waitForCache(p);await p.reload();check(await p.evaluate(()=>Math.abs(getF('prop-tv').w-2900)<.001),'refresh');
   await p.evaluate(()=>selectIds(['prop-kitchen']));await p.locator('#fab [data-act="prop"]').click();await p.locator('#cab-assembly canvas').waitFor();await p.getByRole('button',{name:'取消',exact:true}).click();
   for(const ids of [['prop-other'],['prop-tv','prop-other'],['prop-tv']]){
    await p.evaluate(ids=>{if(ids.length===1&&ids[0]==='prop-tv')mutate(()=>getF('prop-tv').locked=true);selectIds(ids);closeDrawers();},ids);
    await p.locator('#fab [data-act="prop"]').click();
    check(await p.locator('#panel [data-panel-scope="object"]').isVisible(),'sidebar fallback '+ids.join(','));check(await p.locator('#dlg').getAttribute('hidden')!==null,'fallback does not open designer');
   }
   check(!errors.length,errors.join(';'));results.push({mode,passed:true,widths:[1500,1088,390],checks:['direct cabinet entry with sidebar already open','cancel','save','undo','redo','refresh','kitchen entry','ordinary furniture','multiselection','locked cabinet']});
  }finally{await ctx.close();}
 }
 return results;
}
