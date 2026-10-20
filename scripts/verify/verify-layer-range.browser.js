async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(ok,msg)=>{if(!ok)throw Error(mode+': '+msg);};
  await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>!repositoryBooting);await p.locator('#tgLayers').click();
  const boxes=p.locator('[data-layer-object]'),count=()=>p.locator('[data-layer-object]:checked').count();
  check(await boxes.count()>10,'inventory available');const original=await p.evaluate(()=>JSON.stringify(state));
  await boxes.nth(2).click();await boxes.nth(6).click({modifiers:['Shift']});check(await count()===5,'forward inclusive range');
  await boxes.nth(2).click();await boxes.nth(6).click({modifiers:['Shift']});check(await count()===0,'range uncheck');
  await boxes.nth(6).click();await boxes.nth(2).locator('..').locator('span').click({modifiers:['Shift']});check(await count()===5,'reverse range via label text');
  await boxes.nth(0).click();check(await count()===6,'plain checkbox preserves unrelated checks');
  await p.evaluate(()=>renderAll());await boxes.nth(1).click({modifiers:['Shift']});check(await count()===7,'anchor survives normal redraw');
  check(await p.evaluate(()=>JSON.stringify(state))===original,'checking is temporary UI state');
  await p.locator('[data-layer-select="0"]').click();check(await count()===0,'layer switch clears checks');
  await boxes.nth(2).click();await p.locator('#layer-type').selectOption('floor');await boxes.nth(3).click({modifiers:['Shift']});check(await count()===1&&(await p.locator('#layer-assign-checked').innerText()).includes('2'),'type change resets anchor and preserves explicit prior checks');
  await p.locator('[data-layer-select="0"]').click();await boxes.nth(2).click();await p.locator('#layer-query').fill('地砖');await boxes.nth(3).click({modifiers:['Shift']});check(await count()===1&&(await p.locator('#layer-assign-checked').innerText()).includes('2'),'search change resets anchor');
  await p.locator('[data-layer-select="0"]').click();await p.locator('#layer-type').selectOption('floor');
  await boxes.nth(1).click();await boxes.nth(4).click({modifiers:['Shift']});check(await count()===4,'range uses filtered visible order');
  const keys=await p.locator('[data-layer-object]:checked').evaluateAll(nodes=>nodes.map(n=>n.dataset.layerObject));
  await p.locator('#layer-name').fill('连续选择验收');await p.locator('#layer-create').click();await p.locator('#layer-assign-checked').click();
  check(await p.evaluate(keys=>keys.every(k=>FurnishLayers.layer(state,k).name==='连续选择验收'),keys),'range selection assigns actual checked objects');
  check(await p.evaluate(()=>Object.keys(state.objectLayers.assignments).length)===4,'no objects outside range assigned');
  await p.locator('#layer-undo').click();check(await p.evaluate(keys=>keys.every(k=>FurnishLayers.layerId(state,k)==='0'),keys),'assignment undo');
  await p.locator('#layer-type').selectOption('all');await p.locator('[data-layer-select="0"]').click();await boxes.nth(2).click();await boxes.nth(6).click({modifiers:['Shift']});
  await p.screenshot({path:V.output('playwright/layer-range/'+mode+'-desktop.png')});
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>closeDrawers());await boxes.nth(8).click({modifiers:['Shift']});check(await count()===7,'narrow range remains usable');
  await p.screenshot({path:V.output('playwright/layer-range/'+mode+'-mobile.png')});
  check(!errors.length,errors.join(';'));results.push({mode,passed:true,errors});await ctx.close();
 }
 return results;
}
