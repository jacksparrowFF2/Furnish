async (page,V)=>{
 const choose=(kind,column)=>V.selectCabinetObject(p,{kind,column});
 const results=[];
 for(const [mode,url,offline] of [['http',V.baseURL+'index.html',false],['file',V.fileBase+'index.html',true]]){
  const context=await page.context().browser().newContext({viewport:{width:1480,height:1050},offline}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const check=(ok,m)=>{if(!ok)throw Error(mode+': '+m);},field=key=>p.locator(`[data-laundry-value="assembly.sink.${key}"]`),open=async()=>{await p.evaluate(()=>FurnishCabinetEditor.open('laundry-edit'));await p.locator('#cab-preview canvas').waitFor();};
  try{
   await p.goto(url);await p.locator('#lib').waitFor();await p.evaluate(()=>{let i=0;const at=ROOMS.find(r=>r.name==='客厅').at,items=FurnishKitchen.createLaundryCabinet({id:'laundry-edit',cx:at[0],cy:at[1],rot:0,color:'#f3f1ec'},()=>`le${++i}`,'right');mutate(()=>state.furniture=items);});
   await p.evaluate(()=>mutate(()=>{const a=getF('laundry-edit').kitchen.laundry.assembly;a.upper.y+=100;a.open.y+=100;}));
   await open();await p.locator('[data-laundry-align-back]').click();await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();check(await p.evaluate(()=>{const f=getF('laundry-edit');return ['upper','open'].every(key=>{const a=f.kitchen.laundry.assembly[key];return Math.abs(a.y-a.d/2+f.d/2)<.01;});}),'existing upper and open backs align');
   await open();await p.locator('#cab-kitchen-notch-width').fill('121');await p.locator('#cab-kitchen-notch-width').press('Enter');check(await p.locator('#cab-kitchen-notch-width').inputValue()==='121','Enter retains notch number');check(await p.locator('#cab-preview').isVisible(),'Enter keeps designer open');
   await field('w').fill('560');await field('w').press('Enter');check(await field('w').inputValue()==='560','sink width Enter');await field('d').fill('480');await field('d').press('Enter');check(await field('d').inputValue()==='480','sink depth Enter');
   await field('enabled').uncheck();check(await field('w').inputValue()==='560','disabled sink retains dimensions');await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
   check(await p.evaluate(()=>!FurnishKitchen.laundryParts(getF('laundry-edit')).some(p=>p.key==='sink')),'disabled sink removed from derived model');
   await p.evaluate(()=>undo());check(await p.evaluate(()=>getF('laundry-edit').kitchen.laundry.assembly.sink.enabled!==false),'undo');await p.evaluate(()=>redo());await V.waitForCache(p);await p.reload();check(await p.evaluate(()=>getF('laundry-edit').kitchen.laundry.assembly.sink.enabled===false),'refresh');
   await open();await field('enabled').check();check(await field('w').inputValue()==='560','re-enable restores width');await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();check(await p.evaluate(()=>FurnishKitchen.laundryParts(getF('laundry-edit')).find(p=>p.key==='sink').furniture.d===480),'enabled basin depth');
   await open();await p.locator('#cab-kitchen-open-all').click();await p.waitForTimeout(400);await p.screenshot({path:V.output('playwright/laundry-editing/'+mode+'-notch.png')});
   await p.setViewportSize({width:390,height:844});await field('w').scrollIntoViewIfNeeded();check(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'narrow layout');await p.screenshot({path:V.output('playwright/laundry-editing/'+mode+'-narrow.png')});check(errors.length===0,errors.join('; '));results.push({mode,status:'PASS',errors});
  }finally{await context.close();}
 }
 return results;
}
