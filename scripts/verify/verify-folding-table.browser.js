async (page,verification)=>{
 const root=verification.root,results=[];
 const check=(v,message)=>{if(!v)throw Error(message);};
 for(const mode of ['file','http']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(verification.baseURL.slice(0,-1)))external.push(r.url());});
  const base=mode==='file'?verification.fileBase:verification.baseURL;
  try{
   await p.goto(base+'output/folding-table/preview.html');await p.waitForFunction(()=>window.previewReady);
   for(const size of ['1100','1200','1300']){
    await p.locator('#variant').selectOption(size);
    for(const [name,pose] of [['圆桌','round'],['单边收起','single'],['胶囊桌','capsule']]){
     await p.getByRole('button',{name,exact:true}).click();check(await p.evaluate(pose=>window.foldingTablePreview.model.userData.foldingTable&&window.foldingTablePreview.f.foldingTablePose===pose,pose),'production pose');
     await p.getByRole('button',{name:'斜视',exact:true}).click();await p.screenshot({path:root+'output/folding-table/'+mode+'-'+size+'-'+pose+'.png'});
    }
   }
   await p.getByRole('button',{name:'正面',exact:true}).click();await p.screenshot({path:root+'output/folding-table/'+mode+'-front.png'});await p.getByRole('button',{name:'俯视',exact:true}).click();await p.screenshot({path:root+'output/folding-table/'+mode+'-top.png'});
   await p.goto(base+'index.html');await p.locator('#lib').waitFor();
   for(const size of ['1100','1200','1300']){
    await p.locator('#lib').getByText('源氏木语折叠餐桌 · '+size+'款',{exact:true}).first().click();const id=await p.evaluate(()=>selIds()[0]);
    check(await p.evaluate(id=>{const f=getF(id);return f.foldingTablePose==='round'&&f.h===760&&!furnitureError(f);},id),'catalog creation');
    for(const pose of ['single','capsule','round']){await p.locator('#folding-table-pose').selectOption(pose);check(await p.locator('[data-folding-table="'+pose+'"]').count()>0,'2D pose');}
   }
   const id=await p.evaluate(()=>selIds()[0]);await p.locator('#folding-table-pose').selectOption('capsule');check(await p.evaluate(id=>getF(id).d===848,id),'1300 closed size');
   await p.evaluate(()=>undo());check(await p.evaluate(id=>getF(id).foldingTablePose==='round',id),'undo');await p.evaluate(()=>redo());check(await p.evaluate(id=>getF(id).foldingTablePose==='capsule',id),'redo');
   await p.locator('[data-act="lock"]').first().click();check(await p.locator('#folding-table-pose').isDisabled(),'locked pose');await p.locator('[data-act="lock"]').first().click();
   for(const [selector,value,key] of [['#fW','1400','w'],['#fD','900','d'],['#fH','780','h']]){await p.locator(selector).fill(value);await p.locator(selector).press('Tab');check(await p.evaluate(({id,key,value})=>getF(id)[key]===Number(value),{id,key,value}),key+' edit');}
   await p.getByRole('button',{name:'复制',exact:true}).click();check(await p.evaluate(()=>state.furniture.filter(f=>f.type==='table_folding_1300'&&f.foldingTablePose==='capsule'&&f.w===1400).length===2),'copy');await p.evaluate(()=>undo());
   const before=await p.evaluate(id=>JSON.stringify(getF(id)),id);await p.waitForFunction(()=>!savePending);await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'refresh');await p.evaluate(id=>selectIds([id]),id);
   await p.evaluate(()=>{store.designs.push({id:'folding-check',name:'折叠桌验收',planId:PLAN.id,ts:Date.now(),work:JSON.parse(JSON.stringify(state))});});
   await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();const download=p.waitForEvent('download');await p.locator('#pr-export').click();const file=root+'output/playwright/folding-table/'+mode+'.furnish.json';await(await download).saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();
   check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'project roundtrip');check(await p.evaluate(()=>store.designs.some(d=>d.id==='folding-check'&&d.work.furniture.some(f=>f.type==='table_folding_1300'&&f.foldingTablePose==='capsule'))),'named design');
   await p.evaluate(id=>{selectIds([id]);zoomSel();},id);await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(600);await p.screenshot({path:root+'output/playwright/folding-table/'+mode+'-app-3d.png'});check(await p.evaluate(id=>!furnitureError(getF(id)),id),'app 3D');
   await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);await p.evaluate(id=>selectIds([id]),id);await p.setViewportSize({width:390,height:844});await p.locator('#tgPanel').click();check(await p.locator('#folding-table-pose').isVisible(),'narrow shape input');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow overflow');await p.screenshot({path:root+'output/playwright/folding-table/'+mode+'-mobile.png'});
   check(!errors.length,errors.join(';'));check(!external.length,'external requests');results.push({mode,passed:true,errors,externalRequests:external.length});
  }finally{await context.close();}
 }
 return results;
}
