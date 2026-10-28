async(page,V)=>{
 const results=[],check=(v,m)=>{if(!v)throw Error(m);};
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1480,height:1100},offline:mode==='file'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const q=k=>p.locator(`[data-design="${k}"]`),act=k=>p.locator(`[data-design-action="${k}"]`);
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');
   await p.getByRole('button',{name:'工作台',exact:true}).click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();await p.locator('#pr-file').setInputFiles(V.root+'/tests/fixtures/ceilings.furnish.json');await p.locator('#pr-restore-confirm').click();await p.locator('#dlg').waitFor({state:'hidden'});
   await p.evaluate(()=>{const C=FurnishCeiling;mutate(()=>{delete state.ceilings;for(const [i,style]of ['none','flat','aluminum','ring'].entries()){const x=600+i*700,r=C.stableRegionParts({id:'current_'+style,name:'当前 '+style,polygon:[[x,600],[x+650,600],[x+650,2500],[x,2500]],style,height:2400,thickness:12,center:false,sections:[C.componentPreset('gypsum','plain')],channelEnabled:false});state.ceilings=C.setRegion(state,r).ceilings;}});});
   const original=await p.evaluate(()=>JSON.stringify(state.ceilings));
   await p.locator('#ceiling-open').click();check(await p.locator('.ceiling-legacy').count()===0,'legacy editor removed');
   for(const style of ['none','flat','aluminum','ring']){
    await q('region').selectOption('current_'+style);check(await p.locator(`[name="ceiling-design-style"][value="${style}"]`).isChecked(),'current style '+style);
    await p.locator('[data-design-stage="style"]').click();
    check(await p.locator('[data-design-stage="section"]').isVisible()===(style==='ring'),'appropriate component steps '+style);
    if(style!=='none'){await p.locator('[data-design-stage="area"]').click();await q('height').fill('2390');await p.waitForFunction(()=>!document.querySelector('[data-design-action="save"]').disabled);await p.locator('[data-design-stage="style"]').click();}
   }
   await p.locator('[data-design-stage="section"]').click();await p.locator('[data-assembly-part="gypsum"]').click();await p.locator('[data-design-part="0"]').click();await p.locator('[data-section-node]').first().waitFor();
   check(await p.locator('[data-ceiling="existing"],[data-ceiling="flat"],[data-ceiling="room"],[data-ceiling-action="attach"]').count()===0,'section editor has no standalone model controls');
   await p.locator('[data-ceiling-action="preview-3d"]').click();await p.locator('[data-ceiling-3d] canvas').waitFor();check(!await p.locator('[data-ceiling-error]').innerText(),'production section preview');
   await p.locator('[data-ceiling-action="apply"]').click();await act('save').click();await p.locator('#dlg').waitFor({state:'hidden'});
   const saved=await p.evaluate(()=>JSON.stringify(state.ceilings));await p.locator('#undo').click();check(await p.evaluate(()=>JSON.stringify(state.ceilings))===original,'one undo all styles');await p.locator('#redo').click();check(await p.evaluate(()=>JSON.stringify(state.ceilings))===saved,'redo all styles');await V.waitForCache(p);await p.reload();check(await p.evaluate(()=>JSON.stringify(state.ceilings))===saved,'reload does not migrate');
   await p.locator('#ceiling-open').click();await q('region').selectOption('current_aluminum');await p.locator('[data-design-stage="style"]').click();await p.setViewportSize({width:390,height:844});check(await p.locator('#ceiling-design').evaluate(h=>h.scrollWidth<=h.clientWidth+1),'390px current editor');await p.screenshot({animations:'disabled',path:V.output('playwright/ceiling-current/'+mode+'-mobile.png')});await act('cancel').click();check(await p.evaluate(()=>JSON.stringify(state.ceilings))===saved,'cancel read only');check(!errors.length,errors.join('\n'));
   results.push({mode,passed:true,allFourStyles:true,noLegacyControls:true,productionSectionPreview:true,saveUndoRedoRefresh:true,mobile390:true});
  }finally{await ctx.close();}
 }
 return results;
}
