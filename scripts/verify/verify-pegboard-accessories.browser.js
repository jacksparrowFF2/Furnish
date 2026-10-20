async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
  const check=(v,m)=>{if(!v)throw Error(m);checks.push(m);},read=()=>p.evaluate(()=>structuredClone(getF('peg-accessories'))),open=async()=>{await p.evaluate(()=>FurnishCabinetEditor.open('peg-accessories'));await p.locator('#cab-preview canvas').waitFor();},save=()=>p.getByRole('button',{name:'保存柜体设计',exact:true}).click(),cancel=()=>p.getByRole('button',{name:'取消',exact:true}).click();
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();await p.evaluate(()=>{const f=FurnishCabinet.upgradeDesign({id:'peg-accessories',type:'cabinet',cx:3000,cy:3000,rot:37,flip:true,...FurnishCabinet.preset('entry-pegboard')});f.cabinet.pegboardParts={upper:false,left:false,right:false,lower:false,accessories:false};f.cabinet.pegboardBottom=600;mutate(()=>state.furniture=[f]);selectIds([f.id]);const build=FurnishCabinetModel.build;FurnishCabinetModel.build=function(...args){const model=build.apply(this,args);if(args[1].id===f.id){window.__accessoryDraft=structuredClone(args[1]);window.__accessoryModel=model;}return model;};});
   const initial=await read();await open();check(await p.locator('[data-pegboard-part="accessories"]').count()===0,'no aggregate accessory switch');for(const key of ['displayShelves','hooks','light'])check(!await p.locator(`[data-pegboard-part="${key}"]`).isChecked(),'legacy false initializes '+key+' unchecked');await save();check(JSON.stringify(await read())===JSON.stringify(initial),'unchanged save preserves legacy aggregate');
   await open();
   for(let mask=0;mask<8;mask++){
    for(const [i,key] of ['displayShelves','hooks','light'].entries())await p.locator(`[data-pegboard-part="${key}"]`).setChecked(!!(mask&(1<<i)));
    await p.locator('#cab-pegboard-bottom').fill(String(600+mask));await p.locator('#cab-pegboard-bottom').press('Tab');check((await p.locator('#cab-error').textContent())==='','combination '+mask+' validates');
    const state=await p.evaluate(()=>{const counts={displayShelf:0,hook:0,light:0};window.__accessoryModel.traverse(o=>{if(o.isMesh&&o.userData.cabinetAccessory in counts)counts[o.userData.cabinetAccessory]++;});return {counts,bounds:FurnishCabinet.assemblyBounds(window.__accessoryDraft)};});
    check(state.counts.displayShelf===(mask&1?2:0)&&state.counts.hook===(mask&2?6:0)&&state.counts.light===(mask&4?1:0),'actual preview meshes reflect independent combination '+mask);check(Math.abs(state.bounds.bottom-600-mask)<.001,'height applies to retained combination '+mask);
    if(mask===2||mask===5){await p.locator('[data-pegboard-part="light"]').scrollIntoViewIfNeeded();await p.screenshot({path:V.output('playwright/pegboard-accessories/'+mode+'-combination-'+mask+'.png'),animations:'disabled'});}
   }
   await save();const saved=await read();check(saved.cabinet.pegboardParts.displayShelves&&saved.cabinet.pegboardParts.hooks&&saved.cabinet.pegboardParts.light&&!Object.hasOwn(saved.cabinet.pegboardParts,'accessories'),'changed save writes independent flags and removes legacy aggregate');
   await p.evaluate(()=>undo());check(JSON.stringify(await read())===JSON.stringify(initial),'undo restores original aggregate and height');await p.evaluate(()=>redo());await V.waitForCache(p);await p.reload();check(JSON.stringify(await read())===JSON.stringify(saved),'redo and refresh preserve independent flags');
   await open();await p.locator('[data-pegboard-part="hooks"]').uncheck();await cancel();check(JSON.stringify(await read())===JSON.stringify(saved),'cancel keeps saved independent flags');
   await p.setViewportSize({width:390,height:844});await open();for(const key of ['displayShelves','hooks','light']){const el=p.locator(`[data-pegboard-part="${key}"]`);await el.scrollIntoViewIfNeeded();check(await el.isVisible(),'independent '+key+' accessible at 390px');}await p.screenshot({path:V.output('playwright/pegboard-accessories/'+mode+'-mobile.png'),animations:'disabled'});await cancel();
   check(errors.length===0,'no page errors');results.push({mode,passed:true,checks});
  }finally{await ctx.close();}
 }
 return {passed:true,results};
}
