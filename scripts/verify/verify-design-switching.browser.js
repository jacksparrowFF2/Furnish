async (page,verification)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto((mode==='file'?verification.fileBase:verification.baseURL)+'index.html');
   await p.locator('#lib .item').first().waitFor();await p.waitForFunction(()=>!repositoryBooting);
   const history=await p.evaluate(()=>JSON.stringify(store.designs.filter(d=>!d.editable)));
   if(await p.locator('[data-switch-design]').count())throw Error('Legacy history became design tabs');
   const create=async name=>{await p.locator('#bar-create-design').click();await p.locator('#design-name').fill(name);await p.locator('#dlgActions').getByRole('button',{name:'保存',exact:true}).click();await p.locator('#dlg').waitFor({state:'hidden'});};
   await p.evaluate(()=>FurnishWorkspace.open('compare'));
   if(await p.locator('#cmp-a option').count()!==1)throw Error('History counted as designs');
   await p.locator('#dlgClose').click();
   await create('验收 A');
   await p.evaluate(()=>mutate(()=>state.designNote='A edited'));
   const a=await p.evaluate(()=>FurnishDesign.activeDesign(store,PLAN.id).id);
   await p.evaluate(()=>FurnishWorkspace.open('compare'));await p.locator('#cmp-name').fill('验收 B');await p.locator('#cmp-save').click();await p.locator('#dlgClose').click();
   await p.evaluate(()=>mutate(()=>state.designNote='B edited'));
   const b=await p.evaluate(()=>FurnishDesign.activeDesign(store,PLAN.id).id);
   await p.evaluate(id=>FurnishDesignUI.editDesign('rename',id),b);await p.locator('#design-note').fill('B note changed');await p.locator('#dlgActions').getByRole('button',{name:'保存',exact:true}).click();
   if(await p.evaluate(()=>state.designNote)!=='B note changed')throw Error('Active note rename');await p.evaluate(()=>undo());if(await p.evaluate(()=>state.designNote)!=='B edited')throw Error('Note undo');
   await p.locator(`[data-switch-design="${a}"]`).click();
   if(await p.evaluate(()=>state.designNote)!=='A edited')throw Error('A overwritten');
   await p.evaluate(()=>mutate(()=>state.designNote='A second'));await p.evaluate(()=>undo());
   if(await p.evaluate(()=>state.designNote)!=='A edited')throw Error('A undo');await p.evaluate(()=>redo());
   await p.locator(`[data-switch-design="${b}"]`).click();
   if(!await p.evaluate(()=>state.designNote==='B edited'&&undoStack.length===0))throw Error('B or undo isolation');
   await p.reload();await p.waitForFunction(()=>!repositoryBooting);await p.locator('#bar-create-design').waitFor();
   if(await p.evaluate(()=>state.designNote)!=='B edited')throw Error('Refresh active B');
   await p.locator(`[data-switch-design="${a}"]`).click();
   if(await p.evaluate(()=>state.designNote)!=='A second')throw Error('A persistence');
   if(await p.evaluate(()=>JSON.stringify(store.designs.filter(d=>!d.editable)))!==history)throw Error('History mutated');
   await p.locator('#bar-manage-designs').click();await p.locator('#dlg').getByRole('heading',{name:'历史记录',exact:true}).waitFor();await p.locator('#dlgActions').getByRole('button',{name:'关闭',exact:true}).click();
   // History is immutable while restoring it updates only the current design.
   await p.evaluate(()=>FurnishDesignUI.editDesign('create'));
   await p.locator('#design-name').fill('验收历史');await p.locator('#dlgActions').getByRole('button',{name:'保存',exact:true}).click();
   const savedHistory=await p.evaluate(()=>JSON.stringify(store.designs.find(d=>d.name==='验收历史')));
   await p.evaluate(()=>mutate(()=>state.designNote='A after history'));
   await p.locator('#bar-manage-designs').click();
   await p.locator('.design-record').filter({has:p.getByText('验收历史',{exact:true})}).getByRole('button',{name:'恢复到当前方案',exact:true}).click();
   if(await p.evaluate(()=>state.designNote)!=='A second')throw Error('History restore');
   await p.evaluate(()=>undo());if(await p.evaluate(()=>state.designNote)!=='A after history')throw Error('History restore undo');
   if(await p.evaluate(()=>JSON.stringify(store.designs.find(d=>d.name==='验收历史')))!==savedHistory)throw Error('History overwritten');
   const planId=await p.evaluate(()=>PLAN.id);
   await p.evaluate(()=>setPlan(PLANS.find(p=>p.id!==PLAN.id).id));
   if(await p.locator('[data-switch-design]').count())throw Error('Other plan tabs leaked');
   await p.evaluate(id=>setPlan(id),planId);
   if(await p.evaluate(()=>state.designNote)!=='A after history')throw Error('Plan switch lost edits');
   // Import keeps all editable records and detaches the imported canvas from existing designs.
   const beforeImport=await p.evaluate(()=>JSON.stringify(store.designs.filter(d=>d.editable)));
   await p.evaluate(()=>FurnishWorkspace.restore({planId:PLAN.id,current:{...JSON.parse(snap()),designNote:'Imported current'},designs:JSON.parse(JSON.stringify(store.designs.filter(d=>d.planId===PLAN.id))),catalog:JSON.parse(JSON.stringify(store.custom||[]))}));
   if(await p.evaluate(()=>FurnishDesign.activeDesign(store,PLAN.id))!==undefined)throw Error('Import overwrote active identity');
   if(await p.evaluate(()=>JSON.stringify(store.designs.filter(d=>d.editable)))!==beforeImport)throw Error('Import changed designs');
   await p.locator(`[data-switch-design="${a}"]`).click();
   if(await p.evaluate(()=>state.designNote)!=='A after history')throw Error('Post-import design switch');
   await p.screenshot({path:verification.output('playwright/design-switching/'+mode+'-desktop.png')});
   await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.locator('#view3d canvas').waitFor();
   await p.locator(`[data-switch-design="${b}"]`).click();if(await p.evaluate(()=>state.designNote)!=='B edited')throw Error('3D switch');
   await p.setViewportSize({width:390,height:844});await p.screenshot({path:verification.output('playwright/design-switching/'+mode+'-narrow.png')});
   if(!await p.locator('#bar-create-design').isVisible())throw Error('Narrow bar');
   const bounds=await p.locator('#designBar').boundingBox();if(bounds.x<0||bounds.x+bounds.width>391)throw Error('Overflow');
   if(errors.length)throw Error(JSON.stringify(errors));results.push({mode,passed:true,independentAutosave:true,historyPreserved:true,refresh:true,undoRedo:true,threeD:true,narrow:true});
  }finally{await context.close();}
 }
 return results;
}
