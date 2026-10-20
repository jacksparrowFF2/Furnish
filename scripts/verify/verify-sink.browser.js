async (page,verification)=>{
 const root=verification.root,results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(verification.baseURL.slice(0,-1)))external.push(r.url());});
  const base=mode==='file'?verification.fileBase:verification.baseURL,check=(v,msg)=>{if(!v)throw Error(mode+': '+msg);};
  await p.goto(base+'output/sink/preview.html');await p.waitForFunction(()=>window.previewReady);
  check(await p.evaluate(()=>{let rack=false;window.sinkPreview.model.traverse(o=>{if(o.userData.sinkPart?.startsWith('rack-'))rack=true;});return !rack;}),'basket omitted');
  for(const install of ['top','flush','under']){await p.locator('#install').selectOption(install);await p.screenshot({path:root+'output/sink/'+mode+'-'+install+'.png'});}
  await p.getByRole('button',{name:'俯视',exact:true}).click();await p.screenshot({path:root+'output/sink/'+mode+'-overhead.png'});
  await p.getByRole('button',{name:'龙头特写',exact:true}).click();await p.screenshot({path:root+'output/sink/'+mode+'-faucet-detail.png'});
  await p.evaluate(()=>{const v=window.sinkPreview;v.slab.visible=false;let cap;v.model.traverse(o=>{if(o.userData.sinkPart==='faucet-lever-cap')cap=o;});const center=cap.getWorldPosition(v.controls.target.clone());v.controls.target.copy(center);v.controls.target.y+=.02;v.camera.position.copy(v.controls.target);v.camera.position.x+=.42;v.controls.update();v.render();});await p.screenshot({path:root+'output/sink/'+mode+'-lever-side.png'});
  await p.evaluate(()=>{const v=window.sinkPreview;v.camera.position.copy(v.controls.target);v.camera.position.x+=.28;v.camera.position.y+=.07;v.camera.position.z+=.30;v.controls.update();v.render();});await p.screenshot({path:root+'output/sink/'+mode+'-lever-joint.png'});await p.evaluate(()=>{window.sinkPreview.slab.visible=true;window.sinkPreview.render();});
  await p.getByRole('button',{name:'正面',exact:true}).click();await p.getByRole('button',{name:'隐藏台面',exact:true}).click();await p.screenshot({path:root+'output/sink/'+mode+'-front.png'});
  await p.goto(base+'index.html');await p.locator('#lib').waitFor();await p.locator('#lib').getByText('箭牌日式集渣水槽 · 680',{exact:true}).first().click();const id=await p.evaluate(()=>selIds()[0]);
  check(await p.evaluate(id=>{const f=getF(id);return f.w===680&&f.d===450&&f.h===240&&f.sinkInstall==='top'&&f.model==='AE5568459G23-YNC';},id),'catalog creation');
  await p.evaluate(id=>{const f=getF(id),host=FurnishKitchen.configure({id:'sink-test-counter',type:'counter',name:'水槽验收台面',w:1200,d:650,cx:f.cx,cy:f.cy,rot:0,color:'#fff'},{version:1,shape:'straight',depth:650,baseHeight:820,thickness:40,modules:[{role:'sink',width:1200,run:0}]});mutate(()=>state.furniture.push(host));selectIds([id]);},id);
  check(await p.evaluate(id=>getF(id).counterElevation===860.8,id),'automatic elevation');check(await p.locator('#hob-elevation').isDisabled(),'supported elevation readonly');
  for(const install of ['flush','under','top']){await p.locator('#sink-install').selectOption(install);check(await p.evaluate(({id,install})=>getF(id).sinkInstall===install&&getF(id).counterElevation===(install==='top'?860.8:install==='flush'?860:820),{id,install}),'installation '+install);}
  await p.locator('#sink-install').selectOption('under');await p.getByRole('button',{name:'撤销',exact:true}).first().click();check(await p.evaluate(id=>getF(id).sinkInstall==='top',id),'undo');await p.getByRole('button',{name:'重做',exact:true}).first().click();check(await p.evaluate(id=>getF(id).sinkInstall==='under',id),'redo');
  for(const [selector,value,key] of [['#fW','750','w'],['#fD','480','d'],['#sink-height','280','h']]){await verification.editFurnitureField(p,selector,value);check(await p.evaluate(({id,key,value})=>getF(id)[key]===Number(value),{id,key,value}),key+' edit');}
  await p.locator('#sink-height').fill('0');await p.locator('#sink-height').press('Tab');check(await p.evaluate(id=>getF(id).h===280,id),'invalid height rejected');
  await p.locator('[data-act="lock"]').first().click();check(await p.locator('#sink-install').isDisabled(),'lock installation');check(await p.locator('#sink-height').isDisabled(),'lock height');await p.locator('[data-act="lock"]').first().click();
  await p.locator('#fab [data-act="dup"]').click();check(await p.evaluate(()=>state.furniture.filter(f=>f.type==='sink_arrow_680').length===2),'copy');await p.evaluate(()=>undo());await p.evaluate(id=>selectIds([id]),id);
  const before=await p.evaluate(id=>JSON.stringify(getF(id)),id);await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'refresh');await p.evaluate(id=>selectIds([id]),id);
  await p.evaluate(()=>store.designs.push({id:'sink-check',name:'水槽验收',planId:PLAN.id,ts:Date.now(),work:JSON.parse(JSON.stringify(state))}));
  await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();const downloaded=p.waitForEvent('download');await p.locator('#pr-export').click();const file=root+'output/playwright/sink/'+mode+'.furnish.json';await(await downloaded).saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();
  check(await p.evaluate(id=>JSON.stringify(getF(id)),id)===before,'download/reimport');check(await p.evaluate(()=>store.designs.some(d=>d.id==='sink-check'&&d.work.furniture.some(f=>f.type==='sink_arrow_680'&&f.sinkInstall==='under'))),'named design');
  await p.evaluate(id=>{selectIds([id]);zoomSel();},id);await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);await p.waitForTimeout(600);await p.screenshot({path:root+'output/playwright/sink/'+mode+'-app-3d.png'});check(await p.evaluate(id=>!furnitureError(getF(id)),id),'3D render');
  await p.getByRole('button',{name:'2D 平面',exact:true}).click();await p.waitForFunction(()=>!is3D()&&!switching);await p.evaluate(id=>selectIds([id]),id);await p.setViewportSize({width:390,height:844});await p.locator('#tgPanel').click();await p.waitForTimeout(300);check(await p.locator('#sink-install').isVisible(),'narrow installation');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow overflow');await p.screenshot({path:root+'output/playwright/sink/'+mode+'-mobile.png'});
  check(!errors.length,errors.join(';'));check(!external.length,'external requests');results.push({mode,passed:true,errors,externalRequests:external.length});await context.close();
 }
 return results;
}
