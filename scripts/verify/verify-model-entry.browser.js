async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[],external=[];
  const base=mode==='file'?verification.fileBase:verification.baseURL,check=(ok,message)=>{if(!ok)throw Error(mode+': '+message);};
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(verification.baseURL).origin)external.push(r.url());});
  try{
   for(const [name,url] of [['fridge','output/fridges/preview.html'],['heater','output/waterheater-flat-preview.html'],['laundry','output/laundry-stack/preview.html'],['telescopic','output/telescopic/preview.html'],['sideboard','output/sideboard/preview.html']]){
    await p.goto(base+url);await p.waitForFunction(()=>window.previewReady===true).catch(e=>{throw Error(name+' preview failed: '+errors.join('; ')+' '+e.message);});
    check(name==='sideboard'?await p.locator('canvas').count()>0:await p.locator('canvas').count()===1,name+' canvas');check(await p.evaluate(name=>name==='sideboard'?!!globalThis.FurnishCabinetModel:!!(globalThis.FurnishApplianceModel||globalThis.FurnishSlidingOpeningModel)&&!!globalThis.FurnishModelPrimitives,name),name+' shared modules');
    if(name==='fridge')await p.locator('#front').click();
    await p.screenshot({path:verification.output('playwright/model-entry/'+mode+'-'+name+'-front.png')});
    if(name==='fridge'){await p.locator('#angle').click();await p.screenshot({path:verification.output('playwright/model-entry/'+mode+'-fridge-angle.png')});}
    if(name==='heater'||name==='sideboard')check(await p.locator('#error').innerText()==='','heater render error');
    if(name==='telescopic'){await p.locator('#door').click();await p.locator('#window').click();await p.locator('#track').selectOption('true');await p.locator('#side').click();await p.locator('#front').click();await p.screenshot({path:verification.output('playwright/model-entry/'+mode+'-telescopic-controls.png')});}
   }
   await p.goto(base+'index.html');await p.locator('#lib .item').first().waitFor();
   await p.evaluate(()=>mutate(()=>{
    state.furniture=[{id:'shared-fridge',name:'共用冰箱',type:'fridge_french_drawer',cx:2200,cy:2500,w:833,d:595,h:1910,rot:90,flip:true,color:'#f1f0ed'},{id:'shared-heater',name:'共用热水器',type:'waterheater_flat',cx:3500,cy:2500,w:700,d:320,h:565,rot:180,flip:true,color:'#fafafa'},{id:'shared-washer',name:'共用洗衣机',type:'washer',cx:4500,cy:4500,w:600,d:600,h:850,rot:0,color:'#e6ebee'},{id:'shared-dryer',name:'共用烘干机',type:'dryer',cx:4500,cy:4500,w:600,d:600,h:900,mountHeight:870,rot:0,color:'#e6ebee'},{id:'shared-window',name:'共用三联动窗',type:'tripleslidingwindow',cx:3000,cy:5000,w:1800,d:90,h:1500,mountHeight:900,rot:90,flip:true,color:'#41474b'}];
   }));
   await p.evaluate(()=>selectIds(['shared-heater']));await p.locator('#fMountHeight').fill('0');await p.locator('#fMountHeight').press('Tab');
   check(await p.evaluate(()=>getF('shared-heater').mountHeight)===0,'zero mount edit');
   await p.evaluate(()=>undo());check(await p.evaluate(()=>getF('shared-heater').mountHeight===undefined),'legacy mount undo');
   await p.evaluate(()=>redo());check(await p.evaluate(()=>getF('shared-heater').mountHeight)===0,'zero mount redo');
   await verification.waitForCache(p);const before=await p.evaluate(()=>JSON.stringify(state.furniture));await p.reload();const after=await p.evaluate(()=>JSON.stringify(state.furniture));check(after===before,'refresh retains all models: '+JSON.stringify({before:JSON.parse(before),after:JSON.parse(after)}));
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#view3d canvas').waitFor();
   check(await p.evaluate(()=>furnitureRenderErrors.size===0),'all production models constructed without fallback markers');
   await p.screenshot({path:verification.output('playwright/model-entry/'+mode+'-application.png')});
   await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);
   await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);await p.evaluate(()=>selectIds(['shared-heater']));await p.locator('#fab [data-act="prop"]').click();
   await p.waitForFunction(()=>{const r=document.querySelector('aside.right').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow viewport');
   await p.screenshot({path:verification.output('playwright/model-entry/'+mode+'-mobile.png')});
   check(!errors.length&&!external.length,JSON.stringify({errors,external}));results.push({mode,passed:true,productionPreviews:4,main3D:true,laundryAndSliding:true,zeroMount:true,undoRedo:true,refresh:true,narrow:true,errors,external});
  }finally{await context.close();}
 }
 return results;
}
