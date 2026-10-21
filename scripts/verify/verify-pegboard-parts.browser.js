async (page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1500,height:1000},offline:mode==='file'}),p=await ctx.newPage(),checks=[],errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
  const read=()=>p.evaluate(()=>structuredClone(getF('peg'))),open=async()=>{await p.evaluate(()=>FurnishCabinetEditor.open('peg'));await p.locator('#cab-preview canvas').waitFor();},save=()=>p.getByRole('button',{name:'保存柜体设计',exact:true}).click(),cancel=()=>p.getByRole('button',{name:'取消',exact:true}).click();
  try{
   await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.locator('#lib').waitFor();
   await p.evaluate(()=>{const f=FurnishCabinet.upgradeDesign({id:'peg',type:'cabinet',cx:3000,cy:3000,rot:37,flip:true,...FurnishCabinet.preset('entry-pegboard')});mutate(()=>state.furniture=[f]);selectIds(['peg']);});
   const initial=await read();await open();await save();check(JSON.stringify(await read())===JSON.stringify(initial),'unchanged save preserves canonical configuration');
   await open();await p.locator('[data-pegboard-part="upper"]').uncheck();check(await p.locator('#cab-error').textContent()==='','upper toggle validates');await cancel();check(JSON.stringify(await read())===JSON.stringify(initial),'cancel keeps original assembly');
   await open();for(const key of ['upper','left','right','lower','displayShelves','hooks','light']){await p.locator(`[data-pegboard-part="${key}"]`).uncheck();check(await p.locator('#cab-error').textContent()==='',key+' removal validates');}
   const sizeInput=key=>p.locator('[data-cab-number="'+key+'"]');
   check(Number(await sizeInput('w').inputValue())===638&&Number(await sizeInput('d').inputValue())===18&&Number(await sizeInput('h').inputValue())===1418,'overall fields immediately use remaining panel dimensions');
   const text=await p.locator('#cab-preview').textContent();check(text.includes('宽 638 × 深 18 × 高 1418')&&!text.includes('总深 350')&&!text.includes('总高 2400'),'preview summary and rulers use remaining geometry');
   await p.screenshot({path:V.output('playwright/pegboard-parts/'+mode+'-pure-panel.png'),animations:'disabled'});await save();
   const changed=await read();check(Object.values(changed.cabinet.pegboardParts).every(v=>v===false),'all removals saved');
   check(await p.evaluate(()=>{const boards=FurnishCabinetMotion.boards(getF('peg'),{includeStatic:true});return boards.length===1&&boards[0].metadata.cabinetPegboard&&Math.abs(Math.max(...boards[0].poly.map(v=>v[1]))-Math.min(...boards[0].poly.map(v=>v[1]))-18)<.001;}),'production contains exactly one 18mm perforated panel');
   await p.evaluate(()=>undo());check(JSON.stringify(await read())===JSON.stringify(initial),'one undo restores assembly');await p.evaluate(()=>redo());await V.waitForCache(p);await p.reload();check(JSON.stringify(await read())===JSON.stringify(changed),'redo and refresh preserve pure panel');
   await p.setViewportSize({width:390,height:844});await open();for(const key of ['upper','left','right','lower','displayShelves','hooks','light']){const el=p.locator(`[data-pegboard-part="${key}"]`);await el.scrollIntoViewIfNeeded();check(await el.isVisible(),'narrow control '+key);}
   await p.screenshot({path:V.output('playwright/pegboard-parts/'+mode+'-mobile.png'),animations:'disabled'});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no narrow page overflow');await cancel();
   await p.setViewportSize({width:1500,height:1000});await open();
   await p.locator('[data-cab-number="w"]').fill('813');await p.locator('[data-cab-number="w"]').press('Tab');check(await p.locator('#cab-error').textContent()==='','remaining panel width edit validates');
   await p.locator('[data-cab-number="h"]').fill('1500');await p.locator('[data-cab-number="h"]').press('Tab');check(await p.locator('#cab-error').textContent()==='','remaining panel height edit validates');
   await save();check(await p.evaluate(()=>{const d=FurnishProducts.dimensions(getF('peg'));return Math.abs(d.w-813)<.01&&Math.abs(d.h-1500)<.01&&d.d===18;}),'editing actual width/height changes production panel');
   await V.waitForCache(p);await p.reload();await p.evaluate(()=>selectIds(['peg']));check(await p.evaluate(()=>{const d=FurnishProducts.dimensions(getF('peg'));return Math.abs(d.w-813)<.01&&Math.abs(d.h-1500)<.01&&d.d===18;}),'actual resized envelope survives refresh');
   check((await p.locator('[data-furniture-dimensions]').first().textContent()).includes('813 × 18 × 1500'),'main properties show actual envelope');
   check(await p.evaluate(()=>{const f=getF('peg'),ring=FurnishGeometry.footprints(f)[0];return Math.abs(FurnishGeometry.area(ring)-813*18/1e6)<1e-8;}),'plan footprint uses actual panel area');
   check((await p.locator('#gSel').textContent()).includes('813 × 18'),'plan dimension label shows actual size');
   await open();await p.locator('[data-pegboard-part="displayShelves"]').check();check(Number(await p.locator('[data-cab-number="d"]').inputValue())>18,'retained accessories immediately expand actual depth');await cancel();
   await open();for(const key of ['upper','left','right','lower','displayShelves','hooks','light'])await p.locator(`[data-pegboard-part="${key}"]`).check();await save();check(await p.evaluate(()=>FurnishCabinet.openingZones(getF('peg')).some(v=>v.kind==='cabinetdoor')&&FurnishCabinet.openingZones(getF('peg')).some(v=>v.kind==='cabinetdrawer')),'re-enabling restores doors and drawers');
   check(errors.length===0,'no page errors');results.push({mode,passed:true,checks});
  }finally{await ctx.close();}
 }
 return {passed:true,results};
}
