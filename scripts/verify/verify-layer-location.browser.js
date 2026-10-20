async(page,V)=>{
 const results=[];
 for(const mode of ['http','file']){
  const ctx=await page.context().browser().newContext({viewport:{width:1440,height:1000},offline:mode==='file'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const check=(ok,msg)=>{if(!ok)throw Error(mode+': '+msg);};
  await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>!repositoryBooting);await p.locator('#tgLayers').click();
  const bay=await p.evaluate(()=>FurnishProject.effectivePlan(PLAN,state).rooms.find(r=>r.counted===false)?.id);check(bay,'bay fixture available');
  const button=p.locator(`[data-layer-locate="floor:${bay}"]`),checkbox=p.locator(`[data-layer-object="floor:${bay}"]`);
  await button.click();check(!await checkbox.isChecked(),'name locates without checking');
  check(await p.evaluate(id=>ui.sel.id===id&&ui.sel.layerObject==='floor:'+id,bay),'bay selected from list');check(await p.locator('#gSel [data-layer-selection]').count()===1,'2D target outline');
  const baseline=await p.evaluate(()=>JSON.stringify(state));await checkbox.click();check(await checkbox.isChecked(),'checkbox selection preserved');
  await p.evaluate(async()=>{const THREE=await import('three'),add=THREE.Object3D.prototype.add,projection=THREE.PerspectiveCamera.prototype.updateProjectionMatrix;window.__locationThree=THREE;THREE.PerspectiveCamera.prototype.updateProjectionMatrix=function(...args){window.__locationCamera=this;return projection.apply(this,args);};THREE.Object3D.prototype.add=function(...items){for(const item of items)if(item.userData.layerSelection)window.__locatedOutline=item;return add.apply(this,items);};});
  await p.getByRole('button',{name:'3D 场景',exact:true}).click();await p.waitForFunction(()=>is3D()&&!switching);
  await button.click();await p.waitForTimeout(1100);
  check(await p.evaluate(id=>__locatedOutline.userData.layerSelection==='floor:'+id&&__locatedOutline.box.max.y-__locatedOutline.box.min.y>.1,bay),'3D bay outline includes platform height');
  check(await p.evaluate(()=>__locatedOutline.material.depthTest===false),'outline remains visible against surfaces');
  await p.screenshot({path:V.output('playwright/layer-location/'+mode+'-bay.png')});
  const points=await p.evaluate(()=>{const platform=__locatedOutline.userData.layerMeshes.find(o=>o.userData.room===ui.sel.id),box=new __locationThree.Box3().setFromObject(platform),r=document.querySelector('#view3d canvas').getBoundingClientRect(),points=[];for(const u of [.15,.35,.65,.85])for(const v of [.15,.35,.65,.85]){const at=new __locationThree.Vector3(box.min.x+(box.max.x-box.min.x)*u,box.max.y+.002,box.min.z+(box.max.z-box.min.z)*v).project(__locationCamera);points.push({x:r.x+(at.x+1)*r.width/2,y:r.y+(1-at.y)*r.height/2});}return points;});
  let picked=false;for(const point of points){await p.mouse.click(point.x,point.y);await p.waitForTimeout(100);picked=await p.evaluate(id=>FurnishBayWindows.selected(PLAN,ui.sel)?.platform.id===id&&!ui.sel.layerObject&&__locatedOutline.userData.layerSelection==='floor:'+id&&!!__locatedOutline.parent?.parent,bay);if(picked)break;}
  check(picked,'real canvas click selects the bay assembly and shows its outline');
  await p.locator('[data-layer-locate]').first().click();check(await p.evaluate(()=>ui.sel.kind==='furn'),'furniture selection still works');
  await button.click();await p.locator('#layer-name').fill('定位隐藏验收');await p.locator('#layer-create').click();
  await p.locator('#layer-assign-checked').click();const layer=await p.evaluate(()=>state.objectLayers.layers.find(l=>l.name==='定位隐藏验收').id);
  await p.locator(`[data-layer-visible="${layer}"]`).uncheck();const selected=await p.evaluate(()=>JSON.stringify(ui.sel));await button.click();check(await p.evaluate(()=>JSON.stringify(ui.sel))===selected,'hidden target does not change selection');
  check(!await p.locator(`[data-layer-visible="${layer}"]`).isChecked(),'location does not reveal hidden layer');
  await p.locator('#layer-undo').click();await p.locator('#layer-undo').click();await p.locator('#layer-undo').click();check(await p.evaluate(()=>JSON.stringify(state))===baseline,'location does not add persistent state or history');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>closeDrawers());await button.click();await p.waitForTimeout(1100);check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow location layout');
  await p.screenshot({path:V.output('playwright/layer-location/'+mode+'-mobile.png')});check(!errors.length,errors.join(';'));results.push({mode,passed:true,errors});await ctx.close();
 }
 return results;
}
