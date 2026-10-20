async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(v,msg)=>{if(!v)throw Error(mode+': '+msg);};
  await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>!repositoryBooting);
  await p.getByRole('button',{name:'工作台',exact:true}).click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();await p.locator('#pr-file').setInputFiles(V.root+'tests/fixtures/wall-tile-bands.furnish.json');await p.locator('#pr-restore-confirm').click();await p.locator('#dlg').waitFor({state:'hidden'});
  await p.evaluate(()=>{const r=PLAN.rooms[0],[x,y]=r.at;const next=FurnishCeiling.edit(state,{id:'layer-flat',kind:'flat',name:'图层验收平顶',roomId:r.id,height:2600,thickness:12,polygon:[[x-200,y-200],[x+200,y-200],[x+200,y+200],[x-200,y+200]]});mutate(()=>state.ceilings=next.ceilings);});
  await p.locator('#lib').getByText('米家净水器 2 · 1200G',{exact:true}).first().click();
  const id=await p.evaluate(()=>selIds()[0]),before=await p.evaluate(()=>JSON.stringify(state.furniture));
  const open=async()=>{await p.locator('#showMenu summary').click();await p.locator('#observationLayers').click();};
  await open();check(await p.locator('[data-layer-select="0"]').count()===1,'default layer');
  await p.locator('#layer-name').fill('家电');await p.locator('#layer-create').click();const layer=await p.evaluate(()=>state.objectLayers.layers.find(l=>l.name==='家电').id);
  await p.locator('#layer-assign-selection').click();check(await p.evaluate(id=>FurnishLayers.layer(state,'furniture:'+id).name==='家电',id),'assign selected');
  await p.locator(`[data-layer-visible="${layer}"]`).uncheck();check(await p.locator(`#gFurn [data-fid="${id}"]`).isHidden(),'hide layer');check(await p.evaluate(()=>selIds().length===0),'hidden selection removed');
  check(await p.evaluate(id=>{const a=preparePlanSVG({visibleLayers:true}).svg,b=preparePlanSVG({visibleLayers:false}).svg;return a.querySelector('[data-fid="'+id+'"]').style.display==='none'&&b.querySelector('[data-fid="'+id+'"]').style.display==='';},id),'current/full export visibility');
  await p.locator('#layer-undo').click();check(await p.locator(`#gFurn [data-fid="${id}"]`).isVisible(),'undo visibility');await p.locator('#layer-redo').click();check(await p.locator(`#gFurn [data-fid="${id}"]`).isHidden(),'redo visibility');await p.locator(`[data-layer-visible="${layer}"]`).check();
  await p.locator(`[data-layer-locked="${layer}"]`).check();await p.evaluate(()=>FurnishObservationLayers.close());await p.evaluate(id=>selectIds([id]),id);check(await p.locator('.fab-size').isDisabled(),'layer lock disables dimensions');
  await p.evaluate(()=>{rotateSel(90);deleteSel();});check(await p.evaluate(()=>JSON.stringify(state.furniture))===before,'locked rotate / delete changed objects');
  await open();await p.locator(`[data-layer-locked="${layer}"]`).uncheck();await p.evaluate(()=>FurnishObservationLayers.close());await p.evaluate(()=>duplicateSel());
  const copyId=await p.evaluate(()=>selIds()[0]);check(await p.evaluate(id=>FurnishLayers.layer(state,'furniture:'+id).name==='家电',copyId),'copy inherits layer');await p.evaluate(()=>undo());await p.evaluate(id=>selectIds([id]),id);
  await open();await p.locator('#layer-name').fill('瓷砖');await p.locator('#layer-create').click();const tiles=await p.evaluate(()=>state.objectLayers.layers.find(l=>l.name==='瓷砖').id);
  for(const type of ['floor','wallTile','ceiling']){await p.locator('#layer-type').selectOption(type);await p.locator('#layer-check-all').click();}
  await p.locator('#layer-assign-checked').click();check(await p.evaluate(()=>FurnishObservationLayers.objects().some(o=>o.type==='wallTile'&&FurnishLayers.layer(state,o.key).name==='瓷砖')),'wall tile inventory / assignment');
  await p.locator(`[data-layer-visible="${tiles}"]`).uncheck();check(await p.locator('#gRooms [data-room]').first().isHidden(),'floor hidden');
  check(await p.locator('[data-ceiling-id="layer-flat"]').isHidden(),'2D ceiling hidden');check(await p.evaluate(()=>{const a=preparePlanSVG({visibleLayers:true}).svg,b=preparePlanSVG({visibleLayers:false}).svg;return a.querySelector('[data-ceiling-id="layer-flat"]').style.display==='none'&&b.querySelector('[data-ceiling-id="layer-flat"]').style.display==='';}),'full export restores ceiling');
  await p.locator('#layer-type').selectOption('all');await p.screenshot({path:V.output('playwright/observation-layers/'+mode+'-manager.png')});
  await p.evaluate(()=>FurnishObservationLayers.close());await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);
  await open();await p.locator(`[data-layer-visible="${layer}"]`).uncheck();await p.evaluate(()=>FurnishObservationLayers.close());await p.waitForTimeout(150);
  check(await p.locator('[data-clearance-item="'+id+'"]:visible').count()===0,'hidden appliance labels');
  await p.screenshot({path:V.output('playwright/observation-layers/'+mode+'-3d-hidden.png')});
  check(await p.locator('.wall-tile-scene-number:visible').count()===0,'hidden tile labels');
  await open();await p.locator('#layer-show-all').click();await p.evaluate(()=>FurnishObservationLayers.close());await p.waitForTimeout(150);await p.screenshot({path:V.output('playwright/observation-layers/'+mode+'-3d-restored.png')});
  check(await p.evaluate(()=>JSON.stringify(state.furniture))===before,'layer edits changed furniture');
  const saved=await p.evaluate(()=>JSON.stringify(state.objectLayers));await p.reload();await p.waitForFunction(()=>!repositoryBooting);check(await p.evaluate(()=>JSON.stringify(state.objectLayers))===saved,'refresh persistence');
  await open();await p.locator(`[data-layer-rename="${layer}"]`).click();await p.locator('#layer-rename-name').fill('厨房家电');await p.locator('#layer-rename-save').click();check(await p.locator(`[data-layer-select="${layer}"]`).innerText()==='厨房家电','rename');
  await p.locator(`[data-layer-delete="${layer}"]`).click();check(await p.evaluate(id=>FurnishLayers.layerId(state,'furniture:'+id)==='0',id),'deleted layer returns to 0');check(await p.evaluate(id=>!!getF(id),id),'delete retained objects');await p.locator('#layer-undo').click();
  await p.setViewportSize({width:390,height:844});await p.screenshot({path:V.output('playwright/observation-layers/'+mode+'-mobile.png')});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow overflow');await p.setViewportSize({width:1440,height:1000});await p.evaluate(()=>FurnishObservationLayers.close());
  const roundTrip=await p.evaluate(()=>JSON.stringify(state.objectLayers));await p.getByRole('button',{name:'工作台',exact:true}).click();await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
  const download=p.waitForEvent('download');await p.locator('#pr-export').click();const file=V.output('playwright/observation-layers/'+mode+'.furnish.json');await(await download).saveAs(file);await p.locator('#pr-file').setInputFiles(file);await p.locator('#pr-restore-confirm').click();check(await p.evaluate(()=>JSON.stringify(state.objectLayers))===roundTrip,'real project round trip');
  check(!errors.length,errors.join(';'));results.push({mode,passed:true,errors});await ctx.close();
 }
 return results;
}
