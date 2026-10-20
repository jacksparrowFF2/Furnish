async (page,V)=>{
 const choose=(kind,column)=>V.selectCabinetObject(p,{kind,column});
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[],checks=[];
 p.on('pageerror',e=>errors.push(e.message));
 const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);},near=(a,b)=>Math.abs(a-b)<.011;
 const snapshot=()=>p.evaluate(()=>JSON.parse(JSON.stringify(getF('edit-cab'))));
 const open=async()=>{await p.evaluate(()=>{ui.sel={kind:'furn',id:'edit-cab'};renderAll();});await p.locator('#fab [data-fab-edit="size"]').click();await p.locator('#cab-preview canvas').waitFor();};
 const tab=name=>choose({'整体尺寸':'body','分区结构':'bay','门板与铰链':'door'}[name]);
 const save=()=>p.getByRole('button',{name:'保存柜体设计',exact:true}).click(),cancel=()=>p.getByRole('button',{name:'取消',exact:true}).click();
 const active=()=>p.locator('[data-cab-column]:visible'),widths=()=>p.evaluate(()=>FurnishCabinet.widths(getF('edit-cab')));
 const clean=async()=>check(await p.locator('#cab-error').textContent()==='','editor has no error');
 try{
  await p.goto(V.baseURL+'index.html');await p.locator('#lib').waitFor();
  await p.evaluate(()=>{mutate(()=>state.furniture.push({id:'edit-cab',type:'cabinet',cx:3000,cy:3000,rot:0,...FurnishCabinet.preset('sideboard-open')}));});
  const initial=await snapshot(),initialWidths=await widths();
  await open();check(await p.locator('#cab-auto-doors,#cab-auto-columns').count()===0,'legacy automatic toggles removed');
  await p.locator('[data-cab-number="w"]').fill('1900');await tab('分区结构');await clean();
  check(await p.locator('#cab-object-target option').evaluateAll(options=>options.filter(o=>JSON.parse(o.value).kind==='bay').length)===3,'total resize preserves three existing bays');
  const first=Number(await active().locator('[data-bay-width]').inputValue());
  await active().locator('[data-bay-width]').fill(String(first+30));await tab('门板与铰链');await clean();await save();
  const resized=await snapshot(),rw=await widths();check(resized.w===1900,'numeric bay resize keeps total width');
  check(near(rw[0],first+30)&&near(rw[1],initialWidths[1]*(1900-72)/(1600-72)-30),'numeric width redistributes into right neighbor');
  check(JSON.stringify(resized.cabinet.columns.map(c=>c.shelves))===JSON.stringify(initial.cabinet.columns.map(c=>c.shelves)),'resizing preserves shelf positions');
  await p.getByRole('button',{name:'撤销',exact:true}).first().click();check(JSON.stringify(await snapshot())===JSON.stringify(initial),'one undo restores whole edit');
  await p.getByRole('button',{name:'重做',exact:true}).first().click();check(JSON.stringify(await snapshot())===JSON.stringify(resized),'redo restores edit');
  await open();await tab('分区结构');await active().locator('[data-select-divider]').click();await p.locator('#cab-preview canvas').press('ArrowRight');await save();
  const moved=await widths();check(near(moved[0],rw[0]+10)&&near(moved[1],rw[1]-10)&&(await snapshot()).w===1900,'production preview divider uses same fixed-total redistribution');check(Math.abs(moved[2]-rw[2])<1e-9,'preview refresh preserves untouched fractional bay widths');
  await p.getByRole('button',{name:'撤销',exact:true}).first().click();check(JSON.stringify(await snapshot())===JSON.stringify(resized),'divider edit undo');
  await open();await tab('分区结构');await active().locator('[data-bay-width]').fill('99');await tab('整体尺寸');
  check((await p.locator('#cab-error').textContent()).includes('100'),'invalid width gives actionable lower bound');
  await active().locator('[data-bay-width]').fill(String(rw[0]));await tab('整体尺寸');await clean();await cancel();
  check(JSON.stringify(await snapshot())===JSON.stringify(resized),'invalid/corrected/cancel keeps saved state');
  await open();await tab('分区结构');await active().locator('[data-bay-grow]').check();await active().locator('[data-bay-width]').fill(String(rw[0]+50));await save();await cleanDialog();
  const grown=await snapshot(),gw=await widths();check(near(grown.w,resized.w+50)&&near(gw[1],rw[1]),'explicit grow-total preserves other widths');
  await open();await p.locator('#cab-repartition-count').fill('4');await tab('门板与铰链');await tab('整体尺寸');
  check(await p.locator('#cab-object-target option').evaluateAll(options=>options.filter(o=>JSON.parse(o.value).kind==='bay').length)===3,'typing a target count does not repartition');
  await p.locator('#cab-repartition-count').fill('4');await p.locator('#cab-repartition').click();await clean();
  check(await p.locator('#cab-object-target option').evaluateAll(options=>options.filter(o=>JSON.parse(o.value).kind==='bay').length)===4,'explicit repartition updates draft');
  await tab('分区结构');await p.locator('.cab-fields').evaluate(el=>el.scrollTop=0);await p.screenshot({path:V.output('playwright/cabinet-edit-operations/desktop-interior.png'),animations:'disabled'});
  await cancel();check(JSON.stringify(await snapshot())===JSON.stringify(grown),'cancel discards repartition');
  await open();await p.locator('#cab-repartition-count').fill('4');await p.locator('#cab-repartition').click();await save();
  const divided=await snapshot();check(divided.cabinet.columns.length===4&&divided.w===grown.w,'repartition saves without resizing total');
  await open();await tab('门板与铰链');await active().locator('[data-fit-doors]').click();await clean();
  await p.screenshot({path:V.output('playwright/cabinet-edit-operations/desktop-doors.png'),animations:'disabled'});await save();
  const fitted=await snapshot();check(fitted.cabinet.columns[0].door!=='none','fit adds doors to existing open bay');
  check(JSON.stringify(fitted.cabinet.columns.map(({door,doorLayout,doorRatios,...c})=>c))===JSON.stringify(divided.cabinet.columns.map(({door,doorLayout,doorRatios,...c})=>c)),'fit does not alter interiors or widths');
  await V.waitForCache(p);await p.reload();await p.locator('#lib').waitFor();check(JSON.stringify(await snapshot())===JSON.stringify(fitted),'refresh restores saved design');
  await open();await save();check(JSON.stringify(await snapshot())===JSON.stringify(fitted),'open and save without edits preserves data');
  await p.setViewportSize({width:390,height:844});await open();
  check(await p.locator('.cab-editor').evaluate(el=>el.scrollWidth<=el.clientWidth),'390px designer fits viewport');
  await p.screenshot({path:V.output('playwright/cabinet-edit-operations/mobile-size.png'),animations:'disabled'});
  await tab('分区结构');await active().locator('[data-bay-width]').scrollIntoViewIfNeeded();check(await active().locator('[data-bay-width]').isVisible(),'390px bay width accessible');await p.screenshot({path:V.output('playwright/cabinet-edit-operations/mobile-interior.png'),animations:'disabled'});
  await tab('门板与铰链');check(await active().locator('[data-fit-doors]').isVisible(),'390px fit doors accessible');await cancel();
  await p.setViewportSize({width:1500,height:1000});
  for(const template of await p.evaluate(()=>FurnishCabinet.templates.map(t=>t[0]))){
   await p.evaluate(template=>{const f={id:'edit-cab',type:FurnishCabinet.templateType(template),cx:3000,cy:3000,rot:0,...FurnishCabinet.preset(template)};mutate(()=>state.furniture=[f]);FurnishCabinetEditor.open(f.id,{original:f,onSave:next=>mutate(()=>state.furniture=[next])});},template);
   await p.locator('#cab-preview canvas').waitFor();const old=await snapshot();await tab('分区结构');await tab('门板与铰链');await tab('整体尺寸');await save();
   check(JSON.stringify(await snapshot())===JSON.stringify(await p.evaluate(f=>FurnishCabinet.upgradeDesign(f),old)),'template '+template+' opens/navigates/saves without data drift');
  }
  check(errors.length===0,'no page errors');return {passed:true,checks,errors};
 }catch(e){await p.screenshot({path:V.output('playwright/cabinet-edit-operations/failure.png')});throw e;}finally{await context.close();}
 async function cleanDialog(){check(await p.locator('#cab-preview').count()===0,'save closes dialog');}
}
