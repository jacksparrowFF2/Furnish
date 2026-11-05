async(page,V)=>{
 const verify=async(p,shot)=>{
  const checks=[],check=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
  await p.waitForFunction(()=>typeof state!=='undefined'&&(typeof repositoryBooting==='undefined'||!repositoryBooting));
  await p.evaluate(()=>mutate(()=>{const f={id:'pet-entry',type:'cabinet',cx:4000,cy:4000,rot:90,...FurnishCabinet.preset('entry-console')};state.furniture=[f];}));
  const open=async()=>{await p.evaluate(()=>FurnishCabinetEditor.open('pet-entry'));await p.locator('#cab-preview canvas').waitFor();await V.revealCabinetSettings(p);};
  await open();check(await p.locator('#cab-entry-shoe-shelf').isChecked(),'legacy shelf starts enabled');await p.locator('#cab-entry-shoe-shelf').uncheck();await p.getByRole('button',{name:'保存柜体设计',exact:true}).click();
  const read=()=>p.evaluate(()=>getF('pet-entry').cabinet.entry.shoeShelf);check(await read()===false,'save applies optional shelf removal');
  await p.evaluate(()=>undo());check(await read()===undefined,'undo restores legacy missing field');await p.evaluate(()=>redo());check(await read()===false,'redo restores open bay');
  if(await p.evaluate(()=>!!window.FurnishRepository))await p.evaluate(()=>FurnishRepository.flush());await p.reload();await p.waitForFunction(()=>typeof state!=='undefined'&&state.furniture.some(f=>f.id==='pet-entry')&&(typeof repositoryBooting==='undefined'||!repositoryBooting));check(await read()===false,'reload retains removal');
  await open();await p.locator('#cab-entry-shoe-shelf').check();await p.getByRole('button',{name:'取消',exact:true}).click();check(await read()===false,'cancel does not restore shelf');
  await open();await p.setViewportSize({width:390,height:844});check(await p.locator('.cab-editor').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'390px fits');await shot?.();await p.getByRole('button',{name:'取消',exact:true}).click();return checks;
 };
 if(V.desktop)return {passed:true,checks:await verify(page,V.screenshot)};
 const results=[];for(const mode of ['http','file']){const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage();try{await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();results.push({mode,checks:await verify(p,()=>p.screenshot({path:V.output('playwright/entry-open-bay/'+mode+'.png')})),passed:true});}finally{await ctx.close();}}return {passed:true,results};
}
