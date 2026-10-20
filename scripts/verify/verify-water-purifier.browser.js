async (page,verification)=>{
 const root=verification.root,results=[];
 for(const mode of ['file','http']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(verification.baseURL.slice(0,-1)))external.push(r.url());});
  const base=mode==='file'?verification.fileBase:verification.baseURL,check=(v,msg)=>{if(!v)throw Error(mode+': '+msg);};
  await p.goto(base+'output/water-purifier/preview.html');await p.waitForFunction(()=>window.previewReady);
  for(const label of ['正面','斜视']){await p.getByRole('button',{name:label,exact:true}).click();await p.screenshot({path:root+'output/water-purifier/'+mode+'-'+(label==='正面'?'front':'angle')+'.png'});}
  await p.goto(base+'index.html');await p.locator('#lib').waitFor();await p.locator('#lib').getByText('米家净水器 2 · 1200G',{exact:true}).first().click();const id=await p.evaluate(()=>selIds()[0]);
  check(await p.evaluate(id=>{const f=getF(id);return f.w===163&&f.d===445&&f.h===379&&f.mountHeight===0&&f.model==='净水器 2 1200G';},id),'creation');
  for(const [selector,value,key] of [['#fMountHeight','750','mountHeight'],['#fH','400','h']]){
   await p.locator(selector).fill(value);await p.locator(selector).press('Tab');check(await p.evaluate(({id,key,value})=>getF(id)[key]===Number(value),{id,key,value}),key+' edit');
  }
  await p.locator('#fab [data-fab-edit="size"]').click();await p.locator('#fab-width').fill('600');await p.locator('#fab-depth').fill('320');await p.getByRole('button',{name:'应用尺寸',exact:true}).click();check(await p.evaluate(id=>getF(id).w===600&&getF(id).d===320,id),'footprint edit');
  await p.getByRole('button',{name:'撤销',exact:true}).first().click();check(await p.evaluate(id=>getF(id).w===163&&getF(id).d===445,id),'undo');await p.getByRole('button',{name:'重做',exact:true}).first().click();check(await p.evaluate(id=>getF(id).w===600&&getF(id).d===320,id),'redo');
  await p.locator('#fMountHeight').fill('0');await p.locator('#fMountHeight').press('Tab');check(await p.evaluate(id=>getF(id).mountHeight===0,id),'zero');await p.evaluate(()=>undo());
  await p.locator('#fMountHeight').fill('-1');await p.locator('#fMountHeight').press('Tab');check(await p.evaluate(id=>getF(id).mountHeight===750,id),'invalid elevation');
  await p.locator('[data-act="lock"]').first().click();check(await p.locator('#fMountHeight').isDisabled(),'lock');await p.locator('[data-act="lock"]').first().click();
  await p.locator('#fab [data-act="dup"]').click();check(await p.evaluate(()=>state.furniture.filter(f=>f.type==='water_purifier_mijia_1200g').length===2),'copy');await p.evaluate(()=>undo());
  const before=await p.evaluate(id=>JSON.stringify(getF(id)),id);await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'refresh');await p.evaluate(id=>selectIds([id]),id);
  // Real project download/upload includes one named design as well as current work.
  await p.evaluate(()=>{store.designs.push({id:'water-purifier-check',name:'净水器验收',planId:PLAN.id,ts:Date.now(),work:JSON.parse(JSON.stringify(state))});});
  await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
  const downloaded=p.waitForEvent('download');await p.locator('#pr-export').click();const file=root+'output/playwright/water-purifier/'+mode+'.furnish.json';await(await downloaded).saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();
  check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'download/reimport');check(await p.evaluate(()=>store.designs.some(d=>d.id==='water-purifier-check'&&d.work.furniture.some(f=>f.type==='water_purifier_mijia_1200g'&&f.mountHeight===750))),'named design');
  await p.evaluate(id=>{selectIds([id]);zoomSel();},id);await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(600);await p.screenshot({path:root+'output/playwright/water-purifier/'+mode+'-app-3d.png'});
  check(await p.evaluate(id=>!furnitureError(getF(id))&&furnitureRenderErrors.size===0,id),'3D render');
  await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);await p.evaluate(id=>selectIds([id]),id);await p.setViewportSize({width:390,height:844});await p.locator('#tgPanel').click();await p.waitForTimeout(300);
  check(await p.locator('#fMountHeight').isVisible(),'narrow height field');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow overflow');await p.screenshot({path:root+'output/playwright/water-purifier/'+mode+'-mobile.png'});
  check(!errors.length,errors.join(';'));check(!external.length,'external dependencies');results.push({mode,passed:true,errors,externalRequests:external.length});await context.close();
 }
 return results;
}
