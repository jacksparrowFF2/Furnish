async (page,verification)=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[],out='output/playwright/kitchen-thin-end/';
 p.on('pageerror',e=>errors.push(e.message));const check=(v,m)=>{if(!v)throw Error(m);};
 try{
  await p.goto(verification.baseURL.slice(0,-1));await p.locator('#lib').waitFor();
  await p.evaluate(()=>{const f=FurnishKitchen.configure({id:'thin-test',name:'厨房示例',type:'counter',cx:3000,cy:3000,rot:0,color:'#f3f1ec'},{version:1,shape:'L',depth:600,counterDepth:630,baseHeight:820,thickness:20,modules:[{run:0,width:900,role:'door'},{run:0,width:600,role:'door'},{run:1,width:900,role:'door'}]});mutate(()=>state.furniture=[f]);FurnishCabinetEditor.open(f.id);});
  await p.locator('#cab-preview canvas').waitFor();
  const positions=await p.evaluate(()=>{const f=getF('thin-test');return FurnishKitchen.layout(f).map(m=>FurnishKitchen.world(f,m.x,m.y));});
  await p.locator('[data-k-extension-length="0"]').fill('500');await p.locator('[data-k-extension-length="0"]').press('Tab');
  await p.locator('[data-k-extension-depth="0"]').fill('250');await p.locator('[data-k-extension-depth="0"]').press('Tab');
  check(await p.locator('[data-k-extension-cabinet-depth="0"]').inputValue()==='250','counter depth clamps unchanged cabinet depth');
  await p.locator('[data-k-extension-cabinet-depth="0"]').fill('220');
  await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
  check(await p.evaluate(()=>{const e=getF('thin-test').kitchen.endExtensions[0];return e.length===500&&e.depth===250&&e.cabinetDepth===220&&!e.backPanel;}),'save reads unblurred cabinet depth');
  check(await p.evaluate(prior=>{const f=getF('thin-test');return FurnishKitchen.layout(f).every((m,i)=>FurnishKitchen.world(f,m.x,m.y).every((v,j)=>Math.abs(v-prior[i][j])<1e-6));},positions),'original bodies stay fixed');
  await p.evaluate(()=>undo());check(await p.evaluate(()=>!getF('thin-test').kitchen.endExtensions),'undo');await p.evaluate(()=>redo());
  await p.reload();await p.locator('#lib').waitFor();check(await p.evaluate(()=>getF('thin-test').kitchen.endExtensions[0].cabinetDepth===220),'refresh');
  await p.evaluate(()=>{selectIds(['thin-test']);zoomSel();});await p.screenshot({animations:'disabled',path:out+'plan.png'});
  await p.evaluate(()=>FurnishCabinetEditor.open('thin-test'));await p.locator('#cab-preview canvas').waitFor();
  await p.locator('[data-k-extension-back="0"]').check();await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();check(await p.evaluate(()=>getF('thin-test').kitchen.endExtensions[0].backPanel),'optional back saves');await p.evaluate(()=>undo());
  await p.evaluate(()=>FurnishCabinetEditor.open('thin-test'));await p.locator('#cab-preview canvas').waitFor();await p.getByRole('button',{name:'全部打开',exact:true}).click();
  await p.screenshot({animations:'disabled',path:out+'hollow-open.png'});
  await p.getByRole('button',{name:'两边正视展开',exact:true}).click();check(await p.locator('.cab-elevation').count()===2,'unfolding works');check(await p.locator('.cab-blind-label').filter({hasText:'薄柜'}).count()===1,'end is labelled independently');
  await p.screenshot({animations:'disabled',path:out+'elevations.png'});await p.getByRole('button',{name:'透视预览',exact:true}).click();
  await p.setViewportSize({width:390,height:844});check(await p.locator('.cab-editor').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'mobile dialog fits');await p.locator('[data-k-extension-back="0"]').scrollIntoViewIfNeeded();await p.screenshot({animations:'disabled',path:out+'mobile.png'});
  await p.getByRole('button',{name:'取消',exact:true}).click();await p.setViewportSize({width:1500,height:1000});
  const saved=await p.evaluate(()=>JSON.stringify(state.furniture));await p.locator('#projectWorkspace').click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();const event=p.waitForEvent('download');await p.locator('#pr-export').click();const download=await event;await download.saveAs(out+'thin-end.furnish.json');await p.locator('#pr-file').setInputFiles(out+'thin-end.furnish.json');await p.locator('#pr-restore-confirm').click();check(await p.evaluate(()=>JSON.stringify(state.furniture))===saved,'actual download/upload');
  check(!errors.length,errors.join('\n'));return {status:'PASS',checks:'thin cabinet, depth clamp, back toggle, hollow preview, elevations, unblurred save, undo/redo, refresh, 390 px and real download/upload',errors};
 }finally{await context.close();}
}
