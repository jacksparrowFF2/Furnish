async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[],external=[];
  const base=mode==='file'?verification.fileBase:verification.baseURL,check=(ok,message)=>{if(!ok)throw Error(mode+': '+message);};
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(verification.baseURL).origin)external.push(r.url());});
  try{
   for(const [name,url] of [['fridge','output/fridges/preview.html'],['heater','output/waterheater-flat-preview.html']]){
    await p.goto(base+url);await p.waitForFunction(()=>window.previewReady===true);
    check(await p.locator('canvas').count()===1,name+' canvas');check(await p.evaluate(()=>!!globalThis.FurnishApplianceModel&&!!globalThis.FurnishModelPrimitives),name+' shared modules');
    if(name==='fridge')await p.locator('#front').click();
    await p.screenshot({path:verification.output('playwright/model-entry/'+mode+'-'+name+'-front.png')});
    if(name==='fridge'){await p.locator('#angle').click();await p.screenshot({path:verification.output('playwright/model-entry/'+mode+'-fridge-angle.png')});}
    if(name==='heater')check(await p.locator('#error').innerText()==='','heater render error');
   }
   await p.goto(base+'index.html');await p.locator('#lib .item').first().waitFor();
   await p.evaluate(()=>mutate(()=>{
    state.furniture=[{id:'shared-fridge',name:'共用冰箱',type:'fridge_french_drawer',cx:2200,cy:2500,w:833,d:595,h:1910,rot:90,flip:true,color:'#f1f0ed'},{id:'shared-heater',name:'共用热水器',type:'waterheater_flat',cx:3500,cy:2500,w:700,d:320,h:565,rot:180,flip:true,color:'#fafafa'}];
   }));
   await p.evaluate(()=>selectIds(['shared-heater']));await p.locator('#fMountHeight').fill('0');await p.locator('#fMountHeight').press('Tab');
   check(await p.evaluate(()=>getF('shared-heater').mountHeight)===0,'zero mount edit');
   await p.evaluate(()=>undo());check(await p.evaluate(()=>getF('shared-heater').mountHeight===undefined),'legacy mount undo');
   await p.evaluate(()=>redo());check(await p.evaluate(()=>getF('shared-heater').mountHeight)===0,'zero mount redo');
   await verification.waitForCache(p);const before=await p.evaluate(()=>JSON.stringify(state.furniture));await p.reload();check(await p.evaluate(()=>JSON.stringify(state.furniture))===before,'refresh retains both models');
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#view3d canvas').waitFor();
   await p.screenshot({path:verification.output('playwright/model-entry/'+mode+'-application.png')});
   await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);
   await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);await p.evaluate(()=>selectIds(['shared-heater']));await p.locator('#fab [data-act="prop"]').click();
   await p.waitForFunction(()=>{const r=document.querySelector('aside.right').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow viewport');
   await p.screenshot({path:verification.output('playwright/model-entry/'+mode+'-mobile.png')});
   check(!errors.length&&!external.length,JSON.stringify({errors,external}));results.push({mode,passed:true,productionPreviews:2,main3D:true,zeroMount:true,undoRedo:true,refresh:true,narrow:true,errors,external});
  }finally{await context.close();}
 }
 return results;
}
