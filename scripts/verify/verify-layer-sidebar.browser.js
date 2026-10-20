async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(ok,msg)=>{if(!ok)throw Error(mode+': '+msg);};
  await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>!repositoryBooting);
  await p.locator('#lib').getByText('米家净水器 2 · 1200G',{exact:true}).first().click();
  const id=await p.evaluate(()=>selIds()[0]);
  await p.locator('#tgLayers').click();await p.locator('#layer-sidebar').waitFor({state:'visible'});
  check(await p.locator('#dlg').isHidden(),'sidebar must not open modal');check(await p.locator('#layer-assign-selection').isEnabled(),'current selection available');
  await p.locator('#layer-name').fill('观察家电');await p.locator('#layer-create').click();await p.locator('#layer-assign-selection').click();
  const layer=await p.evaluate(()=>state.objectLayers.layers.find(l=>l.name==='观察家电').id);
  await p.locator(`[data-layer-select="${layer}"]`).click();
  check(await p.locator('#layer-target').inputValue()===layer,'click switches assignment target');
  check(await p.locator('[data-layer-object]').count()===1&&await p.locator(`[data-layer-object="furniture:${id}"]`).count()===1,'click shows only layer members');
  await p.locator('[data-layer-select="0"]').click();check(await p.locator(`[data-layer-object="furniture:${id}"]`).count()===0,'default layer inventory excludes assigned furniture');
  await p.locator('#layer-list-all').click();check(await p.locator(`[data-layer-object="furniture:${id}"]`).count()===1,'all layers restores inventory');
  const handle=p.locator('#layer-resize'),initial=await p.locator('#layer-sidebar').boundingBox(),grip=await handle.boundingBox();
  await p.mouse.move(grip.x+grip.width/2,grip.y+30);await p.mouse.down();await p.mouse.move(grip.x+grip.width/2+100,grip.y+30);await p.mouse.up();
  const widened=await p.locator('#layer-sidebar').boundingBox();check(Math.abs(widened.width-initial.width-100)<3,'drag widens sidebar');
  const remembered=await p.evaluate(()=>JSON.parse(localStorage.getItem(PANES)).layerWidth);check(remembered>400,'width saved locally');
  await handle.focus();await handle.press('ArrowLeft');check(await p.evaluate(()=>JSON.parse(localStorage.getItem(PANES)).layerWidth)===remembered-10,'keyboard width persisted');
  const cancelGrip=await handle.boundingBox();await p.mouse.move(cancelGrip.x+6,cancelGrip.y+30);await p.mouse.down();await p.mouse.move(cancelGrip.x+76,cancelGrip.y+30);await handle.press('Escape');await p.mouse.up();await p.waitForTimeout(350);
  check(Math.abs((await p.locator('#layer-sidebar').boundingBox()).width-(widened.width-10))<3,'escape cancels resize');
  const boundsGrip=await handle.boundingBox();await p.mouse.move(boundsGrip.x+6,boundsGrip.y+30);await p.mouse.down();await p.mouse.move(0,boundsGrip.y+30);
  check(Math.abs((await p.locator('#layer-sidebar').boundingBox()).width-250)<3,'minimum width clamp');
  await p.mouse.move(1440,boundsGrip.y+30);check((await p.locator('#stage').boundingBox()).width>=240,'maximum width reserves canvas');
  await handle.press('Escape');await p.mouse.up();await p.waitForTimeout(350);
  const stage=await p.locator('#stage').boundingBox(),panel=await p.locator('#layer-sidebar').boundingBox();
  check(panel.x+panel.width<=stage.x+1&&stage.width>200,'docked panel leaves canvas unobstructed');
  await p.locator('#layer-name').fill('尚未保存');
  const blank=await p.evaluate(()=>{const b=svg.getBoundingClientRect();for(let y=b.top+20;y<b.bottom-20;y+=30)for(let x=b.left+20;x<b.right-20;x+=30){const n=document.elementFromPoint(x,y);if(n&&(n===svg||svg.contains(n))&&!n.closest('[data-fid],[data-handle],[data-note],[data-measure],[data-distance-edit]'))return {x,y};}throw Error('No exposed canvas');});await p.mouse.click(blank.x,blank.y);
  check(await p.locator('#layer-assign-selection').isDisabled(),'selection updates without closing panel');
  check(await p.locator('#layer-name').inputValue()==='尚未保存','selection preserves draft name');
  await p.locator(`#gFurn [data-fid="${id}"]`).click();check(await p.locator('#layer-assign-selection').isEnabled(),'canvas can select while panel remains open');
  await p.locator('#fR').fill('90');await p.locator('#fR').press('Tab');check(await p.evaluate(id=>getF(id).rot===90,id),'property edits while sidebar open');
  check(await p.locator('#layer-sidebar').isVisible(),'editing retains panel');
  await p.locator('#undo').click();check(await p.evaluate(id=>getF(id).rot===0,id),'external undo');
  await p.locator(`[data-layer-visible="${layer}"]`).uncheck();check(await p.locator(`#gFurn [data-fid="${id}"]`).isHidden(),'visibility from sidebar');
  await p.locator('#undo').click();check(await p.locator(`[data-layer-visible="${layer}"]`).isChecked(),'external undo updates layer controls');
  await p.locator('#layer-query').fill('不存在的物体');await p.locator('#layer-type').selectOption('floor');
  await p.locator(`[data-layer-select="${layer}"]`).click();check(await p.locator('[data-layer-object]').count()===1,'layer switch clears stale filters');
  await p.locator(`[data-layer-visible="${layer}"]`).uncheck();await p.locator(`[data-layer-locked="${layer}"]`).check();await p.locator(`[data-layer-select="${layer}"]`).click();
  check(await p.locator('[data-layer-object]').count()===1&&!await p.locator(`[data-layer-visible="${layer}"]`).isChecked()&&await p.locator(`[data-layer-locked="${layer}"]`).isChecked(),'switching hidden locked layer only changes inventory');
  await p.locator(`[data-layer-locked="${layer}"]`).uncheck();await p.locator(`[data-layer-visible="${layer}"]`).check();
  await p.locator('#layer-name').fill('');await p.screenshot({path:V.output('playwright/layer-sidebar/'+mode+'-desktop.png')});
  for(const buttons of [['tgLib'],['tgPanel'],['tgLib','tgPanel']]){
   for(const button of buttons)await p.locator('#'+button).click();await p.waitForTimeout(350);
   const a=await p.locator('#stage').boundingBox(),b=await p.locator('#layer-sidebar').boundingBox();check(b.x+b.width<=a.x+1&&a.width>stage.width,'library/property collapse preserves docking');
   for(const button of buttons)await p.locator('#'+button).click();await p.waitForTimeout(350);
  }
  await p.locator('#tgLayers').click();check(await p.locator('#layer-sidebar').isHidden(),'header button collapses sidebar');await p.locator('#tgLayers').click();
  await p.reload();await p.waitForFunction(()=>!repositoryBooting);await p.locator('#layer-sidebar').waitFor({state:'visible'});
  check(await p.locator('#tgLayers').getAttribute('aria-expanded')==='true','refresh remembers open panel');
  await p.waitForTimeout(350);check(Math.abs((await p.locator('#layer-sidebar').boundingBox()).width-(widened.width-10))<3,'refresh restores width');
  check(await p.evaluate(id=>FurnishLayers.layerId(state,'furniture:'+id)!=='0',id),'saved assignments retained');
  await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);
  check(await p.locator('#layer-sidebar').isVisible(),'sidebar remains in 3D');
  await p.screenshot({path:V.output('playwright/layer-sidebar/'+mode+'-3d.png')});
  await p.locator('#layer-sidebar-close').click();check(await p.locator('#tgLayers').getAttribute('aria-expanded')==='false','close button');
  await p.locator('#showMenu summary').click();await p.locator('#observationLayers').click();check(await p.locator('#layer-sidebar').isVisible(),'original menu opens sidebar');
  for(const width of [390,320]){
   await p.setViewportSize({width,height:844});await p.evaluate(()=>closeDrawers());
   await p.waitForFunction(()=>document.querySelector('aside.lib').getBoundingClientRect().right<=0&&document.querySelector('aside.right').getBoundingClientRect().left>=innerWidth);
   const s=await p.locator('#stage').boundingBox(),b=await p.locator('#layer-sidebar').boundingBox();
   check(await p.locator('#layer-resize').isHidden(),'narrow panel keeps responsive width');
   check(b.height<=s.height*.55&&b.y>s.y+s.height*.4,'small screen leaves upper canvas exposed');
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no narrow overflow');
   check(await p.evaluate(()=>{const a=document.getElementById('layer-sidebar').getBoundingClientRect(),b=document.querySelector('.canvas-rail').getBoundingClientRect(),left=Math.max(a.left,b.left),right=Math.min(a.right,b.right),top=Math.max(a.top,b.top),bottom=Math.min(a.bottom,b.bottom);return left>=right||top>=bottom||!!document.elementFromPoint((left+right)/2,(top+bottom)/2)?.closest('#layer-sidebar');}),'canvas toolbar must not cover panel controls');
   await p.screenshot({path:V.output('playwright/layer-sidebar/'+mode+'-'+width+'.png')});
  }
  await p.setViewportSize({width:1440,height:1000});await p.waitForTimeout(350);check(Math.abs((await p.locator('#layer-sidebar').boundingBox()).width-(widened.width-10))<3,'desktop restores preferred width after narrow screen');
  await p.locator('#layer-sidebar-close').click();await p.reload();await p.waitForFunction(()=>!repositoryBooting);
  check(await p.locator('#layer-sidebar').count()===0||await p.locator('#layer-sidebar').isHidden(),'refresh remembers closed panel');
  check(!errors.length,errors.join(';'));results.push({mode,passed:true,errors});await context.close();
 }
 return results;
}
