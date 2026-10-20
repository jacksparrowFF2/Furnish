async (page,verification)=>{
 const results=[];
 for(const mode of ['file','http']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const base=mode==='file'?verification.fileBase:verification.baseURL,check=(v,s)=>{if(!v)throw Error(mode+': '+s);};
  await p.goto(base+'output/cat-tree/preview.html');await p.waitForFunction(()=>window.previewReady);
  for(const [id,name] of [['angle','angle'],['front','front'],['top','top']]){await p.locator('#'+id).click();await p.screenshot({path:verification.output('cat-tree/'+mode+'-'+name+'.png')});}
  await p.goto(base+'index.html');await p.locator('#repository-loading').waitFor({state:'hidden'});await p.locator('#lib').getByText('猫爬架 · 绿叶成荫围栏款',{exact:true}).first().click();
  const id=await p.evaluate(()=>selIds()[0]);check(await p.evaluate(id=>{const f=getF(id);return f.type==='cat_tree'&&f.w===500&&f.d===500&&f.h===1430;},id),'catalog creation');
  await p.locator('[data-fab-edit="size"]').click();await p.locator('#fab-width').fill('480');await p.locator('#fab-depth').fill('560');await p.getByRole('button',{name:'应用尺寸',exact:true}).click();check(await p.evaluate(id=>getF(id).w===480&&getF(id).d===560,id),'footprint edit');
  await p.locator('#fab [data-act="prop"]').click();await p.locator('#fH').fill('1530');await p.locator('#fH').press('Tab');
  check(await p.evaluate(id=>getF(id).h===1530,id),'height edit');await p.evaluate(()=>undo());check(await p.evaluate(id=>getF(id).h===1430,id),'undo');await p.evaluate(()=>redo());check(await p.evaluate(id=>getF(id).h===1530,id),'redo');
  await p.locator('#fH').blur();await p.keyboard.press('Control+d');check(await p.evaluate(()=>state.furniture.filter(f=>f.type==='cat_tree').length===2),'copy');await p.evaluate(()=>undo());
  const before=await p.evaluate(id=>JSON.stringify(getF(id)),id);await verification.waitForCache(p);await p.reload();await p.locator('#repository-loading').waitFor({state:'hidden'});check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'saved refresh');
  check(await p.evaluate(id=>{const w={furniture:[getF(id)]},x=FurnishProject.unpack(FurnishProject.pack({planId:PLAN.id,current:w,designs:[{id:'cat-tree-check',name:'猫爬架',work:w}],catalog:[]}));return JSON.stringify(x.current.furniture)===JSON.stringify(w.furniture)&&x.designs[0].work.furniture[0].type==='cat_tree';},id),'current/named project roundtrip');
  await p.evaluate(id=>{selectIds([id]);zoomSel();},id);await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(500);check(await p.evaluate(id=>!furnitureError(getF(id))&&furnitureRenderErrors.size===0,id),'production 3D');await p.screenshot({path:verification.output('cat-tree/'+mode+'-app.png')});
  await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);await p.evaluate(id=>selectIds([id]),id);await p.setViewportSize({width:390,height:844});await p.locator('#tgPanel').click();check(await p.locator('#fH').isVisible(),'narrow height field');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow overflow');await p.screenshot({path:verification.output('cat-tree/'+mode+'-mobile.png')});
  check(!errors.length,errors.join(';'));results.push({mode,passed:true,errors});await context.close();
 }
 return results;
}
