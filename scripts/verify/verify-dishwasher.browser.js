async (page,verification)=>{
 const root=verification.root,results=[];
 for(const mode of ['file','http']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(verification.baseURL.slice(0,-1)))external.push(r.url());});
  const base=mode==='file'?verification.fileBase:verification.baseURL,check=(v,msg)=>{if(!v)throw Error(mode+': '+msg);};
  try{
   await p.goto(base+'output/dishwasher/preview.html');await p.waitForFunction(()=>window.previewReady);
   for(const pose of ['closed','open']){
    if(pose==='open')await p.getByRole('button',{name:'展开折叠门',exact:true}).click();
    check(await p.evaluate(()=>{const d=window.dishwasherPreview;return d.model.userData.countertopDishwasher===true&&d.f.dishwasherDoorOpen===document.querySelector('#pose').textContent.includes('600');}),'production preview pose');
    for(const [label,view] of [['正面','front'],['斜视','angle'],['侧面','side']]){await p.getByRole('button',{name:label,exact:true}).click();await p.screenshot({path:root+'output/dishwasher/'+mode+'-'+pose+'-'+view+'.png'});}
   }
   await p.goto(base+'index.html');await p.locator('#lib').waitFor();await p.locator('#lib').getByText('米家台面洗碗机 · 5套',{exact:true}).first().click();const id=await p.evaluate(()=>selIds()[0]);
   check(await p.evaluate(id=>{const f=getF(id);return f.w===550&&f.d===350&&f.h===598&&f.mountHeight===860&&f.dishwasherDoorOpen===false;},id),'catalog creation');
   await p.locator('#dishwasher-door').selectOption('open');check(await p.evaluate(id=>getF(id).dishwasherDoorOpen,id),'door edit');check(await p.locator('[data-dishwasher-fold="open"]').count()>0,'2D folded door');
   await p.evaluate(()=>undo());check(await p.evaluate(id=>getF(id).dishwasherDoorOpen===false,id),'undo door');await p.evaluate(()=>redo());check(await p.evaluate(id=>getF(id).dishwasherDoorOpen===true,id),'redo door');
   for(const [selector,value,key] of [['#fMountHeight','900','mountHeight'],['#fH','620','h'],['#fW','600','w'],['#fD','400','d']]){
    await verification.editFurnitureField(p,selector,value);check(await p.evaluate(({id,key,value})=>getF(id)[key]===Number(value),{id,key,value}),key+' edit');
   }
   await p.locator('#fMountHeight').fill('0');await p.locator('#fMountHeight').press('Tab');check(await p.evaluate(id=>getF(id).mountHeight===0,id),'zero');await p.evaluate(()=>undo());
   await p.locator('#fMountHeight').fill('-1');await p.locator('#fMountHeight').press('Tab');check(await p.evaluate(id=>getF(id).mountHeight===900,id),'invalid elevation');
   await p.locator('[data-act="lock"]').first().click();check(await p.locator('#dishwasher-door').isDisabled(),'locked pose');check(await p.locator('#fMountHeight').isDisabled(),'locked elevation');await p.locator('[data-act="lock"]').first().click();
   await p.locator('#fab [data-act="dup"]').click();check(await p.evaluate(()=>state.furniture.filter(f=>f.type==='dishwasher_mijia_countertop'&&f.dishwasherDoorOpen&&f.mountHeight===900).length===2),'copy');await p.evaluate(()=>undo());
   const before=await p.evaluate(id=>JSON.stringify(getF(id)),id);await p.waitForFunction(()=>!savePending);await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'refresh');await p.evaluate(id=>selectIds([id]),id);
   await p.evaluate(()=>{store.designs.push({id:'dishwasher-check',name:'台面洗碗机验收',planId:PLAN.id,ts:Date.now(),work:JSON.parse(JSON.stringify(state))});});
   await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
   const downloaded=p.waitForEvent('download');await p.locator('#pr-export').click();const file=root+'output/playwright/dishwasher/'+mode+'.furnish.json';await(await downloaded).saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();
   check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'download/reimport');check(await p.evaluate(()=>store.designs.some(d=>d.id==='dishwasher-check'&&d.work.furniture.some(f=>f.type==='dishwasher_mijia_countertop'&&f.dishwasherDoorOpen&&f.mountHeight===900))),'named design');
   await p.evaluate(id=>{selectIds([id]);zoomSel();},id);await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(600);await p.screenshot({path:root+'output/playwright/dishwasher/'+mode+'-app-3d.png'});check(await p.evaluate(id=>!furnitureError(getF(id)),id),'app 3D');
   await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);await p.evaluate(id=>selectIds([id]),id);await p.setViewportSize({width:390,height:844});await p.locator('#tgPanel').click();
   check(await p.locator('#dishwasher-door').isVisible(),'narrow door field');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow overflow');await p.screenshot({path:root+'output/playwright/dishwasher/'+mode+'-mobile.png'});
   check(!errors.length,errors.join(';'));check(!external.length,'external dependencies');results.push({mode,passed:true,errors,externalRequests:external.length});
  }finally{await context.close();}
 }
 return results;
}
